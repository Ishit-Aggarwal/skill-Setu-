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
 *
 * An open-window test (`scheduleType: "window"`) runs on the same clock with
 * different edges: it opens by itself at `windowOpensAtMs`, closes at
 * `windowClosesAtMs`, and a candidate may start any time before
 * `lastStartMs` = close − duration, which is what guarantees everyone who
 * starts gets the full time. Nobody presses Start Test on a window.
 */

import { EXAM } from "./settings";
import { clampDurationMinutes, formatDuration, parseDurationText } from "./duration";

export { formatDuration } from "./duration";

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

/** "fixed" (one sitting at a set time) or "window" (take it any time within a period). */
export function scheduleType(test) {
  return test?.scheduleType === "window" ? "window" : "fixed";
}

export function isWindowTest(test) {
  return scheduleType(test) === "window";
}

/**
 * Minutes a test runs for. `durationMinutes` on the row wins; rows written
 * before it existed are read off their free-text duration ("60 mins",
 * "1 hr 30 mins").
 */
export function durationMinutes(test) {
  if (Number.isFinite(test?.durationMinutes)) return clampDurationMinutes(test.durationMinutes);
  const parsed = parseDurationText(test?.duration);
  return clampDurationMinutes(parsed == null ? 15 : parsed);
}

/** "1 h 30 min" for any test row. */
export function testDurationLabel(test) {
  return formatDuration(durationMinutes(test));
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
  if (isWindowTest(test)) return Number.isFinite(test.windowOpensAtMs) ? test.windowOpensAtMs : null;
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

/** When the sitting is over — start plus the test's own length; a window's close. */
export function testEndMs(test, opts) {
  if (isWindowTest(test)) return Number.isFinite(test.windowClosesAtMs) ? test.windowClosesAtMs : null;
  const start = testStartMs(test, opts);
  return start == null ? null : start + durationMinutes(test) * 60000;
}

/**
 * The last moment a candidate may begin. A window: its close minus the
 * duration, so a late starter still gets the full time. A fixed sitting: the
 * end of its joining window.
 */
export function lastStartMs(test, opts) {
  if (isWindowTest(test)) {
    const close = testEndMs(test, opts);
    return close == null ? null : close - durationMinutes(test) * 60000;
  }
  return joinClosesMs(test, opts);
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
  if (now < lastStartMs(test, opts)) return "open";
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

/* ------------------------------------------------------------------ */
/* Open windows                                                         */
/* ------------------------------------------------------------------ */

const HOUR = 3600000;
const DAY = 24 * HOUR;

/** "2 d 4 h", "5 h 10 min", "12 min", "under a minute". */
export function formatSpan(ms) {
  const total = Math.max(0, Math.round(ms / 60000));
  if (total < 1) return "under a minute";
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d) return h ? `${d} d ${h} h` : `${d} d`;
  if (h) return m ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}

function shortWhen(ms) {
  return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function timeOnly(ms) {
  return new Date(ms).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/**
 * Checks an open window before it is published or changed. Returns the
 * sentence to show, or null.
 *   opensAtMs / closesAtMs — absolute instants
 *   duration               — minutes each candidate has
 *   latestMs               — the scheduling horizon (a year ahead)
 *   allowPastOpen          — editing a window that is already open
 */
export function validateWindow({ opensAtMs, closesAtMs, duration, now = Date.now(), latestMs = null, allowPastOpen = false }) {
  if (!Number.isFinite(opensAtMs)) return "Choose when the window opens.";
  if (!Number.isFinite(closesAtMs)) return "Choose when the window closes.";
  // Five minutes of slack for "open immediately" on a slow form.
  if (!allowPastOpen && opensAtMs < now - 5 * 60000) return "The window can't open in the past.";
  const length = closesAtMs - opensAtMs;
  if (length < EXAM.MIN_WINDOW_HOURS * HOUR) return `An open window must stay open for at least ${EXAM.MIN_WINDOW_HOURS} hours.`;
  if (length > EXAM.MAX_WINDOW_DAYS * DAY) return `An open window can stay open for at most ${EXAM.MAX_WINDOW_DAYS} days.`;
  if (latestMs != null && closesAtMs > latestMs) return "A window can be scheduled at most a year ahead.";
  const minutes = clampDurationMinutes(duration);
  if (closesAtMs < opensAtMs + minutes * 60000 + HOUR) return "The window must stay open for the test's duration plus at least an hour.";
  return null;
}

/** The line on a window card that explains the fairness rule. */
export function windowFairnessLine(test) {
  if (!isWindowTest(test)) return "";
  const last = lastStartMs(test);
  const close = testEndMs(test);
  if (last == null || close == null) return "";
  const sameDay = new Date(last).toDateString() === new Date(close).toDateString();
  return `Start any time before ${shortWhen(last)}. You'll have ${formatDuration(durationMinutes(test))} once you start. The window closes ${sameDay ? `at ${timeOnly(close)}` : `on ${shortWhen(close)}`}.`;
}

/** "Opens in 2 d 4 h" / "Open · 3 d 5 h left" / "Closing: no new starts" / "Closed". */
export function windowStatusLabel(test, now = Date.now()) {
  const phase = testPhase(test, now);
  if (phase === "upcoming") return `Opens in ${formatSpan(testStartMs(test) - now)}`;
  if (phase === "open") return `Open · ${formatSpan(lastStartMs(test) - now)} left`;
  if (phase === "locked") return "Closing: no new starts";
  if (phase === "ended") return "Closed";
  return "";
}

/**
 * Whether a candidate may see correct answers and explanations yet. A fixed
 * sitting: straight after grading, as always. A window: only once it has
 * closed — otherwise the first candidate could hand the key to the rest.
 */
export function canRevealAnswers(test, now = Date.now()) {
  if (!isWindowTest(test)) return true;
  const close = testEndMs(test);
  return close != null && now >= close;
}

/** Sort key for "upcoming" lists: a window's last start, a fixed sitting's start. */
export function upcomingSortMs(test) {
  if (isWindowTest(test)) return lastStartMs(test) ?? Number.MAX_SAFE_INTEGER;
  return testStartMs(test) ?? Number.MAX_SAFE_INTEGER;
}
