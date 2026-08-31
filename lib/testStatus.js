import { getScheduledTimestamp } from "./store";

/**
 * Returns one of: "upcoming" | "available" | "completed" | "missed" | "attended"
 * for a student's registration against a given test.
 */
export function getRegistrationStatus(test, registration, attempt) {
  if (attempt) return attempt.missed ? "missed" : "completed";
  if (registration?.missedRecorded) return "missed";

  const scheduled = getScheduledTimestamp(test);
  if (!scheduled) return "available";
  const now = Date.now();
  if (now < scheduled) return "upcoming";
  return "available";
}

export function formatScheduled(test) {
  const ts = getScheduledTimestamp(test);
  if (!ts) return "Flexible";
  return new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
