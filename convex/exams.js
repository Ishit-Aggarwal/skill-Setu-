import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, publicUser, requireActor } from "./_lib/authz";
import { bankPaperFor } from "./_lib/questionBank";
import { findTestByClientId, findUserById, questionsForTest } from "./_lib/tests";
import { recalculateAssessment, writeAttempt } from "./_lib/assessment";
import { issueCertificateForAttempt } from "./_lib/certificates";
import { SKILL_DOMAINS } from "../lib/questionBank";
import { EXAM } from "../lib/settings";
import { joinWindowMinutes, testEndMs, testPhase } from "../lib/testWindow";
import { LIVE_STATES, canTransition, isClosed } from "../lib/examState";
import { applyPenalty, clampPenalty, gradePaper } from "../lib/grading";
import { sanitizeForCandidate } from "../lib/questions";

/**
 * The secure exam room, server side.
 *
 * One row per sitting. The browser proposes state changes and reports what
 * it observed (fullscreen exits, tab switches, noise, disconnects); the server
 * validates every transition against lib/examState.js, keeps the violation
 * count, decides when the limit forces a submission, grades the paper from
 * the key the browser never received, and is the only writer of scores.
 *
 * What a candidate may read is decided here too: before GRADED the paper is
 * served through `sanitizeForCandidate`, which strips `isCorrect` and the
 * explanation. After GRADED, `review` returns both — for that student, for
 * that attempt, and for nobody else except the host.
 */

const TEST_WEIGHT = { Online: 1, Offline: 1.5, Hybrid: 1.5 };
const HOST_ROLES = ["industry", "academician", "institution", "admin"];

/**
 * The penalty a test charges per violation. A host sets it on the test
 * (0 turns penalties off); tests published before penalties existed use the
 * default. Never more than the paper's total, whatever was saved.
 */
function penaltyFor(test, totalPoints) {
  const raw = test && test.violationPenalty != null ? test.violationPenalty : EXAM.DEFAULT_VIOLATION_PENALTY;
  return clampPenalty(raw, totalPoints);
}

