import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const internships = await ctx.db.query("internships").collect();
    return internships.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  },
});

export const listByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("internships")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    location: v.string(),
    type: v.string(),
    domain: v.string(),
    duration: v.string(),
    stipend: v.string(),
    tags: v.array(v.string()),
    deadline: v.string(),
    description: v.string(),
    color: v.optional(v.string()),
    hot: v.optional(v.boolean()),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("internships", {
      ...args,
      status: "Open",
      postedAt: new Date().toISOString(),
    });
    return id;
  },
});
