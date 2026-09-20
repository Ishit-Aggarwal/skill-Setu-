/**
 * The one rule that keeps demo mode sealed off from the four real portals.
 *
 * Demo personas are real Convex accounts with fixed `demo-*` ids, and the rows
 * they create are mirrored into the same tables as everyone else's. Nothing on
 * the server tells the two apart except the owner id, so every pull from the
 * shared database has to decide, row by row, whether the row belongs on this
 * side of the wall. That decision lives here and nowhere else: a sync module
 * that filters rows any other way is a bug.
 *
 * Plain constants and pure functions, no "use client" — the Node test runner
 * loads this file directly.
 */

export const DEMO_ID_PREFIX = "demo-";
export const SEED_OWNER = "seed";

/**
 * Which field names a row's owner, per collection.
 *
 * Child rows (a message on a collaboration, a company invited to a drive) do
 * not carry an owner of their own; the caller resolves the parent's owner and
 * passes it as `parentOwnerId`. Those collections are listed with the field
 * that points at the parent so the mapping is still one table.
 */
export const OWNER_FIELD = {
  skillTestRegistrations: "userId",
  credentials: "studentId",
  portfolios: "studentId",
  savedInternships: "studentId",
  savedMentorships: "studentId",
  savedSearches: "ownerId",
  studentNotifications: "studentId",
  notifyBatches: "institutionId",
  mentorshipRequests: "studentId",
  mentorNotes: "facultyId",
  advisees: "facultyId",
  collabListings: "ownerId",
  collabInterests: "userId",
  collabMessages: "collabId", // child row — owner comes from the listing
  collabMilestones: "collabId", // child row
  collabFiles: "collabId", // child row
  collabResponses: "ownerId",
  researchOutputs: "facultyId",
  recruiters: "companyOwnerId",
  companyReviews: "authorId", // reviews are public; the author decides which side they belong to
  institutionProfiles: "institutionId",
  institutionAdmins: "institutionId",
  institutionDocs: "institutionId",
  drives: "institutionId",
  driveInvites: "driveId", // child row — owner comes from the drive
  driveEligibility: "driveId", // child row
  mous: "institutionId",
  announcements: "institutionId",
  placementHistory: "institutionId",
  activityLog: "institutionId",
  applications: "studentId",
  internships: "ownerId",
  skillTests: "ownerId",
  programs: "ownerId",
  users: "id",
};

/** Collections whose owner is only known through their parent row. */
export const CHILD_COLLECTIONS = new Set([
  "collabMessages",
  "collabMilestones",
  "collabFiles",
  "driveInvites",
  "driveEligibility",
]);

export function isDemoId(id) {
  return typeof id === "string" && id.startsWith(DEMO_ID_PREFIX);
}

/** Sample catalogue rows: seeded per device, never pushed, never pulled. */
export function isSeedRow(row) {
  if (!row || typeof row !== "object") return false;
  if (row.seedId) return true;
  return row.ownerId === SEED_OWNER;
}

/**
 * The id that owns a row, or null when it cannot be resolved.
 *
 * For child collections the caller must supply the parent's owner; the row's
 * own `collabId` / `driveId` is a pointer, not an identity.
 */
export function rowOwnerId(collection, row, parentOwnerId) {
  if (!row || typeof row !== "object") return null;
  if (CHILD_COLLECTIONS.has(collection)) {
    return typeof parentOwnerId === "string" && parentOwnerId ? parentOwnerId : null;
  }
  const field = OWNER_FIELD[collection];
  if (!field) return null;
  const value = row[field];
  return typeof value === "string" && value ? value : null;
}

/**
 * Whether a row pulled from the shared database may be merged into this
 * device's store.
 *
 *   demoMode = true  → only rows owned by a demo persona
 *   demoMode = false → anything except demo-persona rows and seed rows
 *
 * A row whose owner cannot be resolved is refused on both sides: an
 * unattributable row is exactly the kind that would otherwise leak.
 */
export function acceptRemoteRow(collection, row, { demoMode = false, parentOwnerId } = {}) {
  if (isSeedRow(row)) return false;
  const owner = rowOwnerId(collection, row, parentOwnerId);
  if (!owner) return false;
  if (owner === SEED_OWNER) return false;
  return demoMode ? isDemoId(owner) : !isDemoId(owner);
}

/** Rows that must never leave this device, whichever side of the wall they are on. */
export function isMirrorable(collection, row, parentOwnerId) {
  if (isSeedRow(row)) return false;
  return Boolean(rowOwnerId(collection, row, parentOwnerId));
}
