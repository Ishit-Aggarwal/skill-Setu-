import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, canRead, getActor, publicUser, requireActor, requireOwner } from "./_lib/authz";
import { gradeSubmission, publicQuestionsFor, questionCountFor } from "./_lib/questionBank";
import { SKILL_DOMAINS } from "../lib/questionBank";
import { isAyushSystem } from "../lib/ayush";
import { normalisePaper, validatePaper } from "../lib/questions";
import { findTestByClientId, findUserById, questionsForTest } from "./_lib/tests";
import { findByClientId, publicRow } from "./_lib/rows";
import { recalculateAssessment, writeAttempt } from "./_lib/assessment";
import { issueCertificateForAttempt } from "./_lib/certificates";
import { clampPenalty, paperType, withholdAnswers } from "../lib/grading";
import { EXAM } from "../lib/settings";
import { canRevealAnswers, durationMinutes, isWindowTest, lastStartMs, scheduledStartMsUTC, testPhase, testStartMs, validateWindow } from "../lib/testWindow";
import { durationString } from "../lib/duration";
import { TEST_LEAD_HOURS } from "../lib/dates";
import { LIVE_STATES } from "../lib/examState";
import { activeCommunityIds, memberAccessForTest } from "./_lib/communityAccess";
import { announceCommunityTest } from "./_lib/communityCore";

/**
 * Skill tests and their marking.
 *
 * The score is computed here, from the answer key the browser never receives.
 * Nothing in this file accepts a score from a client: `submitAttempt` takes
 * answers, and `recordOfflineResult` takes a mark that only the account hosting
 * that test is allowed to enter.
 */

const TEST_WEIGHT = { Online: 1, Offline: 1.5, Hybrid: 1.5 };
const HOST_ROLES = ["industry", "academician", "institution", "admin"];

/**
 * The catalogue: every public test, plus the community-only tests of
 * communities the caller is an active member of, plus the caller's own.
 * A community test never appears to anyone else — not in the list and not
 * by id — whatever they send.
 */
export const listAll = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = args.sessionToken ? await getActor(ctx, args.sessionToken) : null;
    const memberOf = actor ? await activeCommunityIds(ctx, actor.id) : new Set();
    const rows = await ctx.db.query("skillTests").collect();
    return rows.filter((t) => t.audience !== "community" || (actor && (t.ownerId === actor.id || actor.role === "admin")) || memberOf.has(t.communityId));
  },
});

export const getById = query({
  args: { id: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const test = await findTestByClientId(ctx, args.id);
    if (!test) return null;
    const actor = args.sessionToken ? await getActor(ctx, args.sessionToken) : null;
    const access = await memberAccessForTest(ctx, actor, test);
    return access.ok ? test : null;
  },
});

export const listRegistrationsForUser = query({
  args: { userId: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    if (actor.id === args.userId || actor.role === "admin") return rows.map(publicRow);
    // Somebody else's registrations: only the rows the reader is entitled to
    // (the host of that test, or staff of the student's own institution).
    const visible = [];
    for (const row of rows) if (await canRead(ctx, actor, "skillTestRegistrations", row)) visible.push(publicRow(row));
    return visible;
  },
});

/**
 * Register for a test. The registration is always written for the signed-in
 * account — the caller cannot register somebody else.
 *
 * `id` is the browser's own record id: the registration is written locally
 * first and mirrored here under the same id, so a retry updates the existing
 * row instead of registering twice.
 */
export const register = mutation({
  args: {
    sessionToken: v.string(),
    id: v.optional(v.string()),
    testId: v.string(),
    slot: v.optional(v.union(v.string(), v.null())),
    paid: v.optional(v.boolean()),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    institution: v.optional(v.string()),
    course: v.optional(v.string()),
    year: v.optional(v.string()),
    phone: v.optional(v.string()),
    registeredAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const { sessionToken, id, ...fields } = args;

    // Who may register, decided here: not for a cancelled test, only a member
    // for a community test, and for a window only while a start is still
    // possible (so nobody registers for a paper they can no longer sit).
    const test = await findTestByClientId(ctx, args.testId);
    if (test) {
      if (test.cancelledAt) throw new Error("This test was cancelled by its host.");
      const access = await memberAccessForTest(ctx, actor, test);
      if (!access.ok) throw authError(access.reason);
      if (isWindowTest(test)) {
        const last = lastStartMs(test, { serverSide: true });
        if (last != null && Date.now() >= last) throw new Error("Registration has closed — this window no longer accepts new starts.");
      }
    }

    const existing = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .filter((q) => q.eq(q.field("userId"), actor.id))
      .first();

    const row = {
      ...fields,
      userId: actor.id,
      paymentStatus: args.paid ? "paid" : "not_required",
      registeredAt: fields.registeredAt || new Date().toISOString(),
      updatedAt: fields.updatedAt || new Date().toISOString(),
    };
    if (existing) {
      // Re-registering (a student let back into the community) restores a cancelled registration.
      await ctx.db.patch(existing._id, { ...row, id: existing.id || id, missedRecorded: existing.missedRecorded, attended: existing.attended, cancelledAt: null, cancelReason: null });
      return existing._id;
    }
    return await ctx.db.insert("skillTestRegistrations", { ...row, id, missedRecorded: false, attended: false });
  },
});

