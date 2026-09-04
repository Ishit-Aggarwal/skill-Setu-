"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getCredential } from "../../../lib/store";
import { formatDate } from "../../../lib/match";

const KIND_LINE = {
  "Skill Test": "for successfully completing the assessment",
  Internship: "for successfully completing the internship",
  Training: "for successfully completing the training programme",
  Merit: "in recognition of outstanding performance in",
  Participation: "for participating in",
};

/**
 * The printable artefact behind an issued credential. Deliberately rendered as
 * a print-styled page rather than a generated PDF — window.print() to PDF keeps
 * the dependency list unchanged and produces a file the student can attach
 * anywhere. The same approach the FDP certificate page uses.
 */
export default function CredentialCertificatePage({ params }) {
  // Next 14 hands a client page a plain params object; Next 15 hands it a
  // promise. Calling use() on the plain object throws "unsupported type", so
  // only unwrap when it actually is thenable.
  const { credentialId } = typeof params?.then === "function" ? use(params) : params;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading certificate…</p>
        </div>
      </div>
    );
  }

  const credential = getCredential(credentialId);

  if (!credential) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✕</div>
          <h1 className="text-lg font-semibold text-foreground">Certificate not found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No credential matches the id{" "}
            <code className="font-mono text-[11px] bg-secondary px-1 py-0.5 rounded">{credentialId}</code> in this browser.
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

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-primary hover:bg-accent text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all duration-150 hover:scale-[1.02]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print / Save as PDF
        </button>
      </header>

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
            <img src="/logo.png" alt="Skill Setu" className="h-9 sm:h-11 w-auto object-contain mix-blend-multiply" />
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
            {credential.studentName}
          </div>
        </div>

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
          Skill Setu · Academia–Industry Collaboration Platform · Verify with certificate number and code
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
