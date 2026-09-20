import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, canRead, requireActor, requireRead } from "./_lib/authz";
import {
  deleteByClientId,
  deleteStoredFile,
  findByClientId,
  nowIso,
  patchByClientId,
  publicRow,
  upsertByClientId,
  withFileUrl,
} from "./_lib/rows";

/**
 * Research collaboration calls and the threads behind them.
 *
 * A listing is public. Its thread — interests, messages, milestones, files —
 * is readable by the listing's owner and by anyone whose interest the owner
 * accepted; writable by the same people. Ownership is the listing's, never a
 * field on the child row.
 */

const COLLAB_ROLES = ["academician", "institution", "industry", "admin"];

function ownerGuard(actor, what) {
  return (existing) => {
    if (existing.ownerId !== actor.id && actor.role !== "admin") throw authError(`Only the account that created ${what} can change it.`);
  };
}

async function listingFor(ctx, collabId) {
  return await findByClientId(ctx, "collabListings", collabId);
}

/** Owner or accepted collaborator — the thread's write set is its read set. */
async function requireThreadAccess(ctx, actor, collabId) {
  const listing = await listingFor(ctx, collabId);
  if (!listing) {
    // Sample collaboration calls (collab_1 … collab_7) exist only in the demo
    // seed, so a thread on one of those has no listing row to check against.
    if (!COLLAB_ROLES.includes(actor.role)) throw authError("Only a faculty or organisation account can take part in a collaboration.");
    return null;
  }
  await requireRead(ctx, actor, "collabMessages", { collabId });
  return listing;
}

/* ---------------- listings ---------------- */

export const createListing = mutation({
  args: { sessionToken: v.string(), id: v.string(), row: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!COLLAB_ROLES.includes(actor.role)) throw authError("Only a faculty or organisation account can publish a collaboration call.");
    const { ownerId, ...row } = args.row || {};
    await upsertByClientId(ctx, "collabListings", args.id, row, {
      forced: { ownerId: actor.id, ownerName: row.ownerName || actor.user.name || "", status: row.status || "Open", createdAt: row.createdAt || nowIso() },
      guard: ownerGuard(actor, "this collaboration call"),
    });
    return { ok: true };
  },
});

export const updateListing = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const row = await patchByClientId(ctx, "collabListings", args.id, args.patch, { guard: ownerGuard(actor, "this collaboration call"), protectedFields: ["ownerId"] });
    return { ok: Boolean(row) };
  },
});

export const listAll = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("collabListings").collect();
    return rows.map(publicRow);
  },
});

/* ---------------- interests ---------------- */

export const expressInterest = mutation({
  args: { sessionToken: v.string(), id: v.string(), listingId: v.string(), message: v.optional(v.string()), at: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!COLLAB_ROLES.includes(actor.role)) throw authError("Only a faculty or organisation account can express interest.");
    if (await findByClientId(ctx, "collabInterests", args.id)) return { ok: true };
    const existing = await ctx.db
      .query("collabInterests")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .filter((q) => q.eq(q.field("userId"), actor.id))
      .first();
    if (existing) return { ok: true, id: existing.id };
    const user = actor.user;
    await ctx.db.insert("collabInterests", {
      id: args.id,
      listingId: args.listingId,
      userId: actor.id,
      name: user.name || "",
      institution: user.institution || user.instituteName || user.companyName || "",
      message: args.message || "",
      status: "Interested",
      at: args.at || nowIso(),
      updatedAt: nowIso(),
    });
    return { ok: true, id: args.id };
  },
});

export const setInterestStatus = mutation({
  args: { sessionToken: v.string(), id: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const interest = await findByClientId(ctx, "collabInterests", args.id);
    if (!interest) return { ok: false, reason: "NOT_FOUND" };
    const listing = await listingFor(ctx, interest.listingId);
    if (!listing || (listing.ownerId !== actor.id && actor.role !== "admin")) throw authError("Only the owner of the call can accept or decline interest.");
    await ctx.db.patch(interest._id, { status: args.status, updatedAt: nowIso() });
    return { ok: true };
  },
});

export const listInterests = query({
  args: { sessionToken: v.string(), listingId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("collabInterests")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .collect();
    const visible = [];
    for (const row of rows) if (await canRead(ctx, actor, "collabInterests", row)) visible.push(publicRow(row));
    return visible;
  },
});

/* ---------------- messages ---------------- */

export const postMessage = mutation({
  args: { sessionToken: v.string(), id: v.string(), collabId: v.string(), body: v.string(), author: v.optional(v.string()), at: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await requireThreadAccess(ctx, actor, args.collabId);
    if (await findByClientId(ctx, "collabMessages", args.id)) return { ok: true };
    await ctx.db.insert("collabMessages", {
      id: args.id,
      collabId: args.collabId,
      author: args.author || actor.user.name || "",
      authorId: actor.id,
      body: args.body,
      at: args.at || nowIso(),
      updatedAt: nowIso(),
    });
    return { ok: true };
  },
});

export const listMessages = query({
  args: { sessionToken: v.string(), collabId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await requireThreadAccess(ctx, actor, args.collabId);
    const rows = await ctx.db
      .query("collabMessages")
      .withIndex("by_collab", (q) => q.eq("collabId", args.collabId))
      .collect();
    return rows.map(publicRow);
  },
});

/* ---------------- milestones ---------------- */

