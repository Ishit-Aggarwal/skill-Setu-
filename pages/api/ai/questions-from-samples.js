import { chargeAiRun, refundAiRun, requireHost } from "../../../lib/apiHost";
import { toParts } from "../../../lib/docText";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { AI, EXAM } from "../../../lib/settings";
import { ayushSystemLabel, isAyushSystem } from "../../../lib/ayush";
import { DIFFICULTIES, newId, normalisePaper, validateQuestion } from "../../../lib/questions";
import { filterAgainstSamples } from "../../../lib/similarity";

/**
 * "Questions from the sample papers" — a fresh paper on the same ground.
 *
 * The sample papers a host attached to the test are read by the model,
 * which returns two things: a transcription of the questions it found, and
 * a new set that tests the same concepts with different questions. The
 * instruction is explicit and absolute — no sample question may reappear,
 * however lightly reworded — and lib/similarity.js enforces it afterwards:
 * any generated question that reads like a copy of a sample is dropped, and
 * the professor is told how many were.
 *
 * The PDFs are fetched here from file storage (never from an arbitrary
 * address) and handed to the model inline. Nothing is published from here.
 */

const MAX_PAPERS = EXAM.MAX_SAMPLE_PAPERS;

const QUESTION_ITEM = {
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
    concept: { type: "STRING" },
  },
  required: ["text", "type", "options", "explanation", "concept"],
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sampleQuestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { text: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } }, concept: { type: "STRING" } },
        required: ["text", "options", "concept"],
      },
    },
    questions: { type: "ARRAY", items: QUESTION_ITEM },
  },
  required: ["sampleQuestions", "questions"],
};

function buildPrompt({ count, singleCount, multipleCount, ayushSystem, difficulty, audience, topic, paperCount, avoid }) {
  return [
    AYUSH_CONTEXT,
    `AYUSH system for this paper: ${ayushSystemLabel(ayushSystem)}.`,
    topic ? `The test is titled "${topic}".` : "",
    `Attached ${paperCount === 1 ? "is a sample question paper" : `are ${paperCount} sample question papers`} the professor gave candidates to show the style and syllabus of the test.`,
    "Step 1 — read every multiple-choice question in the sample papers and list each one under sampleQuestions: its wording, its option texts, and the concept it tests (a short phrase).",
    `Step 2 — write exactly ${count} NEW multiple-choice questions under questions that examine the SAME concepts, at the same level and in the same style, and set each one's concept to the concept it examines.`,
    "ABSOLUTE RULE: no generated question may be the same as any sample question. Not the same wording, not a rewording, not the same fact asked the other way round, not the same option set. Take the concept and test it through a different case, a different example, a different clinical or pharmaceutical scenario, a different classical reference, or a different consequence — so that a candidate who memorised the sample paper gains nothing.",
    avoid.length ? `Also avoid these earlier attempts that were too close to the samples: ${avoid.map((t) => `"${t}"`).join("; ")}.` : "",
    audience ? `Candidates are: ${audience}.` : "",
    difficulty ? `Difficulty: ${difficulty}.` : "",
    `Exactly ${singleCount} generated question(s) must have type "single" (exactly one option with isCorrect true) and exactly ${multipleCount} question(s) must have type "multiple" (two or more options with isCorrect true, and at least one false).`,
    "Rules for the generated questions:",
    "- Each question has 4 options (5 is allowed for multiple-answer). Wrong options must be plausible.",
    "- Vary which position the correct option(s) sit in.",
    "- Keep each question under 240 characters and each option under 100 characters. No A/B/C/D lettering inside option text.",
    "- explanation: one or two sentences on why the correct answer(s) are correct, citing the relevant text, regulation or principle.",
    "- Return only JSON matching the schema, with the single-type questions first.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Shapes the model's output; returns { questions, samples, dropped } or { error }. */
function validate(raw, { count, singleCount, multipleCount, ayushSystem, topic, difficulty }) {
  const rows = Array.isArray(raw?.questions) ? raw.questions : null;
  if (!rows) return { error: "no questions array" };
  const samples = (Array.isArray(raw?.sampleQuestions) ? raw.sampleQuestions : []).map((q) => ({
    text: String(q?.text || ""),
    options: (Array.isArray(q?.options) ? q.options : []).map((o) => String(o || "")),
    concept: String(q?.concept || ""),
  }));
  const questions = normalisePaper(
    rows.map((q) => ({
      id: newId("q"),
      text: q.text,
      type: q.type,
      options: (Array.isArray(q.options) ? q.options : []).map((o) => ({ id: newId("o"), text: o?.text, isCorrect: Boolean(o?.isCorrect) })),
      explanation: q.explanation,
      source: "ai_generated",
      difficulty,
      topic: q.concept ? String(q.concept).slice(0, 120) : undefined,
    })),
    { ayushSystem, topic }
  );
  for (let i = 0; i < questions.length; i += 1) {
    const errors = validateQuestion(questions[i]);
    if (Object.keys(errors).length) return { error: `question ${i + 1}: ${Object.values(errors)[0]}` };
    if (!questions[i].explanation) return { error: `question ${i + 1}: missing explanation` };
  }
  // The explicit rule, enforced: anything that copies a sample is dropped.
  const { kept, dropped } = filterAgainstSamples(questions, samples);
  if (!kept.length) return { error: "every generated question copied a sample question", samples, dropped };
  const singles = kept.filter((q) => q.type === "single").length;
  if (kept.length === count && (singles !== singleCount || kept.length - singles !== multipleCount)) {
    return { error: `expected ${singleCount} single / ${multipleCount} multiple, got ${singles} / ${kept.length - singles}` };
  }
  return { questions: kept, samples, dropped };
}

/** Only files in this deployment's own storage are fetched. */
function allowedStorageUrl(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol !== "https:") return false;
    const own = process.env.NEXT_PUBLIC_CONVEX_URL ? new URL(process.env.NEXT_PUBLIC_CONVEX_URL).hostname : null;
    return u.hostname === own || u.hostname.endsWith(".convex.cloud") || u.hostname.endsWith(".convex.site");
  } catch {
    return false;
  }
}

