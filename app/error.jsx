"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log unexpected errors for diagnosis without breaking UI
    console.error("[SkillSetu Global Error Boundary]:", error);
  }, [error]);

  function handleResetSession() {
    try {
      if (typeof window !== "undefined") {
        // Clear active session pointers without touching pre-seeded store.js databases
        window.sessionStorage.removeItem("ayusetu:tab_session");
        window.localStorage.removeItem("ayusetu:session");
        window.localStorage.removeItem("ayusetu:sync_ping");
        window.location.href = "/";
      }
    } catch (e) {
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4">
          🛡️
        </div>

        <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
          Temporary Session Interruption
        </h2>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Skill Setu encountered an unexpected render issue. Your verified profile and assessment records remain safe.
        </p>

        {error?.message && (
          <div className="mb-6 p-3 bg-secondary/50 rounded-xl border border-border text-left">
            <div className="text-[11px] font-mono text-muted-foreground break-all line-clamp-3">
              {error.message}
            </div>
            {error.digest && (
              <div className="text-[10px] font-mono text-muted-foreground/70 mt-1">
                Ref: {error.digest}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2.5">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-accent text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Try Again
          </button>

          <button
            onClick={handleResetSession}
            className="w-full py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-sm font-medium transition-colors"
          >
            Clear Session & Recover
          </button>

          <div className="pt-2">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Portal Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
