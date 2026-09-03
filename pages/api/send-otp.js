import { createOtpToken } from "../../lib/otp";
import { sendMail, maskEmail, getMailConfig } from "../../lib/mailer";

function otpEmailHtml(otp) {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FAF7F2; border: 1px solid #DFD6C6; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1B4B43; margin: 0;">🌉 Setu</h2>
            <p style="color: #61706B; font-size: 13px; margin: 4px 0 0;">Academia–Industry Collaboration Portal</p>
          </div>
          <div style="background: #FFFFFF; padding: 24px; border-radius: 10px; border: 1px solid #EDE4D6; text-align: center;">
            <p style="font-size: 15px; color: #12211E; margin-top: 0;">Hello,</p>
            <p style="font-size: 14px; color: #61706B;">Please use the following 6-digit verification code to complete your registration:</p>
            <div style="display: inline-block; padding: 14px 28px; background: #E3EFE9; border: 2px dashed #1B4B43; border-radius: 8px; font-size: 32px; font-weight: 700; color: #1B4B43; letter-spacing: 6px; margin: 16px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #8B9B96; margin-bottom: 0;">This code is valid for <strong>5 minutes</strong>. Please do not share this OTP with anyone.</p>
          </div>
          <div style="text-align: center; margin-top: 18px; font-size: 11px; color: #8B9B96;">
            Smart India Hackathon · Problem Statement SIH26044
          </div>
        </div>
      `;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const { email } = req.body || {};

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      error: "A valid email address is required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = createOtpToken(normalizedEmail, otp);

  const mailConfig = getMailConfig();

  // Explicit opt-in escape hatch for offline development. It still returns a
  // token the user must type in by hand — it never skips verification, and it
  // is impossible to enable by accident because it requires OTP_DEV_MODE.
  if (!mailConfig.configured && process.env.OTP_DEV_MODE === "true") {
    console.warn(
      `[send-otp] OTP_DEV_MODE is ON — no email sent to ${maskEmail(normalizedEmail)}.`,
      `Code ${otp} is returned in the response for manual entry.`
    );
    return res.status(200).json({
      success: true,
      message: "Development mode: no email sent. Use the code shown on screen.",
      token,
      devMode: true,
      devOtp: otp,
    });
  }

  // No transport and no explicit dev opt-in => hard failure. Registration must
  // not proceed, and the reason has to be visible rather than silently OK.
  if (!mailConfig.configured) {
    console.error(`[send-otp] Cannot send OTP to ${maskEmail(normalizedEmail)}: ${mailConfig.reason}`);
    return res.status(503).json({
      success: false,
      error:
        "Email verification is unavailable because the mail service is not configured on the server. Please contact support.",
    });
  }

  try {
    await sendMail({
      to: normalizedEmail,
      subject: `${otp} is your Setu Verification Code`,
      text: `Your Setu verification code is ${otp}. It is valid for 5 minutes. Do not share this code with anyone.`,
      html: otpEmailHtml(otp),
    });

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${normalizedEmail}`,
      token,
    });
  } catch (error) {
    console.error(
      `[send-otp] Failed to deliver OTP to ${maskEmail(normalizedEmail)}:`,
      `code=${error?.code || "n/a"}`,
      error?.message
    );
    return res.status(502).json({
      success: false,
      error: `Could not send the verification email: ${error.message}`,
    });
  }
}
