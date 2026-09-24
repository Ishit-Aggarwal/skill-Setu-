import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_RESUME_TEXT, DEMO_VERIFIED_SCORES, RASA_PANCHAKA_QUESTIONS, demoResumeRaw, questionRows } from "../lib/demoFeatures.js";
import { validateResumeResult } from "../lib/resumeAnalysis.js";
import { SKILL_DOMAINS } from "../lib/questionBank.js";

test("the demo question bank: 30 questions, one right answer each, in varying places", () => {
  assert.equal(RASA_PANCHAKA_QUESTIONS.length, 30);
  const rows = questionRows("t1", "demo-academician", RASA_PANCHAKA_QUESTIONS, "2026-09-24T00:00:00.000Z");
  for (const row of rows) {
    assert.equal(row.options.length, 4);
    assert.equal(row.options.filter((o) => o.isCorrect).length, 1);
    assert.equal(new Set(row.options.map((o) => o.id)).size, 4);
  }
  assert.equal(new Set(rows.map((r) => r.options.findIndex((o) => o.isCorrect))).size, 4);
});

test("the precomputed demo analysis passes validation with two tests and an unverified claim", () => {
  const catalogue = [{ testId: "rasa" }, { testId: "u3" }];
  const { result, dropped } = validateResumeResult(demoResumeRaw({ rasaTestId: "rasa", unit3TestId: "u3" }), {
    catalogue,
    skillDomains: SKILL_DOMAINS,
    resumeText: DEMO_RESUME_TEXT,
    verified: DEMO_VERIFIED_SCORES,
    hasTarget: true,
  });
  assert.deepEqual(result.nextTests.map((t) => t.testId), ["rasa", "u3"]);
  assert.equal(dropped.tests.length, 0);
  assert.equal(dropped.domains.length, 0);
  assert.ok(result.domainReadiness.some((d) => d.status === "unverified-claim"));
  assert.ok(result.extracted.skills.every((s) => !s.unverifiedEvidence));
  assert.ok(result.targetMatch);
});
