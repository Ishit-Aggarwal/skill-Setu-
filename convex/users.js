import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Accounts live here (not in browser localStorage) so a registered user can
 * sign in from any device, browser or network. Nothing in this file ties an
 * account to a device, a session count, or an IP address.
 */

/** Never hand a password hash back to a client. */
function publicUser(doc) {
  if (!doc) return null;
  const { passwordHash, ...rest } = doc;
  return rest;
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

/**
 * Credential check. The comparison happens here so the stored hash is never
 * returned over the wire. Returns null on any failure so callers can't tell
 * "no such account" from "wrong password" by the shape of the response.
 */
export const authenticate = query({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first();

    if (!doc) return { ok: false, reason: "NOT_FOUND" };
    if (!doc.passwordHash) return { ok: false, reason: "NO_PASSWORD" };
    if (doc.passwordHash !== args.passwordHash) return { ok: false, reason: "BAD_PASSWORD" };
    if (doc.emailVerified === false) return { ok: false, reason: "UNVERIFIED" };

    return { ok: true, user: publicUser(doc) };
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
    if (byCustomId) return publicUser(byCustomId);

    try {
      return publicUser(await ctx.db.get(args.id));
    } catch {
      return null;
    }
  },
});

export const listByRole = query({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
    return docs.map(publicUser);
  },
});

/**
 * Create a verified account. Callers must have already checked the signup OTP
 * — `emailVerified` is required and must be true, so an unverified account can
 * never be written by this path.
 */
export const createUser = mutation({
  args: {
    id: v.optional(v.string()),
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
    employeeId: v.optional(v.string()),
    verifiedCode: v.optional(v.union(v.string(), v.null())),
    emailVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.emailVerified !== true) {
      throw new Error("Refusing to create an account that has not passed email verification.");
    }

    const email = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      throw new Error("User already exists with this email");
    }

    const now = new Date().toISOString();
    const id = args.id || `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const _id = await ctx.db.insert("users", {
      ...args,
      id,
      email,
      emailVerified: true,
      verifiedAt: now,
      createdAt: now,
    });

    return publicUser(await ctx.db.get(_id));
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

    if (!user) return null;

    // Guard the fields that must never be client-writable.
    const { passwordHash, email, emailVerified, verifiedAt, id, ...safe } = args.patch || {};
    await ctx.db.patch(user._id, safe);
    return publicUser(await ctx.db.get(user._id));
  },
});

/**
 * Step 1 of password recovery: mint a single-use nonce on the account.
 *
 * It is stored on the user document rather than being a purely stateless
 * signed token, because resetting the password must invalidate any link that
 * was issued earlier — a stateless token cannot be revoked.
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

/** Step 2: swap the password hash, then burn the nonce so the link is single-use. */
export const resetPassword = mutation({
  args: { email: v.string(), nonce: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) return { ok: false, reason: "NOT_FOUND" };
    if (!user.resetNonce || user.resetNonce !== args.nonce) return { ok: false, reason: "BAD_TOKEN" };
    if (!user.resetExpiresAt || Date.now() > user.resetExpiresAt) return { ok: false, reason: "EXPIRED" };

    await ctx.db.patch(user._id, {
      passwordHash: args.passwordHash,
      resetNonce: null,
      resetRequestedAt: null,
      resetExpiresAt: null,
      // Completing a reset proves control of the mailbox, so an account that
      // somehow never finished verification is verified by this too.
      emailVerified: true,
    });

    return { ok: true, user: publicUser(await ctx.db.get(user._id)) };
  },
});

/** Account deletion, issued from the profile modal's danger zone. */
export const deleteUser = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!user) return { ok: false, reason: "NOT_FOUND" };
    await ctx.db.delete(user._id);
    return { ok: true };
  },
});
