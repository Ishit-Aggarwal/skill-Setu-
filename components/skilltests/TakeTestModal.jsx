"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuery, isBackendConfigured } from "../../lib/convexBrowser";
import { recordGradedAttempt } from "../../lib/store";
import { Badge, Button, Modal, ProgressBar } from "../ui/Kit";

/**
 * The actual assessment.
 *
 * There was no test here before: "Mark as Completed" wrote a flat 85% for every
 * student on every domain. This component fetches a real paper from the server
 * with the answer key stripped out, collects the candidate's answers, and posts
 * only the answers back. The score comes back from the server, which marks the
 * paper against a key the browser has never seen — so it cannot be edited on
 * the way out, and the marking scheme cannot be read out of the bundle.
 */

function parseDurationMinutes(duration) {
  const match = /(\d+)/.exec(String(duration || ""));
  const minutes = match ? Number(match[1]) : 15;
  return Math.max(2, Math.min(180, minutes));
}

function formatClock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function TakeTestModal({ test, user, onClose, onGraded }) {
  const [phase, setPhase] = useState("loading"); // loading | brief | paper | grading | result | error
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [remaining, setRemaining] = useState(null);

  const submittingRef = useRef(false);
  const durationMins = useMemo(() => parseDurationMinutes(test.duration), [test.duration]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isBackendConfigured()) {
        setError(
          "Graded tests need the shared database. This deployment has no NEXT_PUBLIC_CONVEX_URL set, so the paper cannot be fetched."
        );
        setPhase("error");
        return;
      }
      try {
        const paper = await backendQuery(api.skillTests.getQuestions, { domain: test.domain });
        if (cancelled) return;
        if (!paper?.ok) {
          setError(paper?.error || "This test has no question paper yet. Ask the host to publish one.");
          setPhase("error");
          return;
        }
        setQuestions(paper.questions);
        setAnswers(new Array(paper.questions.length).fill(null));
        setPhase("brief");
      } catch (err) {
        if (cancelled) return;
        setError(backendErrorMessage(err, "Could not load the question paper."));
        setPhase("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [test.domain]);

  const submit = useCallback(
    async (auto = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setPhase("grading");
      try {
        const graded = await backendMutation(api.skillTests.submitAttempt, {
          testId: test.id,
          domain: test.domain,
          answers,
          mode: test.mode,
        });
        // Mirror the server's verdict into this device's cache so the radar,
        // the dashboard tiles and the recruiter view all read the same number.
        recordGradedAttempt(user.id, test, graded);
        setResult({ ...graded, autoSubmitted: auto });
        setPhase("result");
        onGraded?.(graded);
      } catch (err) {
        setError(backendErrorMessage(err, "Could not submit your answers."));
        setPhase("error");
      } finally {
        submittingRef.current = false;
      }
    },
    [answers, onGraded, test, user.id]
  );

  /* The clock is authoritative only as a courtesy — running out submits what
     the candidate has, rather than discarding the attempt. */
  useEffect(() => {
    if (phase !== "paper" || !deadline) return undefined;
    const tick = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        submit(true);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [phase, deadline, submit]);

  function start() {
    setDeadline(Date.now() + durationMins * 60 * 1000);
    setRemaining(durationMins * 60 * 1000);
    setPhase("paper");
  }

  function choose(optionIndex) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optionIndex;
      return next;
    });
  }

  const answeredCount = answers.filter((a) => a != null).length;
  const question = questions[current];

  /* ---------------- Loading / error ---------------- */

  if (phase === "loading") {
    return (
      <Modal title={test.title} description="Loading your question paper…" onClose={onClose} size="lg">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </Modal>
    );
  }

  if (phase === "error") {
    return (
      <Modal title="Test unavailable" onClose={onClose} size="lg">
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  /* ---------------- Brief ---------------- */

  if (phase === "brief") {
    return (
      <Modal
        title={test.title}
        description={`${test.domain} · ${questions.length} questions · ${durationMins} minutes`}
        onClose={onClose}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground leading-relaxed">
            {test.description || "A short multiple-choice assessment for this skill domain."}
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              {questions.length} multiple-choice questions, one correct answer each.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              You have {durationMins} minutes. When the time runs out, whatever you have answered is submitted.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Your paper is marked on the server. The score, and the breakdown behind it, are shown as soon as you submit.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              This result replaces any earlier attempt at this test and updates your skill profile.
            </li>
          </ul>

          {test.rules?.length > 0 && (
            <div className="rounded-xl border border-border p-3.5">
              <div className="text-xs font-semibold text-foreground mb-1.5">Host rules</div>
              <ul className="space-y-1">
                {test.rules.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-primary flex-shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Not now
            </Button>
            <Button type="button" className="flex-1" onClick={start}>
              Start the test
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  /* ---------------- Grading ---------------- */

  if (phase === "grading") {
    return (
      <Modal title="Marking your paper…" onClose={() => {}} size="lg">
        <div className="py-8 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <span className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          Your answers are being checked against the marking scheme.
        </div>
      </Modal>
    );
  }

  /* ---------------- Result ---------------- */

  if (phase === "result" && result) {
    const tone = result.score >= 70 ? "green" : result.score >= 50 ? "amber" : "red";
    return (
      <Modal
        title="Result"
        description={`${test.title} · ${test.domain}`}
        onClose={onClose}
        size="lg"
        footer={
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="space-y-5">
          {result.autoSubmitted && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              Time ran out, so your answers were submitted automatically.
            </div>
          )}

          <div className="flex items-center gap-4">
            <div
              className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${
                tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
              }`}
            >
              <span className="text-2xl font-bold leading-none">{result.score}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">score</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {result.correctCount} of {result.totalQuestions} correct
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Added to your <span className="font-medium text-foreground">{test.domain}</span> average. Your overall skill
                score is now {Math.round(result.assessment?.overallScore ?? 0)}/100.
              </p>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Question by question</div>
            <div className="space-y-2">
              {(result.breakdown || []).map((row) => (
                <div key={row.index} className="flex items-start gap-2.5 rounded-xl border border-border px-3.5 py-2.5">
                  <span className={`text-sm flex-shrink-0 ${row.correct ? "text-emerald-600" : "text-red-500"}`}>
                    {row.correct ? "✓" : "✕"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-foreground leading-relaxed">{row.question}</div>
                    {!row.correct && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {row.chosen == null ? "Not answered" : `You chose option ${row.chosen + 1}`} · correct answer:
                        option {row.correctOption + 1}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  /* ---------------- The paper ---------------- */

  const lowOnTime = remaining != null && remaining < 60 * 1000;

  return (
    <Modal
      title={test.title}
      description={`${test.domain} · question ${current + 1} of ${questions.length}`}
      onClose={() => {
        if (window.confirm("Leave the test? Your answers so far will not be saved.")) onClose();
      }}
      size="lg"
      footer={
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            ← Back
          </Button>
          {current < questions.length - 1 ? (
            <Button type="button" className="flex-1" onClick={() => setCurrent((c) => c + 1)}>
              Next question
            </Button>
          ) : (
            <Button type="button" className="flex-1" onClick={() => submit(false)}>
              Submit for marking
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </span>
          <Badge tone={lowOnTime ? "red" : "neutral"}>⏱ {formatClock(remaining ?? 0)} left</Badge>
        </div>
        <ProgressBar value={answeredCount} max={questions.length} />

        <div className="pt-1">
          <p className="text-sm font-medium text-foreground leading-relaxed mb-3">{question.question}</p>
          <div className="space-y-2">
            {question.options.map((option, i) => {
              const selected = answers[current] === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  className={`w-full text-left flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-all duration-150 ${
                    selected
                      ? "border-primary bg-primary/8 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5 ${
                      selected ? "border-primary bg-primary text-white" : "border-border"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="leading-relaxed">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Jump between questions — a candidate should be able to come back to
            one they skipped rather than being marched through in one pass. */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border mt-4 pt-3">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to question ${i + 1}`}
              className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                i === current
                  ? "bg-primary text-white"
                  : answers[i] != null
                  ? "bg-primary/12 text-primary"
                  : "bg-secondary text-muted-foreground hover:bg-muted"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
