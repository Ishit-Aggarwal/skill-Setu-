"use client";

import { useMemo, useState } from "react";

/**
 * A real calendar, not a list dressed up as one.
 *
 * Month, week and day views over the same event array. In week and day view a
 * block is positioned by its start time and sized by its duration, so two
 * back-to-back 30-minute slots look different from one 60-minute slot — which
 * is the entire reason to draw a calendar rather than print the times in a
 * column. Month view falls back to compact chips, because a month grid has no
 * room to be proportional and pretending otherwise just makes 08:00 and 17:00
 * look identical.
 *
 * It knows nothing about mentorship: it takes events, renders them, and calls
 * back when one is clicked or an empty slot is picked. The mentor screen and
 * the student screen both use it.
 */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const HOUR_PX = 52;

export const BLOCK_TONES = {
  open: {
    label: "Open",
    bar: "bg-emerald-500",
    block: "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100",
    chip: "bg-emerald-500",
  },
  partial: {
    label: "Partly booked",
    bar: "bg-amber-500",
    block: "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100",
    chip: "bg-amber-500",
  },
  full: {
    label: "Full",
    bar: "bg-blue-500",
    block: "bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100",
    chip: "bg-blue-500",
  },
  booked: {
    label: "Booked",
    bar: "bg-primary",
    block: "bg-primary/10 border-primary/40 text-foreground hover:bg-primary/20",
    chip: "bg-primary",
  },
  past: {
    label: "Past",
    bar: "bg-muted-foreground",
    block: "bg-secondary border-border text-muted-foreground hover:bg-muted",
    chip: "bg-muted-foreground",
  },
  cancelled: {
    label: "Cancelled",
    bar: "bg-red-400",
    block: "bg-red-50 border-red-200 text-red-700 line-through hover:bg-red-100",
    chip: "bg-red-400",
  },
};

/* ---------------- date helpers (local time, no library) ---------------- */

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Monday-first, matching how Indian academic timetables are written. */
function startOfWeek(d) {
  const c = startOfDay(d);
  const day = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - day);
  return c;
}

