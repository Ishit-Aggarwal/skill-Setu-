"use client";

/**
 * Keeping postings in sync between this device and the shared database.
 *
 * The bug this exists to fix: a recruiter published an internship, saw it in
 * their own "Your Postings" list, and it never appeared for a student. The
 * posting was not being dropped by a filter or a status flag — it was never
 * leaving the recruiter's browser. Creation wrote to localStorage and stopped
 * there; the Convex `internships` table and its query existed but nothing in
 * the product called them, so the only people who could see a posting were
 * people sharing that browser profile.
 *
 * The fix is a mirror rather than a migration. Local writes stay: they are
 * instant, they survive a flaky connection, and they keep demo mode working
 * with no account at all. Every write is then pushed to the server under the
 * *same record id*, and every read pulls the server's rows back and merges
 * them in. So a posting shows up immediately for the person who made it, and
 * arrives everywhere else on the next load.
 *
 * Nothing here throws into the UI. A posting that cannot be mirrored right now
 * is still a posting; it syncs on the next successful write or read.
 */

import { api } from "../convex/_generated/api";
import { convexClient, isBackendConfigured } from "./convexBrowser";
import { getSessionToken } from "./session";
import { all, saveAll } from "./store";
import { broadcastMutation } from "./sync";

/** Fields the server owns or that are meaningless off-device. */
const LOCAL_ONLY = new Set(["_id", "_creationTime", "seedId", "views", "uniqueViews"]);

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
 * Pushes one posting to the shared database. Fire-and-forget by design — the
 * caller has already written locally and shown the result.
 */
export async function mirrorPosting(record) {
  if (!canSync() || !record?.id) return false;
  try {
    await convexClient().mutation(api.internships.create, {
      sessionToken: getSessionToken(),
      id: record.id,
      title: record.title || "Untitled role",
      company: record.company || "",
      location: record.location || "Remote",
      type: record.type || "Hybrid",
      domain: record.domain || "",
      duration: record.duration || "",
      stipendAmount: record.stipendAmount ?? null,
      stipendMode: record.stipendMode || "monthly",
      stipend: record.stipend || undefined,
      tags: record.tags || [],
      deadline: record.deadline || "",
      description: record.description || "",
      color: record.color || undefined,
      hot: record.hot ?? undefined,
      status: record.status || "Open",
      postedAt: record.postedAt || new Date().toISOString(),
      minSkillScore: record.minSkillScore ?? null,
      eligibleDepartments: record.eligibleDepartments || [],
    });
    return true;
  } catch (error) {
    console.warn("[postings] Could not mirror this posting to the shared database yet:", error?.message || error);
    return false;
  }
}

/** Pushes an edit (including a pause/reopen) to the shared database. */
export async function mirrorPostingPatch(id, patch) {
  if (!canSync() || !id) return false;
  try {
    await convexClient().mutation(api.internships.updateByClientId, {
      sessionToken: getSessionToken(),
      id,
      patch: outbound(patch),
    });
    return true;
  } catch (error) {
    console.warn("[postings] Could not sync that change yet:", error?.message || error);
    return false;
  }
}

/**
 * Pulls postings published from anywhere and merges them into this device's
 * store, so every screen that already reads the store — listings, dashboard,
 * analytics, a mentor's recommend dialog — sees them without changing.
 *
 * Local rows win on fields the server does not own (view counters), and a
 * posting the server has never heard of (offline draft, demo persona with no
 * session) is left exactly where it is rather than being treated as deleted.
 *
 * Returns the number of rows added or changed, so a caller can decide whether
 * a re-render is worth it.
 */
export async function syncRemotePostings() {
  if (!isBackendConfigured() || !convexClient()) return 0;

  let remote;
  try {
    remote = await convexClient().query(api.internships.list, {});
  } catch (error) {
    console.warn("[postings] Could not read the shared postings list:", error?.message || error);
    return 0;
  }
  if (!Array.isArray(remote) || !remote.length) return 0;

  const local = all("internships");
  const byId = new Map(local.map((row) => [row.id, row]));
  let changed = 0;

  remote.forEach((row) => {
    // Sample catalogue rows are seeded per device; pulling the server's copies
    // as well would show every sample posting twice.
    if (row.ownerId === "seed") return;
    const id = row.id || row._id;
    if (!id) return;
    const { _id, _creationTime, ...fields } = row;
    const existing = byId.get(id);

    if (!existing) {
      local.push({ ...fields, id, views: fields.views || 0, uniqueViews: fields.uniqueViews || 0 });
      changed += 1;
      return;
    }

    // View counters are per-device tallies; the server's copy must not
    // overwrite what this browser has counted.
    const { views, uniqueViews, ...serverFields } = fields;
    const differs = Object.entries(serverFields).some(
      ([k, value]) => JSON.stringify(existing[k]) !== JSON.stringify(value)
    );
    if (differs) {
      Object.assign(existing, serverFields);
      changed += 1;
    }
  });

  if (changed) {
    saveAll("internships", local);
    broadcastMutation("internships", "BATCH", { count: changed });
  }
  return changed;
}
