"use client";

/**
 * Mentorship requests, advisees and private mentor notes between this device
 * and the shared database. Same mirror pattern as lib/postings.js.
 *
 * The request is the two-sided one: a student asks from their phone, the
 * faculty member answers from their office. Notes only ever travel between a
 * mentor's own devices — the server refuses to return them to anyone else.
 */

import { api } from "../convex/_generated/api";
import { backfill, mergeRemote, mirror, mirrorable, outbound, pull, pruneAllowed } from "./remoteSync";
import { currentAccount } from "./store";

const FACULTY_ROLES = ["academician", "institution", "industry", "admin"];

export async function mirrorMentorshipRequest(record) {
  if (!mirrorable("mentorshipRequests", record)) return false;
  return await mirror("mentoring", api.mentoring.requestMentorship, {
    id: record.id,
    facultyId: record.facultyId,
    message: record.message || "",
    requestedAt: record.requestedAt || undefined,
  });
}

export async function mirrorMentorshipRequestStatus(id, status) {
  if (!id || !status) return false;
  return await mirror("mentoring", api.mentoring.setRequestStatus, { id, status });
}

export async function mirrorMentorNote(record) {
  if (!mirrorable("mentorNotes", record)) return false;
  const { note, flag, recommendations, updatedAt } = outbound(record);
  return await mirror("mentoring", api.mentoring.saveNote, {
    id: record.id,
    studentId: record.studentId,
    note: note ?? undefined,
    flag: flag ?? undefined,
    recommendations: recommendations ?? undefined,
    updatedAt: updatedAt || undefined,
  });
}

export async function mirrorAdvisee(record) {
  if (!mirrorable("advisees", record)) return false;
  return await mirror("mentoring", api.mentoring.addAdvisee, { id: record.id, studentId: record.studentId, since: record.since || undefined });
}

export async function mirrorRemoveAdvisee(studentId) {
  if (!studentId) return false;
  return await mirror("mentoring", api.mentoring.removeAdvisee, { studentId });
}

/** Requests (both directions), advisees (both directions) and — for mentors — notes, in one request. */
export async function syncRemoteMentoring() {
  const remote = await pull("mentoring", api.mentoring.myMentoring);
  if (!remote) return 0;
  const account = currentAccount();
  const isFaculty = Boolean(account && FACULTY_ROLES.includes(account.role));
  const requests = mergeRemote("mentorshipRequests", remote.requests);
  const advisees = mergeRemote("advisees", remote.advisees, {
    // An advisee link the mentor removed on another device is removed here.
    prune: pruneAllowed("advisees")
      ? (row) => isFaculty && row.facultyId === account.id && new Date(row.since || row.updatedAt || 0).getTime() < Date.now() - 60000
      : undefined,
  });
  const notes = mergeRemote("mentorNotes", remote.notes);
  if (account?.role === "student") await backfill("mentorshipRequests", requests.serverIds, mirrorMentorshipRequest);
  if (isFaculty) {
    await backfill("advisees", advisees.serverIds, mirrorAdvisee);
    await backfill("mentorNotes", notes.serverIds, mirrorMentorNote);
  }
  return requests.changed + advisees.changed + notes.changed;
}
