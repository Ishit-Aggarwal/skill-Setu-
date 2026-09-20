"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, TextArea, TextInput } from "../ui/Kit";
import { MAX_OPTIONS, MIN_OPTIONS, TYPE_LABEL, blankOption, blankQuestion, duplicateQuestion, validateQuestion } from "../../lib/questions";
import { paperCounter, paperTypeLabel } from "../../lib/grading";

/**
 * The paper editor: one card per question, collapsed to a single line until
 * it is opened.
 *
 * Every question is worth one point — there is nothing to type for marks —
 * and the counter at the top ("12 Questions · 12 Points") and the type badge
 * ("Single & Multiple-answer") are recomputed from the list on every change.
 * Validation is shown per field on the card, not as a blocked submit button.
 * The correct answer highlight exists here and nowhere a candidate can see.
 */

export const TYPE_TONE = { single: "blue", multiple: "purple" };

const SEARCH_THRESHOLD = 10;

function truncate(text, n = 90) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function QuestionTypeTag({ type }) {
  return <Badge tone={TYPE_TONE[type] || "neutral"}>{TYPE_LABEL[type] || "Untyped"}</Badge>;
}

export function PaperTypeBadge({ questions }) {
  const label = paperTypeLabel(questions);
  if (!label) return null;
  const type = label.startsWith("Single &") ? "mixed" : label.startsWith("Multiple") ? "multiple" : "single";
  return <Badge tone={type === "mixed" ? "amber" : TYPE_TONE[type]}>{label}</Badge>;
}

