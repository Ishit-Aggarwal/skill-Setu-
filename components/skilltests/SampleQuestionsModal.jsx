"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/session";
import { AI } from "../../lib/settings";
import { AYUSH_SYSTEM_FIELD_LABEL, isAyushSystem } from "../../lib/ayush";
import { AyushSystemSelect } from "../AyushSystemSelect";
import { Button, Field, Modal, Select, TextInput } from "../ui/Kit";

/**
 * "Questions from the sample papers".
 *
 * The host picks which of the attached sample papers to read, how many
 * questions, and the mix; the server reads the PDFs, generates a paper on
 * the same concepts, and drops anything that copies a sample question. The
 * generated questions land in the editor for review like any other.
 */
export default function SampleQuestionsModal({ samplePapers = [], defaultTopic = "", ayushSystem = "", onGenerated, onClose }) {
  const [chosen, setChosen] = useState(() => new Set(samplePapers.map((p) => p.id || p.storageId)));
  const [count, setCount] = useState("10");
  const [system, setSystem] = useState(ayushSystem);
  const [mix, setMix] = useState("single");
  const [singleCount, setSingleCount] = useState(String(Math.round(10 * AI.MIXED_SINGLE_RATIO)));
  const [difficulty, setDifficulty] = useState("moderate");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const n = Math.round(Number(count));
  const countValid = Number.isInteger(n) && n >= 1 && n <= AI.MAX_QUESTIONS && String(count).trim() === String(n);
  const singleN = Math.round(Number(singleCount));
  const papers = samplePapers.filter((p) => chosen.has(p.id || p.storageId) && p.url);

  function toggle(key) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function generate() {
    setError(null);
    if (!papers.length) return setError("Pick at least one sample paper.");
    if (!countValid) return setError(`Please enter a number between 1 and ${AI.MAX_QUESTIONS}`);
    if (!isAyushSystem(system)) return setError(`Choose the ${AYUSH_SYSTEM_FIELD_LABEL}.`);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/questions-from-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          papers: papers.map((p) => ({ url: p.url, fileName: p.fileName })),
          count: n,
          ayushSystem: system,
          mix,
          singleCount: mix === "mixed" ? singleN : undefined,
          difficulty,
          audience: audience.trim(),
          topic: defaultTopic,
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong generating questions. Please try again.");
        return;
      }
      onGenerated(data.questions, data.summary);
    } catch {
      setError("Something went wrong generating questions. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Questions from the sample papers"
      description="The sample papers are read and a new paper is written on the same concepts. No sample question is ever reused — anything that copies one is dropped before you see it."
      onClose={busy ? () => {} : onClose}
      size="lg"
    >
      <div className="space-y-4">
        <Field label="Sample papers to read">
          <div className="space-y-1.5">
            {samplePapers.map((p) => {
              const key = p.id || p.storageId;
              return (
                <label key={key} className="flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" checked={chosen.has(key)} onChange={() => toggle(key)} disabled={busy || !p.url} />
                  📄 {p.fileName || "Sample paper"}
                  {!p.url && <span className="text-[10px] text-muted-foreground">(still uploading)</span>}
                </label>
              );
            })}
          </div>
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Number of questions" hint={`1 to ${AI.MAX_QUESTIONS}`}>
            <TextInput type="number" min="1" max={String(AI.MAX_QUESTIONS)} step="1" value={count} onChange={(e) => setCount(e.target.value)} disabled={busy} />
          </Field>
          <AyushSystemSelect value={system} onChange={setSystem} required disabled={busy} />
        </div>

        <Field label="Question type mix">
          <div className="flex flex-wrap gap-2">
            {[
              ["single", "All single-answer"],
              ["multiple", "All multiple-answer"],
              ["mixed", "Mixed"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => setMix(key)}
                aria-pressed={mix === key}
                className={`text-xs px-3 py-2 rounded-full border font-medium ${mix === key ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mix === "mixed" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Single-answer">
                <TextInput type="number" min="0" max={String(n || 0)} step="1" value={singleCount} onChange={(e) => setSingleCount(e.target.value)} disabled={busy} />
              </Field>
              <Field label="Multiple-answer">
                <TextInput value={String(Number.isInteger(n) && Number.isInteger(singleN) ? Math.max(0, n - singleN) : "")} readOnly disabled />
              </Field>
            </div>
          )}
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Difficulty">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={busy}>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </Select>
          </Field>
          <Field label="Who sits it (optional)">
            <TextInput value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. final-year BAMS interns" disabled={busy} />
          </Field>
        </div>

        {busy && (
          <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
            Reading {papers.length} sample paper{papers.length === 1 ? "" : "s"} and writing {n} new question{n === 1 ? "" : "s"}… this can take a minute.
          </div>
        )}

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <span>⚠️ {error}</span>
            <Button type="button" size="sm" variant="outline" onClick={generate} disabled={busy}>
              Retry
            </Button>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={generate} disabled={busy || !papers.length}>
            {busy ? "Generating…" : "Generate from samples"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
