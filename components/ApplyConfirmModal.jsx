"use client";

import { useState } from "react";

export default function ApplyConfirmModal({ internship, user, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleConfirm() {
    setSubmitting(true);
    setTimeout(() => onConfirm(note), 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-foreground text-lg mb-1">Apply to {internship.title}</h3>
        <p className="text-xs text-muted-foreground mb-5">{internship.company} · {internship.location}</p>

        <div className="bg-secondary rounded-xl p-3 mb-4 text-xs text-muted-foreground space-y-1">
          <div><span className="font-semibold text-foreground">Applying as:</span> {user.name}</div>
          <div><span className="font-semibold text-foreground">Institution:</span> {user.institution || "—"}</div>
          {user.course && <div><span className="font-semibold text-foreground">Course:</span> {user.course} {user.year ? `· ${user.year}` : ""}</div>}
        </div>

        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Note to recruiter <span className="font-normal normal-case text-muted-foreground">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Anything you'd like to add?"
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none mb-5"
        />

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={submitting} className="flex-1 py-3 rounded-xl bg-primary hover:bg-accent disabled:opacity-60 text-white text-sm font-medium transition-all duration-150">
            {submitting ? "Submitting…" : "Confirm Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
