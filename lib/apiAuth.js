/**
 * Session-token plumbing for the API routes.
 *
 * The token is read from the Authorization header first and the body second,
 * so a caller can use whichever suits them, but it is never inferred from a
 * user id in the payload — that inference is exactly what let one account act
 * as another.
 */

export function readSessionToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const fromBody = req.body?.sessionToken;
  return typeof fromBody === "string" && fromBody.trim() ? fromBody.trim() : null;
}

export function unauthorized(res, message = "Please sign in again to continue.") {
  return res.status(401).json({ success: false, code: "NO_SESSION", error: message });
}

/** Maps a Convex authorization failure onto an HTTP response. */
export function forwardConvexError(res, error, fallback) {
  const message = String(error?.message || "");
  if (message.includes("UNAUTHORIZED")) {
    return res.status(403).json({ success: false, error: message.split("UNAUTHORIZED:").pop().trim() });
  }
  console.error(fallback.logPrefix || "[api]", error);
  return res.status(500).json({ success: false, error: fallback.message });
}
