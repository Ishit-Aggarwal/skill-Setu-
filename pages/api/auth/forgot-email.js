import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { maskEmail } from "../../../lib/mailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { phone } = req.body || {};
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ success: false, error: "A valid phone number is required." });
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return res.status(400).json({ success: false, error: "Please enter a valid phone number with at least 7 digits." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const result = await convex.query(api.users.lookupByPhone, { phone });
    if (!result || !result.email) {
      return res.status(404).json({
        success: false,
        error: "No registered account found matching this phone number.",
      });
    }

    return res.status(200).json({
      success: true,
      found: true,
      name: result.name || "Account Holder",
      role: result.role || "student",
      rawEmail: result.email,
      maskedEmail: maskEmail(result.email),
    });
  } catch (err) {
    console.error("[forgot-email] Error looking up user by phone:", err);
    return res.status(500).json({ success: false, error: "Could not lookup account right now. Please try again." });
  }
}
