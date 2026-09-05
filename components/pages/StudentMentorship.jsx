"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import Calendar from "../mentorship/Calendar";
import { useAuth } from "../../lib/auth";
import { backendErrorMessage } from "../../lib/convexBrowser";
import {
  LOCAL,
  bookSlot,
  cancelMyBooking,
  loadAvailableSlots,
  loadMyBookings,
  schedulingMode,
} from "../../lib/scheduling";
import { isMentorshipSaved, toggleSavedMentorship } from "../../lib/store";
import { formatDateTime, relativeTime } from "../../lib/match";
import { Badge, Button, Card, Field, Flash, Modal, PageHeader, Section, StatGrid, Tabs, TextInput, useFlash } from "../ui/Kit";

/**
 * The student half of office hours.
 *
 * The mentor publishes blocks; the student sees the same blocks here, on the
 * same calendar component, and books one. Sessions they hold show their full
 * detail — who it's with, what they said they wanted to discuss, the room or
 * the meeting link — and can be cancelled while the session is still ahead.
 *
 * A meeting link is only returned by the server to a student who actually
 * holds a place in that slot, so browsing the calendar never leaks it.
 */

function toneForAvailable(slot, mine) {
  if (new Date(slot.slot).getTime() < Date.now()) return "past";
  if (mine) return "booked";
  if (slot.remaining <= 0) return "full";
  if (slot.booked > 0) return "partial";
  return "open";
}

