import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled housekeeping. The recording sweep runs nightly and deletes
 * proctoring footage and detailed event logs older than EXAM.RETENTION_DAYS
 * (lib/settings.js); scores, consent records and certificates are never
 * touched by it.
 */
const crons = cronJobs();

crons.daily("purge expired proctoring recordings", { hourUTC: 21, minuteUTC: 30 }, internal.exams.purgeExpiredRecordings);

// A paper whose browser stopped pinging is a closed window: fail it.
crons.interval("fail abandoned exam attempts", { minutes: 2 }, internal.exams.failAbandonedAttempts);

// Files of community posts deleted a week ago leave storage.
crons.daily("purge deleted community post files", { hourUTC: 22, minuteUTC: 0 }, internal.communities.purgeDeletedPosts);

// Resume analyses (personal data) past their retention period, and their files.
crons.daily("purge expired resume analyses", { hourUTC: 22, minuteUTC: 15 }, internal.resume.purgeExpired);

// Open-window tests: "it's open now", and reminders before the last start.
crons.interval("remind open-window test candidates", { minutes: 15 }, internal.testReminders.remindWindowTests);

export default crons;
