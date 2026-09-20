import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, publicUser, requireActor, requireOwner } from "./_lib/authz";
import { gradeSubmission, publicQuestionsFor, questionCountFor } from "./_lib/questionBank";
import { SKILL_DOMAINS } from "../lib/questionBank";
import { isAyushSystem } from "../lib/ayush";
import { normalisePaper, validatePaper } from "../lib/questions";
import { paperType } from "../lib/grading";
import { findTestByClientId, questionsForTest } from "./_lib/tests";
import { recalculateAssessment, writeAttempt } from "./_lib/assessment";

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

/* ============================================================
   Hosting a test: the row, its settings and its paper
   ============================================================ */

const HOST_ROLES = ["industry", "academician", "institution", "admin"];

/** Everything a host may set on a test row. The paper is handled separately. */
const TEST_FIELDS = {
  title: v.string(),
  domain: v.string(),
  ayushSystem: v.optional(v.string()),
  hostName: v.optional(v.string()),
  mode: v.string(),
  duration: v.string(),
  price: v.number(),
  scheduledAt: v.optional(v.string()),
  scheduledTime: v.optional(v.string()),
  reportingTime: v.optional(v.string()),
  venue: v.optional(v.string()),
  description: v.string(),
  prerequisites: v.optional(v.string()),
  certification: v.optional(v.string()),
  rules: v.optional(v.array(v.string())),
  documentsRequired: v.optional(v.array(v.string())),
  meetingLink: v.optional(v.string()),
  status: v.optional(v.string()),
  postedAt: v.optional(v.string()),
  proctored: v.optional(v.boolean()),
  autoDisqualifyAfter: v.optional(v.union(v.number(), v.null())),
  issueCertificate: v.optional(v.boolean()),
  minCertificateScore: v.optional(v.union(v.number(), v.null())),
};

async function attemptsStarted(ctx, testId) {
  const attempt = await ctx.db
    .query("examAttempts")
    .withIndex("by_test", (q) => q.eq("testId", testId))
    .filter((q) => q.neq(q.field("state"), "NOT_STARTED"))
    .first();
  return Boolean(attempt);
}

/** Replaces a test's paper. Only callable while nobody has started it. */
async function writePaper(ctx, actor, test, questions) {
  if (await attemptsStarted(ctx, test.id)) {
    throw new Error("Candidates have already started this test, so its paper can no longer be changed.");
  }
  const paper = normalisePaper(questions, { ayushSystem: test.ayushSystem });
  const problem = validatePaper(paper);
  if (problem) throw new Error(problem);

  const existing = await questionsForTest(ctx, test.id);
  const keep = new Map(existing.map((row) => [row.id, row]));
  const seen = new Set();
  for (let order = 0; order < paper.length; order += 1) {
    const q = paper[order];
    seen.add(q.id);
    const row = {
      id: q.id,
      testId: test.id,
      ownerId: actor.id,
      order,
      text: q.text,
      type: q.type,
      options: q.options,
      explanation: q.explanation,
      source: q.source,
      ayushSystem: q.ayushSystem || test.ayushSystem || undefined,
      topic: q.topic || undefined,
      difficulty: q.difficulty || undefined,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      recheckHistory: q.recheckHistory || [],
    };
    const prior = keep.get(q.id);
    if (prior) await ctx.db.patch(prior._id, { ...row, createdAt: prior.createdAt });
    else await ctx.db.insert("skillTestQuestions", row);
  }
  for (const row of existing) if (!seen.has(row.id)) await ctx.db.delete(row._id);

  const type = paperType(paper);
  await ctx.db.patch(test._id, { questionCount: paper.length, paperType: type });
  return { questionCount: paper.length, paperType: type };
}

/**
 * Publishes (or re-publishes) a test under the client's own record id, with
 * its paper. The paper is written to skillTestQuestions and never returned
 * to a candidate with its keys; the row itself only says how many questions
 * there are and of which types.
 */
export const publishTest = mutation({
  args: { sessionToken: v.string(), id: v.string(), questions: v.optional(v.any()), ...TEST_FIELDS },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!HOST_ROLES.includes(actor.role)) throw authError("Only a test host can publish a test.");

    const { sessionToken, questions, ...fields } = args;
    const hostName = actor.user.companyName || actor.user.instituteName || actor.user.institution || fields.hostName || actor.user.name || "Host";
    const row = {
      ...fields,
      ayushSystem: isAyushSystem(fields.ayushSystem) ? fields.ayushSystem : undefined,
      needsRetagging: !isAyushSystem(fields.ayushSystem),
      hostName,
      ownerId: actor.id,
      status: fields.status || "Open",
      postedAt: fields.postedAt || new Date().toISOString(),
      proctored: fields.mode === "Online" ? fields.proctored !== false : false,
    };

    let test = await findTestByClientId(ctx, args.id);
    if (test) {
      requireOwner(actor, test, { what: "this test" });
      await ctx.db.patch(test._id, row);
      test = await ctx.db.get(test._id);
    } else {
      const _id = await ctx.db.insert("skillTests", row);
      test = await ctx.db.get(_id);
    }

    let paper = { questionCount: test.questionCount || 0, paperType: test.paperType || null };
    if (Array.isArray(questions) && fields.mode === "Online") paper = await writePaper(ctx, actor, test, questions);
    return { ok: true, ...paper };
  },
});

