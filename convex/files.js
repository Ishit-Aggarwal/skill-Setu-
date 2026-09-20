import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireActor } from "./_lib/authz";

/**
 * File storage for uploads: resumes, portfolio documents, MOU scans,
 * research PDFs, logos and gallery images.
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
