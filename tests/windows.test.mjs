import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canRevealAnswers,
  durationMinutes,
  formatSpan,
  lastStartMs,
  testEndMs,
  testPhase,
  testStartMs,
  upcomingSortMs,
  validateWindow,
  windowStatusLabel,
} from "../lib/testWindow.js";
import { durationError, durationString, formatDuration, parseDurationText, stepDuration } from "../lib/duration.js";
import { getRegistrationStatus } from "../lib/testStatus.js";

const MIN = 60000;
const HOUR = 60 * MIN;
const OPEN = Date.UTC(2026, 8, 24, 4, 30);

function windowTest(overrides = {}) {
  return { scheduleType: "window", mode: "Online", windowOpensAtMs: OPEN, windowClosesAtMs: OPEN + 48 * HOUR, durationMinutes: 90, ...overrides };
}

test("window timeline: opens, last start = close − duration, close", () => {
  const t = windowTest();
  assert.equal(testStartMs(t), OPEN);
  assert.equal(testEndMs(t), OPEN + 48 * HOUR);
  assert.equal(lastStartMs(t), OPEN + 48 * HOUR - 90 * MIN);
  // A pressed "Start Test" never moves a window.
  assert.equal(testStartMs({ ...t, startedAt: new Date(OPEN - HOUR).toISOString() }), OPEN);
});

test("window phases at every boundary", () => {
  const t = windowTest();
  const last = lastStartMs(t);
  assert.equal(testPhase(t, OPEN - 1), "upcoming");
  assert.equal(testPhase(t, OPEN), "open");
  assert.equal(testPhase(t, last - 1), "open");
  assert.equal(testPhase(t, last), "locked");
  assert.equal(testPhase(t, OPEN + 48 * HOUR - 1), "locked");
  assert.equal(testPhase(t, OPEN + 48 * HOUR), "ended");
  assert.equal(testPhase({ scheduleType: "window" }, OPEN), "unscheduled");
});

test("fixed sittings keep the joining window as their last start", () => {
  const fixed = { scheduledAtMs: OPEN, duration: "60 mins", mode: "Online" };
  assert.equal(lastStartMs(fixed), OPEN + 10 * MIN);
  assert.equal(testPhase(fixed, OPEN + 10 * MIN), "locked");
  assert.equal(testPhase(fixed, OPEN + 60 * MIN), "ended");
});

test("validateWindow: 24 h minimum, 90 day maximum, duration + 1 h, horizon, no past opening", () => {
  const now = OPEN;
  const ok = { opensAtMs: now, closesAtMs: now + 24 * HOUR, duration: 90, now };
  assert.equal(validateWindow(ok), null);
  assert.match(validateWindow({ ...ok, closesAtMs: now + 23 * HOUR }), /at least 24 hours/);
  assert.match(validateWindow({ ...ok, closesAtMs: now + 91 * 24 * HOUR }), /at most 90 days/);
  assert.equal(validateWindow({ ...ok, closesAtMs: now + 90 * 24 * HOUR }), null);
  assert.match(validateWindow({ ...ok, opensAtMs: now - HOUR, closesAtMs: now + 48 * HOUR }), /past/);
  assert.equal(validateWindow({ ...ok, opensAtMs: now - HOUR, closesAtMs: now + 48 * HOUR, allowPastOpen: true }), null);
  assert.match(validateWindow({ ...ok, duration: 600, closesAtMs: now + 10 * HOUR + 59 * MIN }), /24 hours/);
  assert.match(validateWindow({ ...ok, latestMs: now + 12 * HOUR }), /year ahead/);
  assert.match(validateWindow({ ...ok, opensAtMs: NaN }), /opens/);
});

