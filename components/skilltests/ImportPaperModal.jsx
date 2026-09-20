"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/session";
import { FILES } from "../../lib/settings";
import { AYUSH_SYSTEM_FIELD_LABEL, isAyushSystem } from "../../lib/ayush";
import { AyushSystemSelect } from "../AyushSystemSelect";
import { formatBytes } from "../../lib/files";
import { Button, Modal } from "../ui/Kit";

/**
 * "Import from PDF" — a professor's own paper, read into the editor.
 *
 * The file is sent to the server as base64 (it never goes to storage — this
 * is a one-off read, not an upload) and every question comes back exactly as
 * written. Where the paper had no answer key or explanation the server had
 * the model supply one, and says how many, so the professor knows which
 * questions to check first: those are badged "AI-generated" in the editor.
 */
export default function ImportPaperModal({ ayushSystem = "", onImported, onClose }) {
  const [file, setFile] = useState(null);
  const [system, setSystem] = useState(ayushSystem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setError(null);
    if (!f) return;
    if (String(f.type || "").split(";")[0] !== "application/pdf" && !/\.pdf$/i.test(f.name)) return setError("Please upload a PDF file.");
    if (f.size > FILES.MAX_DOCUMENT_BYTES) return setError("File is too large — please upload a file under 10MB");
    setFile(f);
  }

  function toBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function run() {
    setError(null);
    if (!file) return setError("Attach the PDF of the question paper.");
    if (!isAyushSystem(system)) return setError(`Choose the ${AYUSH_SYSTEM_FIELD_LABEL}.`);
    setBusy(true);
    try {
      const pdf = await toBase64(file);
      const res = await fetch("/api/ai/import-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ pdf, mimeType: "application/pdf", ayushSystem: system, topic: file.name.replace(/\.pdf$/i, "") }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.success) {
        setError(data.error || "The paper could not be read. Please try again.");
        return;
      }
      onImported(data.questions, data.summary);
    } catch {
      setError("The paper could not be read. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Import from PDF"
      description="Upload your own question paper. Every question is copied as written; answers and explanations already in the paper are kept, and any that are missing are generated for you to check."
      onClose={busy ? () => {} : onClose}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <AyushSystemSelect value={system} onChange={setSystem} required disabled={busy} />
        </div>

        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2">
          {file ? (
            <div className="text-sm text-foreground">
              📄 {file.name} <span className="text-xs text-muted-foreground">({formatBytes(file.size)})</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">A PDF with multiple-choice questions — typed, scanned or exported from Word. Up to {formatBytes(FILES.MAX_DOCUMENT_BYTES)}.</p>
          )}
          <label className="inline-block text-xs font-semibold text-primary hover:underline cursor-pointer">
            {file ? "Choose a different file" : "Choose PDF"}
            <input type="file" accept=".pdf,application/pdf" onChange={pick} className="hidden" disabled={busy} />
          </label>
        </div>

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
          <Button type="button" className="flex-1" onClick={run} disabled={busy || !file}>
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
        {busy && <p className="text-[11px] text-muted-foreground text-center">A long paper can take up to a minute.</p>}
      </div>
    </Modal>
  );
}
