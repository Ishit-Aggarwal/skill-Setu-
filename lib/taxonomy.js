/**
 * Stream-aware competency taxonomy.
 *
 * A student's skill radar, gap nudges and score trend are only credible if the
 * axes belong to the course they are actually enrolled in. Assessing every
 * student against one universal ten-domain rubric meant a B.Pharm (Ayu)
 * candidate was scored on Panchakarma clinical axes and a BAMS candidate on
 * HPTLC fingerprinting — both read as a broken assessment engine to anyone
 * looking at the profile.
 *
 * So the rubric is chosen from the student's declared department. Three
 * streams, each the same shape and each carrying the same four universal
 * axes: ASU&H clinical practice, AYUSH pharma & drug quality, and Yoga,
 * Naturopathy & wellness. A student whose department doesn't map cleanly
 * falls back to the universal baseline rather than being pushed into
 * somebody else's rubric.
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
    label: "ASU&H clinical practice",
    description: "The rubric for BAMS, BHMS, BUMS, BSMS, Sowa-Rigpa, MD/MS (Ayu), Panchakarma PG and AYUSH hospital-management streams.",
    domains: [
      "ASU&H Clinical Fundamentals",
      "AYUSH Research & Clinical Documentation",
      "AYUSH Digital Health & Telemedicine",
      "AYUSH Practice Management & Ethics",
      "Problem Solving & Critical Thinking",
      "Quantitative Aptitude",
      "Logical Reasoning",
      "Verbal Communication",
    ],
  },
  health: {
    id: "health",
    label: "AYUSH pharma, quality & drug research",
    description:
      "The rubric for Ayurvedic pharmacy, Dravyaguna & pharmacognosy, Rasashastra & Bhaishajya Kalpana and medicinal-plant science streams.",
    domains: [
      "Herbal Drug Quality, GMP & Pharmacognosy",
      "AYUSH Research & Clinical Documentation",
      "Data Analysis & Interpretation",
      "AYUSH Practice Management & Ethics",
      "Problem Solving & Critical Thinking",
      "Quantitative Aptitude",
      "Logical Reasoning",
      "Verbal Communication",
    ],
  },
  design: {
    id: "design",
    label: "Yoga, Naturopathy & wellness",
    description: "The rubric for BNYS, Yoga Therapy, Swasthavritta and Panchakarma therapy-assistant streams.",
    domains: [
      "ASU&H Clinical Fundamentals",
      "AYUSH Practice Management & Ethics",
      "AYUSH Digital Health & Telemedicine",
      "Data Analysis & Interpretation",
      "Problem Solving & Critical Thinking",
      "Verbal Communication",
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
   degree ("B.Pharm (Ayu)", "BNYS", "PG Diploma in Yoga Therapy") rather than
   picking a department from the list still lands on the right rubric. */
const HEALTH_COURSE_PATTERN =
  /\b(b\.?pharm|m\.?pharm|d\.?pharm)\b|pharmac|dravyaguna|rasashastra|bhaishajya|pharmacognos|medicinal plant|nutraceutical|gmp|ilmul advia|gunapadam/i;
const DESIGN_COURSE_PATTERN =
  /\b(bnys|mnys|pgdyt|dyt|ycb)\b|yoga|naturopath|swasthavritta|wellness|therapy assistant|spa therap/i;

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
 * scored outside their own rubric — a BAMS student who chose to sit the
 * pharmacognosy paper should still see that result, but it does not belong on
 * their radar axes and must not dilute their stream's average.
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
