import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, publicUser, requireActor } from "./_lib/authz";
import { gradeSubmission, publicQuestionsFor, questionCountFor } from "./_lib/questionBank";
import { SKILL_DOMAINS } from "../lib/questionBank";

/**
 * Skill tests and their marking.
 *
 * The score is computed here, from the answer key the browser never receives.
 * Nothing in this file accepts a score from a client: `submitAttempt` takes
 * answers, and `recordOfflineResult` takes a mark that only the account hosting
 * that test is allowed to enter.
 */

const TEST_WEIGHT = { Online: 1, Offline: 1.5 };

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("skillTests").collect();
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const byCustomId = await ctx.db
      .query("skillTests")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (byCustomId) return byCustomId;
    try {
      return await ctx.db.get(args.id);
    } catch {
      return null;
    }
  },
});

export const listRegistrationsForUser = query({
  args: { userId: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    // Your own registrations, or anyone's if you are staff.
    if (actor.id !== args.userId && !["institution", "academician", "industry", "admin"].includes(actor.role)) {
      throw authError("You can only read your own registrations.");
    }
    return await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Register for a test. The registration is always written for the signed-in
 * account — the caller cannot register somebody else.
 */
export const register = mutation({
  args: {
    sessionToken: v.string(),
    testId: v.string(),
    slot: v.optional(v.string()),
    paid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);

    const existing = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .filter((q) => q.eq(q.field("userId"), actor.id))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("skillTestRegistrations", {
      testId: args.testId,
      userId: actor.id,
      slot: args.slot,
      paid: args.paid,
      paymentStatus: args.paid ? "paid" : "not_required",
      missedRecorded: false,
      attended: false,
      registeredAt: new Date().toISOString(),
    });
  },
});

/* ============================================================
   Taking a test
   ============================================================ */

/**
 * The paper, with the answer key removed. Requires a session so an anonymous
 * caller cannot harvest the bank, and returns nothing for a domain that has no
 * questions rather than an empty test the student can "pass".
 */
export const getQuestions = query({
  args: { sessionToken: v.string(), domain: v.string() },
  handler: async (ctx, args) => {
    await requireActor(ctx, args.sessionToken);
    if (!SKILL_DOMAINS.includes(args.domain)) {
      return { ok: false, error: `"${args.domain}" is not a graded skill domain.` };
    }
    const questions = publicQuestionsFor(args.domain);
    if (!questions.length) {
      return { ok: false, error: "This test has no question paper yet." };
    }
    return { ok: true, domain: args.domain, total: questions.length, questions };
  },
});

/** Recomputes a student's domain averages and overall score from their attempts. */
async function recalculateAssessment(ctx, studentId) {
  const attempts = await ctx.db
    .query("assessmentAttempts")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();

  const byDomain = {};
  attempts.forEach((a) => {
    const w = a.weight || 1;
    if (!byDomain[a.domain]) byDomain[a.domain] = { sum: 0, weight: 0 };
    byDomain[a.domain].sum += a.score * w;
    byDomain[a.domain].weight += w;
  });

  const domainScores = {};
  Object.entries(byDomain).forEach(([d, { sum, weight }]) => {
    domainScores[d] = Math.round(sum / weight);
  });

  const values = Object.values(domainScores);
  const overallScore = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const strongTags = Object.entries(domainScores).filter(([, s]) => s >= 70).map(([d]) => d);

  const existing = await ctx.db
    .query("assessments")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .first();

  const record = { domainScores, overallScore, strongTags, updatedAt: new Date().toISOString() };
  if (existing) await ctx.db.patch(existing._id, record);
  else await ctx.db.insert("assessments", { studentId, ...record });

  return record;
}

async function writeAttempt(ctx, studentId, attempt) {
  const existing = await ctx.db
    .query("assessmentAttempts")
    .withIndex("by_student_test", (q) => q.eq("studentId", studentId).eq("testId", attempt.testId))
    .first();

  if (existing) await ctx.db.patch(existing._id, { ...attempt, completedAt: new Date().toISOString() });
  else await ctx.db.insert("assessmentAttempts", { studentId, ...attempt, completedAt: new Date().toISOString() });
}

/**
 * Marks a submitted paper.
 *
 * Takes answers, never a score. The attempt is recorded against the session's
 * own account, so one student cannot post a result for another.
 */
export const submitAttempt = mutation({
  args: {
    sessionToken: v.string(),
    testId: v.string(),
    domain: v.string(),
    answers: v.array(v.union(v.number(), v.null())),
    mode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);

    if (!SKILL_DOMAINS.includes(args.domain)) {
      throw new Error(`"${args.domain}" is not a graded skill domain.`);
    }
    const expected = questionCountFor(args.domain);
    if (args.answers.length !== expected) {
      throw new Error(`Expected ${expected} answers for this paper, received ${args.answers.length}.`);
    }

    const result = gradeSubmission(args.domain, args.answers);
    if (!result) throw new Error("This test has no question paper yet.");

    const weight = TEST_WEIGHT[args.mode] || TEST_WEIGHT.Online;
    await writeAttempt(ctx, actor.id, {
      testId: args.testId,
      domain: args.domain,
      score: result.score,
      weight,
      missed: false,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      breakdown: result.breakdown,
      gradedBy: "server",
    });

    const registration = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .filter((q) => q.eq(q.field("userId"), actor.id))
      .first();
    if (registration) await ctx.db.patch(registration._id, { attended: true, missedRecorded: true });

    const assessment = await recalculateAssessment(ctx, actor.id);

    return {
      ok: true,
      score: result.score,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      breakdown: result.breakdown,
      weight,
      assessment,
    };
  },
});

/**
 * An in-person test has no paper to mark here, so its result is entered by the
 * account that hosts the test — never self-reported by the candidate. Before
 * this existed, "Mark as Attended" awarded a flat 85% to everybody.
 */
export const recordOfflineResult = mutation({
  args: {
    sessionToken: v.string(),
    testId: v.string(),
    studentId: v.string(),
    domain: v.string(),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);

    const test = await ctx.db
      .query("skillTests")
      .filter((q) => q.eq(q.field("id"), args.testId))
      .first();
    // The test row may only exist in the host's own workspace; in that case
    // only a hosting role may enter results at all.
    if (test) {
      if (test.ownerId !== actor.id && actor.role !== "admin") {
        throw authError("Only the account hosting this test can record its results.");
      }
    } else if (!["industry", "institution", "academician", "admin"].includes(actor.role)) {
      throw authError("Only a test host can record results.");
    }

    const score = Math.max(0, Math.min(100, Math.round(args.score)));
    await writeAttempt(ctx, args.studentId, {
      testId: args.testId,
      domain: args.domain,
      score,
      weight: TEST_WEIGHT.Offline,
      missed: false,
      gradedBy: `host:${actor.id}`,
    });
    const assessment = await recalculateAssessment(ctx, args.studentId);
    return { ok: true, score, assessment };
  },
});

