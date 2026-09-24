import { chargeAiRun, refundAiRun, requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { AI } from "../../../lib/settings";
import { ayushSystemLabel, isAyushSystem } from "../../../lib/ayush";
import { loadSources, skippedNotes } from "../../../lib/docSources";
import { BLOOM_LEVELS, DEFAULT_BLOOM_MIX, DEFAULT_DIFFICULTY_MIX, DIFFICULTY_LEVELS, SOURCE_RULES, excerptFor, mixCounts, truncateWords } from "../../../lib/topicMap";
import { CITED_QUESTION_ITEM, cleanAvoidList, dedupeQuestions, sendAiFailure, shapeCitedQuestions, singleMultipleSplit } from "../../../lib/aiPaper";

/**
 * "Generate from my documents", step 2: the questions for one topic.
 *
 * The browser calls this once per ticked topic (three at a time) so the modal
 * can show "Topic 3 of 8: Rasa Panchaka…". Each call re-reads the host's own
 * files and sends the model only this topic's excerpts — the passages around
 * the topic's cited quotes, title and subtopics — plus any PDF or image the
 * topic cites, not every file every time. Every question comes back with a
 * difficulty, a Bloom level, an explanation and a citation; invalid ones are
 * dropped and the shortfall regenerated once; repeats of each other or of
 * questions already in the editor are removed. Nothing is published from
 * here — the questions land in the editor for the professor to review.
 */

const SCHEMA = { type: "OBJECT", properties: { questions: { type: "ARRAY", items: CITED_QUESTION_ITEM } }, required: ["questions"] };

function cleanTopic(t) {
  return {
    id: String(t?.id || "topic").slice(0, 40),
    title: String(t?.title || "").trim().slice(0, 120),
    subtopics: (Array.isArray(t?.subtopics) ? t.subtopics : []).map((s) => String(s || "").slice(0, 120)).filter(Boolean).slice(0, 12),
    sources: (Array.isArray(t?.sources) ? t.sources : []).slice(0, 6).map((s) => ({ fileName: String(s?.fileName || "").slice(0, 160), locator: String(s?.locator || "").slice(0, 80), quote: truncateWords(s?.quote) })),
  };
}

function cleanMix(raw, defaults) {
  const out = {};
  for (const key of Object.keys(defaults)) {
    const n = Number(raw?.[key]);
    out[key] = Number.isFinite(n) && n >= 0 ? n : defaults[key];
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  return sum > 0 ? out : { ...defaults };
}

/** Only this topic's material: text excerpts, and the PDFs/images it cites. */
function partsForTopic(docs, topic) {
  const cited = new Set(topic.sources.map((s) => s.fileName.toLowerCase()));
  const parts = [];
  docs.forEach((doc) => {
    const header = doc.parts[0];
    const excerpt = doc.text ? excerptFor(doc.text, topic) : "";
    const inline = doc.parts.filter((p) => p.inline_data);
    const citesThis = cited.has(doc.fileName.toLowerCase());
    if (!excerpt && !(citesThis && inline.length)) return;
    parts.push(header);
    if (citesThis) inline.forEach((p) => parts.push(p));
    if (excerpt) parts.push({ text: `Excerpts from "${doc.fileName}" relevant to this topic:\n${excerpt}` });
  });
  // Nothing matched (a topic named differently from the text): fall back to
  // the files the topic cites, then to everything.
  if (parts.length) return parts;
  const citedDocs = docs.filter((d) => cited.has(d.fileName.toLowerCase()));
  return (citedDocs.length ? citedDocs : docs).flatMap((d) => d.parts);
}

function buildPrompt({ topic, topics, count, split, difficulty, bloom, ayushSystem, audience, avoid }) {
  return [
    AYUSH_CONTEXT,
    SOURCE_RULES,
    `AYUSH system for this paper: ${ayushSystemLabel(ayushSystem)}.`,
    audience ? `Candidates are: ${audience}.` : "",
    `The whole paper covers these topics: ${topics.map((t) => t.title).join("; ")}.`,
    `Write exactly ${count} NEW multiple-choice question(s) on this topic only: "${topic.title}"${topic.subtopics.length ? ` (subtopics: ${topic.subtopics.join("; ")})` : ""}. Use topicId "${topic.id}".`,
    "Write them from the attached excerpts and files, not from general knowledge alone. Each question tests one clear point from the sources.",
    `Difficulty: exactly ${difficulty.easy} easy, ${difficulty.moderate} moderate and ${difficulty.hard} hard.`,
    `Bloom's level: exactly ${bloom.remember} remember, ${bloom.understand} understand, ${bloom.apply} apply and ${bloom.analyse} analyse. "apply" and "analyse" questions use a short clinical, pharmaceutical or practical scenario.`,
    `Exactly ${split.singleCount} question(s) must have type "single" (exactly one option with isCorrect true) and ${split.multipleCount} must have type "multiple" (two or more correct options, at least one false).`,
    "Each question has 4 options (5 allowed for multiple-answer), plausible wrong options, varied correct positions, no A/B/C/D lettering in option text, question under 240 characters, options under 100.",
    "explanation: one or two sentences on why the answer is right, grounded in the source.",
    "source: fileName exactly as in the source header, locator (page, slide, sheet/row or heading), and quote — at most 25 words copied verbatim from the place the question is based on.",
    avoid.length ? `Do not repeat or reword any of these existing questions: ${avoid.slice(0, 40).map((q) => `"${q.text}"`).join("; ")}.` : "",
    "Return only JSON matching the schema.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const auth = await requireHost(req, res);
  if (!auth) return undefined;

  const body = req.body || {};
  const topic = cleanTopic(body.topic);
  if (!topic.title) return res.status(400).json({ success: false, error: "Choose a topic to write questions for." });
  const topics = (Array.isArray(body.topics) ? body.topics : [topic]).slice(0, AI.MAX_TOPICS).map(cleanTopic).filter((t) => t.title);
  const count = Math.round(Number(body.count));
  if (!Number.isInteger(count) || count < 1 || count > AI.MAX_QUESTIONS) return res.status(400).json({ success: false, error: `Ask for between 1 and ${AI.MAX_QUESTIONS} questions per topic.` });
  const ayushSystem = body.ayushSystem;
  if (!isAyushSystem(ayushSystem)) return res.status(400).json({ success: false, error: "Choose the AYUSH System this paper is for." });
  const sources = Array.isArray(body.sources) ? body.sources : [];
  if (!sources.length) return res.status(400).json({ success: false, error: "Upload the files to write questions from." });

  const mix = ["single", "multiple", "mixed"].includes(body.mix) ? body.mix : "mixed";
  const audience = String(body.audience || "").slice(0, 200);
  const difficultyMix = cleanMix(body.difficultyMix, DEFAULT_DIFFICULTY_MIX);
  const bloomMix = cleanMix(body.bloomMix, DEFAULT_BLOOM_MIX);
  const avoid = cleanAvoidList(body.avoid);

  if (!(await chargeAiRun(auth, res, "host_questions"))) return undefined;
  const { docs, skipped } = await loadSources(auth, sources);
  if (!docs.length) {
    await refundAiRun(auth, "host_questions");
    return res.status(400).json({ success: false, code: "NO_READABLE_SOURCES", error: "None of the files could be read.", skipped: skippedNotes(skipped) });
  }
  const parts = partsForTopic(docs, topic);
  const fileNames = docs.map((d) => d.fileName);

  let collected = [];
  let invalid = 0;
  let duplicates = 0;
  let model = GEMINI_MODEL;
  // One call, then (only if some came back unusable) one more for the shortfall.
  for (let attempt = 0; attempt <= 1 && collected.length < count; attempt += 1) {
    const want = count - collected.length;
    const params = {
      topic,
      topics,
      count: want,
      split: singleMultipleSplit(want, mix, mix === "mixed" ? Math.round(want * (Number(body.singleRatio) >= 0 && Number(body.singleRatio) <= 1 ? Number(body.singleRatio) : AI.MIXED_SINGLE_RATIO)) : undefined),
      difficulty: mixCounts(want, difficultyMix),
      bloom: mixCounts(want, bloomMix),
      ayushSystem,
      audience,
      avoid: [...avoid, ...collected.map((q) => ({ text: q.text }))],
    };
    try {
      const meta = {};
      const raw = await generateJson({ prompt: buildPrompt(params), schema: SCHEMA, parts, temperature: attempt === 0 ? 0.6 : 0.85, meta });
      model = meta.model || model;
      const shaped = shapeCitedQuestions(raw?.questions, { ayushSystem, topic: topic.title, fileNames });
      invalid += shaped.invalid;
      const unique = dedupeQuestions(shaped.kept, [...avoid, ...collected]);
      duplicates += unique.duplicates;
      collected = [...collected, ...unique.kept].slice(0, count);
    } catch (error) {
      if (!collected.length) return await sendAiFailure(res, auth, error, "Questions could not be written for this topic. Please try again.");
      if (!(error instanceof GeminiError)) console.warn("[ai] Shortfall regeneration failed:", error?.message || error);
      break;
    }
  }

  if (!collected.length) {
    return res.status(422).json({ success: false, code: "AI_INVALID", error: `No usable questions came back for "${topic.title}". Try again, or give this topic fewer questions.`, invalid, duplicates });
  }
  // The topic id travels with each question for the modal's per-topic tally.
  const questions = collected.map((q) => ({ ...q, topicId: topic.id, difficulty: DIFFICULTY_LEVELS.includes(q.difficulty) ? q.difficulty : "", bloom: BLOOM_LEVELS.includes(q.bloom) ? q.bloom : "" }));
  return res.status(200).json({
    success: true,
    questions,
    summary: { topicId: topic.id, requested: count, generated: questions.length, invalid, duplicates },
    skipped: skippedNotes(skipped),
    model,
    aiRunsLeft: auth.aiRunsLeft ?? null,
  });
}

export const config = { api: { responseLimit: false } };
