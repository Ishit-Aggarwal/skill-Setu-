import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor, resolveInstitutionId } from "./_lib/authz";
import { findByClientId, nowIso, publicRow } from "./_lib/rows";
import { findUserById } from "./_lib/tests";

/**
 * Inbox rows and the bulk-notify log.
 *
 * A notification is written for a recipient by an organisation, faculty or
 * institution account, or by a student asking a faculty member to mentor
 * them; nobody else can put something in somebody's inbox. Rows are read by
 * their recipient only — the "studentId" field is the recipient, and faculty
 * receive rows here too.
 */

const SENDER_ROLES = ["industry", "academician", "institution", "admin"];
const INBOX_CAP = 200;

function notificationId() {
  return `studentNotifications_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const send = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.string()),
    recipientId: v.string(),
    message: v.string(),
    from: v.string(),
    meta: v.optional(
      v.object({
        batchId: v.optional(v.union(v.string(), v.null())),
        testId: v.optional(v.union(v.string(), v.null())),
        credentialId: v.optional(v.union(v.string(), v.null())),
        slotId: v.optional(v.union(v.string(), v.null())),
        sentAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const recipient = await findUserById(ctx, args.recipientId);
    if (!recipient) return { ok: false, reason: "NO_RECIPIENT" };

    const studentToFaculty = actor.role === "student" && recipient.role === "academician";
    if (!SENDER_ROLES.includes(actor.role) && !studentToFaculty && recipient.id !== actor.id) {
      throw authError("You cannot send notifications to that account.");
    }

    const id = args.id || notificationId();
    const existing = await findByClientId(ctx, "studentNotifications", id);
    if (existing) return { ok: true, id };

    const meta = args.meta || {};
    await ctx.db.insert("studentNotifications", {
      id,
      studentId: recipient.id,
      senderId: actor.id,
      batchId: meta.batchId || null,
      testId: meta.testId || null,
      credentialId: meta.credentialId || null,
      slotId: meta.slotId || null,
      message: args.message,
      from: args.from,
      sentAt: meta.sentAt || nowIso(),
      read: false,
      updatedAt: nowIso(),
    });
    return { ok: true, id };
  },
});

/**
 * Bulk notify from an institution's roster. The batch row is the institution's
 * log; one inbox row per recipient. Recipients that are not on the shared
 * database (a roster placeholder that has not registered) are skipped and
 * counted, not failed.
 */
export const sendBatch = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.string()),
    recipientIds: v.array(v.string()),
    notificationIds: v.optional(v.array(v.string())),
    message: v.string(),
    from: v.string(),
    sentAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["institution", "admin"].includes(actor.role)) throw authError("Only an institution can notify a group of students.");

    const sentAt = args.sentAt || nowIso();
    const batchId = args.id || `notifyBatches_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const existing = await findByClientId(ctx, "notifyBatches", batchId);

    let delivered = 0;
    let skipped = 0;
    if (!existing) {
      const ownName = String(actor.user.instituteName || "").trim().toLowerCase();
      for (let i = 0; i < args.recipientIds.length; i += 1) {
        const recipient = await findUserById(ctx, args.recipientIds[i]);
        if (!recipient) {
          skipped += 1;
          continue;
        }
        const theirInstitution = recipient.institutionId || (await resolveInstitutionId(ctx, recipient));
        const sameName = ownName && String(recipient.institution || "").trim().toLowerCase() === ownName;
        if (theirInstitution !== actor.id && !sameName && actor.role !== "admin") {
          skipped += 1;
          continue;
        }
        const id = args.notificationIds?.[i] || notificationId();
        if (await findByClientId(ctx, "studentNotifications", id)) continue;
        await ctx.db.insert("studentNotifications", {
          id,
          studentId: recipient.id,
          senderId: actor.id,
          batchId,
          message: args.message,
          from: args.from,
          sentAt,
          read: false,
          updatedAt: nowIso(),
        });
        delivered += 1;
      }
      await ctx.db.insert("notifyBatches", {
        id: batchId,
        instituteName: actor.user.instituteName || "",
        institutionId: actor.id,
        recipients: args.recipientIds.length,
        message: args.message,
        from: args.from,
        sentAt,
        updatedAt: nowIso(),
      });
    }
    return { ok: true, id: batchId, delivered, skipped };
  },
});

export const markRead = mutation({
  args: { sessionToken: v.string(), ids: v.array(v.string()), readAt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const readAt = args.readAt || nowIso();
    let changed = 0;
    for (const id of args.ids) {
      const row = await findByClientId(ctx, "studentNotifications", id);
      if (!row || row.studentId !== actor.id) continue;
      if (row.read) continue;
      await ctx.db.patch(row._id, { read: true, readAt, updatedAt: nowIso() });
      changed += 1;
    }
    return { ok: true, changed };
  },
});

/** The recipient's inbox, newest first, capped. */
export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("studentNotifications")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .order("desc")
      .take(INBOX_CAP);
    return rows.map(publicRow).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  },
});

export const myBatches = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role !== "institution" && actor.role !== "admin") return [];
    const rows = await ctx.db
      .query("notifyBatches")
      .withIndex("by_institution", (q) => q.eq("institutionId", actor.id))
      .collect();
    return rows.map(publicRow);
  },
});
