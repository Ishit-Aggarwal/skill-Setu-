import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { maskEmail } from "../../../lib/mailer";

/**
 * Step 2 of password recovery. The nonce is validated server-side against the
 * account document, so a tampered link cannot set anybody's password, and a
 * link that has already been used is rejected because completing a reset
 * clears the nonce.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { email, token, passwordHash } = req.body || {};
  if (!email || typeof email !== "string" || !token || typeof token !== "string") {
    return res.status(400).json({ success: false, error: "This reset link is incomplete. Please request a new one." });
  }
  if (!passwordHash || typeof passwordHash !== "string") {
    return res.status(400).json({ success: false, error: "A new password is required." });
  }

  const normalized = email.trim().toLowerCase();

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.mutation(api.users.resetPassword, {
      email: normalized,
      nonce: token,
      passwordHash,
    });

    if (!outcome?.ok) {
      const messages = {
        NOT_FOUND: "No account found for this email address.",
        BAD_TOKEN: "This reset link is no longer valid. It may have already been used — please request a new one.",
        EXPIRED: "This reset link has expired (30-minute validity). Please request a new one.",
      };
      console.warn(`[reset-password] Rejected reset for ${maskEmail(normalized)}: ${outcome?.reason || "UNKNOWN"}`);
      return res.status(400).json({ success: false, error: messages[outcome?.reason] || "Could not reset your password." });
    }

    console.log(`[reset-password] Password reset completed for ${maskEmail(normalized)}`);
    return res.status(200).json({ success: true, user: outcome.user });
  } catch (error) {
    console.error(`[reset-password] Failed for ${maskEmail(normalized)}:`, error);
    return res.status(500).json({ success: false, error: "Could not reset your password right now. Please try again." });
  }
}
