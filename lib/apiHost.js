import { getConvexClient } from "./convexServer";
import { api } from "../convex/_generated/api";
import { readSessionToken, unauthorized } from "./apiAuth";

const HOST_ROLES = ["industry", "academician", "institution", "admin"];

/**
 * Resolves the signed-in account behind an API request and checks its role,
 * or writes the refusal and returns null. The caller is always the session's
 * account — never an id from the request body.
 */
export async function requireActorRole(req, res, roles, { refusal = "Your account can't use this." } = {}) {
  const sessionToken = readSessionToken(req);
  if (!sessionToken) {
    unauthorized(res);
    return null;
  }
  const convex = getConvexClient();
  if (!convex) {
    res.status(503).json({ success: false, error: "Account database unavailable." });
    return null;
  }
  let actor = null;
  try {
    actor = await convex.query(api.auth.me, { sessionToken });
  } catch {
    actor = null;
  }
  if (!actor) {
    unauthorized(res);
    return null;
  }
  if (roles && !roles.includes(actor.role)) {
    res.status(403).json({ success: false, error: refusal });
    return null;
  }
  return { actor, sessionToken, convex };
}

/**
 * Resolves the signed-in host behind an API request, or writes the refusal
 * and returns null. Every AI route spends the server's key, so only the
 * roles that may publish a test get past this.
 */
export async function requireHost(req, res) {
  return await requireActorRole(req, res, HOST_ROLES, { refusal: "Only test hosts can use this." });
}

/** The same for student-only routes (the resume coach). */
export async function requireStudent(req, res) {
  return await requireActorRole(req, res, ["student", "admin"], { refusal: "Only student accounts can use this." });
}

const LIMIT_MESSAGE = {
  host_questions: (limit) => `You've used today's ${limit} AI runs. They reset at midnight IST.`,
  resume: (limit) => `You've used today's ${limit} resume analyses. They reset at midnight IST.`,
};

/**
 * Charges one AI run to the caller's daily allowance, on the server, before
 * the model is called. Writes the refusal and returns false when the day's
 * runs are used up.
 */
export async function chargeAiRun(auth, res, bucket) {
  try {
    const out = await auth.convex.mutation(api.aiUsage.consume, { sessionToken: auth.sessionToken, bucket });
    if (out?.ok) {
      // Handed back with the response so the screen can say "32 AI runs left today".
      auth.aiRunsLeft = out.remaining;
      return true;
    }
    res.status(429).json({ success: false, code: "AI_DAILY_LIMIT", error: (LIMIT_MESSAGE[bucket] || LIMIT_MESSAGE.host_questions)(out?.limit) });
    return false;
  } catch (error) {
    console.error("[ai] Could not check the daily allowance:", error?.message || error);
    res.status(503).json({ success: false, error: "Could not check your AI allowance right now. Please try again." });
    return false;
  }
}

/** Hands a run back when the model never answered (the service was down or busy). */
export async function refundAiRun(auth, bucket) {
  try {
    await auth.convex.mutation(api.aiUsage.refund, { sessionToken: auth.sessionToken, bucket });
  } catch {
    /* best effort */
  }
}
