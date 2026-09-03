import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("skillTests").collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const byCustomId = await ctx.db
      .query("skillTests")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (byCustomId) return byCustomId;

    try {
      return await ctx.db.get(args.id);
    } catch {
      return null;
    }
  },
});

export const listRegistrationsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const register = mutation({
  args: {
    testId: v.string(),
    userId: v.string(),
    slot: v.optional(v.string()),
    paid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("skillTestRegistrations", {
      ...args,
      paymentStatus: args.paid ? "paid" : "not_required",
      missedRecorded: false,
      attended: false,
      registeredAt: new Date().toISOString(),
    });
  },
});

export const recordResult = mutation({
  args: {
    studentId: v.string(),
    testId: v.string(),
    domain: v.string(),
    score: v.number(),
    weight: v.number(),
    missed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existingAttempt = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_student_test", (q) =>
        q.eq("studentId", args.studentId).eq("testId", args.testId)
      )
      .first();

    if (existingAttempt) {
      await ctx.db.patch(existingAttempt._id, {
        score: args.score,
        weight: args.weight,
        missed: args.missed,
        completedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("assessmentAttempts", {
        studentId: args.studentId,
        testId: args.testId,
        domain: args.domain,
        score: args.score,
        weight: args.weight,
        missed: args.missed,
        completedAt: new Date().toISOString(),
      });
    }
  },
});