/** Milliseconds into the sitting right now. */
function elapsedOf(attempt) {
  const started = attempt?.startedAt ? new Date(attempt.startedAt).getTime() : null;
  return started ? Math.max(0, Date.now() - started) : 0;
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function durationMinutesOf(duration) {
  const m = /(\d+)/.exec(String(duration || ""));
  const minutes = m ? Number(m[1]) : 15;
  return Math.max(2, Math.min(180, minutes));
}

async function getAttempt(ctx, id) {
  return await ctx.db
    .query("examAttempts")
    .withIndex("by_client_id", (q) => q.eq("id", id))
    .first();
}

/** The candidate who owns the attempt, or the host who owns its test. */
async function requireAttemptAccess(ctx, sessionToken, attemptId, { hostOnly = false, studentOnly = false } = {}) {
  const actor = await requireActor(ctx, sessionToken);
  const attempt = await getAttempt(ctx, attemptId);
  if (!attempt) throw new Error("This attempt no longer exists.");
  const isStudent = attempt.studentId === actor.id;
  const isHost = attempt.ownerId === actor.id || actor.role === "admin";
  if (hostOnly && !isHost) throw authError("Only the host of this test can see this.");
  if (studentOnly && !isStudent) throw authError("Only the candidate sitting this test can do that.");
  if (!isStudent && !isHost) throw authError("This attempt is not yours to see.");
  return { actor, attempt, isStudent, isHost };
}

async function transition(ctx, attempt, to, reason) {
  if (!canTransition(attempt.state, to)) {
    throw new Error(`Cannot move an attempt from ${attempt.state} to ${to}.`);
  }
  const at = new Date().toISOString();
  const transitions = [...(attempt.transitions || []), { state: to, at, ...(reason ? { reason } : {}) }];
  const patch = { state: to, transitions };
  if (isClosed(to) && !attempt.endedAt) patch.endedAt = at;
  await ctx.db.patch(attempt._id, patch);
  return { ...attempt, ...patch };
}

/** The full paper (keys included) behind an attempt. Server-side only. */
async function paperFor(ctx, attempt) {
  if (attempt.paperSource === "bank") return bankPaperFor(attempt.domain);
  const rows = await questionsForTest(ctx, attempt.testId);
  return rows.map(({ _id, _creationTime, ...q }) => q);
}

async function logEvent(ctx, attempt, type, atMs, detail, durationMs) {
  await ctx.db.insert("examEvents", {
    attemptId: attempt.id,
    testId: attempt.testId,
    studentId: attempt.studentId,
    type,
    at: new Date().toISOString(),
    atMs: Math.max(0, Math.round(atMs || 0)),
    durationMs: durationMs == null ? null : Math.round(durationMs),
    detail: detail || undefined,
  });
}

/**
 * Grades, records the result everywhere it is read, and issues a certificate.
 *
 * Violation penalties come off here, from the count this server kept — the
 * browser never sends a score or a penalty. An attempt that failed outright
 * (penalties used up the paper, or the camera was switched off) scores 0 and
 * gets no certificate.
 */
async function gradeAttempt(ctx, attempt, answers) {
  const paper = await paperFor(ctx, attempt);
  const marked = gradePaper(paper, answers || {});
  const test = await findTestByClientId(ctx, attempt.testId);
  const student = await findUserById(ctx, attempt.studentId);

  const penaltyPerViolation = penaltyFor(test, marked.total);
  let result = applyPenalty(marked, { violations: attempt.violationCount || 0, penaltyPerViolation });
  const failedOutright = Boolean(attempt.failedReason) || result.failed;
  if (failedOutright && !result.failed) result = { ...result, failed: true, points: 0, score: 0 };

  const gradedAt = new Date().toISOString();
  await ctx.db.patch(attempt._id, {
    answers: answers || {},
    score: result.score,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    rawPoints: result.rawPoints,
    penaltyPoints: result.penaltyPoints,
    penaltyPerViolation,
    failed: failedOutright,
    gradedAt,
  });

  const weight = TEST_WEIGHT[attempt.mode] || TEST_WEIGHT.Online;
  await writeAttempt(ctx, attempt.studentId, {
    testId: attempt.testId,
    domain: attempt.domain || test?.domain || "General",
    score: result.score,
    weight,
    missed: false,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    breakdown: result.breakdown,
    gradedBy: "server",
    failed: failedOutright,
    autoSubmitReason: attempt.autoSubmitReason || null,
  });

  const registration = await ctx.db
    .query("skillTestRegistrations")
    .withIndex("by_test", (q) => q.eq("testId", attempt.testId))
    .filter((q) => q.eq(q.field("userId"), attempt.studentId))
    .first();
  if (registration) await ctx.db.patch(registration._id, { attended: true, missedRecorded: true });

  const assessment = await recalculateAssessment(ctx, attempt.studentId);

  let certificate = { status: "not_enabled", credential: null };
  if (failedOutright) certificate = { status: "failed", credential: null };
  else if (test && student) {
    certificate = await issueCertificateForAttempt(ctx, { test, attempt: { ...attempt, ...result }, student, score: result.score });
  }
  const graded = await transition(ctx, { ...attempt, state: attempt.state }, "GRADED");
  await ctx.db.patch(graded._id, { certificateStatus: certificate.status, credentialId: certificate.credential?.id || null });

  return { result, assessment, certificate, attempt: { ...graded, certificateStatus: certificate.status, credentialId: certificate.credential?.id || null } };
}

const FAILING_REASONS = ["penalty_limit_reached", "device_lost", "window_left", "window_closed", "monitor_limit_reached"];

/** Camera/microphone violations that fail the attempt; 0 = off. */
function monitorLimitFor(test) {
  const raw = test && test.monitorViolationLimit != null ? Number(test.monitorViolationLimit) : EXAM.MONITOR_VIOLATION_LIMIT;
  return Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : EXAM.MONITOR_VIOLATION_LIMIT;
}

/** The reason an instant-fail event type ends the attempt with. */
function instantFailReason(type) {
  if (type === "WINDOW_CLOSED") return "window_closed";
  if (type === "TAB_SWITCH") return "window_left";
  return null;
}

async function autoSubmit(ctx, attempt, reason, atMs) {
  await logEvent(ctx, attempt, "AUTO_SUBMIT_TRIGGERED", atMs, reason);
  const closed = await transition(ctx, attempt, "AUTO_SUBMITTED", reason);
  const patch = { autoSubmitReason: reason };
  if (FAILING_REASONS.includes(reason)) {
    patch.failedReason = reason;
    patch.disqualified = true;
    patch.disqualifiedAt = attempt.disqualifiedAt || new Date().toISOString();
  }
  await ctx.db.patch(closed._id, patch);
  return await gradeAttempt(ctx, { ...closed, ...patch }, closed.answers || {});
}

/** Everything the browser needs to describe the rules of this sitting. */
async function configFor(ctx, attempt) {
  const paper = await paperFor(ctx, attempt);
  const totalPoints = paper.length;
  const test = await findTestByClientId(ctx, attempt.testId);
  const penaltyPerViolation = penaltyFor(test, totalPoints);
  return {
    totalPoints,
    penaltyPerViolation,
    deviceGraceSeconds: EXAM.DEVICE_GRACE_SECONDS,
    faceMonitoring: Boolean(test?.faceMonitoring !== false),
    monitorViolationLimit: monitorLimitFor(test),
    heartbeatSeconds: EXAM.HEARTBEAT_SECONDS,
    // Kept for browsers still running the previous exam room.
    violationLimit: EXAM.VIOLATION_LIMIT,
    fullscreenGraceSeconds: EXAM.FULLSCREEN_GRACE_SECONDS,
  };
}

function stripCredential(credential) {
  if (!credential) return null;
  const { _id, _creationTime, ...rest } = credential;
  return rest;
}

/* ============================================================
   Before the test
   ============================================================ */

/**
 * "Start Test" was clicked. Returns the candidate's open attempt for this
 * test if one exists (so a reload resumes rather than restarts), otherwise a
 * fresh attempt in CONSENT_PENDING. A graded attempt is never reopened — a
 * retake is a new row and replaces the earlier score when it is graded.
 */
export const begin = mutation({
  args: {
    sessionToken: v.string(),
    testId: v.string(),
    // For catalogue tests that exist only on this device, enough to grade
    // against the platform bank. Ignored when the test row exists here.
    fallback: v.optional(v.object({ domain: v.string(), title: v.string(), duration: v.string(), mode: v.optional(v.string()) })),
    clientInfo: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role !== "student") throw authError("Only a student account can sit a test.");

    const open = await ctx.db
      .query("examAttempts")
      .withIndex("by_student_test", (q) => q.eq("studentId", actor.id).eq("testId", args.testId))
      .collect();
    const live = open.find((a) => !isClosed(a.state));
    if (live) {
      // The paper was open and the room is being opened again: the window
      // was closed, reloaded or navigated away from. That ends the attempt.
      // A candidate still in the pre-test steps (consent, device check)
      // simply carries on from where they were.
      if (LIVE_STATES.includes(live.state)) {
        await logEvent(ctx, live, "WINDOW_CLOSED", elapsedOf(live), "The exam room was reopened after the paper was left");
        const graded = await autoSubmit(ctx, live, "window_closed", elapsedOf(live));
        const { _id, _creationTime, answers, ...rest } = graded.attempt;
        return {
          ok: true,
          attempt: rest,
          resumed: false,
          closedOnReturn: true,
          graded: {
            result: graded.result,
            certificate: { status: graded.certificate.status, credential: stripCredential(graded.certificate.credential) },
            assessment: graded.assessment,
            autoSubmitReason: "window_closed",
            disqualified: true,
          },
        };
      }
      const { _id, _creationTime, answers, ...rest } = live;
      return { ok: true, attempt: rest, resumed: true };
    }

    // A failed attempt is final: leaving the window, a lost camera or too
    // many flagged violations cannot be undone by opening the paper again.
    // The room shows that attempt's result instead of a fresh paper.
    const failed = open.find((a) => a.failed || (a.autoSubmitReason && FAILING_REASONS.includes(a.autoSubmitReason)));
    if (failed) {
      const { _id, _creationTime, answers, ...rest } = failed;
      return { ok: true, attempt: rest, resumed: false, failedEarlier: true };
    }

    const test = await findTestByClientId(ctx, args.testId);
    // A fresh attempt only while the sitting is open. The phase is read on
    // this clock, not the browser's: once the joining window has closed the
    // candidate is not coming in part-way, whatever their card said.
    if (test) {
      const phase = testPhase(test, Date.now(), { serverSide: true });
      if (phase === "upcoming") throw new Error("This test hasn't started yet. The paper opens at the scheduled time.");
      if (phase === "locked") {
        const minutes = joinWindowMinutes(test);
        throw new Error(`The test is in progress and joining closed ${minutes} minute${minutes === 1 ? "" : "s"} after it started. You can't join a test part-way through.`);
      }
      if (phase === "ended") throw new Error("This test has ended.");
    }

    let source;
    let domain;
    let title;
    let duration;
    let mode;
    let ownerId;
    if (test && (test.questionCount || 0) > 0) {
      source = "authored";
      domain = test.domain;
      title = test.title;
      duration = test.duration;
      mode = test.mode;
      ownerId = test.ownerId;
    } else {
      const fb = args.fallback || (test ? { domain: test.domain, title: test.title, duration: test.duration, mode: test.mode } : null);
      if (!fb || !SKILL_DOMAINS.includes(fb.domain) || !bankPaperFor(fb.domain).length) {
        throw new Error("This test has no question paper yet. Ask the host to publish one.");
      }
      source = "bank";
      domain = fb.domain;
      title = fb.title;
      duration = fb.duration;
      mode = fb.mode || "Online";
      ownerId = test?.ownerId || "seed";
    }

    const at = new Date().toISOString();
    const attempt = {
      id: newId("att"),
      testId: args.testId,
      studentId: actor.id,
      ownerId,
      state: "CONSENT_PENDING",
      transitions: [
        { state: "NOT_STARTED", at },
        { state: "CONSENT_PENDING", at },
      ],
      paperSource: source,
      domain,
      testTitle: title,
      durationMins: durationMinutesOf(duration),
      mode,
      violationCount: 0,
      violationsByType: {},
      answers: {},
      pausedMs: 0,
      consented: false,
      clientInfo: args.clientInfo || undefined,
    };
    await ctx.db.insert("examAttempts", attempt);
    return { ok: true, attempt, resumed: false };
  },
});

