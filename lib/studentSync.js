"use client";

/**
 * The student's own records — portfolio, bookmarks, inbox — between this
 * device and the shared database. Same mirror pattern as lib/postings.js.
 *
 * The inbox is the one collection here that other people write into: a
 * recruiter moving an application, a mentor recommending a role, an
 * institution posting a notice. Pulling it is what makes a notification sent
 * from one device reach the student on another.
 */

import { api } from "../convex/_generated/api";
import { backfill, mergeRemote, mirror, mirrorable, outbound, pull, pruneAllowed } from "./remoteSync";
import { currentAccount } from "./store";

/* ---------------- portfolio ---------------- */

export async function mirrorPortfolio(record, patch) {
  if (!mirrorable("portfolios", record)) return false;
  // A partial patch mirrors as a partial; the first write sends the whole row.
  const payload = outbound(patch || record, ["studentId"]);
  return await mirror("portfolio", api.portfolios.save, { id: record.id, patch: payload });
}

export async function syncRemotePortfolio() {
  const remote = await pull("portfolio", api.portfolios.mine);
  if (remote === null) return 0;
  const { changed, serverIds } = mergeRemote("portfolios", remote ? [remote] : []);
  await backfill("portfolios", serverIds, (row) => mirrorPortfolio(row));
  return changed;
}

/**
 * Every candidate portfolio a reviewer may see (talent pool, candidate modal,
 * roster), in one request rather than one per student.
 */
export async function syncPortfoliosForReviewer() {
  const account = currentAccount();
  if (!account || !["industry", "institution", "academician", "admin"].includes(account.role)) return 0;
  const remote = await pull("portfolio", api.portfolios.listForReviewer);
  if (!remote) return 0;
  return mergeRemote("portfolios", remote).changed;
}

/* ---------------- bookmarks ---------------- */

export async function mirrorSavedInternship(record, saved) {
  if (!record?.internshipId) return false;
  return await mirror("saved", api.saved.toggleInternship, {
    id: record.id,
    internshipId: record.internshipId,
    saved: Boolean(saved),
    savedAt: record.savedAt || undefined,
  });
}

export async function mirrorSavedMentorship(record, saved) {
  if (!record?.slotId) return false;
  return await mirror("saved", api.saved.toggleMentorship, {
    id: record.id,
    slotId: record.slotId,
    saved: Boolean(saved),
    facultyId: record.facultyId || null,
    snapshot: record.snapshot || null,
    savedAt: record.savedAt || undefined,
  });
}

export async function mirrorSavedSearch(record) {
  if (!mirrorable("savedSearches", record)) return false;
  return await mirror("saved", api.saved.saveSearch, { id: record.id, name: record.name || "Saved search", filters: record.filters || {}, savedAt: record.savedAt || undefined });
}

export async function mirrorDeleteSavedSearch(id) {
  if (!id) return false;
  return await mirror("saved", api.saved.deleteSearch, { id });
}

export async function syncRemoteSaved() {
  const remote = await pull("saved", api.saved.mineAll);
  if (!remote) return 0;
  const account = currentAccount();
  // The server is the only place a bookmark can be removed from another
  // device, so a local bookmark the server no longer has is dropped — unless
  // it was made in the last minute, in which case its mirror may simply not
  // have landed yet.
  const cutoff = Date.now() - 60000;
  const prune = (row) =>
    Boolean(account) &&
    (row.studentId === account.id || row.ownerId === account.id) &&
    new Date(row.savedAt || row.updatedAt || 0).getTime() < cutoff;
  const pruneFor = (collection) => (pruneAllowed(collection) ? prune : undefined);
  const a = mergeRemote("savedInternships", remote.internships, { prune: pruneFor("savedInternships") });
  const b = mergeRemote("savedMentorships", remote.mentorships, { prune: pruneFor("savedMentorships") });
  const c = mergeRemote("savedSearches", remote.searches, { prune: pruneFor("savedSearches") });
  await backfill("savedInternships", a.serverIds, (row) => mirrorSavedInternship(row, true));
  await backfill("savedMentorships", b.serverIds, (row) => mirrorSavedMentorship(row, true));
  await backfill("savedSearches", c.serverIds, mirrorSavedSearch);
  return a.changed + b.changed + c.changed;
}

/* ---------------- inbox ---------------- */

export async function mirrorNotification(record) {
  if (!mirrorable("studentNotifications", record)) return false;
  const { batchId, testId, credentialId, slotId, sentAt } = record;
  return await mirror("inbox", api.notifications.send, {
    id: record.id,
    recipientId: record.studentId,
    message: record.message || "",
    from: record.from || "Skill Setu",
    meta: { batchId: batchId || null, testId: testId || null, credentialId: credentialId || null, slotId: slotId || null, sentAt: sentAt || undefined },
  });
}

export async function mirrorNotifyBatch(batch, recipientIds, notificationIds) {
  if (!batch?.id) return false;
  return await mirror("inbox", api.notifications.sendBatch, {
    id: batch.id,
    recipientIds,
    notificationIds,
    message: batch.message || "",
    from: batch.from || "Your institution",
    sentAt: batch.sentAt || undefined,
  });
}

export async function mirrorMarkRead(ids, readAt) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (!list.length) return false;
  return await mirror("inbox", api.notifications.markRead, { ids: list, readAt: readAt || undefined });
}

export async function syncRemoteNotifications() {
  const remote = await pull("inbox", api.notifications.mine);
  if (!remote) return 0;
  const account = currentAccount();
  const { changed, serverIds } = mergeRemote("studentNotifications", remote);
  // An inbox row this device held before the migration is pushed once under
  // the recipient's own account, so it is there on their other devices too.
  await backfill("studentNotifications", serverIds, mirrorNotification);
  if (account?.role === "institution") {
    const batches = await pull("inbox", api.notifications.myBatches);
    if (batches) mergeRemote("notifyBatches", batches);
  }
  return changed;
}