/** A host's edit to their own test, addressed by the client record id. */
export const updateByClientId = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await findTestByClientId(ctx, args.id);
    if (!test) return { ok: false, reason: "NOT_FOUND" };
    requireOwner(actor, test, { what: "this test" });
    const { ownerId, id, _id, _creationTime, questionCount, paperType: pt, ...safe } = args.patch || {};
    if ("ayushSystem" in safe) {
      if (isAyushSystem(safe.ayushSystem)) safe.needsRetagging = false;
      else delete safe.ayushSystem;
    }
    if ("minCertificateScore" in safe && safe.minCertificateScore != null) {
      safe.minCertificateScore = Math.max(0, Math.min(100, Number(safe.minCertificateScore) || 0));
    }
    if ("autoDisqualifyAfter" in safe && safe.autoDisqualifyAfter != null) {
      safe.autoDisqualifyAfter = Math.max(1, Math.round(Number(safe.autoDisqualifyAfter) || 1));
    }
    await ctx.db.patch(test._id, safe);
    return { ok: true };
  },
});

/** Replaces the paper on a published test (autosave from the editor). */
export const saveQuestions = mutation({
  args: { sessionToken: v.string(), testId: v.string(), questions: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await findTestByClientId(ctx, args.testId);
    if (!test) throw new Error("This test no longer exists.");
    requireOwner(actor, test, { what: "this test" });
    return { ok: true, ...(await writePaper(ctx, actor, test, args.questions)) };
  },
});

/** The full paper, keys and explanations included — host only. */
export const paperForHost = query({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await findTestByClientId(ctx, args.testId);
    if (!test) return { ok: false, error: "This test no longer exists." };
    requireOwner(actor, test, { what: "this test" });
    const rows = await questionsForTest(ctx, test.id);
    return {
      ok: true,
      locked: await attemptsStarted(ctx, test.id),
      questions: rows.map(({ _id, _creationTime, ...q }) => q),
    };
  },
});

/**
 * Records the outcome of a "Recheck with AI" on one question. `accepted`
 * replaces the question's content with the proposal; either way the attempt
 * is logged so the history shows every recheck, not just the applied ones.
 */
export const recordRecheck = mutation({
  args: {
    sessionToken: v.string(),
    testId: v.string(),
    questionId: v.string(),
    verdict: v.string(),
    proposed: v.optional(v.any()),
    accepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await findTestByClientId(ctx, args.testId);
    if (!test) throw new Error("This test no longer exists.");
    requireOwner(actor, test, { what: "this test" });
    const row = await ctx.db
      .query("skillTestQuestions")
      .withIndex("by_client_id", (q) => q.eq("id", args.questionId))
      .filter((q) => q.eq(q.field("testId"), test.id))
      .first();
    if (!row) throw new Error("That question is not on this test.");

    const entry = { at: new Date().toISOString(), verdict: args.verdict, proposed: args.proposed || null, accepted: args.accepted };
    const patch = { recheckHistory: [...(row.recheckHistory || []), entry] };
    if (args.accepted && args.proposed) {
      if (await attemptsStarted(ctx, test.id)) throw new Error("Candidates have already started this test, so its paper can no longer be changed.");
      const [q] = normalisePaper([{ ...row, ...args.proposed, id: row.id, recheckHistory: patch.recheckHistory }], { ayushSystem: test.ayushSystem });
      const problem = validatePaper([q]);
      if (problem) throw new Error(problem);
      Object.assign(patch, { text: q.text, type: q.type, options: q.options, explanation: q.explanation, updatedAt: q.updatedAt });
      const all = await questionsForTest(ctx, test.id);
      const merged = all.map((r) => (r.id === row.id ? { ...r, ...patch } : r));
      await ctx.db.patch(test._id, { paperType: paperType(merged) });
    }
    await ctx.db.patch(row._id, patch);
    return { ok: true };
  },
});

/** Tests hosted by the signed-in account, from the shared database. */
export const listMine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    return await ctx.db
      .query("skillTests")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .collect();
  },
});