export const consent = mutation({
  args: { sessionToken: v.string(), attemptId: v.string(), agreed: v.boolean() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (!args.agreed) {
      // "Cancel and go back" before anything was recorded: the attempt row is
      // removed outright so nothing is held against the candidate, and the
      // next "Start Test" begins from NOT_STARTED again.
      if (attempt.state !== "CONSENT_PENDING") throw new Error("The test has already begun.");
      await ctx.db.delete(attempt._id);
      return { ok: true, cancelled: true };
    }
    await ctx.db.insert("examConsents", {
      attemptId: attempt.id,
      testId: attempt.testId,
      studentId: attempt.studentId,
      agreed: true,
      at: new Date().toISOString(),
      noticeText: EXAM.MONITORING_NOTICE,
    });
    const next = await transition(ctx, attempt, "PERMISSIONS_PENDING", "consent_given");
    await ctx.db.patch(next._id, { consented: true });
    return { ok: true, state: next.state };
  },
});

/** The pre-test steps the browser drives: permissions, device check, fullscreen. */
const CLIENT_STATES = ["PERMISSIONS_PENDING", "PERMISSIONS_DENIED", "DEVICE_CHECK", "FULLSCREEN_PENDING"];

export const setState = mutation({
  args: { sessionToken: v.string(), attemptId: v.string(), to: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (!CLIENT_STATES.includes(args.to)) throw new Error(`The browser may not move an attempt to ${args.to}.`);
    if (attempt.state === args.to) return { ok: true, state: attempt.state };
    const next = await transition(ctx, attempt, args.to, args.reason);
    return { ok: true, state: next.state };
  },
});

