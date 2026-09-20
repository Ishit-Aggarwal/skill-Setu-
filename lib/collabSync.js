"use client";

/**
 * Research collaboration calls, their threads, and a faculty member's
 * research outputs, between this device and the shared database. Same mirror
 * pattern as lib/postings.js.
 *
 * Child rows (a message, a milestone, a file) carry no owner of their own; the
 * listing they belong to decides which side of the demo wall they are on.
 */

import { api } from "../convex/_generated/api";
import { backfill, mergeRemote, mirror, mirrorable, outbound, pull } from "./remoteSync";
import { all, currentAccount } from "./store";

/* ---------------- listings ---------------- */

export async function mirrorCollabListing(record) {
  if (!mirrorable("collabListings", record)) return false;
  return await mirror("collabs", api.collabs.createListing, { id: record.id, row: outbound(record, ["ownerId"]) });
}

export async function mirrorCollabListingPatch(id, patch) {
  if (!id) return false;
  return await mirror("collabs", api.collabs.updateListing, { id, patch: outbound(patch, ["ownerId"]) });
}

/* ---------------- thread rows ---------------- */

export async function mirrorCollabInterest(record) {
  if (!record?.id || !record.listingId) return false;
  return await mirror("collabs", api.collabs.expressInterest, { id: record.id, listingId: record.listingId, message: record.message || "", at: record.at || undefined });
}

export async function mirrorCollabInterestStatus(id, status) {
  if (!id || !status) return false;
  return await mirror("collabs", api.collabs.setInterestStatus, { id, status });
}

export async function mirrorCollabMessage(record) {
  if (!record?.id || !record.collabId) return false;
  return await mirror("collabs", api.collabs.postMessage, { id: record.id, collabId: record.collabId, body: record.body || "", author: record.author || undefined, at: record.at || undefined });
}

export async function mirrorCollabMilestone(record) {
  if (!record?.id || !record.collabId) return false;
  return await mirror("collabs", api.collabs.addMilestone, {
    id: record.id,
    collabId: record.collabId,
    title: record.title || "Milestone",
    due: record.due || undefined,
    owner: record.owner || undefined,
    createdAt: record.createdAt || undefined,
  });
}

export async function mirrorCollabMilestoneToggle(id, done) {
  if (!id) return false;
  return await mirror("collabs", api.collabs.toggleMilestone, { id, done: Boolean(done) });
}

export async function mirrorCollabFile(record) {
  if (!record?.id || !record.collabId) return false;
  return await mirror("collabs", api.collabs.addFile, {
    id: record.id,
    collabId: record.collabId,
    name: record.name || record.fileName || "File",
    storageId: record.storageId || null,
    fileName: record.fileName || undefined,
    mimeType: record.mimeType || undefined,
    bytes: typeof record.bytes === "number" ? record.bytes : undefined,
    size: record.size ?? undefined,
    uploadedBy: record.uploadedBy || undefined,
    uploadedAt: record.uploadedAt || undefined,
  });
}

export async function mirrorRemoveCollabFile(id) {
  if (!id) return false;
  return await mirror("collabs", api.collabs.removeFile, { id });
}

/** The public catalogue of calls plus every thread this account may read. */
export async function syncRemoteCollabs() {
  const [listings, threads] = await Promise.all([
    pull("collabs", api.collabs.listAll, {}, { anonymous: true }),
    pull("collabs", api.collabs.myThreads),
  ]);
  let changed = 0;
  let ownerOf = {};
  if (listings) {
    const merged = mergeRemote("collabListings", listings);
    changed += merged.changed;
    await backfill("collabListings", merged.serverIds, mirrorCollabListing);
  }
  all("collabListings").forEach((l) => {
    ownerOf[l.id] = l.ownerId;
  });
  if (threads) {
    ownerOf = { ...ownerOf, ...(threads.owners || {}) };
    const parentOwnerFor = (row) => ownerOf[row.collabId || row.listingId];
    const interests = mergeRemote("collabInterests", threads.interests, { parentOwnerFor: (row) => row.userId });
    const messages = mergeRemote("collabMessages", threads.messages, { parentOwnerFor });
    const milestones = mergeRemote("collabMilestones", threads.milestones, { parentOwnerFor });
    const files = mergeRemote("collabFiles", threads.files, { parentOwnerFor });
    changed += interests.changed + messages.changed + milestones.changed + files.changed;

    const account = currentAccount();
    if (account) {
      await backfill("collabInterests", interests.serverIds, mirrorCollabInterest);
      const mineOnly = (row) => (ownerOf[row.collabId] === account.id ? account.id : undefined);
      await backfill("collabMessages", messages.serverIds, mirrorCollabMessage, { parentOwnerFor: mineOnly });
      await backfill("collabMilestones", milestones.serverIds, mirrorCollabMilestone, { parentOwnerFor: mineOnly });
      await backfill("collabFiles", files.serverIds, mirrorCollabFile, { parentOwnerFor: mineOnly });
    }
  }
  return changed;
}

/* ---------------- research outputs ---------------- */

export async function mirrorResearchOutput(record) {
  if (!mirrorable("researchOutputs", record)) return false;
  return await mirror("research", api.research.add, { id: record.id, row: outbound(record, ["facultyId"]) });
}

export async function mirrorResearchOutputPatch(id, patch) {
  if (!id) return false;
  return await mirror("research", api.research.update, { id, patch: outbound(patch, ["facultyId"]) });
}

export async function mirrorRemoveResearchOutput(id) {
  if (!id) return false;
  return await mirror("research", api.research.remove, { id });
}

export async function syncRemoteResearch() {
  const remote = await pull("research", api.research.listAll, {}, { anonymous: true });
  if (!remote) return 0;
  const { changed, serverIds } = mergeRemote("researchOutputs", remote);
  await backfill("researchOutputs", serverIds, mirrorResearchOutput);
  return changed;
}

/* ---------------- responses to sample calls ---------------- */

export async function mirrorCollabResponse(collabId, response) {
  if (!collabId) return false;
  return await mirror("collabs", api.programs.setCollabResponse, { collabId, response: String(response || "") });
}
