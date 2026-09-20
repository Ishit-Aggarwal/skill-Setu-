import { requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { AI, FILES } from "../../../lib/settings";
import { ayushSystemLabel, isAyushSystem } from "../../../lib/ayush";
import { newId, normalisePaper, validateQuestion } from "../../../lib/questions";

/**
 * "Import from PDF" — a professor's own question paper, read into the editor.
 *
 * The PDF is handed to the model as a document and every question in it
 * comes back in the question shape from lib/questions.js, exactly as
 * written: same wording, same options, in the same order. Where the paper
 * already marks the answer (a key, a tick, bold, an answer table) that key
 * is copied; where it gives an explanation that is copied too. Only what
 * the paper does not say is generated — a missing key from the model's own
 * knowledge, a missing explanation likewise — and each such question is
 * marked so the editor can say "answer generated, please check".
 *
 * Nothing is published from here: the questions land in the editor.
 */

export const config = { api: { bodyParser: { sizeLimit: "16mb" } } };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          type: { type: "STRING", enum: ["single", "multiple"] },
          options: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { text: { type: "STRING" }, isCorrect: { type: "BOOLEAN" } },
              required: ["text", "isCorrect"],
            },
          },
          explanation: { type: "STRING" },
          answerFromPaper: { type: "BOOLEAN" },
          explanationFromPaper: { type: "BOOLEAN" },
        },
        required: ["text", "type", "options", "explanation", "answerFromPaper", "explanationFromPaper"],
      },
    },
  },
  required: ["questions"],
};

function buildPrompt({ ayushSystem }) {
  return [
    AYUSH_CONTEXT,
    ayushSystem ? `AYUSH system for this paper: ${ayushSystemLabel(ayushSystem)}.` : "",
    "The attached document is a question paper written by a professor. Transcribe every multiple-choice question in it into the JSON schema.",
    "Rules:",
    "- Copy each question's wording and each option's wording exactly as written, in the same order. Do not rephrase, shorten, merge or drop questions. Strip option lettering (A/B/C/D, i/ii/iii, 1/2/3) from option text.",
    "- type is \"multiple\" only when the question clearly allows more than one correct option (\"select all that apply\", \"which of the following are\", a key listing several letters); otherwise \"single\".",
    "- If the paper marks the correct answer(s) — an answer key, a table, a tick, bold or underlined text, an asterisk — set those options' isCorrect true and answerFromPaper true.",
    "- If the paper does not give the answer, decide the correct option(s) from your own subject knowledge, set isCorrect accordingly and set answerFromPaper false.",
    "- If the paper gives an explanation or rationale for a question, copy it as explanation and set explanationFromPaper true. Otherwise write one or two sentences explaining why the correct answer(s) are correct, and set explanationFromPaper false.",
    "- Every question needs at least 2 options and exactly one correct option when type is single (two or more when multiple).",
    "- Ignore instructions, headers, marks schemes and anything that is not a question.",
    `- Return at most ${AI.MAX_IMPORT_QUESTIONS} questions, in paper order, as JSON matching the schema.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Shapes the model's transcription; returns { questions } or { error }. */
function validate(raw, { ayushSystem, topic }) {
  const rows = Array.isArray(raw?.questions) ? raw.questions : null;
  if (!rows) return { error: "no questions array" };
  if (!rows.length) return { error: "no questions found in the document" };
  const source = rows.slice(0, AI.MAX_IMPORT_QUESTIONS);
  // normaliseQuestion keeps only the question shape, so what came from the
  // paper and what was generated is tracked alongside, by position.
  const notes = source.map((q) => ({ answerFromPaper: q.answerFromPaper !== false, explanationFromPaper: q.explanationFromPaper !== false }));
  const questions = normalisePaper(
    source.map((q) => ({
      id: newId("q"),
      text: q.text,
      type: q.type,
      options: (Array.isArray(q.options) ? q.options : []).map((o) => ({ id: newId("o"), text: o?.text, isCorrect: Boolean(o?.isCorrect) })),
      explanation: q.explanation,
      // A key the model had to supply is marked AI-generated so the editor
      // shows the badge and the professor knows to check it.
      source: q.answerFromPaper === false ? "ai_generated" : "manual",
    })),
    { ayushSystem, topic }
  );
  const kept = [];
  const dropped = [];
  questions.forEach((q, i) => {
    const errors = validateQuestion(q);
    if (Object.keys(errors).length) dropped.push({ index: i + 1, reason: Object.values(errors)[0] });
    else kept.push({ ...q, importNotes: notes[i] });
  });
  if (!kept.length) return { error: `every question was rejected (first: ${dropped[0]?.reason || "invalid"})` };
  return { questions: kept, dropped };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const host = await requireHost(req, res);
  if (!host) return undefined;

  const body = req.body || {};
  const data = String(body.pdf || "");
  const mimeType = String(body.mimeType || "application/pdf").split(";")[0].trim().toLowerCase();
  if (!data) return res.status(400).json({ success: false, error: "Attach the PDF of the question paper." });
  if (mimeType !== "application/pdf") return res.status(400).json({ success: false, error: "Please upload a PDF file." });
  // base64 is 4/3 the size of the file.
  if (data.length > (FILES.MAX_DOCUMENT_BYTES * 4) / 3 + 1024) return res.status(413).json({ success: false, error: "File is too large — please upload a file under 10MB" });
  const ayushSystem = isAyushSystem(body.ayushSystem) ? body.ayushSystem : "";
  const topic = String(body.topic || "").slice(0, AI.MAX_TOPIC_LENGTH);

  let lastError = null;
  for (let attempt = 0; attempt <= AI.GENERATION_RETRIES; attempt += 1) {
    try {
      const meta = {};
      const raw = await generateJson({ prompt: buildPrompt({ ayushSystem }), schema: RESPONSE_SCHEMA, temperature: 0.2, attachments: [{ mimeType, data }], meta });
      const checked = validate(raw, { ayushSystem, topic });
      if (checked.questions) {
        const generatedKeys = checked.questions.filter((q) => !q.importNotes?.answerFromPaper).length;
        const generatedExplanations = checked.questions.filter((q) => !q.importNotes?.explanationFromPaper).length;
        return res.status(200).json({
          success: true,
          questions: checked.questions.map(({ importNotes, ...q }) => q),
          summary: { imported: checked.questions.length, dropped: checked.dropped, generatedKeys, generatedExplanations },
          model: meta.model || GEMINI_MODEL,
        });
      }
      lastError = checked.error;
      console.warn(`[ai] Imported paper rejected (attempt ${attempt + 1}): ${checked.error}`);
    } catch (error) {
      if (error instanceof GeminiError && !["AI_MALFORMED", "AI_ERROR", "AI_BUSY"].includes(error.code)) {
        return res.status(error.status).json({ success: false, code: error.code, error: error.message });
      }
      lastError = error.message;
      console.warn(`[ai] Import failed (attempt ${attempt + 1}): ${error.message}`);
    }
  }
  return res.status(502).json({
    success: false,
    code: "AI_INVALID",
    error: "The paper could not be read. Check that the PDF contains multiple-choice questions and try again.",
    detail: lastError,
  });
}
