/**
 * Shared pieces of the question-writing AI routes (server-side only):
 * the response schema of one question, turning the model's rows into the
 * question shape of lib/questions.js, the single/multiple split, and the one
 * way every route turns a failure into an HTTP answer.
 */

import { AI } from "./settings";
import { GeminiError } from "./gemini";
import { newId, normalisePaper, validateQuestion } from "./questions";
import { tooSimilar } from "./similarity";
import { refundAiRun } from "./apiHost";

/** One question as the document routes ask for it, with its citation. */
export const CITED_QUESTION_ITEM = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING" },
    type: { type: "STRING", enum: ["single", "multiple"] },
    options: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { text: { type: "STRING" }, isCorrect: { type: "BOOLEAN" } }, required: ["text", "isCorrect"] },
    },
    explanation: { type: "STRING" },
    topicId: { type: "STRING" },
    difficulty: { type: "STRING", enum: ["easy", "moderate", "hard"] },
    bloom: { type: "STRING", enum: ["remember", "understand", "apply", "analyse"] },
    source: {
      type: "OBJECT",
      properties: { fileName: { type: "STRING" }, locator: { type: "STRING" }, quote: { type: "STRING" } },
      required: ["fileName", "locator", "quote"],
    },
  },
  required: ["text", "type", "options", "explanation", "topicId", "difficulty", "bloom", "source"],
};

/** "single" | "multiple" | "mixed" → { singleCount, multipleCount }. */
export function singleMultipleSplit(count, mix, singleCount) {
  if (mix === "multiple") return { singleCount: 0, multipleCount: count };
  if (mix === "mixed") {
    const requested = Number.isInteger(Number(singleCount)) ? Number(singleCount) : Math.round(count * AI.MIXED_SINGLE_RATIO);
    const single = Math.max(0, Math.min(count, requested));
    return { singleCount: single, multipleCount: count - single };
  }
  return { singleCount: count, multipleCount: 0 };
}

/**
 * The model's rows → questions. Every question is validated; invalid ones
 * are dropped (and counted), never shown. `fileNames` restricts citations to
 * files that were actually sent.
 */
export function shapeCitedQuestions(rows, { ayushSystem, topic, fileNames = [] }) {
  const known = new Set(fileNames.map((n) => n.toLowerCase()));
  const list = Array.isArray(rows) ? rows : [];
  const shaped = normalisePaper(
    list.map((q) => ({
      id: newId("q"),
      text: q?.text,
      type: q?.type,
      options: (Array.isArray(q?.options) ? q.options : []).map((o) => ({ id: newId("o"), text: o?.text, isCorrect: Boolean(o?.isCorrect) })),
      explanation: q?.explanation,
      source: "ai_generated",
      difficulty: q?.difficulty,
      bloom: q?.bloom,
      topic: topic || undefined,
      citation: q?.source && (!known.size || known.has(String(q.source.fileName || "").toLowerCase())) ? q.source : null,
    })),
    { ayushSystem, topic }
  );
  const kept = [];
  let invalid = 0;
  for (const q of shaped) {
    if (Object.keys(validateQuestion(q)).length || !q.explanation) invalid += 1;
    else kept.push(q);
  }
  return { kept, invalid };
}

/** Drops questions that repeat each other or anything in `existing`. Returns { kept, duplicates }. */
export function dedupeQuestions(candidates, existing = []) {
  const kept = [];
  let duplicates = 0;
  for (const q of candidates) {
    if (existing.some((e) => tooSimilar(q, e)) || kept.some((k) => tooSimilar(q, k))) duplicates += 1;
    else kept.push(q);
  }
  return { kept, duplicates };
}

/** The earlier questions a route was told to avoid, cleaned. */
export function cleanAvoidList(list, max = 200) {
  return (Array.isArray(list) ? list : [])
    .slice(0, max)
    .map((q) => ({ text: String(q?.text || "").slice(0, 400), options: (Array.isArray(q?.options) ? q.options : []).map((o) => String(typeof o === "string" ? o : o?.text || "").slice(0, 200)).slice(0, 6) }))
    .filter((q) => q.text);
}

/** Errors that mean the model never produced an answer: the run is handed back. */
const NOT_ANSWERED = ["AI_BUSY", "AI_QUOTA", "AI_ERROR", "AI_KEY", "AI_NOT_CONFIGURED"];

/**
 * Writes the response for a failure. A GeminiError is passed on with its own
 * status and message (and the run refunded when the model never answered);
 * anything else is a 502 with the route's own sentence.
 */
export async function sendAiFailure(res, auth, error, fallback) {
  if (error instanceof GeminiError) {
    if (NOT_ANSWERED.includes(error.code)) await refundAiRun(auth, "host_questions");
    return res.status(error.status || 502).json({ success: false, code: error.code, error: error.message });
  }
  console.error("[ai]", error);
  return res.status(502).json({ success: false, code: "AI_INVALID", error: fallback });
}
