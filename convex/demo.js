import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { collectStorageIds } from "./_lib/rows";
import { ensureDemoFeatures } from "./_lib/demoSeed";

/**
 * Resetting the demo tour.
 *
 * The four demo personas are shared accounts, so whatever a visitor creates
 * while touring — a posting, a drive, a mentorship request, an uploaded
 * resume — is mirrored here and would greet the next visitor. This wipes
 * every row those personas own (and the files behind them) so the tour goes
 * back to its seeded state; the browser re-seeds its own copy afterwards.
 *
 * Only a demo persona can call it, and it only ever touches rows whose
 * owner is a demo persona. Real accounts' data is never in scope.
 *
 * The rows the tour needs on the server (communities, the community window
 * test, the Resume Coach analysis, an issued certificate) are written back
 * straight afterwards by ensureDemoFeatures, as they are on every demo sign-in.
 */

const DEMO_IDS = ["demo-student", "demo-industry", "demo-academician", "demo-institution"];

/** table → [index, field] pairs whose value is a demo persona id. */
const OWNED = [
  ["internships", "by_owner", "ownerId"],
  ["skillTests", "by_owner", "ownerId"],
  ["skillTestQuestions", "by_test", "testId"], // resolved via the tests below
  ["applications", "by_student", "studentId"],
  ["skillTestRegistrations", "by_user", "userId"],
  ["assessmentAttempts", "by_student", "studentId"],
  ["assessments", "by_student", "studentId"],
  ["examAttempts", "by_student", "studentId"],
  ["examConsents", "by_student", "studentId"],
  ["credentials", "by_student", "studentId"],
  ["credentials", "by_issuer", "issuerId"],
  ["certificateSettings", "by_owner", "ownerId"],
  ["portfolios", "by_student", "studentId"],
  ["savedInternships", "by_student", "studentId"],
  ["savedMentorships", "by_student", "studentId"],
  ["savedSearches", "by_owner", "ownerId"],
  ["studentNotifications", "by_student", "studentId"],
  ["notifyBatches", "by_institution", "institutionId"],
  ["mentorshipRequests", "by_student", "studentId"],
  ["mentorshipRequests", "by_faculty", "facultyId"],
  ["mentorNotes", "by_faculty", "facultyId"],
  ["advisees", "by_faculty", "facultyId"],
  ["advisees", "by_student", "studentId"],
  ["officeHours", "by_faculty", "facultyId"],
  ["mentorBookings", "by_faculty", "facultyId"],
  ["mentorBookings", "by_student", "studentId"],
  ["programs", "by_owner", "ownerId"],
  ["programRegistrations", "by_user", "userId"],
  ["programFeedback", "by_user", "userId"],
  ["collabResponses", "by_owner", "ownerId"],
  ["collabListings", "by_owner", "ownerId"],
  ["collabInterests", "by_user", "userId"],
  ["researchOutputs", "by_faculty", "facultyId"],
  ["recruiters", "by_owner", "companyOwnerId"],
  ["companyReviews", "by_author", "authorId"],
  ["institutionProfiles", "by_institution", "institutionId"],
  ["institutionAdmins", "by_institution", "institutionId"],
  ["institutionDocs", "by_institution", "institutionId"],
  ["drives", "by_institution", "institutionId"],
  ["mous", "by_institution", "institutionId"],
  ["announcements", "by_institution", "institutionId"],
  ["placementHistory", "by_institution", "institutionId"],
  ["activityLog", "by_institution", "institutionId"],
  ["communities", "by_owner", "ownerId"],
  ["communityMembers", "by_user_status", "userId"],
  ["uploads", "by_owner", "ownerId"],
  ["resumeAnalyses", "by_student", "studentId"],
  ["studyPlanProgress", "by_student", "studentId"],
  ["aiUsage", "by_user_day_route", "userId"],
];

