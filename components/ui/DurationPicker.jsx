"use client";

import { useEffect, useRef, useState } from "react";
import { DURATION_BOUNDS, durationError, extremeDuration, formatDuration, splitMinutes, stepDuration } from "../../lib/duration";

/**
 * Hours and minutes, side by side, each with ▲ / ▼.
 *
 * Replaces the free-text "15 mins" box. Minutes step by
 * EXAM.DURATION_MINUTE_STEP and roll over into the hours; holding an arrow
 * repeats; ↑/↓ step, PgUp/PgDn step the hours, Home/End go to the ends. The
 * total stays within the allowed range, and anything typed outside it shows
 * an inline error (the form refuses to submit while `onValidity` says so).
 *
 * `value` and `onChange` are total minutes.
 */

const HOLD_DELAY_MS = 400;
const HOLD_REPEAT_MS = 80;

function useHold(action) {
  const timer = useRef(null);
  const actionRef = useRef(action);
  actionRef.current = action;
  function stop() {
    clearTimeout(timer.current);
    clearInterval(timer.current);
    timer.current = null;
  }
  function start(e) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    actionRef.current();
    stop();
    timer.current = setTimeout(() => {
      timer.current = setInterval(() => actionRef.current(), HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  }
  useEffect(() => stop, []);
  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop };
}

function Arrow({ label, direction, onStep, disabled }) {
  const hold = useHold(onStep);
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      disabled={disabled}
      {...hold}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStep();
        }
      }}
      className="w-full flex items-center justify-center py-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md disabled:opacity-40 select-none"
    >
      <span aria-hidden="true" className="text-[11px] leading-none">{direction > 0 ? "▲" : "▼"}</span>
    </button>
  );
}

function SpinField({ id, label, text, onText, value, min, max, onStep, onExtreme, onPage, disabled, invalid }) {
  return (
    <div className="flex flex-col items-stretch w-20">
      <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center mb-1">
        {label}
      </label>
      <div className={`rounded-xl border bg-background ${invalid ? "border-red-300" : "border-border"} focus-within:ring-2 focus-within:ring-primary/30 px-1 py-1`}>
        <Arrow label={`Increase ${label.toLowerCase()}`} direction={1} onStep={() => onStep(1)} disabled={disabled} />
        <input
          id={id}
          role="spinbutton"
          inputMode="numeric"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={text}
          onChange={(e) => onText(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onStep(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onStep(-1);
            } else if (e.key === "PageUp") {
              e.preventDefault();
              onPage(1);
            } else if (e.key === "PageDown") {
              e.preventDefault();
              onPage(-1);
            } else if (e.key === "Home") {
              e.preventDefault();
              onExtreme("min");
            } else if (e.key === "End") {
              e.preventDefault();
              onExtreme("max");
            }
          }}
          className="w-full text-center text-lg font-semibold text-foreground bg-transparent focus:outline-none tabular-nums"
        />
        <Arrow label={`Decrease ${label.toLowerCase()}`} direction={-1} onStep={() => onStep(-1)} disabled={disabled} />
      </div>
    </div>
  );
}

let pickerSeq = 0;

