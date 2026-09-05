"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  listApplicationsForStudent,
  listInternships,
  listSavedInternships,
  listStudentNotifications,
  update,
} from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { daysUntil, formatDate, relativeTime } from "../../lib/match";
import { Badge, Button, Card, EmptyState, FilterPills, IconTile, PageHeader, Section, StatGrid } from "../ui/Kit";

/**
 * A real inbox.
 *
 * Application status changes, mentor recommendations and campus notices were
 * already being written to a notifications collection, but the only way to see
 * one was to happen to be on the dashboard when it arrived, or to catch a
 * toast before it faded. Anything a student needs to act on days later has to
 * survive a page reload, which a toast does not.
 *
 * Deadline reminders are computed here rather than stored: a saved role that
 * closes on Friday should stop nagging on Saturday, and a stored reminder
 * would have to be cleaned up to manage that.
 */

const KINDS = ["All", "Unread", "Applications", "Mentorship", "Deadlines", "Campus"];

function classify(message = "") {
  if (/applicat|shortlist|interview|hired|offer|not taken forward/i.test(message)) return "Applications";
  if (/mentor|session|office hours|programme|workshop|webinar|cancelled/i.test(message)) return "Mentorship";
  return "Campus";
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNav();
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => setReady(true), []);

  useEffect(() => {
    return subscribeToMutations(["studentNotifications", "applications", "savedInternships"], () =>
      setVersion((v) => v + 1)
    );
  }, []);

  const notifications = useMemo(
    () => (ready && user ? listStudentNotifications(user.id) : []),
    [user, ready, version]
  );

  /* Live deadline reminders for saved-but-not-applied roles. Derived, so they
     appear and disappear on their own. */
  const deadlineAlerts = useMemo(() => {
    if (!ready || !user) return [];
    const applied = new Set(listApplicationsForStudent(user.id).map((a) => a.internshipId));
    const savedIds = new Set(listSavedInternships(user.id).map((s) => s.internshipId));
    return listInternships()
      .filter((i) => savedIds.has(i.id) && !applied.has(i.id) && i.status !== "Closed")
      .map((i) => ({ internship: i, daysLeft: daysUntil(i.deadline) }))
      .filter(({ daysLeft }) => daysLeft >= 0 && daysLeft <= 10)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [user, ready, version]);

  const unread = notifications.filter((n) => !n.read);

  const shown = useMemo(() => {
    if (filter === "Unread") return unread;
    if (filter === "All") return notifications;
    if (filter === "Deadlines") return [];
    if (filter === "Campus") return notifications.filter((n) => classify(n.message) === "Campus");
    if (filter === "Mentorship") return notifications.filter((n) => classify(n.message) === "Mentorship");
    return notifications.filter((n) => classify(n.message) === "Applications");
  }, [notifications, unread, filter]);

  function markRead(n) {
    if (n.read) return;
    update("studentNotifications", n.id, { read: true, readAt: new Date().toISOString() });
    setVersion((v) => v + 1);
  }

  function markAllRead() {
    unread.forEach((n) => update("studentNotifications", n.id, { read: true, readAt: new Date().toISOString() }));
    setVersion((v) => v + 1);
  }

  return (
    <DashboardLayout activePage="notifications" title="Notifications">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="My activity"
          title="Notifications"
          subtitle="Application updates, mentor recommendations, campus notices and deadline reminders — all kept, not flashed."
          actions={
            unread.length > 0 && (
              <Button size="sm" variant="outline" onClick={markAllRead}>
                Mark all read
              </Button>
            )
          }
        />

        <StatGrid
          columns={3}
          stats={[
            { label: "Unread", value: String(unread.length), icon: "🔔", tone: "primary" },
            { label: "Total", value: String(notifications.length), icon: "📬" },
            {
              label: "Deadlines within 10 days",
              value: String(deadlineAlerts.length),
              icon: "⏳",
              hint: deadlineAlerts.length ? "Saved roles you haven't applied to" : "Nothing closing soon",
            },
          ]}
        />

        {/* Deadlines first: they are the only items here that expire. */}
        {deadlineAlerts.length > 0 && (filter === "All" || filter === "Deadlines") && (
          <Section title="Closing soon" description="Roles you saved but haven't applied to yet.">
            <div className="space-y-2">
              {deadlineAlerts.map(({ internship, daysLeft }) => (
                <Card key={internship.id} padded={false} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <IconTile icon="⏳" tone={daysLeft <= 3 ? "red" : "amber"} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{internship.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {internship.company} · closes {formatDate(internship.deadline)}
                    </div>
                  </div>
                  <Badge tone={daysLeft <= 3 ? "red" : "amber"}>
                    {daysLeft === 0 ? "Closes today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                  </Badge>
                  <Button size="sm" onClick={() => navigate("saved-internships")}>
                    Apply
                  </Button>
                </Card>
              ))}
            </div>
          </Section>
        )}

        <FilterPills options={KINDS} value={filter} onChange={setFilter} />

        {shown.length === 0 ? (
          <EmptyState icon="📭" title={filter === "Unread" ? "Nothing unread" : "Nothing here yet"}>
            {filter === "Deadlines"
              ? "Deadline reminders appear above whenever a saved role is about to close."
              : "Updates on your applications, mentor recommendations and campus notices land here."}
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {shown.map((n) => (
              <Card
                key={n.id}
                padded={false}
                as="button"
                onClick={() => markRead(n)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 ${n.read ? "" : "border-primary/40 bg-primary/[0.04]"}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-relaxed ${n.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                    {n.message}
                  </p>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {n.from} · {relativeTime(n.sentAt)}
                  </div>
                </div>
                <Badge tone="neutral" className="flex-shrink-0">{classify(n.message)}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
