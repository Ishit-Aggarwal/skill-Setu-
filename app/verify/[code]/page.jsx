"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { convexClient, isBackendConfigured } from "../../../lib/convexBrowser";
import { formatDate } from "../../../lib/match";

/**
 * Public certificate verification. Anyone holding a printed or downloaded
 * certificate can enter its code here and see the student's name, the test,
 * the score and the issuing institution — and nothing else.
 */
export default function VerifyPage({ params }) {
  const { code } = typeof params?.then === "function" ? use(params) : params;
  const [result, setResult] = useState(undefined);
  const [input, setInput] = useState(code || "");

  useEffect(() => {
    if (!code) {
      setResult(null);
      return;
    }
    if (!isBackendConfigured() || !convexClient()) {
      setResult({ error: "Verification is not available right now." });
      return;
    }
    convexClient()
      .query(api.certificates.verify, { code })
      .then((r) => setResult(r || { notFound: true }))
      .catch(() => setResult({ error: "Verification is not available right now." }));
  }, [code]);

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Skill Setu" className="h-8 w-auto" />
          <div>
            <h1 className="text-base font-semibold text-foreground">Certificate verification</h1>
            <p className="text-xs text-muted-foreground">Enter the code printed on the certificate.</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = input.trim().toUpperCase();
            if (next) window.location.assign(`/verify/${encodeURIComponent(next)}`);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 7KQ2M9XA"
            aria-label="Verification code"
            className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button type="submit" className="bg-primary hover:bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium">
            Verify
          </button>
        </form>

        {result === undefined && code && <p className="text-xs text-muted-foreground">Checking…</p>}
        {result?.error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{result.error}</div>}
        {result?.notFound && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            No certificate matches the code <span className="font-mono">{code}</span>. Check the code and try again.
          </div>
        )}
        {result && !result.error && !result.notFound && (
          <div className={`rounded-xl border px-4 py-4 space-y-2 ${result.valid ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <div className={`text-sm font-semibold ${result.valid ? "text-emerald-800" : "text-red-700"}`}>
              {result.valid ? "✓ Genuine certificate" : `✕ Revoked on ${formatDate(result.revokedAt)}`}
            </div>
            <dl className="text-xs text-foreground grid grid-cols-[110px_1fr] gap-y-1.5">
              <dt className="text-muted-foreground">Student</dt>
              <dd className="font-medium">{result.studentName}</dd>
              <dt className="text-muted-foreground">Test</dt>
              <dd>{result.testTitle}</dd>
              {result.score && (
                <>
                  <dt className="text-muted-foreground">Score</dt>
                  <dd>{result.score}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Issued by</dt>
              <dd>{result.issuer}</dd>
              <dt className="text-muted-foreground">Certificate no.</dt>
              <dd className="font-mono">{result.certificateNo}</dd>
              <dt className="text-muted-foreground">Issued on</dt>
              <dd>{formatDate(result.issuedAt)}</dd>
            </dl>
          </div>
        )}

        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Skill Setu
        </Link>
      </div>
    </div>
  );
}
