"use client";

/**
 * An institution's records between this device and the shared database:
 * profile, admins, documents, drives (with invited companies and tagged
 * students), MOUs, notices, placement history, activity log and the roster
 * of invited students. Same mirror pattern as lib/postings.js.
 *
 * Rows are owned by the institution ACCOUNT (`institutionId`); students and
 * faculty of that institution pull the shared subset (drives, notices,
 * profile, their drive eligibility) through one query that resolves which
 * institution they belong to on the server.
 */

import { api } from "../convex/_generated/api";
import { backendMutation } from "./convexBrowser";
import { backfill, mergeRemote, mirror, mirrorable, outbound, pull } from "./remoteSync";
import { all, currentAccount, isDemoMode } from "./store";

export const OWNED_TABLES = ["institutionProfiles", "institutionAdmins", "institutionDocs", "drives", "mous", "announcements", "placementHistory", "activityLog"];
export const CHILD_TABLES = ["driveInvites", "driveEligibility"];
const SHARED_TABLES = ["drives", "announcements", "institutionProfiles"];

const LOCAL_ONLY = ["institutionId", "needsOwner", "recipients"];

/* ---------------- the institution's own rows ---------------- */

export async function mirrorInstitutionRow(table, record) {
  if (!OWNED_TABLES.includes(table) || !record?.id) return false;
  if (record.seedId) return false;
  return await mirror("institution", api.institution.save, { table, id: record.id, row: outbound(record, LOCAL_ONLY) });
}

export async function mirrorInstitutionPatch(table, id, patch) {
  if (!OWNED_TABLES.includes(table) || !id) return false;
  return await mirror("institution", api.institution.update, { table, id, patch: outbound(patch, LOCAL_ONLY) });
}

export async function mirrorRemoveInstitutionRow(table, id) {
  if (!OWNED_TABLES.includes(table) || !id) return false;
  return await mirror("institution", api.institution.remove, { table, id });
}

export async function mirrorDriveChild(table, record) {
  if (!CHILD_TABLES.includes(table) || !record?.id || !record.driveId) return false;
  return await mirror("institution", api.institution.saveChild, { table, id: record.id, row: outbound(record) });
}

export async function mirrorRemoveDriveChild(table, id) {
  if (!CHILD_TABLES.includes(table) || !id) return false;
  return await mirror("institution", api.institution.removeChild, { table, id });
}

/* ---------------- invited students ---------------- */

/** Returns the server's result ({ ok, reason, id, user }) or null when it could not reach the server. */
export async function mirrorInvitedStudent(record) {
  if (!record?.email || !record.name) return null;
  if (!mirrorable("users", record)) return null;
  try {
    return await backendMutation(api.users.inviteStudent, { student: outbound(record, ["passwordHash", "emailVerified", "invited", "role", "institution", "institutionId"]) });
  } catch (error) {
    console.warn("[institution] Could not add that student to the shared roster yet:", error?.message || error);
    return null;
  }
}

/* ---------------- pulls ---------------- */

function driveOwnerLookup() {
  const owners = {};
  all("drives").forEach((d) => {
    owners[d.id] = d.institutionId;
  });
  return (row) => owners[row.driveId];
}

/** The institution account's own portal, everything in one request. */
export async function syncRemoteInstitution() {
  const account = currentAccount();
  if (!account) return 0;

  if (account.role === "institution") {
    const remote = await pull("institution", api.institution.mine);
    if (!remote) return 0;
    let changed = 0;
    for (const table of OWNED_TABLES) {
      const { changed: n, serverIds } = mergeRemote(table, remote[table]);
      changed += n;
      await backfill(table, serverIds, (row) => mirrorInstitutionRow(table, row));
    }
    const parentOwnerFor = driveOwnerLookup();
    for (const table of CHILD_TABLES) {
      const { changed: n, serverIds } = mergeRemote(table, remote[table], { parentOwnerFor });
      changed += n;
      await backfill(table, serverIds, (row) => mirrorDriveChild(table, row), { parentOwnerFor });
    }
    flagNeedsOwner(Boolean(remote.needsOwner));
    return changed;
  }

  if (account.role === "student" || account.role === "academician") {
    const remote = await pull("institution", api.institution.forMyInstitution);
    if (!remote) return 0;
    let changed = 0;
    for (const table of SHARED_TABLES) changed += mergeRemote(table, remote[table]).changed;
    const parentOwnerFor = driveOwnerLookup();
    changed += mergeRemote("driveEligibility", remote.driveEligibility, { parentOwnerFor }).changed;
    return changed;
  }
  return 0;
}

const NEEDS_OWNER_KEY = "ayusetu:institution:needsOwner";

function flagNeedsOwner(on) {
  try {
    if (on) window.localStorage.setItem(NEEDS_OWNER_KEY, "1");
    else window.localStorage.removeItem(NEEDS_OWNER_KEY);
  } catch {
    /* ignore */
  }
}

/** Whether the server reported legacy rows it could not attach to this account. */
export function institutionNeedsOwner() {
  if (typeof window === "undefined" || isDemoMode()) return false;
  try {
    return window.localStorage.getItem(NEEDS_OWNER_KEY) === "1";
  } catch {
    return false;
  }
}

/** The roster: students linked to, or naming, the institution. */
export async function syncRemoteRoster() {
  const account = currentAccount();
  if (!account || !["institution", "academician"].includes(account.role)) return 0;
  const remote = await pull("roster", api.users.listForInstitution);
  if (!remote) return 0;
  return mergeRemote("users", remote).changed;
}
