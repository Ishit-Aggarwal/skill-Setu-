"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, Flash, Modal, Section, Select, TextInput, useFlash } from "./ui/Kit";
import { formatDateTime } from "../lib/match";
import { bookOfficeHourSlot, listBookingsForSlot, listOfficeHours, listUsersByRole } from "../lib/store";

/**
 * The student half of faculty office hours — a mentor publishes availability
 * from their dashboard and the student books a slot here, instead of the
 * scheduling living only on the faculty side.
 */
export default function MentoringPanel({ user }) {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [booking, setBooking] = useState(null);
  const [flash, setFlash] = useFlash();

  useEffect(() => setReady(true), []);

  const faculty = useMemo(
    () => (ready ? listUsersByRole("academician").filter((f) => !user?.institution || f.institution === user.institution) : []),
    [ready, user]
  );

  const slots = useMemo(() => {
    if (!ready) return [];
    const now = Date.now();
    return faculty
      .flatMap((f) =>
        listOfficeHours(f.id).map((s) => {
          const taken = listBookingsForSlot(s.id);
          return {
            ...s,
            facultyName: f.name,
            facultyDepartment: f.department,
            taken: taken.length,
            mine: taken.some((b) => b.studentId === user?.id),
            remaining: (Number(s.capacity) || 1) - taken.length,
          };
        })
      )
      .filter((s) => new Date(s.slot).getTime() > now)
      .sort((a, b) => a.slot.localeCompare(b.slot));
  }, [faculty, ready, user, version]);

  const myBookings = slots.filter((s) => s.mine);
  const available = slots.filter((s) => !s.mine && s.remaining > 0);

  return (
    <Card>
      <Section
        title="Mentoring & office hours"
        description={`Book time with faculty at ${user?.institution || "your institution"}.`}
      >
        <Flash message={flash} />

        {myBookings.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Your booked sessions</div>
            {myBookings.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 bg-primary/5 rounded-xl px-3 py-2.5">
                <span className="text-sm">📅</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate">{s.facultyName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{formatDateTime(s.slot)} · {s.mode}</div>
                </div>
                <Badge tone="green">Booked</Badge>
              </div>
            ))}
          </div>
        )}

        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {slots.length ? "No open slots right now — check back soon." : "No faculty at your institution has published office hours yet."}
          </p>
        ) : (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {available.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 border border-border rounded-xl px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate">{s.facultyName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {formatDateTime(s.slot)} · {s.durationMins || 30}m · {s.mode}
                  </div>
                </div>
                <Badge tone={s.remaining > 1 ? "green" : "amber"}>{s.remaining} left</Badge>
                <Button size="sm" variant="outline" onClick={() => setBooking(s)}>Book</Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {booking && (
        <Modal
          title={`Book time with ${booking.facultyName}`}
          description={`${formatDateTime(booking.slot)} · ${booking.mode}${booking.location ? ` · ${booking.location}` : ""}`}
          onClose={() => setBooking(null)}
        >
          <BookingForm
            onCancel={() => setBooking(null)}
            onSubmit={(topic) => {
              try {
                bookOfficeHourSlot(booking, user, topic);
                setBooking(null);
                setVersion((v) => v + 1);
                setFlash(`Slot booked with ${booking.facultyName}.`);
              } catch (err) {
                setFlash(err.message);
                setBooking(null);
              }
            }}
          />
        </Modal>
      )}
    </Card>
  );
}

function BookingForm({ onCancel, onSubmit }) {
  const [topic, setTopic] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(topic); }} className="space-y-4">
      <Field label="What would you like to discuss?" hint="Helps your mentor prepare.">
        <TextInput value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Guidance on clinical research internships" />
      </Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Confirm booking</Button>
      </div>
    </form>
  );
}
