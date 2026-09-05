import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { sendMail, maskEmail, getMailConfig } from "../../../lib/mailer";

const TTL_MINUTES = 30;

function resetEmailHtml(link, name) {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAF7F2; border: 1px solid #DFD6C6; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1B4B43; margin: 0;">🌉 Skill Setu</h2>
            <p style="color: #61706B; font-size: 13px; margin: 4px 0 0;">Academia–Industry Collaboration Portal</p>
          </div>
          <div style="background: #FFFFFF; padding: 24px; border-radius: 10px; border: 1px solid #EDE4D6;">
            <p style="font-size: 15px; color: #12211E; margin-top: 0;">Hello${name ? ` ${name}` : ""},</p>
            <p style="font-size: 14px; color: #61706B;">
              We received a request to reset the password for this Skill Setu account.
              Click the button below to choose a new one.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${link}" style="display: inline-block; padding: 13px 30px; background: #1B4B43; color: #FFFFFF; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none;">
                Reset my password
              </a>
            </div>
            <p style="font-size: 12px; color: #8B9B96;">
              This link is valid for <strong>${TTL_MINUTES} minutes</strong> and can be used only once.
              If you did not ask for a password reset you can ignore this email — your password will not change.
            </p>
            <p style="font-size: 11px; color: #8B9B96; word-break: break-all; margin-bottom: 0;">
              If the button does not work, paste this into your browser:<br />${link}
            </p>
          </div>
          <div style="text-align: center; margin-top: 18px; font-size: 11px; color: #8B9B96;">
            Smart India Hackathon · Problem Statement SIH26044
          </div>
        </div>
      `;
}

function originOf(req) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Step 1 of password recovery.
 *
 * The response is deliberately identical whether or not an account exists, so
 * this endpoint cannot be used to enumerate registered email addresses. The
 * only exception is OTP_DEV_MODE, which mirrors the send-otp escape hatch and
 * hands the link back on screen when no mail transport is configured.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { email } = req.body || {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, error: "A valid email address is required." });
  }

  const normalized = email.trim().toLowerCase();

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  const genericSuccess = {
    success: true,
    message: "If an account exists for that address, a reset link is on its way.",
  };

  let outcome;
  try {
    outcome = await convex.mutation(api.users.issuePasswordReset, { email: normalized, ttlMinutes: TTL_MINUTES });
  } catch (error) {
    console.error(`[forgot-password] Could not issue a reset for ${maskEmail(normalized)}:`, error);
    return res.status(500).json({ success: false, error: "Could not start a password reset right now. Please try again." });
  }

  if (!outcome?.ok) {
    console.warn(`[forgot-password] No account for ${maskEmail(normalized)}.`);
    return res.status(404).json({
      success: false,
      error: "This email address is not registered with Skill Setu. Please check the spelling or sign up.",
    });
  }

  const link = `${originOf(req)}/reset-password?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(outcome.nonce)}`;
  const mailConfig = getMailConfig();

  if (!mailConfig.configured && process.env.OTP_DEV_MODE === "true") {
    console.warn(
      `[forgot-password] OTP_DEV_MODE is ON — no email sent to ${maskEmail(normalized)}.`,
      "The reset link is returned in the response for manual use."
    );
    return res.status(200).json({ ...genericSuccess, devMode: true, devLink: link });
  }

  if (!mailConfig.configured) {
    console.error(`[forgot-password] Cannot email ${maskEmail(normalized)}: ${mailConfig.reason}`);
    return res.status(503).json({
      success: false,
      error: "Password reset emails are unavailable because the mail service is not configured on this server.",
    });
  }

  try {
    await sendMail({
      to: normalized,
      subject: "Reset your Skill Setu password",
      text: `Reset your Skill Setu password using this link (valid for ${TTL_MINUTES} minutes): ${link}`,
      html: resetEmailHtml(link, outcome.name),
    });
    return res.status(200).json(genericSuccess);
  } catch (error) {
    console.error(`[forgot-password] Failed to deliver the reset link to ${maskEmail(normalized)}:`, error?.message);
    return res.status(502).json({ success: false, error: `Could not send the reset email: ${error.message}` });
  }
}
