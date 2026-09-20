import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor, requireRead } from "./_lib/authz";
import { deleteDroppedFiles, nowIso, publicRow, resolveStorageUrls, stripDataUrls, stripSystemFields } from "./_lib/rows";
import { findUserById } from "./_lib/tests";

/**
 * Student portfolios.
 *
 * A portfolio is written only by the student it belongs to. Reading someone
 * else's is allowed for the roles that legitimately review candidates, and the
 * student's own privacy switches decide how much of it they get.
 *
 * Files (documents, certificates, education proofs, banner, photo) live in
 * file storage; the row keeps `{ storageId, fileName, mimeType, bytes }` and
 * every read resolves `url` after the access check.
 */

const REVIEWER_ROLES = ["industry", "institution", "academician", "admin"];

async function portfolioOf(ctx, studentId) {
  return await ctx.db
    .query("portfolios")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .first();
}

async function forViewer(ctx, actor, portfolio, studentId) {
  if (!portfolio) return null;
  await requireRead(ctx, actor, "portfolios", portfolio);
  let row = publicRow(portfolio);
  if (actor.id !== studentId) {
    const student = await findUserById(ctx, studentId);
    if (student?.showContactToRecruiters === false) {
      const { links, ...rest } = row;
      row = rest;
    }
  }
  return await resolveStorageUrls(ctx, row);
}

export const getByStudentId = query({
  args: { sessionToken: v.string(), studentId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.id !== args.studentId && !REVIEWER_ROLES.includes(actor.role)) {
      throw authError("You can only open your own portfolio.");
    }
    return await forViewer(ctx, actor, await portfolioOf(ctx, args.studentId), args.studentId);
  },
});

/** The signed-in student's own portfolio, files resolved. */
export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const portfolio = await portfolioOf(ctx, actor.id);
    return portfolio ? await resolveStorageUrls(ctx, publicRow(portfolio)) : null;
  },
});

/** A reviewer opening a candidate's portfolio — talent pool, candidate modal, roster. */
export const getForViewer = query({
  args: { sessionToken: v.string(), studentId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    return await forViewer(ctx, actor, await portfolioOf(ctx, args.studentId), args.studentId);
  },
});

/**
 * Upsert by the student's own account. `patch` is the browser's row (or a
 * partial); the student id, system fields and any inline data URL are never
 * taken from it. Files that a patch drops are deleted from storage.
 */
export const save = mutation({
  args: { sessionToken: v.string(), id: v.optional(v.string()), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);

    const { studentId, id: patchId, ...rest } = stripSystemFields(args.patch || {});
    const patch = stripDataUrls(rest);
    const existing = await portfolioOf(ctx, actor.id);
    const updatedAt = patch.updatedAt || nowIso();

    if (existing) {
      const before = {};
      Object.keys(patch).forEach((k) => {
        before[k] = existing[k];
      });
      await deleteDroppedFiles(ctx, before, patch);
      await ctx.db.patch(existing._id, { ...patch, updatedAt, id: existing.id || args.id || patchId });
      return { ok: true, id: existing.id || args.id || patchId };
    }
    const id = args.id || patchId || `portfolios_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await ctx.db.insert("portfolios", { ...patch, id, studentId: actor.id, updatedAt });
    return { ok: true, id };
  },
});

export const getAssessment = query({
  args: { sessionToken: v.string(), studentId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.id !== args.studentId && !REVIEWER_ROLES.includes(actor.role)) {
      throw authError("You can only read your own assessment.");
    }
    if (actor.id !== args.studentId) {
      const student = await findUserById(ctx, args.studentId);
      if (student?.showScoresToRecruiters === false) return null;
    }
    return await ctx.db
      .query("assessments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .first();
  },
});

/** The Talent Pool switch — a student may only toggle their own visibility. */
export const setOpenToOpportunities = mutation({
  args: { sessionToken: v.string(), open: v.boolean() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await ctx.db.patch(actor.user._id, { openToOpportunities: args.open });
    return { ok: true, openToOpportunities: args.open };
  },
});
