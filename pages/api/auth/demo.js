import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";

/**
 * Enters demo mode.
 *
 * The personas are real accounts on the server, created on first use, so a
 * visitor exploring the product can take a graded skill test and book a
 * mentoring slot rather than hitting "you must be signed in" on the two
 * features worth showing. If the account database isn't configured the caller
 * falls back to the old browser-only personas.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { role } = req.body || {};
  if (!["student", "industry", "academician", "institution"].includes(role)) {
    return res.status(400).json({ success: false, error: "Unknown demo persona." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.action(api.authNode.signInAsDemo, { role });
    if (!outcome?.ok) {
      return res.status(400).json({ success: false, error: outcome?.error || "Could not start demo mode." });
    }
    return res.status(200).json({ success: true, user: outcome.user, sessionToken: outcome.sessionToken });
  } catch (error) {
    console.error(`[demo] Could not sign in as the ${role} persona:`, error);
    return res.status(500).json({ success: false, error: "Could not start demo mode right now." });
  }
}
