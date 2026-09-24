import { internalMutation } from "./_generated/server";
import { EXAM } from "../lib/settings";
import { isWindowTest, lastStartMs, testStartMs } from "../lib/testWindow";

/**
 * Reminders for open-window tests, run every 15 minutes from convex/crons.js.
 *
 * Registered candidates who have not started are told when the window opens,
 * and again EXAM.WINDOW_REMINDER_HOURS before their last chance to start.
 * Each (test, candidate, kind) is recorded in testReminders, so a reminder is
 * sent once however often the job runs. Only windows that have not closed are
 * read (indexed on the close time).
 */

const HOUR = 3600000;

function when(ms) {
  return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export const remindWindowTests = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const tests = await ctx.db
      .query("skillTests")
      .withIndex("by_window_close", (q) => q.gt("windowClosesAtMs", now))
      .collect();
    let sent = 0;
    for (const test of tests) {
      if (!isWindowTest(test) || test.cancelledAt) continue;
      const opens = testStartMs(test);
      const last = lastStartMs(test);
      if (opens == null || last == null || now < opens || now >= last) continue;

      // Which reminders are due right now. A later reminder that would land
      // within the hour after the "open" one is skipped as noise.
      const due = [{ kind: "window_open", text: `"${test.title}" is open now. Start any time before ${when(last)}.`, notifKind: "test_window_open" }];
      for (const hours of EXAM.WINDOW_REMINDER_HOURS) {
        if (now >= last - hours * HOUR && last - opens > (hours + 1) * HOUR) {
          due.push({ kind: `last_start_${hours}h`, text: `Reminder: "${test.title}" — your last chance to start is ${when(last)} (${hours} h left).`, notifKind: "test_reminder" });
        }
      }

      const registrations = await ctx.db
        .query("skillTestRegistrations")
        .withIndex("by_test", (q) => q.eq("testId", test.id))
        .collect();
      for (const reg of registrations) {
        if (reg.cancelledAt) continue;
        const started = await ctx.db
          .query("examAttempts")
          .withIndex("by_student_test", (q) => q.eq("studentId", reg.userId).eq("testId", test.id))
          .first();
        if (started) continue;
        for (const reminder of due) {
          const already = await ctx.db
            .query("testReminders")
            .withIndex("by_test_user_kind", (q) => q.eq("testId", test.id).eq("userId", reg.userId).eq("kind", reminder.kind))
            .first();
          if (already) continue;
          await ctx.db.insert("testReminders", { testId: test.id, userId: reg.userId, kind: reminder.kind, sentAt: now });
          const at = new Date(now).toISOString();
          await ctx.db.insert("studentNotifications", {
            id: `notif_${reminder.kind}_${test.id}_${reg.userId}`,
            studentId: reg.userId,
            senderId: test.ownerId,
            testId: test.id,
            kind: reminder.notifKind,
            link: "/skill-assessment",
            message: reminder.text,
            from: test.hostName || "Skill Setu",
            sentAt: at,
            read: false,
            updatedAt: at,
          });
          sent += 1;
        }
      }
    }
    return { sent };
  },
});
