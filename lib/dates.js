/**
 * Structured date ranges for programmes and sessions.
 *
 * Programme dates used to be a free-text box. Someone typed "Dec 8–12, 2026"
 * and that string was then sorted alphabetically, sliced on spaces to guess a
 * day number for the calendar tile, and could never be validated — a
 * programme could end before it started, or be scheduled in the past, and
 * nothing noticed.
 */

const DAY_MS = 86400000;

export function todayIso() {
  return toIsoDate(new Date());
}

export function toIsoDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD as *local* midnight, not UTC — an ISO string parsed by
    `new Date()` is UTC and lands on the previous day west of Greenwich. */
export function parseIsoDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDaysIso(value, days) {
  const d = parseIsoDate(value);
  if (!d) return value;
  return toIsoDate(new Date(d.getTime() + days * DAY_MS));
}

export function daysBetween(fromIso, toIso) {
  const a = parseIsoDate(fromIso);
  const b = parseIsoDate(toIso);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Validates a range. Returns an error string or null.
 * `allowPast` exists because editing a programme that already started is a
 * legitimate thing to do — only *creating* one in the past is not.
 */
export function validateDateRange(startDate, endDate, { allowPast = false, label = "programme" } = {}) {
  if (!startDate) return "Pick a start date.";
  const start = parseIsoDate(startDate);
  if (!start) return "That start date isn't valid.";

  if (!allowPast) {
    const today = parseIsoDate(todayIso());
    if (start.getTime() < today.getTime()) return `A ${label} can't start in the past.`;
    const horizon = checkScheduleHorizon(startDate, `A ${label}`);
    if (horizon) return horizon;
  }

  if (endDate) {
    const end = parseIsoDate(endDate);
    if (!end) return "That end date isn't valid.";
    if (end.getTime() < start.getTime()) return "The end date can't be before the start date.";
    if (end.getTime() - start.getTime() > 365 * DAY_MS) return "A range longer than a year is probably a typo.";
  }
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "8–12 Dec 2026", "28 Dec 2026 – 3 Jan 2027", or a single date. */
export function formatDateRange(startDate, endDate) {
  const start = parseIsoDate(startDate);
  if (!start) return "";
  const end = parseIsoDate(endDate);

  const day = (d) => d.getDate();
  const mon = (d) => MONTHS[d.getMonth()];
  const yr = (d) => d.getFullYear();

  if (!end || end.getTime() === start.getTime()) return `${day(start)} ${mon(start)} ${yr(start)}`;
  if (yr(start) !== yr(end)) return `${day(start)} ${mon(start)} ${yr(start)} – ${day(end)} ${mon(end)} ${yr(end)}`;
  if (start.getMonth() !== end.getMonth()) return `${day(start)} ${mon(start)} – ${day(end)} ${mon(end)} ${yr(end)}`;
  return `${day(start)}–${day(end)} ${mon(end)} ${yr(end)}`;
}

/**
 * Extracts structured start/end ISO dates from legacy strings like "Dec 8–12, 2026".
 */
export function extractDatesFromLegacy(datesStr) {
  if (!datesStr || typeof datesStr !== "string") return { startDate: "", endDate: "" };
  const pad = (n) => String(n).padStart(2, "0");
  const m1 = /([A-Za-z]+)\s+(\d{1,2})[–\-](\d{1,2}),?\s+(\d{4})/.exec(datesStr);
  if (m1) {
    const monthIdx = MONTHS.findIndex((m) => m.toLowerCase() === m1[1].slice(0, 3).toLowerCase());
    if (monthIdx !== -1) {
      const y = m1[4];
      const mo = pad(monthIdx + 1);
      return { startDate: `${y}-${mo}-${pad(m1[2])}`, endDate: `${y}-${mo}-${pad(m1[3])}` };
    }
  }
  const m2 = /(\d{1,2})[–\-](\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/.exec(datesStr);
  if (m2) {
    const monthIdx = MONTHS.findIndex((m) => m.toLowerCase() === m2[3].slice(0, 3).toLowerCase());
    if (monthIdx !== -1) {
      const y = m2[4];
      const mo = pad(monthIdx + 1);
      return { startDate: `${y}-${mo}-${pad(m2[1])}`, endDate: `${y}-${mo}-${pad(m2[2])}` };
    }
  }
  return { startDate: "", endDate: "" };
}

/**
 * Every record's display date, whichever era it was written in. Older rows
 * carry only the free-text `dates` string; new ones carry real dates.
 */
export function programmeDates(programme) {
  if (programme?.startDate) return formatDateRange(programme.startDate, programme.endDate);
  const legacy = extractDatesFromLegacy(programme?.dates);
  if (legacy.startDate) return formatDateRange(legacy.startDate, legacy.endDate);
  return programme?.dates || "Dates to be confirmed";
}

/** Sort key: real dates sort chronologically, undated rows sort last. */
export function programmeSortKey(programme) {
  const iso = programme?.startDate || extractDatesFromLegacy(programme?.dates).startDate;
  const start = parseIsoDate(iso);
  return start ? start.getTime() : Number.MAX_SAFE_INTEGER;
}

/** Local-midnight timestamp of a programme's start, or null. */
export function programmeStartMs(programme) {
  const iso = programme?.startDate || extractDatesFromLegacy(programme?.dates).startDate;
  const start = parseIsoDate(iso);
  if (!start) return null;
  const time = /^(\d{2}):(\d{2})$/.exec(programme?.startTime || "");
  if (time) start.setHours(Number(time[1]), Number(time[2]), 0, 0);
  return start.getTime();
}

/** Calendar grid for a month: 6 rows × 7 days, Monday-first. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const startsOn = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startsOn.getFullYear(), startsOn.getMonth(), startsOn.getDate() + i);
    return { date: d, iso: toIsoDate(d), inMonth: d.getMonth() === month, isToday: toIsoDate(d) === todayIso() };
  });
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Every ISO date a programme covers, so it can be drawn on each of them. */
export function datesCovered(startDate, endDate) {
  const start = parseIsoDate(startDate);
  if (!start) return [];
  const end = parseIsoDate(endDate) || start;
  const out = [];
  for (let t = start.getTime(); t <= end.getTime() && out.length < 400; t += DAY_MS) {
    out.push(toIsoDate(new Date(t)));
  }
  return out;
}

/* ============================================================
   Lead times

   Two rules the product needs and had nowhere to express:
   a skill test must be published at least three days before it is sat, and an
   application deadline must be at least two days after the posting goes up.
   Both used to be unconstrained, so a test could be scheduled for "tonight"
   (or for the year 33333) and a role could close the day after it opened.
   ============================================================ */

const HOUR_MS = 3600000;

/** Hours of notice a skill test must give between publishing and sitting it. */
export const TEST_LEAD_HOURS = 72;

/** Hours a posting must stay open for before its deadline can fall. */
export const APPLICATION_LEAD_HOURS = 48;

/** The earliest ISO date that satisfies `hours` of notice from now. */
export function earliestDateAfter(hours) {
  return toIsoDate(new Date(Date.now() + hours * HOUR_MS));
}

/** Local-time milliseconds for a `YYYY-MM-DD` plus an optional `HH:MM`. */
export function combineDateTime(dateIso, time) {
  const date = parseIsoDate(dateIso);
  if (!date) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(time || ""));
  if (m) date.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return date.getTime();
}

/**
 * Validates a date (and optional time) against a lead time. Returns an error
 * string or null, so a form and the store can enforce the same rule with the
 * same words.
 */
/**
 * How far ahead anything can be scheduled. A test dated in the year 3033 is
 * a typo, not a plan; a year is as far as a college or a company ever
 * schedules a sitting, a drive or a programme.
 */
export const MAX_SCHEDULE_DAYS = 365;

/** The latest date a scheduling input accepts (for the input's `max`). */
export function latestScheduleDate() {
  return addDaysIso(todayIso(), MAX_SCHEDULE_DAYS);
}

/** Null when the date is within the horizon, else the message to show. */
export function checkScheduleHorizon(dateIso, what = "This") {
  const d = parseIsoDate(dateIso);
  if (!d) return "That date isn't valid.";
  const latest = parseIsoDate(latestScheduleDate());
  if (d.getTime() > latest.getTime()) return `${what} can be scheduled at most a year ahead (by ${formatDateRange(latestScheduleDate())}).`;
  return null;
}

export function checkLeadTime(dateIso, time, hours, what = "This") {
  if (!dateIso) return "Pick a date.";
  const at = combineDateTime(dateIso, time);
  if (at == null) return "That date isn't valid.";
  const year = parseIsoDate(dateIso)?.getFullYear();
  if (!year || year < 1900) return "That date isn't valid.";
  const horizon = checkScheduleHorizon(dateIso, what);
  if (horizon) return horizon;
  const days = Math.round(hours / 24);
  if (at - Date.now() < hours * HOUR_MS) {
    return `${what} must be at least ${hours} hours (${days} day${days === 1 ? "" : "s"}) from now.`;
  }
  return null;
}

/**
 * A date a human could plausibly have meant. Past dates are fine — someone may
 * be recording work they did in 2013 — but "87-09-2873" is not.
 */
export function isPlausibleDate(dateIso, { allowFuture = true } = {}) {
  const d = parseIsoDate(dateIso);
  if (!d || Number.isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  const thisYear = new Date().getFullYear();
  if (year < 1900) return false;
  return allowFuture ? year <= thisYear + 25 : year <= thisYear;
}

/**
 * The calendar day in India Standard Time, as yyyy-mm-dd. Daily limits reset
 * at midnight IST whatever timezone the server (Convex runs on UTC) is in.
 */
export function istDay(ms = Date.now()) {
  return new Date(ms + 5.5 * HOUR_MS).toISOString().slice(0, 10);
}
