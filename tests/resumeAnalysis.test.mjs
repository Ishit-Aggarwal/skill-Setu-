import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanReferences, domainStatus, evidenceMatches, overallReadiness, portfolioToText, sameTitle, scrubContact, validateResumeResult } from "../lib/resumeAnalysis.js";

const RESUME = `Ananya Sharma
BAMS 3rd Professional, All India Institute of Ayurveda, New Delhi
Phone +91 98765 43210 · ananya.sharma@example.com · Aadhaar 1234 5678 9012
Skills: Nadi Pariksha, Pharmacovigilance signal detection, Panchakarma procedures
Project: Adverse drug reaction reporting audit at the AIIA PV cell, 2025`;

const catalogue = [{ testId: "t_pv", title: "PV Signal Detection Basics" }, { testId: "t_dg", title: "Dravyaguna Unit Test" }];
const domains = ["ASU&H Clinical Fundamentals", "AYUSH Research & Clinical Documentation"];

function raw(overrides = {}) {
  return {
    transcript: RESUME,
    profile: { name: "Ananya Sharma", course: "BAMS", year: "3rd Prof", institution: "AIIA", ayushSystem: "Ayurveda", summary: "Contact ananya.sharma@example.com or +91 98765 43210." },
    extracted: {
      education: [{ degree: "BAMS", institution: "AIIA", year: "2026", evidence: "BAMS 3rd Professional, All India Institute of Ayurveda" }],
      skills: [
        { name: "Pharmacovigilance", category: "pharma", evidence: "Pharmacovigilance signal detection" },
        { name: "Marma therapy", category: "clinical", evidence: "Certified Marma therapist since 2019" },
      ],
      projects: [],
      experience: [],
      certifications: [],
    },
    domainReadiness: [
      { domain: "AYUSH Research & Clinical Documentation", resumeSignal: 85, why: "PV audit" },
      { domain: "Software Engineering", resumeSignal: 90, why: "invented" },
      { domain: "ASU&H Clinical Fundamentals", resumeSignal: 150, why: "clinical" },
    ],
    strengths: [],
    gaps: [],
    nextTests: [
      { testId: "t_pv", priority: 1, why: "verify PV", prepareTopics: ["ICSR"], readinessNow: 140 },
      { testId: "t_forged", priority: 2, why: "made up", prepareTopics: [], readinessNow: 50 },
    ],
    generalTestAreas: [],
    studyPlan: { weeks: 12, topics: [{ id: "a", title: "Signal detection", subtopics: [], whyItMatters: "x", forTestId: "t_forged", estHours: 4, references: ["Ayurvedic Pharmacopoeia of India, Part I", "https://example.com/notes", "www.pv.in guide"] }], schedule: [{ week: 1, topicIds: ["a", "zzz"], goal: "start" }] },
    resumeFixes: [],
    targetMatch: { targetTitle: "", matchPercent: 0, matched: [], missing: [] },
    warnings: [],
    ...overrides,
  };
}

test("unknown test ids are dropped, numbers clamped, links stripped from references", () => {
  const { result, dropped } = validateResumeResult(raw(), { catalogue, skillDomains: domains, resumeText: RESUME, verified: { "AYUSH Research & Clinical Documentation": 30 } });
  assert.deepEqual(result.nextTests.map((t) => t.testId), ["t_pv"]);
  assert.deepEqual(dropped.tests, ["t_forged"]);
  assert.equal(result.nextTests[0].readinessNow, 100);
  assert.deepEqual(dropped.domains, ["Software Engineering"]);
  assert.equal(result.domainReadiness.find((d) => d.domain === "ASU&H Clinical Fundamentals").resumeSignal, 100);
  assert.deepEqual(result.studyPlan.topics[0].references, ["Ayurvedic Pharmacopoeia of India, Part I"]);
  assert.equal(result.studyPlan.topics[0].forTestId, null);
  assert.equal(result.studyPlan.weeks, 8);
  assert.deepEqual(result.studyPlan.schedule[0].topicIds, ["a"]);
  assert.equal(result.targetMatch, null);
});

test("claimed vs verified is decided by code", () => {
  const { result } = validateResumeResult(raw(), { catalogue, skillDomains: domains, resumeText: RESUME, verified: { "AYUSH Research & Clinical Documentation": 30 } });
  assert.equal(result.domainReadiness.find((d) => d.domain === "AYUSH Research & Clinical Documentation").status, "unverified-claim");
  assert.equal(domainStatus(85, null), "unverified-claim");
  assert.equal(domainStatus(85, 72), "strong");
  assert.equal(domainStatus(30, 55), "developing");
  assert.equal(domainStatus(30, null), "gap");
});

test("evidence is checked against the resume; invented evidence is flagged", () => {
  const { result } = validateResumeResult(raw(), { catalogue, skillDomains: domains, resumeText: RESUME });
  const [pv, marma] = result.extracted.skills;
  assert.equal(pv.unverifiedEvidence, false);
  assert.equal(marma.unverifiedEvidence, true);
  assert.equal(evidenceMatches("pharmacovigilance  SIGNAL detection", RESUME), true);
  assert.equal(evidenceMatches("Gold medal in Rasashastra olympiad", RESUME), false);
});

test("contact details never survive", () => {
  const { result } = validateResumeResult(raw(), { catalogue, skillDomains: domains, resumeText: RESUME });
  const text = JSON.stringify(result);
  assert.equal(text.includes("ananya.sharma@example.com"), false);
  assert.equal(text.includes("98765"), false);
  assert.equal(scrubContact("Aadhaar 1234 5678 9012"), "Aadhaar [removed]");
  assert.equal(scrubContact("call 9876543210 now"), "call [removed] now");
  assert.equal(scrubContact("BAMS 2021 batch, 5 years"), "BAMS 2021 batch, 5 years");
});

test("helpers: references, readiness, portfolio text, duplicate titles", () => {
  assert.deepEqual(cleanReferences(["Charaka Samhita, Sutrasthana ch. 1", "see ncism.gov.in"]), ["Charaka Samhita, Sutrasthana ch. 1"]);
  assert.equal(overallReadiness({ domainReadiness: [{ verifiedScore: 60 }, { verifiedScore: 80 }, { verifiedScore: null }] }), 70);
  const text = portfolioToText({ name: "Aarav", course: "BAMS" }, { education: [{ degree: "BAMS", institution: "AIIA" }], skillBadges: { Clinical: [{ name: "Nadi Pariksha" }] } });
  assert.match(text, /EDUCATION\nBAMS — AIIA/);
  assert.match(text, /Nadi Pariksha \(Clinical\)/);
  assert.equal(sameTitle("PV Audit, 2025", "pv audit 2025"), true);
});
