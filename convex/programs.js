import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor, requireOwner } from "./_lib/authz";

/**
 * Faculty development programmes and research-collab responses.
 *
 * Registering enrols the session's own account — the caller cannot enrol
 * somebody else, and cannot inflate a programme's seat count by registering a
 * made-up user id repeatedly.
 */

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

async function programFor(ctx, programId) {
  const byCustom = await ctx.db
    .query("programs")
    .filter((q) => q.eq(q.field("id"), programId))
    .first();
  if (byCustom) return byCustom;
  try {
    return await ctx.db.get(programId);
  } catch {
    return null;
  }
}

export const register = mutation({
  args: { sessionToken: v.string(), programId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);

    const existing = await ctx.db
      .query("programRegistrations")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .filter((q) => q.eq(q.field("userId"), actor.id))
      .first();
    if (existing) return { ok: true, alreadyRegistered: true };

    const program = await programFor(ctx, args.programId);
    if (!program) throw new Error("That programme no longer exists.");
    if ((program.enrolled || 0) >= (program.seats || 0)) throw new Error("This programme is full.");

    await ctx.db.insert("programRegistrations", {
      programId: args.programId,
      userId: actor.id,
      name: actor.user.name,
      email: actor.user.email,
      institution: actor.user.institution || actor.user.instituteName,
      designation: actor.user.designation,
      status: "Registered",
      registeredAt: new Date().toISOString(),
    });
    await ctx.db.patch(program._id, { enrolled: (program.enrolled || 0) + 1 });
    return { ok: true };
  },
});

export const cancelRegistration = mutation({
  args: { sessionToken: v.string(), programId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const registration = await ctx.db
      .query("programRegistrations")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .filter((q) => q.eq(q.field("userId"), actor.id))
      .first();
    if (!registration) return { ok: false, reason: "NOT_FOUND" };

    await ctx.db.delete(registration._id);
    const program = await programFor(ctx, args.programId);
    if (program) await ctx.db.patch(program._id, { enrolled: Math.max(0, (program.enrolled || 1) - 1) });
    return { ok: true };
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
  args: { sessionToken: v.string(), collabId: v.string(), response: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["academician", "institution", "industry", "admin"].includes(actor.role)) {
      throw authError("Only an organisation or faculty account can respond to a collaboration.");
    }

    const existing = await ctx.db
      .query("collabResponses")
      .withIndex("by_collab", (q) => q.eq("collabId", args.collabId))
      .first();

    if (existing) await ctx.db.patch(existing._id, { response: args.response });
    else await ctx.db.insert("collabResponses", { collabId: args.collabId, response: args.response });
    return { ok: true };
  },
});

/** Cancelling a programme is the organiser's call, nobody else's. */
export const cancelProgram = mutation({
  args: { sessionToken: v.string(), id: v.id("programs") },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const program = await ctx.db.get(args.id);
    requireOwner(actor, program, { what: "this programme" });
    await ctx.db.patch(args.id, { status: "Cancelled" });
    return { ok: true };
  },
});
