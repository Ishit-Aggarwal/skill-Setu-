"use client";

/**
 * The recruiting side between this device and the shared database: a
 * company's hiring team, reviews of a company, and applications with their
 * pipeline and offer fields. Same mirror pattern as lib/postings.js.
 *
 * Applications are the two-sided one. A student applies on their laptop; the
 * recruiter shortlists on theirs; the student sees "Shortlisted" on their
 * phone. Recruiter-only fields never come back down to the student — the
 * server strips them before answering a student's pull.
 */

import { api } from "../convex/_generated/api";
import { backfill, mergeRemote, mirror, mirrorable, outbound, pull, pruneAllowed } from "./remoteSync";
import { currentAccount } from "./store";

/* ---------------- hiring team ---------------- */

export async function mirrorRecruiter(record) {
  if (!mirrorable("recruiters", record)) return false;
  return await mirror("recruiters", api.recruiters.add, { id: record.id, row: outbound(record, ["companyOwnerId"]) });
}

export async function mirrorRecruiterPatch(id, patch) {
  if (!id) return false;
  return await mirror("recruiters", api.recruiters.update, { id, patch: outbound(patch, ["companyOwnerId"]) });
}

export async function mirrorRemoveRecruiter(id) {
  if (!id) return false;
  return await mirror("recruiters", api.recruiters.remove, { id });
}

export async function mirrorAssignPosting(internshipId, recruiterId, recruiterName) {
  if (!internshipId) return false;
  return await mirror("recruiters", api.recruiters.assignPosting, { internshipId, recruiterId: recruiterId || null, recruiterName: recruiterName || null });
}

export async function syncRemoteRecruiters() {
  const remote = await pull("recruiters", api.recruiters.mine);
  if (!remote) return 0;
  const account = currentAccount();
  const { changed, serverIds } = mergeRemote("recruiters", remote, {
    prune: pruneAllowed("recruiters")
      ? (row) => Boolean(account) && row.companyOwnerId === account.id && new Date(row.addedAt || 0).getTime() < Date.now() - 60000
      : undefined,
  });
  await backfill("recruiters", serverIds, mirrorRecruiter);
  return changed;
}

/* ---------------- reviews ---------------- */

export async function mirrorCompanyReview(record) {
  if (!record?.id || !record.company) return false;
  return await mirror("reviews", api.reviews.add, {
    id: record.id,
    company: record.company,
    rating: Number(record.rating) || 0,
    author: record.author || record.authorName || undefined,
    role: record.role || undefined,
    body: record.body || undefined,
    pros: record.pros || undefined,
    cons: record.cons || undefined,
    createdAt: record.createdAt || undefined,
  });
}

export async function syncRemoteReviews() {
  const remote = await pull("reviews", api.reviews.listAll, {}, { anonymous: true });
  if (!remote) return 0;
  const { changed, serverIds } = mergeRemote("companyReviews", remote);
  await backfill("companyReviews", serverIds, mirrorCompanyReview);
  return changed;
}

/* ---------------- applications ---------------- */

export async function mirrorApplication(record) {
  if (!mirrorable("applications", record)) return false;
  return await mirror("applications", api.applications.apply, {
    id: record.id,
    internshipId: record.internshipId,
    note: record.note || undefined,
    match: typeof record.match === "number" ? record.match : undefined,
    appliedAt: record.appliedAt || undefined,
    resumeFileName: record.resumeFileName || undefined,
    resumeStorageId: record.resumeStorageId || null,
    resumeMimeType: record.resumeMimeType || undefined,
    studentDepartment: record.studentDepartment || undefined,
    updatedAt: record.updatedAt || undefined,
  });
}

export async function mirrorApplicationStatus(id, patch) {
  if (!id || !patch?.status) return false;
  const { status, rejectionReason, statusHistory, rejectedAt, updatedAt } = patch;
  return await mirror("applications", api.applications.updateStatusByClientId, {
    id,
    status,
    rejectionReason: rejectionReason ?? undefined,
    statusHistory: Array.isArray(statusHistory) ? statusHistory : undefined,
    rejectedAt: rejectedAt ?? undefined,
    updatedAt: updatedAt || undefined,
  });
}

export async function mirrorApplicationRecruiterFields(id, patch) {
  if (!id) return false;
  return await mirror("applications", api.applications.updateRecruiterFieldsByClientId, { id, patch: outbound(patch) });
}

/** A student pulls their own applications; a company pulls the ones against its postings. */
export async function syncRemoteApplications() {
  const remote = await pull("applications", api.applications.listAll);
  if (!remote) return 0;
  const account = currentAccount();
  const { changed, serverIds } = mergeRemote("applications", remote);
  if (account?.role === "student") await backfill("applications", serverIds, mirrorApplication);
  return changed;
}

/** Applications on one posting, for the account that owns it — the pipeline view. */
export async function syncApplicationsForInternship(internshipId) {
  if (!internshipId) return 0;
  const remote = await pull("applications", api.applications.listForInternship, { internshipId });
  if (!remote) return 0;
  return mergeRemote("applications", remote).changed;
}
