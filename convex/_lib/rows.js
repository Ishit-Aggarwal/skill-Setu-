/**
 * Helpers for tables whose rows are addressed by the client's own record id.
 *
 * The browser writes a row locally first (with an id it generated), then
 * mirrors it here under the same id. Every mirrored table therefore carries
 * an `id` field with a `by_client_id` index, and the mutations below upsert on
 * it so a retried mirror never creates a second copy.
 */

/** Never written from a client payload. */
const SYSTEM_FIELDS = ["_id", "_creationTime"];

export function stripSystemFields(row, extra = []) {
  const out = { ...(row || {}) };
  [...SYSTEM_FIELDS, ...extra].forEach((f) => delete out[f]);
  return out;
}

/**
 * Removes any base64 `data:` URL from a payload, recursively. Rows used to
 * carry uploads inline; they now point at file storage, and a data URL must
 * never land in a document (1 MB cap, and a gigabyte of free-tier database).
 */
export function stripDataUrls(value) {
  if (typeof value === "string") return /^data:/i.test(value.trim()) ? undefined : value;
  if (Array.isArray(value)) return value.map(stripDataUrls).filter((x) => x !== undefined);
  if (value && typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([k, val]) => {
      const cleaned = stripDataUrls(val);
      if (cleaned !== undefined) out[k] = cleaned;
    });
    return out;
  }
  return value;
}

export async function findByClientId(ctx, table, id) {
  if (!id || typeof id !== "string") return null;
  return await ctx.db
    .query(table)
    .withIndex("by_client_id", (q) => q.eq("id", id))
    .first();
}

export function nowIso() {
  return new Date().toISOString();
}

/**
 * Insert-or-patch by client id. `guard(existing)` runs before a patch so the
 * caller can enforce ownership; the row written always carries the fields in
 * `forced` (owner ids, institutionId) whatever the payload said.
 */
export async function upsertByClientId(ctx, table, id, row, { guard, forced = {} } = {}) {
  const clean = { ...stripDataUrls(stripSystemFields(row)), ...forced, id, updatedAt: row?.updatedAt || nowIso() };
  const existing = await findByClientId(ctx, table, id);
  if (existing) {
    if (guard) await guard(existing);
    await ctx.db.patch(existing._id, clean);
    return await ctx.db.get(existing._id);
  }
  const _id = await ctx.db.insert(table, clean);
  return await ctx.db.get(_id);
}

export async function patchByClientId(ctx, table, id, patch, { guard, protectedFields = [] } = {}) {
  const existing = await findByClientId(ctx, table, id);
  if (!existing) return null;
  if (guard) await guard(existing);
  const clean = stripDataUrls(stripSystemFields(patch, ["id", ...protectedFields]));
  await ctx.db.patch(existing._id, { ...clean, updatedAt: clean.updatedAt || nowIso() });
  return await ctx.db.get(existing._id);
}

export async function deleteByClientId(ctx, table, id, { guard } = {}) {
  const existing = await findByClientId(ctx, table, id);
  if (!existing) return null;
  if (guard) await guard(existing);
  await ctx.db.delete(existing._id);
  return existing;
}

/** Deletes the storage object behind a file reference, if any. */
export async function deleteStoredFile(ctx, ref) {
  const storageId = ref?.storageId;
  if (!storageId) return;
  try {
    await ctx.storage.delete(storageId);
  } catch {
    /* already gone */
  }
}

/** { storageId, ... } → { ..., url } */
export async function withFileUrl(ctx, ref) {
  if (!ref || typeof ref !== "object" || !ref.storageId) return ref;
  let url = null;
  try {
    url = await ctx.storage.getUrl(ref.storageId);
  } catch {
    url = null;
  }
  return { ...ref, url };
}

/** Resolves the given file-reference fields (each `{storageId}` object or an array of them) on a row. */
export async function resolveFileFields(ctx, row, fields) {
  if (!row) return row;
  const out = { ...row };
  for (const field of fields) {
    const value = row[field];
    if (Array.isArray(value)) {
      const resolved = [];
      for (const item of value) resolved.push(await withFileUrl(ctx, item));
      out[field] = resolved;
    } else if (value && typeof value === "object") {
      out[field] = await withFileUrl(ctx, value);
    }
  }
  return out;
}

/** Drop Convex's system fields before handing a row to the browser. */
export function publicRow(row) {
  if (!row) return null;
  const { _id, _creationTime, ...rest } = row;
  return rest;
}

/**
 * Walks a row and resolves `url` on every object that carries a `storageId`,
 * however deeply nested — a portfolio keeps files inside documents,
 * education entries and certifications alike.
 */
export async function resolveStorageUrls(ctx, value, depth = 0) {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await resolveStorageUrls(ctx, item, depth + 1));
    return out;
  }
  if (typeof value !== "object") return value;
  const out = {};
  for (const [k, val] of Object.entries(value)) out[k] = await resolveStorageUrls(ctx, val, depth + 1);
  if (typeof value.storageId === "string" && value.storageId) {
    try {
      out.url = await ctx.storage.getUrl(value.storageId);
    } catch {
      out.url = value.url || null;
    }
  }
  return out;
}

/** Every storage id referenced anywhere in a value. */
export function collectStorageIds(value, into = new Set(), depth = 0) {
  if (depth > 6 || value == null) return into;
  if (Array.isArray(value)) {
    value.forEach((item) => collectStorageIds(item, into, depth + 1));
    return into;
  }
  if (typeof value !== "object") return into;
  if (typeof value.storageId === "string" && value.storageId) into.add(value.storageId);
  Object.values(value).forEach((val) => collectStorageIds(val, into, depth + 1));
  return into;
}

/** Deletes storage objects that `before` referenced and `after` no longer does. */
export async function deleteDroppedFiles(ctx, before, after) {
  const keep = collectStorageIds(after);
  for (const storageId of collectStorageIds(before)) {
    if (keep.has(storageId)) continue;
    try {
      await ctx.storage.delete(storageId);
    } catch {
      /* already gone */
    }
  }
}
