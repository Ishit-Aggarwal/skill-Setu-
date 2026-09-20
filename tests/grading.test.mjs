import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeQuestion, gradePaper, paperType, paperTypeLabel, totalPoints, certificateEligible, paperCounter } from "../lib/grading.js";

/* Section 3.7 — all-or-nothing, 1 point per question, no partial credit. */

test("multiple: exact match earns 1 point", () => {
  assert.equal(gradeQuestion(["a", "c"], ["a", "c"]), 1);
  assert.equal(gradeQuestion(["c", "a"], ["a", "c"]), 1); // order does not matter
});

test("multiple: missing one correct option earns 0", () => {
  assert.equal(gradeQuestion(["a"], ["a", "c"]), 0);
});

test("multiple: one extra wrong option alongside all correct earns 0", () => {
  assert.equal(gradeQuestion(["a", "c", "b"], ["a", "c"]), 0);
});

test("no options selected earns 0", () => {
  assert.equal(gradeQuestion([], ["a", "c"]), 0);
  assert.equal(gradeQuestion(undefined, ["a"]), 0);
  assert.equal(gradeQuestion(null, ["a"]), 0);
});

test("single: the one correct option earns 1, any other single option earns 0", () => {
  assert.equal(gradeQuestion(["b"], ["b"]), 1);
  assert.equal(gradeQuestion(["a"], ["b"]), 0);
  assert.equal(gradeQuestion(["c"], ["b"]), 0);
});

test("a question with no correct option can never be earned", () => {
  assert.equal(gradeQuestion([], []), 0);
  assert.equal(gradeQuestion(["a"], []), 0);
});

const paper = [
  { id: "q1", text: "Q1", type: "single", options: [{ id: "q1a", text: "A", isCorrect: true }, { id: "q1b", text: "B", isCorrect: false }], explanation: "because" },
  { id: "q2", text: "Q2", type: "multiple", options: [{ id: "q2a", text: "A", isCorrect: true }, { id: "q2b", text: "B", isCorrect: true }, { id: "q2c", text: "C", isCorrect: false }], explanation: "" },
  { id: "q3", text: "Q3", type: "single", options: [{ id: "q3a", text: "A", isCorrect: false }, { id: "q3b", text: "B", isCorrect: true }], explanation: "" },
];

test("Section 3.5 — total points always equals the question count", () => {
  assert.equal(totalPoints(paper), 3);
  assert.equal(totalPoints([]), 0);
  assert.equal(paperCounter(paper), "3 Questions · 3 Points");
  assert.equal(paperCounter([paper[0]]), "1 Question · 1 Point");
});

test("gradePaper: points, percentage and breakdown", () => {
  const r = gradePaper(paper, { q1: ["q1a"], q2: ["q2a"], q3: ["q3b"] });
  assert.equal(r.points, 2);
  assert.equal(r.total, 3);
  assert.equal(r.score, 67);
  assert.equal(r.correctCount, 2);
  assert.equal(r.totalQuestions, 3);
  assert.deepEqual(r.breakdown.map((b) => b.correct), [true, false, true]);
  assert.equal(r.breakdown[0].explanation, "because");
  assert.equal(r.breakdown[1].correctText, "A; B");
  assert.equal(r.breakdown[1].chosenText, "A");
});

test("gradePaper: unanswered paper scores zero", () => {
  const r = gradePaper(paper, {});
  assert.equal(r.points, 0);
  assert.equal(r.score, 0);
});

test("Section 3.8 — paper type badge recomputes as the mix changes", () => {
  const single = [paper[0], paper[2]];
  assert.equal(paperType(single), "single");
  assert.equal(paperTypeLabel(single), "Single-answer only");

  const nowMixed = [...single, paper[1]]; // adding a multiple-answer question
  assert.equal(paperType(nowMixed), "mixed");
  assert.equal(paperTypeLabel(nowMixed), "Single & Multiple-answer");

  const onlyMultiple = [paper[1], { ...paper[1], id: "q4" }];
  assert.equal(paperType(onlyMultiple), "multiple");
  assert.equal(paperTypeLabel(onlyMultiple), "Multiple-answer only");

  // Removing the multiple-answer question again returns to single-only.
  assert.equal(paperTypeLabel(nowMixed.filter((q) => q.type !== "multiple")), "Single-answer only");
  // Changing a question's type flips the badge without adding or removing.
  assert.equal(paperTypeLabel(single.map((q, i) => (i === 0 ? { ...q, type: "multiple" } : q))), "Single & Multiple-answer");
  assert.equal(paperType([]), null);
  assert.equal(paperTypeLabel([]), "");
});

test("Section 4.3 — certificate eligibility against a minimum score", () => {
  assert.equal(certificateEligible(72, 60), true);
  assert.equal(certificateEligible(60, 60), true);
  assert.equal(certificateEligible(59, 60), false);
  assert.equal(certificateEligible(0, null), true); // blank minimum = everyone
  assert.equal(certificateEligible(10, ""), true);
  assert.equal(certificateEligible(10, undefined), true);
});
