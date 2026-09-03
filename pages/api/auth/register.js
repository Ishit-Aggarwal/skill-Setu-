import { verifyOtpToken } from "../../../lib/otp";
import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { maskEmail } from "../../../lib/mailer";

/**
 * Registration endpoint.
 *
 * The OTP is verified HERE, server-side, in the same request that creates the
 * account. The browser cannot create an account without presenting a valid,
 * unexpired, correctly-signed OTP token, so the verification step can't be
 * skipped by tampering with the client.
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
  if (!profile.passwordHash) {
    return res.status(400).json({ success: false, error: "A password is required." });
  }

  const email = String(profile.email).trim().toLowerCase();
  const trimmedOtp = otp.trim();

  // ---- Gate 1: the OTP must be valid before anything is written. ----
  const result = verifyOtpToken(token, email, trimmedOtp);
  if (!result.valid) {
    console.warn(`[register] OTP rejected for ${maskEmail(email)}: ${result.error}`);
    return res.status(400).json({ success: false, error: result.error });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  // ---- Gate 2: no duplicate accounts. ----
  try {
    const exists = await convex.query(api.users.existsByEmail, { email });
    if (exists) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists. Try signing in instead.",
      });
    }

    const user = await convex.mutation(api.users.createUser, {
      email,
      passwordHash: profile.passwordHash,
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
      emailVerified: true,
    });

    console.log(`[register] Account created and verified for ${maskEmail(email)} (role=${profile.role})`);
    return res.status(201).json({ success: true, user });
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
