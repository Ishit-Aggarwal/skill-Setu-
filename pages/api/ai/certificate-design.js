import { requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { BORDER_STYLES, DESIGN_PRESETS, LAYOUTS, ORNAMENTS, TITLE_FONTS, normaliseDesign } from "../../../lib/certificateDesign";

/**
 * "Generate" on the Certificate Settings page.
 *
 * The model proposes a design spec — palette, border, typography, layout,
 * tagline — from the host's institution, names and certificate title. The
 * spec is validated against lib/certificateDesign.js before it is returned,
 * so the preview and the PDF can always draw it. Without an AI key the route
 * still answers, with a preset the professor has not seen yet.
 */

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    palette: {
      type: "OBJECT",
      properties: { primary: { type: "STRING" }, accent: { type: "STRING" }, ink: { type: "STRING" }, paper: { type: "STRING" } },
      required: ["primary", "accent", "ink", "paper"],
    },
    border: { type: "STRING", enum: BORDER_STYLES },
    titleFont: { type: "STRING", enum: TITLE_FONTS },
    layout: { type: "STRING", enum: LAYOUTS },
    ornament: { type: "STRING", enum: ORNAMENTS },
    tagline: { type: "STRING" },
  },
  required: ["name", "palette", "border", "titleFont", "layout", "ornament", "tagline"],
};

function buildPrompt({ institutionName, professorName, professorTitle, title, seen }) {
  return [
    AYUSH_CONTEXT,
    `Design a printable A4 landscape certificate for "${institutionName}", signed by ${professorName} (${professorTitle}). The certificate title is "${title}".`,
    "Propose one tasteful, professional design as JSON: a palette of four hex colours (primary for headings and border, accent for ornaments, ink for body text, paper for background — paper must be very light, ink must be very dark, primary must contrast with paper), a border style, a title typeface family, a layout, an ornament, and a short tagline of at most 8 words that precedes the course name (e.g. \"in recognition of demonstrated competence\").",
    seen.length ? `Avoid repeating these earlier variations: ${seen.join("; ")}.` : "",
    "Return only JSON matching the schema.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  const host = await requireHost(req, res);
  if (!host) return undefined;

  const body = req.body || {};
  const seen = Array.isArray(body.seen) ? body.seen.map((d) => `${d?.name || ""} ${d?.palette?.primary || ""} ${d?.border || ""}`).slice(0, 6) : [];
  const inputs = {
    institutionName: String(body.institutionName || "the institution").slice(0, 120),
    professorName: String(body.professorName || "").slice(0, 80),
    professorTitle: String(body.professorTitle || "").slice(0, 80),
    title: String(body.title || "Certificate of Achievement").slice(0, 80),
    seen,
  };

  if (!aiConfigured()) {
    const unseen = DESIGN_PRESETS.find((p) => !seen.some((s) => s.includes(p.name))) || DESIGN_PRESETS[seen.length % DESIGN_PRESETS.length];
    return res.status(200).json({ success: true, design: normaliseDesign(unseen), source: "preset", note: AI_NOT_CONFIGURED.body.error });
  }

  try {
    const raw = await generateJson({ prompt: buildPrompt(inputs), schema: RESPONSE_SCHEMA, temperature: 0.9 });
    const base = DESIGN_PRESETS[seen.length % DESIGN_PRESETS.length];
    const design = normaliseDesign({ ...raw, id: `ai_${Date.now().toString(36)}` }, base);
    return res.status(200).json({ success: true, design, source: "ai" });
  } catch (error) {
    // A busy or unreadable model must not block the professor: hand them a
    // preset they have not seen yet and say why.
    if (["AI_BUSY", "AI_ERROR", "AI_MALFORMED"].includes(error?.code)) {
      const unseen = DESIGN_PRESETS.find((p) => !seen.some((s) => s.includes(p.name))) || DESIGN_PRESETS[seen.length % DESIGN_PRESETS.length];
      return res.status(200).json({ success: true, design: normaliseDesign(unseen), source: "preset", note: `${error.message} Showing a built-in design instead.` });
    }
    const status = error instanceof GeminiError ? error.status : 502;
    return res.status(status).json({ success: false, code: error.code, error: error.message || "Could not generate a design. Please try again." });
  }
}
