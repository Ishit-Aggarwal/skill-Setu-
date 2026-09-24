import { query, mutation, internalMutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authError, getActor, publicUser, requireActor, resolveInstitutionId } from "./_lib/authz";
import { findUserById } from "./_lib/tests";
import { findCommunity, membershipOf } from "./_lib/communityAccess";
import {
  actorInstitution,
  audit,
  bump,
  cancelCommunityRegistrations,
  newId,
  notify,
  requireStanding,
  sameSide,
  scheduleFanOut,
  staffOf,
  standing,
} from "./_lib/communityCore";
import {
  OWNER_ROLES,
  VISIBILITIES,
  canComment,
  canJoin,
  checkInviteCode,
  cleanLinks,
  isActive,
  isBanned,
  normaliseInviteCode,
  passesInstitution,
  slugify,
  validateCommunityFields,
} from "../lib/communityRules";
import { isBlockedFile } from "../lib/fileKinds";
import { isAyushSystem } from "../lib/ayush";
import { COMMUNITIES, CERTIFICATES } from "../lib/settings";

/**
 * Communities: spaces a professor or an institution runs for students.
 *
 * Every rule is enforced here — who can see a community, join it, post in
 * it, moderate it — through lib/communityRules.js; the screens only mirror
 * those answers to decide which buttons to draw. An Invite-only community is
 * "not found" to anyone who is not in it. A ban is final. Every moderation
 * action is written to the audit log. Notifications to members go out from a
 * scheduled fan-out in batches, never from the browser.
 */

const HOUR = 3600000;
const DAY = 24 * HOUR;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "24 Sep" in IST, without leaning on the runtime's Intl data. */
function shortDate(ms) {
  const d = new Date(ms + 5.5 * HOUR);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function inviteCode() {
  const alphabet = CERTIFICATES.VERIFY_ALPHABET;
  let out = "";
  for (let i = 0; i < COMMUNITIES.INVITE_CODE_LENGTH; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function uniqueInviteCode(ctx) {
  for (let i = 0; i < 10; i += 1) {
    const code = inviteCode();
    const clash = await ctx.db
      .query("communities")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!clash) return code;
  }
  throw new Error("Could not create an invite code. Please try again.");
}

async function coverUrl(ctx, community) {
  if (!community?.coverImage?.storageId) return null;
  try {
    return await ctx.storage.getUrl(community.coverImage.storageId);
  } catch {
    return null;
  }
}

/** What anyone allowed to know the community exists may see. Never the invite code. */
async function card(ctx, community, membership = null) {
  return {
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: community.description || "",
    ayushSystem: community.ayushSystem,
    subject: community.subject || null,
    courseLevel: community.courseLevel || null,
    visibility: community.visibility,
    ownerId: community.ownerId,
    ownerName: community.ownerName || "",
    ownerRole: community.ownerRole,
    institutionName: community.institutionName || "",
    sameInstitutionOnly: community.sameInstitutionOnly,
    memberCount: community.memberCount,
    memberCap: community.memberCap || null,
    archived: Boolean(community.archivedAt),
    coverUrl: await coverUrl(ctx, community),
    createdAt: community.createdAt,
    myStatus: membership?.status || null,
    myRole: membership?.status === "active" ? membership.role : null,
  };
}

/** The full record for members: settings, rules, counts. Staff also get the invite code. */
async function fullView(ctx, s) {
  const base = await card(ctx, s.community, s.membership);
  const out = {
    ...base,
    allowComments: s.community.allowComments,
    rules: s.community.rules || "",
    pendingCount: s.staff ? s.community.pendingCount : undefined,
    notificationsMuted: Boolean(s.membership?.notificationsMuted),
    lastSeenAt: s.membership?.lastSeenAt || null,
    isStaff: s.staff,
    isOwner: s.owner,
  };
  if (s.staff) {
    Object.assign(out, {
      inviteCode: s.community.inviteCode,
      inviteCodeExpiresAt: s.community.inviteCodeExpiresAt || null,
      inviteCodeMaxUses: s.community.inviteCodeMaxUses || null,
      inviteCodeUses: s.community.inviteCodeUses || 0,
      coverImage: s.community.coverImage || null,
    });
  }
  return out;
}

async function setMembership(ctx, community, userId, patch, actorId) {
  const existing = await membershipOf(ctx, community.id, userId);
  const now = Date.now();
  const row = { ...patch, statusChangedAt: now, statusChangedBy: actorId || null };
  if (existing) {
    await ctx.db.patch(existing._id, row);
    return { ...existing, ...row };
  }
  const user = await findUserById(ctx, userId);
  const full = {
    communityId: community.id,
    userId,
    userName: user?.name || "",
    role: "member",
    status: "active",
    notificationsMuted: false,
    lastSeenAt: null,
    joinedAt: null,
    ...row,
  };
  await ctx.db.insert("communityMembers", full);
  return full;
}

/* ============================================================
   Creating and managing a community
   ============================================================ */

const SETTINGS_ARGS = {
  name: v.string(),
  description: v.optional(v.string()),
  ayushSystem: v.string(),
  subject: v.optional(v.union(v.string(), v.null())),
  courseLevel: v.optional(v.union(v.string(), v.null())),
  coverImage: v.optional(v.any()),
  visibility: v.string(),
  sameInstitutionOnly: v.optional(v.boolean()),
  memberCap: v.optional(v.union(v.number(), v.null())),
  allowComments: v.optional(v.boolean()),
  rules: v.optional(v.string()),
};

async function cleanCover(ctx, actor, cover) {
  if (!cover || typeof cover !== "object" || !cover.storageId) return null;
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", cover.storageId))
    .first();
  if (!upload || upload.ownerId !== actor.id) throw new Error("Upload the cover image again.");
  if (!/^image\/(png|jpeg|webp)$/.test(upload.mimeType)) throw new Error("The cover must be a PNG, JPG or WebP image.");
  return { storageId: cover.storageId, fileName: upload.fileName, mimeType: upload.mimeType, bytes: upload.bytes };
}

export const create = mutation({
  args: { sessionToken: v.string(), id: v.optional(v.string()), ...SETTINGS_ARGS },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!OWNER_ROLES.includes(actor.role)) throw authError("Only professors and institutions can create communities.");
    const problem = validateCommunityFields(args);
    if (problem) throw new Error(problem);
    if (!isAyushSystem(args.ayushSystem)) throw new Error("Choose the AYUSH System this community is for.");

    const owned = await ctx.db
      .query("communities")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .collect();
    if (owned.length >= COMMUNITIES.MAX_OWNED) throw new Error(`You can own at most ${COMMUNITIES.MAX_OWNED} communities.`);
    const name = args.name.trim();
    const nameKey = name.toLowerCase();
    if (owned.some((c) => c.nameKey === nameKey)) throw new Error("You already have a community with that name.");

    const institutionId = await actorInstitution(ctx, actor);
    const institution = institutionId ? await findUserById(ctx, institutionId) : null;
    const now = Date.now();
    const community = {
      id: args.id && /^community_[\w-]{4,60}$/.test(args.id) ? args.id : newId("community"),
      ownerId: actor.id,
      ownerRole: actor.role === "institution" ? "institution" : "academician",
      ownerName: actor.user.instituteName && actor.role === "institution" ? actor.user.instituteName : actor.user.name || "",
      institutionId: institutionId || null,
      institutionName: institution?.instituteName || actor.user.instituteName || actor.user.institution || null,
      name,
      nameKey,
      slug: slugify(name),
      description: String(args.description || "").trim(),
      ayushSystem: args.ayushSystem,
      subject: args.subject || null,
      courseLevel: args.courseLevel || null,
      coverImage: await cleanCover(ctx, actor, args.coverImage),
      visibility: args.visibility,
      // Default: on for an institution's community, off for a professor's.
      sameInstitutionOnly: args.sameInstitutionOnly ?? actor.role === "institution",
      memberCap: args.memberCap || null,
      allowComments: Boolean(args.allowComments),
      rules: String(args.rules || "").slice(0, 2000),
      inviteCode: await uniqueInviteCode(ctx),
      inviteCodeExpiresAt: null,
      inviteCodeMaxUses: null,
      inviteCodeUses: 0,
      memberCount: 1,
      pendingCount: 0,
      requestDigestAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    if (community.sameInstitutionOnly && !community.institutionId) {
      throw new Error("Your account isn't linked to an institution yet, so the community can't be limited to its students. Turn that setting off or complete your institution in your profile.");
    }
    await ctx.db.insert("communities", community);
    await ctx.db.insert("communityMembers", {
      communityId: community.id,
      userId: actor.id,
      userName: community.ownerName,
      role: "owner",
      status: "active",
      joinedAt: now,
      statusChangedAt: now,
      statusChangedBy: actor.id,
      notificationsMuted: false,
      lastSeenAt: now,
    });
    return { ok: true, id: community.id };
  },
});

export const updateSettings = mutation({
  args: {
    sessionToken: v.string(),
    communityId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    ayushSystem: v.optional(v.string()),
    subject: v.optional(v.union(v.string(), v.null())),
    courseLevel: v.optional(v.union(v.string(), v.null())),
    coverImage: v.optional(v.any()),
    visibility: v.optional(v.string()),
    sameInstitutionOnly: v.optional(v.boolean()),
    memberCap: v.optional(v.union(v.number(), v.null())),
    allowComments: v.optional(v.boolean()),
    rules: v.optional(v.string()),
    approvePending: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "owner" });
    const { community } = s;
    const next = { ...community, ...Object.fromEntries(Object.entries(args).filter(([k, val]) => val !== undefined && !["sessionToken", "communityId", "approvePending"].includes(k))) };
    const problem = validateCommunityFields(next);
    if (problem) throw new Error(problem);
    const patch = { updatedAt: Date.now() };
    if (args.name !== undefined && args.name.trim() !== community.name) {
      const nameKey = args.name.trim().toLowerCase();
      const clash = await ctx.db
        .query("communities")
        .withIndex("by_owner_name", (q) => q.eq("ownerId", community.ownerId).eq("nameKey", nameKey))
        .first();
      if (clash && clash.id !== community.id) throw new Error("You already have a community with that name.");
      Object.assign(patch, { name: args.name.trim(), nameKey, slug: slugify(args.name) });
    }
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.ayushSystem !== undefined) {
      if (!isAyushSystem(args.ayushSystem)) throw new Error("Choose a valid AYUSH System.");
      patch.ayushSystem = args.ayushSystem;
    }
    if (args.subject !== undefined) patch.subject = args.subject || null;
    if (args.courseLevel !== undefined) patch.courseLevel = args.courseLevel || null;
    if (args.coverImage !== undefined) {
      const cover = await cleanCover(ctx, actor, args.coverImage);
      if (community.coverImage?.storageId && community.coverImage.storageId !== cover?.storageId) {
        try {
          await ctx.storage.delete(community.coverImage.storageId);
        } catch {
          /* already gone */
        }
      }
      patch.coverImage = cover;
    }
    if (args.memberCap !== undefined) patch.memberCap = args.memberCap || null;
    if (args.allowComments !== undefined) patch.allowComments = args.allowComments;
    if (args.rules !== undefined) patch.rules = args.rules.slice(0, 2000);
    if (args.sameInstitutionOnly !== undefined) {
      if (args.sameInstitutionOnly && !community.institutionId) throw new Error("This community isn't linked to an institution, so it can't be limited to one.");
      patch.sameInstitutionOnly = args.sameInstitutionOnly;
    }
    if (args.visibility !== undefined && args.visibility !== community.visibility) {
      if (!VISIBILITIES.includes(args.visibility)) throw new Error("Choose Open, Closed or Invite only.");
      patch.visibility = args.visibility;
      await audit(ctx, community, actor, "visibility", null, `${community.visibility} → ${args.visibility}`);
    }
    await ctx.db.patch(community._id, patch);

    // Moving to Open never approves anyone by itself; the owner is asked
    // first and says yes here.
    if (args.approvePending) {
      const pending = await ctx.db
        .query("communityMembers")
        .withIndex("by_community_status", (q) => q.eq("communityId", community.id).eq("status", "pending"))
        .collect();
      for (const m of pending) await approveOne(ctx, { ...community, ...patch }, actor, m);
    }
    return { ok: true };
  },
});

