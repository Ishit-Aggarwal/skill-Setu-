import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";

/**
 * "Which email did I sign up with?"
 *
 * Unauthenticated by necessity — the caller has lost access to their account,
 * so there is nothing to authenticate them with. It is therefore built to give
 * away as little as possible:
 *
 *  - The response carries a masked address and nothing else. It used to carry
 *    `rawEmail`, plus the account holder's name and role, to anyone who posted
 *    a phone number. That is a phone-to-identity lookup for the entire user
 *    table, and the `maskedEmail` sitting beside the raw one made the masking
 *    decorative.
 *
 *  - A number with no account gets the same 200 as one with an account. A 404
 *    that says "no account matches this number" is an oracle: it turns the
 *    endpoint into a way to test whether a person is on the platform.
 *
 * The masking happens in the Convex query, so the raw address never crosses a
 * process boundary at all.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { phone } = req.body || {};
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ success: false, error: "A valid phone number is required." });
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return res.status(400).json({ success: false, error: "Please enter the full 10-digit mobile number." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  // Identical shape whether or not anything matched.
  const generic = {
    success: true,
    found: false,
    maskedEmail: null,
    message: "If an account is registered to that number, the address it uses is shown above.",
  };

  try {
    const result = await convex.query(api.users.lookupByPhone, { phone });
    if (!result?.maskedEmail) {
      console.warn("[forgot-email] No account for the submitted number — responding generically.");
      return res.status(200).json(generic);
    }

    return res.status(200).json({
      success: true,
      found: true,
      maskedEmail: result.maskedEmail,
      message: "That number is registered to the address below.",
    });
  } catch (err) {
    console.error("[forgot-email] Error looking up an account by phone:", err);
    return res.status(500).json({ success: false, error: "Could not look that up right now. Please try again." });
  }
}
