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

/**
 * Sends one prompt and returns parsed JSON. Throws GeminiError with a
 * message safe to show to the professor.
 */
export async function generateJson({ prompt, schema, temperature = 0.6 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError(AI_NOT_CONFIGURED.body.error, { status: 503, code: "AI_NOT_CONFIGURED" });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, responseMimeType: "application/json", ...(schema ? { responseSchema: schema } : {}) },
  };

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

  if (!upstream.ok) {
    console.error("[ai] Gemini error:", data?.error?.message || `HTTP ${upstream.status}`);
    if (upstream.status === 429) throw new GeminiError("The AI quota is exhausted for now — try again in a minute.", { code: "AI_QUOTA" });
    if (upstream.status === 400 || upstream.status === 403) throw new GeminiError("The AI key on this deployment was rejected. Ask the administrator to check GEMINI_API_KEY.", { code: "AI_KEY" });
    if (upstream.status === 503 || upstream.status === 429) throw new GeminiError("The AI service is busy right now. Please try again in a moment.", { code: "AI_BUSY" });
    throw new GeminiError("The AI service could not respond. Please try again.");
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  const parsed = parseJson(text);
  if (parsed == null) throw new GeminiError("The AI returned an unreadable response. Please try again.", { code: "AI_MALFORMED" });
  return parsed;
}
