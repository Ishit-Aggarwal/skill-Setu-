/**
 * How a posting's pay is stored and shown.
 *
 * A recruiter used to type the whole thing by hand — "₹18,000/mo" — which
 * meant the unit was a typing convention rather than data. Two people wrote
 * "/mo", "per month" and "monthly" for the same thing, filters had to parse
 * prose to find a number, and nobody could express "₹1,20,000 for the whole
 * six months" without it being read as a monthly figure.
 *
 * Now a posting carries a number and a mode. The recruiter enters 18000 and
 * picks "Per month" or "Total for the duration"; every screen renders the unit
 * from the mode, so it always reads the same way and always sorts correctly.
 */

export const STIPEND_MODES = [
  { key: "monthly", label: "Per month", hint: "Paid every month for the length of the internship." },
  { key: "total", label: "Total for the duration", hint: "One figure covering the whole internship." },
];

/** Indian digit grouping — 1,20,000 rather than 120,000. */
export function formatRupees(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Pulls a number out of a legacy hand-typed stipend string. Deliberately
 * conservative: "Unpaid" and "Negotiable" have no number and must stay
 * unparsed rather than becoming zero, which would sort them below every paid
 * role in a "₹15,000+" filter.
 */
export function parseLegacyStipend(value) {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : null;
}

/** The numeric value a stipend filter should compare against, or null. */
export function stipendAmountOf(posting) {
  if (posting?.stipendAmount != null && posting.stipendAmount !== "") {
    const n = Number(posting.stipendAmount);
    if (Number.isFinite(n)) return n;
  }
  return parseLegacyStipend(posting?.stipend);
}

/**
 * A monthly-equivalent figure, so a "₹25,000+ per month" filter can compare a
 * total-for-the-duration posting on the same scale instead of excluding it.
 */
export function monthlyEquivalent(posting) {
  const amount = stipendAmountOf(posting);
  if (amount == null) return null;
  if (posting?.stipendMode !== "total") return amount;
  const months = parseDurationMonths(posting?.duration);
  if (!months) return amount;
  return Math.round(amount / months);
}

export function parseDurationMonths(value) {
  const text = String(value || "").toLowerCase();
  const n = parseFloat(text);
  if (Number.isNaN(n) || n <= 0) return null;
  if (text.includes("week")) return n / 4.345;
  if (text.includes("year")) return n * 12;
  if (text.includes("day")) return n / 30;
  return n;
}

/**
 * What a student sees on the card. A total-mode posting is shown exactly as
 * the recruiter entered it — "₹1,20,000 total for 6 months" — and is never
 * silently divided into a monthly number, because a monthly number is a
 * different promise.
 */
export function formatStipend(posting) {
  const amount = stipendAmountOf(posting);
  if (amount == null) return posting?.stipend?.trim() || "Unpaid";

  const money = formatRupees(amount);
  if (posting?.stipendMode === "total") {
    const duration = String(posting?.duration || "").trim();
    return duration ? `${money} total for ${duration}` : `${money} total`;
  }
  return `${money}/month`;
}

/** The short form for tight spaces (dashboard tiles, table cells). */
export function formatStipendShort(posting) {
  const amount = stipendAmountOf(posting);
  if (amount == null) return posting?.stipend?.trim() || "Unpaid";
  const money = formatRupees(amount);
  return posting?.stipendMode === "total" ? `${money} total` : `${money}/mo`;
}
