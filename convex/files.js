import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { isBlockedFile } from "../lib/fileKinds";
import { AI, COMMUNITIES, FILES, RESUME } from "../lib/settings";

/**
 * File storage for uploads: resumes, portfolio documents, MOU scans,
 * research PDFs, logos, gallery images, AI source documents and community
 * materials.
 *
 * Any signed-in account may upload. The reference a row keeps is the storage
 * id; the rows' own queries resolve it to a URL after their read check. A
 * storage id is a random, unguessable token, which is what lets the uploader
 * ask for its URL straight after the upload to render the file at once.
 */

export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const urlFor = query({
  args: { sessionToken: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionToken);
    return await ctx.storage.getUrl(args.storageId);
  },
});

/** The largest file each upload purpose accepts, checked against what storage actually holds. */
const PURPOSE_LIMIT = {
  source: AI.MAX_SOURCE_FILE_BYTES,
  resume: RESUME.MAX_BYTES,
  material: COMMUNITIES.MATERIAL_MAX_BYTES,
  cover: COMMUNITIES.COVER_MAX_BYTES,
  document: FILES.MAX_DOCUMENT_BYTES,
  image: FILES.MAX_IMAGE_BYTES,
};

async function discard(ctx, storageId) {
  try {
    await ctx.storage.delete(storageId);
  } catch {
    /* already gone */
  }
}

/**
 * Records who uploaded a file and what for, straight after the upload. The
 * size and type are re-checked here against the stored object itself — the
 * browser's own checks are a convenience, not a control — and a refused file
 * is deleted from storage rather than left behind.
 */
export const registerUpload = mutation({
  args: {
    sessionToken: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    bytes: v.number(),
    purpose: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const existing = await ctx.db
      .query("uploads")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (existing) {
      if (existing.ownerId !== actor.id) throw authError("That file belongs to another account.");
      return { ok: true };
    }
    const stored = await ctx.db.system.get(args.storageId);
    if (!stored) throw new Error("The upload did not complete. Please try again.");
    const fileName = String(args.fileName || "file").slice(0, 200);
    if (isBlockedFile(fileName, args.mimeType) || isBlockedFile(fileName, stored.contentType)) {
      await discard(ctx, args.storageId);
      throw new Error("That kind of file isn't allowed. Upload a document, spreadsheet, presentation or image.");
    }
    const purpose = PURPOSE_LIMIT[args.purpose] ? args.purpose : "document";
    const limit = PURPOSE_LIMIT[purpose];
    if (stored.size > limit) {
      await discard(ctx, args.storageId);
      throw new Error(`File is too large — please upload a file under ${Math.round(limit / (1024 * 1024))}MB`);
    }
    await ctx.db.insert("uploads", {
      storageId: args.storageId,
      ownerId: actor.id,
      fileName,
      mimeType: String(args.mimeType || stored.contentType || "application/octet-stream").slice(0, 120),
      bytes: stored.size,
      purpose,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/**
 * The URL of a file the caller uploaded, for an AI route to fetch. Anything
 * the caller did not upload resolves to null, so a guessed storage id is
 * worth nothing.
 */
export const sourceUrlFor = query({
  args: { sessionToken: v.string(), storageId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const id = ctx.db.system.normalizeId("_storage", args.storageId);
    if (!id) return null;
    const row = await ctx.db
      .query("uploads")
      .withIndex("by_storage", (q) => q.eq("storageId", id))
      .first();
    if (!row || row.ownerId !== actor.id) return null;
    const url = await ctx.storage.getUrl(id);
    if (!url) return null;
    return { url, fileName: row.fileName, mimeType: row.mimeType, bytes: row.bytes, purpose: row.purpose };
  },
});
