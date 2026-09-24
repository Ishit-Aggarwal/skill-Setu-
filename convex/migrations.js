import { internalMutation, internalQuery } from "./_generated/server";
import { isAyushSystem } from "../lib/ayush";
import { resolveInstitutionIdForName } from "../lib/institutionKey";
import { notifyCertificate, uniqueVerifyCode } from "./_lib/certificates";

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

/**
 * Verification codes must be unique (certificate numbers need not be).
 * Codes were once drawn without checking for a clash; these two find and
 * repair any that collided.
 *
 *   npx convex run migrations:findDuplicateVerifyCodes     (read-only report)
 *   npx convex run migrations:fixDuplicateVerifyCodes      (then --prod if the count > 0)
 */
async function duplicateGroups(ctx) {
  const rows = await ctx.db.query("credentials").collect();
  const byCode = new Map();
  for (const r of rows) {
    if (!r.verifyCode) continue;
    if (!byCode.has(r.verifyCode)) byCode.set(r.verifyCode, []);
    byCode.get(r.verifyCode).push(r);
  }
  return [...byCode.entries()].filter(([, list]) => list.length > 1).map(([code, list]) => ({ code, rows: list.sort((a, b) => String(a.issuedAt).localeCompare(String(b.issuedAt))) }));
}

export const findDuplicateVerifyCodes = internalQuery({
  handler: async (ctx) => {
    const groups = await duplicateGroups(ctx);
    return {
      duplicateCodes: groups.length,
      certificatesAffected: groups.reduce((n, g) => n + g.rows.length - 1, 0),
      pairs: groups.map((g) => ({ code: g.code, certificates: g.rows.map((r) => ({ id: r.id, studentId: r.studentId, title: r.title, issuedAt: r.issuedAt })) })),
    };
  },
});

export const fixDuplicateVerifyCodes = internalMutation({
  handler: async (ctx) => {
    const groups = await duplicateGroups(ctx);
    let reassigned = 0;
    for (const g of groups) {
      // The oldest certificate keeps the code it was printed with first.
      for (const row of g.rows.slice(1)) {
        const code = await uniqueVerifyCode(ctx);
        await ctx.db.patch(row._id, { verifyCode: code, snapshot: row.snapshot ? { ...row.snapshot, verifyCode: code } : row.snapshot, updatedAt: new Date().toISOString() });
        await notifyCertificate(ctx, { ...row, verifyCode: code }, "certificate_code_changed");
        reassigned += 1;
      }
    }
    return { reassigned };
  },
});
