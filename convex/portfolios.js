import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByStudentId = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("portfolios")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .first();
  },
});

export const save = mutation({
  args: {
    studentId: v.string(),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("portfolios")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.patch);
    } else {
      await ctx.db.insert("portfolios", {
        studentId: args.studentId,
        ...args.patch,
      });
    }
  },
});

export const getAssessment = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assessments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .first();
  },
});
