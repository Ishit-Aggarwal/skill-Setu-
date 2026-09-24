/**
 * Who may do what in a community — the pure part.
 *
 * convex/communities.js gathers the community row, the caller's membership
 * row and the institution the caller resolves to, and asks here. Keeping the
 * decisions in plain functions means every rule is unit-tested under Node and
 * there is exactly one place to look when asking "can a banned student use an
 * invite code?" (no). The screens use the same functions to decide which
 * buttons to draw, but the server is what enforces them.
 *
 * Visibility:
 *   "open"   — listed; a student joins with one click
 *   "closed" — listed as a card (no posts); a student asks, staff approve
 *   "invite" — never listed, never revealed; an invite code or a direct invite only
 */

import { COMMUNITIES } from "./settings";

export const VISIBILITIES = ["open", "closed", "invite"];
export const VISIBILITY_LABEL = { open: "Open", closed: "Closed", invite: "Invite only" };
export const OWNER_ROLES = ["academician", "institution"];
export const MEMBER_STATUSES = ["active", "pending", "invited", "removed", "banned", "left", "declined"];

/** A membership that counts: active, whatever the role. */
export function isActive(membership) {
  return membership?.status === "active";
}

/** The owner or a moderator, still active. */
export function isStaff(membership) {
  return isActive(membership) && (membership.role === "owner" || membership.role === "moderator");
}

export function isOwner(membership) {
  return isActive(membership) && membership.role === "owner";
}

export function isBanned(membership) {
  return membership?.status === "banned";
}

/**
 * How much of a community the caller may see:
 *   "full" — the feed, materials and tests (active members, staff, admin)
 *   "card" — the public card only (name, owner, count, system) for an Open
 *            or Closed community the caller is not banned from
 *   "none" — nothing, not even that it exists (Invite-only to outsiders,
 *            anything to someone it banned)
 */
export function canView(community, membership, actor) {
  if (!community) return "none";
  if (actor?.role === "admin") return "full";
  if (isActive(membership)) return "full";
  if (isBanned(membership)) return "none";
  // An invited student sees the name on their invitation, nothing more.
  if (community.visibility === "invite") return membership?.status === "invited" ? "card" : "none";
  return "card";
}

/** The institution restriction: resolved and matching, or refused. It fails closed. */
export function passesInstitution(community, actorInstitutionId) {
  if (!community?.sameInstitutionOnly) return true;
  return Boolean(actorInstitutionId && community.institutionId && actorInstitutionId === community.institutionId);
}

export function institutionRefusal(community) {
  return `This community is only for students of ${community?.institutionName || "its institution"}.`;
}

export function normaliseInviteCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

/** Whether an invite code opens this community right now. Returns { ok, reason }. */
export function checkInviteCode(community, code, now = Date.now()) {
  if (!community || !code || normaliseInviteCode(code) !== community.inviteCode) return { ok: false, reason: "That invite code isn't valid." };
  if (community.inviteCodeExpiresAt && now > community.inviteCodeExpiresAt) return { ok: false, reason: "That invite code has expired. Ask the owner for a new one." };
  if (community.inviteCodeMaxUses && (community.inviteCodeUses || 0) >= community.inviteCodeMaxUses) {
    return { ok: false, reason: "That invite code has been used the maximum number of times." };
  }
  return { ok: true };
}

/**
 * Whether a student may become a member by a given route. Returns { ok, reason }.
 *
 *   via "open"    — the Join button on an Open community
 *   via "request" — Request to join on a Closed community
 *   via "code"    — an invite code (any visibility)
 *   via "invite"  — accepting a direct invitation
 *
 * `ctx` carries { actorInstitutionId, code, now }.
 */
