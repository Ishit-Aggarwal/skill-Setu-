import { test } from "node:test";
import assert from "node:assert/strict";
import { EXAM } from "../lib/settings.js";
import { durationMinutes, joinClosesMs, joinWindowMinutes, scheduledStartMsUTC, testEndMs, testPhase, testStartMs } from "../lib/testWindow.js";
import { canTakeNow, getRegistrationStatus } from "../lib/testStatus.js";

const MIN = 60000;
const T0 = Date.UTC(2026, 8, 21, 4, 30); // 10:00 IST on 21 Sep 2026

function scheduled(overrides = {}) {
  return { scheduledAt: "2026-09-21", scheduledTime: "10:00", scheduledAtMs: T0, duration: "60 mins", mode: "Online", ...overrides };
}

test("the browser's absolute instant wins over the wall-clock strings", () => {
  assert.equal(testStartMs(scheduled()), T0);
  assert.equal(testStartMs(scheduled(), { serverSide: true }), T0);
});

test("a row without the instant is read as IST on the server, never as UTC", () => {
  const legacy = { scheduledAt: "2026-09-21", scheduledTime: "10:00" };
  assert.equal(scheduledStartMsUTC(legacy), T0);
  assert.equal(testStartMs(legacy, { serverSide: true }), T0);
});

test("pressing Start moves the start; the timetable is the fallback", () => {
  const early = new Date(T0 - 5 * MIN).toISOString();
  assert.equal(testStartMs(scheduled({ startedAt: early })), T0 - 5 * MIN);
  assert.equal(testEndMs(scheduled({ startedAt: early })), T0 - 5 * MIN + 60 * MIN);
});

test("the joining window never outlasts a short test", () => {
  assert.equal(joinWindowMinutes(scheduled()), EXAM.JOIN_WINDOW_MINUTES);
  assert.equal(joinWindowMinutes(scheduled({ duration: "5 mins" })), 5);
  assert.equal(durationMinutes({ duration: "nonsense" }), 15);
});

test("phases: upcoming → open → locked → ended", () => {
  const t = scheduled();
  assert.equal(testPhase(t, T0 - 1), "upcoming");
  assert.equal(testPhase(t, T0), "open");
  assert.equal(testPhase(t, joinClosesMs(t) - 1), "open");
  assert.equal(testPhase(t, joinClosesMs(t)), "locked");
  assert.equal(testPhase(t, testEndMs(t) - 1), "locked");
  assert.equal(testPhase(t, testEndMs(t)), "ended");
  assert.equal(testPhase({ duration: "60 mins" }, T0), "unscheduled");
});

test("a registered online candidate can join only while joining is open", () => {
  const t = scheduled();
  const reg = { attended: false, missedRecorded: false };
  assert.equal(getRegistrationStatus(t, reg, null, T0 - MIN), "upcoming");
  assert.equal(getRegistrationStatus(t, reg, null, T0 + MIN), "in-progress");
  assert.equal(getRegistrationStatus(t, reg, null, T0 + 11 * MIN), "locked");
  assert.equal(getRegistrationStatus(t, reg, null, T0 + 61 * MIN), "ended");
  assert.equal(canTakeNow(t, "in-progress"), true);
  assert.equal(canTakeNow(t, "locked"), false);
  assert.equal(canTakeNow(t, "ended"), false);
});

test("an in-person or hybrid sitting never locks a candidate out of confirming attendance", () => {
  for (const mode of ["Offline", "Hybrid"]) {
    const t = scheduled({ mode });
    const reg = { attended: false, missedRecorded: false };
    assert.equal(getRegistrationStatus(t, reg, null, T0 + 11 * MIN), "in-progress");
    assert.equal(getRegistrationStatus(t, reg, null, T0 + 61 * MIN), "ended");
    assert.equal(canTakeNow(t, "ended"), true, mode);
  }
});

test("what already happened outranks the clock", () => {
  const t = scheduled();
  assert.equal(getRegistrationStatus(t, { attended: true }, null, T0 + 61 * MIN), "awaiting-result");
  assert.equal(getRegistrationStatus(t, { missedRecorded: true }, null, T0 + MIN), "missed");
  assert.equal(getRegistrationStatus(t, {}, { missed: false, score: 80 }, T0 + 11 * MIN), "completed");
  assert.equal(getRegistrationStatus(t, {}, { missed: true }, T0 + 11 * MIN), "missed");
});

test("meeting — optional, and locked from the lead time before the start", async () => {
  const { canEditMeeting, meetingEditDeadlineMs, meetingEditNote, meetingMode } = await import("../lib/testWindow.js");
  const { EXAM } = await import("../lib/settings.js");
  const H = 60 * 60 * 1000;
  const start = Date.now() + 10 * H;
  const t = { scheduledAtMs: start, meetingMode: "live", meetingLink: "https://meet.google.com/abc" };
  assert.equal(meetingMode(t), "live");
  assert.equal(meetingMode({ meetingLink: "https://x" }), "live", "a test from before the choice existed keeps its meeting");
  assert.equal(meetingMode({}), "none");
  assert.equal(meetingMode({ meetingMode: "none", meetingLink: "https://x" }), "none");
  assert.equal(meetingEditDeadlineMs(t), start - EXAM.MEETING_LINK_LEAD_HOURS * H);
  assert.ok(canEditMeeting(t, start - (EXAM.MEETING_LINK_LEAD_HOURS + 1) * H));
  assert.ok(!canEditMeeting(t, start - (EXAM.MEETING_LINK_LEAD_HOURS - 1) * H));
  assert.ok(!canEditMeeting({ ...t, startedAt: new Date().toISOString() }, start - 20 * H), "a started sitting is never re-pointed");
  assert.match(meetingEditNote(t, start - 20 * H), /until 3 hours before/);
  assert.match(meetingEditNote(t, start - 1 * H), /Locked/);
  assert.match(meetingEditNote({}), /until 3 hours/);
});
