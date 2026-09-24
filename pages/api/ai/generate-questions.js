import { chargeAiRun, refundAiRun, requireHost } from "../../../lib/apiHost";
import { allParts, loadSources, skippedNotes } from "../../../lib/docSources";
import { SOURCE_RULES } from "../../../lib/topicMap";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { AI } from "../../../lib/settings";
import { ayushSystemLabel, isAyushSystem } from "../../../lib/ayush";
import { DIFFICULTIES, newId, normalisePaper, validateQuestion } from "../../../lib/questions";

/**
 * "Generate with AI" — a whole paper from a topic.
 *
 * The professor says what the paper should cover, how many questions, which
 * AYUSH system, and the single/multiple mix; the model returns strict JSON in
 * the question shape from lib/questions.js. The response is validated before
 * anyone sees it — wrong count, missing field, a single-answer question with
 * two keys — and generated once more on failure before the professor is told
 * to retry. Nothing is published from here: the questions land in the
 * editor, where every one is still theirs to correct.
 */

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
        },
        required: ["text", "type", "options", "explanation"],
      },
    },
  },
  required: ["questions"],
};

function buildPrompt({ topic, count, singleCount, multipleCount, ayushSystem, difficulty, audience, hasNotes }) {
  return [
    AYUSH_CONTEXT,
    hasNotes ? SOURCE_RULES : "",
    hasNotes ? "The professor attached their notes: base the questions on them wherever they cover the topic." : "",
    `AYUSH system for this paper: ${ayushSystemLabel(ayushSystem)}.`,
    `Write exactly ${count} multiple-choice questions on: ${topic}.`,
    audience ? `Candidates are: ${audience}.` : "",
    difficulty ? `Difficulty: ${difficulty}.` : "",
    `Exactly ${singleCount} question(s) must have type "single" (exactly one option with isCorrect true) and exactly ${multipleCount} question(s) must have type "multiple" (two or more options with isCorrect true, and at least one false).`,
    "Rules:",
    "- Each question has 4 options (5 is allowed for multiple-answer). Wrong options must be plausible.",
    "- Vary which position the correct option(s) sit in.",
    "- Keep each question under 240 characters and each option under 100 characters. No A/B/C/D lettering inside option text.",
    "- explanation: one or two sentences on why the correct answer(s) are correct, citing the relevant text, regulation or principle.",
    "- Return only JSON matching the schema, with the single-type questions first.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Shapes the model's output and says what, if anything, is wrong with it. */
function validate(raw, { count, singleCount, multipleCount, ayushSystem, topic, difficulty }) {
  const rows = Array.isArray(raw?.questions) ? raw.questions : null;
  if (!rows) return { error: "no questions array" };
  if (rows.length !== count) return { error: `expected ${count} questions, got ${rows.length}` };
  const questions = normalisePaper(
    rows.map((q) => ({
      id: newId("q"),
      text: q.text,
      type: q.type,
      options: (Array.isArray(q.options) ? q.options : []).map((o) => ({ id: newId("o"), text: o?.text, isCorrect: Boolean(o?.isCorrect) })),
      explanation: q.explanation,
      source: "ai_generated",
      difficulty,
    })),
    { ayushSystem, topic }
  );
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const errors = validateQuestion(q);
    if (Object.keys(errors).length) return { error: `question ${i + 1}: ${Object.values(errors)[0]}` };
    if (q.type === "multiple" && q.options.filter((o) => o.isCorrect).length < 1) return { error: `question ${i + 1}: multiple-answer with no key` };
    if (!q.explanation) return { error: `question ${i + 1}: missing explanation` };
  }
  const singles = questions.filter((q) => q.type === "single").length;
  if (singles !== singleCount || questions.length - singles !== multipleCount) {
    return { error: `expected ${singleCount} single / ${multipleCount} multiple, got ${singles} / ${questions.length - singles}` };
  }
  return { questions };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const host = await requireHost(req, res);
  if (!host) return undefined;

  const body = req.body || {};
  const topic = String(body.topic || "").trim().slice(0, AI.MAX_TOPIC_LENGTH);
  const count = Math.round(Number(body.count));
  if (!topic) return res.status(400).json({ success: false, error: "Describe what the paper should cover." });
  if (!Number.isInteger(count) || count < 1 || count > AI.MAX_QUESTIONS) {
    return res.status(400).json({ success: false, error: `Please enter a number between 1 and ${AI.MAX_QUESTIONS}` });
  }
  const ayushSystem = body.ayushSystem;
  if (!isAyushSystem(ayushSystem)) return res.status(400).json({ success: false, error: "Choose the AYUSH System this paper is for." });

  const mix = ["single", "multiple", "mixed"].includes(body.mix) ? body.mix : "single";
  let singleCount = count;
  let multipleCount = 0;
  if (mix === "multiple") {
    singleCount = 0;
    multipleCount = count;
  } else if (mix === "mixed") {
    const requested = Number.isInteger(Number(body.singleCount)) ? Number(body.singleCount) : Math.round(count * AI.MIXED_SINGLE_RATIO);
    singleCount = Math.max(0, Math.min(count, requested));
    multipleCount = count - singleCount;
  }
  const difficulty = DIFFICULTIES.includes(body.difficulty) ? body.difficulty : "";
  const audience = String(body.audience || "").slice(0, 200);

  if (!(await chargeAiRun(host, res, "host_questions"))) return undefined;
  // Optional notes attached to a topic ("Attach notes").
  let parts = [];
  let skipped = [];
  if (Array.isArray(body.sources) && body.sources.length) {
    const read = await loadSources(host, body.sources);
    parts = allParts(read.docs);
    skipped = skippedNotes(read.skipped);
  }
  const params = { topic, count, singleCount, multipleCount, ayushSystem, difficulty, audience, hasNotes: parts.length > 0 };
  let lastError = null;
  for (let attempt = 0; attempt <= AI.GENERATION_RETRIES; attempt += 1) {
    try {
      const meta = {};
      const raw = await generateJson({ prompt: buildPrompt(params), schema: RESPONSE_SCHEMA, temperature: attempt === 0 ? 0.6 : 0.8, parts, meta });
      const checked = validate(raw, params);
      if (checked.questions) {
        return res.status(200).json({ success: true, questions: checked.questions, model: meta.model || GEMINI_MODEL, retried: attempt > 0, skipped, aiRunsLeft: host.aiRunsLeft ?? null });
      }
      lastError = checked.error;
      console.warn(`[ai] Generated paper rejected (attempt ${attempt + 1}): ${checked.error}`);
    } catch (error) {
      if (error instanceof GeminiError && !["AI_MALFORMED", "AI_ERROR", "AI_BUSY"].includes(error.code)) {
        if (error.code !== "AI_MALFORMED") await refundAiRun(host, "host_questions");
        return res.status(error.status).json({ success: false, code: error.code, error: error.message });
      }
      lastError = error.message;
      console.warn(`[ai] Generation failed (attempt ${attempt + 1}): ${error.message}`);
    }
  }
  return res.status(502).json({
    success: false,
    code: "AI_INVALID",
    error: "Something went wrong generating questions. Please try again.",
    detail: lastError,
  });
}
