/**
 * The conflict rule for a row that exists both on this device and on the
 * shared database.
 *
 * Every write stamps `updatedAt`; the later stamp wins the whole row. A row
 * that was never stamped loses to one that was, and a tie goes to the server
 * because the server's copy is the one every other device is reading.
 *
 * "Wins the whole row" means the winner's fields overwrite the loser's, field
 * by field; fields only the loser carries are kept, since they are usually
 * device-local extras (view counters, a resolved file URL) rather than
 * contradictions.
 */

const NEVER_COPIED = new Set(["_id", "_creationTime"]);

function stampOf(row) {
  const value = row?.updatedAt;
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function stripSystemFields(row) {
  const out = {};
  Object.entries(row || {}).forEach(([k, value]) => {
    if (NEVER_COPIED.has(k) || value === undefined) return;
    out[k] = value;
  });
  return out;
}

/** Which copy wins: "remote" or "local". */
export function pickWinner(local, remote) {
  const l = stampOf(local);
  const r = stampOf(remote);
  if (l == null && r == null) return "remote";
  if (l == null) return "remote";
  if (r == null) return "local";
  if (l > r) return "local";
  return "remote";
}

/**
 * Merges the server's copy into the local one.
 * Returns { row, changed } — `row` is a new object, `changed` says whether any
 * field of the local copy actually moved.
 */
export function mergeRow(local, remote) {
  const remoteFields = stripSystemFields(remote);
  if (!local) return { row: remoteFields, changed: true };

  const winner = pickWinner(local, remoteFields);
  const row = winner === "remote" ? { ...local, ...remoteFields } : { ...remoteFields, ...local };
  const changed = Object.keys(row).some((k) => JSON.stringify(row[k]) !== JSON.stringify(local[k]));
  return { row, changed };
}
