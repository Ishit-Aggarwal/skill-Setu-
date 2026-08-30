// In-memory temporary store for OTPs across requests
if (!global.otpStore) {
  global.otpStore = {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { email, otp } = req.body || {};

  // Validate presence of email
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      error: "Email address is required.",
    });
  }

  // Validate presence of OTP
  if (!otp || typeof otp !== "string" || !otp.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please enter the OTP verification code.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  if (trimmedOtp.length !== 6) {
    return res.status(400).json({
      success: false,
      error: "OTP must be exactly 6 digits.",
    });
  }

  const record = global.otpStore[normalizedEmail];

  if (!record) {
    return res.status(400).json({
      success: false,
      error: "No active OTP request found for this email. Please request a new code.",
    });
  }

  // Check 5-minute expiry
  if (Date.now() > record.expiresAt) {
    delete global.otpStore[normalizedEmail];
    return res.status(400).json({
      success: false,
      error: "The OTP verification code has expired (5-minute validity). Please request a new code.",
    });
  }

  // Verify OTP matches
  if (record.otp !== trimmedOtp) {
    return res.status(400).json({
      success: false,
      error: "Invalid OTP code. Please enter the correct 6-digit code.",
    });
  }

  // Successful verification - delete OTP for one-time use
  delete global.otpStore[normalizedEmail];

  return res.status(200).json({
    success: true,
    message: "Email verified successfully!",
  });
}
