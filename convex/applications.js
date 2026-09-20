import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, canRead, requireActor } from "./_lib/authz";
import { computeMatch, checkEligibility } from "../lib/match";
import { stripRecruiterFields } from "../lib/authzRules";
import { findByClientId, nowIso, publicRow } from "./_lib/rows";

/**
 * Applications.
 *
 * Two things here are never taken from the client: who is applying, and how
 * good the match is. The student id comes from the session, and the match
 * percentage is recomputed from the assessment on file whenever the student
 * has one — a posted `match: 99` is ignored. A student whose scores were only
 * ever recorded on their own device (a sample profile) keeps the figure that
 * device computed, marked `matchSource: "device"` so a reviewer can tell.
 *
 * Recruiter-only fields (notes, interview slot, rejection reason, offer notes)
 * are stripped from anything a student reads.
 */

const ALL_STATUSES = ["Applied", "Shortlisted", "Interview", "Hired", "Rejected", "Withdrawn"];
const OFFER_STAGES = ["Not sent", "Offer sent", "Offer accepted", "Offer declined", "Joined"];
const RECRUITER_FIELDS = ["interviewMode", "interviewAt", "recruiterNotes", "rejectionReason", "feedback", "offerStage", "offerUpdatedAt", "offerSentAt", "offerAmount", "offerNotes", "joiningDate"];

async function internshipFor(ctx, internshipId) {
  const byCustom = await ctx.db
    .query("internships")
    .filter((q) => q.eq(q.field("id"), internshipId))
    .first();
  if (byCustom) return byCustom;
  try {
    return await ctx.db.get(internshipId);
  } catch {
    return null;
  }
}

async function assessmentFor(ctx, studentId) {
  return await ctx.db
    .query("assessments")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .first();
}

async function withResumeUrl(ctx, row) {
  if (!row) return row;
  let resumeUrl = row.resumeUrl || null;
  if (row.resumeStorageId) {
    try {
      resumeUrl = await ctx.storage.getUrl(row.resumeStorageId);
    } catch {
      resumeUrl = null;
    }
  }
  return { ...publicRow(row), resumeUrl };
}

/** What a student is shown of their own application. */
async function forStudent(ctx, row) {
  return stripRecruiterFields(await withResumeUrl(ctx, row));
}

/** Everything about a posting's own applications, for the account that posted it. */
async function applicationsForOwner(ctx, ownerId) {
  const mine = await ctx.db
    .query("internships")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const rows = [];
  for (const internship of mine) {
    if (!internship.id) continue;
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", internship.id))
      .collect();
    rows.push(...apps);
  }
  return rows;
}

/** Applications you are entitled to see: your own, or ones against your postings. */
export const listAll = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role === "student") {
      const rows = await ctx.db
        .query("applications")
        .withIndex("by_student", (q) => q.eq("studentId", actor.id))
        .collect();
      const out = [];
      for (const row of rows) out.push(await forStudent(ctx, row));
      return out;
    }
    const out = [];
    for (const row of await applicationsForOwner(ctx, actor.id)) out.push(await withResumeUrl(ctx, row));
    return out;
  },
});

export const listForStudent = query({
  args: { sessionToken: v.string(), studentId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const studentId = args.studentId || actor.id;
    if (studentId !== actor.id && !["institution", "academician", "admin"].includes(actor.role)) {
      throw authError("You can only read your own applications.");
    }
    const rows = await ctx.db
      .query("applications")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();
    const out = [];
    for (const row of rows) out.push(await forStudent(ctx, row));
    return out;
  },
});

export const listForInternship = query({
  args: { sessionToken: v.string(), internshipId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const internship = await internshipFor(ctx, args.internshipId);
    if (!internship) return [];
    const rows = await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", args.internshipId))
      .collect();
    const out = [];
    for (const row of rows) {
      if (!(await canRead(ctx, actor, "applications", row))) continue;
      out.push(row.studentId === actor.id ? await forStudent(ctx, row) : await withResumeUrl(ctx, row));
    }
    if (!out.length && rows.length && internship.ownerId !== actor.id && actor.role !== "admin") {
      throw authError("Only the account that posted this role can see its applicants.");
    }
    return out;
  },
});

/**
 * Apply. The applicant is the session's own account. `id` is the browser's
 * own record id (the row is written locally first and mirrored here), so a
 * retry updates rather than duplicates.
 */