function startOfMonthGrid(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return startOfWeek(first);
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(d) {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function fmtMonth(d) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** "YYYY-MM-DDTHH:mm" in local time — the shape slots are stored in. */
export function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

/* ---------------- component ---------------- */

export default function Calendar({
  events = [],
  view: controlledView,
  onViewChange,
  onSelectEvent,
  onPickEmpty,
  initialDate,
  emptyMessage = "Nothing scheduled.",
  legend = true,
}) {
  const [uncontrolledView, setUncontrolledView] = useState("month");
  const view = controlledView ?? uncontrolledView;
  const setView = onViewChange ?? setUncontrolledView;

  const [cursor, setCursor] = useState(() => startOfDay(initialDate ? new Date(initialDate) : new Date()));
  const today = startOfDay(new Date());

  /* Events are normalised once: a bad or missing start would otherwise throw
     inside the render loop and take the whole page with it. */
  const items = useMemo(
    () =>
      events
        .map((e) => {
          const start = new Date(e.start);
          if (Number.isNaN(start.getTime())) return null;
          const duration = Math.max(15, Number(e.durationMins) || 30);
          return { ...e, start, end: new Date(start.getTime() + duration * 60000), durationMins: duration };
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start),
    [events]
  );

  function eventsOn(day) {
    return items.filter((e) => sameDay(e.start, day));
  }

  function move(direction) {
    if (view === "month") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1));
    else if (view === "week") setCursor(addDays(cursor, direction * 7));
    else setCursor(addDays(cursor, direction));
  }

  const rangeLabel = useMemo(() => {
    if (view === "month") return fmtMonth(cursor);
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      const sameMonth = s.getMonth() === e.getMonth();
      return `${s.toLocaleDateString("en-IN", { day: "numeric", month: sameMonth ? undefined : "short" })} – ${e.toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "short", year: "numeric" }
      )}`;
    }
    return cursor.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [cursor, view]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* ---------------- toolbar ---------------- */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => move(-1)}
            aria-label="Previous"
            className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => move(1)}
            aria-label="Next"
            className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => setCursor(startOfDay(new Date()))}
            className="ml-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Today
          </button>
        </div>

        <div className="text-sm font-semibold text-foreground mx-1 min-w-0 truncate">{rangeLabel}</div>

        <div className="ml-auto flex bg-secondary rounded-lg p-0.5">
          {["month", "week", "day"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all duration-150 ${
                view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- month ---------------- */}
      {view === "month" && (
        <div>
          <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }, (_, i) => addDays(startOfMonthGrid(cursor), i)).map((day) => {
              const dayEvents = eventsOn(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = sameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[92px] border-b border-r border-border p-1.5 last:border-r-0 ${
                    inMonth ? "" : "bg-secondary/25"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[11px] w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-primary text-white font-semibold"
                          : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {onPickEmpty && inMonth && (
                      <button
                        onClick={() => {
                          const at = new Date(day);
                          at.setHours(10, 0, 0, 0);
                          onPickEmpty(toLocalInput(at));
                        }}
                        aria-label={`Add a slot on ${day.toDateString()}`}
                        className="text-[13px] leading-none text-muted-foreground opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => {
                      const tone = BLOCK_TONES[e.tone] || BLOCK_TONES.open;
                      return (
                        <button
                          key={e.id}
                          onClick={() => onSelectEvent?.(e)}
                          className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-md border text-[10px] leading-tight transition-colors ${tone.block}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tone.chip}`} />
                          <span className="font-semibold flex-shrink-0">{fmtTime(e.start)}</span>
                          <span className="truncate">{e.title}</span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => {
                          setCursor(startOfDay(day));
                          setView("day");
                        }}
                        className="text-[10px] text-primary font-medium hover:underline px-1.5"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- week / day ---------------- */}
      {view !== "month" && (
        <TimeGrid
          days={
            view === "week"
              ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
              : [startOfDay(cursor)]
          }
          today={today}
          eventsOn={eventsOn}
          onSelectEvent={onSelectEvent}
          onPickEmpty={onPickEmpty}
        />
      )}

      {items.length === 0 && <div className="px-4 py-4 text-xs text-muted-foreground border-t border-border">{emptyMessage}</div>}

      {legend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 border-t border-border bg-secondary/30">
          {["open", "partial", "full", "booked", "past"].map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-sm ${BLOCK_TONES[key].chip}`} />
              {BLOCK_TONES[key].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The proportional part: one column per day, blocks sized by duration. */
function TimeGrid({ days, today, eventsOn, onSelectEvent, onPickEmpty }) {
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid border-b border-border bg-secondary/40" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((day) => {
            const isToday = day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth() && day.getDate() === today.getDate();
            return (
              <div key={day.toISOString()} className="px-2 py-2 text-center border-l border-border">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {day.toLocaleDateString("en-IN", { weekday: "short" })}
                </div>
                <div
                  className={`text-sm mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday ? "bg-primary text-white font-semibold" : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="relative text-[10px] text-muted-foreground text-right pr-2" style={{ height: HOUR_PX }}>
                <span className="absolute -top-1.5 right-2">{h % 12 === 0 ? 12 : h % 12}{h < 12 ? "am" : "pm"}</span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day.toISOString()} className="relative border-l border-border">
              {hours.map((h) => (
                <div
                  key={h}
                  onClick={
                    onPickEmpty
                      ? () => {
                          const at = new Date(day);
                          at.setHours(h, 0, 0, 0);
                          onPickEmpty(toLocalInput(at));
                        }
                      : undefined
                  }
                  className={`border-b border-border/60 ${onPickEmpty ? "cursor-pointer hover:bg-primary/5" : ""}`}
                  style={{ height: HOUR_PX }}
                />
              ))}

              {eventsOn(day).map((e) => {
                const tone = BLOCK_TONES[e.tone] || BLOCK_TONES.open;
                const minutesFromTop = (e.start.getHours() - DAY_START_HOUR) * 60 + e.start.getMinutes();
                const top = (minutesFromTop / 60) * HOUR_PX;
                const height = Math.max(24, (e.durationMins / 60) * HOUR_PX - 3);
                // Slots before 7am or after 9pm are pinned to the visible edge
                // rather than drawn outside the grid where nobody would see them.
                const clampedTop = Math.max(0, Math.min(top, hours.length * HOUR_PX - height));
                return (
                  <button
                    key={e.id}
                    onClick={() => onSelectEvent?.(e)}
                    title={`${e.title} · ${fmtTime(e.start)}–${fmtTime(e.end)}`}
                    className={`absolute left-1 right-1 rounded-lg border px-2 py-1 text-left overflow-hidden transition-colors ${tone.block}`}
                    style={{ top: clampedTop, height }}
                  >
                    <div className="text-[10px] font-semibold leading-tight truncate">{e.title}</div>
                    <div className="text-[10px] opacity-80 leading-tight truncate">
                      {fmtTime(e.start)} – {fmtTime(e.end)}
                    </div>
                    {e.subtitle && height > 46 && (
                      <div className="text-[10px] opacity-70 leading-tight truncate mt-0.5">{e.subtitle}</div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
