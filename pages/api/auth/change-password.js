import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { readSessionToken, unauthorized } from "../../../lib/apiAuth";

/**
 * Changing your password from the Settings tab. Requires the current password
 * as well as the session, so a borrowed, unlocked browser cannot be used to
 * lock the owner out of their own account.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const sessionToken = readSessionToken(req);
  if (!sessionToken) return unauthorized(res);

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Enter your current password and the new one." });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters long." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.action(api.authNode.changePassword, {
      sessionToken,
      currentPassword: String(currentPassword),
      newPassword: String(newPassword),
    });
    if (!outcome?.ok) {
      const status = outcome?.reason === "UNAUTHORIZED" ? 401 : 400;
      return res.status(status).json({ success: false, error: outcome?.error || "Could not change your password." });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[change-password] Failed:", error);
    return res.status(500).json({ success: false, error: "Could not change your password right now." });
  }
}
