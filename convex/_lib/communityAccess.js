/**
 * Community membership lookups shared by the test, exam and community
 * functions. The decisions themselves are lib/communityRules.js.
 */

import { canSeeTest, isActive, testCommunityIds } from "../../lib/communityRules";

export async function membershipOf(ctx, communityId, userId) {
  if (!communityId || !userId) return null;
  return await ctx.db
    .query("communityMembers")
    .withIndex("by_community_user", (q) => q.eq("communityId", communityId).eq("userId", userId))
    .first();
}

export async function findCommunity(ctx, communityId) {
  if (!communityId) return null;
  return await ctx.db
    .query("communities")
    .withIndex("by_client_id", (q) => q.eq("id", communityId))
    .first();
}

/**
 * The caller's membership in the first of `communityIds` where it is active,
 * or else the first membership found (so a reason can still be given).
 */
async function bestMembership(ctx, communityIds, userId) {
  let fallback = null;
  for (const id of communityIds) {
    const membership = await membershipOf(ctx, id, userId);
    if (isActive(membership)) return membership;
    fallback = fallback || membership;
  }
  return fallback;
}

/**
 * Whether `actor` may see, register for and sit `test`. Public tests: yes.
 * Community tests: the host, or an active member of any of its communities.
 * Returns { ok, reason, membership }.
 */
export async function memberAccessForTest(ctx, actor, test) {
  if (!test || test.audience !== "community") return { ok: true, membership: null };
  const membership = actor ? await bestMembership(ctx, testCommunityIds(test), actor.id) : null;
  if (canSeeTest(test, membership, actor)) return { ok: true, membership };
  return { ok: false, reason: "This test is only for members of its communities.", membership };
}

/**
 * Every test shared with `communityId`: those it is the first community of
 * (the skillTests index) and those it was added to (skillTestCommunities).
 */
export async function testsInCommunity(ctx, communityId) {
  const direct = await ctx.db
    .query("skillTests")
    .withIndex("by_community", (q) => q.eq("communityId", communityId))
    .collect();
  const seen = new Set(direct.map((t) => t.id));
  const links = await ctx.db
    .query("skillTestCommunities")
    .withIndex("by_community", (q) => q.eq("communityId", communityId))
    .collect();
  const out = [...direct];
  for (const link of links) {
    if (seen.has(link.testId)) continue;
    seen.add(link.testId);
    const test = await ctx.db
      .query("skillTests")
      .withIndex("by_client_id", (q) => q.eq("id", link.testId))
      .first();
    if (test && testCommunityIds(test).includes(communityId)) out.push(test);
  }
  return out;
}

/** Keeps skillTestCommunities in step with the test's own list of communities. */
export async function syncTestCommunities(ctx, test) {
  const want = new Set(test.audience === "community" ? testCommunityIds(test) : []);
  const rows = await ctx.db
    .query("skillTestCommunities")
    .withIndex("by_test", (q) => q.eq("testId", test.id))
    .collect();
  for (const row of rows) {
    if (want.has(row.communityId)) want.delete(row.communityId);
    else await ctx.db.delete(row._id);
  }
  for (const communityId of want) await ctx.db.insert("skillTestCommunities", { testId: test.id, communityId });
}

/** The ids of every community `userId` is an active member of. */
export async function activeCommunityIds(ctx, userId) {
  if (!userId) return new Set();
  const rows = await ctx.db
    .query("communityMembers")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
    .collect();
  return new Set(rows.map((r) => r.communityId));
}

/**
 * The community name a certificate carries for `userId`: the community they
 * reach the test through when it is shared with several, else the test's own.
 */
export async function communityNameFor(ctx, test, userId) {
  if (!test || test.audience !== "community") return null;
  const ids = testCommunityIds(test);
  if (ids.length > 1 && userId) {
    for (const id of ids) {
      if (!isActive(await membershipOf(ctx, id, userId))) continue;
      const community = await findCommunity(ctx, id);
      if (community?.name) return community.name;
    }
  }
  return ids.length > 1 ? null : test.communityName || null;
}
