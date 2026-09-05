/**
 * Stream-aware competency taxonomy.
 *
 * A student's skill radar, gap nudges and score trend are only credible if the
 * axes belong to the course they are actually enrolled in. Assessing every
 * student against one universal ten-domain rubric meant a B.Tech candidate was
 * scored on clinical axes and a nursing candidate on programming fundamentals
 * — both read as a broken assessment engine to anyone looking at the profile.
 *
 * So the rubric is chosen from the student's declared department. Three
 * streams, each the same shape and each carrying the same four universal
 * axes: general employability, health & life sciences, and design. No stream
 * belongs to one industry, and none is the platform default — a student whose
 * department doesn't map cleanly falls back to the universal baseline rather
 * than being pushed into somebody else's rubric.
 *
 * Every domain named below must exist in QUESTION_BANK, otherwise a student
 * could be shown an axis no test can ever score.
 */

import { DESIGN_DEPARTMENTS, HEALTH_DEPARTMENTS } from "./domains";
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
  health: {
    id: "health",
    label: "Health & life sciences",
    description:
      "The rubric for medicine, nursing, pharmacy, biotechnology, agriculture and food technology streams.",
    domains: [
      "Health & Life Sciences",
      "Research & Documentation",
      "Data Analysis & Interpretation",
      "Problem Solving & Critical Thinking",
      "Quantitative Aptitude",
      "Verbal Communication",
      "Logical Reasoning",
      "Business & Professional Dynamics",
    ],
  },
  design: {
    id: "design",
    label: "Design, architecture & media",
    description: "The rubric for design, architecture, planning, journalism and communication streams.",
    domains: [
      "Design & Visual Thinking",
      "Problem Solving & Critical Thinking",
      "Verbal Communication",
      "Business & Professional Dynamics",
      "Research & Documentation",
      "Programming & Digital Fundamentals",
      "Logical Reasoning",
      "Quantitative Aptitude",
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

const HEALTH_DEPARTMENT_SET = new Set(HEALTH_DEPARTMENTS);
const DESIGN_DEPARTMENT_SET = new Set(DESIGN_DEPARTMENTS);

/* Matched against department and course text so a student who typed their
   degree ("B.Des", "MBBS", "B.Sc Nursing") rather than picking a department
   from the list still lands on the right rubric. */
const HEALTH_COURSE_PATTERN =
  /\b(mbbs|bds|bams|bhms|bums|bsms|bnys|b\.?pharm|m\.?pharm|bpt|bsc nursing|b\.?sc\.? nursing|bvsc|b\.?sc\.? agri)\b|nursing|pharmac|biotech|physiolog|medicine|clinical|life sciences|agricultur|food technolog/i;
const DESIGN_COURSE_PATTERN =
  /\b(b\.?des|m\.?des|b\.?arch|m\.?arch|bfa|mfa|bja|bjmc)\b|design|architect|animation|journalis|visual|fine arts|communication design/i;

/** The taxonomy id for a department/course pair. */
export function taxonomyIdFor({ department, course } = {}) {
  if (department && HEALTH_DEPARTMENT_SET.has(department)) return "health";
  if (department && DESIGN_DEPARTMENT_SET.has(department)) return "design";
  const text = `${department || ""} ${course || ""}`.trim();
  if (!text) return "employability";
  if (DESIGN_COURSE_PATTERN.test(text)) return "design";
  if (HEALTH_COURSE_PATTERN.test(text)) return "health";
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
 *
 * `assessed` counts only the domains they have actually sat a test for, so
 * "N of M areas assessed" can never exceed M. `extra` carries anything they
 * scored outside their own rubric — a CSE student who chose to sit a health-sciences
 * paper should still see that result, but it does not belong on their radar
 * axes and must not dilute their stream's average.
 *
 * This is the single definition of "which skill categories does this person
 * have?", used by the dashboard radar, the analytics page, the recruiter's
 * candidate view and the institution's roster alike — so none of them can show
 * a fixed one-size-fits-all list of categories that has nothing to do with the
 * student's actual field.
 */
export function scoresFor(user, assessment) {
  const domains = domainsFor(user);
  const scores = assessment?.domainScores || {};
  const rows = domains.map((skill) => ({ skill, score: scores[skill] ?? null }));
  const inRubric = new Set(domains);
  const extra = Object.entries(scores)
    .filter(([skill]) => !inRubric.has(skill))
    .map(([skill, score]) => ({ skill, score }));

  return {
    taxonomy: taxonomyFor(user),
    domains,
    rows,
    extra,
    total: domains.length,
    assessed: rows.filter((r) => r.score != null).length,
    overall: assessment ? Math.round(assessment.overallScore) : null,
  };
}
