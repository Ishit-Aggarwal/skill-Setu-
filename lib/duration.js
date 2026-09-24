/**
 * How long a sitting lasts — stored as whole minutes, entered as hours and
 * minutes, shown one way everywhere.
 *
 * The duration used to be a free-text box ("15 mins"), read back by pulling
 * the first number out of it, so "1 hr 30 mins" meant one minute. Tests now
 * carry `durationMinutes`; the readable string is still written alongside
 * for anything that only knows the old field.
 *
 * Pure functions, no "use client": the picker, the cards, the Convex
 * functions and the tests share them.
 */

import { EXAM } from "./settings";

const MIN = EXAM.MIN_DURATION_MINUTES;
const MAX = EXAM.MAX_DURATION_MINUTES;
const STEP = EXAM.DURATION_MINUTE_STEP;
const MAX_HOURS = Math.floor(MAX / 60);

export function clampDurationMinutes(minutes) {
  const n = Math.round(Number(minutes));
  if (!Number.isFinite(n)) return EXAM.DEFAULT_DURATION_MINUTES;
  return Math.max(MIN, Math.min(MAX, n));
}

/** "1 h 30 min", "45 min", "2 h". */
export function formatDuration(minutes) {
  const n = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

/** The legacy free-text form written next to `durationMinutes`: "1 hr 30 mins". */
export function durationString(minutes) {
  const n = clampDurationMinutes(minutes);
  const h = Math.floor(n / 60);
  const m = n % 60;
  const parts = [];
  if (h) parts.push(`${h} hr${h === 1 ? "" : "s"}`);
  if (m || !h) parts.push(`${m} min${m === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/**
 * Minutes from a free-text duration: "60 mins", "1 hr 30 mins", "2h",
 * "90". Null when there is no number in it at all.
 */
export function parseDurationText(text) {
  const s = String(text || "").toLowerCase();
  const hours = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(s);
  const mins = /(\d+)\s*(?:m|min|mins|minute|minutes)\b/.exec(s);
  if (hours || mins) return Math.round((hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0));
  const bare = /(\d+)/.exec(s);
  return bare ? Number(bare[1]) : null;
}

export function splitMinutes(total) {
  const n = Math.max(0, Math.round(Number(total) || 0));
  return { hours: Math.floor(n / 60), minutes: n % 60 };
}

/** Null when the total is acceptable, otherwise the sentence to show under the fields. */
export function durationError(hours, minutes) {
  const h = Number(hours);
  const m = Number(minutes);
  if (!Number.isInteger(h) || h < 0 || h > MAX_HOURS) return `Hours must be between 0 and ${MAX_HOURS}.`;
  if (!Number.isInteger(m) || m < 0 || m > 59) return "Minutes must be between 0 and 59.";
  const total = h * 60 + m;
  if (total < MIN) return `A test must run for at least ${MIN} minutes.`;
  if (total > MAX) return `A test can run for at most ${formatDuration(MAX)}.`;
  return null;
}

function fromTotal(total) {
  return splitMinutes(Math.max(MIN, Math.min(MAX, total)));
}

/**
 * The picker's arrow buttons. `field` is "minutes" (steps of
 * EXAM.DURATION_MINUTE_STEP, rolling over into the hours: ▲ at 55 → +1 h 0,
 * ▼ at 0 → −1 h 55) or "hours" (steps of one). The total always stays inside
 * the allowed range.
 */
export function stepDuration({ hours, minutes }, field, direction) {
  const h = Math.max(0, Math.round(Number(hours) || 0));
  const m = Math.max(0, Math.min(59, Math.round(Number(minutes) || 0)));
  if (field === "hours") {
    const next = Math.max(0, Math.min(MAX_HOURS, h + (direction > 0 ? 1 : -1)));
    return fromTotal(next * 60 + (next === MAX_HOURS ? 0 : m));
  }
  let total = h * 60 + m;
  if (direction > 0) total = Math.floor(total / STEP) * STEP + STEP;
  else total = Math.ceil(total / STEP) * STEP - STEP;
  return fromTotal(total);
}

/** Home / End on a field: its own minimum or maximum, within the total's range. */
export function extremeDuration({ hours, minutes }, field, which) {
  const h = Math.round(Number(hours) || 0);
  const m = Math.round(Number(minutes) || 0);
  if (field === "hours") return fromTotal((which === "max" ? MAX_HOURS : 0) * 60 + m);
  return fromTotal(h * 60 + (which === "max" ? 55 : 0));
}

export const DURATION_BOUNDS = { MIN, MAX, STEP, MAX_HOURS };
