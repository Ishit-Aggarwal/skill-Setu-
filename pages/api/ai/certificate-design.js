import { requireHost } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { DESIGN_PRESETS, differsEnough, makeDifferent, normaliseDesign } from "../../../lib/certificateDesign";
import { DESIGN_SCHEMA, DESIGN_VOCABULARY, describeDesign } from "../../../lib/certificateDesignPrompt";

/**
 * "Generate" / "Regenerate" on the Certificate Settings page.
 *
 * The model proposes a design spec — palette, frame, background pattern,
 * typography, layout, ornament, name treatment, seal, tagline — from the
 * host's institution, names and certificate title. The spec is validated
 * against lib/certificateDesign.js before it is returned, so the preview and
 * the PDF can always draw it.
 *
 * A regeneration must look different, not merely recoloured: the prompt is
 * given every design already shown and told to change the structure, and
 * `makeDifferent` enforces it afterwards (at least three structural choices
 * or a clearly different hue plus one). Without an AI key the route still
 * answers, with a preset the professor has not seen yet.
 */

function buildPrompt({ institutionName, professorName, professorTitle, title, seen, brief }) {
  return [
    AYUSH_CONTEXT,
    `Design a printable A4 landscape certificate for "${institutionName}", signed by ${professorName} (${professorTitle}). The certificate title is "${title}".`,
    brief ? `The professor's brief: ${brief}` : "",
    "Propose one tasteful, professional design as JSON. Give it a short evocative name and a tagline of at most 8 words that precedes the course name (e.g. \"in recognition of demonstrated competence\").",
    DESIGN_VOCABULARY,
    seen.length
      ? `These designs have already been shown and rejected: ${seen.join("; ")}. The new design must look clearly different from every one of them — change at least three of frame, pattern, layout, ornament, name style, seal and title font, and move the primary colour to a different hue, not a different shade.`
      : "",
    "Return only JSON matching the schema.",
  ]
    .filter(Boolean)
    .join("\n");
}

function unseenPreset(seen) {
  return DESIGN_PRESETS.find((p) => differsEnough(p, seen)) || DESIGN_PRESETS[seen.length % DESIGN_PRESETS.length];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  const host = await requireHost(req, res);
  if (!host) return undefined;

  const body = req.body || {};
  const seenDesigns = (Array.isArray(body.seen) ? body.seen : []).slice(-8).map((d) => normaliseDesign(d));
  const inputs = {
    institutionName: String(body.institutionName || "the institution").slice(0, 120),
    professorName: String(body.professorName || "").slice(0, 80),
    professorTitle: String(body.professorTitle || "").slice(0, 80),
    title: String(body.title || "Certificate of Achievement").slice(0, 80),
    brief: String(body.brief || "").slice(0, 300),
    seen: seenDesigns.map(describeDesign),
  };

  if (!aiConfigured()) {
    const preset = makeDifferent(unseenPreset(seenDesigns), seenDesigns);
    return res.status(200).json({ success: true, design: normaliseDesign({ ...preset, id: `preset_${Date.now().toString(36)}` }), source: "preset", note: AI_NOT_CONFIGURED.body.error });
  }

  try {
    const raw = await generateJson({ prompt: buildPrompt(inputs), schema: DESIGN_SCHEMA, temperature: 1.0 });
    const base = unseenPreset(seenDesigns);
    let design = normaliseDesign({ ...raw, id: `ai_${Date.now().toString(36)}` }, base);
    const nudged = !differsEnough(design, seenDesigns);
    if (nudged) design = { ...makeDifferent(design, seenDesigns), id: design.id, name: design.name };
    return res.status(200).json({ success: true, design, source: "ai", nudged });
  } catch (error) {
    // A busy or unreadable model must not block the professor: hand them a
    // preset they have not seen yet and say why.
    if (["AI_BUSY", "AI_ERROR", "AI_MALFORMED"].includes(error?.code)) {
      const preset = makeDifferent(unseenPreset(seenDesigns), seenDesigns);
      return res.status(200).json({ success: true, design: normaliseDesign({ ...preset, id: `preset_${Date.now().toString(36)}` }), source: "preset", note: `${error.message} Showing a built-in design instead.` });
    }
    const status = error instanceof GeminiError ? error.status : 502;
    return res.status(status).json({ success: false, code: error.code, error: error.message || "Could not generate a design. Please try again." });
  }
}