export const regenerateCode = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), expiresInDays: v.optional(v.union(v.number(), v.null())), maxUses: v.optional(v.union(v.number(), v.null())) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const days = args.expiresInDays ? Math.max(1, Math.min(365, Math.round(args.expiresInDays))) : null;
    const maxUses = args.maxUses ? Math.max(1, Math.min(COMMUNITIES.MAX_MEMBERS, Math.round(args.maxUses))) : null;
    const code = await uniqueInviteCode(ctx);
    await ctx.db.patch(s.community._id, {
      inviteCode: code,
      inviteCodeExpiresAt: days ? Date.now() + days * DAY : null,
      inviteCodeMaxUses: maxUses,
      inviteCodeUses: 0,
      updatedAt: Date.now(),
    });
    await audit(ctx, s.community, actor, "regenerate_code", null, `${days ? `${days} days` : "no expiry"}, ${maxUses ? `${maxUses} uses` : "unlimited uses"}`);
    return { ok: true, inviteCode: code };
  },
});

export const setArchived = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), archived: v.boolean() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "owner" });
    await ctx.db.patch(s.community._id, { archivedAt: args.archived ? Date.now() : null, updatedAt: Date.now() });
    await audit(ctx, s.community, actor, args.archived ? "archive" : "unarchive");
    return { ok: true };
  },
});

/**
 * Deletes a community: posts, comments, memberships, downloads, reports and
 * the files behind them. Its tests are not deleted — attempts and
 * certificates must survive — they simply become visible to their host only.
 */
export const remove = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), confirmName: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "owner" });
    const { community } = s;
    if (args.confirmName.trim() !== community.name) throw new Error("Type the community's name exactly to confirm.");
    const files = new Set();
    if (community.coverImage?.storageId) files.add(community.coverImage.storageId);
    for (const table of ["communityPosts", "communityComments", "communityDownloads", "communityReports", "communityAudit", "communityMembers"]) {
      const index = { communityPosts: "by_community_created", communityComments: "by_community", communityDownloads: "by_community", communityReports: "by_community_status", communityAudit: "by_community", communityMembers: "by_community_status" }[table];
      const rows = await ctx.db
        .query(table)
        .withIndex(index, (q) => q.eq("communityId", community.id))
        .collect();
      for (const row of rows) {
        if (table === "communityPosts") (row.attachments || []).forEach((a) => a?.storageId && files.add(a.storageId));
        await ctx.db.delete(row._id);
      }
    }
    for (const storageId of files) {
      try {
        await ctx.storage.delete(storageId);
      } catch {
        /* already gone */
      }
    }
    await ctx.db.delete(community._id);
    return { ok: true };
  },
});

