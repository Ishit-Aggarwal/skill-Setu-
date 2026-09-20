/**
 * A certificate design is a small JSON spec — colours, border, type, layout —
 * that both the on-screen preview and the PDF renderer draw from. The AI
 * proposes specs; the presets below are what it starts from and what the
 * app falls back to when AI is unavailable. Keeping the spec this small is
 * what makes "reuse this exact template for every student" deterministic.
 */

export const BORDER_STYLES = ["double", "single", "ornate", "none"];
export const TITLE_FONTS = ["serif", "sans"];
export const LAYOUTS = ["centered", "left"];
export const ORNAMENTS = ["lotus", "line", "none"];

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
    titleFont: "serif",
    layout: "centered",
    ornament: "lotus",
    tagline: "in recognition of demonstrated competence",
  },
  {
    id: "modern",
    name: "Modern indigo",
    palette: { primary: "#2B3A67", accent: "#C46A2B", ink: "#1E2230", paper: "#FFFFFF" },
    border: "single",
    titleFont: "sans",
    layout: "left",
    ornament: "line",
    tagline: "awarded for successfully completing",
  },
  {
    id: "heritage",
    name: "Heritage saffron",
    palette: { primary: "#8A4A1F", accent: "#3C7C6B", ink: "#2A1E14", paper: "#FFF9EE" },
    border: "ornate",
    titleFont: "serif",
    layout: "centered",
    ornament: "lotus",
    tagline: "is hereby certified to have completed",
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
    titleFont: TITLE_FONTS.includes(d.titleFont) ? d.titleFont : base.titleFont,
    layout: LAYOUTS.includes(d.layout) ? d.layout : base.layout,
    ornament: ORNAMENTS.includes(d.ornament) ? d.ornament : base.ornament,
    tagline: String(d.tagline || base.tagline).slice(0, 80),
    watermark: normaliseWatermark(d.watermark),
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

/** Sample data used by previews before any student has earned anything. */
export const SAMPLE_CERTIFICATE = {
  studentName: "Aarav Sharma",
  testTitle: "ASU&H Clinical Fundamentals Screening",
  scorePercent: 92,
  completedAt: new Date().toISOString(),
  certificateNo: "SETU/2026/AIIA/0001",
  verifyCode: "SAMPLE01",
};

export function hexToRgb(hex) {
  const m = HEX.test(hex || "") ? hex : "#000000";
  return { r: parseInt(m.slice(1, 3), 16) / 255, g: parseInt(m.slice(3, 5), 16) / 255, b: parseInt(m.slice(5, 7), 16) / 255 };
}
