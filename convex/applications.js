import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { computeMatch, checkEligibility } from "../lib/match";

/**
 * Applications.
 *
 * Two things here are never taken from the client: who is applying, and how
 * good the match is. The student id comes from the session, and the match
 * percentage is recomputed from the assessment on file every time it is
 * written or read back — a posted `match: 99` is ignored.
 */

const ALL_STATUSES = ["Applied", "Shortlisted", "Interview", "Hired", "Rejected", "Withdrawn"];

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

/** Applications you are entitled to see: your own, or ones against your postings. */
export const listAll = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (["institution", "admin"].includes(actor.role)) {
      return await ctx.db.query("applications").collect();
    }
    if (actor.role === "student") {
      return await ctx.db
        .query("applications")
        .withIndex("by_student", (q) => q.eq("studentId", actor.id))
        .collect();
    }
    const mine = await ctx.db
      .query("internships")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .collect();
    const ids = new Set(mine.map((i) => i.id).filter(Boolean));
    const all = await ctx.db.query("applications").collect();
    return all.filter((a) => ids.has(a.internshipId));
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
    return await ctx.db
      .query("applications")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();
  },
});

export const listForInternship = query({
  args: { sessionToken: v.string(), internshipId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const internship = await internshipFor(ctx, args.internshipId);
    if (!internship) return [];
    if (internship.ownerId !== actor.id && !["institution", "admin"].includes(actor.role)) {
      throw authError("Only the account that posted this role can see its applicants.");
    }
    return await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", args.internshipId))
      .collect();
  },
});

/**
 * Apply. The applicant is the session's own account; eligibility and match are
 * both decided here against the posting's stated criteria and the student's
 * assessment, so neither can be talked past from the browser.
 */
export const apply = mutation({
  args: {
    sessionToken: v.string(),
    internshipId: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role !== "student") throw authError("Only student accounts can apply to a posting.");

    const internship = await internshipFor(ctx, args.internshipId);
    if (!internship) throw new Error("That posting no longer exists.");
    if (internship.status === "Closed") throw new Error("Applications for this posting are closed.");

    const assessment = await assessmentFor(ctx, actor.id);
    const eligibility = checkEligibility(internship, actor.user, assessment);
    if (!eligibility.eligible) {
      throw new Error(`You do not meet the criteria for this posting: ${eligibility.reasons.join(" ")}`);
    }

    const existing = await ctx.db
      .query("applications")
      .withIndex("by_internship", (q) => q.eq("internshipId", args.internshipId))
      .filter((q) => q.eq(q.field("studentId"), actor.id))
      .first();
    if (existing) return existing._id;

    const now = new Date().toISOString();
    return await ctx.db.insert("applications", {
      internshipId: args.internshipId,
      internshipTitle: internship.title,
      company: internship.company,
      studentId: actor.id,
      studentName: actor.user.name || "Student",
      studentInstitution: actor.user.institution,
      studentCourse: actor.user.course,
      studentYear: actor.user.year,
      note: args.note,
      // Recomputed here, never accepted from the caller.
      match: computeMatch(internship, assessment),
      status: "Applied",
      appliedAt: now,
      statusHistory: [{ status: "Applied", at: now }],
    });
  },
});

/**
 * Move an application through the pipeline.
 *
 * The check is ownership of the specific posting, not "is some industry
 * account calling" — a recruiter at one company cannot mark a candidate hired
 * on another company's role.
 */
export const updateStatus = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("applications"),
    status: v.string(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!ALL_STATUSES.includes(args.status)) throw new Error("Unrecognised application status.");

    const application = await ctx.db.get(args.id);
    if (!application) throw new Error("That application no longer exists.");

    const internship = await internshipFor(ctx, application.internshipId);

    // A student may withdraw their own application, and nothing else.
    if (actor.role === "student") {
      if (application.studentId !== actor.id) throw authError("That is not your application.");
      if (args.status !== "Withdrawn") throw authError("You can only withdraw your own application.");
    } else if (actor.role !== "admin") {
      if (!internship || internship.ownerId !== actor.id) {
        throw authError("Only the account that posted this role can change its applications.");
      }
    }

    const history = [...(application.statusHistory || []), { status: args.status, at: new Date().toISOString() }];
    const patch = { status: args.status, statusHistory: history };
    if (args.status === "Rejected" && args.rejectionReason) patch.rejectionReason = args.rejectionReason;
    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

/** Recruiter-private fields. Same ownership rule; never visible to the student. */
export const updateRecruiterFields = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("applications"),
    interviewMode: v.optional(v.string()),
    interviewAt: v.optional(v.string()),
    recruiterNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const application = await ctx.db.get(args.id);
    if (!application) throw new Error("That application no longer exists.");

    const internship = await internshipFor(ctx, application.internshipId);
    if (actor.role !== "admin" && (!internship || internship.ownerId !== actor.id)) {
      throw authError("Only the account that posted this role can edit its interview details.");
    }

    const { sessionToken, id, ...patch } = args;
    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});
