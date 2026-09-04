"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getProgram, getProgramRegistration } from "../../../../../lib/store";
import { formatDate } from "../../../../../lib/match";

export default function CertificatePage({ params }) {
  const unwrappedParams = use(params);
  const registrationId = unwrappedParams.registrationId;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading certificate...</p>
        </div>
      </div>
    );
  }

  const reg = getProgramRegistration(registrationId);
  const program = reg ? getProgram(reg.programId) : null;

  if (!reg || !program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ✕
          </div>
          <h1 className="text-lg font-semibold text-foreground">Certificate Record Not Found</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The requested registration record (ID: <code className="font-mono text-[11px] bg-secondary px-1 py-0.5 rounded">{registrationId}</code>) could not be located.
          </p>
          <Link
            href="/academician/programs"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-accent text-white px-5 py-2 rounded-xl text-xs font-medium transition-colors"
          >
            ← Back to Programmes
          </Link>
        </div>
      </div>
    );
  }

  const certificateNo = reg.certificateNo || `FDP/2026/${reg.id.slice(0, 6).toUpperCase()}`;
  const issueDate = reg.certificateIssuedAt ? formatDate(reg.certificateIssuedAt) : formatDate(new Date().toISOString());

  return (
    <div className="min-h-screen bg-secondary/30 p-4 sm:p-8 flex flex-col items-center">
      {/* Action Bar (hidden on print) */}
      <header className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/academician/programs"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-card border border-border px-3 py-1.5 rounded-xl transition-colors shadow-sm"
          >
            ← Back to Programmes
          </Link>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Official Credential · Digital Record
          </span>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* Certificate Frame */}
      <main className="certificate-container w-full max-w-4xl bg-card border-8 border-double border-primary/40 rounded-3xl p-8 sm:p-14 shadow-xl text-center relative overflow-hidden print:p-10 print:border-4 print:shadow-none print:m-0 print:w-full">
        {/* Subtle Watermark Emblem */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <img src="/logo.png" alt="" className="w-2/3 max-w-xl object-contain grayscale" />
        </div>

        {/* Certificate Header */}
        <div className="relative z-10 space-y-3 mb-8">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo.png" alt="Skill Setu" className="h-9 sm:h-11 w-auto object-contain" />
          </div>
          <p className="text-[10px] sm:text-xs tracking-[0.25em] text-muted-foreground uppercase font-semibold">
            National Academia–Industry Collaboration Initiative
          </p>
          <div className="h-0.5 w-24 bg-primary/60 mx-auto mt-2" />
        </div>

        {/* Title */}
        <div className="relative z-10 mb-6">
          <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest block mb-1">
            Faculty Development & Training
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-foreground tracking-tight">
            Certificate of Participation
          </h1>
        </div>

        {/* Recipient */}
        <div className="relative z-10 my-8 space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground italic font-serif">
            This is proudly presented to
          </p>
          <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight underline decoration-primary/30 decoration-2 underline-offset-8">
            {reg.name || "Faculty Participant"}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground pt-1">
            {reg.designation ? `${reg.designation} · ` : ""}{reg.institution || "Higher Education Institution"}
          </p>
        </div>

        {/* Program Description */}
        <div className="relative z-10 max-w-2xl mx-auto my-6 text-xs sm:text-sm text-foreground/80 leading-relaxed">
          for successfully attending and completing the institutional programme on
          <div className="font-semibold text-foreground text-sm sm:text-base my-2 font-serif text-primary">
            "{program.title}"
          </div>
          organised by <span className="font-medium text-foreground">{program.organiser}</span> in{" "}
          <span className="font-medium text-foreground">{program.mode}</span> mode ({program.dates}).
        </div>

        {/* Verification & Signatures Grid */}
        <div className="relative z-10 pt-10 mt-10 border-t border-border/80 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
          {/* Left: Metadata */}
          <div className="text-left space-y-1 sm:space-y-1.5 order-2 sm:order-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Certificate No.
            </div>
            <div className="text-xs font-mono font-bold text-foreground">
              {certificateNo}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Issued: {issueDate}
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-md mt-1 border border-green-200">
              ✓ Verified Credential
            </div>
          </div>

          {/* Center: Seal Emblem */}
          <div className="flex flex-col items-center justify-center order-1 sm:order-2 my-2 sm:my-0">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center text-primary text-xl font-serif bg-primary/5 shadow-inner">
              🏅
            </div>
            <span className="text-[9px] text-muted-foreground tracking-widest uppercase mt-1">
              Official Seal
            </span>
          </div>

          {/* Right: Signature Block */}
          <div className="text-right space-y-1 sm:space-y-1.5 order-3">
            <div className="h-8 flex items-end justify-end">
              <span className="font-serif italic text-base text-primary/80 font-bold select-none">
                {program.organiser?.split(" ")[0] || "Convener"}
              </span>
            </div>
            <div className="h-px bg-foreground/20 w-36 ml-auto" />
            <div className="text-xs font-semibold text-foreground">
              Programme Coordinator
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {program.organiser}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 mt-8 pt-4 border-t border-border/40 text-[9px] text-muted-foreground text-center">
          Skill Setu · National Academia–Industry Collaboration Platform · Problem Statement SIH26044
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
            border: 4px double #6B7C3C !important;
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