export const addMilestone = mutation({
  args: { sessionToken: v.string(), id: v.string(), collabId: v.string(), title: v.string(), due: v.optional(v.string()), owner: v.optional(v.string()), createdAt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await requireThreadAccess(ctx, actor, args.collabId);
    if (await findByClientId(ctx, "collabMilestones", args.id)) return { ok: true };
    await ctx.db.insert("collabMilestones", {
      id: args.id,
      collabId: args.collabId,
      title: args.title,
      due: args.due,
      owner: args.owner,
      done: false,
      createdAt: args.createdAt || nowIso(),
      completedAt: null,
      updatedAt: nowIso(),
    });
    return { ok: true };
  },
});

export const toggleMilestone = mutation({
  args: { sessionToken: v.string(), id: v.string(), done: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const row = await findByClientId(ctx, "collabMilestones", args.id);
    if (!row) return { ok: false, reason: "NOT_FOUND" };
    await requireThreadAccess(ctx, actor, row.collabId);
    const done = args.done ?? !row.done;
    await ctx.db.patch(row._id, { done, completedAt: done ? nowIso() : null, updatedAt: nowIso() });
    return { ok: true, done };
  },
});

export const listMilestones = query({
  args: { sessionToken: v.string(), collabId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await requireThreadAccess(ctx, actor, args.collabId);
    const rows = await ctx.db
      .query("collabMilestones")
      .withIndex("by_collab", (q) => q.eq("collabId", args.collabId))
      .collect();
    return rows.map(publicRow);
  },
});

/* ---------------- files ---------------- */

export const addFile = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    collabId: v.string(),
    name: v.string(),
    storageId: v.optional(v.union(v.id("_storage"), v.null())),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    bytes: v.optional(v.number()),
    size: v.optional(v.union(v.string(), v.number())),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await requireThreadAccess(ctx, actor, args.collabId);
    if (await findByClientId(ctx, "collabFiles", args.id)) return { ok: true };
    const { sessionToken, ...fields } = args;
    await ctx.db.insert("collabFiles", {
      ...fields,
      uploadedById: actor.id,
      uploadedBy: fields.uploadedBy || actor.user.name || "",
      uploadedAt: fields.uploadedAt || nowIso(),
      updatedAt: nowIso(),
    });
    return { ok: true };
  },
});

export const removeFile = mutation({
  args: { sessionToken: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const row = await findByClientId(ctx, "collabFiles", args.id);
    if (!row) return { ok: true };
    const listing = await requireThreadAccess(ctx, actor, row.collabId);
    const mayRemove = row.uploadedById === actor.id || (listing && listing.ownerId === actor.id) || actor.role === "admin";
    if (!mayRemove) throw authError("Only the uploader or the call's owner can remove a file.");
    await deleteStoredFile(ctx, row);
    await ctx.db.delete(row._id);
    return { ok: true };
  },
});

export const listFiles = query({
  args: { sessionToken: v.string(), collabId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await requireThreadAccess(ctx, actor, args.collabId);
    const rows = await ctx.db
      .query("collabFiles")
      .withIndex("by_collab", (q) => q.eq("collabId", args.collabId))
      .collect();
    const out = [];
    for (const row of rows) out.push(publicRow(await withFileUrl(ctx, row)));
    return out;
  },
});

/**
 * Every thread the caller may read, in one request: the listings they own,
 * the listings whose interest of theirs was accepted, plus their own
 * interests anywhere. Sample calls (collab_*) are included for organisation
 * and faculty accounts because they have no listing row to own.
 */
export const myThreads = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const owned = await ctx.db
      .query("collabListings")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .collect();
    const myInterests = await ctx.db
      .query("collabInterests")
      .withIndex("by_user", (q) => q.eq("userId", actor.id))
      .collect();
    const threadIds = new Set(owned.map((l) => l.id).filter(Boolean));
    myInterests.filter((i) => i.status === "Accepted").forEach((i) => threadIds.add(i.listingId));

    const interests = [...myInterests];
    const messages = [];
    const milestones = [];
    const files = [];
    for (const collabId of threadIds) {
      if (!owned.some((l) => l.id === collabId)) {
        const listing = await listingFor(ctx, collabId);
        if (!listing) continue;
      }
      const [i, m, ms, f] = await Promise.all([
        ctx.db.query("collabInterests").withIndex("by_listing", (q) => q.eq("listingId", collabId)).collect(),
        ctx.db.query("collabMessages").withIndex("by_collab", (q) => q.eq("collabId", collabId)).collect(),
        ctx.db.query("collabMilestones").withIndex("by_collab", (q) => q.eq("collabId", collabId)).collect(),
        ctx.db.query("collabFiles").withIndex("by_collab", (q) => q.eq("collabId", collabId)).collect(),
      ]);
      i.forEach((row) => {
        if (!interests.some((x) => x._id === row._id)) interests.push(row);
      });
      messages.push(...m);
      milestones.push(...ms);
      for (const row of f) files.push(await withFileUrl(ctx, row));
    }
    const ownerOf = {};
    owned.forEach((l) => {
      ownerOf[l.id] = l.ownerId;
    });
    for (const collabId of threadIds) {
      if (ownerOf[collabId]) continue;
      const listing = await listingFor(ctx, collabId);
      if (listing) ownerOf[collabId] = listing.ownerId;
    }
    return {
      owners: ownerOf,
      interests: interests.map(publicRow),
      messages: messages.map(publicRow),
      milestones: milestones.map(publicRow),
      files: files.map(publicRow),
    };
  },
});
