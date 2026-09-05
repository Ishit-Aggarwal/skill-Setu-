"use node";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { publicUser } from "./_lib/authz";
import { validateRegistryCode } from "./_lib/verification";

/**
 * Credential handling.
 *
 * Passwords are hashed with bcrypt (per-password salt, cost 12) inside Convex,
 * next to the only copy of the hash. Nothing in this file ever returns a hash,
 * and the queries that read one are `internal*`, so a bare deployment URL
 * cannot reach them.
 *
 * Accounts created before this change stored an unsalted SHA-256 digest of the
 * password, computed in the browser. Those are upgraded transparently: the
 * first time such a user signs in successfully, the plaintext they just proved
 * they know is re-hashed with bcrypt and the old digest is overwritten.
 */

const BCRYPT_COST = 12;
const LEGACY_SHA256 = /^[a-f0-9]{64}$/i;
const OTP_SECRET = process.env.OTP_SECRET || "setu-dev-otp-secret-change-me";

function legacyDigest(password) {
  return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

function hmac(value) {
  return crypto.createHmac("sha256", OTP_SECRET).update(value).digest("hex");
}

/**
 * The signup OTP is re-checked HERE, in the same call that creates the account,
 * so a client cannot skip the email-verification step by calling the account
 * creation path directly. `pages/api/send-otp` mints the token; only its hash
 * ever leaves the server.
 */
function verifyOtpToken(token, email, otp) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, error: "Your verification session expired. Please request a new code." };
  }
  const [payload, signature] = token.split(".");
  if (hmac(payload) !== signature) {
    return { valid: false, error: "Your verification session is invalid. Please request a new code." };
  }
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { valid: false, error: "Your verification session is invalid. Please request a new code." };
  }
  if (decoded.email !== email) return { valid: false, error: "This code was issued for a different email address." };
  if (Date.now() > decoded.expiresAt) {
    return { valid: false, error: "This verification code has expired (5-minute validity). Please request a new code." };
  }
  if (hmac(`${email}:${otp}`) !== decoded.otpHash) {
    return { valid: false, error: "Invalid verification code. Please enter the correct 6-digit code." };
  }
  return { valid: true };
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return { ok: false, legacy: false };
  if (LEGACY_SHA256.test(storedHash)) {
    // Two shapes of legacy value: the browser used to send us a SHA-256 of the
    // password, so the stored digest may match either the plaintext hashed
    // here or the digest the old client computed.
    const digest = legacyDigest(password);
    const ok = digest === storedHash.toLowerCase() || password.toLowerCase() === storedHash.toLowerCase();
    return { ok, legacy: true };
  }
  try {
    return { ok: await bcrypt.compare(password, storedHash), legacy: false };
  } catch {
    return { ok: false, legacy: false };
  }
}

/* ============================================================
   Sign in
   ============================================================ */

export const signIn = action({
  args: {
    email: v.optional(v.string()),
    password: v.string(),
    // Companies and institutions sign in as the organisation, by name.
    organisation: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = String(args.email || "").trim().toLowerCase();
    const organisation = String(args.organisation || "").trim();
    const password = String(args.password || "");
    if (!password || (!email && !organisation)) return { ok: false, reason: "BAD_REQUEST" };

    let record = null;
    if (organisation) {
      if (!["industry", "institution"].includes(args.role || "")) {
        return { ok: false, reason: "BAD_REQUEST" };
      }
      const { matches } = await ctx.runQuery(internal.auth.findAuthRecordByOrganisation, {
        role: args.role,
        name: organisation,
      });
      if (matches.length === 0) return { ok: false, reason: "NOT_FOUND" };
      if (matches.length > 1) {
        // More than one account under the same organisation name is normal for
        // a large employer. Ask which one rather than picking.
        return { ok: false, reason: "AMBIGUOUS", accountCount: matches.length };
      }
      record = matches[0];
    } else {
      record = await ctx.runQuery(internal.auth.findAuthRecordByEmail, { email });
    }

    if (!record) return { ok: false, reason: "NOT_FOUND" };
    if (!record.passwordHash) return { ok: false, reason: "NO_PASSWORD" };

    const { ok, legacy } = await verifyPassword(password, record.passwordHash);
    if (!ok) return { ok: false, reason: "BAD_PASSWORD" };
    if (record.emailVerified === false) return { ok: false, reason: "UNVERIFIED" };

    if (legacy) {
      // Transparent upgrade: they just proved the plaintext, so re-hash it.
      const upgraded = await bcrypt.hash(password, BCRYPT_COST);
      await ctx.runMutation(internal.auth.setPasswordHash, { docId: record._id, passwordHash: upgraded });
    }

    const sessionToken = await ctx.runMutation(internal.auth.issueSession, {
      userId: record.id,
      role: record.role,
    });

    return { ok: true, user: publicUser(record), sessionToken };
  },
});

