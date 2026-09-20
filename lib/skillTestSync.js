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
import { all, currentAccount, saveAll } from "./store";
import { backfill, mergeRemote, pull } from "./remoteSync";

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
    updatedAt: record.updatedAt || undefined,
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
  if (!Array.isArray(remote)) return 0;
  // The demo wall (lib/demoIsolation.js) and the merge rule (lib/mergeRows.js)
  // decide, row by row, exactly as they do for postings. A test is never
  // backfilled: its paper lives only on the server, so a test the server has
  // never seen has no paper and is not a test anyone can sit.
  return mergeRemote("skillTests", remote).changed;
}

/**
 * Certificates: the automatic ones are written on the server when a paper is
 * graded; the manual ones a partner issues by hand are written locally first
 * and mirrored here, with the server deciding the certificate number and the
 * verification code. Pulling both is what lets a student download one from a
 * different device and lets `/verify` recognise it from anywhere.
 */

const HOST_ROLES = ["industry", "academician", "institution", "admin"];

/** Returns the server's { certificateNo, verifyCode, issuedAt } on success, or null. */
export async function mirrorManualCredential(record) {
  if (!canSync() || !record?.id || record.seedId) return null;
  try {
    const result = await convexClient().mutation(api.certificates.issueManual, {
      sessionToken: getSessionToken(),
      id: record.id,
      studentId: record.studentId,
      title: record.title || "Certificate of Achievement",
      kind: record.kind || "Participation",
      testId: record.testId || null,
      score: record.score || null,
      grade: record.grade || null,
      remarks: record.remarks || "",
      issuedAt: record.issuedAt || undefined,
    });
    return result?.ok ? result : null;
  } catch (error) {
    console.warn("[certificates] Could not issue that certificate on the shared database yet:", error?.message || error);
    return null;
  }
}

export async function mirrorRevokeCredential(id) {
  if (!canSync() || !id) return false;
  try {
    await convexClient().mutation(api.certificates.revoke, { sessionToken: getSessionToken(), id });
    return true;
  } catch (error) {
    console.warn("[certificates] Could not revoke that certificate on the shared database yet:", error?.message || error);
    return false;
  }
}

export async function syncRemoteCredentials() {
  if (!canSync()) return 0;
  const account = currentAccount();
  const [mine, issued] = await Promise.all([
    pull("certificates", api.certificates.mine),
    account && HOST_ROLES.includes(account.role) ? pull("certificates", api.certificates.listIssuedByMe) : Promise.resolve([]),
  ]);
  if (!mine && !issued) return 0;
  const { changed, serverIds } = mergeRemote("credentials", [...(mine || []), ...(issued || [])]);
  if (account && HOST_ROLES.includes(account.role)) {
    await backfill("credentials", serverIds, async (row) => {
      const result = await mirrorManualCredential(row);
      if (!result) return false;
      const local = all("credentials");
      const target = local.find((c) => c.id === row.id);
      if (target) {
        Object.assign(target, { certificateNo: result.certificateNo, verifyCode: result.verifyCode });
        saveAll("credentials", local);
      }
      return true;
    });
  }
  return changed;
}