test("legacy rows: no scheduleType reads as fixed, free-text duration still parses", () => {
  assert.equal(durationMinutes({ duration: "60 mins" }), 60);
  assert.equal(durationMinutes({ duration: "1 hr 30 mins" }), 90);
  assert.equal(durationMinutes({ duration: "2h" }), 120);
  assert.equal(durationMinutes({ duration: "nonsense" }), 15);
  assert.equal(durationMinutes({ duration: "15 mins", durationMinutes: 75 }), 75);
  assert.equal(durationMinutes({ durationMinutes: 9999 }), 600);
  assert.equal(testStartMs({ scheduledAtMs: OPEN }), OPEN);
});

test("formatDuration, durationString and parse round-trip", () => {
  assert.equal(formatDuration(90), "1 h 30 min");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(120), "2 h");
  assert.equal(durationString(90), "1 hr 30 mins");
  assert.equal(durationString(60), "1 hr");
  assert.equal(durationString(5), "5 mins");
  for (const m of [5, 30, 60, 75, 600]) assert.equal(parseDurationText(durationString(m)), m);
});

test("DurationPicker step logic: minute rollover and clamps", () => {
  assert.deepEqual(stepDuration({ hours: 0, minutes: 55 }, "minutes", 1), { hours: 1, minutes: 0 });
  assert.deepEqual(stepDuration({ hours: 1, minutes: 0 }, "minutes", -1), { hours: 0, minutes: 55 });
  assert.deepEqual(stepDuration({ hours: 0, minutes: 57 }, "minutes", 1), { hours: 1, minutes: 0 });
  assert.deepEqual(stepDuration({ hours: 0, minutes: 57 }, "minutes", -1), { hours: 0, minutes: 55 });
  assert.deepEqual(stepDuration({ hours: 0, minutes: 5 }, "minutes", -1), { hours: 0, minutes: 5 });
  assert.deepEqual(stepDuration({ hours: 10, minutes: 0 }, "minutes", 1), { hours: 10, minutes: 0 });
  assert.deepEqual(stepDuration({ hours: 9, minutes: 30 }, "hours", 1), { hours: 10, minutes: 0 });
  assert.deepEqual(stepDuration({ hours: 0, minutes: 30 }, "hours", -1), { hours: 0, minutes: 30 });
  assert.equal(durationError(0, 4), "A test must run for at least 5 minutes.");
  assert.match(durationError(10, 5), /at most 10 h/);
  assert.equal(durationError(1, 60), "Minutes must be between 0 and 59.");
  assert.equal(durationError(1, 30), null);
});

test("answers are revealed for a window only once it has closed", () => {
  const t = windowTest();
  assert.equal(canRevealAnswers(t, OPEN + HOUR), false);
  assert.equal(canRevealAnswers(t, OPEN + 48 * HOUR - 1), false);
  assert.equal(canRevealAnswers(t, OPEN + 48 * HOUR), true);
  assert.equal(canRevealAnswers({ scheduledAtMs: OPEN, duration: "30 mins" }, OPEN), true);
});

test("card copy and sorting", () => {
  const t = windowTest();
  assert.match(windowStatusLabel(t, OPEN - 52 * HOUR), /^Opens in 2 d 4 h$/);
  assert.match(windowStatusLabel(t, OPEN), /^Open · 1 d 22 h left$/);
  assert.equal(windowStatusLabel(t, lastStartMs(t) + 1), "Closing: no new starts");
  assert.equal(windowStatusLabel(t, OPEN + 49 * HOUR), "Closed");
  assert.equal(formatSpan(12 * MIN), "12 min");
  assert.equal(upcomingSortMs(t), lastStartMs(t));
});

test("registration status: cancelled wins over the clock", () => {
  const t = windowTest();
  assert.equal(getRegistrationStatus(t, { cancelledAt: "x" }, null, OPEN + HOUR), "cancelled");
  assert.equal(getRegistrationStatus({ ...t, cancelledAt: "x" }, {}, null, OPEN + HOUR), "cancelled");
  assert.equal(getRegistrationStatus(t, {}, null, OPEN + HOUR), "in-progress");
  assert.equal(getRegistrationStatus(t, {}, null, lastStartMs(t)), "locked");
});
