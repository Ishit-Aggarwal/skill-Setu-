import { internalMutation, internalQuery } from "./_generated/server";
import { isAyushSystem } from "../lib/ayush";
import { resolveInstitutionIdForName } from "../lib/institutionKey";

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

/**
 * Institution rows used to be keyed by the institute's typed name. This
 * links each legacy row to the institution ACCOUNT that name resolves to
 * (lib/institutionKey.js rule: exact name match, trimmed, case-insensitive,
 * exactly one candidate). A row whose name matches nobody, or more than one
 * account, is flagged `needsOwner` for a human — never guessed.
 *
 *   npx convex run migrations:keyInstitutionRowsByAccount
 *   npx convex run migrations:keyInstitutionRowsByAccount --prod
 */
const INSTITUTION_TABLES = [
  "institutionProfiles",
  "institutionAdmins",
  "institutionDocs",
  "drives",
  "mous",
  "announcements",
  "placementHistory",
  "notifyBatches",
  "activityLog",
];

export const keyInstitutionRowsByAccount = internalMutation({
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "institution"))
      .collect();
    const counts = {};
    for (const table of INSTITUTION_TABLES) {
      const rows = await ctx.db.query(table).collect();
      let matched = 0;
      let needsOwner = 0;
      for (const row of rows) {
        if (row.institutionId) continue;
        const name = table === "activityLog" ? row.scope : row.instituteName;
        const institutionId = resolveInstitutionIdForName(name, accounts);
        if (institutionId) {
          await ctx.db.patch(row._id, { institutionId, needsOwner: false });
          matched += 1;
        } else if (!row.needsOwner) {
          await ctx.db.patch(row._id, { needsOwner: true });
          needsOwner += 1;
        }
      }
      counts[table] = { scanned: rows.length, matched, needsOwner };
    }
    return counts;
  },
});
