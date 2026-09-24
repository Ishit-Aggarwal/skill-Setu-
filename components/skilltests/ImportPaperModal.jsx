"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/session";
import { AI } from "../../lib/settings";
import { AYUSH_SYSTEM_FIELD_LABEL, isAyushSystem } from "../../lib/ayush";
import { AyushSystemSelect } from "../AyushSystemSelect";
import FileDrop from "../ui/FileDrop";
import { Button, Modal } from "../ui/Kit";

/**
 * "Import an existing paper" — a professor's own questions, read into the
 * editor from one to ten files of any supported type: Paper A as a PDF,
 * Paper B as Word, the answer key as a spreadsheet, a photographed page.
 *
 * The files go to storage first (nothing large travels in a request body)
 * and are read in the order shown here — drag or use the arrows to change
 * it. Every question comes back exactly as written; a key kept in a separate
 * file is matched by question number. Where the files had no key or
 * explanation the server had the model supply one and says how many, so the
 * professor knows which questions to check first: those are badged
 * "AI-generated" in the editor.
 */
export default function ImportPaperModal({ ayushSystem = "", onImported, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [system, setSystem] = useState(ayushSystem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]);

  async function run() {
    setError(null);
    setNotes([]);
    if (!files.length) return setError("Upload the question paper — one or more files.");
    if (!isAyushSystem(system)) return setError(`Choose the ${AYUSH_SYSTEM_FIELD_LABEL}.`);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/import-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ sources: files, ayushSystem: system, topic: (files[0]?.fileName || "").replace(/\.[a-z0-9]+$/i, "") }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.success) {
        setNotes(data.skipped || []);
        setError(data.error || "The paper could not be read. Please try again.");
        return;
      }
      onImported(data.questions, { ...data.summary, skipped: data.skipped || [], truncated: data.truncated || [] });
    } catch {
      setError("The paper could not be read. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Import an existing paper"
      description="Upload your own question paper — in as many files as it takes. Every question is copied as written; answers and explanations already in the files are kept, and any that are missing are generated for you to check."
      onClose={busy ? () => {} : onClose}
      size="md"
    >
      <div className="space-y-4">
        <AyushSystemSelect value={system} onChange={setSystem} required disabled={busy} />

        <FileDrop
          purpose="source"
          maxFiles={AI.MAX_SOURCE_FILES}
          reorderable
          onChange={setFiles}
          onBusyChange={setUploading}
          disabled={busy}
          label="Drop the question paper here — PDF, Word, slides, a spreadsheet or a photo"
        />
        <p className="text-[11px] text-muted-foreground">Files are read in the order listed. If the answer key is a separate file, include it — keys are matched by question number. Up to {AI.MAX_IMPORT_QUESTIONS} questions.</p>

        {notes.length > 0 && (
          <ul className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 space-y-0.5">
            {notes.map((n, i) => (
              <li key={i}>⚠️ {n}</li>
            ))}
          </ul>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={run} disabled={busy || uploading || !files.length}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Reading the paper…
              </span>
            ) : (
              "Import questions"
            )}
          </Button>
        </div>
        {busy && <p className="text-[11px] text-muted-foreground text-center">A long paper can take a minute or two.</p>}
      </div>
    </Modal>
  );
}
