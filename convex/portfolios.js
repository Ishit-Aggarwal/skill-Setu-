import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";

/**
 * Student portfolios.
 *
 * A portfolio is written only by the student it belongs to. Reading someone
 * else's is allowed for the roles that legitimately review candidates, and the
 * student's own privacy switches decide how much of it they get.
 */

const REVIEWER_ROLES = ["industry", "institution", "academician", "admin"];

export const getByStudentId = query({
  args: { sessionToken: v.string(), studentId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.id !== args.studentId && !REVIEWER_ROLES.includes(actor.role)) {
      throw authError("You can only open your own portfolio.");
    }

    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .first();
    if (!portfolio || actor.id === args.studentId) return portfolio;

    // Someone else is looking: respect the student's own visibility settings.
    const student = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.studentId))
      .first();
    if (student?.showContactToRecruiters === false) {
      const { links, ...rest } = portfolio;
      return rest;
    }
    return portfolio;
  },
});

export const save = mutation({
  args: { sessionToken: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);

    const { studentId, _id, _creationTime, ...patch } = args.patch || {};
    const existing = await ctx.db
      .query("portfolios")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .first();

    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert("portfolios", { studentId: actor.id, ...patch });
    return { ok: true };
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
      const student = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("id"), args.studentId))
        .first();
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
