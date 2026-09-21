import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, isClosed, autoSubmitMessage, TRANSITIONS, EXAM_STATES } from "../lib/examState.js";
import { EXAM } from "../lib/settings.js";

test("Section 2.2 — every state in the machine has a transition row", () => {
  for (const s of EXAM_STATES) assert.ok(Array.isArray(TRANSITIONS[s]), s);
});

test("the happy path is allowed end to end", () => {
  const path = ["NOT_STARTED", "CONSENT_PENDING", "PERMISSIONS_PENDING", "DEVICE_CHECK", "FULLSCREEN_PENDING", "IN_PROGRESS", "SUBMITTED", "GRADED"];
  for (let i = 1; i < path.length; i += 1) assert.equal(canTransition(path[i - 1], path[i]), true, `${path[i - 1]} -> ${path[i]}`);
});

test("pauses resolve or auto-submit, and closed states never reopen", () => {
  assert.equal(canTransition("IN_PROGRESS", "PAUSED_VIOLATION"), true);
  assert.equal(canTransition("PAUSED_VIOLATION", "IN_PROGRESS"), true);
  assert.equal(canTransition("PAUSED_VIOLATION", "AUTO_SUBMITTED"), true);
  assert.equal(canTransition("PAUSED_VIOLATION", "SUBMITTED"), false);
  assert.equal(canTransition("GRADED", "IN_PROGRESS"), false);
  assert.equal(canTransition("SUBMITTED", "IN_PROGRESS"), false);
  assert.equal(canTransition("IN_PROGRESS", "CONSENT_PENDING"), false);
  assert.equal(isClosed("GRADED"), true);
  assert.equal(isClosed("AUTO_SUBMITTED"), true);
  assert.equal(isClosed("IN_PROGRESS"), false);
});

test("Section 2.5 — auto-submit messages state the reason plainly", () => {
  assert.match(autoSubmitMessage("fullscreen_timeout"), /exited fullscreen and did not return in time/);
  assert.match(autoSubmitMessage("violation_limit_reached"), /too many violations/);
  assert.match(autoSubmitMessage("time_up"), /time allowed/);
  assert.match(autoSubmitMessage("unknown"), /automatically submitted/);
});

test("Section 0.3 — the exam limits live in one config", () => {
  assert.equal(EXAM.VIOLATION_LIMIT, 3);
  assert.equal(EXAM.FULLSCREEN_GRACE_SECONDS, 15);
  assert.equal(EXAM.AUDIO_FLAG_SECONDS, 5);
  assert.equal(EXAM.RETENTION_DAYS, 90);
  assert.equal(EXAM.DEFAULT_VIOLATION_PENALTY, 2);
  assert.equal(EXAM.DEVICE_GRACE_SECONDS, 3);
  assert.deepEqual(EXAM.VIOLATION_TYPES, ["FULLSCREEN_EXIT", "TAB_SWITCH", "BLOCKED_ACTION", "NO_FACE", "MULTIPLE_FACES", "LOOKING_AWAY", "FACE_MISMATCH", "VOICE_DETECTED"]);
  EXAM.VIOLATION_TYPES.forEach((t) => assert.ok(EXAM.EVENT_TYPES.includes(t), t + " is a known event"));
  // Camera/microphone violations are a subset of the penalised ones, with their own limit.
  assert.equal(EXAM.MONITOR_VIOLATION_LIMIT, 3);
  EXAM.MONITOR_VIOLATION_TYPES.forEach((t) => assert.ok(EXAM.VIOLATION_TYPES.includes(t), t + " is penalised"));
  assert.ok(!EXAM.MONITOR_VIOLATION_TYPES.includes("TAB_SWITCH"));
  // Leaving the window is not a penalty: it ends the attempt.
  assert.deepEqual(EXAM.INSTANT_FAIL_TYPES, ["TAB_SWITCH", "WINDOW_CLOSED"]);
  EXAM.INSTANT_FAIL_TYPES.forEach((t) => assert.ok(EXAM.EVENT_TYPES.includes(t), t + " is a known event"));
  assert.ok(EXAM.HEARTBEAT_TIMEOUT_SECONDS > EXAM.HEARTBEAT_SECONDS * 2);
  assert.equal(EXAM.MEETING_LINK_LEAD_HOURS, 3);
});