/**
 * Fullscreen entered: the clock and the recording start now. Returns the
 * sanitised paper — no keys, no explanations.
 */
export const start = mutation({
  args: { sessionToken: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    const paper = await paperFor(ctx, attempt);
    if (!paper.length) throw new Error("This test has no question paper yet.");
    const now = Date.now();
    // The sitting ends when the sitting ends. A candidate who opened the
    // paper late in the joining window gets the time that is left, not a
    // full allowance running past everyone else's finish.
    let deadlineAt = now + (attempt.durationMins || 15) * 60000;
    const test = await findTestByClientId(ctx, attempt.testId);
    const sittingEnds = test ? testEndMs(test, { serverSide: true }) : null;
    if (sittingEnds != null && sittingEnds > now && sittingEnds < deadlineAt) deadlineAt = sittingEnds;
    const next = await transition(ctx, attempt, "IN_PROGRESS", "started");
    await ctx.db.patch(next._id, {
      startedAt: new Date(now).toISOString(),
      deadlineAt,
      lastSeenAt: now,
      questionIds: paper.map((q) => q.id),
    });
    return {
      ok: true,
      startedAt: now,
      serverNow: now,
      deadlineAt,
      questions: paper.map(sanitizeForCandidate),
      config: await configFor(ctx, attempt),
    };
  },
});

