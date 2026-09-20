import { requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { ayushSystemLabel, isAyushSystem } from "../../../lib/ayush";
import { newId, normaliseQuestion, validateQuestion } from "../../../lib/questions";

/**
 * "Recheck with AI" — one question, verified.
 *
 * The model sees the question exactly as written, including which options
 * are marked correct and the explanation, and answers with either
 * `verdict: "ok"` or `verdict: "revise"` plus a full corrected version. The
 * corrected version is returned to the editor as a proposal; nothing here
 * changes the paper. Accepting or keeping the original is the professor's
 * click, recorded by convex/skillTests.recordRecheck.
 */

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["ok", "revise"] },
    reason: { type: "STRING" },
    proposed: {
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
  required: ["verdict", "reason", "proposed"],
};

function buildPrompt(question, ayushSystem) {
  const options = question.options.map((o, i) => `${i + 1}. ${o.text}${o.isCorrect ? "  [marked CORRECT]" : ""}`).join("\n");
  return [
    AYUSH_CONTEXT,
    ayushSystem ? `AYUSH system: ${ayushSystemLabel(ayushSystem)}.` : "",
    "Double-check the following multiple-choice question for factual accuracy, unambiguous wording, exactly the right options marked correct, and an accurate explanation.",
    `Question type: ${question.type} (${question.type === "single" ? "exactly one correct option" : "one or more correct options"}).`,
    `Question: ${question.text}`,
    "Options:",
    options,
    `Explanation: ${question.explanation || "(none)"}`,
    "",
    'If everything is correct, set verdict to "ok" and return the question unchanged in "proposed".',
    'If anything is wrong or unclear, set verdict to "revise", explain briefly in "reason", and return the fully corrected question in "proposed" — keep the same number of options unless one must be replaced, keep the same type unless the correct-answer count requires changing it, and always include a clear explanation.',
    "Return only JSON matching the schema.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);

  const host = await requireHost(req, res);
  if (!host) return undefined;

  const question = normaliseQuestion(req.body?.question || {});
  const errors = validateQuestion(question);
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, error: `Finish the question before rechecking it: ${Object.values(errors)[0]}` });
  }
  const ayushSystem = isAyushSystem(req.body?.ayushSystem) ? req.body.ayushSystem : question.ayushSystem;

  try {
    const raw = await generateJson({ prompt: buildPrompt(question, ayushSystem), schema: RESPONSE_SCHEMA, temperature: 0.2 });
    const proposed = normaliseQuestion(
      {
        ...question,
        text: raw?.proposed?.text,
        type: raw?.proposed?.type,
        options: (raw?.proposed?.options || []).map((o, i) => ({
          // Keep the original option ids where the text survived, so the diff
          // and any saved answers line up.
          id: question.options.find((orig) => orig.text === String(o?.text || "").trim())?.id || newId("o"),
          text: o?.text,
          isCorrect: Boolean(o?.isCorrect),
        })),
        explanation: raw?.proposed?.explanation,
      },
      { ayushSystem }
    );
    const proposedErrors = validateQuestion(proposed);
    if (Object.keys(proposedErrors).length) {
      return res.status(502).json({ success: false, error: "The AI's suggestion was not a valid question. Please try again." });
    }
    const unchanged =
      proposed.text === question.text &&
      proposed.type === question.type &&
      proposed.explanation === question.explanation &&
      proposed.options.length === question.options.length &&
      proposed.options.every((o, i) => o.text === question.options[i].text && o.isCorrect === question.options[i].isCorrect);
    const verdict = raw?.verdict === "revise" && !unchanged ? "revise" : "ok";
    return res.status(200).json({ success: true, verdict, reason: String(raw?.reason || ""), proposed: verdict === "revise" ? proposed : null, model: GEMINI_MODEL });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : 502;
    return res.status(status).json({ success: false, code: error.code, error: error.message || "Could not recheck this question. Please try again." });
  }
}
