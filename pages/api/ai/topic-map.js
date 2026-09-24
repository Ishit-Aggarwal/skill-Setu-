import { chargeAiRun, refundAiRun, requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, aiConfigured, generateJson } from "../../../lib/gemini";
import { AI } from "../../../lib/settings";
import { AYUSH_SYSTEM_SLUGS, isAyushSystem } from "../../../lib/ayush";
import { allParts, loadSources, skippedNotes } from "../../../lib/docSources";
import { SOURCE_RULES, validateTopicMap } from "../../../lib/topicMap";
import { sendAiFailure } from "../../../lib/aiPaper";

/**
 * "Generate from my documents", step 1: the topic map.
 *
 * The host's files (a syllabus PDF, a unit's notes in Word, lecture slides,
 * a topic list in a spreadsheet, a photo of handwritten topics) are read
 * together and the model lists the topics they cover — each with subtopics,
 * how much of the material it takes up, and where in the files it came from.
 * A topic that cannot point to a source is dropped: it may be invented. The
 * host edits the map before a single question is written.
 */

const SCHEMA = {
  type: "OBJECT",
  properties: {
    topics: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          title: { type: "STRING" },
          subtopics: { type: "ARRAY", items: { type: "STRING" } },
          weight: { type: "INTEGER" },
          sources: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { fileName: { type: "STRING" }, locator: { type: "STRING" }, quote: { type: "STRING" } },
              required: ["fileName", "locator", "quote"],
            },
          },
        },
        required: ["id", "title", "subtopics", "weight", "sources"],
      },
    },
    ayushSystemGuess: { type: "STRING" },
    levelGuess: { type: "STRING" },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["topics", "ayushSystemGuess", "levelGuess", "warnings"],
};

function buildPrompt(fileNames) {
  return [
    AYUSH_CONTEXT,
    SOURCE_RULES,
    `You have been given ${fileNames.length} source file(s): ${fileNames.map((n) => `"${n}"`).join(", ")}. A professor wants to set multiple-choice questions from them.`,
    `List the teachable topics the sources cover, at most ${AI.MAX_TOPICS}, in the order they appear.`,
    "For each topic give:",
    "- id: a short stable id such as t1, t2 …",
    "- title: the topic as the syllabus would name it (e.g. \"Rasa Panchaka\", \"Mizaj (temperament) in Unani\")",
    "- subtopics: the points under it that a question could test",
    "- weight: 1–5, how much of the material covers it (5 = a large share)",
    "- sources: one to three places it appears, each with fileName (exactly as in the source header), locator (\"p. 12\", \"Slide 7\", \"Sheet 'Unit 3' row 14\", \"Heading 'Rasa Panchaka'\") and quote (at most 25 words copied verbatim from that place)",
    `ayushSystemGuess: the AYUSH system the material belongs to, one of ${AYUSH_SYSTEM_SLUGS.join(", ")}, or "" if unclear.`,
    'levelGuess: the course level it suits, such as "UG 1st Prof", "UG 2nd Prof", "UG 3rd Prof", "PG", "Certificate course".',
    "warnings: anything the professor should know (pages that could not be read, material outside AYUSH, a list that is too thin to test).",
    "Return only JSON matching the schema.",
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const auth = await requireHost(req, res);
  if (!auth) return undefined;
  const sources = Array.isArray(req.body?.sources) ? req.body.sources : [];
  if (!sources.length) return res.status(400).json({ success: false, error: "Upload at least one file to read." });
  if (sources.length > AI.MAX_SOURCE_FILES) return res.status(400).json({ success: false, error: `Upload at most ${AI.MAX_SOURCE_FILES} files.` });
  if (!(await chargeAiRun(auth, res, "host_questions"))) return undefined;

  const { docs, skipped, truncated } = await loadSources(auth, sources);
  if (!docs.length) {
    await refundAiRun(auth, "host_questions");
    return res.status(400).json({ success: false, code: "NO_READABLE_SOURCES", error: "None of the files could be read.", skipped: skippedNotes(skipped) });
  }

  const fileNames = docs.map((d) => d.fileName);
  try {
    const meta = {};
    const raw = await generateJson({ prompt: buildPrompt(fileNames), schema: SCHEMA, parts: allParts(docs), temperature: 0.3, meta });
    const map = validateTopicMap(raw, { fileNames, isAyushSystem });
    if (!map.topics.length) {
      return res.status(422).json({
        success: false,
        code: "NO_TOPICS",
        error: "No topics with a clear source were found in these files. Check they contain teaching material and try again.",
        warnings: map.warnings,
        skipped: skippedNotes(skipped),
      });
    }
    return res.status(200).json({
      success: true,
      ...map,
      files: docs.map((d) => ({ fileName: d.fileName, kind: d.kind })),
      skipped: skippedNotes(skipped),
      truncated: truncated.map((t) => t.reason),
      model: meta.model || GEMINI_MODEL,
      aiRunsLeft: auth.aiRunsLeft ?? null,
    });
  } catch (error) {
    return await sendAiFailure(res, auth, error, "The files could not be read into a topic map. Please try again.");
  }
}

export const config = { api: { responseLimit: false } };