/** Ownership passes to another professor or institution account of the same institution. */
export const transfer = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), toEmail: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "owner" });
    const { community } = s;
    const target = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", String(args.toEmail).trim().toLowerCase()))
      .first();
    if (!target || !OWNER_ROLES.includes(target.role)) throw new Error("Enter the email of a professor or institution account.");
    if (target.id === community.ownerId) throw new Error("That account already owns this community.");
    if (!sameSide(actor.id, target.id)) throw new Error("Enter the email of a professor or institution account.");
    const targetInstitution = await resolveInstitutionId(ctx, target);
    if (!community.institutionId || targetInstitution !== community.institutionId) throw new Error("Ownership can only pass to an account of the same institution.");

    const now = Date.now();
    const oldOwner = await membershipOf(ctx, community.id, community.ownerId);
    if (oldOwner) {
      // A professor stays on as a moderator; an institution account steps out.
      await ctx.db.patch(oldOwner._id, community.ownerRole === "academician" ? { role: "moderator", statusChangedAt: now, statusChangedBy: actor.id } : { status: "removed", statusChangedAt: now, statusChangedBy: actor.id });
      if (community.ownerRole !== "academician") await bump(ctx, community, { members: -1 });
    }
    const existing = await membershipOf(ctx, community.id, target.id);
    if (existing) {
      await ctx.db.patch(existing._id, { role: "owner", status: "active", statusChangedAt: now, statusChangedBy: actor.id, joinedAt: existing.joinedAt || now });
      if (existing.status !== "active") await bump(ctx, community, { members: 1 });
    } else {
      await ctx.db.insert("communityMembers", { communityId: community.id, userId: target.id, userName: target.name || target.instituteName || "", role: "owner", status: "active", joinedAt: now, statusChangedAt: now, statusChangedBy: actor.id, notificationsMuted: false, lastSeenAt: null });
      await bump(ctx, community, { members: 1 });
    }
    await ctx.db.patch(community._id, {
      ownerId: target.id,
      ownerRole: target.role === "institution" ? "institution" : "academician",
      ownerName: target.role === "institution" ? target.instituteName || target.name || "" : target.name || "",
      updatedAt: now,
    });
    await audit(ctx, community, actor, "transfer", target.id);
    await notify(ctx, target.id, {
      kind: "community_message",
      message: `You are now the owner of ${community.name}.`,
      from: community.name,
      link: `/communities/${community.id}`,
      communityId: community.id,
      senderId: actor.id,
    });
    return { ok: true };
  },
});

/** Moderators: other professors (added by email), at most COMMUNITIES.MAX_MODERATORS. */
export const setModerator = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), email: v.optional(v.string()), userId: v.optional(v.string()), moderator: v.boolean() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "owner" });
    const { community } = s;
    const target = args.userId
      ? await findUserById(ctx, args.userId)
      : await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", String(args.email || "").trim().toLowerCase()))
          .first();
    if (!target || target.role !== "academician" || !sameSide(actor.id, target.id)) throw new Error("Moderators must be professor (academician) accounts.");
    if (target.id === community.ownerId) throw new Error("The owner can't also be a moderator.");
    if (community.ownerRole === "institution") {
      const theirs = await resolveInstitutionId(ctx, target);
      if (theirs !== community.ownerId) throw new Error("An institution's moderators must be its own faculty.");
    }
    const existing = await membershipOf(ctx, community.id, target.id);
    if (args.moderator) {
      const mods = (await staffOf(ctx, community.id)).filter((m) => m.role === "moderator");
      if (mods.length >= COMMUNITIES.MAX_MODERATORS && !(existing?.role === "moderator" && isActive(existing))) throw new Error(`A community can have at most ${COMMUNITIES.MAX_MODERATORS} moderators.`);
      await setMembership(ctx, community, target.id, { role: "moderator", status: "active", joinedAt: existing?.joinedAt || Date.now(), userName: target.name || "" }, actor.id);
      if (!isActive(existing)) await bump(ctx, community, { members: 1 });
      await audit(ctx, community, actor, "add_moderator", target.id);
      await notify(ctx, target.id, { kind: "community_message", message: `You're now a moderator of ${community.name}.`, from: community.name, link: `/communities/${community.id}`, communityId: community.id, senderId: actor.id });
    } else {
      if (!existing || existing.role !== "moderator") throw new Error("That account isn't a moderator here.");
      await setMembership(ctx, community, target.id, { role: "member", status: "removed" }, actor.id);
      if (isActive(existing)) await bump(ctx, community, { members: -1 });
      await audit(ctx, community, actor, "remove_moderator", target.id);
    }
    return { ok: true };
  },
});

/* ============================================================
   Joining and leaving (students)
   ============================================================ */

async function joinContext(ctx, actor, s, code) {
  return { actorInstitutionId: s.community.sameInstitutionOnly ? await actorInstitution(ctx, actor) : null, code, now: Date.now() };
}

function refuse(result) {
  if (!result.ok) throw new Error(result.reason);
}

/** Owners and moderators hear about join requests at most once an hour per community. */
async function requestDigest(ctx, community) {
  const fresh = await ctx.db.get(community._id);
  const last = fresh.requestDigestAt || 0;
  if (Date.now() - last < COMMUNITIES.REQUEST_DIGEST_MINUTES * 60000) return;
  await ctx.db.patch(community._id, { requestDigestAt: Date.now() });
  const n = fresh.pendingCount || 1;
  for (const staff of await staffOf(ctx, community.id)) {
    await notify(ctx, staff.userId, {
      kind: "community_request",
      message: `${n} join request${n === 1 ? "" : "s"} waiting in ${community.name}.`,
      from: community.name,
      link: `/communities/${community.id}?tab=requests`,
      communityId: community.id,
    });
  }
}

export const join = mutation({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId);
    refuse(canJoin(s.community, s.membership, actor, "open", await joinContext(ctx, actor, s)));
    await setMembership(ctx, s.community, actor.id, { role: "member", status: "active", joinedAt: Date.now(), lastSeenAt: null, requestNote: null }, actor.id);
    await bump(ctx, s.community, { members: 1 });
    return { ok: true };
  },
});

export const requestJoin = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId);
    refuse(canJoin(s.community, s.membership, actor, "request", await joinContext(ctx, actor, s)));
    await setMembership(ctx, s.community, actor.id, { role: "member", status: "pending", requestNote: String(args.note || "").trim().slice(0, COMMUNITIES.MAX_REQUEST_NOTE_CHARS) || null }, actor.id);
    await bump(ctx, s.community, { pending: 1 });
    await requestDigest(ctx, s.community);
    return { ok: true };
  },
});

export const cancelRequest = mutation({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId);
    if (s.membership?.status !== "pending") throw new Error("You don't have a request waiting here.");
    await setMembership(ctx, s.community, actor.id, { status: "left", requestNote: null }, actor.id);
    await bump(ctx, s.community, { pending: -1 });
    return { ok: true };
  },
});

/** What an invite code opens, shown on the join page — only once the code is valid. */
export const byCode = query({
  args: { sessionToken: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const code = normaliseInviteCode(args.code);
    if (code.length !== COMMUNITIES.INVITE_CODE_LENGTH) return { ok: false, reason: "That invite code isn't valid." };
    const community = await ctx.db
      .query("communities")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!community || !sameSide(actor.id, community.ownerId)) return { ok: false, reason: "That invite code isn't valid." };
    const valid = checkInviteCode(community, code);
    if (!valid.ok) return valid;
    const membership = await membershipOf(ctx, community.id, actor.id);
    const verdict = canJoin(community, membership, actor, "code", { actorInstitutionId: community.sameInstitutionOnly ? await actorInstitution(ctx, actor) : null, code });
    return { ok: true, community: await card(ctx, community, membership), canJoin: verdict.ok, reason: verdict.ok ? null : verdict.reason, alreadyMember: isActive(membership) };
  },
});

