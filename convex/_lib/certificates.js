/**
 * Automatic certificates.
 *
 * Branding resolves in exactly two steps: a complete per-test override if one
 * exists, otherwise the host's saved default. Fields are never merged across
 * the two. Everything the PDF is drawn from is frozen onto the credential row
 * as `snapshot` at issue time, so later edits to either branding record can
 * never change a certificate a student already holds.
 */

import { certificateEligible } from "../../lib/grading";
import { CERTIFICATES } from "../../lib/settings";

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

function verifyCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function certificateNumber(ctx, issuerId, issuerName) {
  const issued = await ctx.db
    .query("credentials")
    .withIndex("by_issuer", (q) => q.eq("issuerId", issuerId))
    .collect();
  const slug = String(issuerName || "SETU").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "SETU";
  return `SETU/${new Date().getFullYear()}/${slug}/${String(issued.length + 1).padStart(4, "0")}`;
}

/**
 * Issues (or explains why it did not issue) the certificate for a graded
 * attempt. Returns { status, credential }:
 *   status: "issued" | "below_minimum" | "not_enabled" | "no_branding"
 */
export async function issueCertificateForAttempt(ctx, { test, attempt, student, score }) {
  if (!test?.issueCertificate) return { status: "not_enabled", credential: null };
  if (!certificateEligible(score, test.minCertificateScore)) return { status: "below_minimum", credential: null };

  const { source, branding } = await resolveBranding(ctx, test);
  const host = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("id"), test.ownerId))
    .first();
  const issuerName = branding?.institutionName || host?.companyName || host?.instituteName || host?.institution || test.hostName || "Skill Setu Partner";

  // One certificate per student per test: a retake refreshes it rather than
  // stacking a second one.
  const existing = await ctx.db
    .query("credentials")
    .withIndex("by_student", (q) => q.eq("studentId", student.id))
    .filter((q) => q.eq(q.field("testId"), test.id))
    .first();

  const issuedAt = new Date().toISOString();
  const snapshot = {
    brandingSource: source,
    institutionName: issuerName,
    professorName: branding?.professorName || host?.name || "",
    professorTitle: branding?.professorTitle || host?.designation || "",
    programName: branding?.programName || "",
    title: branding?.title || CERTIFICATES.DEFAULT_TITLE,
    design: branding?.design || null,
    logoStorageId: branding?.logoStorageId || null,
    signatureStorageId: branding?.signatureStorageId || null,
    studentName: student.name || "Student",
    testTitle: test.certification || test.title,
    scorePercent: score,
    correctCount: attempt.correctCount ?? null,
    totalQuestions: attempt.totalQuestions ?? null,
    completedAt: issuedAt,
  };

  const record = {
    id: existing?.id || `cred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    studentId: student.id,
    studentName: student.name || "Student",
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
    grade: null,
    remarks: "",
    certificateNo: existing?.certificateNo || (await certificateNumber(ctx, test.ownerId, issuerName)),
    verifyCode: existing?.verifyCode || verifyCode(),
    issuedAt,
    revokedAt: null,
    snapshot,
  };

  if (existing) {
    await ctx.db.patch(existing._id, record);
    return { status: "issued", credential: { ...existing, ...record } };
  }
  const _id = await ctx.db.insert("credentials", record);
  return { status: "issued", credential: { _id, ...record } };
}
