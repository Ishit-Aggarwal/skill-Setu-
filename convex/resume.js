import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { activeCommunityIds } from "./_lib/communityAccess";
import { SKILL_DOMAINS } from "../lib/questionBank";
import { RESUME } from "../lib/settings";
import { ayushSystemLabel } from "../lib/ayush";
import { formatDuration } from "../lib/duration";
import { durationMinutes, isWindowTest, lastStartMs, testPhase, testStartMs } from "../lib/testWindow";
import { clamp100 } from "../lib/resumeAnalysis";

/**
 * Resume Coach, server side.
 *
 * Only the student ever reads their own analyses — no host, institution or
 * company can (there is no query that would let them). `context` is what the
 * AI route sends the model alongside the resume: the student's verified test
 * record and the catalogue of tests they can actually take, gathered here
 * rather than trusted from the browser.
 */

const DAY = 24 * 3600000;

function requireStudent(actor) {
  if (actor.role !== "student" && actor.role !== "admin") throw authError("The Resume Coach is for student accounts.");
}

async function testById(ctx, id) {
  return await ctx.db
    .query("skillTests")
    .withIndex("by_client_id", (q) => q.eq("id", id))
    .first();
}

function when(ms) {
  if (ms == null) return null;
  const d = new Date(ms + 5.5 * 3600000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/** Everything the model is told about the student and what they can take next. */
export const context = query({
  args: { sessionToken: v.string(), internshipId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireStudent(actor);
    const user = actor.user;
    const assessment = await ctx.db
      .query("assessments")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .first();
    const attempts = (
      await ctx.db
        .query("assessmentAttempts")
        .withIndex("by_student", (q) => q.eq("studentId", actor.id))
        .collect()
    )
      .filter((a) => !a.missed)
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
      .slice(0, 10);
    const recent = [];
    for (const a of attempts) {
      const t = await testById(ctx, a.testId);
      recent.push({ testTitle: t?.title || a.domain, domain: a.domain, ayushSystem: t?.ayushSystem ? ayushSystemLabel(t.ayushSystem) : "", score: a.score, failed: Boolean(a.failed), date: String(a.completedAt || "").slice(0, 10) });
    }
    const certificates = (
      await ctx.db
        .query("credentials")
        .withIndex("by_student", (q) => q.eq("studentId", actor.id))
        .collect()
    )
      .filter((c) => !c.revokedAt)
      .map((c) => ({ title: c.title, issuer: c.issuer, score: c.score || null, issuedAt: String(c.issuedAt || "").slice(0, 10) }));

    // The catalogue: public tests plus this student's community tests, still takeable.
    const memberOf = await activeCommunityIds(ctx, actor.id);
    // Tests already sat, and registrations that were withdrawn, are not "next".
    const sat = new Set(
      (
        await ctx.db
          .query("assessmentAttempts")
          .withIndex("by_student", (q) => q.eq("studentId", actor.id))
          .collect()
      ).map((a) => a.testId)
    );
    const withdrawn = new Set(
      (
        await ctx.db
          .query("skillTestRegistrations")
          .withIndex("by_user", (q) => q.eq("userId", actor.id))
          .collect()
      )
        .filter((r) => r.cancelledAt)
        .map((r) => r.testId)
    );
    const now = Date.now();
    const catalogue = [];
    for (const t of await ctx.db.query("skillTests").collect()) {
      if (t.cancelledAt || sat.has(t.id) || withdrawn.has(t.id)) continue;
      if (t.audience === "community" && !memberOf.has(t.communityId)) continue;
      if (String(t.ownerId || "").startsWith("demo-") !== String(actor.id).startsWith("demo-")) continue;
      const phase = testPhase(t, now, { serverSide: true });
      if (phase === "ended" || phase === "unscheduled") continue;
      if (phase === "locked" && isWindowTest(t)) continue;
      const window = isWindowTest(t);
      catalogue.push({
        testId: t.id,
        title: t.title,
        domain: t.domain,
        ayushSystem: t.ayushSystem ? ayushSystemLabel(t.ayushSystem) : "",
        schedule: window ? `Open window — start before ${when(lastStartMs(t, { serverSide: true }))}` : `Fixed sitting — ${when(testStartMs(t, { serverSide: true }))}`,
        startsAtMs: window ? lastStartMs(t, { serverSide: true }) : testStartMs(t, { serverSide: true }),
        duration: formatDuration(durationMinutes(t)),
        questionCount: t.questionCount || 0,
        community: t.audience === "community" ? t.communityName || "your community" : null,
        price: t.price || 0,
        mode: t.mode,
      });
    }

    const portfolio = await ctx.db
      .query("portfolios")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .first();

    let target = null;
    if (args.internshipId) {
      const posting = await ctx.db
        .query("internships")
        .filter((q) => q.eq(q.field("id"), args.internshipId))
        .first();
      if (posting && String(posting.ownerId || "").startsWith("demo-") === String(actor.id).startsWith("demo-")) {
        target = { internshipId: posting.id, title: posting.title, company: posting.company, skills: posting.tags || [], description: String(posting.description || "").slice(0, 2000), domain: posting.domain };
      }
    }

    return {
      profile: { name: user.name || "", course: user.course || "", year: user.year || "", institution: user.institution || user.instituteName || "", ayushSystem: user.ayushSystem ? ayushSystemLabel(user.ayushSystem) : "", department: user.department || "" },
      verified: assessment?.domainScores || {},
      recent,
      certificates,
      catalogue,
      skillDomains: SKILL_DOMAINS,
      portfolio: portfolio ? { headline: portfolio.headline, bio: portfolio.bio, education: portfolio.education, skillBadges: portfolio.skillBadges, projects: portfolio.projects, timeline: portfolio.timeline, certifications: portfolio.certifications } : null,
      target,
    };
  },
});

async function deleteAnalysisRow(ctx, row) {
  const progress = await ctx.db
    .query("studyPlanProgress")
    .withIndex("by_analysis", (q) => q.eq("analysisId", row.id))
    .collect();
  for (const p of progress) await ctx.db.delete(p._id);
  await ctx.db.delete(row._id);
}

/** A resume file is removed from storage once no remaining analysis uses it. */
async function dropFileIfUnused(ctx, studentId, storageId) {
  if (!storageId) return;
  const rows = await ctx.db
    .query("resumeAnalyses")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  if (rows.some((r) => r.resumeStorageId === storageId)) return;
  try {
    await ctx.storage.delete(storageId);
  } catch {
    /* already gone */
  }
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .first();
  if (upload) await ctx.db.delete(upload._id);
}

/**
 * Stores an analysis the API route has validated. What could matter to
 * anyone else is re-checked here against the database, so a direct call
 * cannot plant it: every recommended test must be a real test this student
 * can see, and every number is clamped. Only the last RESUME.HISTORY_KEPT are
 * kept.
 */
export const saveAnalysis = mutation({
  args: {
    sessionToken: v.string(),
    resumeStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    resumeFileName: v.optional(v.union(v.string(), v.null())),
    source: v.string(),
    target: v.optional(v.any()),
    result: v.any(),
    model: v.optional(v.string()),
    consentAt: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireStudent(actor);
    if (args.resumeStorageId) {
      const upload = await ctx.db
        .query("uploads")
        .withIndex("by_storage", (q) => q.eq("storageId", args.resumeStorageId))
        .first();
      if (!upload || upload.ownerId !== actor.id) throw authError("That resume isn't one of your uploads.");
    }
    const result = args.result && typeof args.result === "object" ? { ...args.result } : {};
    const memberOf = await activeCommunityIds(ctx, actor.id);
    const visible = async (id) => {
      const t = id ? await testById(ctx, id) : null;
      return Boolean(t && !t.cancelledAt && (t.audience !== "community" || memberOf.has(t.communityId)));
    };
    const tests = [];
    for (const t of Array.isArray(result.nextTests) ? result.nextTests.slice(0, 3) : []) {
      if (await visible(t?.testId)) tests.push({ ...t, readinessNow: clamp100(t.readinessNow), priority: Math.max(1, Math.min(3, Math.round(Number(t.priority) || 1))) });
    }
    result.nextTests = tests;
    if (result.studyPlan?.topics) {
      const topics = [];
      for (const t of result.studyPlan.topics.slice(0, 20)) topics.push({ ...t, forTestId: (await visible(t.forTestId)) ? t.forTestId : null });
      result.studyPlan = { ...result.studyPlan, topics };
    }
    result.domainReadiness = (result.domainReadiness || []).filter((d) => SKILL_DOMAINS.includes(d?.domain)).map((d) => ({ ...d, resumeSignal: clamp100(d.resumeSignal), verifiedScore: d.verifiedScore == null ? null : clamp100(d.verifiedScore) }));
    const now = Date.now();
    const id = `resume_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await ctx.db.insert("resumeAnalyses", {
      id,
      studentId: actor.id,
      resumeStorageId: args.resumeStorageId || null,
      resumeFileName: args.resumeFileName || null,
      source: args.source === "portfolio" ? "portfolio" : "upload",
      target: args.target || null,
      result,
      model: args.model || undefined,
      consentAt: args.consentAt,
      createdAt: now,
      expiresAt: now + RESUME.RETENTION_DAYS * DAY,
    });
    const all = await ctx.db
      .query("resumeAnalyses")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .order("desc")
      .collect();
    for (const old of all.slice(RESUME.HISTORY_KEPT)) {
      await deleteAnalysisRow(ctx, old);
      await dropFileIfUnused(ctx, actor.id, old.resumeStorageId);
    }
    return { ok: true, id };
  },
});

/** The student's analyses, newest first, with their study-plan ticks. */
export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireStudent(actor);
    const rows = await ctx.db
      .query("resumeAnalyses")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .order("desc")
      .take(RESUME.HISTORY_KEPT);
    const out = [];
    for (const r of rows) {
      const progress = await ctx.db
        .query("studyPlanProgress")
        .withIndex("by_analysis", (q) => q.eq("analysisId", r.id))
        .collect();
      const { _id, _creationTime, resumeStorageId, ...rest } = r;
      out.push({ ...rest, hasFile: Boolean(resumeStorageId), done: Object.fromEntries(progress.filter((p) => p.done).map((p) => [p.topicId, p.doneAt || true])) });
    }
    return out;
  },
});

export const setTopicDone = mutation({
  args: { sessionToken: v.string(), analysisId: v.string(), topicId: v.string(), done: v.boolean() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const analysis = await ctx.db
      .query("resumeAnalyses")
      .withIndex("by_client_id", (q) => q.eq("id", args.analysisId))
      .first();
    if (!analysis || analysis.studentId !== actor.id) throw new Error("That analysis no longer exists.");
    const row = await ctx.db
      .query("studyPlanProgress")
      .withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId).eq("topicId", args.topicId))
      .first();
    const patch = { done: args.done, doneAt: args.done ? Date.now() : null };
    if (row) await ctx.db.patch(row._id, patch);
    else await ctx.db.insert("studyPlanProgress", { studentId: actor.id, analysisId: args.analysisId, topicId: args.topicId, ...patch });
    return { ok: true };
  },
});

/** Deletes every analysis and resume file the student holds. */
export const deleteAll = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    requireStudent(actor);
    const rows = await ctx.db
      .query("resumeAnalyses")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .collect();
    const files = new Set(rows.map((r) => r.resumeStorageId).filter(Boolean));
    for (const r of rows) await deleteAnalysisRow(ctx, r);
    for (const f of files) await dropFileIfUnused(ctx, actor.id, f);
    // Resume uploads that never became an analysis go too.
    const uploads = await ctx.db
      .query("uploads")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .collect();
    for (const u of uploads.filter((u) => u.purpose === "resume")) {
      try {
        await ctx.storage.delete(u.storageId);
      } catch {
        /* already gone */
      }
      await ctx.db.delete(u._id);
    }
    return { ok: true, deleted: rows.length };
  },
});

/** Nightly: analyses past their retention date, and their files, are deleted. */
export const purgeExpired = internalMutation({
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("resumeAnalyses")
      .withIndex("by_expires", (q) => q.lt("expiresAt", Date.now()))
      .take(200);
    for (const r of rows) {
      await deleteAnalysisRow(ctx, r);
      await dropFileIfUnused(ctx, r.studentId, r.resumeStorageId);
    }
    return { purged: rows.length };
  },
});
