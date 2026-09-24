import { chargeAiRun, refundAiRun, requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { AI } from "../../../lib/settings";
import { ayushSystemLabel, isAyushSystem } from "../../../lib/ayush";
import { newId, normalisePaper, validateQuestion } from "../../../lib/questions";
import { normaliseText } from "../../../lib/similarity";
import { allParts, loadSources, skippedNotes } from "../../../lib/docSources";
import { SOURCE_RULES } from "../../../lib/topicMap";
import { sendAiFailure } from "../../../lib/aiPaper";

/**
 * "Import an existing paper" — a professor's own questions, read into the
 * editor from one to ten files of any supported type (Paper A as a PDF,
 * Paper B as Word, the answer key as a spreadsheet, a photographed page).
 *
 * The files are read in the order the host arranged them and every question
 * comes back exactly as written: same wording, same options, same order.
 * An answer key may be in a different file from its questions and is matched
 * by question number. Where the files mark the answer it is copied; where
 * they give an explanation that is copied too. Only what the files do not say
 * is generated — and each such question is marked, so the editor can say
 * "answer generated, please check". The same question printed in two files
 * is merged, and the host is told how many were.
 *
 * Nothing is published from here: the questions land in the editor.
 */

const QUESTION = {
  type: "OBJECT",
  properties: {
    number: { type: "STRING" },
    text: { type: "STRING" },
    type: { type: "STRING", enum: ["single", "multiple"] },
    options: {
      type: "ARRAY",
      items: { type: "OBJECT", properties: { text: { type: "STRING" }, isCorrect: { type: "BOOLEAN" } }, required: ["text", "isCorrect"] },
    },
    explanation: { type: "STRING" },
    answerFromPaper: { type: "BOOLEAN" },
    explanationFromPaper: { type: "BOOLEAN" },
    sourceFile: { type: "STRING" },
    locator: { type: "STRING" },
  },
  required: ["text", "type", "options", "explanation", "answerFromPaper", "explanationFromPaper", "sourceFile", "locator"],
};
const SCHEMA = { type: "OBJECT", properties: { questions: { type: "ARRAY", items: QUESTION } }, required: ["questions"] };

function buildPrompt({ ayushSystem, fileNames, limit }) {
  return [
    AYUSH_CONTEXT,
    SOURCE_RULES,
    ayushSystem ? `AYUSH system for this paper: ${ayushSystemLabel(ayushSystem)}.` : "",
    `The attached file(s) — ${fileNames.map((n) => `"${n}"`).join(", ")}, in this order — are a question paper written by a professor. Transcribe every multiple-choice question into the JSON schema, in file order and then paper order.`,
    "Rules:",
    "- Copy each question's wording and each option's wording exactly as written. Do not rephrase, shorten, merge or drop questions. Strip option lettering (A/B/C/D, i/ii/iii, 1/2/3) from option text.",
    "- The answer key may be in a DIFFERENT file from the questions (a separate key sheet, a table at the end, a spreadsheet). Match keys to questions by question number (and paper/set name if there are several papers).",
    '- type is "multiple" only when the question clearly allows more than one correct option ("select all that apply", "which of the following are", a key listing several letters); otherwise "single".',
    "- If the files mark the correct answer(s) — an answer key, a table, a tick, **bold** or underlined text, an asterisk — set those options' isCorrect true and answerFromPaper true.",
    "- If the files do not give the answer, decide the correct option(s) from your own subject knowledge, set isCorrect accordingly and set answerFromPaper false.",
    "- If the files give an explanation or rationale, copy it as explanation and set explanationFromPaper true. Otherwise write one or two sentences explaining the answer and set explanationFromPaper false.",
    "- sourceFile: the file the question is printed in (exactly as in its source header); locator: where in it (\"p. 3, Q12\", \"Slide 4\", \"Sheet 'Set B' row 7\").",
    "- number: the question's own number as printed.",
    "- Every question needs at least 2 options and exactly one correct option when type is single (two or more when multiple).",
    "- Ignore instructions, headers, marks schemes and anything that is not a question.",
    `- Return at most ${limit} questions, as JSON matching the schema.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The model's rows → questions, with what came from the files noted alongside. */
function shape(rows, { ayushSystem, topic, fileNames }) {
  const known = new Set(fileNames.map((n) => n.toLowerCase()));
  const kept = [];
  const dropped = [];
  (Array.isArray(rows) ? rows : []).forEach((q, i) => {
    const [question] = normalisePaper(
      [
        {
          id: newId("q"),
          text: q?.text,
          type: q?.type,
          options: (Array.isArray(q?.options) ? q.options : []).map((o) => ({ id: newId("o"), text: o?.text, isCorrect: Boolean(o?.isCorrect) })),
          explanation: q?.explanation,
          // A key the model had to supply is marked AI-generated so the editor
          // shows the badge and the professor knows to check it.
          source: q?.answerFromPaper === false ? "ai_generated" : "manual",
          citation: q?.sourceFile && known.has(String(q.sourceFile).toLowerCase()) ? { fileName: q.sourceFile, locator: q.locator || "", quote: "" } : null,
        },
      ],
      { ayushSystem, topic }
    );
    const errors = validateQuestion(question);
    if (Object.keys(errors).length) dropped.push({ index: i + 1, reason: Object.values(errors)[0] });
    else kept.push({ ...question, importNotes: { answerFromPaper: q?.answerFromPaper !== false, explanationFromPaper: q?.explanationFromPaper !== false } });
  });
  return { kept, dropped };
}

/** The same question printed twice (two sets, a repeated page) is kept once. */
function mergeRepeats(questions) {
  const seen = new Set();
  const out = [];
  let merged = 0;
  for (const q of questions) {
    const key = normaliseText(`${q.text} ${(q.options || []).map((o) => o.text).join(" ")}`);
    if (seen.has(key)) {
      merged += 1;
      continue;
    }
    seen.add(key);
    out.push(q);
  }
  return { questions: out, merged };
}

async function readAll({ docs, ayushSystem, topic, limit }) {
  const fileNames = docs.map((d) => d.fileName);
  const meta = {};
  const raw = await generateJson({ prompt: buildPrompt({ ayushSystem, fileNames, limit }), schema: SCHEMA, parts: allParts(docs), temperature: 0.2, meta });
  return { ...shape(raw?.questions, { ayushSystem, topic, fileNames }), model: meta.model };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const auth = await requireHost(req, res);
  if (!auth) return undefined;

  const body = req.body || {};
  const sources = Array.isArray(body.sources) ? body.sources : [];
  if (!sources.length) return res.status(400).json({ success: false, error: "Upload the question paper — one or more files." });
  if (sources.length > AI.MAX_SOURCE_FILES) return res.status(400).json({ success: false, error: `Upload at most ${AI.MAX_SOURCE_FILES} files.` });
  const ayushSystem = isAyushSystem(body.ayushSystem) ? body.ayushSystem : "";
  const topic = String(body.topic || "").slice(0, AI.MAX_TOPIC_LENGTH);
  if (!(await chargeAiRun(auth, res, "host_questions"))) return undefined;

  const { docs, skipped, truncated } = await loadSources(auth, sources);
  if (!docs.length) {
    await refundAiRun(auth, "host_questions");
    return res.status(400).json({ success: false, code: "NO_READABLE_SOURCES", error: "None of the files could be read.", skipped: skippedNotes(skipped) });
  }

  const limit = AI.MAX_IMPORT_QUESTIONS;
  let result = null;
  let model = GEMINI_MODEL;
  try {
    // Everything in one read first: that is what lets a key in one file be
    // matched to questions in another.
    result = await readAll({ docs, ayushSystem, topic, limit });
    model = result.model || model;
  } catch (error) {
    if (!(error instanceof GeminiError) || !["AI_MALFORMED", "AI_ERROR"].includes(error.code) || docs.length === 1) {
      return await sendAiFailure(res, auth, error, "The paper could not be read. Check that the files contain multiple-choice questions and try again.");
    }
    // Too much for one answer (a very long paper): read file by file, each
    // alongside any file that looks like a key, so keys still travel.
    const keyDocs = docs.filter((d) => /key|answer|solution|scheme/i.test(d.fileName));
    const kept = [];
    const dropped = [];
    for (const doc of docs.filter((d) => !keyDocs.includes(d))) {
      if (kept.length >= limit) break;
      try {
        const part = await readAll({ docs: [doc, ...keyDocs], ayushSystem, topic, limit: limit - kept.length });
        kept.push(...part.kept);
        dropped.push(...part.dropped);
        model = part.model || model;
      } catch (inner) {
        skipped.push({ fileName: doc.fileName, reason: inner.message || "it could not be read" });
      }
    }
    result = { kept, dropped };
  }

  if (!result?.kept?.length) {
    return res.status(422).json({
      success: false,
      code: "AI_INVALID",
      error: "No questions could be read from these files. Check that they contain multiple-choice questions and try again.",
      skipped: skippedNotes(skipped),
    });
  }
  const { questions, merged } = mergeRepeats(result.kept.slice(0, limit));
  const generatedKeys = questions.filter((q) => !q.importNotes?.answerFromPaper).length;
  const generatedExplanations = questions.filter((q) => !q.importNotes?.explanationFromPaper).length;
  return res.status(200).json({
    success: true,
    questions: questions.map(({ importNotes, ...q }) => q),
    summary: { imported: questions.length, dropped: result.dropped, generatedKeys, generatedExplanations, merged, files: docs.map((d) => d.fileName) },
    skipped: skippedNotes(skipped),
    truncated: truncated.map((t) => t.reason),
    model,
    aiRunsLeft: auth.aiRunsLeft ?? null,
  });
}

export const config = { api: { responseLimit: false } };
