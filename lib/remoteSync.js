"use client";

/**
 * The plumbing every sync module shares.
 *
 * The pattern is the one lib/postings.js established: the browser writes a
 * row into its own store first and shows it at once; a mirror then pushes the
 * same row (same id) to the shared database in the background; a throttled
 * pull later merges the server's rows back into the local store and
 * broadcasts a mutation so every subscribed screen re-reads. Nothing here
 * awaits the network before a screen can paint, and nothing here throws into
 * the UI — a mirror that fails is retried on the next write or pull.
 *
 * Which rows may cross the demo wall is decided by lib/demoIsolation.js and
 * nowhere else; which copy of a row wins is lib/mergeRows.js.
 */

import { convexClient, isBackendConfigured } from "./convexBrowser";
import { getSessionToken } from "./session";
import { all, currentAccount, isDemoMode, saveAll } from "./store";
import { acceptRemoteRow, isMirrorable } from "./demoIsolation";
import { mergeRow } from "./mergeRows";
import { backfillCollection, isBackfilled } from "./backfill";
import { SYNC } from "./settings";

const SYSTEM_FIELDS = new Set(["_id", "_creationTime", "seedId"]);

export function canSync() {
  return Boolean(isBackendConfigured() && getSessionToken() && convexClient());
}

export function token() {
  return getSessionToken();
}

/** Strips system fields, `undefined`s and inline data URLs from a payload. */
export function outbound(record, localOnly = []) {
  const skip = new Set([...SYSTEM_FIELDS, ...localOnly]);
  const payload = {};
  Object.entries(record || {}).forEach(([k, value]) => {
    if (skip.has(k) || value === undefined) return;
    const cleaned = withoutDataUrls(value);
    if (cleaned !== undefined) payload[k] = cleaned;
  });
  return payload;
}

/** A base64 upload never leaves the device; the row points at storage instead. */
export function withoutDataUrls(value) {
  if (typeof value === "string") return /^data:/i.test(value.trim()) ? undefined : value;
  if (Array.isArray(value)) return value.map(withoutDataUrls).filter((x) => x !== undefined);
  if (value && typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([k, val]) => {
      const cleaned = withoutDataUrls(val);
      if (cleaned !== undefined) out[k] = cleaned;
    });
    return out;
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(error) {
  const message = String(error?.message || error || "");
  if (/UNAUTHORIZED|Unrecognised|not yours|belongs to another|does not have an account|no longer exists|criteria|Unknown/i.test(message)) return false;
  return /fetch|network|Failed to|timeout|ECONN|503|502|429/i.test(message) || !message;
}

/**
 * Runs one mutation, fire-and-forget. Transient failures are retried on the
 * SYNC.MIRROR_RETRY_DELAYS_MS schedule; a refusal from the server (wrong
 * owner, wrong role) is logged once and not retried — the row stays local.
 * Resolves true on success.
 */
export async function mirror(label, reference, args) {
  if (!canSync()) return false;
  const delays = SYNC.MIRROR_RETRY_DELAYS_MS;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await convexClient().mutation(reference, { sessionToken: getSessionToken(), ...args });
      return true;
    } catch (error) {
      const retry = isTransient(error) && attempt < delays.length;
      if (!retry) {
        console.warn(`[${label}] Could not sync that change to the shared database yet:`, error?.message || error);
        return false;
      }
      await sleep(delays[attempt]);
    }
  }
}

/** Runs one query; `null` on any failure (which the caller treats as "no pull"). */
export async function pull(label, reference, args = {}, { anonymous = false } = {}) {
  if (!isBackendConfigured() || !convexClient()) return null;
  if (!anonymous && !getSessionToken()) return null;
  try {
    return await convexClient().query(reference, anonymous ? args : { sessionToken: getSessionToken(), ...args });
  } catch (error) {
    console.warn(`[${label}] Could not read from the shared database:`, error?.message || error);
    return null;
  }
}

/** A mirror-worthy row: has an id, an owner, and is not sample data. */
export function mirrorable(collection, row, parentOwnerId) {
  return Boolean(row?.id) && isMirrorable(collection, row, parentOwnerId);
}

/**
 * Merges the server's rows for one collection into the local store.
 *
 * Every row goes through acceptRemoteRow (the demo wall) and mergeRow (the
 * conflict rule). Rows the server has that the device does not are added;
 * rows the device has that the server does not are left alone — an offline
 * draft is not a deletion. Saves + broadcasts only when something changed.
 *
 * `parentOwnerFor(row)` resolves the owner of a child row (see
 * lib/demoIsolation.js CHILD_COLLECTIONS). `prune(localRow)` may return true
 * to drop a local row the server no longer has (used where the server is the
 * only writer, e.g. a notification the recipient deleted elsewhere).
 *
 * Returns { changed, serverIds }.
 */
export function mergeRemote(collection, remote, { parentOwnerFor, transform, prune } = {}) {
  const rows = Array.isArray(remote) ? remote : [];
  const demoMode = isDemoMode();
  const local = all(collection);
  const byId = new Map(local.map((row) => [row.id, row]));
  const serverIds = new Set();
  let changed = 0;

  rows.forEach((raw) => {
    const row = transform ? transform(raw) : raw;
    const id = row?.id || row?._id;
    if (!id) return;
    const parentOwnerId = parentOwnerFor ? parentOwnerFor(row) : undefined;
    if (!acceptRemoteRow(collection, row, { demoMode, parentOwnerId })) return;
    serverIds.add(id);
    const existing = byId.get(id);
    const merged = mergeRow(existing, { ...row, id });
    if (!existing) {
      local.push(merged.row);
      byId.set(id, merged.row);
      changed += 1;
    } else if (merged.changed) {
      Object.assign(existing, merged.row);
      changed += 1;
    }
  });

  if (prune) {
    const before = local.length;
    for (let i = local.length - 1; i >= 0; i -= 1) {
      if (!serverIds.has(local[i].id) && prune(local[i])) local.splice(i, 1);
    }
    changed += before - local.length;
  }

  // saveAll broadcasts the BATCH itself; a second broadcast here would make
  // every subscribed screen re-read twice per pull.
  if (changed) saveAll(collection, local);
  return { changed, serverIds };
}

/**
 * Whether this account's pre-migration rows for a collection have already
 * been pushed. Until they have, a local row the server lacks is not stale —
 * it is waiting to be backfilled — so pruning must not touch it.
 */
export function pruneAllowed(collection) {
  const account = currentAccount();
  if (!account?.id || isDemoMode()) return false;
  return isBackfilled(collection, account.id);
}

/**
 * Pushes this device's pre-migration rows for a collection once per account.
 * Called by each sync module at the end of its first successful pull.
 */
export async function backfill(collection, serverIds, pushRow, { parentOwnerFor } = {}) {
  const account = currentAccount();
  if (!account?.id || isDemoMode()) return;
  await backfillCollection(collection, {
    ownerId: account.id,
    ownerName: account.instituteName || account.institution || "",
    rows: all(collection),
    serverIds: [...(serverIds || [])],
    demoMode: false,
    pushRow,
    parentOwnerFor,
  });
}