export default function StudentMentorship() {
  const { user } = useAuth();
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useFlash();
  const [tab, setTab] = useState("upcoming");
  const [view, setView] = useState("month");
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);

  const [savedIds, setSavedIds] = useState(() => new Set());
  const mode = schedulingMode();

  const load = useCallback(async () => {
    try {
      const [slots, bookings] = await Promise.all([loadAvailableSlots(user), loadMyBookings(user)]);
      setAvailable(slots || []);
      setMine(bookings || []);
      setSavedIds(new Set([...(slots || []), ...(bookings || [])].filter((s) => isMentorshipSaved(user?.id, s.id)).map((s) => s.id)));
      setError(null);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not load mentorship slots."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  function handleToggleSave(slot) {
    const nowSaved = toggleSavedMentorship(user.id, slot);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(slot.id);
      else next.delete(slot.id);
      return next;
    });
    setFlash(nowSaved ? "Saved — it's under Saved Mentorships." : "Removed from your saved mentorships.");
  }

  useEffect(() => {
    load();
  }, [load]);

  const myIds = useMemo(() => new Set(mine.map((m) => m.id)), [mine]);

  const events = useMemo(() => {
    const rows = tab === "upcoming" ? mine : available;
    return rows.map((s) => {
      const isMine = myIds.has(s.id);
      return {
        id: s.id,
        start: s.slot,
        durationMins: s.durationMins,
        title: isMine ? `${s.mentorName || "Mentor"} — ${s.title}` : s.title,
        subtitle: isMine ? s.mode : `${s.mentorName} · ${s.remaining} left`,
        tone: toneForAvailable(s, isMine),
        raw: s,
      };
    });
  }, [tab, mine, available, myIds]);

  const now = Date.now();
  const upcomingMine = mine.filter((m) => new Date(m.slot).getTime() >= now && m.booking?.status !== "Cancelled");
  const pastMine = mine.filter((m) => new Date(m.slot).getTime() < now);
  const bookable = available.filter((s) => new Date(s.slot).getTime() >= now && s.remaining > 0 && !myIds.has(s.id));

  const selectedSlot = useMemo(
    () => [...mine, ...available].find((s) => s.id === selected) || null,
    [selected, mine, available]
  );

  async function run(fn, message) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      if (message) setFlash(message);
      return true;
    } catch (err) {
      setError(backendErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout activePage="student-mentorship" title="Mentorship">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="Mentorship"
          title="Your sessions & open office hours"
          subtitle={`Book time with faculty at ${user?.institution || "your institution"}. Everything here is the same calendar your mentor publishes to.`}
        />

        <Flash message={flash} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

        {mode === LOCAL && (
          <div className="rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">You&apos;re browsing this device&apos;s calendar.</span> Sign in with a
            full account to see office hours your mentors publish from theirs.
          </div>
        )}

        <StatGrid
          columns={3}
          stats={[
            { label: "Upcoming sessions", value: String(upcomingMine.length), icon: "📅", tone: "primary" },
            { label: "Slots you can book", value: String(bookable.length), icon: "🪑" },
            { label: "Sessions attended", value: String(pastMine.filter((m) => m.booking?.status === "Completed").length), icon: "🎓" },
          ]}
        />

        <Tabs
          tabs={[
            { key: "upcoming", label: `My sessions (${mine.length})` },
            { key: "browse", label: `Open slots (${bookable.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {loading ? (
          <div className="h-96 rounded-2xl skeleton" />
        ) : (
          <Calendar
            events={events}
            view={view}
            onViewChange={setView}
            onSelectEvent={(e) => setSelected(e.id)}
            emptyMessage={
              tab === "upcoming"
                ? "You haven't booked any mentoring sessions yet. Switch to Open slots to find one."
                : "No faculty at your institution has published office hours yet."
            }
          />
        )}

        {tab === "upcoming" && upcomingMine.length > 0 && (
          <Section title="Next up" description="The same sessions as blocks above, listed for quick scanning.">
            <div className="grid md:grid-cols-2 gap-3">
              {upcomingMine.map((s) => (
                <Card key={s.id} hover as="button" className="text-left w-full" onClick={() => setSelected(s.id)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{s.mentorName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {s.mentorDepartment || "Faculty"} · {s.title}
                      </div>
                    </div>
                    <Badge tone="primary">{s.mode}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>📅 {formatDateTime(s.slot)} · {s.durationMins} min</div>
                    {s.mode === "Online" ? (
                      s.meetingUrl ? (
                        <div className="truncate">🔗 Meeting link ready</div>
                      ) : (
                        <div>🔗 Link not published yet</div>
                      )
                    ) : (
                      <div className="truncate">📍 {s.location || "Location to be confirmed"}</div>
                    )}
                    {s.booking?.topic && <div className="truncate">💬 {s.booking.topic}</div>}
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ---------------- detail ---------------- */}
      {selectedSlot && (
        <Modal
          title={selectedSlot.title || "Office hours"}
          description={`${selectedSlot.mentorName || "Mentor"} · ${formatDateTime(selectedSlot.slot)} · ${selectedSlot.durationMins} min`}
          onClose={() => setSelected(null)}
          size="lg"
          footer={
            myIds.has(selectedSlot.id) ? (
              new Date(selectedSlot.slot).getTime() > Date.now() ? (
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("Cancel this session? The slot goes back into the pool for other students.")) return;
                    const ok = await run(
                      () => cancelMyBooking(user, selectedSlot.id),
                      "Booking cancelled."
                    );
                    if (ok) setSelected(null);
                  }}
                >
                  Cancel my booking
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground text-center">This session has already taken place.</p>
              )
            ) : selectedSlot.remaining > 0 && new Date(selectedSlot.slot).getTime() > Date.now() ? (
              <Button
                className="w-full"
                onClick={() => {
                  setBooking(selectedSlot);
                  setSelected(null);
                }}
              >
                Book this slot
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center">This slot is no longer available.</p>
            )
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{selectedSlot.mode}</Badge>
              {myIds.has(selectedSlot.id) ? (
                <Badge tone="green" dot>
                  You&apos;re booked
                </Badge>
              ) : (
                <Badge tone={selectedSlot.remaining > 0 ? "green" : "muted"}>
                  {selectedSlot.remaining > 0 ? `${selectedSlot.remaining} of ${selectedSlot.capacity} free` : "Full"}
                </Badge>
              )}
              {/* Bookmarking a slot is not the same as booking it — a student
                  shortlisting three mentors needs somewhere to keep them. */}
              <button
                type="button"
                onClick={() => handleToggleSave(selectedSlot)}
                className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  savedIds.has(selectedSlot.id)
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {savedIds.has(selectedSlot.id) ? "★ Saved" : "☆ Save for later"}
              </button>
            </div>

            <dl className="divide-y divide-border text-sm">
              {[
                ["Mentor", selectedSlot.mentorName],
                ["Department", selectedSlot.mentorDepartment],
                ["When", formatDateTime(selectedSlot.slot)],
                ["Length", `${selectedSlot.durationMins} minutes`],
                selectedSlot.mode === "Online" ? null : ["Where", selectedSlot.location || "To be confirmed"],
                myIds.has(selectedSlot.id) && selectedSlot.booking?.topic ? ["Your topic", selectedSlot.booking.topic] : null,
                myIds.has(selectedSlot.id) && selectedSlot.booking?.bookedAt
                  ? ["Booked", relativeTime(selectedSlot.booking.bookedAt)]
                  : null,
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-xs text-muted-foreground flex-shrink-0">{label}</dt>
                    <dd className="text-sm text-foreground text-right">{value || "—"}</dd>
                  </div>
                ))}
            </dl>

            {/* The link is served only to someone holding a place — browsing
                the calendar never reveals it. */}
            {selectedSlot.mode === "Online" && (
              <div className="rounded-xl border border-border px-3.5 py-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Joining</div>
                {myIds.has(selectedSlot.id) ? (
                  selectedSlot.meetingUrl ? (
                    <a
                      href={selectedSlot.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary font-medium hover:underline break-all"
                    >
                      {selectedSlot.meetingUrl}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Your mentor hasn&apos;t added the meeting link yet.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">The meeting link appears here once you book the slot.</p>
                )}
              </div>
            )}

            {selectedSlot.notes && (
              <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">From your mentor: </span>
                {selectedSlot.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ---------------- booking ---------------- */}
      {booking && (
        <Modal
          title={`Book time with ${booking.mentorName}`}
          description={`${formatDateTime(booking.slot)} · ${booking.durationMins} min · ${booking.mode}`}
          onClose={() => setBooking(null)}
        >
          <BookingForm
            busy={busy}
            onCancel={() => setBooking(null)}
            onSubmit={async (topic) => {
              const ok = await run(
                () => bookSlot(user, booking, topic),
                `Slot booked with ${booking.mentorName}.`
              );
              if (ok) setBooking(null);
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function BookingForm({ onSubmit, onCancel, busy }) {
  const [topic, setTopic] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(topic);
      }}
      className="space-y-4"
    >
      <Field label="What would you like to discuss?" hint="Your mentor sees this before the session, so they can prepare.">
        <TextInput
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Choosing between two internship offers"
          maxLength={160}
        />
      </Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? "Booking…" : "Confirm booking"}
        </Button>
      </div>
    </form>
  );
}
