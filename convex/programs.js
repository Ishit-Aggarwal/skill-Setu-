import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

export const register = mutation({
  args: {
    programId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programRegistrations")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!existing) {
      await ctx.db.insert("programRegistrations", {
        programId: args.programId,
        userId: args.userId,
        registeredAt: new Date().toISOString(),
      });

      const program = await ctx.db
        .query("programs")
        .filter((q) => q.eq(q.field("id"), args.programId))
        .first();

      if (program) {
        await ctx.db.patch(program._id, {
          enrolled: (program.enrolled || 0) + 1,
        });
      }
    }
  },
});

export const getCollabResponse = query({
  args: { collabId: v.string() },
  handler: async (ctx, args) => {
    const r = await ctx.db
      .query("collabResponses")
      .withIndex("by_collab", (q) => q.eq("collabId", args.collabId))
      .first();
    return r ? r.response : null;
  },
});

export const setCollabResponse = mutation({
  args: {
    collabId: v.string(),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("collabResponses")
      .withIndex("by_collab", (q) => q.eq("collabId", args.collabId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { response: args.response });
    } else {
      await ctx.db.insert("collabResponses", {
        collabId: args.collabId,
        response: args.response,
      });
    }
  },
});