export const joinByCode = mutation({
  args: { sessionToken: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const code = normaliseInviteCode(args.code);
    const community = await ctx.db
      .query("communities")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!community || !sameSide(actor.id, community.ownerId)) throw new Error("That invite code isn't valid.");
    const membership = await membershipOf(ctx, community.id, actor.id);
    refuse(canJoin(community, membership, actor, "code", { actorInstitutionId: community.sameInstitutionOnly ? await actorInstitution(ctx, actor) : null, code, now: Date.now() }));
    await setMembership(ctx, community, actor.id, { role: "member", status: "active", joinedAt: Date.now(), lastSeenAt: null, requestNote: null }, actor.id);
    await bump(ctx, community, { members: 1, pending: membership?.status === "pending" ? -1 : 0 });
    await ctx.db.patch(community._id, { inviteCodeUses: (community.inviteCodeUses || 0) + 1 });
    return { ok: true, communityId: community.id };
  },
});

export const acceptInvite = mutation({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId);
    refuse(canJoin(s.community, s.membership, actor, "invite", await joinContext(ctx, actor, s)));
    await setMembership(ctx, s.community, actor.id, { role: "member", status: "active", joinedAt: Date.now() }, actor.id);
    await bump(ctx, s.community, { members: 1 });
    return { ok: true };
  },
});

export const declineInvite = mutation({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId);
    if (s.membership?.status !== "invited") throw new Error("That invitation is no longer open.");
    await setMembership(ctx, s.community, actor.id, { status: "declined" }, actor.id);
    return { ok: true };
  },
});

export const leave = mutation({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId);
    if (!isActive(s.membership)) throw new Error("You're not a member of this community.");
    if (s.membership.role === "owner") throw new Error("The owner can't leave — transfer ownership or delete the community.");
    await setMembership(ctx, s.community, actor.id, { status: "left", role: "member" }, actor.id);
    await bump(ctx, s.community, { members: -1 });
    await cancelCommunityRegistrations(ctx, s.community, actor.id);
    return { ok: true };
  },
});

export const setMuted = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), muted: v.boolean() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "full" });
    if (s.membership) await ctx.db.patch(s.membership._id, { notificationsMuted: args.muted });
    return { ok: true };
  },
});

/** Opening the community page: "seen up to now", which clears the unread badge. */
export const markSeen = mutation({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await standing(ctx, actor, args.communityId);
    if (!s || !isActive(s.membership)) return { ok: false };
    await ctx.db.patch(s.membership._id, { lastSeenAt: Date.now() });
    return { ok: true };
  },
});

/* ============================================================
   Moderation
   ============================================================ */

async function targetMembership(ctx, community, userId) {
  const m = await membershipOf(ctx, community.id, userId);
  if (!m) throw new Error("That student isn't in this community.");
  if (m.role === "owner") throw new Error("The owner can't be moderated.");
  return m;
}

async function approveOne(ctx, community, actor, m) {
  if (m.status !== "pending") return false;
  if (community.memberCap && (community.memberCount || 0) >= community.memberCap) throw new Error("This community is full.");
  await setMembership(ctx, community, m.userId, { status: "active", joinedAt: Date.now() }, actor.id);
  await bump(ctx, community, { members: 1, pending: -1 });
  await audit(ctx, community, actor, "approve", m.userId);
  await notify(ctx, m.userId, { kind: "community_approved", message: `You've been accepted into ${community.name}.`, from: community.name, link: `/communities/${community.id}`, communityId: community.id, senderId: actor.id });
  return true;
}

export const approve = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    let approved = 0;
    for (const userId of args.userIds.slice(0, 500)) {
      const m = await membershipOf(ctx, s.community.id, userId);
      const fresh = await ctx.db.get(s.community._id);
      if (m && (await approveOne(ctx, fresh, actor, m))) approved += 1;
    }
    return { ok: true, approved };
  },
});

export const decline = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    let declined = 0;
    for (const userId of args.userIds.slice(0, 500)) {
      const m = await membershipOf(ctx, s.community.id, userId);
      if (!m || m.status !== "pending") continue;
      await setMembership(ctx, s.community, userId, { status: "declined" }, actor.id);
      await bump(ctx, s.community, { pending: -1 });
      await audit(ctx, s.community, actor, "decline", userId);
      await notify(ctx, userId, { kind: "community_declined", message: `Your request to join ${s.community.name} wasn't accepted.`, from: s.community.name, link: "/communities", communityId: s.community.id, senderId: actor.id });
      declined += 1;
    }
    return { ok: true, declined };
  },
});

/** Kick: out now; free to rejoin an Open community or ask again for a Closed one. */
export const removeMember = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    let removed = 0;
    for (const userId of args.userIds.slice(0, 500)) {
      const m = await targetMembership(ctx, s.community, userId);
      if (m.role === "moderator" && !s.owner) throw authError("Only the owner can remove a moderator.");
      if (!isActive(m)) continue;
      await setMembership(ctx, s.community, userId, { status: "removed", role: "member" }, actor.id);
      await bump(ctx, s.community, { members: -1 });
      await audit(ctx, s.community, actor, "remove", userId);
      await cancelCommunityRegistrations(ctx, s.community, userId);
      await notify(ctx, userId, { kind: "community_removed", message: `You've been removed from ${s.community.name}.`, from: s.community.name, link: "/communities", communityId: s.community.id, senderId: actor.id });
      removed += 1;
    }
    return { ok: true, removed };
  },
});

/**
 * Ban: out and kept out — no rejoining, requests, codes or invitations. The
 * reason is recorded for the staff and never shown to the student.
 */
export const ban = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), userId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const reason = args.reason.trim();
    if (reason.length < 3) throw new Error("Give a reason for the ban (it is not shown to the student).");
    const m = await membershipOf(ctx, s.community.id, args.userId);
    if (m?.role === "owner") throw new Error("The owner can't be banned.");
    if (m?.role === "moderator" && !s.owner) throw authError("Only the owner can ban a moderator.");
    const target = await findUserById(ctx, args.userId);
    if (!target || !sameSide(actor.id, target.id)) throw new Error("That student isn't on Skill Setu.");
    await setMembership(ctx, s.community, args.userId, { status: "banned", role: "member", banReason: reason.slice(0, 300), userName: target.name || m?.userName || "" }, actor.id);
    await bump(ctx, s.community, { members: isActive(m) ? -1 : 0, pending: m?.status === "pending" ? -1 : 0 });
    await audit(ctx, s.community, actor, "ban", args.userId, reason);
    await cancelCommunityRegistrations(ctx, s.community, args.userId);
    await notify(ctx, args.userId, { kind: "community_banned", message: `You've been removed from ${s.community.name}.`, from: s.community.name, link: "/communities", communityId: s.community.id, senderId: actor.id });
    return { ok: true };
  },
});

export const unban = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const m = await membershipOf(ctx, s.community.id, args.userId);
    if (!isBanned(m)) throw new Error("That student isn't banned.");
    await setMembership(ctx, s.community, args.userId, { status: "removed", banReason: null }, actor.id);
    await audit(ctx, s.community, actor, "unban", args.userId);
    return { ok: true };
  },
});

/** Direct invitations: each student gets an Accept / Decline in their inbox. */
export const invite = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const { community } = s;
    if (community.archivedAt) throw new Error("This community is archived.");
    let invited = 0;
    const skipped = [];
    for (const userId of args.userIds.slice(0, 500)) {
      const student = await findUserById(ctx, userId);
      if (!student || student.role !== "student" || !sameSide(actor.id, student.id)) {
        skipped.push(userId);
        continue;
      }
      const m = await membershipOf(ctx, community.id, userId);
      if (isActive(m) || isBanned(m) || m?.status === "invited") {
        skipped.push(userId);
        continue;
      }
      if (community.sameInstitutionOnly && !passesInstitution(community, await resolveInstitutionId(ctx, student))) {
        skipped.push(userId);
        continue;
      }
      await setMembership(ctx, community, userId, { role: "member", status: "invited", invitedBy: actor.id, userName: student.name || "" }, actor.id);
      if (m?.status === "pending") await bump(ctx, community, { pending: -1 });
      await notify(ctx, userId, {
        id: `notif_invite_${community.id}_${userId}_${Date.now().toString(36)}`,
        kind: "community_invite",
        message: `You're invited to join ${community.name} (${community.ownerName}). Open it to accept or decline.`,
        from: community.name,
        link: `/communities/${community.id}`,
        communityId: community.id,
        senderId: actor.id,
      });
      invited += 1;
    }
    return { ok: true, invited, skipped: skipped.length };
  },
});

