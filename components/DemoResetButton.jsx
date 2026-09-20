"use client";

import { useState } from "react";
import { resetDemoData } from "../lib/demoReset";
import { Button, Modal } from "./ui/Kit";

/**
 * "Reset demo data", top right on every demo persona's page.
 *
 * The tour is a shared sandbox: whatever the last visitor posted, applied to
 * or uploaded is still there for the next one. This puts every persona back
 * to the seeded state — the sample postings, cohort, drives, MOUs and notices
 * — without touching anything a real account owns. It reloads when done so
 * the page draws from the fresh seed.
 */
export default function DemoResetButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleReset() {
    setBusy(true);
    setError(null);
    try {
      await resetDemoData();
      window.location.reload();
    } catch (err) {
      setError(err?.message || "The demo could not be reset. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Put every demo persona back to its sample data"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 3v6h6" />
        </svg>
        <span className="hidden sm:inline">Reset demo data</span>
        <span className="sm:hidden">Reset</span>
      </button>

      {open && (
        <Modal
          title="Reset demo data?"
          description="Every demo persona goes back to its sample data — postings, applications, drives, MOUs, notices, mentorship and uploads made during the tour are cleared. Real accounts are not affected."
          onClose={() => (busy ? null : setOpen(false))}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleReset} disabled={busy}>
                {busy ? "Resetting…" : "Reset to default data"}
              </Button>
            </div>
          }
        >
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && <p className="text-sm text-muted-foreground">This takes a few seconds and reloads the page.</p>}
        </Modal>
      )}
    </>
  );
}
