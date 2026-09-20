import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor, resolveInstitutionId } from "./_lib/authz";
import {
  collectStorageIds,
  deleteDroppedFiles,
  findByClientId,
  patchByClientId,
  publicRow,
  resolveStorageUrls,
  upsertByClientId,
} from "./_lib/rows";

/**
 * Everything an institution account owns: its profile, admins, documents,
 * placement drives (with invited companies and tagged students), MOUs,
 * notices, placement history and activity log.
 *
 * Rows are keyed by the institution ACCOUNT (`institutionId`), never by the
 * institute's typed name — see lib/institutionKey.js. `instituteName` is
 * kept on every row for display only. Students and faculty of the
 * institution read the shared subset (drives, notices, profile, their own
 * drive eligibility) through `forMyInstitution`, which resolves which
 * institution they belong to server-side.
 */

const OWNED_TABLES = ["institutionProfiles", "institutionAdmins", "institutionDocs", "drives", "mous", "announcements", "placementHistory", "activityLog"];
const CHILD_TABLES = ["driveInvites", "driveEligibility"];
const SHARED_TABLES = ["drives", "announcements", "institutionProfiles"];

function assertTable(table, allowed) {
  if (!allowed.includes(table)) throw new Error(`Unknown institution table "${table}".`);
}

function requireInstitution(actor) {
  if (!["institution", "admin"].includes(actor.role)) throw authError("Only an institution account can manage institution records.");
}

function ownerGuard(actor) {
  return (existing) => {
    if (existing.institutionId !== actor.id && actor.role !== "admin") throw authError("That record belongs to another institution.");
  };
}

async function byInstitution(ctx, table, institutionId) {
  return await ctx.db
    .query(table)
    .withIndex("by_institution", (q) => q.eq("institutionId", institutionId))
    .collect();
}

async function byDrive(ctx, table, driveId) {
  return await ctx.db
    .query(table)
    .withIndex("by_drive", (q) => q.eq("driveId", driveId))
    .collect();
}

async function deleteFilesOf(ctx, row) {
  for (const storageId of collectStorageIds(row)) {
    try {
      await ctx.storage.delete(storageId);
    } catch {
      /* already gone */
    }
  }
}

async function resolveAll(ctx, rows) {
  const out = [];
  for (const row of rows) out.push(await resolveStorageUrls(ctx, publicRow(row)));
  return out;
}

/* ---------------- the institution's own rows ---------------- */

export const save = mutation({
  args: { sessionToken: v.string(), table: v.string(), id: v.string(), row: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireInstitution(actor);
    assertTable(args.table, OWNED_TABLES);
    const { institutionId, needsOwner, ...row } = args.row || {};
    const instituteName = actor.user.instituteName || actor.user.institution || row.instituteName || "";
    const forced = { institutionId: actor.id, instituteName };
    if (args.table === "activityLog") forced.scope = instituteName;
    const existing = await findByClientId(ctx, args.table, args.id);
    if (existing) {
      ownerGuard(actor)(existing);
      await deleteDroppedFiles(ctx, existing, row);
    }
    await upsertByClientId(ctx, args.table, args.id, row, { forced, guard: ownerGuard(actor) });
    return { ok: true };
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), table: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireInstitution(actor);
    assertTable(args.table, OWNED_TABLES);
    const existing = await findByClientId(ctx, args.table, args.id);
    if (!existing) return { ok: false, reason: "NOT_FOUND" };
    ownerGuard(actor)(existing);
    const patch = args.patch || {};
    const before = {};
    Object.keys(patch).forEach((k) => {
      before[k] = existing[k];
    });
    await deleteDroppedFiles(ctx, before, patch);
    await patchByClientId(ctx, args.table, args.id, patch, { protectedFields: ["institutionId", "instituteName", "scope", "needsOwner"] });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), table: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireInstitution(actor);
    assertTable(args.table, OWNED_TABLES);
    const existing = await findByClientId(ctx, args.table, args.id);
    if (!existing) return { ok: true };
    ownerGuard(actor)(existing);
    if (args.table === "drives" && existing.id) {
      // Same cascade as the browser's deleteDrive.
      for (const table of CHILD_TABLES) for (const child of await byDrive(ctx, table, existing.id)) await ctx.db.delete(child._id);
    }
    await deleteFilesOf(ctx, existing);
    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

/* ---------------- rows that hang off a drive ---------------- */

async function requireOwnedDrive(ctx, actor, driveId) {
  const drive = await findByClientId(ctx, "drives", driveId);
  if (!drive) throw new Error("That drive is not on the shared database yet.");
  if (drive.institutionId !== actor.id && actor.role !== "admin") throw authError("That drive belongs to another institution.");
  return drive;
}

export const saveChild = mutation({
  args: { sessionToken: v.string(), table: v.string(), id: v.string(), row: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireInstitution(actor);
    assertTable(args.table, CHILD_TABLES);
    const row = args.row || {};
    if (!row.driveId) throw new Error("A drive row needs its drive.");
    await requireOwnedDrive(ctx, actor, row.driveId);
    await upsertByClientId(ctx, args.table, args.id, row, {
      guard: async (existing) => {
        if (existing.driveId !== row.driveId) await requireOwnedDrive(ctx, actor, existing.driveId);
      },
    });
    return { ok: true };
  },
});

export const removeChild = mutation({
  args: { sessionToken: v.string(), table: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireInstitution(actor);
    assertTable(args.table, CHILD_TABLES);
    const existing = await findByClientId(ctx, args.table, args.id);
    if (!existing) return { ok: true };
    await requireOwnedDrive(ctx, actor, existing.driveId);
    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

/* ---------------- reads ---------------- */

/** Every table the institution portal draws from, in one request. */
export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["institution", "admin"].includes(actor.role)) return null;
    const out = { institutionId: actor.id };
    for (const table of OWNED_TABLES) out[table] = await resolveAll(ctx, await byInstitution(ctx, table, actor.id));
    const drives = await byInstitution(ctx, "drives", actor.id);
    out.driveInvites = [];
    out.driveEligibility = [];
    for (const drive of drives) {
      if (!drive.id) continue;
      out.driveInvites.push(...(await byDrive(ctx, "driveInvites", drive.id)).map(publicRow));
      out.driveEligibility.push(...(await byDrive(ctx, "driveEligibility", drive.id)).map(publicRow));
    }
    // Legacy rows the migration could not attach to exactly one account are
    // flagged, not guessed. If any carry this institution's name, say so.
    const name = actor.user.instituteName || "";
    out.needsOwner = false;
    if (name) {
      for (const table of OWNED_TABLES) {
        if (table === "activityLog") continue;
        const stray = await ctx.db
          .query(table)
          .withIndex(table === "institutionProfiles" ? "by_name" : "by_institute", (q) => q.eq("instituteName", name))
          .filter((q) => q.eq(q.field("needsOwner"), true))
          .first();
        if (stray) {
          out.needsOwner = true;
          break;
        }
      }
    }
    return out;
  },
});

