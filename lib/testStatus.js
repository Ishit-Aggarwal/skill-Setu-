import { isWindowTest, joinWindowMinutes, scheduledStartMs, testEndMs, testPhase, testStartMs } from "./testWindow";

/**
 * Where a student stands on one test.
 *
 * "awaiting-result" is the state that used to be missing: an in-person test the
 * candidate sat, whose mark the host has not published yet. Before, confirming
 * attendance immediately awarded a flat score, so this state could not exist.
 *
 * "locked" is the other one: an online sitting that has begun and whose
 * joining window has closed. A candidate who was not in the room by then
 * sees it running and cannot come in part-way; the server refuses the
 * attempt as well (convex/exams.js#begin).
 *
 * Returns one of:
 *   "upcoming" | "available" | "in-progress" | "locked" | "ended" |
 *   "awaiting-result" | "completed" | "missed"
 */
export function getRegistrationStatus(test, registration, attempt, now = Date.now()) {
  if (attempt) return attempt.missed ? "missed" : attempt.failed ? "failed" : "completed";
  // A test the host cancelled, or a registration withdrawn (removed from the
  // test's community), can no longer be sat.
  if (test?.cancelledAt || registration?.cancelledAt) return "cancelled";
  if (registration?.attended) return "awaiting-result";
  if (registration?.missedRecorded) return "missed";

  const phase = testPhase(test, now);
  if (phase === "unscheduled") return "available";
  if (phase === "upcoming") return "upcoming";
  if (phase === "open") return "in-progress";
  // Joining only closes on the online paper. An in-person or hybrid sitting
  // is a room the candidate is already standing in; confirming attendance
  // afterwards is exactly what the button is for.
  if (test?.mode !== "Online") return phase === "ended" ? "ended" : "in-progress";
  return phase === "locked" ? "locked" : "ended";
}

/** Whether the candidate may act on the card right now (open the paper / confirm attendance). */
export function canTakeNow(test, status) {
  if (status === "available" || status === "in-progress") return true;
  // Confirming attendance at a physical sitting is allowed after it ends too.
  return status === "ended" && test?.mode !== "Online";
}

export const STATUS_TONE = {
  upcoming: "blue",
  available: "primary",
  "in-progress": "green",
  locked: "amber",
  ended: "muted",
  "awaiting-result": "amber",
  completed: "green",
  failed: "red",
  missed: "red",
  cancelled: "muted",
};

export const STATUS_LABEL = {
  upcoming: "Upcoming",
  available: "Ready to take",
  "in-progress": "In Progress · Live",
  locked: "In Progress · Joining closed",
  ended: "Ended",
  "awaiting-result": "Awaiting result",
  completed: "Completed",
  failed: "Failed",
  missed: "Missed",
  cancelled: "Cancelled",
};

/** The sentence a locked-out candidate reads on the card. */
export function joinClosedMessage(test) {
  if (isWindowTest(test)) return "This test's window has closed for new starts — there wouldn't be time left to sit the full paper.";
  const minutes = joinWindowMinutes(test);
  return `The test is in progress. Joining closed ${minutes} minute${minutes === 1 ? "" : "s"} after it started — you can't come in part-way through.`;
}

const LINK_REVEAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Online meeting links reveal to students starting 24h before the test. */
export function isLinkRevealWindow(test) {
  const scheduled = scheduledStartMs(test);
  if (!scheduled) return false;
  return scheduled - Date.now() <= LINK_REVEAL_WINDOW_MS;
}

export function formatScheduled(test) {
  if (isWindowTest(test)) {
    const opens = testStartMs(test);
    const closes = testEndMs(test);
    if (opens == null || closes == null) return "Window to be announced";
    const fmt = (ms) => new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    return `Open ${fmt(opens)} – ${fmt(closes)}`;
  }
  const ts = scheduledStartMs(test);
  // Every test now carries a date and a time; only a record written before
  // that was enforced can land here.
  if (!ts) return "Date to be announced";
  return new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
