"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { applyCredentialDisplay, getCredential } from "../../../lib/store";
import { subscribeToMutations } from "../../../lib/sync";
import { formatDate } from "../../../lib/match";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuerySafe } from "../../../lib/convexBrowser";
import { certificateDetails, linkedInAddUrl, scriptOf, verifyUrl } from "../../../lib/credentials";
import { CERTIFICATES } from "../../../lib/settings";
import { downloadCertificatePdf } from "../../../components/certificates/CertificateCard";

const KIND_LINE = {
  "Skill Test": "for successfully completing the assessment",
  Internship: "for successfully completing the internship",
  Training: "for successfully completing the training programme",
  Merit: "in recognition of outstanding performance in",
  Participation: "for participating in",
};

/** The site's own address for the verify link: the configured one, else this origin. */
function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return typeof window !== "undefined" ? window.location.origin : "";
}

/**
 * A preview of an issued credential and what its student can do with it:
 * download the PDF (drawn on the server from the frozen snapshot), copy the
 * verification link, add it to LinkedIn, and choose whether it shows on their
 * portfolio and public profile, and whether it is featured. The student can
 * never change what the certificate says.
 */
export default function CredentialCertificatePage({ params }) {
  // Next 14 hands a client page a plain params object; Next 15 hands it a
  // promise. Calling use() on the plain object throws "unsupported type", so
  // only unwrap when it actually is thenable.
  const { credentialId } = typeof params?.then === "function" ? use(params) : params;
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [, setTick] = useState(0);
  // The server's row (undefined while loading): the snapshot for the preview,
  // and the certificate itself on a device that has not synced it yet.
  const [remote, setRemote] = useState(undefined);
  const [busy, setBusy] = useState(null);
  const [flash, setFlash] = useState(null);
  const [nameFallback, setNameFallback] = useState(false);

  useEffect(() => {
    setReady(true);
    const unsub = subscribeToMutations(["credentials"], () => setTick((t) => t + 1));
    // The frozen snapshot carries the candidate's details for the preview;
    // only the student and the issuer may read it, and it is optional here.
    backendQuerySafe(api.certificates.forRender, { credentialId }, null).then((r) => setRemote(r || null));
    return unsub;
  }, [credentialId]);

  const local = ready ? getCredential(credentialId) : null;
  // This device's copy carries the display choices just made here; the
  // server's fills in whatever has not synced yet.
  const credential = local ? { ...remote, ...local } : remote || null;
  const snapshot = remote?.snapshot || null;

  if (!ready || (!local && remote === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading certificate…</p>
        </div>
      </div>
    );
  }


  if (!credential) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✕</div>
          <h1 className="text-lg font-semibold text-foreground">Certificate not found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No credential matches the id{" "}
            <code className="font-mono text-[11px] bg-secondary px-1 py-0.5 rounded">{credentialId}</code>.
          </p>
          <Link
            href="/portfolio"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-accent text-white px-5 py-2 rounded-xl text-xs font-medium transition-colors"
          >
            ← Back to portfolio
          </Link>
        </div>
      </div>
    );
  }

  const revoked = Boolean(credential.revokedAt);
  const isOwner = Boolean(user && user.id === credential.studentId);
  const displayName = snapshot?.studentName || credential.studentName;
  const details = snapshot?.testTitle ? certificateDetails(snapshot, KIND_LINE[credential.kind] || "for successfully completing") : null;
  const link = credential.verifyCode ? verifyUrl(siteOrigin(), credential.verifyCode) : null;
  const shown = credential.showOnProfile !== false;
  const featured = Boolean(credential.featured);
  // A name in a script with no bundled font prints trimmed; say so before the
  // student finds out from the PDF.
  const unprintable = nameFallback || scriptOf(displayName) === "other";

  function say(kind, text) {
    setFlash({ kind, text });
    setTimeout(() => setFlash(null), 3500);
  }

  async function download() {
    setBusy("download");
    try {
      const out = await downloadCertificatePdf(credential);
      if (out?.nameFallback) setNameFallback(true);
    } catch (err) {
      say("error", err.message);
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      say("ok", "Verification link copied.");
    } catch {
      say("error", `Could not copy. The link is ${link}`);
    }
  }

  async function setDisplay(patch) {
    setBusy("display");
    try {
      await backendMutation(api.certificates.setDisplay, { id: credential.id, ...patch });
      applyCredentialDisplay(credential.id, patch);
      setRemote((await backendQuerySafe(api.certificates.forRender, { credentialId }, null)) || remote);
      say(
        "ok",
        patch.featured === true
          ? "Featured on your portfolio."
          : patch.featured === false
            ? "No longer featured."
            : patch.showOnProfile
              ? "Shown on your portfolio and profile."
              : "Hidden from your portfolio and profile."
      );
    } catch (err) {
      say("error", backendErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30 p-4 sm:p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-card border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm"
          >
            ← Back to portfolio
          </Link>
          <span className="text-xs text-muted-foreground hidden sm:inline">Issued credential · Digital record</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!revoked && (isOwner || user?.id === credential.issuerId) && (
            <button
              onClick={download}
              disabled={busy === "download"}
              className="inline-flex items-center gap-2 bg-primary hover:bg-accent text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-colors disabled:opacity-60"
            >
              {busy === "download" ? "Preparing…" : "⬇ Download PDF"}
            </button>
          )}
          {!revoked && link && (
            <button onClick={copyLink} className="inline-flex items-center gap-1.5 bg-card border border-border hover:bg-secondary px-3 py-2 rounded-xl text-xs font-medium text-foreground transition-colors">
              🔗 Copy verification link
            </button>
          )}
          {!revoked && isOwner && link && (
            <a
              href={linkedInAddUrl({ title: credential.title, issuer: credential.issuer, issuedAt: credential.issuedAt, verifyLink: link, certificateNo: credential.certificateNo })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              Share to LinkedIn
            </a>
          )}
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 bg-card border border-border hover:bg-secondary px-3 py-2 rounded-xl text-xs font-medium text-foreground transition-colors">
            Print
          </button>
        </div>
      </header>

      {flash && (
        <div
          role="status"
          className={`w-full max-w-4xl mb-4 rounded-xl border px-4 py-2.5 text-xs no-print ${flash.kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {flash.text}
        </div>
      )}

      {isOwner && !revoked && (
        <section className="w-full max-w-4xl mb-4 rounded-2xl border border-border bg-card px-4 py-3 no-print flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input type="checkbox" checked={shown} disabled={busy === "display"} onChange={(e) => setDisplay({ showOnProfile: e.target.checked })} className="w-4 h-4 accent-primary" />
            Show on my portfolio &amp; public profile
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input type="checkbox" checked={featured} disabled={busy === "display"} onChange={(e) => setDisplay({ featured: e.target.checked })} className="w-4 h-4 accent-primary" />
            ⭐ Featured <span className="text-muted-foreground">(up to {CERTIFICATES.MAX_FEATURED}, shown first)</span>
          </label>
          {!credential.verifyCode && <span className="text-[11px] text-muted-foreground">The verification code is being confirmed…</span>}
        </section>
      )}

      {isOwner && unprintable && (
        <div className="w-full max-w-4xl mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 no-print">
          Your name contains characters our PDF font can&apos;t print yet; add an English spelling in{" "}
          <Link href="/settings?tab=account" className="underline font-medium">
            Settings → Name on certificates
          </Link>
          . Certificates already issued keep the name they were issued with.
        </div>
      )}

      {revoked && (
        <div className="w-full max-w-4xl mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 no-print">
          This certificate was revoked by {credential.issuer} on {formatDate(credential.revokedAt)}. It is no longer valid.
        </div>
      )}

      <main className="certificate-container w-full max-w-4xl bg-card border-8 border-double border-primary/40 rounded-3xl p-8 sm:p-14 shadow-xl text-center relative overflow-hidden print:p-10 print:border-4 print:shadow-none print:m-0 print:w-full">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <img src="/logo.png" alt="" className="w-2/3 max-w-xl object-contain grayscale mix-blend-multiply" />
        </div>

        <div className="relative z-10 space-y-3 mb-8">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo.png" alt="Skill Setu" className="h-9 sm:h-11 w-auto brand-logo" />
          </div>
          <p className="text-[10px] sm:text-xs tracking-[0.25em] text-muted-foreground uppercase font-semibold">
            Academia–Industry Collaboration Platform
          </p>
          <div className="h-0.5 w-24 bg-primary/60 mx-auto mt-2" />
        </div>

        <div className="relative z-10 mb-6">
          <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest block mb-1">
            {credential.kind}
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
            {credential.kind === "Merit" ? "Certificate of Merit" : "Certificate of Achievement"}
          </h1>
        </div>

        <div className="relative z-10 my-8 space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground italic font-serif">This is proudly presented to</p>
          <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight underline decoration-primary/30 decoration-2 underline-offset-8">
            {displayName}
          </div>
        </div>

        {details ? (
          <div className="relative z-10 max-w-2xl mx-auto my-6 text-xs sm:text-sm text-foreground/80 leading-relaxed">
            {details}
            <div className="mt-2">
              awarded by <span className="font-medium text-foreground">{credential.issuer}</span>
              {snapshot?.programName ? <> · {snapshot.programName}</> : null}
            </div>
            {credential.remarks && <p className="mt-3 text-xs text-muted-foreground italic max-w-xl mx-auto">{credential.remarks}</p>}
          </div>
        ) : (
        <div className="relative z-10 max-w-2xl mx-auto my-6 text-xs sm:text-sm text-foreground/80 leading-relaxed">
          {KIND_LINE[credential.kind] || "in recognition of"}
          <div className="font-semibold text-sm sm:text-base my-2 font-serif text-primary">“{credential.title}”</div>
          awarded by <span className="font-medium text-foreground">{credential.issuer}</span>
          {credential.score ? (
            <>
              {" "}
              with a score of <span className="font-semibold text-foreground">{credential.score}</span>
            </>
          ) : null}
          {credential.grade ? (
            <>
              {" "}
              (grade <span className="font-semibold text-foreground">{credential.grade}</span>)
            </>
          ) : null}
          .
          {credential.remarks && (
            <p className="mt-3 text-xs text-muted-foreground italic max-w-xl mx-auto">{credential.remarks}</p>
          )}
        </div>
        )}

        <div className="relative z-10 pt-10 mt-10 border-t border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
          <div className="text-left space-y-1 sm:space-y-1.5 order-2 sm:order-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Certificate No.</div>
            <div className="text-xs font-mono font-bold text-foreground">{credential.certificateNo}</div>
            <div className="text-[10px] text-muted-foreground">Issued: {formatDate(credential.issuedAt)}</div>
            {credential.verifyCode && (
              <div className="text-[10px] text-muted-foreground">
                Verification code: <span className="font-mono font-semibold text-foreground">{credential.verifyCode}</span>
              </div>
            )}
            <div
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md mt-1 border ${
                revoked ? "text-red-700 bg-red-50 border-red-200" : "text-green-700 bg-green-50 border-green-200"
              }`}
            >
              {revoked ? "✕ Revoked" : "✓ Verified credential"}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center order-1 sm:order-2 my-2 sm:my-0">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center text-primary text-xl font-serif bg-primary/5 shadow-inner">
              🏅
            </div>
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase mt-1">Official seal</span>
          </div>

          <div className="text-right space-y-1 sm:space-y-1.5 order-3">
            <div className="h-8 flex items-end justify-end">
              <span className="font-serif italic text-base text-primary/80 font-bold select-none">
                {credential.issuer.split(" ")[0]}
              </span>
            </div>
            <div className="h-px bg-foreground/20 w-36 ml-auto" />
            <div className="text-xs font-semibold text-foreground">Authorised signatory</div>
            <div className="text-[10px] text-muted-foreground truncate">{credential.issuer}</div>
          </div>
        </div>

        <div className="relative z-10 mt-8 pt-4 border-t border-border/40 text-[9px] text-muted-foreground text-center">
          Skill Setu · Academia–Industry Collaboration Platform ·{" "}
          {link ? (
            <>
              Verify at <span className="font-mono">{link}</span>
            </>
          ) : (
            "Verify with the certificate's verification code"
          )}
        </div>
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .certificate-container {
            border: 4px double #6b7c3c !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
