import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";

/**
 * Removes the server-owned account when a user deletes themselves from the
 * profile modal. The browser clears its own local mirror separately — this
 * endpoint only owns the central record.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { id } = req.body || {};
  if (!id || typeof id !== "string") {
    return res.status(400).json({ success: false, error: "A user id is required." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.mutation(api.users.deleteUser, { id });
    return res.status(200).json({ success: Boolean(outcome?.ok) });
  } catch (error) {
    console.error(`[delete] Failed to delete account ${id}:`, error);
    return res.status(500).json({ success: false, error: "Could not delete the account." });
  }
}
