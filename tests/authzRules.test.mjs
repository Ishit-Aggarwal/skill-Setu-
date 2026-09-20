import { test } from "node:test";
import assert from "node:assert/strict";
import { canReadPure, stripRecruiterFields } from "../lib/authzRules.js";

const student = { id: "stu1", role: "student", user: { email: "s@x.in" } };
const faculty = { id: "fac1", role: "academician", user: { email: "f@x.in" } };
const company = { id: "co1", role: "industry", user: { email: "hr@co.in" } };
const recruiter = { id: "rec1", role: "industry", user: { email: "priya@co.in" } };
const institution = { id: "inst1", role: "institution", user: { email: "i@x.in" } };
const admin = { id: "adm", role: "admin", user: {} };

test("own rows and admins", () => {
  assert.equal(canReadPure(student, "savedInternships", { studentId: "stu1" }), true);
  assert.equal(canReadPure(faculty, "savedInternships", { studentId: "stu1" }), false);
  assert.equal(canReadPure(admin, "mentorNotes", { facultyId: "fac1" }), true);
});

test("mentor notes are the faculty's alone, never the student's", () => {
  const note = { facultyId: "fac1", studentId: "stu1", note: "private" };
  assert.equal(canReadPure(faculty, "mentorNotes", note), true);
  assert.equal(canReadPure(student, "mentorNotes", note), false);
  assert.equal(canReadPure(institution, "mentorNotes", note), false);
});

test("applications: student, posting owner, or a recruiter on that company", () => {
  const app = { studentId: "stu1", internshipId: "i1" };
  const internship = { id: "i1", ownerId: "co1" };
  assert.equal(canReadPure(student, "applications", app, { internship }), true);
  assert.equal(canReadPure(company, "applications", app, { internship }), true);
  assert.equal(canReadPure(recruiter, "applications", app, { internship, recruiter: { companyOwnerId: "co1", email: "PRIYA@co.in" } }), true);
  assert.equal(canReadPure(recruiter, "applications", app, { internship, recruiter: { companyOwnerId: "other", email: "priya@co.in" } }), false);
  assert.equal(canReadPure({ id: "stu2", role: "student", user: {} }, "applications", app, { internship }), false);
  assert.deepEqual(
    stripRecruiterFields({ offerStage: "Offer sent", recruiterNotes: "x", interviewAt: "y", offerAmount: "1" }),
    { offerStage: "Offer sent", offerAmount: "1" }
  );
});

test("notifications only reach their recipient, faculty included", () => {
  assert.equal(canReadPure(faculty, "studentNotifications", { studentId: "fac1" }), true);
  assert.equal(canReadPure(student, "studentNotifications", { studentId: "fac1" }), false);
});

test("registrations: the student, the host, or staff of the student's institution", () => {
  const reg = { userId: "stu1", testId: "t1" };
  assert.equal(canReadPure(student, "skillTestRegistrations", reg), true);
  assert.equal(canReadPure(company, "skillTestRegistrations", reg, { test: { ownerId: "co1" } }), true);
  assert.equal(canReadPure(company, "skillTestRegistrations", reg, { test: { ownerId: "other" } }), false);
  assert.equal(canReadPure(institution, "skillTestRegistrations", reg, { actorInstitutionId: "inst1", studentInstitutionId: "inst1" }), true);
  assert.equal(canReadPure(institution, "skillTestRegistrations", reg, { actorInstitutionId: "inst1", studentInstitutionId: "inst2" }), false);
});