/** A notification to selected members (bulk "Message"). */
export const messageMembers = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), userIds: v.array(v.string()), message: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const text = args.message.trim().slice(0, 500);
    if (!text) throw new Error("Write a message first.");
    let sent = 0;
    for (const userId of args.userIds.slice(0, COMMUNITIES.NOTIFY_BATCH * 5)) {
      const m = await membershipOf(ctx, s.community.id, userId);
      if (!isActive(m)) continue;
      await notify(ctx, userId, { kind: "community_message", message: `${s.community.name}: ${text}`, from: actor.user?.name || s.community.name, link: `/communities/${s.community.id}`, communityId: s.community.id, senderId: actor.id });
      sent += 1;
    }
    return { ok: true, sent };
  },
});

/* ============================================================
   Posts, pins, comments, reports
   ============================================================ */

async function cleanAttachments(ctx, actor, list, keep = []) {
  const kept = new Map(keep.map((a) => [a.storageId, a]));
  const out = [];
  for (const a of (Array.isArray(list) ? list : []).slice(0, COMMUNITIES.MAX_ATTACHMENTS_PER_POST)) {
    if (!a || typeof a.storageId !== "string") continue;
    if (kept.has(a.storageId)) {
      out.push(kept.get(a.storageId));
      continue;
    }
    const upload = await ctx.db
      .query("uploads")
      .withIndex("by_storage", (q) => q.eq("storageId", a.storageId))
      .first();
    if (!upload || upload.ownerId !== actor.id) throw new Error(`"${a.fileName || "A file"}" isn't one of your uploads — attach it again.`);
    if (isBlockedFile(upload.fileName, upload.mimeType)) throw new Error("That kind of file isn't allowed.");
    out.push({ fileId: a.storageId, storageId: a.storageId, fileName: upload.fileName, mimeType: upload.mimeType, bytes: upload.bytes });
  }
  return out;
}

function cleanPostText({ title, body }) {
  const t = String(title || "").trim();
  if (!t) throw new Error("Give the post a title.");
  if (t.length > COMMUNITIES.MAX_TITLE_CHARS) throw new Error(`Titles can be at most ${COMMUNITIES.MAX_TITLE_CHARS} characters.`);
  const b = String(body || "");
  if (b.length > COMMUNITIES.MAX_POST_CHARS) throw new Error(`Posts can be at most ${COMMUNITIES.MAX_POST_CHARS} characters.`);
  return { title: t, body: b };
}

async function pinnedCount(ctx, communityId) {
  const pinned = await ctx.db
    .query("communityPosts")
    .withIndex("by_community_pinned", (q) => q.eq("communityId", communityId).eq("pinned", true))
    .collect();
  return pinned.filter((p) => !p.deletedAt).length;
}

const POST_TYPES = ["announcement", "material", "link", "test"];

export const createPost = mutation({
  args: {
    sessionToken: v.string(),
    communityId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    attachments: v.optional(v.array(v.any())),
    links: v.optional(v.array(v.any())),
    testId: v.optional(v.union(v.string(), v.null())),
    pinned: v.optional(v.boolean()),
    notify: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    if (s.community.archivedAt) throw new Error("This community is archived — unarchive it to post.");
    if (!POST_TYPES.includes(args.type)) throw new Error("Choose a post type.");
    const text = cleanPostText(args);
    if (args.pinned && (await pinnedCount(ctx, s.community.id)) >= COMMUNITIES.MAX_PINNED) {
      throw new Error(`At most ${COMMUNITIES.MAX_PINNED} posts can be pinned. Unpin one first.`);
    }
    const now = Date.now();
    const post = {
      id: newId("post"),
      communityId: s.community.id,
      authorId: actor.id,
      authorName: actor.user?.name || actor.user?.instituteName || "",
      type: args.type,
      ...text,
      attachments: await cleanAttachments(ctx, actor, args.attachments),
      links: cleanLinks(args.links),
      testId: args.type === "test" ? args.testId || null : null,
      pinned: Boolean(args.pinned),
      pinnedAt: args.pinned ? now : null,
      pinOrder: args.pinned ? now : null,
      createdAt: now,
    };
    await ctx.db.insert("communityPosts", post);
    if (args.notify !== false) {
      await scheduleFanOut(ctx, {
        key: post.id,
        community: s.community,
        post,
        kind: args.type === "test" ? "community_test" : "community_post",
        message: `${s.community.name}: ${post.title}`,
        from: post.authorName || s.community.name,
        link: `/communities/${s.community.id}?post=${post.id}`,
        authorId: actor.id,
      });
    }
    return { ok: true, id: post.id };
  },
});

async function staffPost(ctx, actor, postId) {
  const post = await ctx.db
    .query("communityPosts")
    .withIndex("by_client_id", (q) => q.eq("id", postId))
    .first();
  if (!post || post.deletedAt) throw new Error("That post no longer exists.");
  const s = await requireStanding(ctx, actor, post.communityId, { need: "staff" });
  return { post, s };
}

export const updatePost = mutation({
  args: {
    sessionToken: v.string(),
    postId: v.string(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    attachments: v.optional(v.array(v.any())),
    links: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const { post } = await staffPost(ctx, actor, args.postId);
    const text = cleanPostText({ title: args.title ?? post.title, body: args.body ?? post.body });
    const patch = { ...text, editedAt: Date.now() };
    if (args.links !== undefined) patch.links = cleanLinks(args.links);
    if (args.attachments !== undefined) {
      const next = await cleanAttachments(ctx, actor, args.attachments, post.attachments || []);
      const keep = new Set(next.map((a) => a.storageId));
      for (const a of post.attachments || []) {
        if (keep.has(a.storageId)) continue;
        try {
          await ctx.storage.delete(a.storageId);
        } catch {
          /* already gone */
        }
      }
      patch.attachments = next;
    }
    await ctx.db.patch(post._id, patch);
    return { ok: true };
  },
});

/** Soft delete; the files go from storage a week later (purgeDeletedPosts). */
export const deletePost = mutation({
  args: { sessionToken: v.string(), postId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const { post, s } = await staffPost(ctx, actor, args.postId);
    await ctx.db.patch(post._id, { deletedAt: Date.now(), pinned: false });
    await audit(ctx, s.community, actor, "delete_post", post.id, post.title);
    return { ok: true };
  },
});

export const setPinned = mutation({
  args: { sessionToken: v.string(), postId: v.string(), pinned: v.boolean(), notifyAgain: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const { post, s } = await staffPost(ctx, actor, args.postId);
    if (args.pinned && !post.pinned && (await pinnedCount(ctx, s.community.id)) >= COMMUNITIES.MAX_PINNED) {
      throw new Error(`At most ${COMMUNITIES.MAX_PINNED} posts can be pinned. Unpin one first.`);
    }
    const now = Date.now();
    await ctx.db.patch(post._id, args.pinned ? { pinned: true, pinnedAt: now, pinOrder: now } : { pinned: false, pinnedAt: null, pinOrder: null });
    await audit(ctx, s.community, actor, args.pinned ? "pin" : "unpin", post.id, post.title);
    if (args.pinned && args.notifyAgain) {
      await scheduleFanOut(ctx, {
        key: `${post.id}_repin_${now}`,
        community: s.community,
        post,
        kind: "community_post",
        message: `📌 ${s.community.name}: ${post.title}`,
        from: s.community.name,
        link: `/communities/${s.community.id}?post=${post.id}`,
        authorId: actor.id,
      });
    }
    return { ok: true };
  },
});

export const reorderPins = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), postIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    let order = 1;
    for (const id of args.postIds.slice(0, COMMUNITIES.MAX_PINNED)) {
      const post = await ctx.db
        .query("communityPosts")
        .withIndex("by_client_id", (q) => q.eq("id", id))
        .first();
      if (!post || post.communityId !== s.community.id || !post.pinned) continue;
      await ctx.db.patch(post._id, { pinOrder: order });
      order += 1;
    }
    return { ok: true };
  },
});

