"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { backendErrorMessage } from "../../lib/convexBrowser";
import { cancelMyBooking, loadMyBookings } from "../../lib/scheduling";
import { formatDateTime, relativeTime } from "../../lib/match";
import { Avatar, Badge, Button, Card, EmptyState, Flash, PageHeader, StatGrid, Tabs, useFlash } from "../ui/Kit";

/**
 * Mentoring sessions the student actually holds a place in.
 *
 * The mentorship page is a calendar, which is right for finding a slot and
 * wrong for answering "what have I got booked, and when". This is that list —
 * upcoming first, with the joining link or the room for each one, because the
 * five minutes before a session is exactly when nobody wants to hunt through a
 * month view.
 */

const STATUS_TONE = { Booked: "primary", Completed: "green", "No show": "red", Cancelled: "muted" };

export default function AppliedMentorships() {
  const { user } = useAuth();
  const navigate = useNav();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("upcoming");
  const [flash, setFlash] = useFlash();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSessions((await loadMyBookings(user)) || []);
      setError(null);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not load your sessions."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const upcoming = useMemo(
    () => sessions.filter((s) => new Date(s.slot).getTime() >= now && s.booking?.status !== "Cancelled"),
    [sessions, now]
  );
  const past = useMemo(() => sessions.filter((s) => new Date(s.slot).getTime() < now), [sessions, now]);
  const cancelled = useMemo(() => sessions.filter((s) => s.booking?.status === "Cancelled"), [sessions]);

  const shown = tab === "upcoming" ? upcoming : tab === "past" ? past : cancelled;

  async function cancel(session) {
    if (!window.confirm("Cancel this session? The slot goes back into the pool for other students.")) return;
    setBusy(true);
    try {
      await cancelMyBooking(user, session.id);
      await load();
      setFlash("Booking cancelled.");
    } catch (err) {
      setError(backendErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout activePage="applied-mentorships" title="Applied Mentorships">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="My activity"
          title="Applied Mentorships"
          subtitle="Sessions you have booked with faculty, newest first — with where to be, or the link to join."
          actions={
            <Button size="sm" variant="outline" onClick={() => navigate("student-mentorship")}>
              Find more slots
            </Button>
          }
        />

        <Flash message={flash} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

        <StatGrid
          columns={3}
          stats={[
            { label: "Upcoming", value: String(upcoming.length), icon: "📅", tone: "primary" },
            { label: "Attended", value: String(past.filter((s) => s.booking?.status === "Completed").length), icon: "🎓" },
            { label: "Cancelled", value: String(cancelled.length), icon: "🚫" },
          ]}
        />

        <Tabs
          tabs={[
            { key: "upcoming", label: `Upcoming (${upcoming.length})` },
            { key: "past", label: `Past (${past.length})` },
            { key: "cancelled", label: `Cancelled (${cancelled.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl skeleton" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="🤝"
            title={tab === "upcoming" ? "No sessions booked" : tab === "past" ? "Nothing in the past yet" : "Nothing cancelled"}
            action={
              tab === "upcoming" && (
                <Button size="sm" onClick={() => navigate("student-mentorship")}>
                  Browse open office hours
                </Button>
              )
            }
          >
            {tab === "upcoming"
              ? "Book time with a mentor from the mentorship calendar and it will appear here."
              : "Sessions move here once their time has passed."}
          </EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {shown.map((session) => {
              const startsAt = new Date(session.slot).getTime();
              const soon = startsAt - now < 24 * 3600 * 1000 && startsAt >= now;
              return (
                <Card key={session.id} hover className="flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={session.mentorName} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{session.mentorName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {session.mentorDepartment || "Faculty"} · {session.title}
                      </div>
                    </div>
                    <Badge tone={STATUS_TONE[session.booking?.status] || "primary"}>
                      {session.booking?.status || "Booked"}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    <div className={soon ? "text-primary font-medium" : ""}>
                      📅 {formatDateTime(session.slot)} · {session.durationMins} min
                      {soon ? " — starting soon" : ""}
                    </div>
                    {session.mode === "Online" ? (
                      session.meetingUrl ? (
                        <div className="truncate">
                          🔗{" "}
                          <a href={session.meetingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                            Join the session
                          </a>
                        </div>
                      ) : (
                        <div>🔗 Your mentor hasn&apos;t added the joining link yet.</div>
                      )
                    ) : (
                      <div className="truncate">📍 {session.location || "Location to be confirmed"}</div>
                    )}
                    {session.booking?.topic && <div className="truncate">💬 {session.booking.topic}</div>}
                    {session.booking?.bookedAt && <div>🕒 Booked {relativeTime(session.booking.bookedAt)}</div>}
                  </div>

                  {startsAt >= now && session.booking?.status !== "Cancelled" && (
                    <button
                      onClick={() => cancel(session)}
                      disabled={busy}
                      className="mt-auto self-start text-xs text-muted-foreground hover:text-red-600 disabled:opacity-50"
                    >
                      Cancel this booking
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