export const apply = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.string()),
    internshipId: v.string(),
    note: v.optional(v.string()),
    match: v.optional(v.number()),
    appliedAt: v.optional(v.string()),
    resumeFileName: v.optional(v.string()),
    resumeStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    resumeMimeType: v.optional(v.string()),
    studentDepartment: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role !== "student") throw authError("Only student accounts can apply to a posting.");

    const internship = await internshipFor(ctx, args.internshipId);
    if (!internship) throw new Error("That posting no longer exists.");

    const byClientId = args.id ? await findByClientId(ctx, "applications", args.id) : null;
    const existing =
      byClientId ||
      (await ctx.db
        .query("applications")
        .withIndex("by_internship", (q) => q.eq("internshipId", args.internshipId))
        .filter((q) => q.eq(q.field("studentId"), actor.id))
        .first());
    if (existing) {
      if (existing.studentId !== actor.id) throw authError("That application is not yours.");
      return existing.id || existing._id;
    }
    if (internship.status === "Closed") throw new Error("Applications for this posting are closed.");

    const assessment = await assessmentFor(ctx, actor.id);
    if (assessment) {
      const eligibility = checkEligibility(internship, actor.user, assessment);
      if (!eligibility.eligible) {
        throw new Error(`You do not meet the criteria for this posting: ${eligibility.reasons.join(" ")}`);
      }
    }

    const now = nowIso();
    const appliedAt = args.appliedAt || now;
    const id = args.id || `applications_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await ctx.db.insert("applications", {
      id,
      internshipId: args.internshipId,
      internshipTitle: internship.title,
      company: internship.company,
      studentId: actor.id,
      studentName: actor.user.name || "Student",
      studentInstitution: actor.user.institution,
      studentCourse: actor.user.course,
      studentYear: actor.user.year,
      studentDepartment: args.studentDepartment || actor.user.department,
      note: args.note,
      match: assessment ? computeMatch(internship, assessment) : Math.max(0, Math.min(100, Math.round(args.match ?? 0))),
      matchSource: assessment ? "server" : "device",
      status: "Applied",
      appliedAt,
      statusHistory: [{ status: "Applied", at: appliedAt }],
      resumeFileName: args.resumeFileName,
      resumeStorageId: args.resumeStorageId || null,
      resumeMimeType: args.resumeMimeType,
      updatedAt: args.updatedAt || now,
    });
    return id;
  },
});

async function requireApplicationOwner(ctx, actor, application, what) {
  const internship = await internshipFor(ctx, application.internshipId);
  if (actor.role === "admin") return internship;
  if (internship && internship.ownerId === actor.id) return internship;
  throw authError(`Only the account that posted this role can ${what}.`);
}

/**
 * Move an application through the pipeline.
 *
 * The check is ownership of the specific posting, not "is some industry
 * account calling" — a recruiter at one company cannot mark a candidate hired
 * on another company's role. A student may withdraw their own, and nothing else.
 */
async function applyStatus(ctx, actor, application, status, extra = {}) {
  if (!ALL_STATUSES.includes(status)) throw new Error("Unrecognised application status.");
  if (actor.role === "student") {
    if (application.studentId !== actor.id) throw authError("That is not your application.");
    if (status !== "Withdrawn") throw authError("You can only withdraw your own application.");
  } else {
    await requireApplicationOwner(ctx, actor, application, "change its applications");
  }
  const now = nowIso();
  const history = Array.isArray(extra.statusHistory)
    ? extra.statusHistory
    : [...(application.statusHistory || []), { status, at: now, ...(extra.rejectionReason ? { note: extra.rejectionReason } : {}) }];
  const patch = { status, statusHistory: history, updatedAt: extra.updatedAt || now };
  if (status === "Rejected") {
    patch.rejectedAt = extra.rejectedAt || now;
    if (extra.rejectionReason !== undefined) patch.rejectionReason = extra.rejectionReason;
  } else if (application.rejectionReason) {
    patch.rejectionReason = null;
    patch.rejectedAt = null;
  }
  await ctx.db.patch(application._id, patch);
  return await ctx.db.get(application._id);
}

export const updateStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("applications"),
    status: v.string(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const application = await ctx.db.get(args.id);
    if (!application) throw new Error("That application no longer exists.");
    return publicRow(await applyStatus(ctx, actor, application, args.status, { rejectionReason: args.rejectionReason }));
  },
});

/** Same as `updateStatus`, addressed by the browser's record id. */
export const updateStatusByClientId = mutation({
  args: {
    sessionToken: v.string(),
    id: v.string(),
    status: v.string(),
    rejectionReason: v.optional(v.union(v.string(), v.null())),
    statusHistory: v.optional(v.array(v.any())),
    rejectedAt: v.optional(v.union(v.string(), v.null())),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const application = await findByClientId(ctx, "applications", args.id);
    if (!application) return { ok: false, reason: "NOT_FOUND" };
    const { sessionToken, id, status, ...extra } = args;
    await applyStatus(ctx, actor, application, status, extra);
    return { ok: true };
  },
});

/**
 * Recruiter-private fields and offer tracking. Same ownership rule; the
 * student never reads the private ones back (see `forStudent`).
 */
export const updateRecruiterFields = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("applications"),
    interviewMode: v.optional(v.string()),
    interviewAt: v.optional(v.string()),
    recruiterNotes: v.optional(v.string()),
    offerStage: v.optional(v.string()),
    offerUpdatedAt: v.optional(v.string()),
    offerAmount: v.optional(v.string()),
    offerNotes: v.optional(v.string()),
    joiningDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const application = await ctx.db.get(args.id);
    if (!application) throw new Error("That application no longer exists.");
    await requireApplicationOwner(ctx, actor, application, "edit its interview details");
    const { sessionToken, id, ...patch } = args;
    if (patch.offerStage && !OFFER_STAGES.includes(patch.offerStage)) throw new Error("Unrecognised offer stage.");
    await ctx.db.patch(args.id, { ...patch, updatedAt: nowIso() });
    return publicRow(await ctx.db.get(args.id));
  },
});

/** Same, addressed by the browser's record id; accepts the full recruiter field set. */
export const updateRecruiterFieldsByClientId = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const application = await findByClientId(ctx, "applications", args.id);
    if (!application) return { ok: false, reason: "NOT_FOUND" };
    await requireApplicationOwner(ctx, actor, application, "edit its interview details");
    const safe = {};
    Object.entries(args.patch || {}).forEach(([k, value]) => {
      if (RECRUITER_FIELDS.includes(k) || k === "statusHistory") safe[k] = value;
    });
    if (safe.offerStage && !OFFER_STAGES.includes(safe.offerStage)) throw new Error("Unrecognised offer stage.");
    if (!Object.keys(safe).length) return { ok: true, ignored: true };
    await ctx.db.patch(application._id, { ...safe, updatedAt: args.patch?.updatedAt || nowIso() });
    return { ok: true };
  },
});
