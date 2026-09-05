"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import Calendar, { BLOCK_TONES } from "../../mentorship/Calendar";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuery, isBackendConfigured } from "../../../lib/convexBrowser";
import { getSessionToken } from "../../../lib/session";
import { formatDateTime } from "../../../lib/match";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Flash,
  Modal,
  PageHeader,
  Select,
  StatGrid,
  TextArea,
  TextInput,
  useFlash,
} from "../../ui/Kit";

/**
 * Office hours, as a calendar.
 *
 * This screen used to be a flat list of date/time rows with a "Withdraw" link
 * under each, which is unreadable the moment there are more than about six of
 * them: nothing showed how long a session ran, when the gaps were, or which
 * day was already full.
 *
 * The slots themselves also moved off browser storage. Mentorship is
 * inherently two-sided — a slot published on a laptop has to be bookable from
 * a student's phone — and local storage could never do that. Every read and
 * write here goes through Convex, which checks that the caller owns the slot
 * before letting them change it.
 */

const EMPTY_FORM = {
  slot: "",
  title: "Office hours",
  durationMins: "30",
  capacity: "2",
  mode: "In person",
  location: "",
  meetingUrl: "",
  notes: "",
};

const STATUS_TONE = { Booked: "primary", Completed: "green", "No show": "red", Cancelled: "muted" };

function toneFor(slot) {
  const startsAt = new Date(slot.slot).getTime();
  if (startsAt < Date.now()) return "past";
  const active = (slot.bookings || []).filter((b) => b.status !== "Cancelled").length;
  if (active === 0) return "open";
  if (active >= (slot.capacity || 1)) return "full";
  return "partial";
}

