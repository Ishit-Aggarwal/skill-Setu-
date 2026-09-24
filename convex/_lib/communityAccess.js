/**
 * Community membership lookups shared by the test, exam and community
 * functions. The decisions themselves are lib/communityRules.js.
 */

import { canSeeTest } from "../../lib/communityRules";

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
 * Whether `actor` may see, register for and sit `test`. Public tests: yes.
 * Community tests: the host, or an active member of the community.
 * Returns { ok, reason, membership }.
 */
export async function memberAccessForTest(ctx, actor, test) {
  if (!test || test.audience !== "community") return { ok: true, membership: null };
  const membership = actor ? await membershipOf(ctx, test.communityId, actor.id) : null;
  if (canSeeTest(test, membership, actor)) return { ok: true, membership };
  return { ok: false, reason: "This test is only for members of its community.", membership };
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
