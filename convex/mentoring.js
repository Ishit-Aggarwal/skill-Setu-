import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, publicUser, requireActor } from "./_lib/authz";
import { findByClientId, nowIso, publicRow, upsertByClientId } from "./_lib/rows";
import { findUserById } from "./_lib/tests";

/**
 * Mentorship requests, private mentor notes and the advisee list.
 *
 * The one rule that matters most here: a mentor's note about a student is the
 * mentor's. `myNotes` returns rows where `facultyId` is the caller; a student
 * calling it with their own token gets nothing, and there is no query that
 * takes a facultyId from the request.
 */

const FACULTY_ROLES = ["academician", "institution", "industry", "admin"];

function notificationId() {
  return `studentNotifications_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function notify(ctx, { recipientId, senderId, message, from }) {
  await ctx.db.insert("studentNotifications", {
    id: notificationId(),
    studentId: recipientId,
    senderId,
    message,
    from,
    sentAt: nowIso(),
    read: false,
    updatedAt: nowIso(),
  });
}

/* ---------------- requests ---------------- */

export const requestMentorship = mutation({
  args: { sessionToken: v.string(), id: v.string(), facultyId: v.string(), message: v.optional(v.string()), requestedAt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role !== "student") throw authError("Only a student can ask for a mentor.");
    const faculty = await findUserById(ctx, args.facultyId);
    if (!faculty || faculty.role !== "academician") throw new Error("That faculty member is not on Skill Setu.");

    if (await findByClientId(ctx, "mentorshipRequests", args.id)) return { ok: true };
    const pending = await ctx.db
      .query("mentorshipRequests")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .filter((q) => q.and(q.eq(q.field("facultyId"), faculty.id), q.eq(q.field("status"), "Pending")))
      .first();
    if (pending) return { ok: true, id: pending.id };

    const student = actor.user;
    const message = (args.message || "").trim();
    await ctx.db.insert("mentorshipRequests", {
      id: args.id,
      studentId: actor.id,
      studentName: student.name || "Student",
      studentDepartment: student.department || "",
      studentInstitution: student.institution || "",
      facultyId: faculty.id,
      facultyName: faculty.name || "Faculty",
      message,
      status: "Pending",
      requestedAt: args.requestedAt || nowIso(),
      updatedAt: nowIso(),
    });
    await notify(ctx, {
      recipientId: faculty.id,
      senderId: actor.id,
      from: student.name || "A student",
      message: `${student.name || "A student"}${student.department ? ` (${student.department})` : ""} has asked you to mentor them.${message ? ` "${message}"` : ""}`,
    });
    return { ok: true, id: args.id };
  },
});

export const setRequestStatus = mutation({
  args: { sessionToken: v.string(), id: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["Accepted", "Declined", "Pending"].includes(args.status)) throw new Error("Unrecognised request status.");
    const row = await findByClientId(ctx, "mentorshipRequests", args.id);
    if (!row) return { ok: false, reason: "NOT_FOUND" };
    if (row.facultyId !== actor.id && actor.role !== "admin") throw authError("Only the faculty member the request was sent to can answer it.");
    if (row.status === args.status) return { ok: true };

    await ctx.db.patch(row._id, { status: args.status, respondedAt: nowIso(), updatedAt: nowIso() });
    if (args.status !== "Pending") {
      await notify(ctx, {
        recipientId: row.studentId,
        senderId: actor.id,
        from: row.facultyName || actor.user.name || "Your institution",
        message:
          args.status === "Accepted"
            ? `${row.facultyName} accepted your mentorship request — you are now one of their mentees.`
            : `${row.facultyName} isn't able to take on a new mentee right now.`,
      });
    }
    return { ok: true };
  },
});

export const myRequests = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("mentorshipRequests")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .collect();
    return rows.map(publicRow);
  },
});

export const requestsForMe = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("mentorshipRequests")
      .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
      .collect();
    return rows.map(publicRow);
  },
});

