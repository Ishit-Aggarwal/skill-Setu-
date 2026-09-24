import { getConvexClient } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { readSessionToken, unauthorized } from "../../../lib/apiAuth";
import { renderCertificatePdf } from "../../../lib/certificatePdf";
import { CERTIFICATES } from "../../../lib/settings";
import { scriptOf } from "../../../lib/credentials";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * GET /api/certificates/<credentialId> → the certificate as a PDF.
 *
 * The caller must be the student who earned it or the host who issued it
 * (checked by `certificates.forRender`). The PDF is drawn from the frozen
 * snapshot every time, so it is identical on every download regardless of
 * what the host's branding looks like today.
 */

async function fetchImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") || "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > CERTIFICATES.IMAGE_MAX_BYTES) return null;
    return { bytes, mimeType };
  } catch {
    return null;
  }
}

const FONT_FILES = {
  devanagari: "NotoSansDevanagari-Regular.ttf",
  arabic: "NotoNaskhArabic-Regular.ttf",
  tamil: "NotoSansTamil-Regular.ttf",
  tibetan: "NotoSerifTibetan-Regular.ttf",
};

/** The site address printed on the certificate: the configured one, else this request's own host. */
function siteUrlFor(req) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0] || (req.socket?.encrypted ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  return host ? `${proto}://${host}` : "";
}

/**
 * The Noto fonts the snapshot's texts need (public/fonts), read from disk
 * where the server has the folder, otherwise fetched from this site.
 */
async function fontsFor(snapshot, siteUrl) {
  const texts = [snapshot.studentName, snapshot.institutionName, snapshot.programName, snapshot.professorName, snapshot.professorTitle, snapshot.title, snapshot.studentInstitution, snapshot.testTitle, snapshot.course];
  const scripts = new Set(texts.map(scriptOf).filter((s) => s && FONT_FILES[s]));
  const out = {};
  for (const script of scripts) {
    const file = FONT_FILES[script];
    try {
      out[script] = new Uint8Array(await fs.readFile(path.join(process.cwd(), "public", "fonts", file)));
    } catch {
      try {
        const r = await fetch(`${siteUrl}/fonts/${file}`);
        if (r.ok) out[script] = new Uint8Array(await r.arrayBuffer());
      } catch {
        /* the renderer falls back to a Latin spelling */
      }
    }
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed." });
  const sessionToken = readSessionToken(req);
  if (!sessionToken) return unauthorized(res);
  const convex = getConvexClient();
  if (!convex) return res.status(503).json({ success: false, error: "Account database unavailable." });

  let credential;
  try {
    credential = await convex.query(api.certificates.forRender, { sessionToken, credentialId: String(req.query.credentialId || "") });
  } catch (error) {
    return res.status(403).json({ success: false, error: "This certificate is not yours to open." });
  }
  if (!credential) return res.status(404).json({ success: false, error: "Certificate not found." });
  if (credential.revokedAt) return res.status(410).json({ success: false, error: "This certificate has been revoked." });

  const snapshot = {
    ...(credential.snapshot || {}),
    studentName: credential.snapshot?.studentName || credential.studentName,
    testTitle: credential.snapshot?.testTitle || credential.title,
    scorePercent: credential.snapshot?.scorePercent ?? credential.scorePercent ?? null,
    completedAt: credential.snapshot?.completedAt || credential.issuedAt,
    institutionName: credential.snapshot?.institutionName || credential.issuer,
    certificateNo: credential.certificateNo,
    verifyCode: credential.verifyCode,
  };

  try {
    const [logo, signature] = await Promise.all([fetchImage(credential.logoUrl), fetchImage(credential.signatureUrl)]);
    const siteUrl = siteUrlFor(req);
    const fonts = await fontsFor(snapshot, siteUrl);
    const { bytes, nameFallback } = await renderCertificatePdf({ snapshot, logo, signature, siteUrl, fonts });
    if (nameFallback) res.setHeader("X-Name-Fallback", "1");
    const filename = `${(snapshot.studentNameLatin || snapshot.studentName || "certificate").replace(/[^A-Za-z0-9]+/g, "-")}-${credential.certificateNo.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error("[certificates] Could not render PDF:", error);
    return res.status(500).json({ success: false, error: "Could not build the PDF right now. Please try again." });
  }
}