/* ============================================================
   Register
   ============================================================ */

export const register = action({
  args: { profile: v.any(), otp: v.string(), otpToken: v.string() },
  handler: async (ctx, args) => {
    const profile = args.profile || {};
    const email = String(profile.email || "").trim().toLowerCase();
    const password = String(profile.password || "");
    const role = String(profile.role || "");

    if (!email) return { ok: false, reason: "BAD_REQUEST", error: "An email address is required." };
    if (password.length < 8) {
      return { ok: false, reason: "WEAK_PASSWORD", error: "Password must be at least 8 characters long." };
    }
    if (!["student", "industry", "academician", "institution"].includes(role)) {
      return { ok: false, reason: "BAD_ROLE", error: "Choose a valid account type." };
    }

    // ---- Gate 1: email verification, checked server-side. ----
    const otpResult = verifyOtpToken(args.otpToken, email, String(args.otp || "").trim());
    if (!otpResult.valid) return { ok: false, reason: "BAD_OTP", error: otpResult.error };

    // ---- Gate 2: the institution / company / faculty code, checked here. ----
    // The browser also checks it, but that check is only a convenience; this is
    // the one that decides whether the account is created.
    const codeCheck = validateRegistryCode(role, profile.verifiedCode);
    if (!codeCheck.valid) return { ok: false, reason: "BAD_CODE", error: codeCheck.message };

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const doc = {
      email,
      passwordHash,
      role,
      name: profile.name || undefined,
      institution: profile.institution || undefined,
      instituteName: profile.instituteName || undefined,
      instituteId: profile.instituteId || undefined,
      department: profile.department || undefined,
      course: profile.course || undefined,
      year: profile.year || undefined,
      companyName: profile.companyName || undefined,
      workEmailDomain: profile.workEmailDomain || undefined,
      phone: profile.phone || undefined,
      employeeId: profile.employeeId || undefined,
      verifiedCode: codeCheck.code || undefined,
    };

    let created;
    try {
      created = await ctx.runMutation(internal.auth.insertAccount, { doc });
    } catch (err) {
      if (String(err?.message || "").includes("already exists")) {
        return { ok: false, reason: "DUPLICATE", error: "An account with this email already exists. Try signing in instead." };
      }
      throw err;
    }

    const sessionToken = await ctx.runMutation(internal.auth.issueSession, {
      userId: created.id,
      role: created.role,
    });

    return { ok: true, user: publicUser(created), sessionToken };
  },
});

/* ============================================================
   Password recovery & change
   ============================================================ */

export const completePasswordReset = action({
  args: { email: v.string(), nonce: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = String(args.email || "").trim().toLowerCase();
    const password = String(args.password || "");
    if (password.length < 8) {
      return { ok: false, reason: "WEAK_PASSWORD", error: "Password must be at least 8 characters long." };
    }

    const record = await ctx.runQuery(internal.auth.findAuthRecordByEmail, { email });
    if (!record) return { ok: false, reason: "NOT_FOUND" };
    if (!record.resetNonce || record.resetNonce !== args.nonce) return { ok: false, reason: "BAD_TOKEN" };
    if (!record.resetExpiresAt || Date.now() > record.resetExpiresAt) return { ok: false, reason: "EXPIRED" };

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await ctx.runMutation(internal.auth.setPasswordHash, {
      docId: record._id,
      passwordHash,
      // Completing a reset proves control of the mailbox.
      alsoVerify: true,
    });
    await ctx.runMutation(internal.auth.clearResetNonce, { docId: record._id });
    // Anyone still signed in on an old session is signed out by a reset.
    await ctx.runMutation(internal.auth.revokeAllSessions, { userId: record.id });

    return { ok: true };
  },
});

/**
 * The four demo personas, as real accounts.
 *
 * Demo mode exists so somebody can look around without signing up. Now that
 * graded tests and mentorship scheduling are server-side, a persona with no
 * session could not use either — it would have been a tour of the parts that
 * still work. So the personas are real, verified accounts with fixed ids that
 * match the sample data seeded in the browser, and demo mode signs into them
 * through the ordinary sign-in path.
 *
 * They hold no private data and are deliberately shared; the password is not a
 * secret and is never used for anything else.
 */
