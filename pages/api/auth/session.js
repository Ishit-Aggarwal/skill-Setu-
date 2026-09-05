import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { readSessionToken } from "../../../lib/apiAuth";

/**
 * Who is this session? Called on page load to rehydrate the signed-in profile
 * from the server rather than trusting the copy cached in the browser — a
 * cached profile can be edited in devtools, a session row cannot.
 *
 * POST ends the session (sign-out); GET/HEAD-style POST with `action: "whoami"`
 * is the default read.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const sessionToken = readSessionToken(req);
  if (!sessionToken) return res.status(200).json({ success: true, user: null });

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    if (req.body?.action === "signout") {
      await convex.mutation(api.auth.signOut, { sessionToken });
      return res.status(200).json({ success: true, user: null });
    }
    if (req.body?.action === "signout-everywhere") {
      const outcome = await convex.mutation(api.auth.signOutEverywhere, { sessionToken });
      return res.status(200).json({ success: true, removed: outcome?.removed || 0 });
    }

    const user = await convex.query(api.auth.me, { sessionToken });
    return res.status(200).json({ success: true, user: user || null });
  } catch (error) {
    console.error("[session] Lookup failed:", error);
    return res.status(200).json({ success: true, user: null });
  }
}