/**
 * Attendance and outcome patches on a registration. The student may only
 * confirm their own attendance; the host of the test may mark attendance,
 * a missed sitting and a score.
 */
export const updateRegistrationByClientId = mutation({
  args: { sessionToken: v.string(), id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const row = await findByClientId(ctx, "skillTestRegistrations", args.id);
    if (!row) return { ok: false, reason: "NOT_FOUND" };

    const test = await findTestByClientId(ctx, row.testId);
    const isHost = Boolean(test && test.ownerId === actor.id) || actor.role === "admin";
    const isStudent = row.userId === actor.id;
    if (!isHost && !isStudent) throw authError("That registration is not yours to change.");

    const allowed = isHost ? ["attended", "attendedAt", "missedRecorded", "score"] : ["attended", "attendedAt"];
    const safe = {};
    Object.entries(args.patch || {}).forEach(([k, value]) => {
      if (allowed.includes(k)) safe[k] = value;
    });
    if (!Object.keys(safe).length) return { ok: true, ignored: true };
    await ctx.db.patch(row._id, { ...safe, updatedAt: new Date().toISOString() });
    return { ok: true };
  },
});

/**
 * Every registration on every test the caller hosts, with the student's
 * public profile attached — what a host's roster and certificate dialog need.
 */
export const listRegistrationsForMyTests = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!HOST_ROLES.includes(actor.role)) return [];
    const tests = await ctx.db
      .query("skillTests")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .collect();
    const rows = [];
    for (const test of tests) {
      if (!test.id) continue;
      const registrations = await ctx.db
        .query("skillTestRegistrations")
        .withIndex("by_test", (q) => q.eq("testId", test.id))
        .collect();
      for (const reg of registrations) {
        const student = await findUserById(ctx, reg.userId);
        rows.push({ ...publicRow(reg), student: publicUser(student) });
      }
    }
    return rows;
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
    if (registration) await ctx.db.patch(registration._id, { attended: true, missedRecorded: true, updatedAt: new Date().toISOString() });

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

    // The mark is recorded; the certificate is not issued here. An in-person
    // or hybrid sitting's certificates go out together when the host releases
    // them (`releaseCertificates`), which is only possible once the sitting
    // has ended — so a mark entered mid-sitting never produces a certificate
    // before the room has emptied.
    const status = test?.issueCertificate ? "pending_release" : "not_enabled";
    return { ok: true, score, assessment, certificate: { status, credential: null } };
  },
});

/**
 * Releases the certificates of an in-person or hybrid sitting.
 *
 * Only the host, only for a test that is not an online paper (those certify
 * themselves on grading), and only after the sitting has ended — its start,
 * pressed or scheduled, plus its duration, on the server's clock. Every
 * candidate with a host-entered mark is considered: a mark at or above the
 * minimum earns a certificate, one already issued for the same mark is left
 * alone, and a corrected mark refreshes the certificate already held.
 */
