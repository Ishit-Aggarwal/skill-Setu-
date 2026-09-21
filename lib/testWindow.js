/**
 * When a skill test starts, when joining closes, and when it is over.
 *
 * One set of answers for the browser and the Convex functions, so the card a
 * candidate sees and the server that refuses a late attempt agree with each
 * other. Plain constants and functions, no "use client", for that reason.
 *
 *   start   — the moment the host pressed "Start Test" (`startedAt`), or the
 *             scheduled date and time if they never did.
 *   joining — open from the start for EXAM.JOIN_WINDOW_MINUTES. A candidate
 *             who has not opened the paper by then cannot come in part-way.
 *   end     — the start plus the test's own duration. Certificates for an
 *             in-person or hybrid sitting can only be released after this.
 *
 * `scheduledAt` + `scheduledTime` are the host's local wall-clock strings.
 * The browser that published the test also stores `scheduledAtMs`, the
 * absolute instant, because the Convex runtime is on UTC and would read
 * "10:00" as 10:00 UTC. Rows written before that field existed fall back to
 * India Standard Time, which is where every host on the platform is.
 */

import { EXAM } from "./settings";

const IST_OFFSET = "+05:30";

/** The scheduled start as an absolute timestamp, or null when undated. */
export function scheduledStartMs(test) {
  if (!test) return null;
  if (Number.isFinite(test.scheduledAtMs)) return test.scheduledAtMs;
  if (!test.scheduledAt) return null;
  const time = test.scheduledTime || "00:00";
  const local = new Date(`${test.scheduledAt}T${time}`).getTime();
  if (!Number.isNaN(local)) return local;
  return null;
}

/**
 * The same, computed by a runtime that is not in the host's timezone. The
 * browser stores the local answer as `scheduledAtMs`; this is only the
 * fallback for rows that predate it.
 */
export function scheduledStartMsUTC(test) {
  if (!test) return null;
  if (Number.isFinite(test.scheduledAtMs)) return test.scheduledAtMs;
  if (!test.scheduledAt) return null;
  const time = test.scheduledTime || "00:00";
  const ts = Date.parse(`${test.scheduledAt}T${time.length === 5 ? `${time}:00` : time}${IST_OFFSET}`);
  return Number.isNaN(ts) ? null : ts;
}

/** Minutes a test runs for, read off its free-text duration ("60 mins"). */
export function durationMinutes(test) {
  const m = /(\d+)/.exec(String(test?.duration || ""));
  const minutes = m ? Number(m[1]) : 15;
  return Math.max(5, Math.min(600, minutes));
}

function startedAtMs(test) {
  if (!test?.startedAt) return null;
  const ts = Date.parse(test.startedAt);
  return Number.isNaN(ts) ? null : ts;
}

/**
 * When the sitting began, or will begin. The host pressing "Start Test" wins
 * over the timetable; otherwise the timetable is the start.
 */
export function testStartMs(test, { serverSide = false } = {}) {
  return startedAtMs(test) ?? (serverSide ? scheduledStartMsUTC(test) : scheduledStartMs(test));
}

export function joinWindowMinutes(test) {
  return Math.min(EXAM.JOIN_WINDOW_MINUTES, durationMinutes(test));
}

/** The last moment a candidate may open the paper. */
export function joinClosesMs(test, opts) {
  const start = testStartMs(test, opts);
  return start == null ? null : start + joinWindowMinutes(test) * 60000;
}

/** When the sitting is over — start plus the test's own length. */
export function testEndMs(test, opts) {
  const start = testStartMs(test, opts);
  return start == null ? null : start + durationMinutes(test) * 60000;
}

/**
 * Where a test is on its timeline:
 *   "unscheduled" — no date (only a record from before dates were required)
 *   "upcoming"    — before the start
 *   "open"        — started; candidates may still join
 *   "locked"      — in progress; joining has closed
 *   "ended"       — over
 */
export function testPhase(test, now = Date.now(), opts) {
  const start = testStartMs(test, opts);
  if (start == null) return "unscheduled";
  if (now < start) return "upcoming";
  if (now < joinClosesMs(test, opts)) return "open";
  if (now < testEndMs(test, opts)) return "locked";
  return "ended";
}

export function isLive(phase) {
  return phase === "open" || phase === "locked";
}

export function hasEnded(test, now = Date.now(), opts) {
  return testPhase(test, now, opts) === "ended";
}

/* ------------------------------------------------------------------ */
/* The optional live meeting on an online or hybrid test               */
/* ------------------------------------------------------------------ */

/**
 * "none" — the exam room monitors the sitting by itself (the default);
 * "live" — the host also runs a meeting and publishes its link.
 * A test published before the choice existed is "live" if it has a link.
 */
export function meetingMode(test) {
  if (test?.meetingMode === "live" || test?.meetingMode === "none") return test.meetingMode;
  return test?.meetingLink ? "live" : "none";
}

/** The last moment the meeting choice or its link may change: the lead time before the start. */
export function meetingEditDeadlineMs(test) {
  const start = scheduledStartMs(test);
  return start == null ? null : start - EXAM.MEETING_LINK_LEAD_HOURS * 60 * 60 * 1000;
}

export function canEditMeeting(test, now = Date.now()) {
  if (test?.startedAt) return false;
  const deadline = meetingEditDeadlineMs(test);
  return deadline == null || now <= deadline;
}

/** The sentence under the meeting controls on the host's card. */
export function meetingEditNote(test, now = Date.now()) {
  const deadline = meetingEditDeadlineMs(test);
  const hours = EXAM.MEETING_LINK_LEAD_HOURS;
  if (deadline == null) return `You can change this until ${hours} hours before the test starts.`;
  const when = new Date(deadline).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  if (now > deadline || test?.startedAt) return `Locked — changes closed ${hours} hours before the start.`;
  return `You can change this until ${hours} hours before the test starts (by ${when}).`;
}
