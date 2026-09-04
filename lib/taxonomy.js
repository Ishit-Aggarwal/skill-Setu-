/**
 * Stream-aware competency taxonomy.
 *
 * A student's skill radar, gap nudges and score trend are only credible if the
 * axes belong to the course they are actually enrolled in. Assessing every
 * student against one universal ten-domain rubric meant a B.Tech CSE candidate
 * was scored on Ayurveda & Panchakarma and a BAMS candidate on Programming
 * Fundamentals — both read as a broken assessment engine to anyone looking at
 * the profile.
 *
 * So the rubric is chosen from the student's declared department. AYUSH is one
 * modelled stream here, on exactly the same footing as the technology and
 * business streams — not the platform default, and not a special case.
 *
 * Every domain named below must exist in QUESTION_BANK, otherwise a student
 * could be shown an axis no test can ever score.
 */

import { AYUSH_DEPARTMENTS } from "./domains";
import { SKILL_DOMAINS } from "./questionBank";

/** The four domains every stream is assessed on, whatever the course. */
export const UNIVERSAL_DOMAINS = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Communication",
  "Problem Solving & Critical Thinking",
];

export const TAXONOMIES = {
  general: {
    id: "general",
    label: "Technology & general employability",
    description: "The campus-placement rubric used across engineering, sciences, management and design.",
    domains: [
      "Programming & Digital Fundamentals",
      "Data Analysis & Interpretation",
      "Quantitative Aptitude",
      "Logical Reasoning",
      "Problem Solving & Critical Thinking",
      "Verbal Communication",
      "Business & Professional Dynamics",
      "Research & Documentation",
    ],
  },
  ayush: {
    id: "ayush",
    label: "AYUSH clinical practice",
    description: "Clinical and pharmacological competencies for Ayurveda, Yoga, Unani, Siddha and Homeopathy streams.",
    domains: [
      "Ayurveda & Panchakarma",
      "Yoga, Unani, Siddha & Homeopathy",
      "Research & Documentation",
      "Problem Solving & Critical Thinking",
      "Business & Professional Dynamics",
      "Quantitative Aptitude",
      "Verbal Communication",
      "Logical Reasoning",
    ],
  },
  employability: {
    id: "employability",
    label: "Core employability",
    description: "The universal baseline, used until a stream-specific rubric is set for this course.",
    domains: UNIVERSAL_DOMAINS,
  },
};

/* Guards against a rename in questionBank.js silently producing dead axes. */
Object.values(TAXONOMIES).forEach((t) => {
  const unknown = t.domains.filter((d) => !SKILL_DOMAINS.includes(d));
  if (unknown.length && typeof console !== "undefined") {
    console.warn(`[taxonomy] "${t.id}" references domains with no question bank: ${unknown.join(", ")}`);
  }
});

const AYUSH_DEPARTMENT_SET = new Set(AYUSH_DEPARTMENTS);

/* Matched against department and course text so a student who typed "BAMS"
   rather than picking "Ayurveda (BAMS)" still gets the right rubric. */
const AYUSH_COURSE_PATTERN = /\b(bams|bhms|bums|bsms|bnys)\b|ayurved|panchakarma|dravyaguna|rasashastra|kayachikitsa|unani|siddha|homeopath|naturopath|\bayush\b/i;

/** The taxonomy id for a department/course pair. */
export function taxonomyIdFor({ department, course } = {}) {
  if (department && AYUSH_DEPARTMENT_SET.has(department)) return "ayush";
  const text = `${department || ""} ${course || ""}`.trim();
  if (!text) return "employability";
  if (AYUSH_COURSE_PATTERN.test(text)) return "ayush";
  if (department) return "general";
  return "employability";
}

/** The full taxonomy record for a student. Never returns undefined. */
export function taxonomyFor(user) {
  return TAXONOMIES[taxonomyIdFor(user || {})] || TAXONOMIES.employability;
}

/** The ordered domains a given student should be charted and scored on. */
export function domainsFor(user) {
  return taxonomyFor(user).domains;
}

/**
 * A student's scores restricted to their own rubric, in rubric order.
 * `assessed` counts only the domains they have actually sat a test for, so
 * "N of M areas assessed" can never exceed M.
 */
export function scoresFor(user, assessment) {
  const domains = domainsFor(user);
  const scores = assessment?.domainScores || {};
  const rows = domains.map((skill) => ({ skill, score: scores[skill] ?? null }));
  return {
    domains,
    rows,
    total: domains.length,
    assessed: rows.filter((r) => r.score != null).length,
  };
}
