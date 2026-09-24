/**
 * Automatic certificates.
 *
 * Branding resolves in exactly two steps: a complete per-test override if one
 * exists, otherwise the host's saved default. Fields are never merged across
 * the two. Everything the PDF is drawn from — branding and the candidate's
 * details alike — is frozen onto the credential row as `snapshot` at issue
 * time, so later edits can never change a certificate a student already
 * holds.
 *
 * Every way a certificate is issued, refreshed, refused for a low score or
 * revoked tells the student, through `notifyCertificate`.
 */

import { certificateEligible } from "../../lib/grading";
import { CERTIFICATES } from "../../lib/settings";
import { buildCertificateSnapshot } from "../../lib/credentials";
import { ayushSystemLabel } from "../../lib/ayush";
import { durationMinutes } from "../../lib/testWindow";

export async function resolveBranding(ctx, test) {
  const override = await ctx.db
    .query("certificateOverrides")
    .withIndex("by_test", (q) => q.eq("testId", test.id))
    .first();
  if (override) return { source: "override", branding: override };
  const saved = await ctx.db
    .query("certificateSettings")
    .withIndex("by_owner", (q) => q.eq("ownerId", test.ownerId))
    .first();
  if (saved) return { source: "default", branding: saved };
  return { source: "none", branding: null };
}

