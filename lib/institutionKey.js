/**
 * Which institution account a person belongs to.
 *
 * Institution data used to be keyed by the institute's *name*, typed by hand
 * at signup. Two colleges spelling the same name would have shared a roster,
 * and a college that corrected its name lost every drive and MOU it had ever
 * created. The key is now the institution account's id (`institutionId`), and
 * this file is the one place that turns a student or faculty account into
 * that id.
 *
 * Pure functions, shared by the browser and the Convex functions.
 */

/** Names compare trimmed and case-insensitively, nothing cleverer. */
export function normaliseInstitutionName(value) {
  return String(value || "").trim().toLowerCase();
}

/** The name a student or faculty account carries for its institution. */
export function institutionNameOf(user) {
  if (!user) return "";
  return user.institution || user.instituteName || "";
}

/**
 * Picks the institution account for a student or faculty member from the
 * institution accounts on record.
 *
 *   - match by name (`instituteName === user.institution`), or by AISHE id
 *     (`instituteId === user.instituteId`) when the student has one;
 *   - two matches → prefer the one whose AISHE id also matches;
 *   - still ambiguous → null. Fail closed: nothing is readable rather than
 *     something being readable by the wrong college.
 *
 * Returns { account, ambiguous } so a caller can tell "no institution" from
 * "two institutions".
 */
export function resolveInstitutionAccount(user, institutionAccounts) {
  const accounts = (institutionAccounts || []).filter((a) => a && a.role === "institution");
  if (!user || !accounts.length) return { account: null, ambiguous: false };

  const name = normaliseInstitutionName(institutionNameOf(user));
  const aishe = String(user.instituteId || "").trim().toLowerCase();

  const matches = accounts.filter((a) => {
    const byName = name && normaliseInstitutionName(a.instituteName) === name;
    const byAishe = aishe && String(a.instituteId || "").trim().toLowerCase() === aishe;
    return byName || byAishe;
  });

  if (matches.length === 0) return { account: null, ambiguous: false };
  if (matches.length === 1) return { account: matches[0], ambiguous: false };

  const exact = matches.filter((a) => aishe && String(a.instituteId || "").trim().toLowerCase() === aishe);
  if (exact.length === 1) return { account: exact[0], ambiguous: false };
  return { account: null, ambiguous: true };
}

/** Convenience: just the id, or null. */
export function resolveInstitutionId(user, institutionAccounts) {
  if (user?.role === "institution") return user.id || null;
  return resolveInstitutionAccount(user, institutionAccounts).account?.id || null;
}

/**
 * The institution account that a legacy row (keyed only by `instituteName`)
 * belongs to — the rule the one-time backfill migration applies.
 */
export function resolveInstitutionIdForName(instituteName, institutionAccounts) {
  const name = normaliseInstitutionName(instituteName);
  if (!name) return null;
  const matches = (institutionAccounts || []).filter(
    (a) => a && a.role === "institution" && normaliseInstitutionName(a.instituteName) === name
  );
  return matches.length === 1 ? matches[0].id || null : null;
}
