import { getConvexClient } from "./convexServer";
import { api } from "../convex/_generated/api";
import { readSessionToken, unauthorized } from "./apiAuth";

const HOST_ROLES = new Set(["industry", "academician", "institution", "admin"]);

/**
 * Resolves the signed-in host behind an API request, or writes the refusal
 * and returns null. Every AI route spends the server's key, so only the
 * roles that may publish a test get past this.
 */
export async function requireHost(req, res) {
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
  if (!HOST_ROLES.has(actor.role)) {
    res.status(403).json({ success: false, error: "Only test hosts can use this." });
    return null;
  }
  return { actor, sessionToken, convex };
}
