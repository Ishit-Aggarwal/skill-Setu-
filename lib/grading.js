/**
 * Marking — pure functions, no I/O, so the same code runs on the server and
 * under the test runner.
 *
 * The rule is all-or-nothing and final: a question is worth exactly 1 point,
 * earned only when the set of selected option ids is identical to the set of
 * correct option ids. A missing correct option, an extra wrong option, or no
 * selection at all scores 0. There is no partial credit anywhere.
 */

import { TYPE_LABEL } from "./questions";

function idSet(ids) {
  return new Set((Array.isArray(ids) ? ids : ids == null ? [] : [ids]).map(String));
}

/** (selected option ids, correct option ids) → 0 | 1 */
export function gradeQuestion(selectedIds, correctIds) {
  const chosen = idSet(selectedIds);
  const correct = idSet(correctIds);
  if (!correct.size || chosen.size !== correct.size) return 0;
  for (const id of correct) if (!chosen.has(id)) return 0;
  return 1;
}

/** Total points on a paper is always its question count. */
export function totalPoints(questions) {
  return Array.isArray(questions) ? questions.length : 0;
}

/**
 * Marks a whole paper.
 *
 * `answers` maps question id → array of selected option ids (a single-answer
 * question simply has one id in the array). The breakdown carries everything
 * the graded review needs — including explanations and correct answers —
 * which is why it is only ever returned for an attempt already in GRADED.
 */
export function gradePaper(questions, answers = {}) {
  const total = totalPoints(questions);
  let points = 0;
  const breakdown = (questions || []).map((q, index) => {
    const correctIds = (q.options || []).filter((o) => o.isCorrect).map((o) => o.id);
    const chosenIds = Array.isArray(answers?.[q.id]) ? answers[q.id].map(String) : [];
    const earned = gradeQuestion(chosenIds, correctIds);
    points += earned;
    const textOf = (ids) => (q.options || []).filter((o) => ids.includes(String(o.id))).map((o) => o.text);
    return {
      index,
      questionId: q.id,
      question: q.text,
      type: q.type,
      correct: earned === 1,
      points: earned,
      chosenIds,
      correctIds,
      chosenText: textOf(chosenIds).join("; "),
      correctText: textOf(correctIds.map(String)).join("; "),
      explanation: q.explanation || "",
    };
  });
  return {
    points,
    total,
    score: total ? Math.round((points / total) * 100) : 0,
    correctCount: points,
    totalQuestions: total,
    breakdown,
  };
}

/**
 * Takes the violation penalty off a marked paper.
 *
 * Points can go no lower than zero. When the penalties reach the paper's
 * total the attempt has failed outright — `failed` is what the exam room
 * and the report key off, and a failed attempt scores 0 whatever was
 * answered.
 */
export function applyPenalty(result, { violations = 0, penaltyPerViolation = 0 } = {}) {
  const total = Number(result?.total) || 0;
  const perViolation = clampPenalty(penaltyPerViolation, total);
  const penaltyPoints = Math.max(0, Math.round(Number(violations) || 0)) * perViolation;
  const failed = total > 0 && perViolation > 0 && penaltyPoints >= total;
  const rawPoints = Number(result?.points) || 0;
  const points = failed ? 0 : Math.max(0, rawPoints - penaltyPoints);
  return {
    ...result,
    rawPoints,
    penaltyPoints,
    penaltyPerViolation: perViolation,
    violations: Math.max(0, Math.round(Number(violations) || 0)),
    failed,
    points,
    score: total ? Math.round((points / total) * 100) : 0,
  };
}

/** A penalty is a whole number of points between 0 and the paper's total. */
export function clampPenalty(value, totalPoints) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  const total = Math.max(0, Math.round(Number(totalPoints) || 0));
  return total ? Math.min(n, total) : n;
}

/** How many violations a paper survives before it fails: ceil(total / penalty), or null when penalties are off. */
export function violationsToFail(totalPoints, penaltyPerViolation) {
  const per = clampPenalty(penaltyPerViolation, totalPoints);
  const total = Math.max(0, Math.round(Number(totalPoints) || 0));
  if (!per || !total) return null;
  return Math.ceil(total / per);
}

/** "single" | "multiple" | "mixed" | null (empty paper). */
export function paperType(questions) {
  if (!Array.isArray(questions) || !questions.length) return null;
  const hasSingle = questions.some((q) => q.type === "single");
  const hasMultiple = questions.some((q) => q.type === "multiple");
  if (hasSingle && hasMultiple) return "mixed";
  return hasMultiple ? "multiple" : "single";
}

export const PAPER_TYPE_LABEL = {
  single: "Single-answer only",
  multiple: "Multiple-answer only",
  mixed: "Single & Multiple-answer",
};

export function paperTypeLabel(questions) {
  const type = paperType(questions);
  return type ? PAPER_TYPE_LABEL[type] : "";
}

export function questionTypeLabel(type) {
  return TYPE_LABEL[type] || "";
}

/** "12 Questions · 12 Points" */
export function paperCounter(questions) {
  const n = totalPoints(questions);
  return `${n} Question${n === 1 ? "" : "s"} · ${n} Point${n === 1 ? "" : "s"}`;
}

/** Whether a graded score clears a test's certificate threshold. */
export function certificateEligible(score, minScore) {
  if (minScore == null || minScore === "" || Number.isNaN(Number(minScore))) return true;
  return Number(score) >= Number(minScore);
}