/**
 * A sample paper of any supported type (PDF, Word, slides, a spreadsheet, a
 * photo) → model parts, through the same reader every AI route uses.
 */
async function readSample(paper, index, total) {
  const res = await fetch(paper.url);
  if (!res.ok) throw new Error(`Could not read "${paper.fileName || "sample paper"}" (HTTP ${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > AI.MAX_SOURCE_FILE_BYTES) throw new Error(`"${paper.fileName || "A sample paper"}" is too large to read.`);
  return toParts(bytes, { fileName: paper.fileName || `Sample paper ${index + 1}`, mimeType: paper.mimeType || "", index: index + 1, total }).parts;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const host = await requireHost(req, res);
  if (!host) return undefined;

  const body = req.body || {};
  const papers = (Array.isArray(body.papers) ? body.papers : [])
    .filter((p) => p && typeof p === "object" && allowedStorageUrl(p.url))
    .slice(0, MAX_PAPERS)
    .map((p) => ({ url: String(p.url), fileName: String(p.fileName || "").slice(0, 120), mimeType: String(p.mimeType || "").slice(0, 120) }));
  if (!papers.length) return res.status(400).json({ success: false, error: "Attach at least one sample paper to the test first." });

  const count = Math.round(Number(body.count));
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
  const topic = String(body.topic || "").slice(0, AI.MAX_TOPIC_LENGTH);

  let parts;
  try {
    parts = (await Promise.all(papers.map((p, i) => readSample(p, i, papers.length)))).flat();
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
  if (!(await chargeAiRun(host, res, "host_questions"))) return undefined;

  const params = { count, singleCount, multipleCount, ayushSystem, difficulty, audience, topic, paperCount: papers.length };
  let lastError = null;
  let avoid = [];
  // One retry more than a plain generation: a paper whose questions were
  // dropped as copies is regenerated with those copies named.
  for (let attempt = 0; attempt <= AI.GENERATION_RETRIES + 1; attempt += 1) {
    try {
      const meta = {};
      const raw = await generateJson({ prompt: buildPrompt({ ...params, avoid }), schema: RESPONSE_SCHEMA, temperature: attempt === 0 ? 0.7 : 0.9, parts, meta });
      const checked = validate(raw, params);
      if (checked.questions && (checked.questions.length === count || attempt >= AI.GENERATION_RETRIES + 1)) {
        return res.status(200).json({
          success: true,
          questions: checked.questions,
          summary: {
            generated: checked.questions.length,
            requested: count,
            sampleQuestions: checked.samples.length,
            dropped: checked.dropped.length,
            papers: papers.map((p) => p.fileName).filter(Boolean),
          },
          model: meta.model || GEMINI_MODEL,
          retried: attempt > 0,
        });
      }
      if (checked.dropped?.length) avoid = [...avoid, ...checked.dropped.map((d) => d.question.text)].slice(-10);
      lastError = checked.error || `${checked.dropped?.length || 0} question(s) copied a sample and were dropped`;
      console.warn(`[ai] Sample-based paper rejected (attempt ${attempt + 1}): ${lastError}`);
    } catch (error) {
      if (error instanceof GeminiError && !["AI_MALFORMED", "AI_ERROR", "AI_BUSY"].includes(error.code)) {
        if (error.code !== "AI_MALFORMED") await refundAiRun(host, "host_questions");
        return res.status(error.status).json({ success: false, code: error.code, error: error.message });
      }
      lastError = error.message;
      console.warn(`[ai] Sample-based generation failed (attempt ${attempt + 1}): ${error.message}`);
    }
  }
  return res.status(502).json({
    success: false,
    code: "AI_INVALID",
    error: "Something went wrong generating questions from the sample papers. Please try again.",
    detail: lastError,
  });
}

export const config = { api: { responseLimit: false } };
