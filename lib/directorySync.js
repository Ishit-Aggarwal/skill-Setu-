"use client";

/**
 * The public directory between this device and the shared database: the
 * accounts a role may browse (faculty for mentors, companies, institutions,
 * and — for reviewers — students), plus institution profiles.
 *
 * These are catalogue reads, not mirrors: accounts are written through the
 * auth path and profiles through the institution's own mirror. Pulling them
 * here is what lets a directory, talent pool or roster list people who signed
 * up on a different device.
 */

import { api } from "../convex/_generated/api";
import { mergeRemote, pull } from "./remoteSync";
import { currentAccount } from "./store";

const REVIEWER_ROLES = ["industry", "institution", "academician", "admin"];

export async function syncRemoteUsersByRole(role) {
  const account = currentAccount();
  if (!account) return 0;
  // A student may not list students; the server would refuse, so don't ask.
  if (role === "student" && !REVIEWER_ROLES.includes(account.role)) return 0;
  const remote = await pull("directory", api.users.listByRole, { role });
  if (!remote) return 0;
  return mergeRemote("users", remote).changed;
}

export async function syncRemoteInstitutionProfiles() {
  const remote = await pull("directory", api.institution.listProfiles, {}, { anonymous: true });
  if (!remote) return 0;
  return mergeRemote("institutionProfiles", remote).changed;
}
