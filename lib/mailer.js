import nodemailer from "nodemailer";

/**
 * Central email transport + structured logging.
 *
 * Previously the OTP route built its transport inline and, when no
 * credentials were present, silently returned success without sending
 * anything. That made a misconfigured mailer indistinguishable from a
 * working one. Everything here fails loudly and logs why.
 */

/** Mask an address for logs so we don't dump user emails into stdout. */
export function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(local.length - 2, 0))}@${domain}`;
}

/**
 * Resolve mail transport config from the environment.
 * Returns { configured: false, reason } when the app has no way to send mail.
 */
export function getMailConfig() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM,
  } = process.env;

  // Explicit SMTP host wins — works with Mailtrap, Resend, SES, Postmark,
  // a local capture server, or any corporate relay.
  if (SMTP_HOST) {
    const port = Number(SMTP_PORT) || 587;
    return {
      configured: true,
      from: EMAIL_FROM || EMAIL_USER || "no-reply@setu.local",
      transport: {
        host: SMTP_HOST,
        port,
        // `secure` means implicit TLS, which is port 465 by convention.
        secure: SMTP_SECURE ? SMTP_SECURE === "true" : port === 465,
        ...(EMAIL_USER && EMAIL_PASS
          ? { auth: { user: EMAIL_USER, pass: EMAIL_PASS } }
          : {}),
      },
    };
  }

  // Fall back to Gmail, which is what the project was originally set up for.
  if (EMAIL_USER && EMAIL_PASS) {
    return {
      configured: true,
      from: EMAIL_FROM || EMAIL_USER,
      transport: {
        service: "gmail",
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      },
    };
  }

  return {
    configured: false,
    reason:
      "No mail transport configured. Set SMTP_HOST (any provider) or EMAIL_USER + EMAIL_PASS (Gmail app password) in .env.local.",
  };
}

/** Turn nodemailer's error codes into something a human can act on. */
export function describeMailError(error) {
  const code = error?.code || error?.responseCode || "UNKNOWN";
  switch (code) {
    case "EAUTH":
    case 535:
      return "Mail server rejected the credentials. For Gmail you must use a 16-character App Password (not your account password) with 2-Step Verification enabled.";
    case "ECONNECTION":
    case "ESOCKET":
      return "Could not connect to the mail server. Check SMTP_HOST / SMTP_PORT and that outbound SMTP isn't blocked.";
    case "ETIMEDOUT":
    case "ECONNRESET":
      return "Timed out talking to the mail server. Check network access to the SMTP host.";
    case "EENVELOPE":
      return "Mail server rejected the sender or recipient address.";
    default:
      return error?.message || "Unknown mail transport error.";
  }
}

/**
 * Send an email, logging both success and failure with enough context to
 * debug. Throws a decorated Error on failure — callers must not swallow it.
 */
export async function sendMail({ to, subject, html, text }) {
  const config = getMailConfig();
  if (!config.configured) {
    const err = new Error(config.reason);
    err.code = "EMAIL_NOT_CONFIGURED";
    throw err;
  }

  const transporter = nodemailer.createTransport(config.transport);
  const target = maskEmail(to);

  // verify() surfaces auth/DNS/port problems before we try to send, so the
  // log clearly separates "bad config" from "send rejected".
  try {
    await transporter.verify();
  } catch (error) {
    console.error(
      `[mailer] Transport verification FAILED for ${target}:`,
      `code=${error?.code || "n/a"}`,
      `response=${error?.response || "n/a"}`,
      error
    );
    const err = new Error(describeMailError(error));
    err.code = error?.code || "EVERIFY";
    throw err;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Skill Setu — Academia-Industry Portal" <${config.from}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(
      `[mailer] Sent "${subject}" to ${target}`,
      `messageId=${info.messageId}`,
      `accepted=${JSON.stringify(info.accepted || [])}`,
      `rejected=${JSON.stringify(info.rejected || [])}`
    );
    if (info.rejected?.length) {
      const err = new Error(`Mail server rejected recipient: ${info.rejected.join(", ")}`);
      err.code = "EENVELOPE";
      throw err;
    }
    return info;
  } catch (error) {
    console.error(
      `[mailer] sendMail FAILED for ${target}:`,
      `code=${error?.code || "n/a"}`,
      `response=${error?.response || "n/a"}`,
      error
    );
    const err = new Error(describeMailError(error));
    err.code = error?.code || "ESEND";
    throw err;
  }
}
