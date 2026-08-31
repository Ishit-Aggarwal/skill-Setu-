export function computeMatch(internship, assessment) {
  if (!assessment) return 65;
  const relevantForTech = (internship.tags || []).some((t) =>
    /js|react|python|sql|programming|code|git/i.test(t)
  );
  const techBoost = relevantForTech ? assessment.domainScores?.["Programming Fundamentals"] : null;
  const base = techBoost != null ? (techBoost + assessment.overallScore) / 2 : assessment.overallScore;
  return Math.max(40, Math.min(99, Math.round(base)));
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  return diff;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
