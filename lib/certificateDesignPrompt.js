import { BORDER_STYLES, LAYOUTS, NAME_STYLES, ORNAMENTS, PATTERNS, TITLE_FONTS } from "./certificateDesign";

/**
 * What the AI routes tell the model a certificate design is: the strict
 * JSON schema of a spec, and the plain-English vocabulary that goes with
 * it. Shared by "Generate design" and "Recreate from an upload" so both
 * describe the same choices in the same words.
 */

export const DESIGN_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    palette: {
      type: "OBJECT",
      properties: { primary: { type: "STRING" }, accent: { type: "STRING" }, ink: { type: "STRING" }, paper: { type: "STRING" } },
      required: ["primary", "accent", "ink", "paper"],
    },
    border: { type: "STRING", enum: BORDER_STYLES },
    pattern: { type: "STRING", enum: PATTERNS },
    titleFont: { type: "STRING", enum: TITLE_FONTS },
    layout: { type: "STRING", enum: LAYOUTS },
    ornament: { type: "STRING", enum: ORNAMENTS },
    nameStyle: { type: "STRING", enum: NAME_STYLES },
    seal: { type: "BOOLEAN" },
    tagline: { type: "STRING" },
  },
  required: ["name", "palette", "border", "pattern", "titleFont", "layout", "ornament", "nameStyle", "seal", "tagline"],
};

export const DESIGN_VOCABULARY = [
  "Design vocabulary (every value must be one of these):",
  `- border (the frame): ${BORDER_STYLES.join(", ")}. "double"/"single"/"ornate" are rules around the page; "corners" is four corner brackets only; "band" is a solid header band in the primary colour with the institution in white on it; "sidebar" is a wide solid panel down the left holding the logo; "none" is no frame.`,
  `- pattern (faint background texture in the primary colour): ${PATTERNS.join(", ")}.`,
  `- titleFont: ${TITLE_FONTS.join(", ")}. layout: ${LAYOUTS.join(", ")}. ornament (a small mark between the header and the title): ${ORNAMENTS.join(", ")}.`,
  `- nameStyle (how the student's name is set): ${NAME_STYLES.join(", ")}. seal: whether a round accent-coloured seal with the score is printed in the footer.`,
  "- palette: four hex colours — primary for headings and the frame, accent for ornaments and the seal, ink for body text, paper for the background. paper must be very light, ink very dark, primary must contrast with paper.",
].join("\n");

/** One line per design, for "these were already shown". */
export function describeDesign(d) {
  return `${d.name} (${d.border} frame, ${d.pattern} pattern, ${d.layout}, ${d.ornament} ornament, ${d.nameStyle} name, ${d.seal ? "seal" : "no seal"}, ${d.titleFont}, primary ${d.palette.primary})`;
}
