/**
 * The question model — shared by the editor, the AI routes and the server.
 *
 * Every question, whether a professor typed it or the model drafted it, has
 * exactly this shape:
 *
 *   {
 *     id, testId, text,
 *     type: "single" | "multiple",
 *     options: [{ id, text, isCorrect }],   // ordered
 *     explanation,
 *     source: "ai_generated" | "manual",
 *     ayushSystem, topic, difficulty,
 *     bloom,                                // "remember" | "understand" | "apply" | "analyse" | ""
 *     citation: { fileName, locator, quote } | null,   // where a document-based question came from
 *     createdAt, updatedAt,
 *     recheckHistory: [{ at, verdict, proposed, accepted }],
 *   }
 *
 * Every question is worth exactly one point; there is no marks field and the
 * paper's total is always its question count (see lib/grading.js).
 *
 * Nothing in this file touches the DOM or localStorage, so the same
 * validation runs in the browser and inside Convex.
 */

export const QUESTION_TYPES = ["single", "multiple"];
export const QUESTION_SOURCES = ["ai_generated", "manual"];
export const DIFFICULTIES = ["easy", "moderate", "hard"];
export const BLOOMS = ["remember", "understand", "apply", "analyse"];
export const MAX_OPTIONS = 6;
export const MIN_OPTIONS = 2;

export const TYPE_LABEL = { single: "Single-answer", multiple: "Multiple-answer" };

export function newId(prefix = "q") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankOption(text = "") {
  return { id: newId("o"), text, isCorrect: false };
}

export function blankQuestion(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: newId("q"),
    text: "",
    type: "single",
    options: [blankOption(), blankOption(), blankOption(), blankOption()],
    explanation: "",
    source: "manual",
    ayushSystem: overrides.ayushSystem || "",
    topic: overrides.topic || "",
    difficulty: overrides.difficulty || "",
    createdAt: now,
    updatedAt: now,
    recheckHistory: [],
    ...overrides,
  };
}

/**
 * Per-field validation for the editor. Returns an object whose keys are the
 * fields with problems; an empty object means the question is fit to save.
 */
export function validateQuestion(q) {
  const errors = {};
  if (!q || !String(q.text || "").trim()) errors.text = "Question text is required";
  const options = Array.isArray(q?.options) ? q.options : [];
  const filled = options.filter((o) => String(o?.text || "").trim());
  if (filled.length < MIN_OPTIONS) errors.options = "Add at least 2 answer options";
  const correct = filled.filter((o) => o.isCorrect);
  if (!correct.length) errors.correct = "Mark at least one correct answer";
  if (q?.type === "single" && correct.length > 1) {
    errors.correct = "Single-answer questions can only have one correct answer — switch this to Multiple-answer if you need more than one.";
  }
  if (!QUESTION_TYPES.includes(q?.type)) errors.type = "Choose Single-answer or Multiple-answer";
  return errors;
}

export function isQuestionValid(q) {
  return Object.keys(validateQuestion(q)).length === 0;
}

/** The first problem in a paper, as one sentence, or null when it is clean. */
export function validatePaper(questions) {
  if (!Array.isArray(questions) || !questions.length) return "Add at least one question — a test with no paper cannot be marked.";
  for (let i = 0; i < questions.length; i += 1) {
    const errors = validateQuestion(questions[i]);
    const first = Object.values(errors)[0];
    if (first) return `Question ${i + 1}: ${first}`;
  }
  return null;
}

/** Trims text, drops blank options, stamps ids and timestamps. */
export function normaliseQuestion(q, defaults = {}) {
  const now = new Date().toISOString();
  const options = (Array.isArray(q?.options) ? q.options : [])
    .map((o) => ({ id: o?.id || newId("o"), text: String(o?.text || "").trim(), isCorrect: Boolean(o?.isCorrect) }))
    .filter((o) => o.text)
    .slice(0, MAX_OPTIONS);
  return {
    id: q?.id || newId("q"),
    text: String(q?.text || "").trim(),
    type: q?.type === "multiple" ? "multiple" : "single",
    options,
    explanation: String(q?.explanation || "").trim(),
    source: QUESTION_SOURCES.includes(q?.source) ? q.source : "manual",
    ayushSystem: q?.ayushSystem || defaults.ayushSystem || "",
    topic: String(q?.topic || defaults.topic || "").trim(),
    difficulty: DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : "",
    bloom: BLOOMS.includes(q?.bloom) ? q.bloom : "",
    citation: cleanCitation(q?.citation),
    createdAt: q?.createdAt || now,
    updatedAt: now,
    recheckHistory: Array.isArray(q?.recheckHistory) ? q.recheckHistory : [],
  };
}

/** A source citation kept with a question: short, and only these three fields. */
export function cleanCitation(c) {
  if (!c || typeof c !== "object") return null;
  const fileName = String(c.fileName || "").trim().slice(0, 160);
  if (!fileName) return null;
  const words = String(c.quote || "").trim().split(/\s+/).filter(Boolean);
  return {
    fileName,
    locator: String(c.locator || "").trim().slice(0, 80),
    quote: words.length > 25 ? `${words.slice(0, 25).join(" ")}…` : words.join(" "),
  };
}

export function normalisePaper(questions, defaults = {}) {
  return (questions || []).map((q) => normaliseQuestion(q, defaults));
}

/**
 * What a candidate is allowed to receive before their attempt is graded:
 * the text, the type and the option ids/text — never `isCorrect`, never the
 * explanation. This is applied on the server; the browser is not trusted to
 * hide anything.
 */
export function sanitizeForCandidate(q) {
  return {
    id: q.id,
    text: q.text,
    type: q.type,
    options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
  };
}

/** True when a payload (any depth) still leaks marking data. */
export function leaksAnswerKey(value) {
  if (Array.isArray(value)) return value.some(leaksAnswerKey);
  if (value && typeof value === "object") {
    if ("isCorrect" in value || "explanation" in value || "correct" in value || "correctOption" in value) return true;
    return Object.values(value).some(leaksAnswerKey);
  }
  return false;
}

/** Duplicate a question with fresh ids so both copies can be edited apart. */
export function duplicateQuestion(q) {
  const now = new Date().toISOString();
  return {
    ...q,
    id: newId("q"),
    options: (q.options || []).map((o) => ({ ...o, id: newId("o") })),
    createdAt: now,
    updatedAt: now,
    recheckHistory: [],
  };
}

/** Converts the legacy `{question, options:[string], correctOption, marks}` shape. */
export function fromLegacyQuestion(q, defaults = {}) {
  const options = (q?.options || []).map((text, i) => ({ id: newId("o"), text: String(text || "").trim(), isCorrect: i === q.correctOption }));
  return normaliseQuestion({ text: q?.question, type: "single", options, explanation: q?.explanation || "", source: q?.source || "manual" }, defaults);
}