export default function DurationPicker({ value, onChange, onValidity, disabled = false, label = "Duration", hint, lockedNote }) {
  const [idBase] = useState(() => `duration-${++pickerSeq}`);
  const initial = splitMinutes(value);
  const [hoursText, setHoursText] = useState(String(initial.hours));
  const [minutesText, setMinutesText] = useState(String(initial.minutes));

  // Follow an outside change of `value` (a reset form, a test loaded for editing).
  useEffect(() => {
    const parts = splitMinutes(value);
    if (Number(hoursText) * 60 + Number(minutesText) !== Number(value)) {
      setHoursText(String(parts.hours));
      setMinutesText(String(parts.minutes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const error = durationError(hoursText === "" ? NaN : Number(hoursText), minutesText === "" ? NaN : Number(minutesText));

  useEffect(() => {
    onValidity?.(!error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  function commit(h, m) {
    setHoursText(String(h));
    setMinutesText(String(m));
    onChange?.(h * 60 + m);
  }

  function typed(field, text) {
    const nextH = field === "hours" ? text : hoursText;
    const nextM = field === "minutes" ? text : minutesText;
    if (field === "hours") setHoursText(text);
    else setMinutesText(text);
    if (!durationError(Number(nextH), Number(nextM)) && nextH !== "" && nextM !== "") onChange?.(Number(nextH) * 60 + Number(nextM));
  }

  const current = { hours: Number(hoursText) || 0, minutes: Number(minutesText) || 0 };
  const step = (field) => (direction) => {
    const next = stepDuration(current, field, direction);
    commit(next.hours, next.minutes);
  };
  const extreme = (field) => (which) => {
    const next = extremeDuration(current, field, which);
    commit(next.hours, next.minutes);
  };

  const total = current.hours * 60 + current.minutes;

  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      <div className="flex items-end gap-2" role="group" aria-label={label}>
        <SpinField
          id={`${idBase}-h`}
          label="Hours"
          text={hoursText}
          onText={(t) => typed("hours", t)}
          value={current.hours}
          min={0}
          max={DURATION_BOUNDS.MAX_HOURS}
          onStep={step("hours")}
          onPage={step("hours")}
          onExtreme={extreme("hours")}
          disabled={disabled}
          invalid={Boolean(error)}
        />
        <span className="pb-6 text-lg font-semibold text-muted-foreground" aria-hidden="true">:</span>
        <SpinField
          id={`${idBase}-m`}
          label="Minutes"
          text={minutesText}
          onText={(t) => typed("minutes", t)}
          value={current.minutes}
          min={0}
          max={59}
          onStep={step("minutes")}
          onPage={step("hours")}
          onExtreme={extreme("minutes")}
          disabled={disabled}
          invalid={Boolean(error)}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-red-600 mt-1" role="alert">{error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground mt-1">
          Total: {formatDuration(total)}
          {hint ? ` · ${hint}` : ""}
        </p>
      )}
      {lockedNote && <p className="text-[11px] text-amber-700 mt-1">{lockedNote}</p>}
    </div>
  );
}

/**
 * The same look for "Open for": days (1–90) and hours (0–23). `value` and
 * `onChange` are total hours.
 */
export function SpanPicker({ value, onChange, maxDays = 90, disabled = false, label = "Open for" }) {
  const [idBase] = useState(() => `span-${++pickerSeq}`);
  const total = Math.max(0, Math.round(Number(value) || 0));
  const days = Math.floor(total / 24);
  const hours = total % 24;
  const clamp = (h) => Math.max(24, Math.min(maxDays * 24, h));
  const set = (d, h) => onChange?.(clamp(d * 24 + h));
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
      <div className="flex items-end gap-2" role="group" aria-label={label}>
        <SpinField
          id={`${idBase}-d`}
          label="Days"
          text={String(days)}
          onText={(t) => t !== "" && set(Math.min(maxDays, Number(t)), hours)}
          value={days}
          min={1}
          max={maxDays}
          onStep={(dir) => set(days + dir, hours)}
          onPage={(dir) => set(days + dir * 7, hours)}
          onExtreme={(which) => set(which === "max" ? maxDays : 1, which === "max" ? 0 : hours)}
          disabled={disabled}
        />
        <SpinField
          id={`${idBase}-h`}
          label="Hours"
          text={String(hours)}
          onText={(t) => t !== "" && set(days, Math.min(23, Number(t)))}
          value={hours}
          min={0}
          max={23}
          onStep={(dir) => {
            const next = total + dir;
            onChange?.(clamp(next));
          }}
          onPage={(dir) => set(days + dir, hours)}
          onExtreme={(which) => set(days, which === "max" ? 23 : 0)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