/** A registration whose test came and went with no submission scores zero. */
export const recordMissed = mutation({
  args: { sessionToken: v.string(), testId: v.string(), domain: v.string(), mode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    await writeAttempt(ctx, actor.id, {
      testId: args.testId,
      domain: args.domain,
      score: 0,
      weight: TEST_WEIGHT[args.mode] || 1,
      missed: true,
      gradedBy: "server",
    });
    const registration = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .filter((q) => q.eq(q.field("userId"), actor.id))
      .first();
    if (registration) await ctx.db.patch(registration._id, { missedRecorded: true });
    await recalculateAssessment(ctx, actor.id);
    return { ok: true };
  },
});

/* ============================================================
   Reading results
   ============================================================ */

export const attemptsForStudent = query({
  args: { sessionToken: v.string(), studentId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const studentId = args.studentId || actor.id;
    if (studentId !== actor.id && !["institution", "academician", "industry", "admin"].includes(actor.role)) {
      throw authError("You can only read your own results.");
    }
    const attempts = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .collect();
    // The per-question breakdown is the student's own; staff see the marks only.
    if (studentId !== actor.id) return attempts.map(({ breakdown, ...rest }) => rest);
    return attempts;
  },
});

export const assessmentForStudent = query({
  args: { sessionToken: v.string(), studentId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const studentId = args.studentId || actor.id;
    return await ctx.db
      .query("assessments")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .first();
  },
});

/** Everyone registered for one of your tests, with their marks. Host only. */
export const rosterForTest = query({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await ctx.db
      .query("skillTests")
      .filter((q) => q.eq(q.field("id"), args.testId))
      .first();
    if (test && test.ownerId !== actor.id && actor.role !== "admin") {
      throw authError("Only the account hosting this test can see its roster.");
    }

    const registrations = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .collect();

    const rows = [];
    for (const reg of registrations) {
      const student = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("id"), reg.userId))
        .first();
      const attempt = await ctx.db
        .query("assessmentAttempts")
        .withIndex("by_student_test", (q) => q.eq("studentId", reg.userId).eq("testId", args.testId))
        .first();
      rows.push({
        registration: reg,
        student: publicUser(student),
        score: attempt && !attempt.missed ? attempt.score : null,
      });
    }
    return rows;
  },
});
