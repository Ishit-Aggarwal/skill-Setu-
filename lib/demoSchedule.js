/**
 * Dates for the sample catalogue that never go stale.
 *
 * The demo postings, programmes and skill tests used to carry fixed calendar
 * dates ("2026-09-15"). The day after the last of them passed, the tour showed
 * nothing but closed postings and ended exams. Sample rows now carry offsets
 * ("closes in 13 days") that are turned into dates when they are seeded, and
 * a sample that runs out is rolled forward:
 *
 *   • a skill test that has ended is followed by a fresh copy of itself,
 *     scheduled the same number of days ahead as when it was first seeded;
 *     the ended one is kept only if someone registered for or sat it;
 *   • a posting past its deadline, or a programme that has finished, is
 *     re-dated in place.
 *
 * Plain functions, shared by the browser store and the Convex cron.
 */

import { addDaysIso, todayIso, toIsoDate } from "./dates";
import { hasEnded, isWindowTest, testStartMs } from "./testWindow";

const DAY_MS = 86400000;
const IST_MS = 5.5 * 3600000;

/** The local calendar date `days` from now, as YYYY-MM-DD. */
export function isoInDays(days, now = Date.now()) {
  return toIsoDate(new Date(now + days * DAY_MS));
}

/** A sample posting with its `deadlineInDays` turned into a deadline. */
export function datedInternship(template, now = Date.now()) {
  const { deadlineInDays, ...row } = template;
  return { ...row, deadline: isoInDays(deadlineInDays, now) };
}

/** A sample programme with its `startInDays`/`lengthDays` turned into dates. */
export function datedProgramme(template, now = Date.now()) {
  const { startInDays, lengthDays = 1, ...row } = template;
  const startDate = isoInDays(startInDays, now);
  return { ...row, startDate, endDate: addDaysIso(startDate, Math.max(0, lengthDays - 1)) };
}

/** True when a sample posting's deadline has passed and it should be re-dated. */
export function internshipNeedsRedate(row, today = todayIso()) {
  return !!row?.deadline && row.deadline < today;
}

/** True when a sample programme has finished and it should be re-dated. */
export function programmeNeedsRedate(row, today = todayIso()) {
  const last = row?.endDate || row?.startDate;
  return !!last && last < today;
}

/**
 * The skill-test roll-over, for the browser's copy of the catalogue.
 *
 * `rows` are every skill test; `templates` maps a seedId to a freshly dated
 * template (the seed row as it would be written right now). For each sample
 * test that has ended, a new row is appended from its template, and the ended
 * row is either dropped (nobody touched it) or kept as history under a
 * retired seedId, so the template's seedId always names the live instance.
 *
 * Returns `{ rows, created, retired, removed }`; `rows` is the input array
 * itself when nothing changed.
 */
export function rollOverSeedTests(rows, templates, { now = Date.now(), isUsed = () => false, newId, extra = () => ({}) } = {}) {
  const out = [];
  const created = [];
  const retired = [];
  const removed = [];
  const live = new Set(rows.filter((r) => r?.seedId && templates.has(r.seedId) && !hasEnded(r, now)).map((r) => r.seedId));

  for (const row of rows) {
    const template = row?.seedId ? templates.get(row.seedId) : null;
    if (!template || !hasEnded(row, now)) {
      out.push(row);
      continue;
    }
    if (isUsed(row)) {
      const kept = { ...row, seedId: `${row.seedId}@${row.id}` };
      out.push(kept);
      retired.push(kept);
    } else {
      removed.push(row);
    }
    // A template dated in the past would end at once and roll again on every
    // read; one live instance per template is all the tour needs.
    if (live.has(row.seedId) || hasEnded(template, now)) continue;
    const next = { ...template, ...extra(template, row), id: newId(), rolledFrom: row.id };
    out.push(next);
    created.push(next);
    live.add(row.seedId);
  }

  if (!created.length && !retired.length && !removed.length) return { rows, created, retired, removed };
  return { rows: out, created, retired, removed };
}

/**
 * The schedule of a server-side test's successor:
 *   • an open window reopens now, for the same length of window;
 *   • a fixed sitting moves on by whole weeks, keeping its weekday and time,
 *     to the first slot at least a day away.
 * `scheduledAt` is written as the date in India Standard Time, which is how
 * the server reads a row's wall-clock strings (lib/testWindow.js).
 */
export function successorSchedule(test, now = Date.now()) {
  if (isWindowTest(test)) {
    const length = Math.max(DAY_MS, (test.windowClosesAtMs || 0) - (test.windowOpensAtMs || 0));
    return { windowOpensAtMs: now, windowClosesAtMs: now + length, scheduledAtMs: now };
  }
  let start = testStartMs({ ...test, startedAt: null }, { serverSide: true }) ?? now;
  while (start < now + DAY_MS) start += 7 * DAY_MS;
  return { scheduledAtMs: start, scheduledAt: new Date(start + IST_MS).toISOString().slice(0, 10) };
}
