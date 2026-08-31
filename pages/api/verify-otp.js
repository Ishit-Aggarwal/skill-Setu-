import { verifyOtpToken } from "../../lib/otp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { email, otp, token } = req.body || {};

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ success: false, error: "Email address is required." });
  }
  if (!otp || typeof otp !== "string" || !otp.trim()) {
    return res.status(400).json({ success: false, error: "Please enter the OTP verification code." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  if (trimmedOtp.length !== 6) {
    return res.status(400).json({ success: false, error: "OTP must be exactly 6 digits." });
  }

  const result = verifyOtpToken(token, normalizedEmail, trimmedOtp);
  if (!result.valid) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.status(200).json({ success: true, message: "Email verified successfully!" });
}
