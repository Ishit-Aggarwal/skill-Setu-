"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, EmptyState, Field, Flash, IconTile, Modal, PageHeader, Section, Select, StatGrid, TextInput, useFlash } from "../../ui/Kit";
import { formatDate, formatDateTime, relativeTime } from "../../../lib/match";
import {
  addOfficeHourSlot,
  listBookingsForSlot,
  listMentorBookings,
  listOfficeHours,
  removeOfficeHourSlot,
  setBookingStatus,
} from "../../../lib/store";
import { subscribeToMutations } from "../../../lib/sync";

const STATUS_TONE = { Booked: "primary", Completed: "green", "No show": "red", Cancelled: "muted" };

function groupByDay(slots) {
  const groups = {};
  slots.forEach((s) => {
    const day = (s.slot || "").slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(s);
  });
  return Object.entries(groups)
    .map(([day, items]) => ({ day, items: items.sort((a, b) => a.slot.localeCompare(b.slot)) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Office hours: the faculty member publishes availability, students book a
 * slot from their own dashboard, and both sides see the same list.
 */
export default function Mentorship() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    return subscribeToMutations(["officeHours", "mentorBookings"], () => {
      setVersion((v) => v + 1);
    });
  }, []);

  const slots = useMemo(() => (ready && user ? listOfficeHours(user.id) : []), [user, ready, version]);
  const bookings = useMemo(() => (ready && user ? listMentorBookings(user.id) : []), [user, ready, version]);

  const now = Date.now();
  const upcoming = useMemo(() => slots.filter((s) => new Date(s.slot).getTime() >= now), [slots, now]);
  const past = useMemo(() => slots.filter((s) => new Date(s.slot).getTime() < now), [slots, now]);

  const bookedSeats = bookings.filter((b) => b.status === "Booked").length;
  const totalCapacity = upcoming.reduce((s, x) => s + (Number(x.capacity) || 1), 0);

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  function SlotCard({ slot, isPast }) {
    const slotBookings = listBookingsForSlot(slot.id);
    const remaining = (Number(slot.capacity) || 1) - slotBookings.filter((b) => b.status !== "Cancelled").length;
    return (
      <div className={`bg-card border border-border rounded-2xl p-4 transition-shadow ${isPast ? "opacity-70" : "hover:shadow-[0_6px_20px_rgba(25,25,26,0.06)]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <IconTile icon="📅" tone={isPast ? "purple" : "primary"} size={34} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{formatDateTime(slot.slot)}</div>
              <div className="text-[11px] text-muted-foreground">
                {slot.durationMins || 30} min · {slot.mode} · {slot.location || "Location TBC"}
              </div>
            </div>
          </div>
          <Badge tone={remaining > 0 ? "green" : "amber"}>
            {remaining > 0 ? `${remaining} of ${slot.capacity || 1} free` : "Full"}
          </Badge>
        </div>

        {slotBookings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="space-y-2 mt-3">
            {slotBookings.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2.5 bg-secondary/50 rounded-lg px-3 py-2">
                <Avatar name={b.studentName} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate">{b.studentName}</div>
                  {b.topic && <div className="text-[10px] text-muted-foreground truncate">{b.topic}</div>}
                </div>
                <Select
                  value={b.status}
                  onChange={(e) => { setBookingStatus(b.id, e.target.value); bump(); }}
                  className="w-auto text-[11px] py-1"
                >
                  {["Booked", "Completed", "No show", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                </Select>
                <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {!isPast && (
          <button
            onClick={() => { removeOfficeHourSlot(slot.id); bump("Slot withdrawn."); }}
            className="mt-3 text-xs text-muted-foreground hover:text-red-600"
          >
            Withdraw this slot
          </button>
        )}
      </div>
    );
  }

  return (
    <DashboardLayout activePage="academician-mentorship" title="Mentorship">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Mentorship & Office Hours"
          subtitle="Publish when you're available; students book a slot from their own dashboard and you manage the roster here."
          actions={<Button size="sm" onClick={() => setShowAdd(true)}>Publish availability</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Upcoming slots", value: String(upcoming.length), icon: "📅" },
            { label: "Seats available", value: String(Math.max(0, totalCapacity - bookedSeats)), icon: "🪑", hint: `${totalCapacity} published` },
            { label: "Booked sessions", value: String(bookedSeats), icon: "✅" },
            { label: "Sessions completed", value: String(bookings.filter((b) => b.status === "Completed").length), icon: "🎓" },
          ]}
        />

        <Section title="Upcoming availability" description="Students see these slots on their dashboard and can book directly.">
          {upcoming.length === 0 ? (
            <EmptyState icon="📅" title="No availability published" action={<Button size="sm" onClick={() => setShowAdd(true)}>Publish a slot</Button>}>
              Add office-hours slots so your advisees can book time with you without emailing back and forth.
            </EmptyState>
          ) : (
            <div className="space-y-5">
              {groupByDay(upcoming).map(({ day, items }) => (
                <div key={day}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{formatDate(day)}</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {items.map((s) => <SlotCard key={s.id} slot={s} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {past.length > 0 && (
          <Section title="Past sessions">
            <div className="grid md:grid-cols-2 gap-3">
              {past.slice(-4).reverse().map((s) => <SlotCard key={s.id} slot={s} isPast />)}
            </div>
          </Section>
        )}

        {bookings.length > 0 && (
          <Card>
            <Section title="Booking history" description="Every request against your slots, newest first.">
              <div className="space-y-0">
                {[...bookings]
                  .sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt))
                  .slice(0, 10)
                  .map((b) => (
                    <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                      <Avatar name={b.studentName} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate">{b.studentName}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{b.topic || "No topic given"}</div>
                      </div>
                      <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{relativeTime(b.bookedAt)}</span>
                    </div>
                  ))}
              </div>
            </Section>
          </Card>
        )}
      </div>

      {showAdd && (
        <Modal title="Publish an office-hours slot" onClose={() => setShowAdd(false)}>
          <SlotForm
            onCancel={() => setShowAdd(false)}
            onSubmit={(data) => {
              addOfficeHourSlot(user.id, data);
              setShowAdd(false);
              bump("Slot published — students can book it now.");
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function SlotForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState({ slot: "", durationMins: "30", capacity: "2", mode: "In person", location: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...form, durationMins: Number(form.durationMins) || 30, capacity: Number(form.capacity) || 1 });
      }}
      className="space-y-4"
    >
      <Field label="Date & time"><TextInput required type="datetime-local" value={form.slot} onChange={(e) => set("slot", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (minutes)"><TextInput type="number" min="10" value={form.durationMins} onChange={(e) => set("durationMins", e.target.value)} /></Field>
        <Field label="Seats" hint="How many students can book this slot."><TextInput type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
      </div>
      <Field label="Mode">
        <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
          {["In person", "Online"].map((m) => <option key={m}>{m}</option>)}
        </Select>
      </Field>
      <Field label={form.mode === "Online" ? "Meeting link or platform" : "Room / location"}>
        <TextInput value={form.location} onChange={(e) => set("location", e.target.value)} placeholder={form.mode === "Online" ? "Video call" : "Department office, Room 204"} />
      </Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Publish slot</Button>
      </div>
    </form>
  );
}