const DEMO_PASSWORD = "setu-demo-2026";

const DEMO_ACCOUNTS = [
  {
    id: "demo-student",
    email: "demo.student@setu.dev",
    role: "student",
    name: "Aarav Sharma",
    institution: "Apex University of Technology & Applied Sciences",
    department: "Computer Science & Engineering",
    course: "B.Tech CSE",
    year: "4th Year",
    openToOpportunities: true,
  },
  {
    id: "demo-industry",
    email: "demo.industry@setu.dev",
    role: "industry",
    name: "Rakesh Menon",
    companyName: "Apex Global Technologies & Innovations",
    workEmailDomain: "@apextechnologies.example.in",
    verifiedCode: "APEX-IND-2026",
  },
  {
    id: "demo-academician",
    email: "demo.academician@setu.dev",
    role: "academician",
    name: "Dr. Shalini Kulkarni",
    institution: "Apex University of Technology & Applied Sciences",
    department: "Life Sciences & Biotechnology",
    designation: "Professor",
    verifiedCode: "APEX-FAC-2026",
  },
  {
    id: "demo-institution",
    email: "demo.institution@setu.dev",
    role: "institution",
    name: "Dr. Arvind Sundaram",
    instituteName: "Apex University of Technology & Applied Sciences",
    instituteId: "AISHE-U-0842",
    verifiedCode: "APEX-INST-2026",
  },
];

export const signInAsDemo = action({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    const template = DEMO_ACCOUNTS.find((a) => a.role === args.role);
    if (!template) return { ok: false, error: "Unknown demo persona." };

    let record = await ctx.runQuery(internal.auth.findAuthRecordByEmail, { email: template.email });
    if (record) {
      // Keep the persona in step with the template — an older demo row left
      // over from a previous version can be missing the department the skill
      // rubric is derived from, which makes the tour look broken.
      record = await ctx.runMutation(internal.auth.patchAccount, { docId: record._id, patch: template });
      // Older demo rows were created with no password at all, which meant the
      // persona could not be signed into through the ordinary login form.
      if (!record.passwordHash) {
        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
        await ctx.runMutation(internal.auth.setPasswordHash, { docId: record._id, passwordHash, alsoVerify: true });
      }
    } else {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
      record = await ctx.runMutation(internal.auth.insertAccount, { doc: { ...template, passwordHash } });
    }

    const sessionToken = await ctx.runMutation(internal.auth.issueSession, {
      userId: record.id,
      role: record.role,
    });
    return { ok: true, user: publicUser(record), sessionToken };
  },
});

/**
 * Deployment self-check.
 *
 * The signup OTP is signed by the Next.js server and verified here, so the two
 * have to share a secret. Returns an HMAC of a fixed, public probe string under
 * that secret: the caller can compare it against their own to prove the secrets
 * match, without either side revealing the secret or being usable as an oracle
 * for guessing real codes.
 */
export const secretFingerprint = action({
  args: {},
  handler: async () => ({
    fingerprint: hmac("skill-setu-otp-secret-probe").slice(0, 16),
    usingDefaultSecret: !process.env.OTP_SECRET,
  }),
});

/** Changing your own password from Settings — requires the current one. */
export const changePassword = action({
  args: { sessionToken: v.string(), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const actor = await ctx.runQuery(internal.auth.resolveSession, { sessionToken: args.sessionToken });
    if (!actor) return { ok: false, reason: "UNAUTHORIZED", error: "Please sign in again." };
    if (String(args.newPassword || "").length < 8) {
      return { ok: false, reason: "WEAK_PASSWORD", error: "Password must be at least 8 characters long." };
    }

    const record = await ctx.runQuery(internal.auth.findAuthRecordById, { id: actor.id });
    if (!record) return { ok: false, reason: "NOT_FOUND" };

    const { ok } = await verifyPassword(String(args.currentPassword || ""), record.passwordHash);
    if (!ok) return { ok: false, reason: "BAD_PASSWORD", error: "Your current password is incorrect." };

    const passwordHash = await bcrypt.hash(String(args.newPassword), BCRYPT_COST);
    await ctx.runMutation(internal.auth.setPasswordHash, { docId: record._id, passwordHash });
    return { ok: true };
  },
});
