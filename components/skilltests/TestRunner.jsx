"use client";

import { useState } from "react";
import { QUESTION_BANK } from "../../lib/questionBank";

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function TestRunner({ test, onFinish, onCancel }) {
  const questions = QUESTION_BANK[test.domain] || [];
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-sm text-muted-foreground">
        This test doesn't have an online question set configured.
        <button onClick={onCancel} className="block mx-auto mt-4 text-primary hover:underline">← Back</button>
      </div>
    );
  }

  const q = questions[currentQ];

  function handleSelect(idx) {
    if (revealed) return;
    setSelected(idx);
  }

  function handleNext() {
    const updated = [...answers];
    updated[currentQ] = selected;
    setAnswers(updated);
    if (!revealed) {
      setRevealed(true);
      return;
    }
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  }

  if (finished) {
    const score = answers.filter((a, i) => a === questions[i].correct).length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto py-8 text-center animate-fade-slide">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Test Complete!</h2>
        <p className="text-muted-foreground mb-8">{test.title} · {test.hostName}</p>
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="text-5xl font-bold text-primary mb-2">{pct}%</div>
          <div className="text-muted-foreground text-sm mb-4">{score} of {questions.length} correct</div>
          <ProgressBar value={pct} />
        </div>
        <button onClick={() => onFinish(pct)} className="w-full bg-primary hover:bg-accent text-white py-3 rounded-xl font-medium text-sm transition-all duration-150">
          Save Result to My Skill Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 animate-fade-slide">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Question {currentQ + 1} of {questions.length}</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{test.domain}</span>
        </div>
        <ProgressBar value={((currentQ + (revealed ? 1 : 0)) / questions.length) * 100} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 mb-5">
        <p className="text-base lg:text-lg font-medium text-foreground leading-relaxed mb-7">{q.question}</p>

        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            let cls = "border-border bg-secondary/50 hover:bg-secondary hover:border-border";
            if (selected === idx) {
              cls = revealed
                ? idx === q.correct
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : "border-red-400 bg-red-50 dark:bg-red-950/30"
                : "border-primary bg-primary/8";
            } else if (revealed && idx === q.correct) {
              cls = "border-green-500 bg-green-50 dark:bg-green-950/30";
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)} disabled={revealed} className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm text-foreground transition-all duration-150 ${cls}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-semibold mt-0.5 transition-all ${selected === idx ? "border-primary bg-primary text-white" : "border-muted-foreground text-muted-foreground"}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-relaxed">{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-5 p-4 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800/30 rounded-xl">
            <div className="text-xs font-semibold text-primary mb-1">{selected === q.correct ? "✓ Correct!" : "✗ Incorrect"}</div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              The correct answer is <strong>{String.fromCharCode(65 + q.correct)}: {q.options[q.correct]}</strong>.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150">
          Exit Test
        </button>
        <button onClick={handleNext} disabled={selected === null} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-150 hover:shadow-md">
          {!revealed ? "Submit" : currentQ === questions.length - 1 ? "Finish →" : "Next →"}
        </button>
      </div>
    </div>
  );
}
