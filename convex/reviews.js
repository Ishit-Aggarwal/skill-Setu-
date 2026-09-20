import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { deleteByClientId, findByClientId, nowIso, publicRow } from "./_lib/rows";

/**
 * Reviews of a company by past interns and hires. Public to read, written by
 * any signed-in account, edited or removed only by the author. `authorId` is
 * what keeps a review written in demo mode inside demo mode.
 */

export const add = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    company: v.string(),
    rating: v.number(),
    author: v.optional(v.string()),
    role: v.optional(v.string()),
    body: v.optional(v.string()),
    pros: v.optional(v.string()),
    cons: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (await findByClientId(ctx, "companyReviews", args.id)) return { ok: true };
    const rating = Math.max(1, Math.min(5, Math.round(Number(args.rating) || 0)));
    await ctx.db.insert("companyReviews", {
      id: args.id,
      company: args.company,
      authorId: actor.id,
      author: args.author || undefined,
      role: args.role || undefined,
      rating,
      body: args.body || undefined,
      pros: args.pros || undefined,
      cons: args.cons || undefined,
      createdAt: args.createdAt || nowIso(),
      updatedAt: nowIso(),
    });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await deleteByClientId(ctx, "companyReviews", args.id, {
      guard: (existing) => {
        if (existing.authorId !== actor.id && actor.role !== "admin") throw authError("Only the author can remove a review.");
      },
    });
    return { ok: true };
  },
});

export const listForCompany = query({
  args: { company: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("companyReviews")
      .withIndex("by_company", (q) => q.eq("company", args.company))
      .collect();
    return rows.map(publicRow);
  },
});

/** The public catalogue, for the directory's ratings. */
export const listAll = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("companyReviews").collect();
    return rows.map(publicRow);
  },
});