async function memberPost(ctx, actor, postId) {
  const post = await ctx.db
    .query("communityPosts")
    .withIndex("by_client_id", (q) => q.eq("id", postId))
    .first();
  if (!post || post.deletedAt) throw new Error("That post no longer exists.");
  const s = await requireStanding(ctx, actor, post.communityId, { need: "full" });
  return { post, s };
}

export const comment = mutation({
  args: { sessionToken: v.string(), postId: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const { post, s } = await memberPost(ctx, actor, args.postId);
    if (!canComment(s.community, s.membership) && actor.role !== "admin") throw authError("Comments are switched off in this community.");
    const body = args.body.trim();
    if (!body) throw new Error("Write a comment first.");
    if (body.length > COMMUNITIES.MAX_COMMENT_CHARS) throw new Error(`Comments can be at most ${COMMUNITIES.MAX_COMMENT_CHARS} characters.`);
    const row = { id: newId("comment"), postId: post.id, communityId: post.communityId, authorId: actor.id, authorName: actor.user?.name || "", body, deletedAt: null, deletedBy: null, createdAt: Date.now() };
    await ctx.db.insert("communityComments", row);
    return { ok: true, id: row.id };
  },
});

export const deleteComment = mutation({
  args: { sessionToken: v.string(), commentId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const row = await ctx.db
      .query("communityComments")
      .withIndex("by_client_id", (q) => q.eq("id", args.commentId))
      .first();
    if (!row || row.deletedAt) throw new Error("That comment no longer exists.");
    const s = await requireStanding(ctx, actor, row.communityId, { need: "full" });
    // Authors may delete their own; staff may delete anyone's (and it is logged).
    if (row.authorId !== actor.id && !s.staff) throw authError("You can only delete your own comments.");
    await ctx.db.patch(row._id, { deletedAt: Date.now(), deletedBy: actor.id });
    if (row.authorId !== actor.id) await audit(ctx, s.community, actor, "delete_comment", row.id, row.body.slice(0, 80));
    return { ok: true };
  },
});

export const report = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), postId: v.optional(v.string()), commentId: v.optional(v.string()), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "full" });
    const reason = args.reason.trim().slice(0, 500);
    if (!reason) throw new Error("Say what's wrong with it.");
    if (!args.postId && !args.commentId) throw new Error("Report a post or a comment.");
    await ctx.db.insert("communityReports", { communityId: s.community.id, postId: args.postId || null, commentId: args.commentId || null, reporterId: actor.id, reason, status: "open", createdAt: Date.now() });
    for (const staff of await staffOf(ctx, s.community.id)) {
      await notify(ctx, staff.userId, { kind: "community_report", message: `A ${args.commentId ? "comment" : "post"} was reported in ${s.community.name}: "${reason.slice(0, 80)}"`, from: s.community.name, link: `/communities/${s.community.id}?tab=reports`, communityId: s.community.id });
    }
    return { ok: true };
  },
});

export const resolveReport = mutation({
  args: { sessionToken: v.string(), communityId: v.string(), reportId: v.id("communityReports") },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const row = await ctx.db.get(args.reportId);
    if (!row || row.communityId !== s.community.id) throw new Error("That report no longer exists.");
    await ctx.db.patch(row._id, { status: "resolved" });
    return { ok: true };
  },
});

/**
 * A file's URL, only for an active member, the staff or an admin — and the
 * download is logged (one row per student per file, for the unique count).
 * A URL once fetched stays valid (a storage limitation); a student removed or
 * banned can never get a new one.
 */
export const attachmentUrl = mutation({
  args: { sessionToken: v.string(), postId: v.string(), fileId: v.string(), download: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const { post, s } = await memberPost(ctx, actor, args.postId);
    const file = (post.attachments || []).find((a) => a.fileId === args.fileId);
    if (!file) throw new Error("That file is no longer attached.");
    // The demo tour's sample materials are small files shipped with the site
    // (public/demo); everything a real account posts is in file storage.
    const url = file.storageId ? await ctx.storage.getUrl(file.storageId) : /^\/demo\/[\w.-]+$/.test(file.publicPath || "") ? file.publicPath : null;
    if (!url) throw new Error("That file is no longer available.");
    if (!s.staff) {
      const seen = await ctx.db
        .query("communityDownloads")
        .withIndex("by_post_file_user", (q) => q.eq("postId", post.id).eq("fileId", file.fileId).eq("userId", actor.id))
        .first();
      if (!seen) await ctx.db.insert("communityDownloads", { communityId: post.communityId, postId: post.id, fileId: file.fileId, userId: actor.id, at: Date.now() });
    }
    return { ok: true, url, fileName: file.fileName, mimeType: file.mimeType };
  },
});

/* ============================================================
   Reading
   ============================================================ */

/**
 * The caller's communities: those they run (with pending counts), those they
 * belong to (with unread counts), and — for students — their pending
 * requests and open invitations.
 */
export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx, args.sessionToken);
    if (!actor) return null;
    const out = { running: [], joined: [], pending: [], invitations: [] };
    for (const status of ["active", "pending", "invited"]) {
      const rows = await ctx.db
        .query("communityMembers")
        .withIndex("by_user_status", (q) => q.eq("userId", actor.id).eq("status", status))
        .collect();
      for (const m of rows) {
        const community = await findCommunity(ctx, m.communityId);
        if (!community || !sameSide(actor.id, community.ownerId)) continue;
        const base = await card(ctx, community, m);
        if (status === "pending") out.pending.push(base);
        else if (status === "invited") out.invitations.push(base);
        else if (m.role === "owner" || m.role === "moderator") out.running.push({ ...base, pendingCount: community.pendingCount, role: m.role });
        else {
          const since = m.lastSeenAt || m.joinedAt || 0;
          const fresh = await ctx.db
            .query("communityPosts")
            .withIndex("by_community_created", (q) => q.eq("communityId", community.id).gt("createdAt", since))
            .take(100);
          out.joined.push({ ...base, unread: fresh.filter((p) => !p.deletedAt && p.authorId !== actor.id).length, notificationsMuted: Boolean(m.notificationsMuted) });
        }
      }
    }
    return out;
  },
});

/**
 * Discover: Open and Closed communities only (never Invite-only), not
 * archived, never one that banned the caller, and a same-institution-only
 * community only to its own institution's students — anyone else would see
 * a Join button that always fails.
 */
