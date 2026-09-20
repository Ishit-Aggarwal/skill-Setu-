import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";
import { resolveBranding } from "./_lib/certificates";
import { findTestByClientId } from "./_lib/tests";
import { CERTIFICATES } from "../lib/settings";

/**
 * Certificate branding and issued certificates.
 *
 * Two branding records exist per host at most: the reusable default
 * (certificateSettings) and, per test, a complete one-off override
 * (certificateOverrides). Issued certificates never read either again —
 * they carry a snapshot (see _lib/certificates.js).
 */

const HOST_ROLES = ["industry", "academician", "institution", "admin"];

const BRANDING_FIELDS = {
  logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  signatureStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  institutionName: v.string(),
  professorName: v.string(),
  professorTitle: v.string(),
  programName: v.optional(v.string()),
  title: v.optional(v.string()),
  design: v.optional(v.any()),
};

function requireBranding(fields) {
  const missing = [];
  if (!fields.logoStorageId) missing.push("logo");
  if (!fields.signatureStorageId) missing.push("signature");
  if (!String(fields.institutionName || "").trim()) missing.push("institution name");
  if (!String(fields.professorName || "").trim()) missing.push("professor name");
  if (!String(fields.professorTitle || "").trim()) missing.push("professor title");
  if (missing.length) throw new Error(`Certificate branding needs a ${missing.join(", ")} before it can be saved.`);
}

async function withUrls(ctx, branding) {
  if (!branding) return null;
  const { _id, _creationTime, ...rest } = branding;
  return {
    ...rest,
    logoUrl: branding.logoStorageId ? await ctx.storage.getUrl(branding.logoStorageId) : null,
    signatureUrl: branding.signatureStorageId ? await ctx.storage.getUrl(branding.signatureStorageId) : null,
  };
}

async function requireHost(ctx, sessionToken) {
  const actor = await requireActor(ctx, sessionToken);
  if (!HOST_ROLES.includes(actor.role)) throw authError("Only a test host can manage certificate branding.");
  return actor;
}

/* ---------------- uploads ---------------- */

export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    await requireHost(ctx, args.sessionToken);
    return await ctx.storage.generateUploadUrl();
  },
});

/* ---------------- default branding (Section 4.1) ---------------- */

export const mySettings = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireHost(ctx, args.sessionToken);
    const row = await ctx.db
      .query("certificateSettings")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .first();
    return await withUrls(ctx, row);
  },
});

export const saveSettings = mutation({
  args: { sessionToken: v.string(), ...BRANDING_FIELDS },
  handler: async (ctx, args) => {
    const actor = await requireHost(ctx, args.sessionToken);
    const { sessionToken, ...fields } = args;
    requireBranding(fields);
    const row = { ...fields, ownerId: actor.id, title: fields.title || CERTIFICATES.DEFAULT_TITLE, savedAt: new Date().toISOString() };
    const existing = await ctx.db
      .query("certificateSettings")
      .withIndex("by_owner", (q) => q.eq("ownerId", actor.id))
      .first();
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("certificateSettings", row);
    return { ok: true };
  },
});

/* ---------------- per-test override (Section 4.3) ---------------- */

export const overrideForTest = query({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireHost(ctx, args.sessionToken);
    const row = await ctx.db
      .query("certificateOverrides")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .first();
    if (row && row.ownerId !== actor.id && actor.role !== "admin") throw authError("That test belongs to another host.");
    return await withUrls(ctx, row);
  },
});

export const saveOverride = mutation({
  args: { sessionToken: v.string(), testId: v.string(), ...BRANDING_FIELDS },
  handler: async (ctx, args) => {
    const actor = await requireHost(ctx, args.sessionToken);
    const { sessionToken, testId, ...fields } = args;
    requireBranding(fields);
    const test = await findTestByClientId(ctx, testId);
    if (test && test.ownerId !== actor.id && actor.role !== "admin") throw authError("That test belongs to another host.");
    const row = { ...fields, testId, ownerId: actor.id, title: fields.title || CERTIFICATES.DEFAULT_TITLE, savedAt: new Date().toISOString() };
    const existing = await ctx.db
      .query("certificateOverrides")
      .withIndex("by_test", (q) => q.eq("testId", testId))
      .first();
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("certificateOverrides", row);
    return { ok: true };
  },
});

export const clearOverride = mutation({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireHost(ctx, args.sessionToken);
    const existing = await ctx.db
      .query("certificateOverrides")
      .withIndex("by_test", (q) => q.eq("testId", args.testId))
      .first();
    if (!existing) return { ok: true };
    if (existing.ownerId !== actor.id && actor.role !== "admin") throw authError("That test belongs to another host.");
    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

/** What a given test would print with right now: override in full, else the default. */
export const brandingForTest = query({
  args: { sessionToken: v.string(), testId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireHost(ctx, args.sessionToken);
    const test = (await findTestByClientId(ctx, args.testId)) || { id: args.testId, ownerId: actor.id };
    if (test.ownerId !== actor.id && actor.role !== "admin") throw authError("That test belongs to another host.");
    const { source, branding } = await resolveBranding(ctx, test);
    return { source, branding: await withUrls(ctx, branding) };
  },
});

/* ---------------- issued certificates ---------------- */

function publicCredential(row) {
  if (!row) return null;
  const { _id, _creationTime, snapshot, ...rest } = row;
  return rest;
}

/** The signed-in student's own certificates (for the portfolio and test history). */
export const mine = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const rows = await ctx.db
      .query("credentials")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .collect();
    return rows.map(publicCredential).sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  },
});

/**
 * Everything needed to draw one certificate: the frozen snapshot plus
 * resolved image URLs. Only its student or its issuer may fetch it.
 */
export const forRender = query({
  args: { sessionToken: v.string(), credentialId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const row = await ctx.db
      .query("credentials")
      .withIndex("by_client_id", (q) => q.eq("id", args.credentialId))
      .first();
    if (!row) return null;
    if (row.studentId !== actor.id && row.issuerId !== actor.id && actor.role !== "admin") throw authError("This certificate is not yours to open.");
    const snapshot = row.snapshot || null;
    const { _id, _creationTime, ...rest } = row;
    return {
      ...rest,
      snapshot,
      logoUrl: snapshot?.logoStorageId ? await ctx.storage.getUrl(snapshot.logoStorageId) : null,
      signatureUrl: snapshot?.signatureStorageId ? await ctx.storage.getUrl(snapshot.signatureStorageId) : null,
    };
  },
});

/** Public verification: the code on the certificate → who, what, score, issuer. Nothing else. */
export const verify = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = String(args.code || "").trim().toUpperCase();
    if (!code) return null;
    const row = await ctx.db
      .query("credentials")
      .withIndex("by_verify_code", (q) => q.eq("verifyCode", code))
      .first();
    if (!row) return null;
    return {
      valid: !row.revokedAt,
      revokedAt: row.revokedAt || null,
      studentName: row.studentName,
      title: row.title,
      testTitle: row.testTitle || row.title,
      score: row.score || null,
      issuer: row.issuer,
      certificateNo: row.certificateNo,
      issuedAt: row.issuedAt,
    };
  },
});
