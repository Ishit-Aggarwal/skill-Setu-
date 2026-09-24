/**
 * Certificates — the pure parts shared by the browser, the Convex functions,
 * the PDF renderer and the tests.
 */

import { CERTIFICATES } from "./settings";
import { gradeFor } from "./grading";

/**
 * The kinds of certificate a partner may issue to a student. Shared by the
 * browser (the issue dialog) and the Convex mutation that validates them, so
 * the two can never disagree.
 */
export const CREDENTIAL_KINDS = ["Skill Test", "Internship", "Training", "Merit", "Participation"];

export function isCredentialKind(value) {
  return CREDENTIAL_KINDS.includes(value);
}

/* ---------------- verification codes ---------------- */

/**
 * A verification code as the database holds it: upper case, with spaces and
 * dashes removed ("7kq2-m9xa" → "7KQ2M9XA").
 */
export function normaliseVerifyCode(input) {
  return String(input ?? "")
    .toUpperCase()
    .replace(/[\s\-_.·]+/g, "")
    .trim();
}

/**
 * A hint when a typed code contains letters the alphabet never uses (0, O,
 * 1, I) — the usual misreading of a printed code — or has the wrong length.
 */
export function verifyCodeHint(input) {
  const code = normaliseVerifyCode(input);
  if (!code) return null;
  if (/[0O1I]/.test(code)) return "Codes never contain 0, O, 1 or I. Check the certificate.";
  if ([...code].some((ch) => !CERTIFICATES.VERIFY_ALPHABET.includes(ch))) return "A code uses only letters and the digits 2–9.";
  if (code.length !== CERTIFICATES.VERIFY_CODE_LENGTH) return `A code is ${CERTIFICATES.VERIFY_CODE_LENGTH} characters long.`;
  return null;
}

/** Splits pasted text (one per line, or comma separated) into distinct codes, at most CERTIFICATES.BULK_VERIFY_MAX. */
export function parseBulkCodes(text) {
  const seen = new Set();
  const out = [];
  for (const piece of String(text ?? "").split(/[\n,;]+/)) {
    const code = normaliseVerifyCode(piece);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return { codes: out.slice(0, CERTIFICATES.BULK_VERIFY_MAX), overflow: Math.max(0, out.length - CERTIFICATES.BULK_VERIFY_MAX) };
}

/* ---------------- scripts the PDF fonts can and cannot print ---------------- */

/*
 * The standard PDF fonts use WinAnsi (Windows-1252): Latin letters, digits
 * and common punctuation. Anything else — a name in Devanagari, Urdu,
 * Tamil or Tibetan — needs an embedded font, or pdf-lib throws.
 */
const WINANSI_EXTRA = new Set([0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178]);

export function isWinAnsiChar(ch) {
  const cp = ch.codePointAt(0);
  if (cp === 0x09 || cp === 0x0a || cp === 0x0d) return true;
  if (cp >= 0x20 && cp <= 0x7e) return true;
  if (cp >= 0xa0 && cp <= 0xff) return true;
  return WINANSI_EXTRA.has(cp);
}

/** True when every character can be drawn with the standard fonts. */
export function isWinAnsi(text) {
  return [...String(text ?? "")].every(isWinAnsiChar);
}

/** The script a non-Latin text needs a font for, or null when WinAnsi covers it. */
export function scriptOf(text) {
  for (const ch of String(text ?? "")) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0900 && cp <= 0x097f) return "devanagari";
    if ((cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0x0750 && cp <= 0x077f) || (cp >= 0xfb50 && cp <= 0xfeff)) return "arabic";
    if (cp >= 0x0b80 && cp <= 0x0bff) return "tamil";
    if (cp >= 0x0f00 && cp <= 0x0fff) return "tibetan";
  }
  return isWinAnsi(text) ? null : "other";
}

/** The printable part of a text when no font covers it (unsupported characters removed). */
export function winAnsiOnly(text) {
  return [...String(text ?? "")].filter(isWinAnsiChar).join("").replace(/\s+/g, " ").trim();
}

/* ---------------- the frozen snapshot ---------------- */

function longDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

