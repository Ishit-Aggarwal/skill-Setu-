/** Lookups shared by the test, exam and certificate functions. */

export async function findTestByClientId(ctx, id) {
  if (!id) return null;
  return await ctx.db
    .query("skillTests")
    .withIndex("by_client_id", (q) => q.eq("id", id))
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
  if (!id) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_client_id", (q) => q.eq("id", id))
    .first();
}