/** The live paper again after a reload, with whatever was already answered. */
export const paper = query({
  args: { sessionToken: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (!LIVE_STATES.includes(attempt.state)) return { ok: false, state: attempt.state };
    const questions = (await paperFor(ctx, attempt)).map(sanitizeForCandidate);
    return {
      ok: true,
      state: attempt.state,
      questions,
      answers: attempt.answers || {},
      deadlineAt: attempt.deadlineAt,
      startedAt: attempt.startedAt,
      serverNow: Date.now(),
      violationCount: attempt.violationCount || 0,
      penaltyPoints: attempt.penaltyPoints || 0,
      config: await configFor(ctx, attempt),
    };
  },
});

/* ============================================================
   During the test
   ============================================================ */

export const saveAnswers = mutation({
  args: { sessionToken: v.string(), attemptId: v.string(), answers: v.any() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (!LIVE_STATES.includes(attempt.state)) return { ok: false, state: attempt.state };
    await ctx.db.patch(attempt._id, { answers: args.answers || {} });
    return { ok: true };
  },
});

export const pause = mutation({
  args: { sessionToken: v.string(), attemptId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (attempt.state === "PAUSED_VIOLATION") return { ok: true, state: attempt.state };
    const next = await transition(ctx, attempt, "PAUSED_VIOLATION", args.reason);
    await ctx.db.patch(next._id, { pausedAt: Date.now() });
    return { ok: true, state: next.state };
  },
});

export const resume = mutation({
  args: { sessionToken: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (attempt.state === "IN_PROGRESS") return { ok: true, state: attempt.state, deadlineAt: attempt.deadlineAt };
    const now = Date.now();
    const pausedFor = attempt.pausedAt ? Math.max(0, now - attempt.pausedAt) : 0;
    const next = await transition(ctx, attempt, "IN_PROGRESS", "resumed");
    const deadlineAt = (attempt.deadlineAt || now) + pausedFor;
    await ctx.db.patch(next._id, { pausedAt: null, pausedMs: (attempt.pausedMs || 0) + pausedFor, deadlineAt });
    return { ok: true, state: next.state, deadlineAt, serverNow: now };
  },
});

/**
 * The browser reports what it saw. Violations are counted here — the count
 * the candidate sees on screen is whatever this returns, and hitting the
 * limit submits the paper from here, not from the browser.
 */
export const logEvents = mutation({
  args: {
    sessionToken: v.string(),
    attemptId: v.string(),
    events: v.array(v.object({ type: v.string(), atMs: v.number(), detail: v.optional(v.string()), durationMs: v.optional(v.union(v.number(), v.null())) })),
  },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (isClosed(attempt.state)) return { ok: false, state: attempt.state, violationCount: attempt.violationCount || 0 };

    let violationCount = attempt.violationCount || 0;
    let monitorViolationCount = attempt.monitorViolationCount || 0;
    const byType = { ...(attempt.violationsByType || {}) };
    let fatal = null;
    for (const e of args.events) {
      if (!EXAM.EVENT_TYPES.includes(e.type)) continue;
      await logEvent(ctx, attempt, e.type, e.atMs, e.detail, e.durationMs);
      byType[e.type] = (byType[e.type] || 0) + 1;
      if (EXAM.VIOLATION_TYPES.includes(e.type)) violationCount += 1;
      if (EXAM.MONITOR_VIOLATION_TYPES.includes(e.type)) monitorViolationCount += 1;
      if (!fatal && EXAM.INSTANT_FAIL_TYPES.includes(e.type)) fatal = instantFailReason(e.type);
    }

    const config = await configFor(ctx, attempt);
    const penaltyPoints = violationCount * config.penaltyPerViolation;
    const pointsLeft = Math.max(0, config.totalPoints - penaltyPoints);
    const test = await findTestByClientId(ctx, attempt.testId);
    const patch = { violationCount, monitorViolationCount, violationsByType: byType, penaltyPoints, lastSeenAt: Date.now() };
    if (test?.autoDisqualifyAfter != null && violationCount >= test.autoDisqualifyAfter && !attempt.disqualified) {
      patch.disqualified = true;
      patch.disqualifiedAt = new Date().toISOString();
    }
    await ctx.db.patch(attempt._id, patch);
    const updated = { ...attempt, ...patch };
    const summary = {
      violationCount,
      monitorViolationCount,
      monitorViolationLimit: config.monitorViolationLimit,
      penaltyPerViolation: config.penaltyPerViolation,
      penaltyPoints,
      pointsLeft,
      totalPoints: config.totalPoints,
    };

    // Three ways the attempt ends here, in order of severity: the window was
    // left or closed (over at once); the camera/microphone checks reached
    // the test's limit; the penalties used up the paper (or, for a test with
    // penalties off, the legacy count limit was hit).
    const penaltiesExhausted = config.penaltyPerViolation > 0 && config.totalPoints > 0 && penaltyPoints >= config.totalPoints;
    const legacyLimit = config.penaltyPerViolation === 0 && violationCount >= EXAM.VIOLATION_LIMIT;
    const monitorLimitHit = config.monitorViolationLimit > 0 && monitorViolationCount >= config.monitorViolationLimit;
    if ((fatal || monitorLimitHit || penaltiesExhausted || legacyLimit) && LIVE_STATES.includes(attempt.state)) {
      const lastMs = args.events.length ? args.events[args.events.length - 1].atMs : 0;
      const reason = fatal || (monitorLimitHit ? "monitor_limit_reached" : penaltiesExhausted ? "penalty_limit_reached" : "violation_limit_reached");
      const graded = await autoSubmit(ctx, updated, reason, lastMs);
      return {
        ok: true,
        state: "GRADED",
        ...summary,
        autoSubmitReason: reason,
        disqualified: FAILING_REASONS.includes(reason) || Boolean(patch.disqualified),
        result: graded.result,
        certificate: { status: graded.certificate.status, credential: stripCredential(graded.certificate.credential) },
        assessment: graded.assessment,
      };
    }
    return { ok: true, state: updated.state, ...summary, disqualified: Boolean(updated.disqualified) };
  },
});

