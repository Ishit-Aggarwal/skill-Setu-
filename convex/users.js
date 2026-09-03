import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Check both custom id and Convex _id
    const byCustomId = await ctx.db
      .query("users")
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

export const listByRole = query({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.union(v.string(), v.null())),
    role: v.string(),
    name: v.optional(v.string()),
    institution: v.optional(v.string()),
    instituteName: v.optional(v.string()),
    instituteId: v.optional(v.string()),
    department: v.optional(v.string()),
    course: v.optional(v.string()),
    year: v.optional(v.string()),
    companyName: v.optional(v.string()),
    workEmailDomain: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      throw new Error("User already exists with this email");
    }

    const _id = await ctx.db.insert("users", {
      ...args,
      email,
      createdAt: new Date().toISOString(),
    });
    return _id;
  },
});

export const updateProfile = mutation({
  args: {
    id: v.string(),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (user) {
      await ctx.db.patch(user._id, args.patch);
    }
  },
});
