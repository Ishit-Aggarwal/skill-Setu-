/**
 * A certificate design is a small JSON spec — colours, frame, background
 * pattern, type, layout, ornaments, name treatment, seal — that both the
 * on-screen preview and the PDF renderer draw from. The AI proposes specs;
 * the presets below are what it starts from and what the app falls back to
 * when AI is unavailable. Keeping the spec this small is what makes "reuse
 * this exact template for every student" deterministic.
 *
 * The vocabulary is deliberately wide: with three frames and two layouts
 * every "Regenerate" looked like the last one with a new colour. Frames,
 * patterns, ornaments, name styles and the seal multiply out to hundreds of
 * visibly different certificates, and `differsEnough` (used by the AI route)
 * makes sure a regeneration is never a near-copy of one already shown.
 */

export const BORDER_STYLES = ["double", "single", "ornate", "corners", "band", "sidebar", "none"];
export const PATTERNS = ["none", "dots", "stripes", "grid", "rings", "chevron"];
export const TITLE_FONTS = ["serif", "sans"];
export const LAYOUTS = ["centered", "left"];
export const ORNAMENTS = ["lotus", "line", "diamonds", "none"];
export const NAME_STYLES = ["underline", "boxed", "plain"];

/**
 * The logo as a watermark behind the text. `opacity` is how strong it
 * prints (0.04 is a ghost, 0.25 is unmistakable); `size` is its width as a
 * share of the page. Off by default on the older presets' saved designs
 * only when the professor turns it off — the default is on, faint.
 */
export const WATERMARK_DEFAULT = { enabled: true, opacity: 0.08, size: 0.5 };
export const WATERMARK_OPACITY = { min: 0.03, max: 0.3 };
export const WATERMARK_SIZES = [
  { id: 0.35, label: "Small" },
  { id: 0.5, label: "Medium" },
  { id: 0.7, label: "Large" },
];

export const DESIGN_PRESETS = [
  {
    id: "classic",
    name: "Classic green",
    palette: { primary: "#2F6B5A", accent: "#B7791F", ink: "#1F2A24", paper: "#FFFDF7" },
    border: "double",
    pattern: "none",
    titleFont: "serif",
    layout: "centered",
    ornament: "lotus",
    nameStyle: "underline",
    seal: true,
    tagline: "in recognition of demonstrated competence",
  },
  {
    id: "modern",
    name: "Modern indigo",
    palette: { primary: "#2B3A67", accent: "#C46A2B", ink: "#1E2230", paper: "#FFFFFF" },
    border: "band",
    pattern: "none",
    titleFont: "sans",
    layout: "left",
    ornament: "line",
    nameStyle: "plain",
    seal: false,
    tagline: "awarded for successfully completing",
  },
  {
    id: "heritage",
    name: "Heritage saffron",
    palette: { primary: "#8A4A1F", accent: "#3C7C6B", ink: "#2A1E14", paper: "#FFF9EE" },
    border: "ornate",
    pattern: "rings",
    titleFont: "serif",
    layout: "centered",
    ornament: "lotus",
    nameStyle: "boxed",
    seal: true,
    tagline: "is hereby certified to have completed",
  },
  {
    id: "sidebar",
    name: "Slate sidebar",
    palette: { primary: "#1F4E5F", accent: "#D4A017", ink: "#182026", paper: "#F7FAFB" },
    border: "sidebar",
    pattern: "none",
    titleFont: "sans",
    layout: "left",
    ornament: "none",
    nameStyle: "underline",
    seal: true,
    tagline: "has successfully completed the assessment",
  },
  {
    id: "minimal",
    name: "Minimal corners",
    palette: { primary: "#3A3A3A", accent: "#9C2F2F", ink: "#222222", paper: "#FFFFFF" },
    border: "corners",
    pattern: "dots",
    titleFont: "sans",
    layout: "centered",
    ornament: "diamonds",
    nameStyle: "plain",
    seal: false,
    tagline: "is recognised for proficiency in",
  },
  {
    id: "botanical",
    name: "Botanical stripes",
    palette: { primary: "#4A6B2A", accent: "#B85C38", ink: "#1E2415", paper: "#FBFCF4" },
    border: "single",
    pattern: "stripes",
    titleFont: "serif",
    layout: "centered",
    ornament: "line",
    nameStyle: "boxed",
    seal: true,
    tagline: "has demonstrated competence in",
  },
];

const HEX = /^#[0-9a-f]{6}$/i;

function colour(value, fallback) {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim().toUpperCase() : fallback;
}

