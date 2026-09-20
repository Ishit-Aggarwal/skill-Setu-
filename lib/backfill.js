"use client";

/**
 * Pushing a returning user's pre-migration rows to the shared database.
 *
 * Real accounts wrote drives, notes, saved postings and the rest into their
 * browser before any of it was mirrored. The first time each collection is
 * pulled successfully after the upgrade, every local row that belongs to the
 * signed-in account and that the server has never heard of is pushed through
 * the collection's ordinary `create` mirror, once. A flag per collection per
 * account stops it running twice; a failed push leaves the flag unset so the
 * next pull retries.
 *
 * Never runs in demo mode, never touches `users`, never pushes seed rows.
 */

import { isDemoId, isMirrorable, rowOwnerId } from "./demoIsolation";
import { normaliseInstitutionName } from "./institutionKey";

const FLAG_PREFIX = "ayusetu:backfill:";

/** Institution tables were keyed by name before the migration. */
const INSTITUTION_TABLES = new Set([
  "institutionProfiles",
  "institutionAdmins",
  "institutionDocs",
  "drives",
  "mous",
  "announcements",
  "placementHistory",
  "notifyBatches",
  "activityLog",
]);

/**
 * The pure selector: which of `rows` should be pushed.
 *
 * @param rows        every local row of the collection
 * @param options.collection
 * @param options.ownerId      the signed-in account's id
 * @param options.ownerName    for institution tables: the account's institute name (legacy rows carry only that)
 * @param options.serverIds    ids the server's list already contained
 * @param options.demoMode     true → nothing is selected
 * @param options.parentOwnerFor  child rows: row → parent's owner id
 */
export function selectBackfillRows(rows, { collection, ownerId, ownerName, serverIds, demoMode = false, parentOwnerFor } = {}) {
  if (demoMode || !ownerId || isDemoId(ownerId)) return [];
  if (collection === "users") return [];
  const known = new Set(serverIds || []);
  const legacyName = normaliseInstitutionName(ownerName);

  return (rows || []).filter((row) => {
    if (!row?.id || known.has(row.id)) return false;
    const parentOwnerId = parentOwnerFor ? parentOwnerFor(row) : undefined;
    if (!isMirrorable(collection, row, parentOwnerId)) {
      // A legacy institution row has no institutionId yet; its name is the key.
      if (INSTITUTION_TABLES.has(collection) && !row.institutionId && legacyName) {
        const rowName = normaliseInstitutionName(row.instituteName || row.scope);
        return rowName === legacyName;
      }
      return false;
    }
    const owner = rowOwnerId(collection, row, parentOwnerId);
    return owner === ownerId;
  });
}

function flagKey(collection, ownerId) {
  return `${FLAG_PREFIX}${collection}:${ownerId}`;
}

export function isBackfilled(collection, ownerId) {
  if (typeof window === "undefined") return true;
  try {
    return Boolean(window.localStorage.getItem(flagKey(collection, ownerId)));
  } catch {
    return true;
  }
}

function markBackfilled(collection, ownerId) {
  try {
    window.localStorage.setItem(flagKey(collection, ownerId), new Date().toISOString());
  } catch {
    /* private browsing — it will simply run again next time */
  }
}

/**
 * Runs the backfill for one collection. `pushRow(row)` is the collection's
 * mirror `create`; it resolves true on success. The flag is only set when every
 * selected row was accepted, so a partial failure is retried next pull.
 */
export async function backfillCollection(collection, { ownerId, ownerName, rows, serverIds, demoMode, pushRow, parentOwnerFor } = {}) {
  if (typeof window === "undefined" || demoMode || !ownerId) return { pushed: 0, failed: 0, skipped: true };
  if (isBackfilled(collection, ownerId)) return { pushed: 0, failed: 0, skipped: true };

  const selected = selectBackfillRows(rows, { collection, ownerId, ownerName, serverIds, demoMode, parentOwnerFor });
  let pushed = 0;
  let failed = 0;
  for (const row of selected) {
    try {
      const ok = await pushRow(row);
      if (ok === false) failed += 1;
      else pushed += 1;
    } catch {
      failed += 1;
    }
  }
  if (!failed) markBackfilled(collection, ownerId);
  if (pushed) console.info(`[backfill] ${collection}: pushed ${pushed} row(s) from this device to the shared database.`);
  return { pushed, failed, skipped: false };
}
