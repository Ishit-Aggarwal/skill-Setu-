import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("applications").collect();
  },
});

export const listForStudent = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("applications")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
  },
});

export const listForInternship = query({
  args: { internshipId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", args.internshipId))
      .collect();
  },
});

export const apply = mutation({
  args: {
    internshipId: v.string(),
    internshipTitle: v.string(),
    company: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    studentInstitution: v.optional(v.string()),
    studentCourse: v.optional(v.string()),
    studentYear: v.optional(v.string()),
    note: v.optional(v.string()),
    match: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if already applied
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", args.internshipId))
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("applications", {
      ...args,
      status: "Applied",
      appliedAt: new Date().toISOString(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("applications"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});
