import { getConvexClient } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { readSessionToken, unauthorized } from "../../../lib/apiAuth";

/**
 * AI-drafted question papers for skill tests.
 *
 * A host (industry recruiter, faculty member or institution) describes what
 * the test should cover — "Panchakarma pre-procedure assessment, BAMS final
 * year, moderate" — and gets back a draft paper in exactly the shape the
 * QuestionBuilder edits, so every question is reviewed and can be corrected
 * before it is published. The model never publishes anything on its own.
 *
 * The key lives only here, on the server. Set GEMINI_API_KEY in .env.local
 * (and in the hosting provider's environment); without it this route returns
 * 503 and the form falls back to hand-written questions. GEMINI_MODEL can
 * override the free-tier default.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const MAX_QUESTIONS = 20;
const MAX_TOPIC_LENGTH = 400;
const HOST_ROLES = new Set(["industry", "academician", "institution", "admin"]);

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" } },
          correctOption: { type: "INTEGER" },
          marks: { type: "INTEGER" },
        },
        required: ["question", "options", "correctOption", "marks"],
      },
    },
  },
  required: ["questions"],
};

function buildPrompt({ topic, count, difficulty, domain, audience }) {
  return [
    "You are setting a multiple-choice skill test for the Skill Setu portal, the Ministry of AYUSH academia–industry platform for Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homoeopathy students and professionals.",
    `Write exactly ${count} multiple-choice questions on: ${topic}.`,
    domain ? `The test is scored under the skill domain "${domain}".` : "",
    audience ? `Candidates are: ${audience}.` : "",
    `Difficulty: ${difficulty}.`,
    "Rules:",
    "- Every question must be factually correct and specific to the AYUSH sector, its regulation (NCISM, NCH, Schedule T GMP, Ayurvedic Pharmacopoeia of India, CTRI, National AYUSH Mission) and its clinical, pharmaceutical, research or wellness practice, unless the topic is explicitly a general aptitude one.",
    "- Each question has exactly 4 options, one of which is unambiguously correct; the others must be plausible but wrong.",
    "- Vary which option index is correct.",
    "- Keep each question under 220 characters and each option under 90 characters. No lettering (A/B/C/D) inside the option text.",
    "- marks is 1 for straightforward recall, 2 for applied or scenario questions.",
    "Return only JSON matching the schema.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Coerces whatever the model returned into rows the QuestionBuilder accepts. */
function normalise(raw, count) {
  const rows = Array.isArray(raw?.questions) ? raw.questions : [];
  return rows
    .map((q) => {
      const options = (Array.isArray(q.options) ? q.options : []).map((o) => String(o ?? "").trim()).filter(Boolean).slice(0, 6);
      const correct = Number.isInteger(q.correctOption) ? q.correctOption : 0;
      return {
        question: String(q.question ?? "").trim(),
        options,
        correctOption: correct >= 0 && correct < options.length ? correct : 0,
        marks: Math.min(10, Math.max(1, Math.round(Number(q.marks) || 1))),
      };
    })
    .filter((q) => q.question && q.options.length >= 2)
    .slice(0, count);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      code: "AI_NOT_CONFIGURED",
      error: "AI drafting is not set up on this deployment yet. Write the questions by hand, or ask the administrator to add a GEMINI_API_KEY.",
    });
  }

  // Only a signed-in host may spend the key: the same roles that may publish a test.
  const sessionToken = readSessionToken(req);
  if (!sessionToken) return unauthorized(res);
  const convex = getConvexClient();
  if (!convex) return res.status(503).json({ success: false, error: "Account database unavailable." });
  let actor;
  try {
    actor = await convex.query(api.auth.me, { sessionToken });
  } catch {
    actor = null;
  }
  if (!actor) return unauthorized(res);
  if (!HOST_ROLES.has(actor.role)) {
    return res.status(403).json({ success: false, error: "Only test hosts can draft a question paper." });
  }

  const body = req.body || {};
  const topic = String(body.topic || "").trim().slice(0, MAX_TOPIC_LENGTH);
  const count = Math.min(MAX_QUESTIONS, Math.max(1, Math.round(Number(body.count) || 5)));
  const difficulty = ["easy", "moderate", "hard"].includes(body.difficulty) ? body.difficulty : "moderate";
  const domain = String(body.domain || "").slice(0, 120);
  const audience = String(body.audience || "").slice(0, 200);
  if (!topic) return res.status(400).json({ success: false, error: "Describe what the test should cover." });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: buildPrompt({ topic, count, difficulty, domain, audience }) }] }],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let upstream;
  try {
    upstream = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (error) {
    console.error("[ai] Could not reach Gemini:", error);
    return res.status(502).json({ success: false, error: "Could not reach the AI service. Please try again." });
  }

  let data = {};
  try {
    data = await upstream.json();
  } catch {
    data = {};
  }

  if (!upstream.ok) {
    const message = data?.error?.message || `Gemini returned HTTP ${upstream.status}`;
    console.error("[ai] Gemini error:", message);
    const friendly =
      upstream.status === 429
        ? "The free AI quota is exhausted for now — try again in a minute, or write the questions by hand."
        : upstream.status === 400 || upstream.status === 403
        ? "The AI key on this deployment was rejected. Ask the administrator to check GEMINI_API_KEY."
        : "The AI service could not draft the paper. Please try again.";
    return res.status(502).json({ success: false, error: friendly });
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Some responses arrive fenced despite the JSON mime type.
    const fenced = text.match(/\{[\s\S]*\}/);
    try {
      parsed = fenced ? JSON.parse(fenced[0]) : null;
    } catch {
      parsed = null;
    }
  }

  const questions = normalise(parsed, count);
  if (!questions.length) {
    return res.status(502).json({ success: false, error: "The AI returned an unusable paper. Try rephrasing the topic." });
  }

  return res.status(200).json({ success: true, questions, model: MODEL });
}