/* ---------------- notes ---------------- */

export const saveNote = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.string()),
    studentId: v.string(),
    note: v.optional(v.string()),
    flag: v.optional(v.string()),
    recommendations: v.optional(v.array(v.any())),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!FACULTY_ROLES.includes(actor.role)) throw authError("Only a mentor can keep notes on a student.");

    const existing = await ctx.db
      .query("mentorNotes")
      .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .first();
    const patch = {};
    if (args.note !== undefined) patch.note = args.note;
    if (args.flag !== undefined) patch.flag = args.flag;
    if (args.recommendations !== undefined) patch.recommendations = args.recommendations;
    const updatedAt = args.updatedAt || nowIso();
    if (existing) {
      await ctx.db.patch(existing._id, { ...patch, updatedAt });
      return { ok: true, id: existing.id };
    }
    await ctx.db.insert("mentorNotes", { id: args.id, facultyId: actor.id, studentId: args.studentId, ...patch, updatedAt });
    return { ok: true, id: args.id };
  },
});

/** Faculty only — and only their own. */
export const myNotes = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!FACULTY_ROLES.includes(actor.role)) throw authError("Mentor notes are only visible to the mentor who wrote them.");
    const rows = await ctx.db
      .query("mentorNotes")
      .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
      .collect();
    return rows.map(publicRow);
  },
});

/* ---------------- advisees ---------------- */

export const addAdvisee = mutation({
  args: { sessionToken: v.string(), id: v.optional(v.string()), studentId: v.string(), since: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!FACULTY_ROLES.includes(actor.role)) throw authError("Only a mentor can add an advisee.");
    const existing = await ctx.db
      .query("advisees")
      .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .first();
    if (existing) return { ok: true };
    await ctx.db.insert("advisees", { id: args.id, facultyId: actor.id, studentId: args.studentId, since: args.since || nowIso(), updatedAt: nowIso() });
    return { ok: true };
  },
});

export const removeAdvisee = mutation({
  args: { sessionToken: v.string(), studentId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("advisees")
      .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return { ok: true };
  },
});

export const myAdvisees = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("advisees")
      .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
      .collect();
    const out = [];
    for (const row of rows) out.push({ ...publicRow(row), student: publicUser(await findUserById(ctx, row.studentId)) });
    return out;
  },
});

/** A student's mentors: the advisee rows naming them, joined to the faculty profile. */
export const myMentors = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("advisees")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .collect();
    const out = [];
    for (const row of rows) out.push({ ...publicRow(row), faculty: publicUser(await findUserById(ctx, row.facultyId)) });
    return out;
  },
});

/** Everything a mentor's pages read, in one request. */
export const myMentoring = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const isFaculty = FACULTY_ROLES.includes(actor.role);
    const [requestsAsStudent, requestsAsFaculty, adviseesAsFaculty, adviseesAsStudent, notes] = await Promise.all([
      ctx.db.query("mentorshipRequests").withIndex("by_student", (q) => q.eq("studentId", actor.id)).collect(),
      ctx.db.query("mentorshipRequests").withIndex("by_faculty", (q) => q.eq("facultyId", actor.id)).collect(),
      ctx.db.query("advisees").withIndex("by_faculty", (q) => q.eq("facultyId", actor.id)).collect(),
      ctx.db.query("advisees").withIndex("by_student", (q) => q.eq("studentId", actor.id)).collect(),
      isFaculty ? ctx.db.query("mentorNotes").withIndex("by_faculty", (q) => q.eq("facultyId", actor.id)).collect() : Promise.resolve([]),
    ]);
    return {
      requests: [...requestsAsStudent, ...requestsAsFaculty].map(publicRow),
      advisees: [...adviseesAsFaculty, ...adviseesAsStudent].map(publicRow),
      notes: notes.map(publicRow),
    };
  },
});
