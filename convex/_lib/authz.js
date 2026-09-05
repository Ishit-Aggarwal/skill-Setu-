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