test("institution tables: the account, and shared tables for its own students and faculty", () => {
  const drive = { institutionId: "inst1" };
  assert.equal(canReadPure(institution, "drives", drive), true);
  assert.equal(canReadPure(student, "drives", drive, { actorInstitutionId: "inst1" }), true);
  assert.equal(canReadPure(student, "drives", drive, { actorInstitutionId: "inst2" }), false);
  assert.equal(canReadPure(student, "drives", drive, {}), false);
  assert.equal(canReadPure(company, "drives", drive, { actorInstitutionId: "inst1" }), false);
  assert.equal(canReadPure(student, "mous", { institutionId: "inst1" }, { actorInstitutionId: "inst1" }), false);
  assert.equal(canReadPure(institution, "mous", { institutionId: "inst1" }), true);
  assert.equal(canReadPure(student, "driveEligibility", { driveId: "d1", studentId: "stu1" }, { drive }), true);
  assert.equal(canReadPure(faculty, "driveEligibility", { driveId: "d1", studentId: "stu1" }, { drive, actorInstitutionId: "inst1" }), true);
  assert.equal(canReadPure(institution, "driveInvites", { driveId: "d1" }, { drive }), true);
  assert.equal(canReadPure(student, "driveInvites", { driveId: "d1" }, { drive, actorInstitutionId: "inst1" }), false);
});

test("collab threads: listing owner or an accepted collaborator; listings are public", () => {
  const listing = { id: "c1", ownerId: "fac1" };
  const msg = { collabId: "c1" };
  assert.equal(canReadPure(student, "collabListings", listing), true);
  assert.equal(canReadPure(faculty, "collabMessages", msg, { listing }), true);
  assert.equal(canReadPure(company, "collabMessages", msg, { listing, hasAcceptedInterest: true }), true);
  assert.equal(canReadPure(company, "collabMessages", msg, { listing, hasAcceptedInterest: false }), false);
  assert.equal(canReadPure(company, "collabInterests", { listingId: "c1", userId: "co1" }, { listing }), true);
});

test("portfolios: the student, or reviewers when the student is open to opportunities", () => {
  const p = { studentId: "stu1" };
  assert.equal(canReadPure(student, "portfolios", p), true);
  assert.equal(canReadPure(company, "portfolios", p, { student: { openToOpportunities: true } }), true);
  assert.equal(canReadPure(company, "portfolios", p, { student: { openToOpportunities: false } }), false);
  assert.equal(canReadPure({ id: "stu2", role: "student", user: {} }, "portfolios", p, { student: {} }), false);
});

test("recruiters, reviews, research outputs, credentials", () => {
  assert.equal(canReadPure(recruiter, "recruiters", { companyOwnerId: "co1", email: "priya@co.in" }), true);
  assert.equal(canReadPure(student, "recruiters", { companyOwnerId: "co1", email: "priya@co.in" }), false);
  assert.equal(canReadPure(student, "companyReviews", { company: "X" }), true);
  assert.equal(canReadPure(student, "researchOutputs", { facultyId: "fac1" }), true);
  assert.equal(canReadPure(company, "credentials", { studentId: "stu1", issuerId: "co1" }), true);
  assert.equal(canReadPure(faculty, "credentials", { studentId: "stu1", issuerId: "co1" }), false);
});

test("the demo wall holds server-side: real accounts never read demo rows, and vice versa", () => {
  const demoStudent = { id: "demo-student", role: "student", user: {} };
  const demoIndustry = { id: "demo-industry", role: "industry", user: {} };
  assert.equal(canReadPure(company, "portfolios", { studentId: "demo-student" }, { student: { openToOpportunities: true } }), false);
  assert.equal(canReadPure(demoIndustry, "portfolios", { studentId: "demo-student" }, { student: { openToOpportunities: true } }), true);
  assert.equal(canReadPure(demoIndustry, "portfolios", { studentId: "stu1" }, { student: { openToOpportunities: true } }), false);
  assert.equal(canReadPure(demoStudent, "drives", { institutionId: "inst1" }, { actorInstitutionId: "inst1" }), false);
  assert.equal(canReadPure(company, "collabMessages", { collabId: "c9" }, { listing: { ownerId: "demo-academician" }, hasAcceptedInterest: true }), false);
  assert.equal(canReadPure(institution, "driveEligibility", { driveId: "d9", studentId: "stu1" }, { drive: { institutionId: "demo-institution" } }), false);
});