export default function QuestionEditor({
  questions,
  onChange,
  ayushSystem = "",
  saveStatus = null, // { state: "saving" | "saved" | "error", ids: Set, message }
  onRecheck,
  recheckingId = null,
  locked = false,
}) {
  const [openIds, setOpenIds] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [explanationOpen, setExplanationOpen] = useState(() => new Set());
  const listEndRef = useRef(null);

  // A card the professor just added opens; everything loaded opens collapsed.
  const knownIds = useRef(new Set(questions.map((q) => q.id)));
  useEffect(() => {
    const fresh = questions.filter((q) => !knownIds.current.has(q.id)).map((q) => q.id);
    knownIds.current = new Set(questions.map((q) => q.id));
    if (fresh.length && fresh.length <= 3) setOpenIds((prev) => new Set([...prev, ...fresh]));
  }, [questions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return questions.map((question, index) => ({ question, index }));
    return questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => question.text?.toLowerCase().includes(q) || (question.options || []).some((o) => o.text?.toLowerCase().includes(q)));
  }, [questions, query]);

  function toggle(id) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function patch(id, fields) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...fields, updatedAt: new Date().toISOString() } : q)));
  }

  function addQuestion() {
    const q = blankQuestion({ ayushSystem });
    onChange([...questions, q]);
    setOpenIds((prev) => new Set(prev).add(q.id));
    setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  }

  function duplicate(id) {
    const index = questions.findIndex((q) => q.id === id);
    if (index < 0) return;
    const copy = duplicateQuestion(questions[index]);
    const next = [...questions];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setOpenIds((prev) => new Set(prev).add(copy.id));
  }

  function remove(id) {
    onChange(questions.filter((q) => q.id !== id));
    setConfirmDelete(null);
  }

  function setType(q, type) {
    let options = q.options;
    // Switching to single keeps only the first marked answer so the card is
    // valid straight away rather than showing an error the professor must hunt for.
    if (type === "single") {
      let seen = false;
      options = q.options.map((o) => {
        if (o.isCorrect && !seen) {
          seen = true;
          return o;
        }
        return { ...o, isCorrect: false };
      });
    }
    patch(q.id, { type, options });
  }

  function setCorrect(q, optionId) {
    const options = q.options.map((o) => {
      if (q.type === "single") return { ...o, isCorrect: o.id === optionId };
      return o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o;
    });
    patch(q.id, { options });
  }

  function statusFor(id) {
    if (!saveStatus || !saveStatus.ids?.has(id)) return null;
    return saveStatus.state;
  }

  return (
    <div className="space-y-3">
      {/* List-level controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-foreground">{paperCounter(questions)}</span>
        <PaperTypeBadge questions={questions} />
        <div className="ml-auto flex items-center gap-2">
          {saveStatus?.state === "saving" && <span className="text-[11px] text-muted-foreground">Saving…</span>}
          {saveStatus?.state === "saved" && !saveStatus.ids?.size && <span className="text-[11px] text-emerald-700">Saved</span>}
          {saveStatus?.state === "error" && <span className="text-[11px] text-red-600">{saveStatus.message || "Could not save"}</span>}
          {!locked && (
            <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
              + Add Question
            </Button>
          )}
        </div>
      </div>

      {locked && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Candidates have already started this test, so its paper is locked. You can still read it and run rechecks for your own notes.
        </p>
      )}

      {questions.length > SEARCH_THRESHOLD && (
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jump to a question by its text…" aria-label="Search questions" className="text-xs" />
      )}

      {questions.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl px-3.5 py-4 text-center">
          No questions yet. Add the first one, or generate a paper with AI.
        </p>
      )}

      {visible.length === 0 && questions.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No question matches “{query}”.</p>
      )}

      {visible.map(({ question: q, index }) => {
        const open = openIds.has(q.id);
        const errors = validateQuestion(q);
        const hasErrors = Object.keys(errors).length > 0;
        const status = statusFor(q.id);
        return (
          <div key={q.id} className={`rounded-xl border ${hasErrors ? "border-red-200" : "border-border"} bg-card overflow-hidden`}>
            {/* Collapsed header — the whole row toggles */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggle(q.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(q.id);
                }
              }}
              aria-expanded={open}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-secondary/60 min-h-[44px]"
            >
              <span className="text-[11px] font-semibold text-primary w-7 flex-shrink-0">Q{index + 1}</span>
              <QuestionTypeTag type={q.type} />
              <span className="text-xs text-foreground flex-1 min-w-0 truncate">{truncate(q.text) || <span className="text-muted-foreground italic">Untitled question</span>}</span>
              <Badge tone={q.source === "ai_generated" ? "purple" : "neutral"}>{q.source === "ai_generated" ? "AI-generated" : "Manual"}</Badge>
              {hasErrors && <Badge tone="red">Needs attention</Badge>}
              {status === "saving" && <span className="text-[10px] text-muted-foreground">Saving…</span>}
              {status === "saved" && <span className="text-[10px] text-emerald-700">Saved</span>}
              <span className="text-muted-foreground text-xs flex-shrink-0">{open ? "▴" : "▾"}</span>
            </div>

            {open && (
              <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
                {/* Type toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Type</span>
                  {["single", "multiple"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={locked}
                      onClick={() => setType(q, type)}
                      aria-pressed={q.type === type}
                      className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium min-h-[32px] ${
                        q.type === type ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {TYPE_LABEL[type]}
                    </button>
                  ))}
                  {errors.type && <span className="text-[11px] text-red-600">{errors.type}</span>}
                </div>

                {/* Question text */}
                <div>
                  <TextArea
                    rows={2}
                    value={q.text}
                    disabled={locked}
                    onChange={(e) => patch(q.id, { text: e.target.value })}
                    placeholder="Which schedule of the Drugs & Cosmetics Rules lays down GMP for ASU drugs?"
                    aria-label={`Question ${index + 1} text`}
                  />
                  {errors.text && <p className="text-[11px] text-red-600 mt-1">{errors.text}</p>}
                </div>

                {/* Options */}
                <div className="space-y-1.5">
                  {q.options.map((o, optionIndex) => (
                    <div
                      key={o.id}
                      className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${o.isCorrect ? "bg-emerald-50 border border-emerald-300" : "border border-transparent"}`}
                    >
                      <input
                        type={q.type === "multiple" ? "checkbox" : "radio"}
                        name={`correct-${q.id}`}
                        checked={Boolean(o.isCorrect)}
                        disabled={locked}
                        onChange={() => setCorrect(q, o.id)}
                        aria-label={`Mark option ${optionIndex + 1} as correct`}
                        className="w-4 h-4 accent-emerald-600 flex-shrink-0 cursor-pointer"
                      />
                      <TextInput
                        value={o.text}
                        disabled={locked}
                        onChange={(e) => patch(q.id, { options: q.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })}
                        placeholder={`Option ${optionIndex + 1}`}
                        aria-label={`Option ${optionIndex + 1} text`}
                        className="py-1.5 text-xs"
                      />
                      {q.options.length > MIN_OPTIONS && !locked && (
                        <button
                          type="button"
                          onClick={() => patch(q.id, { options: q.options.filter((x) => x.id !== o.id) })}
                          aria-label={`Remove option ${optionIndex + 1}`}
                          className="text-xs text-muted-foreground hover:text-red-600 px-2 min-h-[32px] min-w-[32px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3">
                    {q.options.length < MAX_OPTIONS && !locked && (
                      <button type="button" onClick={() => patch(q.id, { options: [...q.options, blankOption()] })} className="text-[11px] text-primary hover:underline min-h-[32px]">
                        + Add option
                      </button>
                    )}
                    {errors.options && <span className="text-[11px] text-red-600">{errors.options}</span>}
                    {errors.correct && <span className="text-[11px] text-red-600">{errors.correct}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Highlighted options are the correct answer{q.type === "multiple" ? "s" : ""}. Candidates never see this highlight.
                  </p>
                </div>

                {/* Explanation */}
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5">
                  <button
                    type="button"
                    onClick={() =>
                      setExplanationOpen((prev) => {
                        const next = new Set(prev);
                        if (next.has(q.id)) next.delete(q.id);
                        else next.add(q.id);
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-primary min-h-[36px]"
                    aria-expanded={explanationOpen.has(q.id)}
                  >
                    <span>💡 Explanation {q.explanation ? "" : "(add one — shown to candidates after grading)"}</span>
                    <span>{explanationOpen.has(q.id) ? "▴" : "▾"}</span>
                  </button>
                  {(explanationOpen.has(q.id) || !q.explanation) && (
                    <div className="px-3 pb-3">
                      <TextArea
                        rows={2}
                        value={q.explanation || ""}
                        disabled={locked}
                        onChange={(e) => patch(q.id, { explanation: e.target.value })}
                        placeholder="Why the correct answer is correct."
                        aria-label={`Question ${index + 1} explanation`}
                        className="text-xs"
                      />
                    </div>
                  )}
                  {!explanationOpen.has(q.id) && q.explanation && <p className="px-3 pb-2.5 text-[11px] text-muted-foreground line-clamp-2">{q.explanation}</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                  {onRecheck && (
                    <button
                      type="button"
                      onClick={() => onRecheck(q)}
                      disabled={hasErrors || recheckingId === q.id}
                      title="Ask AI to double-check this question"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50 min-h-[36px]"
                    >
                      {recheckingId === q.id ? "Checking…" : "✨ Recheck with AI"}
                    </button>
                  )}
                  {!locked && (
                    <button type="button" onClick={() => duplicate(q.id)} className="text-[11px] font-medium px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground min-h-[36px]">
                      ⧉ Duplicate question
                    </button>
                  )}
                  {!locked &&
                    (confirmDelete === q.id ? (
                      <span className="inline-flex items-center gap-2 text-[11px]">
                        <span className="text-red-600">Delete this question?</span>
                        <button type="button" onClick={() => remove(q.id)} className="font-semibold text-red-600 px-2 py-2 min-h-[36px]">
                          Yes, delete
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="text-muted-foreground px-2 py-2 min-h-[36px]">
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(q.id)} className="text-[11px] font-medium px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-red-600 hover:border-red-300 min-h-[36px]">
                        🗑 Delete question
                      </button>
                    ))}
                  <button type="button" onClick={() => toggle(q.id)} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground px-3 py-2 min-h-[36px]">
                    Collapse ▴
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div ref={listEndRef} />
    </div>
  );
}
