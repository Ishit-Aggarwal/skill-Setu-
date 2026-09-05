import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getActor, publicUser, requireActor, sessionTtlMs } from "./_lib/authz";

/**
 * Session plumbing.
 *
 * The pieces that read or write a password hash are `internal*` — they are not
 * part of the deployment's public API and cannot be called from a browser or
 * with a bare deployment URL. Only the Node action in `authNode.js`, which owns
 * the bcrypt work, can reach them.
 */

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- internal: account lookup & writes ---------------- */

export const findAuthRecordByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first();
  },
});

/**
 * Organisation accounts identify themselves by the organisation's name, which
 * is how they are referred to everywhere else in the product ("Hosted by
 * <Company>", "<Institute> placement cell"). Matching is case- and
 * whitespace-insensitive; an ambiguous name falls back to email rather than
 * guessing which account was meant.
 */
export const findAuthRecordByOrganisation = internalQuery({
  args: { role: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const wanted = args.name.trim().toLowerCase().replace(/\s+/g, " ");
    if (!wanted) return { matches: [] };

    const candidates = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();

    const field = args.role === "industry" ? "companyName" : "instituteName";
    const matches = candidates.filter((doc) => {
      const value = doc[field] || doc.institution || "";
      return String(value).trim().toLowerCase().replace(/\s+/g, " ") === wanted;
    });
    return { matches };
  },
});

export const findAuthRecordById = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
  },
});

export const setPasswordHash = internalMutation({
  args: { docId: v.id("users"), passwordHash: v.string(), alsoVerify: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const patch = { passwordHash: args.passwordHash };
    if (args.alsoVerify) patch.emailVerified = true;
    await ctx.db.patch(args.docId, patch);
    return true;
  },
});

/** Used to keep the shared demo personas in step with their template. */
export const patchAccount = internalMutation({
  args: { docId: v.id("users"), patch: v.any() },
  handler: async (ctx, args) => {
    const { passwordHash, _id, _creationTime, ...safe } = args.patch || {};
    await ctx.db.patch(args.docId, safe);
    return await ctx.db.get(args.docId);
  },
});

export const clearResetNonce = internalMutation({
  args: { docId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, { resetNonce: null, resetRequestedAt: null, resetExpiresAt: null });
    return true;
  },
});

export const insertAccount = internalMutation({
  args: { doc: v.any() },
  handler: async (ctx, args) => {
    const email = String(args.doc.email || "").trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new Error("User already exists with this email");

    const now = new Date().toISOString();
    const id = args.doc.id || `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const _id = await ctx.db.insert("users", {
      ...args.doc,
      id,
      email,
      emailVerified: true,
      verifiedAt: now,
      createdAt: now,
    });
    return await ctx.db.get(_id);
  },
});

/* ---------------- internal: sessions ---------------- */

export const issueSession = internalMutation({
  args: { userId: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    // Old sessions are not revoked: the product deliberately allows the same
    // account to be signed in on several devices at once.
    const now = Date.now();
    const token = randomToken();
    await ctx.db.insert("sessions", {
      token,
      userId: args.userId,
      role: args.role,
      createdAt: now,
      expiresAt: now + sessionTtlMs(),
      lastSeenAt: now,
    });
    return token;
  },
});

/** Session → account, for the Node action (which has no `ctx.db`). */
export const resolveSession = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx, args.sessionToken);
    if (!actor) return null;
    return { id: actor.id, role: actor.role, docId: actor.user._id, email: actor.user.email };
  },
});

/** Drops every session for an account — used when the account is deleted. */
export const revokeAllSessions = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});

/* ---------------- public: whoami / sign out ---------------- */

/** Resolves a session token to its account, or null. Never returns a hash. */
export const me = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx, args.sessionToken);
    return actor ? publicUser(actor.user) : null;
  },
});

export const signOut = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    if (session) await ctx.db.delete(session._id);
    return { ok: true };
  },
});

/** Ends every other session for the signed-in account ("sign out everywhere"). */
export const signOutEverywhere = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", actor.id))
      .collect();
    let removed = 0;
    for (const row of rows) {
      if (row.token === args.sessionToken) continue;
      await ctx.db.delete(row._id);
      removed += 1;
    }
    return { ok: true, removed };
  },
});
