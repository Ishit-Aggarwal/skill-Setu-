/**
 * The skill-domain rubric — names only.
 *
 * The questions and their answer keys deliberately do NOT live here. They used
 * to, which meant every answer to every assessment shipped inside the client
 * bundle: anyone could read the marking scheme out of the page source. The
 * graded bank now lives in `convex/_lib/questionBank.js`, server-side, and the
 * browser is served question text and options with the key stripped out.
 *
 * Ten domains, none of them belonging to one industry. Eight are the
 * cross-cutting employability competencies every campus screens on; the last
 * two exist so the science and design faculties are measured on something of
 * their own rather than being squeezed into "problem solving". No vertical
 * gets a privileged axis here — an earlier version reserved two of the ten for
 * a single sector, which is exactly what made the rubric read as a
 * single-industry product.
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
  "Programming & Digital Fundamentals",
  "Problem Solving & Critical Thinking",
  "Business & Professional Dynamics",
  "Data Analysis & Interpretation",
  "Research & Documentation",
];

/** Faculty-specific axes, one for the sciences and one for design. */
export const APPLIED_SKILL_DOMAINS = ["Health & Life Sciences", "Design & Visual Thinking"];

/** Every domain a student can be assessed and scored on. */
export const SKILL_DOMAINS = [...CORE_SKILL_DOMAINS, ...APPLIED_SKILL_DOMAINS];

/** How many questions each graded domain has, so the UI can say so up front. */
export const QUESTIONS_PER_DOMAIN = 5;
