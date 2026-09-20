"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/session";
import { AI } from "../../lib/settings";
import { AYUSH_SYSTEM_FIELD_LABEL, isAyushSystem } from "../../lib/ayush";
import { AyushSystemSelect } from "../AyushSystemSelect";
import { Button, Field, Modal, Select, TextArea, TextInput } from "../ui/Kit";

/**
 * "Generate with AI" — the form in Section 3.2.
 *
 * Topic, count, AYUSH system, and the single/multiple mix. While the call
 * runs the button is disabled and a spinner explains the wait; on success
 * the questions go to the editor; on any failure the professor sees one
 * plain sentence and a Retry button that resubmits the same values.
 */
export default function AiGenerateModal({ defaultTopic = "", ayushSystem = "", hasDifficulty = true, onGenerated, onClose }) {
  const [topic, setTopic] = useState(defaultTopic);
  const [count, setCount] = useState("10");
  const [system, setSystem] = useState(ayushSystem);
  const [mix, setMix] = useState("single");
  const [singleCount, setSingleCount] = useState(String(Math.round(10 * AI.MIXED_SINGLE_RATIO)));
  const [difficulty, setDifficulty] = useState("moderate");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const n = Math.round(Number(count));
  const countValid = Number.isInteger(n) && n >= 1 && n <= AI.MAX_QUESTIONS && String(count).trim() === String(n);
  const singleN = Math.round(Number(singleCount));
  const mixedValid = mix !== "mixed" || (Number.isInteger(singleN) && singleN >= 0 && singleN <= n);

  function setCountAndRatio(value) {
    setCount(value);
    const next = Math.round(Number(value));
    if (Number.isInteger(next) && next > 0) setSingleCount(String(Math.round(next * AI.MIXED_SINGLE_RATIO)));
  }

  function validate() {
    const errors = {};
    if (!topic.trim()) errors.topic = "Describe what the paper should cover.";
    if (!countValid) errors.count = `Please enter a number between 1 and ${AI.MAX_QUESTIONS}`;
    if (!isAyushSystem(system)) errors.system = `Choose the ${AYUSH_SYSTEM_FIELD_LABEL}.`;
    if (!mixedValid) errors.mix = `Single-answer and multiple-answer counts must add up to ${n}.`;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function generate() {
    setError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          topic: topic.trim(),
          count: n,
          ayushSystem: system,
          mix,
          singleCount: mix === "mixed" ? singleN : undefined,
          difficulty: hasDifficulty ? difficulty : undefined,
          audience: audience.trim(),
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
      onGenerated(data.questions, { topic: topic.trim(), ayushSystem: system });
    } catch {
      setError("Something went wrong generating questions. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Generate with AI" description="Describe the paper; every generated question lands in the editor for you to review before it is published." onClose={busy ? () => {} : onClose} size="lg">
      <div className="space-y-4">
        <Field label="Topic / prompt">
          <TextArea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Basic principles of Ayurvedic Dosha theory" disabled={busy} />
          {fieldErrors.topic && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.topic}</p>}
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Number of questions" hint={`1 to ${AI.MAX_QUESTIONS}`}>
            <TextInput type="number" min="1" max={String(AI.MAX_QUESTIONS)} step="1" value={count} onChange={(e) => setCountAndRatio(e.target.value)} disabled={busy} />
            {fieldErrors.count && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.count}</p>}
          </Field>
          <div>
            <AyushSystemSelect value={system} onChange={setSystem} required disabled={busy} />
            {fieldErrors.system && <p className="text-[11px] text-red-600 mt-1">{fieldErrors.system}</p>}
          </div>
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
            <div className="mt-3 grid grid-cols-2 gap-3 items-end">
              <Field label="Single-answer">
                <TextInput type="number" min="0" max={String(n || 0)} step="1" value={singleCount} onChange={(e) => setSingleCount(e.target.value)} disabled={busy} />
              </Field>
              <Field label="Multiple-answer">
                <TextInput value={String(Number.isInteger(n) && Number.isInteger(singleN) ? Math.max(0, n - singleN) : "")} readOnly disabled />
              </Field>
              <input
                type="range"
                min="0"
                max={String(n || 0)}
                value={Math.min(singleN || 0, n || 0)}
                onChange={(e) => setSingleCount(e.target.value)}
                aria-label="Single to multiple ratio"
                className="col-span-2 accent-[var(--primary,#3C7C6B)]"
                disabled={busy}
              />
              {fieldErrors.mix && <p className="col-span-2 text-[11px] text-red-600">{fieldErrors.mix}</p>}
            </div>
          )}
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          {hasDifficulty && (
            <Field label="Difficulty">
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={busy}>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
              </Select>
            </Field>
          )}
          <Field label="Who sits it (optional)">
            <TextInput value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. final-year BAMS interns" disabled={busy} />
          </Field>
        </div>

        {busy && (
          <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
            Generating {n} question{n === 1 ? "" : "s"}… this may take a moment.
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
          <Button type="button" className="flex-1" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : "Generate Questions"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
