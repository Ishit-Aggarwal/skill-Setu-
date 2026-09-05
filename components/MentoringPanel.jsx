"use client";

import { useCallback, useEffect, useState } from "react";
import { backendErrorMessage } from "../lib/convexBrowser";
import { loadAvailableSlots, loadMyBookings } from "../lib/scheduling";
import { useNav } from "../lib/nav";
import { formatDateTime } from "../lib/match";
import { Badge, Button, Card, Section } from "./ui/Kit";

/**
 * The dashboard summary of a student's mentoring.
 *
 * It reads the same slots as the full Mentorship page, through lib/scheduling —
 * shared across devices when the account has a session, on this device
 * otherwise. Either way it renders something rather than telling the reader to
 * go and configure a deployment.
 *
 * Booking and cancelling live on the Mentorship page; this is the glance.
 */
export default function MentoringPanel({ user }) {
  const navigate = useNav();
  const [bookings, setBookings] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [mine, available] = await Promise.all([loadMyBookings(user), loadAvailableSlots(user)]);
      const now = Date.now();
      const mineIds = new Set((mine || []).map((m) => m.id));
      setBookings((mine || []).filter((m) => new Date(m.slot).getTime() >= now && m.booking?.status !== "Cancelled"));
      setOpenCount(
        (available || []).filter((s) => new Date(s.slot).getTime() >= now && s.remaining > 0 && !mineIds.has(s.id)).length
      );
      setError(null);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not load your mentoring sessions."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <Section
        title="Mentoring & office hours"
        description={`Sessions with faculty at ${user?.institution || "your institution"}.`}
        actions={
          <Button size="sm" variant="ghost" onClick={() => navigate("student-mentorship")}>
            Open calendar →
          </Button>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl skeleton" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{error}</p>
        ) : bookings.length === 0 ? (
          <div className="py-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {openCount
                ? `No sessions booked. ${openCount} open slot${openCount === 1 ? " is" : "s are"} available right now.`
                : "No sessions booked, and no faculty at your institution has published office hours yet."}
            </p>
            {openCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => navigate("student-mentorship")}>
                Find a slot
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.slice(0, 4).map((s) => (
              <button
                key={s.id}
                onClick={() => navigate("student-mentorship")}
                className="w-full text-left flex items-center gap-2.5 bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2.5 transition-colors"
              >
                <span className="text-sm flex-shrink-0">📅</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate">
                    {s.mentorName} · {s.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {formatDateTime(s.slot)} · {s.durationMins} min ·{" "}
                    {s.mode === "Online" ? (s.meetingUrl ? "link ready" : "link pending") : s.location || "location TBC"}
                  </div>
                </div>
                <Badge tone="green">Booked</Badge>
              </button>
            ))}
            {openCount > 0 && (
              <p className="text-[11px] text-muted-foreground pt-1">
                {openCount} more open slot{openCount === 1 ? "" : "s"} available.
              </p>
            )}
          </div>
        )}
      </Section>
    </Card>
  );
}
