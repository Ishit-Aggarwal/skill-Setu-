"use client";

import { useEffect, useState } from "react";
import DurationPicker, { SpanPicker } from "../ui/DurationPicker";
import { Field, TextInput } from "../ui/Kit";
import { TEST_LEAD_HOURS, combineDateTime, earliestDateAfter, latestScheduleDate, toIsoDate } from "../../lib/dates";
import { EXAM } from "../../lib/settings";
import { formatDuration } from "../../lib/duration";
import { formatSpan } from "../../lib/testWindow";

/**
 * The "when" of a test, shared by the Host a Skill Test form and the
 * community test flow.
 *
 *   One sitting (fixed time) — Test Date + Start Time + Duration; three days'
 *     notice, the 10-minute joining window, Start Test, optional meeting.
 *   Open window — Opens (or "open immediately") + Closes / "Open for", and a
 *     Duration each candidate gets once they start. Online only, no notice
 *     rule, 24 hours to 90 days.
 *
 * Owns no state of its own beyond the two keep-in-sync inputs; everything is
 * read from and written to the parent form through `form` / `set`.
 */

const HOUR = 3600000;

export const WINDOW_DEFAULTS = {
  scheduleType: "fixed",
  durationMinutes: EXAM.DEFAULT_DURATION_MINUTES,
  windowOpenDate: "",
  windowOpenTime: "10:00",
  windowOpenNow: false,
  windowSpanMs: 48 * HOUR,
};

/** The instants a window form describes, computed at `now`. */
export function windowInstants(form, now = Date.now()) {
  const opens = form.windowOpenNow ? now : combineDateTime(form.windowOpenDate, form.windowOpenTime);
  if (opens == null || !Number.isFinite(opens)) return { opensAtMs: null, closesAtMs: null };
  return { opensAtMs: opens, closesAtMs: opens + (Number(form.windowSpanMs) || 0) };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function timeOf(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleTypeChoice({ value, onChange, disabled }) {
  const options = [
    ["fixed", "One sitting (fixed time)", "e.g. 26 Sep, 3:00 PM for 1 h 30 m"],
    ["window", "Open window", "take it any time within a period"],
  ];
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Schedule</div>
      <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Schedule type">
        {options.map(([key, label, hint]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${value === key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"} disabled:opacity-60`}
          >
            <div className={`text-sm font-medium ${value === key ? "text-primary" : "text-foreground"}`}>
              {value === key ? "● " : "○ "}
              {label}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FixedFields({ form, set, onDurationValid, durationLocked }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Test Date" hint={`At least ${TEST_LEAD_HOURS} hours (3 days) from today.`}>
          <TextInput required type="date" min={earliestDateAfter(TEST_LEAD_HOURS)} max={latestScheduleDate()} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
        </Field>
        <Field label="Start Time">
          <TextInput required type="time" value={form.scheduledTime} onChange={(e) => set("scheduledTime", e.target.value)} />
        </Field>
      </div>
      <DurationPicker
        value={form.durationMinutes}
        onChange={(m) => set("durationMinutes", m)}
        onValidity={onDurationValid}
        disabled={durationLocked}
        lockedNote={durationLocked ? "Locked — candidates have already started this test." : null}
      />
    </>
  );
}

export function WindowFields({ form, set, onDurationValid, durationLocked, openLocked = false }) {
  // Re-render every half minute so "open immediately" previews stay current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const { opensAtMs, closesAtMs } = windowInstants(form, now);
  const spanHours = Math.round((Number(form.windowSpanMs) || 0) / HOUR);
  const today = toIsoDate(new Date());

  function setClose(date, time) {
    const close = combineDateTime(date, time);
    if (close == null || opensAtMs == null) return;
    set("windowSpanMs", Math.max(0, close - opensAtMs));
  }

  const lastStart = closesAtMs != null ? closesAtMs - (Number(form.durationMinutes) || 0) * 60000 : null;

  return (
    <div className="space-y-3 rounded-xl border border-border p-3.5">
      <p className="text-[11px] text-muted-foreground">An open window can only be sat online, in the proctored exam room. There is no 3-day notice rule: it can open now.</p>
      <label className="flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={Boolean(form.windowOpenNow)} disabled={openLocked} onChange={(e) => set("windowOpenNow", e.target.checked)} />
        Open immediately (the moment you publish)
      </label>
      {!form.windowOpenNow && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens (date)">
            <TextInput required type="date" min={today} max={latestScheduleDate()} value={form.windowOpenDate} disabled={openLocked} onChange={(e) => set("windowOpenDate", e.target.value)} />
          </Field>
          <Field label="Opens (time)">
            <TextInput required type="time" value={form.windowOpenTime} disabled={openLocked} onChange={(e) => set("windowOpenTime", e.target.value)} />
          </Field>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3 items-end">
        <SpanPicker value={spanHours} onChange={(h) => set("windowSpanMs", h * HOUR)} maxDays={EXAM.MAX_WINDOW_DAYS} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Closes (date)">
            <TextInput
              type="date"
              min={today}
              max={latestScheduleDate()}
              value={closesAtMs != null ? toIsoDate(new Date(closesAtMs)) : ""}
              onChange={(e) => setClose(e.target.value, closesAtMs != null ? timeOf(closesAtMs) : "10:00")}
            />
          </Field>
          <Field label="Closes (time)">
            <TextInput type="time" value={closesAtMs != null ? timeOf(closesAtMs) : ""} onChange={(e) => setClose(closesAtMs != null ? toIsoDate(new Date(closesAtMs)) : today, e.target.value)} />
          </Field>
        </div>
      </div>
      <DurationPicker
        value={form.durationMinutes}
        onChange={(m) => set("durationMinutes", m)}
        onValidity={onDurationValid}
        disabled={durationLocked}
        label="Duration (per candidate, once they start)"
        lockedNote={durationLocked ? "Locked — candidates have already started this test." : null}
      />
      {opensAtMs != null && closesAtMs != null && (
        <p className="text-[11px] text-muted-foreground rounded-lg bg-secondary/60 px-2.5 py-2 leading-relaxed">
          Open for {formatSpan(closesAtMs - opensAtMs)}. Candidates can start any time before{" "}
          <span className="font-medium text-foreground">{new Date(lastStart).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span> and get {formatDuration(form.durationMinutes)} once they start; the window closes{" "}
          {new Date(closesAtMs).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. Minimum {EXAM.MIN_WINDOW_HOURS} h, maximum {EXAM.MAX_WINDOW_DAYS} days.
        </p>
      )}
    </div>
  );
}
