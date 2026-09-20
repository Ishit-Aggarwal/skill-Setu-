import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireActor } from "./_lib/authz";
import { deleteByClientId, nowIso, publicRow, upsertByClientId } from "./_lib/rows";

/**
 * A student's bookmarks: saved postings, saved mentorship slots, and a
 * recruiter's saved talent-pool searches. Owner-only in every direction — the
 * rows are keyed to the session's account, never to an id in the request.
 */

async function mine(ctx, table, index, actorId) {
  return await ctx.db
    .query(table)
    .withIndex(index, (q) => q.eq(index === "by_owner" ? "ownerId" : "studentId", actorId))
    .collect();
}

export const toggleInternship = mutation({
  args: { sessionToken: v.string(), id: v.optional(v.string()), internshipId: v.string(), saved: v.boolean(), savedAt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await mine(ctx, "savedInternships", "by_student", actor.id);
    const current = rows.filter((r) => r.internshipId === args.internshipId);
    if (!args.saved) {
      for (const row of current) await ctx.db.delete(row._id);
      return { ok: true, saved: false };
    }
    if (current.length) return { ok: true, saved: true };
    await ctx.db.insert("savedInternships", {
      id: args.id,
      studentId: actor.id,
      internshipId: args.internshipId,
      savedAt: args.savedAt || nowIso(),
      updatedAt: nowIso(),
    });
    return { ok: true, saved: true };
  },
});

export const toggleMentorship = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.string()),
    slotId: v.string(),
    saved: v.boolean(),
    facultyId: v.optional(v.union(v.string(), v.null())),
    snapshot: v.optional(v.any()),
    savedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await mine(ctx, "savedMentorships", "by_student", actor.id);
    const current = rows.filter((r) => r.slotId === args.slotId);
    if (!args.saved) {
      for (const row of current) await ctx.db.delete(row._id);
      return { ok: true, saved: false };
    }
    if (current.length) return { ok: true, saved: true };
    await ctx.db.insert("savedMentorships", {
      id: args.id,
      studentId: actor.id,
      slotId: args.slotId,
      facultyId: args.facultyId || null,
      snapshot: args.snapshot || null,
      savedAt: args.savedAt || nowIso(),
      updatedAt: nowIso(),
    });
    return { ok: true, saved: true };
  },
});

export const saveSearch = mutation({
  args: { sessionToken: v.string(), id: v.string(), name: v.string(), filters: v.any(), savedAt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await upsertByClientId(
      ctx,
      "savedSearches",
      args.id,
      { name: args.name, filters: args.filters, savedAt: args.savedAt || nowIso() },
      {
        forced: { ownerId: actor.id },
        guard: (existing) => {
          if (existing.ownerId !== actor.id) throw new Error("UNAUTHORIZED: That saved search belongs to another account.");
        },
      }
    );
    return { ok: true };
  },
});

export const deleteSearch = mutation({
  args: { sessionToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await deleteByClientId(ctx, "savedSearches", args.id, {
      guard: (existing) => {
        if (existing.ownerId !== actor.id) throw new Error("UNAUTHORIZED: That saved search belongs to another account.");
      },
    });
    return { ok: true };
  },
});

/** All three lists for the signed-in account in one request. */
export const mineAll = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const [internships, mentorships, searches] = await Promise.all([
      mine(ctx, "savedInternships", "by_student", actor.id),
      mine(ctx, "savedMentorships", "by_student", actor.id),
      mine(ctx, "savedSearches", "by_owner", actor.id),
    ]);
    return { internships: internships.map(publicRow), mentorships: mentorships.map(publicRow), searches: searches.map(publicRow) };
  },
});
