/**
 * A student's skill profile, recomputed from their graded attempts. Shared by
 * the legacy paper grader and the exam room so both write the same numbers.
 */

/** Recomputes a student's domain averages and overall score from their attempts. */
export async function recalculateAssessment(ctx, studentId) {
  const attempts = await ctx.db
    .query("assessmentAttempts")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();

  const byDomain = {};
  attempts.forEach((a) => {
    const w = a.weight || 1;
    if (!byDomain[a.domain]) byDomain[a.domain] = { sum: 0, weight: 0 };
    byDomain[a.domain].sum += a.score * w;
    byDomain[a.domain].weight += w;
  });

  const domainScores = {};
  Object.entries(byDomain).forEach(([d, { sum, weight }]) => {
    domainScores[d] = Math.round(sum / weight);
  });

  const values = Object.values(domainScores);
  const overallScore = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const strongTags = Object.entries(domainScores).filter(([, s]) => s >= 70).map(([d]) => d);

  const existing = await ctx.db
    .query("assessments")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .first();

  const record = { domainScores, overallScore, strongTags, updatedAt: new Date().toISOString() };
  if (existing) await ctx.db.patch(existing._id, record);
  else await ctx.db.insert("assessments", { studentId, ...record });

  return record;
}

export async function writeAttempt(ctx, studentId, attempt) {
  const existing = await ctx.db
    .query("assessmentAttempts")
    .withIndex("by_student_test", (q) => q.eq("studentId", studentId).eq("testId", attempt.testId))
    .first();

  if (existing) await ctx.db.patch(existing._id, { ...attempt, completedAt: new Date().toISOString() });
  else await ctx.db.insert("assessmentAttempts", { studentId, ...attempt, completedAt: new Date().toISOString() });
}