/**
 * Everything a certificate is drawn from, frozen at issue time. Branding
 * resolves before this (override or default); the candidate's details come
 * from their profile as it is right now and never change afterwards.
 *
 * `showGrade` follows the host's branding (default on).
 */
export function buildCertificateSnapshot({ branding, brandingSource = "none", issuerName, host, student, test, score, correctCount = null, totalQuestions = null, testDate = null, durationMinutes = null, ayushSystemLabel = "", communityName = null, certificateNo = null, verifyCode = null, issuedAt }) {
  const showGrade = branding?.design?.showGrade !== false;
  return {
    brandingSource,
    institutionName: issuerName,
    professorName: branding?.professorName || host?.name || "",
    professorTitle: branding?.professorTitle || host?.designation || "",
    // A community test with no programme name of its own names the community.
    programName: branding?.programName || communityName || "",
    title: branding?.title || CERTIFICATES.DEFAULT_TITLE,
    design: branding?.design || null,
    logoStorageId: branding?.logoStorageId || null,
    signatureStorageId: branding?.signatureStorageId || null,
    studentName: String(student?.certificateName || "").trim() || student?.name || "Student",
    // A Latin spelling the PDF can fall back to when the chosen name is in another script.
    studentNameLatin: student?.name && isWinAnsi(student.name) ? student.name : null,
    studentInstitution: student?.institution || student?.instituteName || null,
    course: student?.course || null,
    year: student?.year || null,
    rollNo: student?.rollNo || null,
    ayushSystem: ayushSystemLabel || null,
    testTitle: test?.certification || test?.title || "",
    testDate: testDate || issuedAt,
    durationMinutes: durationMinutes ?? null,
    scorePercent: score ?? null,
    correctCount,
    totalQuestions,
    grade: showGrade && score != null ? gradeFor(score) : null,
    showGrade,
    communityName: communityName || null,
    certificateNo,
    verifyCode,
    issuedAt,
    completedAt: issuedAt,
  };
}

/**
 * The details sentence under the name: "BAMS 3rd Professional, Roll No.
 * 21BAMS045, All India Institute of Ayurveda, New Delhi, for successfully
 * completing Dravyaguna Vigyan: Unit 3 Assessment (Ayurveda) on 26 September
 * 2026, scoring 84% (Grade A+)." Old snapshots without the new fields give
 * exactly the line they always had.
 */
export function certificateDetails(snapshot, tagline = "for successfully completing") {
  const s = snapshot || {};
  const who = [s.course && s.year ? `${s.course} ${s.year}` : s.course || s.year, s.rollNo ? `Roll No. ${s.rollNo}` : null, s.studentInstitution].filter(Boolean);
  const date = longDate(s.testDate || s.completedAt);
  const score = s.scorePercent != null ? `${s.scorePercent}%${s.grade && s.showGrade !== false ? ` (Grade ${s.grade})` : ""}` : null;
  const test = `${s.testTitle || ""}${s.ayushSystem ? ` (${s.ayushSystem})` : ""}`;
  const parts = [];
  if (who.length) parts.push(`${who.join(", ")},`);
  parts.push(`${tagline} ${test}`);
  if (date) parts.push(`on ${date}`);
  const tail = score ? `, scoring ${score}.` : ".";
  return `${parts.join(" ")}${tail}`.replace(/\s+/g, " ").trim();
}

/** The absolute verify address printed on the certificate. */
export function verifyUrl(siteUrl, code) {
  const base = String(siteUrl || "").replace(/\/+$/, "");
  return `${base}/verify/${encodeURIComponent(code || "")}`;
}

/** A LinkedIn "Add licence or certification" link — a plain URL, no API. */
export function linkedInAddUrl({ title, issuer, issuedAt, verifyLink, certificateNo }) {
  const d = issuedAt ? new Date(issuedAt) : null;
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: title || "Certificate",
    organizationName: issuer || "Skill Setu",
    ...(d && !Number.isNaN(d.getTime()) ? { issueYear: String(d.getFullYear()), issueMonth: String(d.getMonth() + 1) } : {}),
    certUrl: verifyLink || "",
    certId: certificateNo || "",
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
