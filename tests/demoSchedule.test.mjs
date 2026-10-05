import { test } from "node:test";
import assert from "node:assert/strict";
import { datedInternship, datedProgramme, internshipNeedsRedate, isoInDays, programmeNeedsRedate, rollOverSeedTests, successorSchedule } from "../lib/demoSchedule.js";
import { hasEnded } from "../lib/testWindow.js";

const DAY = 86400000;
const NOW = Date.UTC(2026, 9, 5, 6, 0); // 5 Oct 2026, 11:30 IST

function fixed(seedId, startMs, extra = {}) {
  return { id: `t-${seedId}-${startMs}`, seedId, title: seedId, scheduledAtMs: startMs, duration: "15 mins", mode: "Online", ...extra };
}

test("sample dates are offsets from today, never fixed days", () => {
  assert.equal(datedInternship({ title: "x", deadlineInDays: 13 }, NOW).deadline, isoInDays(13, NOW));
  assert.equal("deadlineInDays" in datedInternship({ deadlineInDays: 1 }, NOW), false);
  const p = datedProgramme({ title: "p", startInDays: 2, lengthDays: 5 }, NOW);
  assert.equal(p.startDate, isoInDays(2, NOW));
  assert.equal(p.endDate, isoInDays(6, NOW));
});

test("a passed deadline or a finished programme needs re-dating", () => {
  assert.equal(internshipNeedsRedate({ deadline: "2026-09-15" }, "2026-10-05"), true);
  assert.equal(internshipNeedsRedate({ deadline: "2026-10-05" }, "2026-10-05"), false);
  assert.equal(programmeNeedsRedate({ startDate: "2026-09-10", endDate: "2026-09-15" }, "2026-10-05"), true);
  assert.equal(programmeNeedsRedate({ startDate: "2026-10-04", endDate: "2026-10-08" }, "2026-10-05"), false);
});

test("an ended sample test gets a fresh successor and the untouched one goes", () => {
  const ended = fixed("seed-test-1", NOW - 20 * DAY);
  const upcoming = fixed("seed-test-2", NOW + 3 * DAY);
  const templates = new Map([
    ["seed-test-1", fixed("seed-test-1", NOW + 4 * DAY, { id: undefined })],
    ["seed-test-2", fixed("seed-test-2", NOW + 8 * DAY, { id: undefined })],
  ]);
  let n = 0;
  const out = rollOverSeedTests([ended, upcoming], templates, { now: NOW, newId: () => `new-${++n}`, extra: () => ({ ownerId: "seed" }) });

  assert.deepEqual(out.removed.map((r) => r.id), [ended.id]);
  assert.equal(out.created.length, 1);
  const next = out.created[0];
  assert.equal(next.id, "new-1");
  assert.equal(next.seedId, "seed-test-1");
  assert.equal(next.ownerId, "seed");
  assert.equal(next.rolledFrom, ended.id);
  assert.equal(hasEnded(next, NOW), false);
  assert.ok(out.rows.includes(upcoming));
  assert.equal(out.rows.some((r) => r.id === ended.id), false);
});

test("an ended test someone sat is kept as history under a retired seedId", () => {
  const ended = fixed("seed-test-1", NOW - 2 * DAY);
  const templates = new Map([["seed-test-1", fixed("seed-test-1", NOW + 4 * DAY, { id: undefined })]]);
  const out = rollOverSeedTests([ended], templates, { now: NOW, newId: () => "new", isUsed: () => true });
  assert.equal(out.rows.length, 2);
  assert.equal(out.retired[0].seedId, `seed-test-1@${ended.id}`);
  assert.equal(out.rows.filter((r) => r.seedId === "seed-test-1").length, 1);
});

test("nothing changes while every sample test is still to come", () => {
  const rows = [fixed("seed-test-1", NOW + DAY)];
  const templates = new Map([["seed-test-1", fixed("seed-test-1", NOW + 4 * DAY)]]);
  const out = rollOverSeedTests(rows, templates, { now: NOW, newId: () => "x" });
  assert.equal(out.rows, rows);
  assert.equal(out.created.length, 0);
});

test("a template already in the past never loops", () => {
  const ended = fixed("seed-test-1", NOW - 2 * DAY);
  const templates = new Map([["seed-test-1", fixed("seed-test-1", NOW - DAY)]]);
  const out = rollOverSeedTests([ended], templates, { now: NOW, newId: () => "x" });
  assert.equal(out.created.length, 0);
});

test("a fixed sitting's successor keeps its weekday and time, at least a day away", () => {
  const start = NOW - 12 * DAY;
  const next = successorSchedule({ scheduledAtMs: start, duration: "45 mins" }, NOW);
  assert.ok(next.scheduledAtMs >= NOW + DAY);
  assert.equal((next.scheduledAtMs - start) % (7 * DAY), 0);
  assert.equal(next.scheduledAt, new Date(next.scheduledAtMs + 5.5 * 3600000).toISOString().slice(0, 10));
});

test("a legacy row with only wall-clock strings is read as IST", () => {
  const next = successorSchedule({ scheduledAt: "2026-09-30", scheduledTime: "10:30", duration: "15 mins" }, NOW);
  assert.equal(new Date(next.scheduledAtMs + 5.5 * 3600000).toISOString().slice(11, 16), "10:30");
  assert.ok(next.scheduledAtMs > NOW);
});

test("an open window reopens now for the same length", () => {
  const next = successorSchedule({ scheduleType: "window", windowOpensAtMs: NOW - 10 * DAY, windowClosesAtMs: NOW - 5 * DAY }, NOW);
  assert.equal(next.windowOpensAtMs, NOW);
  assert.equal(next.windowClosesAtMs, NOW + 5 * DAY);
});