export const releaseCertificates = mutation({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await findTestByClientId(ctx, args.testId);
    if (!test) throw new Error("This test no longer exists.");
    requireOwner(actor, test, { what: "this test" });
    if (test.mode === "Online") throw new Error("An online paper issues its certificates automatically when it is graded.");
    if (!test.issueCertificate) throw new Error("Certificates are switched off for this test. Turn them on in the test's certificate settings first.");
    const phase = testPhase(test, Date.now(), { serverSide: true });
    if (phase === "unscheduled" || phase === "upcoming") throw new Error("This sitting hasn't started yet.");
    if (phase !== "ended") throw new Error("This sitting is still in progress. Certificates can be released once it has ended.");

    const attempts = await ctx.db
      .query("assessmentAttempts")
      .withIndex("by_test", (q) => q.eq("testId", test.id))
      .collect();

    const counts = { issued: 0, refreshed: 0, unchanged: 0, belowMinimum: 0 };
    const credentials = [];
    for (const attempt of attempts) {
      if (attempt.missed || !String(attempt.gradedBy || "").startsWith("host")) continue;
      const student = await findUserById(ctx, attempt.studentId);
      if (!student) continue;

      const held = await ctx.db
        .query("credentials")
        .withIndex("by_student", (q) => q.eq("studentId", attempt.studentId))
        .filter((q) => q.eq(q.field("testId"), test.id))
        .first();
      if (held && !held.revokedAt && held.scorePercent === attempt.score) {
        counts.unchanged += 1;
        continue;
      }

      const out = await issueCertificateForAttempt(ctx, {
        test,
        attempt: { id: `host_${test.id}_${attempt.studentId}`, correctCount: null, totalQuestions: null, startedAt: new Date(testStartMs(test, { serverSide: true }) || Date.now()).toISOString() },
        student,
        score: attempt.score,
      });
      if (out.status === "issued") {
        counts[held && !held.revokedAt ? "refreshed" : "issued"] += 1;
        const { _id, _creationTime, snapshot, ...credential } = out.credential;
        credentials.push(credential);
      } else if (out.status === "below_minimum") {
        counts.belowMinimum += 1;
      }
    }

    const releasedAt = new Date().toISOString();
    await ctx.db.patch(test._id, { certificatesReleasedAt: releasedAt, updatedAt: releasedAt });
    return { ok: true, releasedAt, ...counts, considered: credentials.length + counts.unchanged + counts.belowMinimum, credentials };
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
    if (registration) await ctx.db.patch(registration._id, { missedRecorded: true, updatedAt: new Date().toISOString() });
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
    // …and an open window's breakdown loses its answer key until the window closes.
    const out = [];
    for (const attempt of attempts) {
      const test = attempt.breakdown ? await findTestByClientId(ctx, attempt.testId) : null;
      if (test && !canRevealAnswers(test)) out.push({ ...attempt, breakdown: withholdAnswers({ breakdown: attempt.breakdown }).breakdown, answersWithheld: true });
      else out.push(attempt);
    }
    return out;
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
  scheduledAtMs: v.optional(v.union(v.number(), v.null())),
  reportingTime: v.optional(v.string()),
  venue: v.optional(v.string()),
  description: v.string(),
  prerequisites: v.optional(v.string()),
  certification: v.optional(v.string()),
  rules: v.optional(v.array(v.string())),
  documentsRequired: v.optional(v.array(v.string())),
  meetingLink: v.optional(v.union(v.string(), v.null())),
  meetingMode: v.optional(v.union(v.string(), v.null())),
  status: v.optional(v.string()),
  postedAt: v.optional(v.string()),
  proctored: v.optional(v.boolean()),
  autoDisqualifyAfter: v.optional(v.union(v.number(), v.null())),
  issueCertificate: v.optional(v.boolean()),
  minCertificateScore: v.optional(v.union(v.number(), v.null())),
  violationPenalty: v.optional(v.union(v.number(), v.null())),
  faceMonitoring: v.optional(v.boolean()),
  monitorViolationLimit: v.optional(v.union(v.number(), v.null())),
  samplePapers: v.optional(v.array(v.any())),
  updatedAt: v.optional(v.string()),
  durationMinutes: v.optional(v.union(v.number(), v.null())),
  scheduleType: v.optional(v.union(v.string(), v.null())),
  windowOpensAtMs: v.optional(v.union(v.number(), v.null())),
  windowClosesAtMs: v.optional(v.union(v.number(), v.null())),
  shuffle: v.optional(v.boolean()),
  poolSize: v.optional(v.union(v.number(), v.null())),
  audience: v.optional(v.union(v.string(), v.null())),
  communityId: v.optional(v.union(v.string(), v.null())),
  pinInCommunity: v.optional(v.boolean()),
};

/** A pool is a whole number between EXAM.MIN_POOL_QUESTIONS and the paper's size; anything else is "no pool". */
function cleanPoolSize(value, paperSize) {
  if (value == null || value === "") return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < EXAM.MIN_POOL_QUESTIONS) return null;
  if (paperSize && n >= paperSize) return null;
  return n;
}

