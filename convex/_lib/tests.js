/** Lookups shared by the test, exam and certificate functions. */

export async function findTestByClientId(ctx, id) {
  return await ctx.db
    .query("skillTests")
    .filter((q) => q.eq(q.field("id"), id))
    .first();
}

export async function questionsForTest(ctx, testId) {
  const rows = await ctx.db
    .query("skillTestQuestions")
    .withIndex("by_test", (q) => q.eq("testId", testId))
    .collect();
  return rows.sort((a, b) => a.order - b.order);
}

export async function findUserById(ctx, id) {
  return await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("id"), id))
    .first();
}
