import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { gradeFor } from "../lib/grading.js";
import { buildCertificateSnapshot, certificateDetails, isWinAnsi, linkedInAddUrl, normaliseVerifyCode, parseBulkCodes, scriptOf, verifyCodeHint, verifyUrl, winAnsiOnly } from "../lib/credentials.js";
import { renderCertificatePdf } from "../lib/certificatePdf.js";

test("gradeFor bands", () => {
  assert.equal(gradeFor(95), "O");
  assert.equal(gradeFor(90), "O");
  assert.equal(gradeFor(84), "A+");
  assert.equal(gradeFor(70), "A");
  assert.equal(gradeFor(65), "B+");
  assert.equal(gradeFor(50), "B");
  assert.equal(gradeFor(49), "Pass");
  assert.equal(gradeFor(undefined), null);
});

test("verification codes are normalised and misreadings hinted", () => {
  assert.equal(normaliseVerifyCode(" 7kq2-m9xa "), "7KQ2M9XA");
  assert.equal(normaliseVerifyCode("7KQ2 M9XA"), "7KQ2M9XA");
  assert.equal(verifyCodeHint("7KQ2M9XA"), null);
  assert.match(verifyCodeHint("7KQ2M9X0"), /never contain 0, O, 1 or I/);
  assert.match(verifyCodeHint("7KQ2MIXA"), /never contain/);
  assert.match(verifyCodeHint("7KQ2"), /8 characters/);
  const bulk = parseBulkCodes("7kq2-m9xa\nABCDEFGH, abcdefgh;\n\n XYZ");
  assert.deepEqual(bulk.codes, ["7KQ2M9XA", "ABCDEFGH", "XYZ"]);
  assert.equal(parseBulkCodes(Array.from({ length: 60 }, (_, i) => `CODE${i}`).join("\n")).overflow, 10);
});

test("scripts outside WinAnsi are detected", () => {
  assert.equal(isWinAnsi("Ananya Sharma — Ayurveda"), true);
  assert.equal(scriptOf("Ananya Sharma"), null);
  assert.equal(scriptOf("अनन्या शर्मा"), "devanagari");
  assert.equal(scriptOf("عائشہ خان"), "arabic");
  assert.equal(scriptOf("அருண் குமார்"), "tamil");
  assert.equal(scriptOf("བསྟན་འཛིན"), "tibetan");
  assert.equal(winAnsiOnly("Ananya (अनन्या)"), "Ananya ()");
});

const branding = { institutionName: "AIIA", professorName: "Dr. S. Kulkarni", professorTitle: "Professor, Dravyaguna", title: "Certificate of Achievement", design: null };
const student = { id: "s1", name: "Ananya Sharma", certificateName: "Ananya S. Sharma", course: "BAMS", year: "3rd Professional", rollNo: "21BAMS045", institution: "All India Institute of Ayurveda, New Delhi", email: "a@x.test" };

test("snapshot carries the candidate's details; old snapshots stay as they were", () => {
  const snap = buildCertificateSnapshot({ branding, issuerName: "AIIA", student, test: { title: "Dravyaguna Vigyan: Unit 3 Assessment" }, score: 84, testDate: "2026-09-26T09:30:00.000Z", durationMinutes: 90, ayushSystemLabel: "Ayurveda", communityName: "Dravyaguna Batch 2025", certificateNo: "SETU/2026/AIIA/0001", verifyCode: "7KQ2M9XA", issuedAt: "2026-09-26T11:00:00.000Z" });
  assert.equal(snap.studentName, "Ananya S. Sharma");
  assert.equal(snap.rollNo, "21BAMS045");
  assert.equal(snap.grade, "A+");
  assert.equal(snap.programName, "Dravyaguna Batch 2025");
  assert.equal("email" in snap, false);
  assert.equal(
    certificateDetails(snap),
    "BAMS 3rd Professional, Roll No. 21BAMS045, All India Institute of Ayurveda, New Delhi, for successfully completing Dravyaguna Vigyan: Unit 3 Assessment (Ayurveda) on 26 September 2026, scoring 84% (Grade A+)."
  );
  const noGrade = buildCertificateSnapshot({ branding: { ...branding, design: { showGrade: false } }, issuerName: "AIIA", student, test: { title: "T" }, score: 84, issuedAt: "2026-09-26T11:00:00.000Z" });
  assert.equal(noGrade.grade, null);
  // A snapshot from before these fields existed.
  const old = { studentName: "Aarav", testTitle: "Clinical Fundamentals", scorePercent: 72, completedAt: "2026-09-20T05:00:00.000Z" };
  assert.equal(certificateDetails(old), "for successfully completing Clinical Fundamentals on 20 September 2026, scoring 72%.");
});

test("verify URL is absolute; LinkedIn link is a plain URL", () => {
  assert.equal(verifyUrl("https://skillsetu.in/", "7KQ2M9XA"), "https://skillsetu.in/verify/7KQ2M9XA");
  const li = linkedInAddUrl({ title: "Dravyaguna", issuer: "AIIA", issuedAt: "2026-09-26T00:00:00Z", verifyLink: "https://skillsetu.in/verify/7KQ2M9XA", certificateNo: "SETU/1" });
  assert.match(li, /^https:\/\/www\.linkedin\.com\/profile\/add\?startTask=CERTIFICATION_NAME/);
  assert.match(li, /issueYear=2026/);
});

const FONT = (f) => new Uint8Array(fs.readFileSync(new URL(`../public/fonts/${f}`, import.meta.url)));

test("a Devanagari name renders with the Noto font, and falls back (never throws) without it", async () => {
  const snapshot = { ...buildCertificateSnapshot({ branding, issuerName: "AIIA", student: { ...student, certificateName: "अनन्या शर्मा" }, test: { title: "Rasa Panchaka" }, score: 84, issuedAt: "2026-09-26T11:00:00.000Z" }), certificateNo: "SETU/1", verifyCode: "7KQ2M9XA" };
  const withFont = await renderCertificatePdf({ snapshot, siteUrl: "https://skillsetu.in", fonts: { devanagari: FONT("NotoSansDevanagari-Regular.ttf") } });
  assert.ok(withFont.bytes.length > 1000);
  assert.equal(withFont.nameFallback, false);
  const without = await renderCertificatePdf({ snapshot, siteUrl: "https://skillsetu.in", fonts: {} });
  assert.ok(without.bytes.length > 1000);
  assert.equal(without.nameFallback, true);
});

test("Urdu, Tamil and Tibetan names render too", async () => {
  for (const [name, script, file] of [
    ["عائشہ خان", "arabic", "NotoNaskhArabic-Regular.ttf"],
    ["அருண் குமார்", "tamil", "NotoSansTamil-Regular.ttf"],
    ["བསྟན་འཛིན", "tibetan", "NotoSerifTibetan-Regular.ttf"],
  ]) {
    const out = await renderCertificatePdf({ snapshot: { studentName: name, testTitle: "Test", verifyCode: "ABCDEFGH" }, fonts: { [script]: FONT(file) } });
    assert.equal(out.nameFallback, false, script);
  }
});
