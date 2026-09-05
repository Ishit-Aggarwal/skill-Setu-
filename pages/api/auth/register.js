import { verifyOtpToken } from "../../../lib/otp";
import { validateRegistryCode } from "../../../convex/_lib/verification";
import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { maskEmail } from "../../../lib/mailer";

/**
 * Registration endpoint.
 *
 * Two gates, both server-side, and both repeated inside Convex in the same call
 * that writes the account:
 *
 *   1. the emailed OTP must be valid, unexpired and correctly signed;
 *   2. for organisation accounts, the partner verification code must exist in
 *      the registry.
 *
 * The browser checks both as well, purely for immediate feedback. Neither of
 * those checks decides anything — skipping the form and posting straight to
 * this route, or straight to the Convex action behind it, still fails.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { profile, otp, token } = req.body || {};

  if (!profile || typeof profile !== "object" || !profile.email) {
    return res.status(400).json({ success: false, error: "Registration details are missing." });
  }
  if (!otp || typeof otp !== "string" || !otp.trim()) {
    return res.status(400).json({ success: false, error: "Please enter the OTP verification code." });
  }
  if (!profile.password || String(profile.password).length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters long." });
  }

  const email = String(profile.email).trim().toLowerCase();
  const trimmedOtp = otp.trim();

  // ---- Gate 1 (edge copy): reject an obviously bad OTP before doing work. ----
  const otpResult = verifyOtpToken(token, email, trimmedOtp);
  if (!otpResult.valid) {
    console.warn(`[register] OTP rejected for ${maskEmail(email)}: ${otpResult.error}`);
    return res.status(400).json({ success: false, error: otpResult.error });
  }

  // ---- Gate 2 (edge copy): partner code must be real for non-student roles. ----
  const codeCheck = validateRegistryCode(profile.role, profile.verifiedCode);
  if (!codeCheck.valid) {
    console.warn(`[register] Verification code rejected for ${maskEmail(email)} (role=${profile.role})`);
    return res.status(400).json({ success: false, error: codeCheck.message });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.action(api.authNode.register, {
      profile: {
        email,
        password: String(profile.password),
        role: profile.role,
        name: profile.name || undefined,
        institution: profile.institution || undefined,
        instituteName: profile.instituteName || undefined,
        instituteId: profile.instituteId || undefined,
        department: profile.department || undefined,
        course: profile.course || undefined,
        year: profile.year || undefined,
        companyName: profile.companyName || undefined,
        workEmailDomain: profile.workEmailDomain || undefined,
        phone: profile.phone || undefined,
        employeeId: profile.employeeId || undefined,
        verifiedCode: profile.verifiedCode ?? undefined,
      },
      otp: trimmedOtp,
      otpToken: token || "",
    });

    if (!outcome?.ok) {
      const status = outcome?.reason === "DUPLICATE" ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: outcome?.error || "Could not create your account. Please try again.",
      });
    }

    console.log(`[register] Account created and verified for ${maskEmail(email)} (role=${profile.role})`);
    return res.status(201).json({ success: true, user: outcome.user, sessionToken: outcome.sessionToken });
  } catch (error) {
    console.error(`[register] Failed to create account for ${maskEmail(email)}:`, error);
    const message = String(error?.message || "");
    if (message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists. Try signing in instead.",
      });
    }
    return res.status(500).json({ success: false, error: "Could not create your account. Please try again." });
  }
}
