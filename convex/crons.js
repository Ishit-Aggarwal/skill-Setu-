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

export default crons;
