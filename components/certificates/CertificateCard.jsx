"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/session";
import { Button } from "../ui/Kit";

/**
 * "Download PDF" for an issued certificate. The file is fetched with the
 * session header (not a bare URL anyone could forward) and handed to the
 * browser as a download, so the same button works today and from the test
 * history months later. Resolves to { nameFallback } — true when the name
 * is in a script the PDF could not print and a Latin or trimmed version was used.
 */
export async function downloadCertificatePdf(credential) {
  const res = await fetch(`/api/certificates/${encodeURIComponent(credential.id)}`, { headers: authHeaders() });
  if (!res.ok) {
    let message = "Could not download the certificate. Please try again.";
    try {
      message = (await res.json()).error || message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(credential.studentName || "certificate").replace(/[^A-Za-z0-9]+/g, "-")}-${String(credential.certificateNo || credential.id).replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { nameFallback: res.headers.get("X-Name-Fallback") === "1" };
}

export default function CertificateCard({ credential, status, minScore, compact = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (status === "below_minimum") {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Certificate not issued — minimum score not met.{minScore != null ? ` (${minScore}% required)` : ""}</div>;
  }
  /* An in-person or hybrid sitting: the mark is in, and the host releases
     the certificates for the whole sitting once it has ended. */
  if (status === "pending_release") {
    return <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">🏅 Your mark is recorded. The host releases certificates for this sitting once it has ended — yours will appear here.</div>;
  }
  if (!credential) return null;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await downloadCertificatePdf(credential);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border border-emerald-200 bg-emerald-50 ${compact ? "px-3.5 py-2.5" : "px-4 py-4"} space-y-2`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-emerald-900">🏅 {credential.title}</div>
          <div className="text-[11px] text-emerald-800">
            Issued by {credential.issuer} · No. {credential.certificateNo}
            {credential.verifyCode ? ` · verify code ${credential.verifyCode}` : ""}
          </div>
        </div>
        <Button size="sm" onClick={download} disabled={busy}>
          {busy ? "Preparing…" : "Download PDF"}
        </Button>
      </div>
      {error && <p className="text-[11px] text-red-600">⚠️ {error}</p>}
    </div>
  );
}