export const discover = query({
  args: { sessionToken: v.string(), ayushSystem: v.optional(v.string()), ownerRole: v.optional(v.string()), search: v.optional(v.string()), myInstitutionOnly: v.optional(v.boolean()), offset: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const myInstitution = await actorInstitution(ctx, actor);
    const term = String(args.search || "").trim().toLowerCase();
    const rows = [];
    for (const visibility of ["open", "closed"]) {
      const list = await ctx.db
        .query("communities")
        .withIndex("by_visibility", (q) => q.eq("visibility", visibility))
        .collect();
      rows.push(...list);
    }
    const out = [];
    for (const c of rows) {
      if (c.archivedAt || !sameSide(actor.id, c.ownerId)) continue;
      if (c.sameInstitutionOnly && (!myInstitution || c.institutionId !== myInstitution)) continue;
      if (args.myInstitutionOnly && (!myInstitution || c.institutionId !== myInstitution)) continue;
      if (args.ayushSystem && c.ayushSystem !== args.ayushSystem) continue;
      if (args.ownerRole && c.ownerRole !== args.ownerRole) continue;
      if (term && !`${c.name} ${c.ownerName} ${c.institutionName || ""} ${c.subject || ""}`.toLowerCase().includes(term)) continue;
      const m = await membershipOf(ctx, c.id, actor.id);
      if (isBanned(m)) continue;
      out.push({ c, m });
    }
    out.sort((a, b) => (b.c.memberCount || 0) - (a.c.memberCount || 0));
    const offset = Math.max(0, Math.round(args.offset || 0));
    const page = out.slice(offset, offset + COMMUNITIES.PAGE_SIZE);
    const cards = [];
    for (const { c, m } of page) cards.push(await card(ctx, c, m));
    return { communities: cards, total: out.length, nextOffset: offset + page.length < out.length ? offset + page.length : null };
  },
});

/**
 * One community. Members and staff get the full record; others the public
 * card of an Open or Closed community (or of the Invite-only one they were
 * invited to); anyone else gets null — the community "doesn't exist".
 */
export const get = query({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await getActor(ctx, args.sessionToken);
    if (!actor) return null;
    const s = await standing(ctx, actor, args.communityId);
    if (!s || s.view === "none") return null;
    if (s.view === "card") return { view: "card", community: await card(ctx, s.community, s.membership) };
    return { view: "full", community: await fullView(ctx, s) };
  },
});

async function withAuthorAndUrls(ctx, post, { staff }) {
  const comments = await ctx.db
    .query("communityComments")
    .withIndex("by_post", (q) => q.eq("postId", post.id))
    .collect();
  let test = null;
  if (post.testId) {
    const row = await ctx.db
      .query("skillTests")
      .withIndex("by_client_id", (q) => q.eq("id", post.testId))
      .first();
    if (row) test = { id: row.id, title: row.title, scheduleType: row.scheduleType || "fixed", windowOpensAtMs: row.windowOpensAtMs || null, windowClosesAtMs: row.windowClosesAtMs || null, scheduledAtMs: row.scheduledAtMs || null, durationMinutes: row.durationMinutes || null, duration: row.duration, cancelledAt: row.cancelledAt || null };
  }
  const { _id, _creationTime, ...rest } = post;
  return {
    ...rest,
    attachments: (post.attachments || []).map(({ storageId, ...a }) => a),
    commentCount: comments.filter((c) => !c.deletedAt).length,
    test,
    canManage: staff,
  };
}

/** The feed: pinned posts first (in pin order), then everything else newest first, 20 at a time. */
export const feed = query({
  args: { sessionToken: v.string(), communityId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "full" });
    const numItems = Math.min(COMMUNITIES.PAGE_SIZE, Math.max(1, args.paginationOpts.numItems));
    const result = await ctx.db
      .query("communityPosts")
      .withIndex("by_community_created", (q) => q.eq("communityId", s.community.id))
      .order("desc")
      .paginate({ ...args.paginationOpts, numItems });
    const page = [];
    for (const post of result.page) {
      if (post.deletedAt || post.pinned) continue;
      page.push(await withAuthorAndUrls(ctx, post, s));
    }
    return { ...result, page };
  },
});

export const pinned = query({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "full" });
    const rows = await ctx.db
      .query("communityPosts")
      .withIndex("by_community_pinned", (q) => q.eq("communityId", s.community.id).eq("pinned", true))
      .collect();
    const out = [];
    for (const post of rows.filter((p) => !p.deletedAt).sort((a, b) => (a.pinOrder || 0) - (b.pinOrder || 0))) out.push(await withAuthorAndUrls(ctx, post, s));
    return out;
  },
});

export const comments = query({
  args: { sessionToken: v.string(), postId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const { s } = await memberPost(ctx, actor, args.postId);
    const rows = await ctx.db
      .query("communityComments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    return rows
      .filter((c) => !c.deletedAt)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(({ _id, _creationTime, ...c }) => ({ ...c, canDelete: c.authorId === actor.id || s.staff }));
  },
});

/** Every attachment across the community's posts, with unique downloaders for the staff. */
export const materials = query({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "full" });
    const posts = await ctx.db
      .query("communityPosts")
      .withIndex("by_community_created", (q) => q.eq("communityId", s.community.id))
      .order("desc")
      .collect();
    const downloads = s.staff
      ? await ctx.db
          .query("communityDownloads")
          .withIndex("by_community", (q) => q.eq("communityId", s.community.id))
          .collect()
      : [];
    const counts = new Map();
    downloads.forEach((d) => counts.set(`${d.postId}|${d.fileId}`, (counts.get(`${d.postId}|${d.fileId}`) || 0) + 1));
    const out = [];
    for (const post of posts) {
      if (post.deletedAt) continue;
      for (const a of post.attachments || []) {
        out.push({ postId: post.id, postTitle: post.title, fileId: a.fileId, fileName: a.fileName, mimeType: a.mimeType, bytes: a.bytes, uploadedAt: post.createdAt, downloads: s.staff ? counts.get(`${post.id}|${a.fileId}`) || 0 : undefined });
      }
    }
    return out;
  },
});

/** The member list — staff only. Students never see who else is in a community. */
export const members = query({
  args: { sessionToken: v.string(), communityId: v.string(), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const status = ["active", "pending", "invited", "banned", "removed", "left", "declined"].includes(args.status) ? args.status : "active";
    const rows = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_status", (q) => q.eq("communityId", s.community.id).eq("status", status))
      .collect();
    // Tests taken in this community, per student, from the attempts on its tests.
    const tests = await ctx.db
      .query("skillTests")
      .withIndex("by_community", (q) => q.eq("communityId", s.community.id))
      .collect();
    const taken = new Map();
    for (const test of tests) {
      const attempts = await ctx.db
        .query("assessmentAttempts")
        .withIndex("by_test", (q) => q.eq("testId", test.id))
        .collect();
      attempts.forEach((a) => taken.set(a.studentId, (taken.get(a.studentId) || 0) + 1));
    }
    const out = [];
    for (const m of rows) {
      const user = publicUser(await findUserById(ctx, m.userId));
      out.push({
        userId: m.userId,
        name: user?.name || m.userName || "Student",
        email: s.owner ? user?.email || "" : undefined,
        institution: user?.institution || user?.instituteName || "",
        course: user?.course || "",
        year: user?.year || "",
        rollNo: user?.rollNo || "",
        role: m.role,
        status: m.status,
        requestNote: m.requestNote || null,
        banReason: m.banReason || null,
        joinedAt: m.joinedAt || null,
        statusChangedAt: m.statusChangedAt,
        lastSeenAt: m.lastSeenAt || null,
        testsTaken: taken.get(m.userId) || 0,
      });
    }
    return out;
  },
});

export const reports = query({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const rows = await ctx.db
      .query("communityReports")
      .withIndex("by_community_status", (q) => q.eq("communityId", s.community.id).eq("status", "open"))
      .collect();
    const out = [];
    for (const r of rows) {
      const post = r.postId
        ? await ctx.db
            .query("communityPosts")
            .withIndex("by_client_id", (q) => q.eq("id", r.postId))
            .first()
        : null;
      const comment = r.commentId
        ? await ctx.db
            .query("communityComments")
            .withIndex("by_client_id", (q) => q.eq("id", r.commentId))
            .first()
        : null;
      out.push({ id: r._id, reason: r.reason, createdAt: r.createdAt, postId: r.postId, commentId: r.commentId, postTitle: post?.title || null, commentBody: comment?.body || null, targetDeleted: Boolean(post?.deletedAt || comment?.deletedAt) });
    }
    return out;
  },
});

