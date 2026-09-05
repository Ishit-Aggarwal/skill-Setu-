"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { backendErrorMessage } from "../../lib/convexBrowser";
import { bookSlot, loadAvailableSlots, loadMyBookings } from "../../lib/scheduling";
import { listSavedMentorships, toggleSavedMentorship } from "../../lib/store";
import { formatDateTime } from "../../lib/match";
import { Avatar, Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, StatGrid, TextInput, useFlash } from "../ui/Kit";

/**
 * Office-hour slots the student bookmarked but hasn't booked.
 *
 * Shortlisting three mentors and deciding later is a normal thing to do, and
 * before this there was nowhere to put that decision — the only options were
 * book it now or lose it. A saved slot keeps a snapshot of what it was, so a
 * withdrawn slot degrades into a readable "no longer available" row rather
 * than vanishing without explanation.
 */
export default function SavedMentorships() {
  const { user } = useAuth();
  const navigate = useNav();
  const [saved, setSaved] = useState([]);
  const [available, setAvailable] = useState([]);
  const [booked, setBooked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useFlash();

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [slots, mine] = await Promise.all([loadAvailableSlots(user), loadMyBookings(user)]);
      setAvailable(slots || []);
      setBooked(mine || []);
      setSaved(listSavedMentorships(user.id));
      setError(null);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not load your saved slots."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const bookedIds = useMemo(() => new Set(booked.map((b) => b.id)), [booked]);
  const liveById = useMemo(() => new Map(available.map((s) => [s.id, s])), [available]);

  const rows = useMemo(
    () =>
      saved
        .map((entry) => {
          const live = liveById.get(entry.slotId);
          return {
            entry,
            slot: live || null,
            snapshot: entry.snapshot || null,
            gone: !live,
            alreadyBooked: bookedIds.has(entry.slotId),
          };
        })
        .sort((a, b) => {
          const at = a.slot?.slot || a.snapshot?.slot || "";
          const bt = b.slot?.slot || b.snapshot?.slot || "";
          return String(at).localeCompare(String(bt));
        }),
    [saved, liveById, bookedIds]
  );

  const bookable = rows.filter((r) => r.slot && !r.alreadyBooked && r.slot.remaining > 0 && new Date(r.slot.slot).getTime() > Date.now());

  function unsave(slotId) {
    toggleSavedMentorship(user.id, slotId);
    setSaved(listSavedMentorships(user.id));
    setFlash("Removed from your saved mentorships.");
  }

  async function confirmBooking() {
    setBusy(true);
    try {
      await bookSlot(user, booking, topic);
      setBooking(null);
      setTopic("");
      await load();
      setFlash("Slot booked — it's under Applied Mentorships.");
    } catch (err) {
      setError(backendErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout activePage="saved-mentorships" title="Saved Mentorships">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="My activity"
          title="Saved Mentorships"
          subtitle="Office-hour slots you shortlisted. Book one when you're ready, or clear it out."
          actions={
            <Button size="sm" variant="outline" onClick={() => navigate("student-mentorship")}>
              Browse office hours
            </Button>
          }
        />

        <Flash message={flash} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

        <StatGrid
          columns={3}
          stats={[
            { label: "Saved slots", value: String(rows.length), icon: "🔖", tone: "primary" },
            { label: "Still bookable", value: String(bookable.length), icon: "✅" },
            { label: "No longer available", value: String(rows.filter((r) => r.gone).length), icon: "🚪" },
          ]}
        />

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl skeleton" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="🔖"
            title="Nothing saved yet"
            action={
              <Button size="sm" onClick={() => navigate("student-mentorship")}>
                Find a mentor
              </Button>
            }
          >
            Open any slot on the mentorship calendar and choose “Save for later” to shortlist it here.
          </EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map(({ entry, slot, snapshot, gone, alreadyBooked }) => {
              const view = slot || snapshot || {};
              const past = view.slot && new Date(view.slot).getTime() < Date.now();
              return (
                <Card key={entry.id} hover className="flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={view.mentorName || "Mentor"} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{view.mentorName || "Mentor"}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{view.title || "Office hours"}</div>
                    </div>
                    {alreadyBooked ? (
                      <Badge tone="green" dot>Booked</Badge>
                    ) : gone ? (
                      <Badge tone="muted">Withdrawn</Badge>
                    ) : past ? (
                      <Badge tone="muted">Passed</Badge>
                    ) : (
                      <Badge tone={slot.remaining > 0 ? "green" : "amber"}>
                        {slot.remaining > 0 ? `${slot.remaining} free` : "Full"}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    <div>📅 {view.slot ? formatDateTime(view.slot) : "Time not recorded"}</div>
                    {view.mode && <div>{view.mode === "Online" ? "💻" : "📍"} {view.mode}</div>}
                  </div>

                  {gone && (
                    <p className="text-[11px] text-muted-foreground bg-secondary/60 rounded-lg px-2.5 py-2 mb-3">
                      Your mentor has withdrawn this slot. It is kept here until you clear it so you know what happened.
                    </p>
                  )}

                  <div className="mt-auto flex items-center gap-2">
                    {slot && !alreadyBooked && !past && slot.remaining > 0 && (
                      <Button size="sm" onClick={() => setBooking(slot)}>
                        Book this slot
                      </Button>
                    )}
                    {alreadyBooked && (
                      <Button size="sm" variant="outline" onClick={() => navigate("applied-mentorships")}>
                        View booking
                      </Button>
                    )}
                    <button onClick={() => unsave(entry.slotId)} className="ml-auto text-xs text-muted-foreground hover:text-red-600">
                      Remove
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {booking && (
        <Modal
          title={`Book time with ${booking.mentorName}`}
          description={`${formatDateTime(booking.slot)} · ${booking.durationMins} min · ${booking.mode}`}
          onClose={() => setBooking(null)}
          footer={
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setBooking(null)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1" onClick={confirmBooking} disabled={busy}>
                {busy ? "Booking…" : "Confirm booking"}
              </Button>
            </div>
          }
        >
          <Field label="What would you like to discuss?" hint="Your mentor sees this before the session, so they can prepare.">
            <TextInput
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Choosing between two internship offers"
              maxLength={160}
            />
          </Field>
        </Modal>
      )}
    </DashboardLayout>
  );
}