/**
 * The schedule fields of a test, normalised and checked here — the browser's
 * checks are a convenience. A window is online-only with no meeting; a new
 * fixed sitting still needs its three days' notice.
 */
function scheduleFields(fields, { isNew, now = Date.now() }) {
  const minutes = durationMinutes(fields);
  const out = { durationMinutes: minutes, duration: durationString(minutes) };
  if (fields.scheduleType === "window") {
    const problem = validateWindow({
      opensAtMs: fields.windowOpensAtMs,
      closesAtMs: fields.windowClosesAtMs,
      duration: minutes,
      now,
      latestMs: now + 366 * 24 * 3600000,
      allowPastOpen: !isNew,
    });
    if (problem) throw new Error(problem);
    Object.assign(out, {
      scheduleType: "window",
      windowOpensAtMs: fields.windowOpensAtMs,
      windowClosesAtMs: fields.windowClosesAtMs,
      scheduledAtMs: fields.windowOpensAtMs,
      mode: "Online",
      meetingMode: "none",
      meetingLink: null,
      startedAt: null,
      // Shuffling is on for a window unless the host switched it off.
      shuffle: fields.shuffle !== false,
    });
  } else {
    out.scheduleType = "fixed";
    out.windowOpensAtMs = null;
    out.windowClosesAtMs = null;
    out.shuffle = Boolean(fields.shuffle);
    const start = Number.isFinite(fields.scheduledAtMs) ? fields.scheduledAtMs : scheduledStartMsUTC(fields);
    // The three days' notice, on this clock. Ten minutes of slack for a
    // host who filled the form in at the very edge of the rule.
    if (isNew && start != null && start - now < TEST_LEAD_HOURS * 3600000 - 10 * 60000) {
      throw new Error(`A skill test must be at least ${TEST_LEAD_HOURS} hours (3 days) from now.`);
    }
  }
  return out;
}

async function anyAttempt(ctx, testId) {
  return Boolean(
    await ctx.db
      .query("examAttempts")
      .withIndex("by_test", (q) => q.eq("testId", testId))
      .first()
  );
}

async function liveAttempt(ctx, testId) {
  const rows = await ctx.db
    .query("examAttempts")
    .withIndex("by_test", (q) => q.eq("testId", testId))
    .collect();
  return rows.some((a) => LIVE_STATES.includes(a.state));
}

async function requireCommunityHost(ctx, actor, communityId) {
  const community = await ctx.db
    .query("communities")
    .withIndex("by_client_id", (q) => q.eq("id", communityId))
    .first();
  if (!community || community.archivedAt) throw new Error("Choose a community you own or moderate.");
  const membership = await ctx.db
    .query("communityMembers")
    .withIndex("by_community_user", (q) => q.eq("communityId", communityId).eq("userId", actor.id))
    .first();
  const staff = membership?.status === "active" && (membership.role === "owner" || membership.role === "moderator");
  if (!staff && actor.role !== "admin") throw authError("Only the owner or a moderator of that community can host a test for it.");
  return community;
}

/** "live" or "none"; anything else is read as "none" (the exam room monitors on its own). */
function cleanMeetingMode(value) {
  return value === "live" ? "live" : "none";
}

/** A whole number of camera/microphone violations, 0 = off; null keeps the default. */
function cleanMonitorLimit(value) {
  if (value == null || value === "") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : null;
}

/** Sample papers are storage references only — never inline files — and at most EXAM.MAX_SAMPLE_PAPERS. */
function cleanSamplePapers(list) {
  if (!Array.isArray(list)) return undefined;
  return list
    .filter((p) => p && typeof p === "object" && typeof p.storageId === "string")
    .slice(0, EXAM.MAX_SAMPLE_PAPERS)
    .map((p) => ({ id: p.id || p.storageId, storageId: p.storageId, fileName: p.fileName || "Sample paper.pdf", mimeType: p.mimeType || "application/pdf", bytes: Number(p.bytes) || 0, url: typeof p.url === "string" ? p.url : undefined }));
}

