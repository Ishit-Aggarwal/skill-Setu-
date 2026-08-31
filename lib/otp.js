import crypto from "crypto";

// Serverless functions don't share memory between invocations, so OTPs can't
// be kept in a plain in-memory store (send-otp and verify-otp may run on
// different instances). Instead we hand the client a signed, stateless
// token: it encodes a hash of the OTP + an expiry, sealed with an HMAC so it
// can't be tampered with, and verification just recomputes the hash. No
// server-side storage required.

const SECRET = process.env.OTP_SECRET || "setu-dev-otp-secret-change-me";
const TTL_MS = 5 * 60 * 1000;

function hmac(value) {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createOtpToken(email, otp) {
  const expiresAt = Date.now() + TTL_MS;
  const otpHash = hmac(`${email}:${otp}`);
  const payload = Buffer.from(JSON.stringify({ email, otpHash, expiresAt })).toString("base64url");
  const signature = hmac(payload);
  return `${payload}.${signature}`;
}

export function verifyOtpToken(token, email, otp) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, error: "Your verification session expired. Please request a new code." };
  }
  const [payload, signature] = token.split(".");
  if (hmac(payload) !== signature) {
    return { valid: false, error: "Your verification session is invalid. Please request a new code." };
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { valid: false, error: "Your verification session is invalid. Please request a new code." };
  }

  if (decoded.email !== email) {
    return { valid: false, error: "This code was issued for a different email address." };
  }
  if (Date.now() > decoded.expiresAt) {
    return { valid: false, error: "This verification code has expired (5-minute validity). Please request a new code." };
  }
  if (hmac(`${email}:${otp}`) !== decoded.otpHash) {
    return { valid: false, error: "Invalid verification code. Please enter the correct 6-digit code." };
  }
  return { valid: true };
}