/** Fills gaps and rejects anything the renderers cannot draw. */
export function normaliseDesign(design, base = DESIGN_PRESETS[0]) {
  const d = design || {};
  const p = d.palette || {};
  return {
    id: String(d.id || base.id),
    name: String(d.name || base.name).slice(0, 40),
    palette: {
      primary: colour(p.primary, base.palette.primary),
      accent: colour(p.accent, base.palette.accent),
      ink: colour(p.ink, base.palette.ink),
      paper: colour(p.paper, base.palette.paper),
    },
    border: BORDER_STYLES.includes(d.border) ? d.border : base.border,
    pattern: PATTERNS.includes(d.pattern) ? d.pattern : base.pattern || "none",
    titleFont: TITLE_FONTS.includes(d.titleFont) ? d.titleFont : base.titleFont,
    layout: LAYOUTS.includes(d.layout) ? d.layout : base.layout,
    ornament: ORNAMENTS.includes(d.ornament) ? d.ornament : base.ornament,
    nameStyle: NAME_STYLES.includes(d.nameStyle) ? d.nameStyle : base.nameStyle || "underline",
    // A design saved before the seal existed keeps its look: only a design
    // that says so, or a preset used from scratch, prints one.
    seal: typeof d.seal === "boolean" ? d.seal : design ? false : Boolean(base.seal),
    tagline: String(d.tagline || base.tagline).slice(0, 80),
    watermark: normaliseWatermark(d.watermark),
    // "Grade A+" after the score; on unless the host turned it off.
    showGrade: d.showGrade !== false,
  };
}

export function normaliseWatermark(w) {
  const src = w && typeof w === "object" ? w : {};
  const opacity = Number(src.opacity);
  const size = Number(src.size);
  return {
    enabled: src.enabled !== false,
    opacity: Number.isFinite(opacity) ? Math.min(WATERMARK_OPACITY.max, Math.max(WATERMARK_OPACITY.min, opacity)) : WATERMARK_DEFAULT.opacity,
    size: WATERMARK_SIZES.some((s) => s.id === size) ? size : WATERMARK_DEFAULT.size,
  };
}

/** The structural choices that make two designs look alike or not. */
export const STRUCTURE_KEYS = ["border", "pattern", "layout", "ornament", "nameStyle", "titleFont", "seal"];

/** How many structural choices differ between two designs. Pure. */
export function structuralDistance(a, b) {
  const x = normaliseDesign(a);
  const y = normaliseDesign(b);
  return STRUCTURE_KEYS.reduce((n, k) => n + (x[k] !== y[k] ? 1 : 0), 0);
}

/** Hue (0–360) of a hex colour, for "a different colour, not a different shade". */
export function hue(hex) {
  const h = HEX.test(hex || "") ? hex : "#000000";
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let out;
  if (max === r) out = ((g - b) / d) % 6;
  else if (max === g) out = (b - r) / d + 2;
  else out = (r - g) / d + 4;
  return (out * 60 + 360) % 360;
}

function hueDistance(a, b) {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
}

/**
 * True when `candidate` is visibly different from every design in `seen`:
 * at least MIN_STRUCTURAL structural choices differ, or the primary colour
 * has moved to a clearly different hue AND at least one structural choice
 * differs. A regeneration that fails this is nudged by `makeDifferent`.
 */
export const DIFFERENCE = { MIN_STRUCTURAL: 3, MIN_HUE_DEG: 40 };

export function differsEnough(candidate, seen, limits = DIFFERENCE) {
  return (seen || []).every((s) => {
    const structural = structuralDistance(candidate, s);
    if (structural >= limits.MIN_STRUCTURAL) return true;
    return structural >= 1 && hueDistance(normaliseDesign(candidate).palette.primary, normaliseDesign(s).palette.primary) >= limits.MIN_HUE_DEG;
  });
}

/**
 * Changes a design just enough to differ from everything seen: structural
 * choices are rotated one at a time, in an order that changes the look the
 * most first, until `differsEnough` holds. Deterministic, so the same
 * near-copy always becomes the same alternative.
 */
export function makeDifferent(candidate, seen, limits = DIFFERENCE) {
  let d = normaliseDesign(candidate);
  if (differsEnough(d, seen, limits)) return d;
  const options = { border: BORDER_STYLES, pattern: PATTERNS, layout: LAYOUTS, ornament: ORNAMENTS, nameStyle: NAME_STYLES, titleFont: TITLE_FONTS };
  const order = ["border", "pattern", "layout", "nameStyle", "ornament", "titleFont"];
  for (let round = 0; round < 3; round += 1) {
    for (const key of order) {
      const list = options[key];
      const used = new Set((seen || []).map((s) => normaliseDesign(s)[key]));
      const next = list.find((v) => v !== d[key] && !used.has(v)) || list[(list.indexOf(d[key]) + 1) % list.length];
      d = { ...d, [key]: next };
      if (differsEnough(d, seen, limits)) return d;
    }
    d = { ...d, seal: !d.seal };
    if (differsEnough(d, seen, limits)) return d;
  }
  return d;
}

/** Sample data used by previews before any student has earned anything. */
export const SAMPLE_CERTIFICATE = {
  studentName: "Aarav Sharma",
  course: "BAMS",
  year: "3rd Professional",
  rollNo: "21BAMS045",
  studentInstitution: "All India Institute of Ayurveda, New Delhi",
  testTitle: "ASU&H Clinical Fundamentals Screening",
  ayushSystem: "Ayurveda",
  scorePercent: 92,
  grade: "O",
  completedAt: new Date().toISOString(),
  certificateNo: "SETU/2026/AIIA/0001",
  verifyCode: "SAMPLE01",
};

export function hexToRgb(hex) {
  const m = HEX.test(hex || "") ? hex : "#000000";
  return { r: parseInt(m.slice(1, 3), 16) / 255, g: parseInt(m.slice(3, 5), 16) / 255, b: parseInt(m.slice(5, 7), 16) / 255 };
}