/** Child tables reached through a parent row's client id. */
const CHILDREN = {
  internships: [["applications", "by_internship", "internshipId"]],
  skillTests: [
    ["skillTestQuestions", "by_test", "testId"],
    ["skillTestRegistrations", "by_test", "testId"],
    ["examAttempts", "by_test", "testId"],
    ["certificateOverrides", "by_test", "testId"],
    ["testReminders", "by_test_user_kind", "testId"],
  ],
  examAttempts: [
    ["examEvents", "by_attempt", "attemptId"],
    ["examRecordingChunks", "by_attempt", "attemptId"],
    ["examConsents", "by_attempt", "attemptId"],
  ],
  collabListings: [
    ["collabInterests", "by_listing", "listingId"],
    ["collabMessages", "by_collab", "collabId"],
    ["collabMilestones", "by_collab", "collabId"],
    ["collabFiles", "by_collab", "collabId"],
  ],
  drives: [
    ["driveInvites", "by_drive", "driveId"],
    ["driveEligibility", "by_drive", "driveId"],
  ],
  officeHours: [["mentorBookings", "by_slot", "slotId"]],
  programs: [
    ["programRegistrations", "by_program", "programId"],
    ["programFeedback", "by_program", "programId"],
  ],
  communities: [
    ["communityPosts", "by_community_created", "communityId"],
    ["communityMembers", "by_community_status", "communityId"],
    ["communityComments", "by_community", "communityId"],
    ["communityDownloads", "by_community", "communityId"],
    ["communityReports", "by_community_status", "communityId"],
    ["communityAudit", "by_community", "communityId"],
  ],
};

async function deleteRow(ctx, table, row, counts, files, seen) {
  // A row can be reached twice (an application by its student and by its
  // posting); the second visit must not delete what is already gone.
  if (seen.has(String(row._id))) return;
  seen.add(String(row._id));
  collectStorageIds(row).forEach((id) => files.add(id));
  for (const [childTable, index, field] of CHILDREN[table] || []) {
    const key = row.id || String(row._id);
    const children = await ctx.db
      .query(childTable)
      .withIndex(index, (q) => q.eq(field, key))
      .collect();
    for (const child of children) await deleteRow(ctx, childTable, child, counts, files, seen);
  }
  await ctx.db.delete(row._id);
  counts[table] = (counts[table] || 0) + 1;
}

export const reset = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!DEMO_IDS.includes(actor.id)) throw authError("Only the demo tour can be reset.");

    const counts = {};
    const files = new Set();
    const seen = new Set();
    for (const [table, index, field] of OWNED) {
      if (table === "skillTestQuestions") continue; // reached through its test
      for (const demoId of DEMO_IDS) {
        const rows = await ctx.db
          .query(table)
          .withIndex(index, (q) => q.eq(field, demoId))
          .collect();
        for (const row of rows) await deleteRow(ctx, table, row, counts, files, seen);
      }
    }

    // Students the demo institution invited to its roster.
    const invited = await ctx.db
      .query("users")
      .withIndex("by_institution", (q) => q.eq("institutionId", "demo-institution"))
      .collect();
    for (const row of invited) {
      if (DEMO_IDS.includes(row.id)) continue;
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", row.id))
        .collect();
      for (const s of sessions) await ctx.db.delete(s._id);
      await deleteRow(ctx, "users", row, counts, files, seen);
    }

    // The personas' own uploads: photo, logo, banner, gallery.
    for (const demoId of DEMO_IDS) {
      const persona = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("id"), demoId))
        .first();
      if (!persona) continue;
      collectStorageIds({ a: persona.avatarStorageId && { storageId: persona.avatarStorageId }, l: persona.logoStorageId && { storageId: persona.logoStorageId }, b: persona.bannerStorageId && { storageId: persona.bannerStorageId }, g: persona.gallery }).forEach((id) => files.add(id));
      await ctx.db.patch(persona._id, {
        avatarStorageId: null,
        avatarUrl: null,
        avatarDataUrl: null,
        bannerStorageId: null,
        bannerUrl: null,
        bannerDataUrl: null,
        logoStorageId: null,
        logoUrl: null,
        logoDataUrl: null,
        gallery: [],
        updatedAt: new Date().toISOString(),
      });
    }

    let deletedFiles = 0;
    for (const storageId of files) {
      try {
        await ctx.storage.delete(storageId);
        deletedFiles += 1;
      } catch {
        /* already gone */
      }
    }
    const seed = await ensureDemoFeatures(ctx);
    return { ok: true, rows: counts, files: deletedFiles, reseeded: seed.seeded };
  },
});

/** Run on every demo sign-in: writes the tour's shared rows if they are missing. */
export const seedFeatures = internalMutation({
  args: {},
  handler: async (ctx) => await ensureDemoFeatures(ctx),
});
