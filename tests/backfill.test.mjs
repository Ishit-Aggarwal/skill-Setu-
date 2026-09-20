import { test } from "node:test";
import assert from "node:assert/strict";
import { selectBackfillRows } from "../lib/backfill.js";

const rows = [
  { id: "s1", studentId: "user_1", internshipId: "i1" },
  { id: "s2", studentId: "user_1", internshipId: "i2" },
  { id: "s3", studentId: "user_2", internshipId: "i1" },
  { id: "s4", studentId: "demo-student", internshipId: "i1" },
  { id: "s5", studentId: "user_1", internshipId: "i3", seedId: "seed-x" },
  { studentId: "user_1", internshipId: "i9" },
];

test("selects only the account's own, unknown-to-server, non-seed rows", () => {
  const picked = selectBackfillRows(rows, { collection: "savedInternships", ownerId: "user_1", serverIds: ["s2"] });
  assert.deepEqual(picked.map((r) => r.id), ["s1"]);
});

test("never runs in demo mode, for demo accounts, or for users", () => {
  assert.deepEqual(selectBackfillRows(rows, { collection: "savedInternships", ownerId: "user_1", demoMode: true }), []);
  assert.deepEqual(selectBackfillRows(rows, { collection: "savedInternships", ownerId: "demo-student" }), []);
  assert.deepEqual(selectBackfillRows([{ id: "u1", role: "student" }], { collection: "users", ownerId: "user_1" }), []);
});

test("legacy institution rows keyed only by name belong to the matching institution account", () => {
  const drives = [
    { id: "d1", instituteName: "AIIA, New Delhi", title: "a" },
    { id: "d2", instituteName: "NIA Jaipur", title: "b" },
    { id: "d3", institutionId: "user_inst1", instituteName: "AIIA, New Delhi", title: "c" },
    { id: "d4", institutionId: "user_other", instituteName: "AIIA, New Delhi", title: "d" },
  ];
  const picked = selectBackfillRows(drives, { collection: "drives", ownerId: "user_inst1", ownerName: " aiia, new delhi ", serverIds: [] });
  assert.deepEqual(picked.map((r) => r.id), ["d1", "d3"]);
});

test("child rows resolve their owner through the parent", () => {
  const invites = [
    { id: "v1", driveId: "d1", company: "x" },
    { id: "v2", driveId: "d2", company: "y" },
  ];
  const owners = { d1: "user_inst1", d2: "user_other" };
  const picked = selectBackfillRows(invites, { collection: "driveInvites", ownerId: "user_inst1", parentOwnerFor: (r) => owners[r.driveId] });
  assert.deepEqual(picked.map((r) => r.id), ["v1"]);
});
