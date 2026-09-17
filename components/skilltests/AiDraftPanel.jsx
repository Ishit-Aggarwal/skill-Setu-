"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/session";
import { Button, Select, TextArea, TextInput } from "../ui/Kit";

/**
 * Drafting a paper with AI instead of typing it.
 *
 * The host writes what the test should cover in plain words and gets a draft
 * paper back in the QuestionBuilder, where every question, option and answer
 * key is still theirs to correct before publishing. Nothing is published
 * straight from the model.
 *
 * The API key never reaches the browser; this only talks to our own route.
 */
export default function AiDraftPanel({ defaultTopic = "", domain = "", onDraft }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(defaultTopic);
  const [audience, setAudience] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("moderate");
  const [mode, setMode] = useState("replace");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  async function draft() {
    setError(null);
    setNote(null);
    if (!topic.trim()) {
      setError("Describe what the test should cover.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ topic: topic.trim(), audience: audience.trim(), count: Number(count), difficulty, domain }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.success) {
        setError(data.error || "Could not draft the paper right now.");
        return;
      }
      onDraft(data.questions, mode);
      setNote(`${data.questions.length} question${data.questions.length === 1 ? "" : "s"} drafted — review every answer key before you publish.`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-foreground">✨ Draft the paper with AI</div>
          <p className="text-[11px] text-muted-foreground">
            Describe the topic and get a draft you can edit — you stay the examiner.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Open"}
        </Button>
      </div>

      {open && (
        <div className="space-y-3">
          <TextArea
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Panchakarma pre-procedure assessment and contraindications, or Schedule T GMP documentation for an ASU manufacturing unit"
          />
          <TextInput
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Who sits it? e.g. final-year BAMS interns, B.Pharm (Ayu) graduates"
          />
          <div className="grid grid-cols-3 gap-2">
            <TextInput type="number" min="1" max="20" value={count} onChange={(e) => setCount(e.target.value)} aria-label="Number of questions" />
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </Select>
            <Select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Replace or append">
              <option value="replace">Replace paper</option>
              <option value="append">Add to paper</option>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">{busy ? "Drafting…" : note || ""}</span>
            <Button type="button" size="sm" onClick={draft} disabled={busy}>
              {busy ? "Drafting…" : "Draft questions"}
            </Button>
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