/** Owner only: every moderation action, newest first. */
export const auditLog = query({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "owner" });
    const rows = await ctx.db
      .query("communityAudit")
      .withIndex("by_community", (q) => q.eq("communityId", s.community.id))
      .order("desc")
      .take(300);
    const names = new Map();
    const out = [];
    for (const r of rows) {
      if (r.targetId && !names.has(r.targetId)) names.set(r.targetId, (await findUserById(ctx, r.targetId))?.name || null);
      out.push({ action: r.action, actorName: r.actorName, targetId: r.targetId, targetName: names.get(r.targetId) || null, detail: r.detail, at: r.at });
    }
    return out;
  },
});

/** Staff insights: growth, activity, top materials, who has seen each announcement, test averages. */
export const insights = query({
  args: { sessionToken: v.string(), communityId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const id = s.community.id;
    const active = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_status", (q) => q.eq("communityId", id).eq("status", "active"))
      .collect();
    const students = active.filter((m) => m.role === "member");
    // Members over time: cumulative joins by week, last 12 weeks.
    const weeks = [];
    const now = Date.now();
    for (let w = 11; w >= 0; w -= 1) {
      const end = now - w * 7 * DAY;
      weeks.push({ label: shortDate(end), members: active.filter((m) => (m.joinedAt || 0) <= end).length });
    }
    const posts = (
      await ctx.db
        .query("communityPosts")
        .withIndex("by_community_created", (q) => q.eq("communityId", id))
        .collect()
    ).filter((p) => !p.deletedAt);
    const monthStart = now - 30 * DAY;
    const downloads = await ctx.db
      .query("communityDownloads")
      .withIndex("by_community", (q) => q.eq("communityId", id))
      .collect();
    const byFile = new Map();
    downloads.forEach((d) => byFile.set(`${d.postId}|${d.fileId}`, (byFile.get(`${d.postId}|${d.fileId}`) || 0) + 1));
    const topMaterials = [];
    posts.forEach((p) => (p.attachments || []).forEach((a) => topMaterials.push({ fileName: a.fileName, postTitle: p.title, downloads: byFile.get(`${p.id}|${a.fileId}`) || 0 })));
    topMaterials.sort((a, b) => b.downloads - a.downloads);
    const announcements = posts
      .filter((p) => p.type === "announcement")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt, seenBy: students.filter((m) => (m.lastSeenAt || 0) >= p.createdAt).length, of: students.length }));
    const tests = await ctx.db
      .query("skillTests")
      .withIndex("by_community", (q) => q.eq("communityId", id))
      .collect();
    const testStats = [];
    for (const t of tests) {
      const attempts = (
        await ctx.db
          .query("assessmentAttempts")
          .withIndex("by_test", (q) => q.eq("testId", t.id))
          .collect()
      ).filter((a) => !a.missed);
      testStats.push({ id: t.id, title: t.title, attempts: attempts.length, average: attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) : null });
    }
    return {
      memberCount: students.length,
      membersOverTime: weeks,
      postsThisMonth: posts.filter((p) => p.createdAt >= monthStart).length,
      topMaterials: topMaterials.slice(0, 5),
      announcements,
      tests: testStats,
    };
  },
});

/**
 * Students a professor or institution may invite: registered students of
 * their own institution (and a professor's advisees), searched by name,
 * email or roll number, optionally filtered by department and year.
 */
export const inviteCandidates = query({
  args: { sessionToken: v.string(), communityId: v.string(), search: v.optional(v.string()), department: v.optional(v.string()), year: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const s = await requireStanding(ctx, actor, args.communityId, { need: "staff" });
    const myInstitution = await actorInstitution(ctx, actor);
    const advisees = new Set(
      (
        await ctx.db
          .query("advisees")
          .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
          .collect()
      ).map((a) => a.studentId)
    );
    const term = String(args.search || "").trim().toLowerCase();
    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();
    const out = [];
    for (const u of students) {
      if (out.length >= 50) break;
      if (!sameSide(actor.id, u.id)) continue;
      if (args.department && u.department !== args.department) continue;
      if (args.year && u.year !== args.year) continue;
      if (term && !`${u.name || ""} ${u.email || ""} ${u.rollNo || ""}`.toLowerCase().includes(term)) continue;
      const mine = advisees.has(u.id) || (myInstitution && (u.institutionId === myInstitution || (await resolveInstitutionId(ctx, u)) === myInstitution));
      if (!mine) continue;
      const m = await membershipOf(ctx, s.community.id, u.id);
      out.push({ id: u.id, name: u.name || "Student", email: u.email, rollNo: u.rollNo || "", department: u.department || "", year: u.year || "", course: u.course || "", status: m?.status || null });
    }
    return out;
  },
});

/* ============================================================
   Scheduled work
   ============================================================ */

/**
 * The notification fan-out for one post: NOTIFY_BATCH members per run, each
 * notification id deterministic (notif_<key>_<userId>) so a retried run never
 * double-notifies, rescheduling itself with the next cursor until done.
 */
export const fanOut = internalMutation({
  args: {
    key: v.string(),
    communityId: v.string(),
    postId: v.union(v.string(), v.null()),
    testId: v.optional(v.union(v.string(), v.null())),
    kind: v.string(),
    message: v.string(),
    from: v.string(),
    link: v.string(),
    authorId: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const community = await findCommunity(ctx, args.communityId);
    if (!community || community.archivedAt) return { done: true, delivered: 0 };
    const batch = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_status", (q) => q.eq("communityId", community.id).eq("status", "active"))
      .paginate({ numItems: COMMUNITIES.NOTIFY_BATCH, cursor: args.cursor });
    let delivered = 0;
    for (const m of batch.page) {
      if (m.userId === args.authorId || m.notificationsMuted) continue;
      const wrote = await notify(ctx, m.userId, {
        id: `notif_${args.key}_${m.userId}`,
        kind: args.kind,
        message: args.message,
        from: args.from,
        link: args.link,
        communityId: community.id,
        postId: args.postId,
        testId: args.testId || null,
        senderId: args.authorId,
      });
      if (wrote) delivered += 1;
    }
    const log = await ctx.db
      .query("communityFanouts")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (log) await ctx.db.patch(log._id, { delivered: log.delivered + delivered, doneAt: batch.isDone ? Date.now() : null });
    else await ctx.db.insert("communityFanouts", { key: args.key, communityId: community.id, delivered, doneAt: batch.isDone ? Date.now() : null, createdAt: Date.now() });
    if (!batch.isDone) await ctx.scheduler.runAfter(0, internal.communities.fanOut, { ...args, cursor: batch.continueCursor });
    return { done: batch.isDone, delivered };
  },
});

/** Files of posts deleted more than COMMUNITIES.PURGE_AFTER_DAYS ago leave storage. Nightly. */
export const purgeDeletedPosts = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - COMMUNITIES.PURGE_AFTER_DAYS * DAY;
    const rows = await ctx.db
      .query("communityPosts")
      .withIndex("by_deleted", (q) => q.gt("deletedAt", 0).lt("deletedAt", cutoff))
      .take(200);
    let purged = 0;
    for (const post of rows) {
      if (post.filesPurgedAt) continue;
      for (const a of post.attachments || []) {
        try {
          await ctx.storage.delete(a.storageId);
        } catch {
          /* already gone */
        }
      }
      await ctx.db.patch(post._id, { filesPurgedAt: Date.now(), attachments: [] });
      purged += 1;
    }
    return { purged };
  },
});
