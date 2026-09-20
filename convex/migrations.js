import { internalMutation, internalQuery } from "./_generated/server";
import { isAyushSystem } from "../lib/ayush";

/**
 * One-time data migrations, run by hand from the CLI:
 *
 *   npx convex run migrations:flagNeedsRetagging
 *   npx convex run migrations:retagCounts
 *
 * Nothing here deletes a row. A record whose AYUSH system is missing, blank,
 * or not one of the five canonical slugs is flagged `needsRetagging` and left
 * for a human to tag from the banner on their own dashboard — the migration
 * never guesses which system a record belongs to.
 */

const TABLES = ["users", "skillTests", "internships"];

/** Only students and faculty carry an AYUSH system on the account itself. */
function applies(table, row) {
  if (table === "users") return row.role === "student" || row.role === "academician";
  return true;
}

export const flagNeedsRetagging = internalMutation({
  handler: async (ctx) => {
    const counts = {};
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect();
      let flagged = 0;
      let cleared = 0;
      for (const row of rows) {
        if (!applies(table, row)) continue;
        const valid = isAyushSystem(row.ayushSystem);
        if (valid && row.needsRetagging) {
          await ctx.db.patch(row._id, { needsRetagging: false });
          cleared += 1;
        } else if (!valid && !row.needsRetagging) {
          // The bad value is cleared rather than kept: nothing downstream may
          // treat "Homeopathy" or "" as a system.
          await ctx.db.patch(row._id, { needsRetagging: true, ayushSystem: undefined });
          flagged += 1;
        }
      }
      counts[table] = { scanned: rows.length, flagged, cleared };
    }
    return counts;
  },
});

export const retagCounts = internalQuery({
  handler: async (ctx) => {
    const counts = {};
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect();
      counts[table] = rows.filter((r) => applies(table, r) && !isAyushSystem(r.ayushSystem)).length;
    }
    return counts;
  },
});
