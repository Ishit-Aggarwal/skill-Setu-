import { successorSchedule } from "../../lib/demoSchedule";
import { hasEnded, testStartMs } from "../../lib/testWindow";
import { DEMO_IDS } from "./demoSeed";

/**
 * Keeps the server's sample tests in the future.
 *
 * The demo tour's tests and the sample catalogue from convex/seed.js were
 * dated once, when they were seeded, so a deployment a few weeks old showed
 * nothing but ended exams. When one of them ends, this writes a fresh copy —
 * same paper, same settings, a new date — and retires the old one: it is
 * deleted if nobody registered for or sat it, and kept as history otherwise.
 *
 *   • an open-window test reopens now for the same length of window;
 *   • a fixed sitting moves on by whole weeks, keeping its weekday and time,
 *     to the first slot at least a day away.
 *
 * Runs from the cron in convex/crons.js and on every demo sign-in. Only the
 * sample rows are in scope: tests owned by "seed", and the two rolling demo
 * tests (the past screening behind the demo certificate stays in the past).
 * Anything a real account or a demo visitor published is never touched.
 */

/** Demo tests that roll; a successor's id starts with its family's base id. */
const ROLLING_DEMO_TESTS = [DEMO_IDS.rasaTest, DEMO_IDS.unit3Test];
const DEMO_OWNER = "demo-academician";

function testKey(test) {
  return test.id || String(test._id);
}

function familyOf(test) {
  if (test.ownerId === "seed") return `seed:${test.title}`;
  const id = testKey(test);
  return ROLLING_DEMO_TESTS.find((base) => id === base || id.startsWith(`${base}_r`)) || null;
}

async function isUsed(ctx, key) {
  const registration = await ctx.db
    .query("skillTestRegistrations")
    .withIndex("by_test", (q) => q.eq("testId", key))
    .first();
  if (registration) return true;
  const attempt = await ctx.db
    .query("examAttempts")
    .withIndex("by_test", (q) => q.eq("testId", key))
    .first();
  return !!attempt;
}

/** The community post that announced the old test, if there is one. */
async function announcement(ctx, test, key) {
  if (!test.communityId) return null;
  const posts = await ctx.db
    .query("communityPosts")
    .withIndex("by_community_created", (q) => q.eq("communityId", test.communityId))
    .collect();
  return posts.find((p) => p.testId === key && !p.deletedAt) || null;
}

/** Points the demo student's Resume Coach recommendations at the new test. */
async function repointResumeAnalyses(ctx, fromId, toId) {
  const analyses = await ctx.db
    .query("resumeAnalyses")
    .withIndex("by_student", (q) => q.eq("studentId", "demo-student"))
    .collect();
  for (const row of analyses) {
    const text = JSON.stringify(row.result ?? null);
    if (!text.includes(`"${fromId}"`)) continue;
    await ctx.db.patch(row._id, { result: JSON.parse(text.split(`"${fromId}"`).join(`"${toId}"`)) });
  }
}

async function rollOne(ctx, test, now) {
  const key = testKey(test);
  const family = familyOf(test);
  const base = family.startsWith("seed:") ? "seed_test" : family;
  const newId = `${base}_r${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const at = new Date(now).toISOString();

  const { _id, _creationTime, ...fields } = test;
  await ctx.db.insert("skillTests", {
    ...fields,
    ...successorSchedule(test, now),
    id: newId,
    status: "Open",
    postedAt: at,
    updatedAt: at,
    startedAt: null,
    certificatesReleasedAt: null,
    cancelledAt: null,
  });

  const questions = await ctx.db
    .query("skillTestQuestions")
    .withIndex("by_test", (q) => q.eq("testId", key))
    .collect();
  for (const [i, question] of questions.entries()) {
    const { _id: qid, _creationTime: qct, ...q } = question;
    await ctx.db.insert("skillTestQuestions", { ...q, id: `${newId}_q${i + 1}`, testId: newId, createdAt: at, updatedAt: at });
  }

  const used = await isUsed(ctx, key);
  const post = await announcement(ctx, test, key);
  if (post && !used) {
    // The old test is going, so its announcement now points at the new one.
    await ctx.db.patch(post._id, { testId: newId, createdAt: now });
  } else if (post) {
    const { _id: pid, _creationTime: pct, ...p } = post;
    await ctx.db.insert("communityPosts", { ...p, id: `communityPosts_${newId}`, testId: newId, pinned: false, pinnedAt: null, pinOrder: null, editedAt: null, createdAt: now });
  }
  await repointResumeAnalyses(ctx, key, newId);

  if (!used) {
    for (const question of questions) await ctx.db.delete(question._id);
    const reminders = await ctx.db
      .query("testReminders")
      .withIndex("by_test_user_kind", (q) => q.eq("testId", key))
      .collect();
    for (const r of reminders) await ctx.db.delete(r._id);
    await ctx.db.delete(_id);
  }
  return { from: key, to: newId, kept: used };
}

export async function rollOverDemoTests(ctx, now = Date.now()) {
  const candidates = [
    ...(await ctx.db
      .query("skillTests")
      .withIndex("by_owner", (q) => q.eq("ownerId", "seed"))
      .collect()),
    ...(await ctx.db
      .query("skillTests")
      .withIndex("by_owner", (q) => q.eq("ownerId", DEMO_OWNER))
      .collect()),
  ].filter((t) => familyOf(t) && !t.cancelledAt);

  const families = new Map();
  for (const test of candidates) {
    const family = familyOf(test);
    if (!families.has(family)) families.set(family, []);
    families.get(family).push(test);
  }

  const rolled = [];
  for (const instances of families.values()) {
    // A family with an instance still to come or in progress needs nothing.
    if (instances.some((t) => !hasEnded(t, now, { serverSide: true }))) continue;
    // The most recent instance is the one copied forward; earlier ones that
    // nobody touched are leftovers and go.
    instances.sort((a, b) => (testStartMs(b, { serverSide: true }) ?? 0) - (testStartMs(a, { serverSide: true }) ?? 0));
    const [latest, ...older] = instances;
    rolled.push(await rollOne(ctx, latest, now));
    for (const stale of older) {
      if (await isUsed(ctx, testKey(stale))) continue;
      const questions = await ctx.db
        .query("skillTestQuestions")
        .withIndex("by_test", (q) => q.eq("testId", testKey(stale)))
        .collect();
      for (const question of questions) await ctx.db.delete(question._id);
      await ctx.db.delete(stale._id);
    }
  }
  return { rolled };
}
