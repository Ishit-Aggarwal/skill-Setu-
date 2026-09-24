/**
 * What each kind of notification looks like and which filter it falls under.
 *
 * Rows carry an optional `kind` (and a `link` to open on click). Rows written
 * before kinds existed have none, so their group is inferred the way the
 * inbox always did — from what they point at, then from their wording.
 */

export const NOTIFICATION_KINDS = {
  community_post: { icon: "📣", group: "Communities" },
  community_test: { icon: "📝", group: "Communities" },
  community_request: { icon: "🙋", group: "Communities" },
  community_invite: { icon: "✉️", group: "Communities" },
  community_approved: { icon: "✅", group: "Communities" },
  community_declined: { icon: "🚫", group: "Communities" },
  community_removed: { icon: "🚪", group: "Communities" },
  community_banned: { icon: "⛔", group: "Communities" },
  community_report: { icon: "🚩", group: "Communities" },
  community_message: { icon: "💬", group: "Communities" },
  certificate_issued: { icon: "🎓", group: "Certificates" },
  certificate_updated: { icon: "🎓", group: "Certificates" },
  certificate_revoked: { icon: "⛔", group: "Certificates" },
  certificate_below_min: { icon: "📉", group: "Certificates" },
  certificate_code_changed: { icon: "🔁", group: "Certificates" },
  test_reminder: { icon: "⏰", group: "Tests" },
  test_window_open: { icon: "🟢", group: "Tests" },
  test_window_extended: { icon: "🗓️", group: "Tests" },
  test_cancelled: { icon: "❌", group: "Tests" },
  test_registration_cancelled: { icon: "❌", group: "Tests" },
  test_rescheduled: { icon: "🗓️", group: "Tests" },
};

/** Legacy rows: the student inbox's old wording-based sort. */
function legacyGroup(n) {
  if (n?.credentialId) return "Certificates";
  if (n?.testId) return "Tests";
  const message = String(n?.message || "");
  if (/certificate/i.test(message)) return "Certificates";
  if (/applicat|shortlist|interview|hired|offer|not taken forward/i.test(message)) return "Applications";
  if (/mentor|session|office hours|programme|workshop|webinar|cancelled/i.test(message)) return "Mentorship";
  if (/\btest\b|rescheduled/i.test(message)) return "Tests";
  return "Other";
}

export function notificationGroup(n) {
  return NOTIFICATION_KINDS[n?.kind]?.group || legacyGroup(n);
}

const GROUP_ICON = { Tests: "📝", Communities: "👥", Certificates: "🎓", Applications: "💼", Mentorship: "🗓️", Other: "🔔" };

export function notificationIcon(n) {
  return NOTIFICATION_KINDS[n?.kind]?.icon || GROUP_ICON[notificationGroup(n)] || "🔔";
}

/** The in-app page a notification opens, or null. Only same-site paths are followed. */
export function notificationLink(n) {
  const link = n?.link;
  if (typeof link === "string" && link.startsWith("/") && !link.startsWith("//")) return link;
  if (n?.credentialId) return `/certificate/${encodeURIComponent(n.credentialId)}`;
  if (n?.communityId) return `/communities/${encodeURIComponent(n.communityId)}`;
  return null;
}

export const NOTIFICATION_FILTERS = ["All", "Unread", "Tests", "Communities", "Certificates", "Applications", "Mentorship", "Deadlines", "Other"];
