/**
 * The skill-domain rubric — names only.
 *
 * The questions and their answer keys deliberately do NOT live here. They used
 * to, which meant every answer to every assessment shipped inside the client
 * bundle: anyone could read the marking scheme out of the page source. The
 * graded bank now lives in `convex/_lib/questionBank.js`, server-side, and the
 * browser is served question text and options with the key stripped out.
 *
 * Ten domains, all of them the competencies an AYUSH graduate is actually
 * screened on. Four are the universal aptitude axes every campus placement
 * uses; four are the AYUSH-specific professional competencies — clinical
 * research and documentation, digital health (eSanjeevani-AYUSH, Ayush Grid),
 * practice management and regulation (NCISM / NCH), and health-data
 * interpretation; the last two are the applied axes for the two halves of the
 * sector — ASU&H clinical practice, and ASU&H drug quality, GMP and
 * pharmacognosy.
 *
 * Which subset a given student is charted and scored on is decided per student
 * by lib/taxonomy.js from their own department — this list is the union, not a
 * rubric anyone is measured against in full.
 *
 * Ten is also the practical ceiling: the student skill radar and the
 * institution's department × domain heatmap both render one axis/column per
 * domain, and both degrade past ten.
 */

export const CORE_SKILL_DOMAINS = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Communication",
  "AYUSH Digital Health & Telemedicine",
  "Problem Solving & Critical Thinking",
  "AYUSH Practice Management & Ethics",
  "Data Analysis & Interpretation",
  "AYUSH Research & Clinical Documentation",
];

/** Applied axes, one for clinical practice and one for the ASU&H drug industry. */
export const APPLIED_SKILL_DOMAINS = ["ASU&H Clinical Fundamentals", "Herbal Drug Quality, GMP & Pharmacognosy"];

/** Every domain a student can be assessed and scored on. */
export const SKILL_DOMAINS = [...CORE_SKILL_DOMAINS, ...APPLIED_SKILL_DOMAINS];

/** How many questions each graded domain has, so the UI can say so up front. */
export const QUESTIONS_PER_DOMAIN = 5;
