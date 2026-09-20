import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptRemoteRow, isDemoId, isSeedRow, rowOwnerId, isMirrorable, OWNER_FIELD } from "../lib/demoIsolation.js";

test("demo ids and seed rows are recognised", () => {
  assert.equal(isDemoId("demo-student"), true);
  assert.equal(isDemoId("user_abc"), false);
  assert.equal(isDemoId(null), false);
  assert.equal(isSeedRow({ ownerId: "seed" }), true);
  assert.equal(isSeedRow({ seedId: "seed-int-1", ownerId: "user_1" }), true);
  assert.equal(isSeedRow({ ownerId: "user_1" }), false);
});

test("real portal: accepts real rows, rejects demo and seed rows", () => {
  assert.equal(acceptRemoteRow("drives", { institutionId: "user_inst1" }, { demoMode: false }), true);
  assert.equal(acceptRemoteRow("drives", { institutionId: "demo-institution" }, { demoMode: false }), false);
  assert.equal(acceptRemoteRow("internships", { ownerId: "seed" }, { demoMode: false }), false);
  assert.equal(acceptRemoteRow("internships", { ownerId: "user_1", seedId: "x" }, { demoMode: false }), false);
});

test("demo mode: accepts only demo-persona rows", () => {
  assert.equal(acceptRemoteRow("mentorNotes", { facultyId: "demo-academician" }, { demoMode: true }), true);
  assert.equal(acceptRemoteRow("mentorNotes", { facultyId: "user_fac1" }, { demoMode: true }), false);
  assert.equal(acceptRemoteRow("skillTests", { ownerId: "seed" }, { demoMode: true }), false);
});

test("a row with no resolvable owner is refused on both sides", () => {
  assert.equal(acceptRemoteRow("drives", { title: "x" }, { demoMode: false }), false);
  assert.equal(acceptRemoteRow("drives", { title: "x" }, { demoMode: true }), false);
  assert.equal(acceptRemoteRow("unknownTable", { ownerId: "user_1" }, { demoMode: false }), false);
});

test("child rows take their owner from the parent", () => {
  const msg = { collabId: "collab_1", body: "hi" };
  assert.equal(rowOwnerId("collabMessages", msg), null);
  assert.equal(rowOwnerId("collabMessages", msg, "user_fac1"), "user_fac1");
  assert.equal(acceptRemoteRow("collabMessages", msg, { demoMode: false }), false);
  assert.equal(acceptRemoteRow("collabMessages", msg, { demoMode: false, parentOwnerId: "user_fac1" }), true);
  assert.equal(acceptRemoteRow("collabMessages", msg, { demoMode: false, parentOwnerId: "demo-academician" }), false);
  assert.equal(acceptRemoteRow("driveEligibility", { driveId: "d1", studentId: "s1" }, { demoMode: true, parentOwnerId: "demo-institution" }), true);
});

test("seed rows are never mirrorable; every migrated collection names an owner field", () => {
  assert.equal(isMirrorable("internships", { ownerId: "seed", id: "x" }), false);
  assert.equal(isMirrorable("savedInternships", { studentId: "user_1" }), true);
  [
    "skillTestRegistrations", "credentials", "portfolios", "savedInternships", "savedMentorships", "savedSearches", "studentNotifications",
    "notifyBatches", "mentorshipRequests", "mentorNotes", "advisees", "collabListings", "collabInterests", "researchOutputs", "recruiters",
    "companyReviews", "institutionProfiles", "institutionAdmins", "institutionDocs", "drives", "mous", "announcements", "placementHistory",
    "activityLog", "applications",
  ].forEach((c) => assert.ok(OWNER_FIELD[c], `${c} has an owner field`));
});
