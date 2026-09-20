/**
 * The five AYUSH systems — the one canonical list.
 *
 * Every dropdown, filter, schema check, API contract and seed row that needs
 * "which AYUSH system" imports from here. Nothing else in the codebase may
 * declare its own copy: the sector taxonomy in lib/domains.js derives its
 * clinical-systems cluster from this list, the Convex functions validate
 * against it, and the UI renders labels through `ayushSystemLabel`.
 *
 * The slug is what is stored, sent and compared. The label is what is shown.
 * No "Other", no blank option that counts as a value — a record either carries
 * one of these five slugs or it needs re-tagging (see `needsAyushRetag`).
 */

export const AYUSH_SYSTEMS = [
  { slug: "ayurveda", label: "Ayurveda" },
  { slug: "yoga_naturopathy", label: "Yoga & Naturopathy" },
  { slug: "unani", label: "Unani" },
  { slug: "siddha", label: "Siddha" },
  { slug: "homoeopathy", label: "Homoeopathy" },
];

export const AYUSH_SYSTEM_SLUGS = AYUSH_SYSTEMS.map((s) => s.slug);
export const AYUSH_SYSTEM_LABELS = AYUSH_SYSTEMS.map((s) => s.label);

/** The label shown wherever the input or column is named. */
export const AYUSH_SYSTEM_FIELD_LABEL = "AYUSH System";

export function isAyushSystem(value) {
  return typeof value === "string" && AYUSH_SYSTEM_SLUGS.includes(value);
}

export function ayushSystemLabel(slug) {
  const found = AYUSH_SYSTEMS.find((s) => s.slug === slug);
  return found ? found.label : "";
}

/* Spellings and course names that older records and free-text fields used.
   Resolution is deliberately conservative: only unambiguous matches map, and
   anything else returns null so the record is flagged for a human rather than
   guessed at. */
const ALIASES = {
  ayurveda: "ayurveda",
  ayurved: "ayurveda",
  bams: "ayurveda",
  "ayurveda (bams)": "ayurveda",
  yoga: "yoga_naturopathy",
  naturopathy: "yoga_naturopathy",
  "yoga & naturopathy": "yoga_naturopathy",
  "yoga and naturopathy": "yoga_naturopathy",
  "yoga_naturopathy": "yoga_naturopathy",
  bnys: "yoga_naturopathy",
  unani: "unani",
  "unani medicine": "unani",
  bums: "unani",
  siddha: "siddha",
  "siddha medicine": "siddha",
  bsms: "siddha",
  homoeopathy: "homoeopathy",
  homeopathy: "homoeopathy",
  bhms: "homoeopathy",
};

/**
 * Resolves a slug, a display label, a legacy sector name or a degree
 * abbreviation ("BAMS") to a canonical slug — or null when it cannot be done
 * without guessing.
 */
export function toAyushSystemSlug(value) {
  if (value == null) return null;
  const key = String(value).trim().toLowerCase();
  if (!key) return null;
  if (ALIASES[key]) return ALIASES[key];
  // "BAMS (Ayurveda)", "Ayurveda — Kayachikitsa": a single system named once.
  const hits = AYUSH_SYSTEMS.filter((s) => key.includes(s.label.toLowerCase()) || key.includes(s.slug));
  if (hits.length === 1) return hits[0].slug;
  const degrees = ["bams", "bhms", "bums", "bsms", "bnys"].filter((d) => new RegExp(`\\b${d}\\b`).test(key));
  if (degrees.length === 1) return ALIASES[degrees[0]];
  return null;
}

/** A record with no valid AYUSH system on it needs a human to tag it. */
export function needsAyushRetag(row) {
  return Boolean(row) && !isAyushSystem(row.ayushSystem);
}
