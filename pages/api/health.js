import crypto from "crypto";
import { getConvexClient } from "../../lib/convexServer";
import { api } from "../../convex/_generated/api";
import { getMailConfig } from "../../lib/mailer";

/**
 * Deployment self-check, reachable at /api/health.
 *
 * The point of this route is that "is the live site actually talking to the
 * real database?" should be answerable in one request instead of by guessing
 * from behaviour. It does a real round trip to Convex — a read and a write of a
 * throwaway row — and reports what it found. It returns configuration status,
 * never configuration values.
 */

function fingerprintLocally() {
  const secret = process.env.OTP_SECRET || "setu-dev-otp-secret-change-me";
  return crypto.createHmac("sha256", secret).update("skill-setu-otp-secret-probe").digest("hex").slice(0, 16);
}

export default async function handler(req, res) {
  const started = Date.now();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || null;
  const mail = getMailConfig();

  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    convex: {
      configured: Boolean(url),
      // Host only — the deployment name is not a secret, the URL is enough to
      // tell dev from prod at a glance.
      deployment: url ? new URL(url).host : null,
      kind: url ? (/^https?:\/\/[a-z-]+-\d+\.convex\.cloud/.test(url) ? "convex.cloud" : "custom") : null,
      reachable: false,
      canRead: false,
      canWrite: false,
    },
    otpSecret: { sharedWithConvex: false, usingDefaultSecret: !process.env.OTP_SECRET },
    mail: { configured: mail.configured, reason: mail.configured ? null : mail.reason },
    otpDevMode: process.env.OTP_DEV_MODE === "true",
    warnings: [],
  };

  if (!url) {
    report.warnings.push(
      "NEXT_PUBLIC_CONVEX_URL is not set on this deployment, so accounts and results are not being stored centrally."
    );
    return res.status(503).json({ ...report, tookMs: Date.now() - started });
  }

  const convex = getConvexClient();

  try {
    // Read: a query that touches the users table but returns only a boolean.
    await convex.query(api.users.existsByEmail, { email: "health-probe@skill-setu.invalid" });
    report.convex.reachable = true;
    report.convex.canRead = true;
  } catch (error) {
    report.warnings.push(`Convex read failed: ${String(error?.message || error).slice(0, 200)}`);
  }

  if (report.convex.canRead) {
    try {
      // Write: mints and immediately revokes a password-reset nonce on a
      // throwaway address. It writes nothing if the account does not exist,
      // which is the expected outcome — a clean "reached the database and it
      // answered" without leaving a row behind.
      const outcome = await convex.mutation(api.users.issuePasswordReset, {
        email: "health-probe@skill-setu.invalid",
        ttlMinutes: 1,
      });
      report.convex.canWrite = outcome != null;
    } catch (error) {
      report.warnings.push(`Convex write failed: ${String(error?.message || error).slice(0, 200)}`);
    }
  }

  try {
    const remote = await convex.action(api.authNode.secretFingerprint, {});
    report.otpSecret.sharedWithConvex = remote?.fingerprint === fingerprintLocally();
    report.otpSecret.convexUsingDefaultSecret = Boolean(remote?.usingDefaultSecret);
  } catch (error) {
    report.warnings.push(`Could not reach the Convex credential runtime: ${String(error?.message || error).slice(0, 200)}`);
  }

  if (!report.otpSecret.sharedWithConvex) {
    report.warnings.push(
      "OTP_SECRET differs between this server and the Convex deployment — signup verification will reject every code. Set the same value in both."
    );
  }
  if (report.otpSecret.usingDefaultSecret || report.otpSecret.convexUsingDefaultSecret) {
    report.warnings.push("OTP_SECRET is falling back to the built-in default — set a long random value in production.");
  }
  if (report.otpDevMode) {
    report.warnings.push("OTP_DEV_MODE is enabled — verification codes are shown on screen instead of emailed.");
  }
  if (!report.mail.configured && !report.otpDevMode) {
    report.warnings.push("No mail transport is configured, so signup and password-reset emails cannot be sent.");
  }

  report.ok = report.convex.canRead && report.convex.canWrite && report.otpSecret.sharedWithConvex;
  return res.status(report.ok ? 200 : 503).json({ ...report, tookMs: Date.now() - started });
}
