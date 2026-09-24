/**
 * The pieces convex/communities.js and the test functions share: the
 * caller's standing in a community, the moderation trail, the inbox write,
 * and the post that announces a community test.
 */

import { internal } from "../_generated/api";
import { authError, resolveInstitutionId } from "./authz";
import { findCommunity, membershipOf } from "./communityAccess";
import { canView, isOwner, isStaff } from "../../lib/communityRules";
import { isDemoId } from "../../lib/demoIsolation";

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A demo persona and a real account never meet in a community, in either
 * direction — the same wall every other table keeps.
 */
export function sameSide(actorId, ownerId) {
  return isDemoId(actorId) === isDemoId(ownerId);
}

/**
 * Everything the rules need about the caller and one community. Returns
 * null when the community does not exist — or when it exists on the other
 * side of the demo wall, which is the same thing to this caller.
 */
export async function standing(ctx, actor, communityId) {
  const community = await findCommunity(ctx, communityId);
  if (!community || !sameSide(actor.id, community.ownerId)) return null;
  const membership = await membershipOf(ctx, community.id, actor.id);
  return {
    community,
    membership,
    view: canView(community, membership, actor),
    staff: isStaff(membership) || actor.role === "admin",
    owner: isOwner(membership) || actor.role === "admin",
  };
}

/** The same, refusing with "doesn't exist" rather than revealing an invite-only community. */
export async function requireStanding(ctx, actor, communityId, { need = "view" } = {}) {
  const s = await standing(ctx, actor, communityId);
  if (!s || s.view === "none") throw new Error("That community doesn't exist.");
  if (need === "full" && s.view !== "full") throw authError("Join this community to see its posts.");
  if (need === "staff" && !s.staff) throw authError("Only the owner and moderators can do that.");
  if (need === "owner" && !s.owner) throw authError("Only the owner of this community can do that.");
  return s;
}

export async function audit(ctx, community, actor, action, targetId = null, detail = null) {
  await ctx.db.insert("communityAudit", {
    communityId: community.id,
    actorId: actor.id,
    actorName: actor.user?.name || actor.user?.instituteName || "",
    action,
    targetId: targetId || null,
    detail: detail ? String(detail).slice(0, 300) : null,
    at: Date.now(),
  });
}

/**
 * One inbox row. `id` makes it idempotent: a retried fan-out that reaches the
 * same member again finds the row and writes nothing.
 */
export async function notify(ctx, userId, { id, kind, message, from, link, communityId, postId, senderId, testId }) {
  const rowId = id || newId("studentNotifications");
  const existing = await ctx.db
    .query("studentNotifications")
    .withIndex("by_client_id", (q) => q.eq("id", rowId))
    .first();
  if (existing) return false;
  const at = new Date().toISOString();
  await ctx.db.insert("studentNotifications", {
    id: rowId,
    studentId: userId,
    senderId: senderId || undefined,
    kind: kind || null,
    link: link || null,
    communityId: communityId || null,
    postId: postId || null,
    testId: testId || null,
    message,
    from: from || "Skill Setu",
    sentAt: at,
    read: false,
    updatedAt: at,
  });
  return true;
}

/** The owner and every active moderator. */
export async function staffOf(ctx, communityId) {
  const rows = await ctx.db
    .query("communityMembers")
    .withIndex("by_community_status", (q) => q.eq("communityId", communityId).eq("status", "active"))
    .collect();
  return rows.filter((m) => m.role === "owner" || m.role === "moderator");
}

/** Adds to the denormalised counters (never below zero). */
export async function bump(ctx, community, { members = 0, pending = 0 }) {
  const fresh = await ctx.db.get(community._id);
  await ctx.db.patch(community._id, {
    memberCount: Math.max(0, (fresh?.memberCount || 0) + members),
    pendingCount: Math.max(0, (fresh?.pendingCount || 0) + pending),
    updatedAt: Date.now(),
  });
}

/**
 * Queues the notification fan-out for a post: every active, non-muted member
 * except the author, in batches, from a scheduled function — never from the
 * browser, and never all in one mutation.
 */
export async function scheduleFanOut(ctx, { key, community, post, kind, message, from, link, authorId, testId = null }) {
  await ctx.scheduler.runAfter(0, internal.communities.fanOut, {
    key,
    communityId: community.id,
    postId: post?.id || null,
    testId,
    kind,
    message,
    from,
    link,
    authorId,
    cursor: null,
  });
}

export async function actorInstitution(ctx, actor) {
  return await resolveInstitutionId(ctx, actor.user);
}

/**
 * Publishing a community-only test posts it in the community (optionally
 * pinned) and tells every member. Called from skillTests.publishTest.
 */
export async function announceCommunityTest(ctx, { actor, community, test, pin = false }) {
  const existing = await ctx.db
    .query("communityPosts")
    .withIndex("by_community_created", (q) => q.eq("communityId", community.id))
    .filter((q) => q.eq(q.field("testId"), test.id))
    .first();
  if (existing) return existing;
  const now = Date.now();
  const authorName = actor.user?.name || actor.user?.instituteName || "Host";
  const post = {
    id: newId("post"),
    communityId: community.id,
    authorId: actor.id,
    authorName,
    type: "test",
    title: test.title,
    body: test.description || "",
    attachments: [],
    links: [],
    testId: test.id,
    pinned: Boolean(pin),
    pinnedAt: pin ? now : null,
    pinOrder: pin ? now : null,
    createdAt: now,
  };
  await ctx.db.insert("communityPosts", post);
  await scheduleFanOut(ctx, {
    key: `test_${test.id}`,
    community,
    post,
    kind: "community_test",
    message: `📝 New test in ${community.name}: "${test.title}". Register from the community's Tests tab.`,
    from: community.name,
    link: `/communities/${community.id}?tab=tests`,
    authorId: actor.id,
    testId: test.id,
  });
  return post;
}

/**
 * A member who leaves, is removed or is banned loses their registrations for
 * the community's tests (an attempt already under way is left to finish —
 * begin() re-checks membership, the attempt itself is not touched).
 */
export async function cancelCommunityRegistrations(ctx, community, userId) {
  const tests = await ctx.db
    .query("skillTests")
    .withIndex("by_community", (q) => q.eq("communityId", community.id))
    .collect();
  let cancelled = 0;
  for (const test of tests) {
    const reg = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", test.id))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!reg || reg.cancelledAt) continue;
    const graded = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_student_test", (q) => q.eq("studentId", userId).eq("testId", test.id))
      .first();
    if (graded) continue; // already sat: the result stands
    const at = new Date().toISOString();
    await ctx.db.patch(reg._id, { cancelledAt: at, cancelReason: "removed_from_community", updatedAt: at });
    await notify(ctx, userId, {
      id: `notif_regcancel_${test.id}_${userId}`,
      kind: "test_registration_cancelled",
      message: `Your registration for "${test.title}" was cancelled because you're no longer a member of ${community.name}.`,
      from: community.name,
      link: "/skill-assessment",
      testId: test.id,
    });
    cancelled += 1;
  }
  return cancelled;
}
