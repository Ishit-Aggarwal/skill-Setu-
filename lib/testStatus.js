import { getScheduledTimestamp } from "./store";

/**
 * Where a student stands on one test.
 *
 * "awaiting-result" is the state that used to be missing: an in-person test the
 * candidate sat, whose mark the host has not published yet. Before, confirming
 * attendance immediately awarded a flat score, so this state could not exist.
 *
 * Returns one of:
 *   "upcoming" | "available" | "awaiting-result" | "completed" | "missed"
 */
export function getRegistrationStatus(test, registration, attempt) {
  if (attempt) return attempt.missed ? "missed" : "completed";
  if (registration?.attended) return "awaiting-result";
  if (registration?.missedRecorded) return "missed";

  const scheduled = getScheduledTimestamp(test);
  if (!scheduled) return "available";
  const now = Date.now();
  if (now < scheduled) return "upcoming";
  return "available";
}

export const STATUS_TONE = {
  upcoming: "blue",
  available: "primary",
  "awaiting-result": "amber",
  completed: "green",
  missed: "red",
};

export const STATUS_LABEL = {
  upcoming: "Upcoming",
  available: "Ready to take",
  "awaiting-result": "Awaiting result",
  completed: "Completed",
  missed: "Missed",
};

const LINK_REVEAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Online meeting links reveal to students starting 24h before the test. */
export function isLinkRevealWindow(test) {
  const scheduled = getScheduledTimestamp(test);
  if (!scheduled) return false;
  return scheduled - Date.now() <= LINK_REVEAL_WINDOW_MS;
}

export function formatScheduled(test) {
  const ts = getScheduledTimestamp(test);
  if (!ts) return "Flexible";
  return new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