export function canJoin(community, membership, actor, via, ctx = {}) {
  if (!community) return { ok: false, reason: "That community doesn't exist." };
  if (actor?.role !== "student") return { ok: false, reason: "Only student accounts can join communities." };
  if (community.archivedAt) return { ok: false, reason: "This community has been archived and isn't taking new members." };
  // A ban is final: no rejoining, no requests, no codes, no invitations.
  if (isBanned(membership)) return { ok: false, reason: "You can't join this community." };
  if (isActive(membership)) return { ok: false, reason: "You're already a member." };
  if (!passesInstitution(community, ctx.actorInstitutionId)) return { ok: false, reason: institutionRefusal(community) };

  if (via === "open") {
    if (community.visibility !== "open") return { ok: false, reason: community.visibility === "closed" ? "This community approves members — send a request instead." : "That community doesn't exist." };
  } else if (via === "request") {
    if (community.visibility !== "closed") return { ok: false, reason: community.visibility === "open" ? "This community is open — join it directly." : "That community doesn't exist." };
    if (membership?.status === "pending") return { ok: false, reason: "Your request is already waiting for approval." };
  } else if (via === "code") {
    const code = checkInviteCode(community, ctx.code, ctx.now);
    if (!code.ok) return code;
  } else if (via === "invite") {
    if (membership?.status !== "invited") return { ok: false, reason: "That invitation is no longer open." };
  } else {
    return { ok: false, reason: "Unknown way to join." };
  }

  // A request only reserves a place once approved, so the cap is checked on
  // joining, not on asking.
  if (via !== "request" && community.memberCap && (community.memberCount || 0) >= community.memberCap) {
    return { ok: false, reason: "This community is full." };
  }
  return { ok: true };
}

/** Posting, pinning and editing posts: the owner and moderators, while not archived. */
export function canPost(community, membership) {
  return Boolean(community && !community.archivedAt && isStaff(membership));
}

/** Approving, removing, banning, deleting others' posts and comments. */
export function canModerate(community, membership) {
  return Boolean(community && isStaff(membership));
}

/** Visibility, moderators, transfer, archive, delete: the owner alone. */
export function canManage(community, membership) {
  return Boolean(community && isOwner(membership));
}

/** Commenting: members when the owner allows it; staff always. */
export function canComment(community, membership) {
  if (!community || community.archivedAt) return false;
  if (isStaff(membership)) return true;
  return Boolean(community.allowComments && isActive(membership));
}

/**
 * A community-only test is visible (and can be registered for and sat) only
 * by active members of its community. Public tests are for everyone.
 */
export function canSeeTest(test, membership, actor) {
  if (!test) return false;
  if (test.audience !== "community") return true;
  if (actor && (actor.id === test.ownerId || actor.role === "admin")) return true;
  return isActive(membership);
}

/** Server-side limits on a community's own fields. Returns an error string or null. */
export function validateCommunityFields(fields) {
  const name = String(fields?.name || "").trim();
  if (name.length < 3 || name.length > 80) return "The name must be between 3 and 80 characters.";
  if (String(fields?.description || "").length > COMMUNITIES.MAX_DESCRIPTION_CHARS) return `The description can be at most ${COMMUNITIES.MAX_DESCRIPTION_CHARS} characters.`;
  if (fields?.visibility != null && !VISIBILITIES.includes(fields.visibility)) return "Choose Open, Closed or Invite only.";
  if (fields?.memberCap != null && fields.memberCap !== "") {
    const cap = Number(fields.memberCap);
    if (!Number.isInteger(cap) || cap < COMMUNITIES.MIN_MEMBER_CAP || cap > COMMUNITIES.MAX_MEMBERS) {
      return `A member cap must be a whole number between ${COMMUNITIES.MIN_MEMBER_CAP} and ${COMMUNITIES.MAX_MEMBERS}.`;
    }
  }
  return null;
}

/** Only http(s) links, trimmed, at most COMMUNITIES.MAX_LINKS_PER_POST. */
export function cleanLinks(links) {
  return (Array.isArray(links) ? links : [])
    .map((l) => ({ url: String(l?.url || "").trim(), title: String(l?.title || "").trim().slice(0, 150) }))
    .filter((l) => /^https?:\/\/[^\s]+$/i.test(l.url) && l.url.length <= 2000)
    .slice(0, COMMUNITIES.MAX_LINKS_PER_POST);
}

/** A URL-safe slug from the name. */
export function slugify(name) {
  return (
    String(name || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "community"
  );
}
