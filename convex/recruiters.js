import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { deleteByClientId, findByClientId, nowIso, patchByClientId, publicRow, upsertByClientId } from "./_lib/rows";

/**
 * A company's hiring team. Written by the company account only; a recruiter
 * on the team (matched by the email the company entered) can see the list.
 */

const COMPANY_ROLES = ["industry", "institution", "admin"];

function ownerGuard(actor) {
  return (existing) => {
    if (existing.companyOwnerId !== actor.id && actor.role !== "admin") throw authError("Only the company account can change its hiring team.");
  };
}

export const add = mutation({
  args: { sessionToken: v.string(), id: v.string(), row: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!COMPANY_ROLES.includes(actor.role)) throw authError("Only a company account can add recruiters.");
    const { companyOwnerId, ...row } = args.row || {};
    if (!row.name || !row.email) throw new Error("A recruiter needs a name and an email address.");
    await upsertByClientId(
      ctx,
      "recruiters",
      args.id,
      {
        name: row.name,
        email: String(row.email).trim().toLowerCase(),
        title: row.title || undefined,
        accessLevel: row.accessLevel || "Recruiter",
        notesVisible: row.notesVisible ?? true,
        addedAt: row.addedAt || nowIso(),
        updatedAt: row.updatedAt,
      },
      { forced: { companyOwnerId: actor.id }, guard: ownerGuard(actor) }
    );
    return { ok: true };
  },
});

export const update = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const patch = { ...(args.patch || {}) };
    if (patch.email) patch.email = String(patch.email).trim().toLowerCase();
    const row = await patchByClientId(ctx, "recruiters", args.id, patch, { guard: ownerGuard(actor), protectedFields: ["companyOwnerId"] });
    return { ok: Boolean(row) };
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await deleteByClientId(ctx, "recruiters", args.id, { guard: ownerGuard(actor) });
    return { ok: true };
  },
});

/** The owner's team, or — for a recruiter signed in under their own account — the team they belong to. */
export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const own = await ctx.db
      .query("recruiters")
      .withIndex("by_owner", (q) => q.eq("companyOwnerId", actor.id))
      .collect();
    if (own.length) return own.map(publicRow);
    const email = String(actor.user?.email || "").trim().toLowerCase();
    if (!email) return [];
    const membership = await ctx.db
      .query("recruiters")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!membership) return [];
    const team = await ctx.db
      .query("recruiters")
      .withIndex("by_owner", (q) => q.eq("companyOwnerId", membership.companyOwnerId))
      .collect();
    return team.map(publicRow);
  },
});

/** Assigns one of the company's postings to a recruiter on its team. */
export const assignPosting = mutation({
  args: { sessionToken: v.string(), internshipId: v.string(), recruiterId: v.optional(v.union(v.string(), v.null())), recruiterName: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const posting = await ctx.db
      .query("internships")
      .filter((q) => q.eq(q.field("id"), args.internshipId))
      .first();
    if (!posting) return { ok: false, reason: "NOT_FOUND" };
    if (posting.ownerId !== actor.id && actor.role !== "admin") throw authError("Only the company that posted this role can assign it.");
    if (args.recruiterId) {
      const recruiter = await findByClientId(ctx, "recruiters", args.recruiterId);
      if (!recruiter || recruiter.companyOwnerId !== posting.ownerId) throw new Error("That recruiter is not on this company's team.");
    }
    await ctx.db.patch(posting._id, { recruiterId: args.recruiterId || null, recruiterName: args.recruiterName || null });
    return { ok: true };
  },
});