export function randomVerifyCode() {
  const alphabet = CERTIFICATES.VERIFY_ALPHABET;
  let out = "";
  for (let i = 0; i < CERTIFICATES.VERIFY_CODE_LENGTH; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/**
 * A verification code no other certificate holds. 32⁸ ≈ 1.1 trillion codes
 * make a clash vanishingly rare, but "rare" is not "never": each draw is
 * checked against the index, and after CERTIFICATES.VERIFY_CODE_RETRIES
 * clashes the issue fails loudly rather than printing a duplicate.
 */
export async function uniqueVerifyCode(ctx) {
  for (let i = 0; i < CERTIFICATES.VERIFY_CODE_RETRIES; i += 1) {
    const code = randomVerifyCode();
    const clash = await ctx.db
      .query("credentials")
      .withIndex("by_verify_code", (q) => q.eq("verifyCode", code))
      .first();
    if (!clash) return code;
  }
  throw new Error("Could not assign a unique verification code. Please try again.");
}

export async function certificateNumber(ctx, issuerId, issuerName) {
  const issued = await ctx.db
    .query("credentials")
    .withIndex("by_issuer", (q) => q.eq("issuerId", issuerId))
    .collect();
  const slug = String(issuerName || "SETU").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "SETU";
  return `SETU/${new Date().getFullYear()}/${slug}/${String(issued.length + 1).padStart(4, "0")}`;
}

const NOTICE = {
  certificate_issued: (c) => `🎓 Certificate issued: ${c.title} by ${c.issuer}. Download it or add it to your portfolio.`,
  certificate_updated: (c) => `🎓 Your certificate was updated: ${c.title} by ${c.issuer}. Same number and verification code.`,
  certificate_revoked: (c) => `Your certificate "${c.title}" from ${c.issuer} has been revoked.`,
  certificate_code_changed: (c) => `Your certificate "${c.title}" has a new verification code: ${c.verifyCode}.`,
};

/**
 * The one inbox write for certificates. `kind` is one of
 * certificate_issued | certificate_updated | certificate_revoked |
 * certificate_code_changed | certificate_below_min (the last needs
 * `extra: { studentId, score, minScore, testTitle, issuer, testId }` since there is no credential).
 */
export async function notifyCertificate(ctx, credential, kind, extra = {}) {
  const at = new Date().toISOString();
  const studentId = credential?.studentId || extra.studentId;
  if (!studentId) return;
  let message;
  if (kind === "certificate_below_min") {
    message = `You scored ${extra.score}% on "${extra.testTitle}". A certificate needs ${extra.minScore}%.`;
  } else {
    message = (NOTICE[kind] || NOTICE.certificate_issued)(credential);
  }
  await ctx.db.insert("studentNotifications", {
    id: `notif_${kind}_${credential?.id || extra.testId || "x"}_${Date.now().toString(36)}`,
    studentId,
    senderId: credential?.issuerId || extra.issuerId || undefined,
    credentialId: credential?.id || null,
    testId: credential?.testId || extra.testId || null,
    kind,
    link: credential?.id ? `/certificate/${credential.id}` : "/skill-assessment",
    message,
    from: credential?.issuer || extra.issuer || "Skill Setu",
    sentAt: at,
    read: false,
    updatedAt: at,
  });
}

/**
 * Issues (or explains why it did not issue) the certificate for a graded
 * attempt. Returns { status, credential }:
 *   status: "issued" | "below_minimum" | "not_enabled"
 */
export async function issueCertificateForAttempt(ctx, { test, attempt, student, score }) {
  if (!test?.issueCertificate) return { status: "not_enabled", credential: null };

  const { source, branding } = await resolveBranding(ctx, test);
  const host = await ctx.db
    .query("users")
    .withIndex("by_client_id", (q) => q.eq("id", test.ownerId))
    .first();
  const issuerName = branding?.institutionName || host?.companyName || host?.instituteName || host?.institution || test.hostName || "Skill Setu Partner";

  if (!certificateEligible(score, test.minCertificateScore)) {
    await notifyCertificate(ctx, null, "certificate_below_min", { studentId: student.id, score, minScore: test.minCertificateScore, testTitle: test.title, issuer: issuerName, issuerId: test.ownerId, testId: test.id });
    return { status: "below_minimum", credential: null };
  }

  // One certificate per student per test: a retake refreshes it rather than
  // stacking a second one, and keeps its number and verification code.
  const existing = await ctx.db
    .query("credentials")
    .withIndex("by_student", (q) => q.eq("studentId", student.id))
    .filter((q) => q.eq(q.field("testId"), test.id))
    .first();

  const issuedAt = new Date().toISOString();
  const certificateNo = existing?.certificateNo || (await certificateNumber(ctx, test.ownerId, issuerName));
  const code = existing?.verifyCode || (await uniqueVerifyCode(ctx));
  const snapshot = buildCertificateSnapshot({
    branding,
    brandingSource: source,
    issuerName,
    host,
    student,
    test,
    score,
    // A pooled paper counts only the questions this candidate was dealt.
    correctCount: attempt.correctCount ?? null,
    totalQuestions: attempt.totalQuestions ?? null,
    testDate: attempt.startedAt || test.startedAt || issuedAt,
    durationMinutes: durationMinutes(test),
    ayushSystemLabel: test.ayushSystem ? ayushSystemLabel(test.ayushSystem) : "",
    communityName: test.audience === "community" ? test.communityName || null : null,
    certificateNo,
    verifyCode: code,
    issuedAt,
  });

  const record = {
    id: existing?.id || `cred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    studentId: student.id,
    studentName: snapshot.studentName,
    studentEmail: student.email || "",
    title: test.certification || test.title,
    issuer: issuerName,
    issuerId: test.ownerId,
    issuerRole: host?.role || "industry",
    kind: "Skill Test",
    testId: test.id,
    attemptId: attempt.id,
    testTitle: test.title,
    score: `${score}%`,
    scorePercent: score,
    grade: snapshot.grade,
    remarks: "",
    certificateNo,
    verifyCode: code,
    issuedAt,
    revokedAt: null,
    snapshot,
  };

  if (existing) {
    await ctx.db.patch(existing._id, record);
    const credential = { ...existing, ...record };
    await notifyCertificate(ctx, credential, existing.revokedAt ? "certificate_issued" : "certificate_updated");
    return { status: "issued", credential };
  }
  // A new certificate is on the profile by default; the student can hide it.
  const full = { ...record, showOnProfile: true, featured: false };
  const _id = await ctx.db.insert("credentials", full);
  await notifyCertificate(ctx, full, "certificate_issued");
  return { status: "issued", credential: { _id, ...full } };
}
