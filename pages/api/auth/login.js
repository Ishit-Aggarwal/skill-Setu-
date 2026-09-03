import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { maskEmail } from "../../../lib/mailer";

/**
 * Sign-in endpoint.
 *
 * Deliberately stateless: it looks the account up in Convex, checks the
 * credential, and returns the profile. It records no device, issues no
 * exclusive session, and revokes nothing — so the same account can be signed
 * in from any number of browsers, devices or networks at once.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { email, passwordHash } = req.body || {};
  if (!email || typeof email !== "string" || !passwordHash || typeof passwordHash !== "string") {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }

  const normalized = email.trim().toLowerCase();

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.query(api.users.authenticate, { email: normalized, passwordHash });

    if (!outcome?.ok) {
      const messages = {
        NOT_FOUND: "No account found for this email. Try creating one instead.",
        NO_PASSWORD: "This account has no password set. Please register again or use demo mode.",
        BAD_PASSWORD: "Incorrect password. Please try again.",
        UNVERIFIED: "This email hasn't been verified yet. Please complete registration first.",
      };
      console.warn(`[login] Rejected sign-in for ${maskEmail(normalized)}: ${outcome?.reason || "UNKNOWN"}`);
      return res.status(401).json({
        success: false,
        error: messages[outcome?.reason] || "Could not sign you in. Please check your details.",
      });
    }

    console.log(`[login] Signed in ${maskEmail(normalized)}`);
    return res.status(200).json({ success: true, user: outcome.user });
  } catch (error) {
    console.error(`[login] Sign-in failed for ${maskEmail(normalized)}:`, error);
    return res.status(500).json({ success: false, error: "Could not sign you in right now. Please try again." });
  }
}