/** A penalty is a whole number between 0 and the paper's total; null keeps the default. */
function cleanPenalty(value, totalPoints) {
  if (value == null || value === "") return null;
  return clampPenalty(value, totalPoints || Number.MAX_SAFE_INTEGER);
}

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
      bloom: q.bloom || undefined,
      citation: q.citation || null,
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
    const prior = await findTestByClientId(ctx, args.id);
    const schedule = scheduleFields(fields, { isNew: !prior });
    // A community test is free and only for its members; the host must run the community.
    let audience = { audience: "public", communityId: null, communityName: null };
    let community = null;
    if (fields.audience === "community") {
      if (!fields.communityId) throw new Error("Choose the community this test is for.");
      community = await requireCommunityHost(ctx, actor, fields.communityId);
      audience = { audience: "community", communityId: community.id, communityName: community.name, price: 0 };
    }
    const paperSize = Array.isArray(questions) ? questions.length : prior?.questionCount || 0;
    const { pinInCommunity, ...rowFields } = fields;
    const row = {
      ...rowFields,
      ...schedule,
      ...audience,
      poolSize: cleanPoolSize(fields.poolSize, paperSize),
      ayushSystem: isAyushSystem(fields.ayushSystem) ? fields.ayushSystem : undefined,
      needsRetagging: !isAyushSystem(fields.ayushSystem),
      hostName,
      ownerId: actor.id,
      status: fields.status || "Open",
      postedAt: fields.postedAt || new Date().toISOString(),
      updatedAt: fields.updatedAt || new Date().toISOString(),
      proctored: schedule.mode === "Online" || fields.mode === "Online" ? fields.proctored !== false : false,
      violationPenalty: cleanPenalty(fields.violationPenalty, Array.isArray(questions) ? questions.length : undefined),
      monitorViolationLimit: cleanMonitorLimit(fields.monitorViolationLimit),
      meetingMode: schedule.scheduleType === "window" ? "none" : cleanMeetingMode(fields.meetingMode),
      meetingLink:
        schedule.scheduleType !== "window" && cleanMeetingMode(fields.meetingMode) === "live" && typeof fields.meetingLink === "string" && fields.meetingLink.trim() ? fields.meetingLink.trim() : null,
      samplePapers: cleanSamplePapers(fields.samplePapers),
      // The browser sends the absolute instant; a client that did not is
      // read as IST rather than as UTC (lib/testWindow.js).
      scheduledAtMs: schedule.scheduleType === "window" ? schedule.windowOpensAtMs : Number.isFinite(fields.scheduledAtMs) ? fields.scheduledAtMs : scheduledStartMsUTC(fields),
    };

    let test = prior;
    if (test) {
      requireOwner(actor, test, { what: "this test" });
      await ctx.db.patch(test._id, row);
      test = await ctx.db.get(test._id);
    } else {
      const _id = await ctx.db.insert("skillTests", row);
      test = await ctx.db.get(_id);
    }

    let paper = { questionCount: test.questionCount || 0, paperType: test.paperType || null };
    if (Array.isArray(questions) && row.mode === "Online") paper = await writePaper(ctx, actor, test, questions);
    // A new community test is posted in its community and every member is told.
    if (community && !prior) await announceCommunityTest(ctx, { actor, community, test, pin: Boolean(args.pinInCommunity) });
    // The penalty can never exceed the paper now that its size is known.
    if (row.violationPenalty != null && paper.questionCount && row.violationPenalty > paper.questionCount) {
      await ctx.db.patch(test._id, { violationPenalty: paper.questionCount });
    }
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
    const { ownerId, id, _id, _creationTime, questionCount, paperType: pt, audience, communityId, cancelledAt, scheduleType, ...safe } = args.patch || {};
    const now = Date.now();
    const attempted = await anyAttempt(ctx, test.id);
    // Once anyone has sat the paper its length is part of their result.
    if (("durationMinutes" in safe || "duration" in safe) && attempted) {
      const next = durationMinutes({ ...test, ...safe });
      if (next !== durationMinutes(test)) throw new Error("Candidates have already started this test, so its duration can no longer change.");
    }
    if ("durationMinutes" in safe || "duration" in safe) {
      const minutes = durationMinutes({ ...test, ...safe });
      safe.durationMinutes = minutes;
      safe.duration = durationString(minutes);
    }
    if ("poolSize" in safe) {
      if (attempted) delete safe.poolSize;
      else safe.poolSize = cleanPoolSize(safe.poolSize, test.questionCount || 0);
    }
    // A window's dates: anything before it opens (the 24-hour minimum still
    // holds); after it opens the close may be extended freely, but brought
    // forward only while nobody is mid-paper and there is still an hour
    // before the last start.
    if (isWindowTest(test) && ("windowOpensAtMs" in safe || "windowClosesAtMs" in safe)) {
      const opensAtMs = "windowOpensAtMs" in safe ? safe.windowOpensAtMs : test.windowOpensAtMs;
      const closesAtMs = "windowClosesAtMs" in safe ? safe.windowClosesAtMs : test.windowClosesAtMs;
      const minutes = durationMinutes({ ...test, ...safe });
      const opened = now >= test.windowOpensAtMs;
      if (opened && opensAtMs !== test.windowOpensAtMs) throw new Error("This window is already open, so its opening time can't change.");
      const problem = validateWindow({ opensAtMs, closesAtMs, duration: minutes, now, latestMs: now + 366 * 24 * 3600000, allowPastOpen: opened });
      if (problem) throw new Error(problem);
      if (opened && closesAtMs < test.windowClosesAtMs) {
        if (closesAtMs - minutes * 60000 < now + 3600000) throw new Error("The window can only be shortened while the last start is still at least an hour away.");
        if (await liveAttempt(ctx, test.id)) throw new Error("Someone is sitting the paper right now, so the window can't be shortened.");
      }
      safe.windowOpensAtMs = opensAtMs;
      safe.windowClosesAtMs = closesAtMs;
      safe.scheduledAtMs = opensAtMs;
    } else if (isWindowTest(test)) {
      delete safe.startedAt;
      delete safe.meetingLink;
      delete safe.meetingMode;
    }
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
    if ("violationPenalty" in safe) safe.violationPenalty = cleanPenalty(safe.violationPenalty, test.questionCount);
    if ("monitorViolationLimit" in safe) safe.monitorViolationLimit = cleanMonitorLimit(safe.monitorViolationLimit);
    if ("meetingMode" in safe) safe.meetingMode = cleanMeetingMode(safe.meetingMode);
    if ("meetingLink" in safe) safe.meetingLink = typeof safe.meetingLink === "string" && safe.meetingLink.trim() ? safe.meetingLink.trim() : null;
    if ("samplePapers" in safe) safe.samplePapers = cleanSamplePapers(safe.samplePapers) || [];
    // A reschedule sends the new instant; a client that only sent the strings
    // gets it derived here. Only `releaseCertificates` ever sets a release time.
    if ("scheduledAt" in safe || "scheduledTime" in safe) {
      if (!Number.isFinite(safe.scheduledAtMs)) safe.scheduledAtMs = scheduledStartMsUTC({ ...test, ...safe, scheduledAtMs: undefined });
    }
    if ("certificatesReleasedAt" in safe && safe.certificatesReleasedAt != null) delete safe.certificatesReleasedAt;
    await ctx.db.patch(test._id, { ...safe, updatedAt: safe.updatedAt || new Date().toISOString() });
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

