/**
 * Server-side authorization primitives.
 *
 * Convex functions are reachable by anyone who knows the deployment URL, so
 * "the UI only calls this from the owner's screen" is not a control. Every
 * privileged mutation resolves its caller here, from a session row the server
 * issued, and then checks that caller against the record being touched.
 *
 * Files under `convex/_lib` are ignored by Convex's function registration, so
 * this module can export plain helpers.
 */

import { canReadPure, INSTITUTION_SHARED_TABLES, INSTITUTION_PRIVATE_TABLES } from "../../lib/authzRules";
import { resolveInstitutionAccount } from "../../lib/institutionKey";

/** Thrown as a plain Error — Convex surfaces the message to the caller. */
export function authError(message = "Not authorised.") {
  return new Error(`UNAUTHORIZED: ${message}`);
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function sessionTtlMs() {
  return SESSION_TTL_MS;
}

/**
 * Resolves the signed-in user behind a session token.
 * Returns null when the token is missing, unknown or expired — callers decide
 * whether that is fatal (mutations) or simply "anonymous" (public reads).
 */
export async function getActor(ctx, sessionToken) {
  if (!sessionToken || typeof sessionToken !== "string") return null;

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", sessionToken))
    .first();

  if (!session) return null;
  if (session.expiresAt && Date.now() > session.expiresAt) return null;

  const user = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("id"), session.userId))
    .first();

  if (!user) return null;
  return { session, user, id: user.id, role: user.role };
}

/** Same, but refuses to continue without a valid session. */
export async function requireActor(ctx, sessionToken) {
  const actor = await getActor(ctx, sessionToken);
  if (!actor) throw authError("You must be signed in to do this.");
  return actor;
}

export function isAdmin(actor) {
  return actor?.role === "admin";
}

/** The caller must be the subject themselves, or an admin. */
export function requireSelfOrAdmin(actor, subjectUserId) {
  if (!actor) throw authError("You must be signed in to do this.");
  if (actor.id === subjectUserId || isAdmin(actor)) return actor;
  throw authError("You can only change your own account.");
}

export async function requireRole(ctx, sessionToken, roles) {
  const actor = await requireActor(ctx, sessionToken);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(actor.role) && !isAdmin(actor)) {
    throw authError(`This action is limited to: ${allowed.join(", ")}.`);
  }
  return actor;
}

/**
 * Ownership of a listing (internship / skill test / programme). Accepts the
 * document, not an id, so the caller has already proved the row exists.
 */
export function requireOwner(actor, doc, { field = "ownerId", what = "this record" } = {}) {
  if (!actor) throw authError("You must be signed in to do this.");
  if (isAdmin(actor)) return actor;
  if (!doc) throw authError(`${what} no longer exists.`);
  if (doc[field] !== actor.id) throw authError(`Only the account that created ${what} can change it.`);
  return actor;
}

/** Fields nobody may ever set on themselves through a profile patch. */
export const PROTECTED_USER_FIELDS = [
  "role",
  "passwordHash",
  "email",
  "emailVerified",
  "verifiedAt",
  "verifiedCode",
  "id",
  "_id",
  "_creationTime",
  "resetNonce",
  "resetRequestedAt",
  "resetExpiresAt",
];

export function stripProtectedFields(patch) {
  const safe = { ...(patch || {}) };
  PROTECTED_USER_FIELDS.forEach((f) => delete safe[f]);
  return safe;
}

/** Never hand a password hash or a reset nonce back to a client. */
export function publicUser(doc) {
  if (!doc) return null;
  const { passwordHash, resetNonce, resetRequestedAt, resetExpiresAt, ...rest } = doc;
  return rest;
}

/* ============================================================
   Read authorization — every legitimate cross-account read
   ============================================================ */


async function byClientId(ctx, table, id) {
  if (!id) return null;
  return await ctx.db
    .query(table)
    .filter((q) => q.eq(q.field("id"), id))
    .first();
}

async function institutionAccounts(ctx) {
  return await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "institution"))
    .collect();
}

/**
 * The institution account a user belongs to, or null (lib/institutionKey.js
 * rule). One indexed query; nothing is cached, since it only runs on
 * institution-scoped reads.
 */
export async function resolveInstitutionId(ctx, user) {
  if (!user) return null;
  if (user.role === "institution") return user.id || null;
  const { account } = resolveInstitutionAccount(user, await institutionAccounts(ctx));
  return account?.id || null;
}

async function relatedFor(ctx, actor, table, row) {
  const related = {};
  switch (table) {
    case "applications": {
      related.internship = await byClientId(ctx, "internships", row.internshipId);
      if (related.internship && actor.user?.email) {
        related.recruiter = await ctx.db
          .query("recruiters")
          .withIndex("by_owner", (q) => q.eq("companyOwnerId", related.internship.ownerId))
          .filter((q) => q.eq(q.field("email"), String(actor.user.email).toLowerCase()))
          .first();
      }
      break;
    }
    case "skillTestRegistrations": {
      related.test = await byClientId(ctx, "skillTests", row.testId);
      if (["institution", "academician"].includes(actor.role)) {
        related.actorInstitutionId = await resolveInstitutionId(ctx, actor.user);
        const student = await byClientId(ctx, "users", row.userId);
        related.studentInstitutionId = student ? await resolveInstitutionId(ctx, student) : null;
      }
      break;
    }
    case "collabInterests":
    case "collabMessages":
    case "collabMilestones":
    case "collabFiles": {
      const listingId = table === "collabInterests" ? row.listingId : row.collabId;
      related.listing = await byClientId(ctx, "collabListings", listingId);
      if (related.listing) {
        const interest = await ctx.db
          .query("collabInterests")
          .withIndex("by_listing", (q) => q.eq("listingId", listingId))
          .filter((q) => q.eq(q.field("userId"), actor.id))
          .first();
        related.hasAcceptedInterest = Boolean(interest && interest.status === "Accepted");
      }
      break;
    }
    case "portfolios":
      related.student = await byClientId(ctx, "users", row.studentId);
      break;
    case "driveInvites":
    case "driveEligibility":
      related.drive = await byClientId(ctx, "drives", row.driveId);
      if (table === "driveEligibility" && ["student", "academician"].includes(actor.role)) {
        related.actorInstitutionId = await resolveInstitutionId(ctx, actor.user);
      }
      break;
    default:
      if (INSTITUTION_SHARED_TABLES.has(table) && ["student", "academician"].includes(actor.role)) {
        related.actorInstitutionId = await resolveInstitutionId(ctx, actor.user);
      }
      break;
  }
  return related;
}

/** Can `actor` read `row` from `table`? See lib/authzRules.js for the rules. */
export async function canRead(ctx, actor, table, row) {
  if (!actor || !row) return false;
  if (isAdmin(actor)) return true;
  if (INSTITUTION_PRIVATE_TABLES.has(table)) return row.institutionId === actor.id;
  return canReadPure(actor, table, row, await relatedFor(ctx, actor, table, row));
}

export async function requireRead(ctx, actor, table, row) {
  if (!(await canRead(ctx, actor, table, row))) throw authError("You do not have access to that record.");
  return row;
}
