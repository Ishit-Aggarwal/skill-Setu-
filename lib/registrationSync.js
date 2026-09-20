"use client";

/**
 * Skill-test registrations between this device and the shared database.
 *
 * A student registers on their laptop; the host counts registrations and
 * picks certificate recipients on theirs. Held locally the count was always
 * zero for the host. Same mirror pattern as lib/postings.js.
 */

import { api } from "../convex/_generated/api";
import { backfill, mergeRemote, mirror, mirrorable, outbound, pull } from "./remoteSync";
import { currentAccount } from "./store";

const HOST_ROLES = ["industry", "academician", "institution", "admin"];

export async function mirrorRegistration(record) {
  if (!mirrorable("skillTestRegistrations", record)) return false;
  const { userId, paymentStatus, missedRecorded, attended, attendedAt, score, student, ...fields } = outbound(record);
  return await mirror("registrations", api.skillTests.register, { ...fields, id: record.id, paid: Boolean(record.paid) });
}

export async function mirrorRegistrationPatch(id, patch) {
  if (!id) return false;
  return await mirror("registrations", api.skillTests.updateRegistrationByClientId, { id, patch: outbound(patch) });
}

/**
 * Students pull their own registrations; hosts pull every registration on
 * the tests they own (with the student's public profile attached, which the
 * roster and the certificate dialog read).
 */
export async function syncRemoteRegistrations() {
  const account = currentAccount();
  if (!account) return 0;
  const isHost = HOST_ROLES.includes(account.role);
  const remote = isHost
    ? await pull("registrations", api.skillTests.listRegistrationsForMyTests)
    : await pull("registrations", api.skillTests.listRegistrationsForUser, { userId: account.id });
  if (!remote) return 0;
  const { changed, serverIds } = mergeRemote("skillTestRegistrations", remote);
  if (!isHost) await backfill("skillTestRegistrations", serverIds, mirrorRegistration);
  return changed;
}
