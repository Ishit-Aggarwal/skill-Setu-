import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor, requireOwner } from "./_lib/authz";
import { checkEligibility, computeMatch } from "../lib/match";

/**
 * Postings.
 *
 * Anyone may browse; only an industry or institution account may post, and only
 * the owner of a posting may change or close it. Before this, `create` took an
 * `ownerId` straight from the caller, so a posting could be published under any
 * company's name.
 */

const POSTING_ROLES = ["industry", "institution", "academician", "admin"];

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

/**
 * Postings with match and eligibility resolved server-side for the signed-in
 * student. The browser renders what it is given here; it does not get to decide
 * that a student is a 97% match or that they clear a minimum score.
 */
export const listForStudent = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const assessment = await ctx.db
      .query("assessments")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .first();

    const internships = await ctx.db.query("internships").collect();
    return internships
      .map((internship) => {
        const eligibility = checkEligibility(internship, actor.user, assessment);
        return {
          ...internship,
          match: computeMatch(internship, assessment),
          eligible: eligibility.eligible,
          eligibilityReasons: eligibility.reasons,
        };
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  },
});

/**
 * Publishes a posting.
 *
 * `id` is the client's own record id, and it is what makes this shared at all.
 * A posting used to be written only into the publishing browser's local store,
 * so a recruiter could publish a role, see it in their own list, and have it
 * never reach a student on another device — the posting existed, but only on
 * one laptop. The browser now writes locally *and* mirrors here under the same
 * id, so the row can be matched on both sides instead of being duplicated.
 *
 * Re-publishing the same id updates the existing row rather than inserting a
 * second copy, which makes the mirror safe to retry.
 */
export const create = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.string()),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    type: v.string(),
    domain: v.string(),
    duration: v.string(),
    stipendAmount: v.optional(v.union(v.number(), v.null())),
    stipendMode: v.optional(v.string()),
    stipend: v.optional(v.string()),
    tags: v.array(v.string()),
    deadline: v.string(),
    description: v.string(),
    color: v.optional(v.string()),
    hot: v.optional(v.boolean()),
    status: v.optional(v.string()),
    postedAt: v.optional(v.string()),
    minSkillScore: v.optional(v.union(v.number(), v.null())),
    eligibleDepartments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!POSTING_ROLES.includes(actor.role)) {
      throw authError("Only verified organisation accounts can publish a posting.");
    }

    const { sessionToken, ...fields } = args;
    const row = {
      ...fields,
      // The company name on a posting is the caller's own, not free text.
      company: actor.user.companyName || actor.user.instituteName || actor.user.institution || fields.company,
      ownerId: actor.id,
      status: fields.status || "Open",
      postedAt: fields.postedAt || new Date().toISOString(),
      views: 0,
      uniqueViews: 0,
    };

    if (fields.id) {
      const existing = await ctx.db
        .query("internships")
        .filter((q) => q.eq(q.field("id"), fields.id))
        .first();
      if (existing) {
        if (existing.ownerId !== actor.id && actor.role !== "admin") {
          throw authError("That posting belongs to another organisation.");
        }
        const { views, uniqueViews, ...safe } = row;
        await ctx.db.patch(existing._id, safe);
        return existing._id;
      }
    }

    return await ctx.db.insert("internships", row);
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), id: v.id("internships"), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const doc = await ctx.db.get(args.id);
    requireOwner(actor, doc, { what: "this posting" });

    const { ownerId, _id, _creationTime, ...safe } = args.patch || {};
    await ctx.db.patch(args.id, safe);
    return await ctx.db.get(args.id);
  },
});

/** Same as `update`, addressed by the client-side record id. */
export const updateByClientId = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const doc = await ctx.db
      .query("internships")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (!doc) return { ok: false, reason: "NOT_FOUND" };
    requireOwner(actor, doc, { what: "this posting" });

    const { ownerId, id, _id, _creationTime, ...safe } = args.patch || {};
    await ctx.db.patch(doc._id, safe);
    return { ok: true };
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.id("internships") },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const doc = await ctx.db.get(args.id);
    requireOwner(actor, doc, { what: "this posting" });

    for (const app of await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", doc.id || String(args.id)))
      .collect()) {
      await ctx.db.delete(app._id);
    }
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