/** Hands the paper in — by the candidate, or automatically. */
export const submit = mutation({
  args: {
    sessionToken: v.string(),
    attemptId: v.string(),
    answers: v.any(),
    auto: v.optional(v.boolean()),
    reason: v.optional(v.string()),
    atMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (isClosed(attempt.state)) return { ok: false, state: attempt.state, error: "This paper has already been handed in." };

    await ctx.db.patch(attempt._id, { answers: args.answers || {} });
    const withAnswers = { ...attempt, answers: args.answers || {} };

    if (args.auto) {
      const reason = ["time_up", "fullscreen_timeout", "device_timeout", "device_lost", "window_left", "window_closed"].includes(args.reason) ? args.reason : "time_up";
      const graded = await autoSubmit(ctx, withAnswers, reason, args.atMs || 0);
      return {
        ok: true,
        state: "GRADED",
        autoSubmitReason: reason,
        result: graded.result,
        certificate: { status: graded.certificate.status, credential: stripCredential(graded.certificate.credential) },
        assessment: graded.assessment,
        disqualified: Boolean(attempt.disqualified) || FAILING_REASONS.includes(reason),
      };
    }

    const submitted = await transition(ctx, withAnswers, "SUBMITTED", "submitted_by_candidate");
    const graded = await gradeAttempt(ctx, submitted, args.answers || {});
    return {
      ok: true,
      state: "GRADED",
      result: graded.result,
      certificate: { status: graded.certificate.status, credential: stripCredential(graded.certificate.credential) },
      assessment: graded.assessment,
      disqualified: Boolean(attempt.disqualified),
    };
  },
});

/**
 * "Still here", every EXAM.HEARTBEAT_SECONDS while the paper is open. A
 * paper whose pings stop is a window that was closed without the browser
 * getting a last word in; failAbandonedAttempts closes it from here.
 */
export const heartbeat = mutation({
  args: { sessionToken: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (!LIVE_STATES.includes(attempt.state)) return { ok: false, state: attempt.state };
    await ctx.db.patch(attempt._id, { lastSeenAt: Date.now() });
    return { ok: true };
  },
});

/**
 * The still of the candidate's face taken as the paper opened — what the
 * on-device identity check compares every later frame with. Kept with the
 * recording and shown to the host beside any mismatch.
 */
export const registerReferenceFace = mutation({
  args: { sessionToken: v.string(), attemptId: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    if (attempt.referenceFaceStorageId) return { ok: true, kept: true };
    await ctx.db.patch(attempt._id, { referenceFaceStorageId: args.storageId });
    return { ok: true };
  },
});

/* ============================================================
   Recording upload
   ============================================================ */

