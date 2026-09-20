import { test } from "node:test";
import assert from "node:assert/strict";
import { blankQuestion, validateQuestion, validatePaper, normalisePaper, sanitizeForCandidate, leaksAnswerKey, fromLegacyQuestion, duplicateQuestion } from "../lib/questions.js";

function q(overrides) {
  return {
    id: "q1",
    text: "Which schedule lays down GMP for ASU drugs?",
    type: "single",
    options: [
      { id: "a", text: "Schedule T", isCorrect: true },
      { id: "b", text: "Schedule M", isCorrect: false },
    ],
    explanation: "Schedule T of the Drugs & Cosmetics Rules.",
    ...overrides,
  };
}

test("Section 3.9 validation messages", () => {
  assert.equal(validateQuestion(q({ text: "  " })).text, "Question text is required");
  assert.equal(validateQuestion(q({ options: [{ id: "a", text: "Only one", isCorrect: true }] })).options, "Add at least 2 answer options");
  assert.equal(validateQuestion(q({ options: q().options.map((o) => ({ ...o, isCorrect: false })) })).correct, "Mark at least one correct answer");
  const twoKeys = validateQuestion(q({ options: q().options.map((o) => ({ ...o, isCorrect: true })) }));
  assert.match(twoKeys.correct, /Single-answer questions can only have one correct answer/);
  assert.deepEqual(validateQuestion(q()), {});
  assert.deepEqual(validateQuestion(q({ type: "multiple", options: q().options.map((o) => ({ ...o, isCorrect: true })) })), {});
});

test("Section 3.3 — a manual question cannot skip a correct answer or have fewer than 2 options", () => {
  assert.match(validatePaper([q({ options: [{ id: "a", text: "x", isCorrect: true }] })]), /Add at least 2 answer options/);
  assert.match(validatePaper([q({ options: q().options.map((o) => ({ ...o, isCorrect: false })) })]), /Mark at least one correct answer/);
  assert.equal(validatePaper([q()]), null);
  assert.match(validatePaper([]), /Add at least one question/);
});

test("normalisePaper trims, drops blank options and stamps ids", () => {
  const [n] = normalisePaper([{ text: " Q ", type: "multiple", options: [{ text: " A ", isCorrect: true }, { text: "", isCorrect: false }, { text: "B" }] }], { ayushSystem: "ayurveda" });
  assert.equal(n.text, "Q");
  assert.equal(n.options.length, 2);
  assert.ok(n.id && n.options.every((o) => o.id));
  assert.equal(n.ayushSystem, "ayurveda");
  assert.equal(n.source, "manual");
  assert.deepEqual(n.recheckHistory, []);
});

test("Section 3.6 — the candidate payload carries no isCorrect and no explanation", () => {
  const safe = sanitizeForCandidate(q());
  assert.deepEqual(Object.keys(safe).sort(), ["id", "options", "text", "type"]);
  assert.deepEqual(Object.keys(safe.options[0]).sort(), ["id", "text"]);
  assert.equal(leaksAnswerKey(safe), false);
  assert.equal(leaksAnswerKey({ ok: true, questions: [safe, sanitizeForCandidate(q({ id: "q2" }))] }), false);
  assert.equal(leaksAnswerKey({ questions: [q()] }), true);
  assert.equal(leaksAnswerKey({ nested: { deep: [{ explanation: "x" }] } }), true);
  assert.equal(leaksAnswerKey({ nested: { deep: [{ correctOption: 1 }] } }), true);
});

test("legacy {question, options[], correctOption} converts to the new shape", () => {
  const n = fromLegacyQuestion({ question: "Q?", options: ["A", "B", "C"], correctOption: 2, marks: 5 });
  assert.equal(n.type, "single");
  assert.equal(n.options.filter((o) => o.isCorrect).length, 1);
  assert.equal(n.options[2].isCorrect, true);
  assert.equal("marks" in n, false);
});

test("duplicate gives fresh ids and an empty recheck history", () => {
  const original = q({ recheckHistory: [{ at: "x", verdict: "ok", accepted: false }] });
  const copy = duplicateQuestion(original);
  assert.notEqual(copy.id, original.id);
  assert.ok(copy.options.every((o, i) => o.id !== original.options[i].id));
  assert.deepEqual(copy.recheckHistory, []);
  assert.equal(copy.text, original.text);
});

test("blankQuestion starts valid-shaped but not yet valid", () => {
  const b = blankQuestion({ ayushSystem: "unani" });
  assert.equal(b.type, "single");
  assert.equal(b.options.length, 4);
  assert.equal(b.ayushSystem, "unani");
  assert.ok(Object.keys(validateQuestion(b)).length > 0);
});
