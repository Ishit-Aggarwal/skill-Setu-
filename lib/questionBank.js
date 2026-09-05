/**
 * The skill-domain rubric — names only.
 *
 * The questions and their answer keys deliberately do NOT live here. They used
 * to, which meant every answer to every assessment shipped inside the client
 * bundle: anyone could read the marking scheme out of the page source. The
 * graded bank now lives in `convex/_lib/questionBank.js`, server-side, and the
 * browser is served question text and options with the key stripped out.
 *
 * Ten domains: eight general employability competencies screened across
 * technology, engineering, consulting, management, design and health sciences,
 * plus two AYUSH-specific domains for the clinical streams. Which subset a
 * given student is charted and scored on is decided per student by
 * lib/taxonomy.js from their own department — this list is the union, not a
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

export const AYUSH_SKILL_DOMAINS = ["Ayurveda & Panchakarma", "Yoga, Unani, Siddha & Homeopathy"];

/** Every domain a student can be assessed and scored on — general and AYUSH alike. */
export const SKILL_DOMAINS = [...CORE_SKILL_DOMAINS, ...AYUSH_SKILL_DOMAINS];

/** How many questions each graded domain has, so the UI can say so up front. */
export const QUESTIONS_PER_DOMAIN = 5;