export const generateUploadUrl = mutation({
  args: { sessionToken: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    // A chunk that finished just as the paper was handed in may still arrive.
    if (!LIVE_STATES.includes(attempt.state) && !isClosed(attempt.state)) throw new Error("The recording has not started.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerChunk = mutation({
  args: {
    sessionToken: v.string(),
    attemptId: v.string(),
    seq: v.number(),
    storageId: v.id("_storage"),
    startedAtMs: v.number(),
    endedAtMs: v.number(),
    bytes: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { studentOnly: true });
    const { sessionToken, ...chunk } = args;
    await ctx.db.insert("examRecordingChunks", chunk);
    return { ok: true, attemptId: attempt.id };
  },
});

/* ============================================================
   Reading back
   ============================================================ */

export const myAttempt = query({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("examAttempts")
      .withIndex("by_student_test", (q) => q.eq("studentId", actor.id).eq("testId", args.testId))
      .collect();
    const latest = rows.sort((a, b) => b._creationTime - a._creationTime)[0];
    if (!latest) return null;
    const { _id, _creationTime, answers, ...rest } = latest;
    return rest;
  },
});

/**
 * The graded review: the candidate's own answers with the correct answers
 * and explanations. Only for an attempt in GRADED, only for its candidate or
 * the host. An attempt in any other state gets nothing back — not an empty
 * explanation, no field at all.
 */
export const review = query({
  args: { sessionToken: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId);
    if (attempt.state !== "GRADED") return { ok: false, state: attempt.state };
    const paper = await paperFor(ctx, attempt);
    const result = gradePaper(paper, attempt.answers || {});
    const credential = attempt.credentialId
      ? await ctx.db
          .query("credentials")
          .withIndex("by_client_id", (q) => q.eq("id", attempt.credentialId))
          .first()
      : null;
    const { _id, _creationTime, answers, ...rest } = attempt;
    return { ok: true, attempt: rest, result, certificate: { status: attempt.certificateStatus || "not_enabled", credential: stripCredential(credential) } };
  },
});

/** Every sitting of one test — host only. */
export const attemptsForTest = query({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const test = await findTestByClientId(ctx, args.testId);
    if (test && test.ownerId !== actor.id && actor.role !== "admin") throw authError("Only the host of this test can see its attempts.");
    if (!test && !HOST_ROLES.includes(actor.role)) throw authError("Only a test host can see attempts.");
    const rows = await ctx.db
      .query("examAttempts")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .collect();
    const out = [];
    for (const row of rows) {
      if (!test && row.ownerId !== actor.id) continue;
      const student = publicUser(await findUserById(ctx, row.studentId));
      const { _id, _creationTime, answers, ...rest } = row;
      out.push({ ...rest, student: student ? { id: student.id, name: student.name, email: student.email, institution: student.institution } : null });
    }
    return out.sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
  },
});

/**
 * The proctoring report — host only. Recording chunks come back as
 * short-lived storage URLs resolved here, after the ownership check, so
 * there is no address a candidate or another host could construct.
 */
export const report = query({
  args: { sessionToken: v.string(), attemptId: v.string() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { hostOnly: true });
    const student = publicUser(await findUserById(ctx, attempt.studentId));
    const test = await findTestByClientId(ctx, attempt.testId);
    const events = (
      await ctx.db
        .query("examEvents")
        .withIndex("by_attempt", (q) => q.eq("attemptId", attempt.id))
        .collect()
    )
      .map(({ _id, _creationTime, ...e }) => e)
      .sort((a, b) => a.atMs - b.atMs);
    const chunkRows = (
      await ctx.db
        .query("examRecordingChunks")
        .withIndex("by_attempt", (q) => q.eq("attemptId", attempt.id))
        .collect()
    ).sort((a, b) => a.seq - b.seq);
    const chunks = [];
    for (const c of chunkRows) {
      const url = await ctx.storage.getUrl(c.storageId);
      chunks.push({ seq: c.seq, startedAtMs: c.startedAtMs, endedAtMs: c.endedAtMs, bytes: c.bytes, mimeType: c.mimeType, url });
    }

    // Gaps: time inside the sitting that no uploaded chunk covers.
    const gaps = [];
    const endMs = attempt.endedAt && attempt.startedAt ? new Date(attempt.endedAt) - new Date(attempt.startedAt) : null;
    let cursor = 0;
    for (const c of chunks) {
      if (c.startedAtMs > cursor + 1500) gaps.push({ fromMs: cursor, toMs: c.startedAtMs });
      cursor = Math.max(cursor, c.endedAtMs);
    }
    if (endMs != null && endMs > cursor + 1500) gaps.push({ fromMs: cursor, toMs: endMs });

    const consent = await ctx.db
      .query("examConsents")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attempt.id))
      .first();

    const { _id, _creationTime, answers, ...rest } = attempt;
    const referenceFaceUrl = attempt.referenceFaceStorageId ? await ctx.storage.getUrl(attempt.referenceFaceStorageId) : null;
    return {
      ok: true,
      attempt: rest,
      student: student ? { id: student.id, name: student.name, email: student.email, institution: student.institution } : null,
      test: test
        ? { id: test.id, title: test.title, autoDisqualifyAfter: test.autoDisqualifyAfter ?? null, violationPenalty: penaltyFor(test, attempt.totalQuestions || 0), monitorViolationLimit: monitorLimitFor(test) }
        : { id: attempt.testId, title: attempt.testTitle, autoDisqualifyAfter: null, violationPenalty: penaltyFor(null, attempt.totalQuestions || 0), monitorViolationLimit: monitorLimitFor(null) },
      events,
      chunks,
      gaps,
      referenceFaceUrl,
      consentedAt: consent?.at || null,
      retentionDays: EXAM.RETENTION_DAYS,
      violationLimit: EXAM.VIOLATION_LIMIT,
      recordingDeletedAt: attempt.recordingDeletedAt || null,
    };
  },
});