export default function Mentorship() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useFlash();
  const [view, setView] = useState("week");

  const [editing, setEditing] = useState(null); // { form, id? }
  const [selected, setSelected] = useState(null); // slot id
  const [busy, setBusy] = useState(false);

  const connected = isBackendConfigured() && Boolean(getSessionToken());

  const load = useCallback(async () => {
    if (!connected) {
      setLoading(false);
      return;
    }
    try {
      const rows = await backendQuery(api.mentorship.mySlots, {});
      setSlots(rows || []);
      setError(null);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not load your office hours."));
    } finally {
      setLoading(false);
    }
  }, [connected]);

  useEffect(() => {
    load();
  }, [load]);

  const events = useMemo(
    () =>
      slots.map((s) => {
        const active = (s.bookings || []).filter((b) => b.status !== "Cancelled").length;
        return {
          id: s.id,
          start: s.slot,
          durationMins: s.durationMins,
          title: s.title || "Office hours",
          subtitle: `${active}/${s.capacity} booked · ${s.mode}`,
          tone: toneFor(s),
          raw: s,
        };
      }),
    [slots]
  );

  const now = Date.now();
  const upcoming = slots.filter((s) => new Date(s.slot).getTime() >= now);
  const allBookings = slots.flatMap((s) => (s.bookings || []).map((b) => ({ ...b, slot: s })));
  const activeBookings = allBookings.filter((b) => b.status !== "Cancelled");
  const capacity = upcoming.reduce((sum, s) => sum + (s.capacity || 1), 0);
  const bookedUpcoming = upcoming.reduce(
    (sum, s) => sum + (s.bookings || []).filter((b) => b.status !== "Cancelled").length,
    0
  );

  const selectedSlot = slots.find((s) => s.id === selected) || null;

  async function run(fn, successMessage) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      if (successMessage) setFlash(successMessage);
      return true;
    } catch (err) {
      setError(backendErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitSlot(form) {
    const payload = {
      slot: form.slot,
      title: form.title.trim() || "Office hours",
      durationMins: Number(form.durationMins) || 30,
      capacity: Number(form.capacity) || 1,
      mode: form.mode,
      location: form.mode === "Online" ? "" : form.location.trim(),
      meetingUrl: form.mode === "Online" ? form.meetingUrl.trim() : "",
      notes: form.notes.trim(),
    };

    const ok = await run(async () => {
      if (editing?.id) {
        await backendMutation(api.mentorship.updateSlot, { slotId: editing.id, patch: payload });
      } else {
        await backendMutation(api.mentorship.publishSlot, payload);
      }
    }, editing?.id ? "Slot updated." : "Slot published — students can book it now.");

    if (ok) setEditing(null);
  }

  if (!connected) {
    return (
      <DashboardLayout activePage="academician-mentorship" title="Mentorship">
        <div className="animate-fade-slide space-y-5">
          <PageHeader title="Mentorship & Office Hours" subtitle="Publish when you're available; students book directly." />
          <EmptyState icon="🔌" title="Scheduling needs the shared database">
            Office hours are two-sided — what you publish here has to reach a student on another device. Sign in with a real
            account on a deployment that has <code className="text-xs">NEXT_PUBLIC_CONVEX_URL</code> configured to use this.
          </EmptyState>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="academician-mentorship" title="Mentorship">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Mentorship & Office Hours"
          subtitle="Publish availability as calendar blocks. Students see and book the same blocks from their own dashboard."
          actions={
            <Button size="sm" onClick={() => setEditing({ form: { ...EMPTY_FORM } })}>
              Publish availability
            </Button>
          }
        />

        <Flash message={flash} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

        <StatGrid
          stats={[
            { label: "Upcoming slots", value: String(upcoming.length), icon: "📅" },
            {
              label: "Seats available",
              value: String(Math.max(0, capacity - bookedUpcoming)),
              icon: "🪑",
              hint: `${capacity} published`,
            },
            { label: "Booked sessions", value: String(activeBookings.filter((b) => b.status === "Booked").length), icon: "✅" },
            { label: "Sessions completed", value: String(allBookings.filter((b) => b.status === "Completed").length), icon: "🎓" },
          ]}
        />

        {loading ? (
          <div className="h-96 rounded-2xl skeleton" />
        ) : (
          <Calendar
            events={events}
            view={view}
            onViewChange={setView}
            onSelectEvent={(e) => setSelected(e.id)}
            onPickEmpty={(slotValue) => setEditing({ form: { ...EMPTY_FORM, slot: slotValue } })}
            emptyMessage="No availability published yet. Click any empty slot on the calendar to add one."
          />
        )}

        {activeBookings.length > 0 && (
          <Card>
            <div className="mb-3">
              <h3 className="font-semibold text-foreground text-sm">Booking history</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Every request against your slots, newest first.</p>
            </div>
            <div>
              {[...allBookings]
                .sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt))
                .slice(0, 10)
                .map((b) => (
                  <button
                    key={b.id || b._id}
                    onClick={() => setSelected(b.slot.id)}
                    className="w-full text-left flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-secondary/40 transition-colors rounded-lg px-1"
                  >
                    <Avatar name={b.studentName} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground truncate">{b.studentName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{b.topic || "No topic given"}</div>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:block">
                      {formatDateTime(b.slot.slot)}
                    </span>
                    <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                  </button>
                ))}
            </div>
          </Card>
        )}
      </div>

      {/* ---------------- create / edit ---------------- */}
      {editing && (
        <Modal
          title={editing.id ? "Edit this slot" : "Publish an office-hours slot"}
          description="Students see the label, the length and where it happens. Online slots also carry your meeting link."
          onClose={() => setEditing(null)}
          size="lg"
        >
          <SlotForm
            initial={editing.form}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSubmit={submitSlot}
          />
        </Modal>
      )}

      {/* ---------------- details ---------------- */}
      {selectedSlot && (
        <SlotDetail
          slot={selectedSlot}
          busy={busy}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing({
              id: selectedSlot.id,
              form: {
                slot: String(selectedSlot.slot).slice(0, 16),
                title: selectedSlot.title || "Office hours",
                durationMins: String(selectedSlot.durationMins || 30),
                capacity: String(selectedSlot.capacity || 1),
                mode: selectedSlot.mode || "In person",
                location: selectedSlot.location || "",
                meetingUrl: selectedSlot.meetingUrl || "",
                notes: selectedSlot.notes || "",
              },
            });
            setSelected(null);
          }}
          onSetBookingStatus={(bookingId, status) =>
            run(
              () => backendMutation(api.mentorship.setBookingStatus, { bookingId, status }),
              `Marked as ${status.toLowerCase()}.`
            )
          }
          onWithdraw={async () => {
            const ok = await run(
              () => backendMutation(api.mentorship.withdrawSlot, { slotId: selectedSlot.id }),
              "Slot withdrawn — anyone who had booked it has been notified."
            );
            if (ok) setSelected(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}

/* ---------------- slot form ---------------- */

function SlotForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <Field label="What is this session?" hint="Shown on the calendar block and to students browsing.">
        <TextInput
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Capstone project reviews"
        />
      </Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Date & time" className="sm:col-span-1">
          <TextInput required type="datetime-local" value={form.slot} onChange={(e) => set("slot", e.target.value)} />
        </Field>
        <Field label="Duration" hint="Minutes.">
          <Select value={form.durationMins} onChange={(e) => set("durationMins", e.target.value)}>
            {["15", "20", "30", "45", "60", "90", "120"].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seats" hint="How many students can book this.">
          <TextInput type="number" min="1" max="50" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
        </Field>
      </div>

      <Field label="Where">
        <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
          {["In person", "Online"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
      </Field>

      {form.mode === "Online" ? (
        <Field label="Meeting link" hint="Paste a Meet, Zoom or Teams link. Only students who book the slot can see it.">
          <TextInput
            type="url"
            value={form.meetingUrl}
            onChange={(e) => set("meetingUrl", e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
          />
        </Field>
      ) : (
        <Field label="Room / location">
          <TextInput
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Department office, Room 204"
          />
        </Field>
      )}

      <Field label="Anything students should bring or prepare" hint="Optional.">
        <TextArea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Bring your draft abstract." />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? "Saving…" : "Save slot"}
        </Button>
      </div>
    </form>
  );
}

/* ---------------- detail panel ---------------- */

function SlotDetail({ slot, onClose, onEdit, onWithdraw, onSetBookingStatus, busy }) {
  const bookings = (slot.bookings || []).filter((b) => b.status !== "Cancelled");
  const isPast = new Date(slot.slot).getTime() < Date.now();
  const tone = BLOCK_TONES[toneFor(slot)];

  return (
    <Modal
      title={slot.title || "Office hours"}
      description={`${formatDateTime(slot.slot)} · ${slot.durationMins} min · ${slot.mode}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="flex-1" onClick={onEdit} disabled={busy}>
            Edit slot
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={busy}
            onClick={() => {
              if (
                bookings.length === 0 ||
                window.confirm(
                  `${bookings.length} student${bookings.length === 1 ? " has" : "s have"} booked this slot. Withdrawing it cancels their booking${
                    bookings.length === 1 ? "" : "s"
                  } and notifies them. Continue?`
                )
              ) {
                onWithdraw();
              }
            }}
          >
            Withdraw this slot
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isPast ? "muted" : bookings.length >= slot.capacity ? "blue" : bookings.length ? "amber" : "green"} dot>
            {tone.label}
          </Badge>
          <Badge tone="neutral">
            {bookings.length} of {slot.capacity} booked
          </Badge>
          {slot.mode === "Online" ? (
            slot.meetingUrl ? (
              <a href={slot.meetingUrl} target="_blank" rel="noreferrer" className="text-xs text-primary font-medium hover:underline">
                Open meeting link →
              </a>
            ) : (
              <span className="text-xs text-amber-600">No meeting link yet — students will need one.</span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">{slot.location || "Location to be confirmed"}</span>
          )}
        </div>

        {slot.notes && (
          <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">{slot.notes}</div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Attendees {bookings.length ? `(${bookings.length})` : ""}
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody has booked this slot yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id || b._id} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5">
                  <Avatar name={b.studentName} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{b.studentName}</div>
                    {/* Why they booked — the single most useful thing to know
                        before the session, and previously buried. */}
                    <div className="text-[11px] text-muted-foreground truncate">
                      {b.topic ? `“${b.topic}”` : "No topic given"}
                    </div>
                  </div>
                  <Select
                    value={b.status}
                    disabled={busy}
                    onChange={(e) => onSetBookingStatus(b.id || b._id, e.target.value)}
                    className="!w-auto text-[11px] py-1"
                    aria-label={`Status for ${b.studentName}`}
                  >
                    {["Booked", "Completed", "No show", "Cancelled"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
