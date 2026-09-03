import { ConvexHttpClient } from "convex/browser";

/**
 * Server-side Convex client used by the auth API routes.
 *
 * Convex is the shared, cross-device source of truth for accounts. When it
 * isn't configured the auth routes report CONVEX_NOT_CONFIGURED so the caller
 * can fall back to the legacy device-local store instead of hard-failing.
 */

let cached = null;

export function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  if (!cached) cached = new ConvexHttpClient(url);
  return cached;
}

export function convexUnavailable(res) {
  console.warn(
    "[auth] NEXT_PUBLIC_CONVEX_URL is not set — accounts cannot be stored centrally, " +
      "so sign-in from another device/browser will not work. Run `npx convex dev` and set the URL in .env.local."
  );
  return res.status(503).json({
    success: false,
    code: "CONVEX_NOT_CONFIGURED",
    error:
      "The account database is not configured on this server. Accounts cannot be shared across devices until Convex is set up.",
  });
}
