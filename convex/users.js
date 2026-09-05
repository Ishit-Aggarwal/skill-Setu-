import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  authError,
  publicUser,
  requireActor,
  requireSelfOrAdmin,
  stripProtectedFields,
} from "./_lib/authz";

/**
 * Accounts live here (not in browser localStorage) so a registered user can
 * sign in from any device, browser or network. Nothing in this file ties an
 * account to a device, a session count, or an IP address.
 *
 * Every write below resolves its caller from a server-issued session before it
 * touches anything. Passing somebody else's id is not enough to edit, delete or
 * re-role their account — the id in the request body is checked against the id
 * behind the session, not trusted on its own.
 *
 * Password hashing and verification live in `authNode.js`; nothing here reads
 * or returns a hash.
 */

async function revokeSessions(ctx, userId) {
  const rows = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const row of rows) await ctx.db.delete(row._id);
}

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    return publicUser(doc);
  },
});

export const existsByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first();
    return Boolean(doc);
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const byCustomId = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (byCustomId) return publicUser(byCustomId);
    try {
      return publicUser(await ctx.db.get(args.id));
    } catch {
      return null;
    }
  },
});

/**
 * Directory listing. Bulk access to student records is what a talent-pool
 * search needs, so it is limited to the roles that legitimately search — a
 * signed-out caller can no longer pull every student in one request.
 */
export const listByRole = query({
  args: { role: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (args.role === "student" && !["industry", "institution", "academician", "admin"].includes(actor.role)) {
      throw authError("Only verified recruiters and institutions can browse student records.");
    }
    const docs = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
    return docs.map(publicUser);
  },
});

/**
 * Profile edits. Only the account holder (or an admin) may write, and the
 * fields that decide identity and privilege — role, email, verification state,
 * password — are stripped from the patch regardless of who is calling, so a
 * user cannot promote themselves by editing their own profile.
 */
export const updateProfile = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireSelfOrAdmin(actor, args.id);

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (!user) return null;

    await ctx.db.patch(user._id, stripProtectedFields(args.patch));
    return publicUser(await ctx.db.get(user._id));
  },
});

/**
 * Role changes are an admin action. A user cannot change their own role, and
 * one user cannot change another's — the two ways this was previously open.
 */
export const setRole = mutation({
  args: { sessionToken: v.string(), id: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role !== "admin") throw authError("Only an administrator can change an account's role.");
    if (!["student", "industry", "academician", "institution", "admin"].includes(args.role)) {
      throw new Error("Unrecognised role.");
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (!user) return { ok: false, reason: "NOT_FOUND" };

    await ctx.db.patch(user._id, { role: args.role });
    // Sessions carry the role they were issued with, so invalidate them.
    await revokeSessions(ctx, args.id);
    return { ok: true, user: publicUser(await ctx.db.get(user._id)) };
  },
});

/**
 * Step 1 of password recovery: mint a single-use nonce on the account.
 *
 * It is stored on the user document rather than being a purely stateless
 * signed token, because resetting the password must invalidate any link that
 * was issued earlier — a stateless token cannot be revoked.
 *
 * Deliberately unauthenticated: the whole point is that the caller has lost
 * access. It returns the nonce only to the API route that emails it, and says
 * nothing about whether the address is registered beyond `ok`.
 */
export const issuePasswordReset = mutation({
  args: { email: v.string(), ttlMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) return { ok: false, reason: "NOT_FOUND" };

    const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    const now = new Date();
    await ctx.db.patch(user._id, {
      resetNonce: nonce,
      resetRequestedAt: now.toISOString(),
      resetExpiresAt: now.getTime() + (args.ttlMinutes || 30) * 60 * 1000,
    });

    return { ok: true, nonce, name: user.name || null };
  },
});

/**
 * Account deletion. Previously any caller could delete any account by id; now
 * the session behind the request has to be that account (or an admin), and the
 * user's own rows go with it rather than being orphaned.
 */
export const deleteUser = mutation({
  args: { sessionToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireSelfOrAdmin(actor, args.id);

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (!user) return { ok: false, reason: "NOT_FOUND" };

    for (const app of await ctx.db
      .query("applications")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect()) {
      await ctx.db.delete(app._id);
    }
    for (const p of await ctx.db
      .query("portfolios")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect()) {
      await ctx.db.delete(p._id);
    }
    for (const a of await ctx.db
      .query("assessments")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect()) {
      await ctx.db.delete(a._id);
    }
    for (const a of await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect()) {
      await ctx.db.delete(a._id);
    }
    for (const b of await ctx.db
      .query("mentorBookings")
      .withIndex("by_student", (q) => q.eq("studentId", args.id))
      .collect()) {
      await ctx.db.delete(b._id);
    }

    await revokeSessions(ctx, args.id);
    await ctx.db.delete(user._id);
    return { ok: true };
  },
});

/**
 * Account recovery: which email did I sign up with?
 *
 * This endpoint is unauthenticated by necessity — the whole point is that the
 * caller has lost access to their account. So it is built to be useless to
 * anyone except the person holding that phone:
 *
 *  - It returns a MASKED address and nothing else. Someone who owns the number
 *    recognises "aa****v@gmail.com" instantly; someone enumerating numbers
 *    learns a domain. No name, no role, no raw address ever leaves here — an
 *    earlier version returned all three, which turned a recovery form into a
 *    phone-to-identity lookup for the whole user table.
 *
 *  - Matching is on the national 10-digit number, exactly. It used to be
 *    `endsWith` in BOTH directions with a 7-digit floor, so a 7-digit probe
 *    matched any account whose number happened to end that way, and a short
 *    stored number matched almost anything.
 */

/** Last ten digits, which is what identifies an Indian mobile number whether
    it was typed with +91, 0, spaces or none of those. */
function nationalDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function maskAddress(email) {
  const [local = "", domain = ""] = String(email || "").split("@");
  if (!domain) return "";
  if (local.length <= 2) return `${local[0] || "*"}***@${domain}`;
  return `${local.slice(0, 2)}${"*".repeat(Math.min(Math.max(local.length - 3, 1), 6))}${local.slice(-1)}@${domain}`;
}

export const lookupByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const target = nationalDigits(args.phone);
    if (!target) return null;

    const allUsers = await ctx.db.query("users").collect();
    const match = allUsers.find(
      (u) => nationalDigits(u.phone) === target || nationalDigits(u.recoveryPhone) === target
    );
    if (!match?.email) return null;

    return { maskedEmail: maskAddress(match.email) };
  },
});

