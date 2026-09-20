"use client";

/**
 * Skill tests between this device and the shared database.
 *
 * The same mirror pattern as lib/postings.js, with one difference that
 * matters: the paper is never in the local store. Questions, their keys and
 * their explanations go straight to Convex (`skillTests.publishTest`) and are
 * only ever read back by the host's editor or a graded attempt's review. The
 * local row carries what a candidate may know — the count and the type mix.
 */

import { api } from "../convex/_generated/api";
import { convexClient, isBackendConfigured } from "./convexBrowser";
import { getSessionToken } from "./session";
import { all, isDemoMode, saveAll } from "./store";
import { broadcastMutation } from "./sync";

const LOCAL_ONLY = new Set(["_id", "_creationTime", "seedId", "questions", "totalMarks", "needsRetagging"]);

function outbound(record) {
  const payload = {};
  Object.entries(record).forEach(([k, value]) => {
    if (LOCAL_ONLY.has(k) || value === undefined) return;
    payload[k] = value;
  });
  return payload;
}

function canSync() {
  return Boolean(isBackendConfigured() && getSessionToken() && convexClient());
}

/**
 * Publishes a test and its paper. Awaited and allowed to throw: a paper that
 * could not reach the server does not exist for candidates, so the host must
 * hear about it rather than see a card that nobody can sit.
 */
export async function publishSkillTest(record, questions) {
  if (!canSync()) throw new Error("You need to be signed in with a connection to publish a test.");
  const {
    id, title, domain, ayushSystem, hostName, mode, duration, price, scheduledAt, scheduledTime, reportingTime, venue,
    description, prerequisites, certification, rules, documentsRequired, meetingLink, status, postedAt,
    proctored, autoDisqualifyAfter, issueCertificate, minCertificateScore,
  } = record;
  return await convexClient().mutation(api.skillTests.publishTest, {
    sessionToken: getSessionToken(),
    id,
    title: title || "Untitled test",
    domain: domain || "General",
    ayushSystem: ayushSystem || undefined,
    hostName: hostName || undefined,
    mode: mode || "Online",
    duration: duration || "15 mins",
    price: Number(price) || 0,
    scheduledAt: scheduledAt || undefined,
    scheduledTime: scheduledTime || undefined,
    reportingTime: reportingTime || undefined,
    venue: venue || undefined,
    description: description || "",
    prerequisites: prerequisites || undefined,
    certification: certification || undefined,
    rules: rules || undefined,
    documentsRequired: documentsRequired || undefined,
    meetingLink: meetingLink || undefined,
    status: status || "Open",
    postedAt: postedAt || new Date().toISOString(),
    proctored: proctored ?? undefined,
    autoDisqualifyAfter: autoDisqualifyAfter ?? null,
    issueCertificate: Boolean(issueCertificate),
    minCertificateScore: minCertificateScore ?? null,
    questions: Array.isArray(questions) ? questions : undefined,
  });
}

/** Pushes an edit (schedule, link, settings, re-tag) to the shared database. */
export async function mirrorSkillTestPatch(id, patch) {
  if (!canSync() || !id) return false;
  try {
    await convexClient().mutation(api.skillTests.updateByClientId, { sessionToken: getSessionToken(), id, patch: outbound(patch) });
    return true;
  } catch (error) {
    console.warn("[skillTests] Could not sync that change yet:", error?.message || error);
    return false;
  }
}

/**
 * Pulls tests published from anywhere into this device's store so every
 * screen that reads the store sees them. Sample rows and demo-persona rows
 * follow the same rules as postings.
 */
export async function syncRemoteSkillTests() {
  if (!isBackendConfigured() || !convexClient()) return 0;
  let remote;
  try {
    remote = await convexClient().query(api.skillTests.listAll, {});
  } catch (error) {
    console.warn("[skillTests] Could not read the shared test list:", error?.message || error);
    return 0;
  }
  if (!Array.isArray(remote) || !remote.length) return 0;

  const local = all("skillTests");
  const byId = new Map(local.map((row) => [row.id, row]));
  let changed = 0;
  const demo = isDemoMode();
  remote.forEach((row) => {
    if (row.ownerId === "seed") return;
    if (!demo && String(row.ownerId || "").startsWith("demo-")) return;
    const id = row.id || row._id;
    if (!id) return;
    const { _id, _creationTime, ...fields } = row;
    const existing = byId.get(id);
    if (!existing) {
      // The tour only ever picks up tests its own personas published — a
      // demo host's paper must reach the demo student on another device.
      if (demo && !String(row.ownerId || "").startsWith("demo-")) return;
      local.push({ ...fields, id });
      changed += 1;
      return;
    }
    const differs = Object.entries(fields).some(([k, value]) => JSON.stringify(existing[k]) !== JSON.stringify(value));
    if (differs) {
      Object.assign(existing, fields);
      changed += 1;
    }
  });
  if (changed) {
    saveAll("skillTests", local);
    broadcastMutation("skillTests", "BATCH", { count: changed });
  }
  return changed;
}

/**
 * Certificates issued automatically on grading are written on the server.
 * Pulling them here is what lets a student download one from a different
 * device, or find it in their portfolio after a retake.
 */
export async function syncRemoteCredentials() {
  if (!canSync()) return 0;
  let remote;
  try {
    remote = await convexClient().query(api.certificates.mine, { sessionToken: getSessionToken() });
  } catch (error) {
    console.warn("[certificates] Could not read issued certificates:", error?.message || error);
    return 0;
  }
  if (!Array.isArray(remote) || !remote.length) return 0;
  const local = all("credentials");
  const byId = new Map(local.map((row) => [row.id, row]));
  let changed = 0;
  remote.forEach((row) => {
    const existing = byId.get(row.id);
    if (!existing) {
      local.push(row);
      changed += 1;
    } else if (JSON.stringify(existing) !== JSON.stringify({ ...existing, ...row })) {
      Object.assign(existing, row);
      changed += 1;
    }
  });
  if (changed) {
    saveAll("credentials", local);
    broadcastMutation("credentials", "BATCH", { count: changed });
  }
  return changed;
}
