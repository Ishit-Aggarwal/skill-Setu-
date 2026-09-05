import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { maskEmail } from "../../../lib/mailer";

/**
 * Sign-in endpoint.
 *
 * The password is sent over TLS and compared against a bcrypt hash inside
 * Convex — the browser no longer hashes anything, because a client-computed
 * digest is just a password with extra steps: whoever steals the database can
 * replay it directly.
 *
 * Deliberately stateless about devices: it records no device and revokes
 * nothing, so the same account can be signed in from any number of browsers at
 * once. What it does return is a session token, which every privileged call
 * afterwards has to present.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { email, password, organisation, role } = req.body || {};
  if (!password || typeof password !== "string") {
    return res.status(400).json({ success: false, error: "A password is required." });
  }
  const byOrganisation = typeof organisation === "string" && organisation.trim().length > 0;
  if (!byOrganisation && (!email || typeof email !== "string")) {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }

  const normalized = byOrganisation ? "" : email.trim().toLowerCase();
  const label = byOrganisation ? organisation.trim() : maskEmail(normalized);

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.action(api.authNode.signIn, {
      email: normalized || undefined,
      organisation: byOrganisation ? organisation.trim() : undefined,
      role: byOrganisation ? role : undefined,
      password,
    });

    if (!outcome?.ok) {
      const identifier = byOrganisation ? "organisation name" : "email";
      const messages = {
        NOT_FOUND: `No account found for that ${identifier}. Try creating one instead.`,
        NO_PASSWORD: "This account has no password set. Please register again or use demo mode.",
        BAD_PASSWORD: "Incorrect password. Please try again.",
        UNVERIFIED: "This email hasn't been verified yet. Please complete registration first.",
        AMBIGUOUS: `There are ${outcome?.accountCount || 2} accounts registered under that organisation name. Please sign in with your work email address instead.`,
      };
      console.warn(`[login] Rejected sign-in for ${label}: ${outcome?.reason || "UNKNOWN"}`);
      return res.status(401).json({
        success: false,
        code: outcome?.reason,
        error: messages[outcome?.reason] || "Could not sign you in. Please check your details.",
      });
    }

    console.log(`[login] Signed in ${label}`);
    return res.status(200).json({ success: true, user: outcome.user, sessionToken: outcome.sessionToken });
  } catch (error) {
    console.error(`[login] Sign-in failed for ${label}:`, error);
    return res.status(500).json({ success: false, error: "Could not sign you in right now. Please try again." });
  }
}
