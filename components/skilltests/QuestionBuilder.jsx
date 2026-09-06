"use client";

import { Button, Field, TextArea, TextInput } from "../ui/Kit";

/**
 * Writing the paper.
 *
 * A host used to pick a skill domain and get whatever ready-made quiz the
 * platform happened to hold for it — so "Programming Fundamentals Quiz" and
 * "Advanced Systems Screening" were, to the candidate, exactly the same five
 * questions. This is the form-builder half of the fix: the host types their
 * own questions, options and marking, and the paper the candidate sits is the
 * paper the host wrote.
 *
 * Marks are per question and roll up into the test's total, so "how many marks
 * is this test out of" is answered by the paper rather than typed separately
 * and left to disagree with it.
 */

export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function blankQuestion() {
  return { question: "", options: ["", "", "", ""], correctOption: 0, marks: 1 };
}

/** Total marks the paper is out of. */
export function totalMarksOf(questions) {
  return (questions || []).reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
}

/** Returns an error string, or null when the paper is fit to publish. */
export function validateQuestions(questions) {
  if (!questions?.length) return "Add at least one question — a test with no paper cannot be marked.";
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q.question?.trim()) return `Question ${i + 1} has no text.`;
    const filled = (q.options || []).filter((o) => o.trim());
    if (filled.length < 2) return `Question ${i + 1} needs at least two options.`;
    if (!(q.options || [])[q.correctOption]?.trim()) return `Question ${i + 1} has no correct answer marked.`;
    if (!(Number(q.marks) > 0)) return `Question ${i + 1} must be worth at least 1 mark.`;
  }
  return null;
}

/** Drops empty trailing options and normalises marks before saving. */
export function normaliseQuestions(questions) {
  return (questions || []).map((q) => {
    const options = (q.options || []).map((o) => o.trim());
    // Removing a blank option would renumber the answer key, so the correct
    // index is remapped onto the option it actually pointed at.
    const correctText = options[q.correctOption];
    const kept = options.filter(Boolean);
    return {
      question: q.question.trim(),
      options: kept,
      correctOption: Math.max(0, kept.indexOf(correctText)),
      marks: Number(q.marks) || 1,
    };
  });
}

export default function QuestionBuilder({ questions, onChange }) {
  function patch(index, fields) {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...fields } : q)));
  }

  function setOption(index, optionIndex, value) {
    const next = [...questions[index].options];
    next[optionIndex] = value;
    patch(index, { options: next });
  }

  function addOption(index) {
    if (questions[index].options.length >= OPTION_LETTERS.length) return;
    patch(index, { options: [...questions[index].options, ""] });
  }

  function removeOption(index, optionIndex) {
    const q = questions[index];
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, i) => i !== optionIndex);
    const correctOption =
      q.correctOption === optionIndex ? 0 : q.correctOption > optionIndex ? q.correctOption - 1 : q.correctOption;
    patch(index, { options, correctOption });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {questions.length} question{questions.length === 1 ? "" : "s"} · paper is out of{" "}
          <span className="font-semibold text-foreground">{totalMarksOf(questions)} marks</span>
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...questions, blankQuestion()])}>
          + Add question
        </Button>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed border-border rounded-xl px-3.5 py-4 text-center">
          No questions yet. Add the first one to start writing the paper.
        </p>
      )}

      {questions.map((q, index) => (
        <div key={index} className="rounded-xl border border-border p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider pt-2">Q{index + 1}</span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted-foreground">Marks</label>
              <TextInput
                type="number"
                min="1"
                max="100"
                value={q.marks}
                onChange={(e) => patch(index, { marks: e.target.value })}
                className="w-16 text-center py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => onChange(questions.filter((_, i) => i !== index))}
                className="text-[11px] text-muted-foreground hover:text-red-600"
              >
                Remove
              </button>
            </div>
          </div>

          <TextArea
            rows={2}
            value={q.question}
            onChange={(e) => patch(index, { question: e.target.value })}
            placeholder="What is the time complexity of a binary search on a sorted array?"
          />

          <div className="space-y-1.5">
            {q.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => patch(index, { correctOption: optionIndex })}
                  aria-pressed={q.correctOption === optionIndex}
                  title="Mark as the correct answer"
                  className={`w-7 h-7 rounded-full border text-[11px] font-semibold flex-shrink-0 transition-colors ${
                    q.correctOption === optionIndex
                      ? "bg-emerald-600 border-transparent text-white"
                      : "border-border text-muted-foreground hover:border-emerald-500"
                  }`}
                >
                  {OPTION_LETTERS[optionIndex]}
                </button>
                <TextInput
                  value={option}
                  onChange={(e) => setOption(index, optionIndex, e.target.value)}
                  placeholder={`Option ${OPTION_LETTERS[optionIndex]}`}
                  className="py-1.5 text-xs"
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index, optionIndex)}
                    aria-label={`Remove option ${OPTION_LETTERS[optionIndex]}`}
                    className="text-xs text-muted-foreground hover:text-red-600 px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {q.options.length < OPTION_LETTERS.length && (
              <button
                type="button"
                onClick={() => addOption(index)}
                className="text-[11px] text-primary hover:underline"
              >
                + Add option
              </button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">
            The green letter is the correct answer. Candidates never see which one it is.
          </p>
        </div>
      ))}
    </div>
  );
}

/** A read-only summary for anywhere that just needs the headline numbers. */
export function PaperSummary({ questions }) {
  if (!questions?.length) return null;
  return (
    <Field label="Paper">
      <p className="text-xs text-muted-foreground">
        {questions.length} question{questions.length === 1 ? "" : "s"} · {totalMarksOf(questions)} marks
      </p>
    </Field>
  );
}
