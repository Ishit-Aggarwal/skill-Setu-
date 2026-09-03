import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";

/** Best-effort profile sync so edits made on one device show up on the others. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { id, patch } = req.body || {};
  if (!id || typeof id !== "string" || !patch || typeof patch !== "object") {
    return res.status(400).json({ success: false, error: "A user id and patch are required." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const user = await convex.mutation(api.users.updateProfile, { id, patch });
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(`[profile] Failed to sync profile for ${id}:`, error);
    return res.status(500).json({ success: false, error: "Could not save your profile changes." });
  }
}
