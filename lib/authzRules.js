/**
 * Who may read which row — the pure part.
 *
 * `convex/_lib/authz.js#canRead` gathers the related rows (the posting behind
 * an application, the listing behind a collab message, the institution a
 * student resolves to) and hands them here. Keeping the decision in a plain
 * function means the rules are unit-tested under Node, where Convex modules
 * cannot be loaded, and means there is exactly one place to look when asking
 * "can a student see this?".
 *
 * Every legitimate cross-account read is encoded below. Anything not listed is
 * refused.
 */

import { OWNER_FIELD, CHILD_COLLECTIONS, isDemoId } from "./demoIsolation";

/** Roles that review candidates: talent pool, candidate modal, roster. */
export const REVIEWER_ROLES = ["industry", "institution", "academician", "admin"];

/** Tables every student and faculty member of an institution may read. */
export const INSTITUTION_SHARED_TABLES = new Set(["drives", "driveEligibility", "announcements", "institutionProfiles"]);

/** Tables only the institution account itself may read. */
export const INSTITUTION_PRIVATE_TABLES = new Set([
  "driveInvites",
  "mous",
  "placementHistory",
  "institutionAdmins",
  "institutionDocs",
  "notifyBatches",
  "activityLog",
]);

/** Application fields the candidate never sees. */
export const RECRUITER_ONLY_APPLICATION_FIELDS = ["recruiterNotes", "interviewMode", "interviewAt", "rejectionReason", "offerNotes"];

export function stripRecruiterFields(application) {
  if (!application) return application;
  const out = { ...application };
  RECRUITER_ONLY_APPLICATION_FIELDS.forEach((f) => delete out[f]);
  return out;
}

/**
 * Whose row this is, for the demo wall: the owner field, or — for a child
 * row — the owner of the parent the caller resolved.
 */
function ownerOf(table, row, related) {
  if (!CHILD_COLLECTIONS.has(table)) {
    const field = OWNER_FIELD[table];
    return field && typeof row?.[field] === "string" ? row[field] : null;
  }
  if (table.startsWith("collab")) return related.listing?.ownerId || null;
  if (table.startsWith("drive")) return related.drive?.institutionId || null;
  return null;
}

function ownsRow(actor, table, row) {
  if (CHILD_COLLECTIONS.has(table)) return false;
  const field = OWNER_FIELD[table];
  return Boolean(field && row?.[field] && row[field] === actor.id);
}

function sameEmail(a, b) {
  return Boolean(a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase());
}

/**
 * @param actor    { id, role, user: { email, ... } }
 * @param table    collection name
 * @param row      the row being read
 * @param related  rows the rule needs, resolved by the caller:
 *   internship            – applications: the posting
 *   recruiter             – applications/recruiters: recruiters row for the actor's email at that company
 *   test                  – skillTestRegistrations: the test
 *   studentInstitutionId  – skillTestRegistrations: institution the registered student resolves to
 *   actorInstitutionId    – institution tables / registrations: institution the actor resolves to
 *   listing               – collab child rows: the listing
 *   hasAcceptedInterest   – collab child rows: actor has an accepted interest on the listing
 *   drive                 – driveInvites / driveEligibility: the drive
 *   student               – portfolios: the student's user row
 */
export function canReadPure(actor, table, row, related = {}) {
  if (!actor || !row) return false;
  if (actor.role === "admin") return true;
  // The demo wall, server-side: a demo persona reads only rows that demo
  // personas own, and a real account never reads a demo persona's row —
  // whatever the role-based rule below would otherwise allow.
  const owner = ownerOf(table, row, related);
  if (owner && isDemoId(owner) !== isDemoId(actor.id)) return false;
  if (ownsRow(actor, table, row)) return true;

  switch (table) {
    case "applications": {
      if (row.studentId === actor.id) return true;
      const internship = related.internship;
      if (!internship) return false;
      if (internship.ownerId === actor.id) return true;
      const recruiter = related.recruiter;
      return Boolean(recruiter && recruiter.companyOwnerId === internship.ownerId && sameEmail(recruiter.email, actor.user?.email));
    }

    case "mentorNotes":
      return row.facultyId === actor.id;

    case "mentorshipRequests":
    case "advisees":
      return row.studentId === actor.id || row.facultyId === actor.id;

    case "studentNotifications":
      return row.studentId === actor.id;

    case "skillTestRegistrations": {
      if (row.userId === actor.id) return true;
      if (related.test && related.test.ownerId === actor.id) return true;
      if (["institution", "academician"].includes(actor.role)) {
        return Boolean(related.actorInstitutionId && related.studentInstitutionId && related.actorInstitutionId === related.studentInstitutionId);
      }
      return false;
    }

    case "credentials":
      return row.studentId === actor.id || row.issuerId === actor.id;

    case "collabListings":
    case "researchOutputs":
    case "companyReviews":
      return true;

    case "collabInterests":
    case "collabMessages":
    case "collabMilestones":
    case "collabFiles": {
      const listing = related.listing;
      if (!listing) return false;
      if (listing.ownerId === actor.id) return true;
      if (table === "collabInterests" && row.userId === actor.id) return true;
      return Boolean(related.hasAcceptedInterest);
    }

    case "recruiters":
      return row.companyOwnerId === actor.id || sameEmail(row.email, actor.user?.email);

    case "portfolios": {
      if (row.studentId === actor.id) return true;
      if (!REVIEWER_ROLES.includes(actor.role)) return false;
      return related.student?.openToOpportunities !== false;
    }

    case "savedInternships":
    case "savedMentorships":
    case "savedSearches":
      return false;

    case "driveInvites":
    case "driveEligibility": {
      const drive = related.drive;
      if (!drive) return false;
      if (drive.institutionId === actor.id) return true;
      if (table === "driveEligibility") {
        if (row.studentId === actor.id) return true;
        return Boolean(related.actorInstitutionId && related.actorInstitutionId === drive.institutionId);
      }
      return false;
    }

    default:
      break;
  }

  if (INSTITUTION_PRIVATE_TABLES.has(table)) return row.institutionId === actor.id;
  if (INSTITUTION_SHARED_TABLES.has(table)) {
    if (row.institutionId === actor.id) return true;
    if (!["student", "academician"].includes(actor.role)) return false;
    return Boolean(related.actorInstitutionId && row.institutionId === related.actorInstitutionId);
  }
  return false;
}
