import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { readSessionToken, unauthorized } from "../../../lib/apiAuth";

/**
 * Profile sync.
 *
 * This route used to take an id and a patch and write them, which meant anyone
 * could edit anyone's profile by changing one field in the request body. The
 * id now has to belong to the session presenting the request — the check is
 * repeated inside the Convex mutation, so bypassing this route does not help.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const sessionToken = readSessionToken(req);
  if (!sessionToken) return unauthorized(res);

  const { id, patch } = req.body || {};
  if (!id || typeof id !== "string" || !patch || typeof patch !== "object") {
    return res.status(400).json({ success: false, error: "A user id and patch are required." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const user = await convex.mutation(api.users.updateProfile, { sessionToken, id, patch });
    if (!user) return res.status(404).json({ success: false, error: "That account no longer exists." });
    return res.status(200).json({ success: true, user });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("UNAUTHORIZED")) {
      return res.status(403).json({ success: false, error: message.split("UNAUTHORIZED:").pop().trim() });
    }
    console.error(`[profile] Failed to sync profile for ${id}:`, error);
    return res.status(500).json({ success: false, error: "Could not save your profile changes." });
  }
}
