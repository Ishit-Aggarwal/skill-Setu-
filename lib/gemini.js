/**
 * The one Gemini call, server-side only.
 *
 * Every AI feature (paper generation, per-question recheck, certificate
 * design) goes through `generateJson`, which asks for strict JSON against a
 * schema, parses defensively, and turns upstream failures into the short,
 * plain messages the professor actually sees. The key never leaves the
 * server: this module must only be imported from pages/api.
 */

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/**
 * Where a call goes when the primary model is overloaded. Google returns 503
 * "high demand" on the flagship flash model for minutes at a time; the lite
 * model is rarely busy at the same moment and is plenty for a question paper.
 */
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest";

/** Back-off between attempts on a busy (503/429) response, per model. */
const BUSY_RETRY_DELAYS_MS = [1200, 3000];

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export const AI_NOT_CONFIGURED = {
  status: 503,
  body: {
    success: false,
    code: "AI_NOT_CONFIGURED",
    error: "AI is not set up on this deployment yet. Write the questions by hand, or ask the administrator to add a GEMINI_API_KEY.",
  },
};

/** The AYUSH framing every prompt starts with. */
export const AYUSH_CONTEXT =
  "You are working inside Skill Setu, the Ministry of AYUSH academia–industry platform. Everything you write is for students and professionals of the five AYUSH systems — Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homoeopathy — and must be factually correct for that system, its classical texts, its regulation (NCISM, NCH, Schedule T GMP, Ayurvedic Pharmacopoeia of India, CTRI, National AYUSH Mission) and its clinical, pharmaceutical, research or wellness practice. Never use generic industry framing.";

export class GeminiError extends Error {
  constructor(message, { status = 502, code = "AI_ERROR" } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!fenced) return null;
    try {
      return JSON.parse(fenced[0]);
    } catch {
      return null;
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One request to one model. Returns { ok, status, data }. */
async function callModel(model, apiKey, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let upstream;
  try {
    upstream = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (error) {
    console.error("[ai] Could not reach Gemini:", error);
    throw new GeminiError("Could not reach the AI service. Please try again.");
  }
  let data = {};
  try {
    data = await upstream.json();
  } catch {
    data = {};
  }
  return { ok: upstream.ok, status: upstream.status, data };
}

/**
 * Sends one prompt and returns parsed JSON. Throws GeminiError with a
 * message safe to show to the professor.
 *
 * A busy answer (503 "high demand", or a 429) is retried with a short
 * back-off and then handed to the fallback model before anyone is told to
 * try again — one overloaded minute at Google used to surface as "Something
 * went wrong" on every generation.
 *
 * `attachments` may carry files for the model to read: [{ mimeType, data }]
 * with base64 data (a PDF question paper, say).
 */
export async function generateJson({ prompt, schema, temperature = 0.6, attachments = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError(AI_NOT_CONFIGURED.body.error, { status: 503, code: "AI_NOT_CONFIGURED" });

  const parts = [
    ...attachments.filter((a) => a?.data && a?.mimeType).map((a) => ({ inlineData: { mimeType: a.mimeType, data: a.data } })),
    { text: prompt },
  ];
  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature, responseMimeType: "application/json", ...(schema ? { responseSchema: schema } : {}) },
  };

  const models = [GEMINI_MODEL, ...(GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL ? [GEMINI_FALLBACK_MODEL] : [])];
  let last = null;
  for (const model of models) {
    for (let attempt = 0; attempt <= BUSY_RETRY_DELAYS_MS.length; attempt += 1) {
      const res = await callModel(model, apiKey, payload);
      if (res.ok) {
        const text = res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        const parsed = parseJson(text);
        if (parsed == null) throw new GeminiError("The AI returned an unreadable response. Please try again.", { code: "AI_MALFORMED" });
        return parsed;
      }
      last = res;
      console.error(`[ai] Gemini error (${model}, attempt ${attempt + 1}):`, res.data?.error?.message || `HTTP ${res.status}`);
      const busy = res.status === 503 || res.status === 429;
      if (res.status === 400 || res.status === 403) {
        throw new GeminiError("The AI key on this deployment was rejected. Ask the administrator to check GEMINI_API_KEY.", { code: "AI_KEY" });
      }
      // A model that does not exist on this key is skipped, not retried.
      if (res.status === 404) break;
      if (!busy) break;
      if (attempt < BUSY_RETRY_DELAYS_MS.length) await sleep(BUSY_RETRY_DELAYS_MS[attempt]);
    }
  }
  if (last?.status === 429) throw new GeminiError("The AI quota is exhausted for now — try again in a minute.", { code: "AI_QUOTA" });
  if (last?.status === 503) throw new GeminiError("The AI service is busy right now. Please try again in a moment.", { code: "AI_BUSY" });
  throw new GeminiError("The AI service could not respond. Please try again.");
}
