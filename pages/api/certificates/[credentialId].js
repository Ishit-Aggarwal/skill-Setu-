import { getConvexClient } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { readSessionToken, unauthorized } from "../../../lib/apiAuth";
import { renderCertificatePdf } from "../../../lib/certificatePdf";
import { CERTIFICATES } from "../../../lib/settings";

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
    const bytes = await renderCertificatePdf({ snapshot, logo, signature });
    const filename = `${(snapshot.studentName || "certificate").replace(/[^A-Za-z0-9]+/g, "-")}-${credential.certificateNo.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error("[certificates] Could not render PDF:", error);
    return res.status(500).json({ success: false, error: "Could not build the PDF right now. Please try again." });
  }
}