/** The host's manual override on an automatic disqualification. */
export const setDisqualified = mutation({
  args: { sessionToken: v.string(), attemptId: v.string(), disqualified: v.boolean() },
  handler: async (ctx, args) => {
    const { attempt } = await requireAttemptAccess(ctx, args.sessionToken, args.attemptId, { hostOnly: true });
    const at = new Date().toISOString();
    await ctx.db.patch(attempt._id, {
      disqualified: args.disqualified,
      disqualifiedAt: args.disqualified ? attempt.disqualifiedAt || at : attempt.disqualifiedAt || null,
      disqualifyOverriddenAt: args.disqualified ? null : at,
    });
    return { ok: true };
  },
});

/* ============================================================
   Retention
   ============================================================ */

/**
 * Deletes recordings and detailed event logs older than the retention
 * period. Scores, consent records and the attempt's own metadata stay.
 * Scheduled from convex/crons.js; safe to run by hand.
 */
export const purgeExpiredRecordings = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - EXAM.RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const attempts = await ctx.db.query("examAttempts").collect();
    let purged = 0;
    for (const attempt of attempts) {
      if (attempt.recordingDeletedAt) continue;
      const ended = attempt.endedAt ? new Date(attempt.endedAt).getTime() : null;
      if (!ended || ended > cutoff) continue;
      const chunks = await ctx.db
        .query("examRecordingChunks")
        .withIndex("by_attempt", (q) => q.eq("attemptId", attempt.id))
        .collect();
      for (const c of chunks) {
        try {
          await ctx.storage.delete(c.storageId);
        } catch {
          /* already gone */
        }
        await ctx.db.delete(c._id);
      }
      const events = await ctx.db
        .query("examEvents")
        .withIndex("by_attempt", (q) => q.eq("attemptId", attempt.id))
        .collect();
      for (const e of events) await ctx.db.delete(e._id);
      if (attempt.referenceFaceStorageId) {
        try {
          await ctx.storage.delete(attempt.referenceFaceStorageId);
        } catch {
          /* already gone */
        }
      }
      await ctx.db.patch(attempt._id, { recordingDeletedAt: new Date().toISOString(), referenceFaceStorageId: null });
      purged += 1;
    }
    return { purged, retentionDays: EXAM.RETENTION_DAYS };
  },
});

/**
 * A paper whose "still here" pings stopped is a window that was closed
 * (or a machine that died) without the browser reporting it. After
 * EXAM.HEARTBEAT_TIMEOUT_SECONDS of silence the attempt is failed exactly as
 * if the browser had said so. Scheduled from convex/crons.js.
 */
export const failAbandonedAttempts = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - EXAM.HEARTBEAT_TIMEOUT_SECONDS * 1000;
    let failed = 0;
    for (const state of LIVE_STATES) {
      const rows = await ctx.db
        .query("examAttempts")
        .withIndex("by_state", (q) => q.eq("state", state))
        .collect();
      for (const attempt of rows) {
        const seen = attempt.lastSeenAt || (attempt.startedAt ? new Date(attempt.startedAt).getTime() : null);
        if (!seen || seen > cutoff) continue;
        // A candidate paused for a lost camera is still on the page and still
        // pinging; only silence counts.
        await logEvent(ctx, attempt, "WINDOW_CLOSED", elapsedOf(attempt), `No response from the exam room for ${Math.round((Date.now() - seen) / 1000)}s`);
        await autoSubmit(ctx, attempt, "window_closed", elapsedOf(attempt));
        failed += 1;
      }
    }
    return { failed };
  },
});