/**
 * Cancels an open-window test nobody has sat yet, and tells everyone
 * registered. A window with attempts cannot be cancelled: those candidates'
 * results and certificates stand.
 */
export const cancelWindowTest = mutation({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await findTestByClientId(ctx, args.testId);
    if (!test) throw new Error("This test no longer exists.");
    requireOwner(actor, test, { what: "this test" });
    if (!isWindowTest(test)) throw new Error("Only an open-window test can be cancelled here.");
    if (test.cancelledAt) return { ok: true, already: true };
    if (await anyAttempt(ctx, test.id)) throw new Error("Candidates have already started this test, so it can't be cancelled.");
    const at = new Date().toISOString();
    await ctx.db.patch(test._id, { cancelledAt: at, status: "Cancelled", updatedAt: at });
    const registrations = await ctx.db
      .query("skillTestRegistrations")
      .withIndex("by_test", (q) => q.eq("testId", test.id))
      .collect();
    for (const reg of registrations) {
      await ctx.db.patch(reg._id, { cancelledAt: at, cancelReason: "test_cancelled", updatedAt: at });
      await ctx.db.insert("studentNotifications", {
        id: `notif_cancel_${test.id}_${reg.userId}`,
        studentId: reg.userId,
        senderId: actor.id,
        testId: test.id,
        kind: "test_cancelled",
        link: "/skill-assessment",
        message: `"${test.title}" has been cancelled by ${test.hostName || "its host"}.`,
        from: test.hostName || "Test host",
        sentAt: at,
        read: false,
        updatedAt: at,
      });
    }
    return { ok: true, notified: registrations.length };
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