/**
 * What a student or faculty member of an institution may see of it: the
 * profile, the drives, the notices, and — for a student — the drives they
 * were tagged for; faculty see every tag on the institution's drives.
 */
export const forMyInstitution = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["student", "academician", "institution", "admin"].includes(actor.role)) return null;
    const institutionId = await resolveInstitutionId(ctx, actor.user);
    if (!institutionId) return { institutionId: null, drives: [], announcements: [], institutionProfiles: [], driveEligibility: [] };

    const out = { institutionId };
    for (const table of SHARED_TABLES) out[table] = await resolveAll(ctx, await byInstitution(ctx, table, institutionId));
    out.driveEligibility = [];
    if (actor.role === "student") {
      const rows = await ctx.db
        .query("driveEligibility")
        .withIndex("by_student", (q) => q.eq("studentId", actor.id))
        .collect();
      out.driveEligibility = rows.map(publicRow);
    } else {
      for (const drive of out.drives) {
        if (!drive.id) continue;
        out.driveEligibility.push(...(await byDrive(ctx, "driveEligibility", drive.id)).map(publicRow));
      }
    }
    return out;
  },
});

/** Individual reads named in the build spec; each is a view over the above. */
export const drivesForMyInstitution = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["student", "academician", "institution", "admin"].includes(actor.role)) throw authError("Placement drives are only visible to students and staff of the institution.");
    const institutionId = await resolveInstitutionId(ctx, actor.user);
    if (!institutionId) return [];
    return await resolveAll(ctx, await byInstitution(ctx, "drives", institutionId));
  },
});

export const announcementsForMyInstitution = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["student", "academician", "institution", "admin"].includes(actor.role)) throw authError("Notices are only visible to students and staff of the institution.");
    const institutionId = await resolveInstitutionId(ctx, actor.user);
    if (!institutionId) return [];
    return await resolveAll(ctx, await byInstitution(ctx, "announcements", institutionId));
  },
});

export const profileForMyInstitution = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const institutionId = await resolveInstitutionId(ctx, actor.user);
    if (!institutionId) return null;
    const rows = await byInstitution(ctx, "institutionProfiles", institutionId);
    return rows.length ? await resolveStorageUrls(ctx, publicRow(rows[0])) : null;
  },
});

export const myDriveEligibility = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("driveEligibility")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .collect();
    return rows.map(publicRow);
  },
});

/** The public directory: institution profiles are what the directory cards show. */
export const listProfiles = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("institutionProfiles").collect();
    return await resolveAll(ctx, rows);
  },
});
