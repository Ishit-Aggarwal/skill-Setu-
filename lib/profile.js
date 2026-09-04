/**
 * One definition of what a "complete" student profile means.
 *
 * The dashboard used to compute a completion percentage inline with a set of
 * magic numbers, which meant the figure could not be explained to the student —
 * they saw "65%" with no way to find the missing 35. Both the dashboard and the
 * portfolio now render this list, so the number and the checklist can never
 * disagree.
 */
export const PROFILE_CHECKS = [
  {
    key: "assessment",
    weight: 25,
    label: "Take a skill test",
    detail: "Your skill radar and every match score are computed from it.",
    action: "skill-assessment",
    done: ({ assessment }) => Boolean(assessment),
  },
  {
    key: "bio",
    weight: 10,
    label: "Write a short bio",
    detail: "The first thing a recruiter reads on your profile.",
    action: "student-portfolio",
    done: ({ portfolio }) => Boolean(portfolio?.bio?.trim()),
  },
  {
    key: "skills",
    weight: 15,
    label: "Add at least three skills",
    detail: "Skills are matched against the requirements on every posting.",
    action: "student-portfolio",
    done: ({ portfolio }) =>
      Object.values(portfolio?.skillBadges || {}).reduce((n, list) => n + (list?.length || 0), 0) >= 3,
  },
  {
    key: "education",
    weight: 10,
    label: "Add your education",
    detail: "Degree, institution and years.",
    action: "student-portfolio",
    done: ({ portfolio }) =>
      (portfolio?.education?.length || 0) > 0 ||
      (portfolio?.timeline || []).some((t) => t.type === "Education"),
  },
  {
    key: "experience",
    weight: 10,
    label: "Add an experience or project",
    detail: "An internship, a research stint or something you built.",
    action: "student-portfolio",
    done: ({ portfolio }) => (portfolio?.timeline?.length || 0) > 0 || (portfolio?.projects?.length || 0) > 0,
  },
  {
    key: "certifications",
    weight: 10,
    label: "Add a certificate",
    detail: "Anything you have earned — uploaded or issued to you on Skill Setu.",
    action: "student-portfolio",
    done: ({ portfolio, credentials }) =>
      (portfolio?.certifications?.length || 0) > 0 || (credentials?.length || 0) > 0,
  },
  {
    key: "resume",
    weight: 10,
    label: "Upload a résumé",
    detail: "Recruiters open it straight from your application.",
    action: "student-portfolio",
    done: ({ portfolio }) => (portfolio?.documents || []).some((d) => d.type === "Resume"),
  },
  {
    key: "applications",
    weight: 10,
    label: "Apply to an opportunity",
    detail: "Your profile only works once it is in front of someone.",
    action: "internship-listings",
    done: ({ applications }) => (applications?.length || 0) > 0,
  },
];

/** Returns `{ percent, items }` where each item carries its own done flag and weight. */
export function profileStrength(context) {
  const items = PROFILE_CHECKS.map((check) => ({ ...check, done: Boolean(check.done(context)) }));
  const percent = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  return { percent, items, missing: items.filter((i) => !i.done) };
}
