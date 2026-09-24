import { test } from "node:test";
import assert from "node:assert/strict";
import { canComment, canJoin, canManage, canModerate, canPost, canSeeTest, canView, checkInviteCode, cleanLinks, normaliseInviteCode, validateCommunityFields } from "../lib/communityRules.js";

const student = { id: "s1", role: "student" };
const prof = { id: "p1", role: "academician" };
const community = (over = {}) => ({ id: "c1", visibility: "open", sameInstitutionOnly: false, institutionId: "inst1", institutionName: "AIIA New Delhi", memberCap: null, memberCount: 3, allowComments: false, archivedAt: null, inviteCode: "7KQ2M9XA", inviteCodeUses: 0, ...over });
const member = (status, role = "member") => ({ status, role });

test("canView across visibility × membership", () => {
  for (const visibility of ["open", "closed"]) {
    assert.equal(canView(community({ visibility }), null, student), "card");
    assert.equal(canView(community({ visibility }), member("active"), student), "full");
    assert.equal(canView(community({ visibility }), member("pending"), student), "card");
    assert.equal(canView(community({ visibility }), member("banned"), student), "none");
    assert.equal(canView(community({ visibility }), member("removed"), student), "card");
  }
  const invite = community({ visibility: "invite" });
  assert.equal(canView(invite, null, student), "none");
  assert.equal(canView(invite, member("invited"), student), "card");
  assert.equal(canView(invite, member("active"), student), "full");
  assert.equal(canView(invite, member("removed"), student), "none");
  assert.equal(canView(invite, null, { id: "a", role: "admin" }), "full");
});

test("canJoin: open, closed, invite-only by route", () => {
  assert.equal(canJoin(community(), null, student, "open").ok, true);
  assert.equal(canJoin(community({ visibility: "closed" }), null, student, "open").ok, false);
  assert.equal(canJoin(community({ visibility: "closed" }), null, student, "request").ok, true);
  assert.equal(canJoin(community({ visibility: "closed" }), member("pending"), student, "request").ok, false);
  assert.equal(canJoin(community({ visibility: "invite" }), null, student, "open").ok, false);
  assert.equal(canJoin(community({ visibility: "invite" }), null, student, "request").ok, false);
  assert.equal(canJoin(community({ visibility: "invite" }), null, student, "code", { code: "7kq2-m9xa" }).ok, true);
  assert.equal(canJoin(community({ visibility: "invite" }), null, student, "code", { code: "WRONG123" }).ok, false);
  assert.equal(canJoin(community({ visibility: "invite" }), member("invited"), student, "invite").ok, true);
  assert.equal(canJoin(community({ visibility: "invite" }), null, student, "invite").ok, false);
  assert.equal(canJoin(community(), member("active"), student, "open").ok, false);
  assert.equal(canJoin(community(), null, prof, "open").ok, false);
});

test("a ban refuses every route; a removal does not", () => {
  for (const [via, ctx] of [["open", {}], ["request", {}], ["code", { code: "7KQ2M9XA" }], ["invite", {}]]) {
    const c = community({ visibility: via === "request" ? "closed" : via === "open" ? "open" : "invite" });
    assert.equal(canJoin(c, member("banned"), student, via, ctx).ok, false, via);
  }
  assert.equal(canJoin(community(), member("removed"), student, "open").ok, true);
  assert.equal(canJoin(community({ visibility: "closed" }), member("removed"), student, "request").ok, true);
});

test("same-institution restriction fails closed", () => {
  const c = community({ sameInstitutionOnly: true });
  assert.equal(canJoin(c, null, student, "open", { actorInstitutionId: "inst1" }).ok, true);
  assert.match(canJoin(c, null, student, "open", { actorInstitutionId: "inst2" }).reason, /only for students of AIIA New Delhi/);
  assert.equal(canJoin(c, null, student, "open", { actorInstitutionId: null }).ok, false);
  assert.equal(canJoin(community({ sameInstitutionOnly: false }), null, student, "open", { actorInstitutionId: null }).ok, true);
});

test("cap, archive and invite code expiry / uses", () => {
  assert.equal(canJoin(community({ memberCap: 3, memberCount: 3 }), null, student, "open").ok, false);
  assert.equal(canJoin(community({ memberCap: 3, memberCount: 3, visibility: "closed" }), null, student, "request").ok, true);
  assert.equal(canJoin(community({ archivedAt: 1 }), null, student, "open").ok, false);
  const now = Date.now();
  assert.match(checkInviteCode(community({ inviteCodeExpiresAt: now - 1 }), "7KQ2M9XA", now).reason, /expired/);
  assert.match(checkInviteCode(community({ inviteCodeMaxUses: 2, inviteCodeUses: 2 }), "7KQ2M9XA", now).reason, /maximum/);
  assert.equal(checkInviteCode(community({ inviteCodeMaxUses: 2, inviteCodeUses: 1 }), " 7kq2 m9xa ", now).ok, true);
  assert.equal(normaliseInviteCode("7kq2-m9xa"), "7KQ2M9XA");
});

test("posting, moderating, managing and commenting", () => {
  const c = community();
  assert.equal(canPost(c, member("active", "owner")), true);
  assert.equal(canPost(c, member("active", "moderator")), true);
  assert.equal(canPost(c, member("active")), false);
  assert.equal(canPost(community({ archivedAt: 1 }), member("active", "owner")), false);
  assert.equal(canModerate(c, member("active", "moderator")), true);
  assert.equal(canModerate(c, member("removed", "moderator")), false);
  assert.equal(canManage(c, member("active", "moderator")), false);
  assert.equal(canManage(c, member("active", "owner")), true);
  assert.equal(canComment(c, member("active")), false);
  assert.equal(canComment(community({ allowComments: true }), member("active")), true);
  assert.equal(canComment(community({ allowComments: true }), member("pending")), false);
  assert.equal(canComment(c, member("active", "moderator")), true);
});

test("community tests: members and the host only", () => {
  const t = { audience: "community", communityId: "c1", ownerId: "p1" };
  assert.equal(canSeeTest(t, member("active"), student), true);
  for (const status of ["pending", "invited", "removed", "banned", "left", "declined"]) assert.equal(canSeeTest(t, member(status), student), false, status);
  assert.equal(canSeeTest(t, null, student), false);
  assert.equal(canSeeTest(t, null, prof), true);
  assert.equal(canSeeTest({ audience: "public" }, null, student), true);
  assert.equal(canSeeTest({}, null, null), true);
});

test("fields and links are validated", () => {
  assert.match(validateCommunityFields({ name: "ab" }), /between 3 and 80/);
  assert.equal(validateCommunityFields({ name: "Dravyaguna Batch", visibility: "open" }), null);
  assert.match(validateCommunityFields({ name: "Dravyaguna Batch", memberCap: 5 }), /member cap/);
  assert.deepEqual(cleanLinks([{ url: "javascript:alert(1)" }, { url: "https://ncism.gov.in", title: "NCISM" }]).map((l) => l.url), ["https://ncism.gov.in"]);
});
