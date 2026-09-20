import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { deleteByClientId, deleteDroppedFiles, findByClientId, patchByClientId, publicRow, resolveStorageUrls, upsertByClientId } from "./_lib/rows";

/**
 * A faculty member's publications, patents and reports.
 *
 * Public to read — they appear on the faculty profile and in the directory —
 * and written only by the faculty member they belong to. An uploaded PDF is a
 * storage reference under `file`; `url` on the row is an external link.
 */

function ownerGuard(actor) {
  return (existing) => {
    if (existing.facultyId !== actor.id && actor.role !== "admin") throw authError("Only the author can change this research output.");
  };
}

export const add = mutation({
  args: { sessionToken: v.string(), id: v.string(), row: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["academician", "institution", "industry", "admin"].includes(actor.role)) throw authError("Only a faculty or organisation account can list research outputs.");
    const { facultyId, ...row } = args.row || {};
    await upsertByClientId(ctx, "researchOutputs", args.id, row, { forced: { facultyId: actor.id }, guard: ownerGuard(actor) });
    return { ok: true };
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const existing = await findByClientId(ctx, "researchOutputs", args.id);
    if (!existing) return { ok: false, reason: "NOT_FOUND" };
    ownerGuard(actor)(existing);
    if ("file" in (args.patch || {})) await deleteDroppedFiles(ctx, { file: existing.file }, { file: args.patch.file });
    await patchByClientId(ctx, "researchOutputs", args.id, args.patch, { protectedFields: ["facultyId"] });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const removed = await deleteByClientId(ctx, "researchOutputs", args.id, { guard: ownerGuard(actor) });
    if (removed) await deleteDroppedFiles(ctx, { file: removed.file }, {});
    return { ok: true };
  },
});

export const listForFaculty = query({
  args: { facultyId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("researchOutputs")
      .withIndex("by_faculty", (q) => q.eq("facultyId", args.facultyId))
      .collect();
    const out = [];
    for (const row of rows) out.push(await resolveStorageUrls(ctx, publicRow(row)));
    return out;
  },
});

/** The public catalogue — what the directory's faculty cards draw from. */
export const listAll = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("researchOutputs").collect();
    const out = [];
    for (const row of rows) out.push(await resolveStorageUrls(ctx, publicRow(row)));
    return out;
  },
});
