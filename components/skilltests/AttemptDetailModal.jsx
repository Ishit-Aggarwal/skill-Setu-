"use client";

import { Badge, Button, Modal, ProgressBar } from "../ui/Kit";
import { formatDateTime } from "../../lib/match";
import { formatScheduled, STATUS_LABEL, STATUS_TONE } from "../../lib/testStatus";

/**
 * One attempt, opened from the attempt log.
 *
 * Shows the score, how long it took, when it was sat, and — for a
 * server-marked paper — the real question-by-question review.
 *
 * Two things this deliberately does NOT do:
 *
 *  - It does not import the question bank. That module holds the marking
 *    scheme, and a "use client" component importing it puts every question and
 *    its `correct:` index into a JavaScript chunk any candidate can open in
 *    devtools before sitting the test. The bank lives under convex/_lib for
 *    exactly that reason.
 *
 *  - It does not synthesise a breakdown when one wasn't recorded. Deriving
 *    "you got the first three right" from a percentage produces a specific,
 *    confident claim about answers the student never gave. An attempt with no
 *    stored marking says so instead.
 */

function formatDuration(ms) {
  if (ms == null) return null;
  const total = Math.max(0, Math.round(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

export default function AttemptDetailModal({ test, registration, attempt, status, onClose, onRetake }) {
  const scoreTone = attempt ? (attempt.score >= 70 ? "green" : attempt.score >= 50 ? "amber" : "red") : "muted";

  /* The marking as the server recorded it, or nothing. */
  const breakdown = attempt?.breakdown || [];

  const displayCorrectCount = attempt?.correctCount ?? breakdown.filter((b) => b.correct).length;
  const displayTotalQuestions = attempt?.totalQuestions ?? (breakdown.length || null);
  const timeTaken = formatDuration(attempt?.timeTakenMs);

  /* A completed online paper can be sat again — the store replaces the earlier
     attempt rather than stacking two scores for one test. An in-person result
     entered by the host is not the candidate's to redo. */
  const canRetake = Boolean(onRetake && test?.mode === "Online" && status !== "upcoming" && attempt?.gradedBy !== "host");

  return (
    <Modal
      title={test.title}
      description={`${test.domain} · hosted by ${test.hostName}`}
      onClose={onClose}
      size="lg"
      footer={
        canRetake ? (
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button type="button" className="flex-1" onClick={onRetake}>
              {attempt ? "Retake this test" : "Take this test"}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
          <Badge tone="neutral">{test.mode}</Badge>
          {attempt?.autoSubmitted && <Badge tone="amber">Auto-submitted at time-up</Badge>}
          {attempt?.missed && <Badge tone="red">Recorded as missed</Badge>}
        </div>

        {attempt ? (
          <>
            <div className="flex items-center gap-4">
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${
                  scoreTone === "green"
                    ? "bg-emerald-50 text-emerald-700"
                    : scoreTone === "amber"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <span className="text-2xl font-bold leading-none">{attempt.score}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">score</span>
              </div>
              <div className="min-w-0">
                {displayTotalQuestions ? (
                  <div className="text-sm font-semibold text-foreground">
                    {displayCorrectCount} of {displayTotalQuestions} correct
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-foreground">Result entered by the host</div>
                )}
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Counted towards your <span className="font-medium text-foreground">{test?.domain || attempt.domain}</span> average
                  {attempt.weight && attempt.weight !== 1 ? ` at ${attempt.weight}× weight` : ""}.
                </p>
              </div>
            </div>

            <dl className="divide-y divide-border text-sm">
              {[
                ["Attempted", attempt.completedAt ? formatDateTime(attempt.completedAt) : "—"],
                ["Time taken", timeTaken || (test?.mode === "Offline" ? "In person" : "Not recorded")],
                ["Scheduled for", test ? formatScheduled(test) : "Flexible"],
                ["Marked by", attempt.gradedBy === "server" ? "Automatic marking" : attempt.gradedBy ? "The test host" : "Skill Setu Quiz Engine"],
                registration?.registeredAt ? ["Registered", formatDateTime(registration.registeredAt)] : null,
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-xs text-muted-foreground flex-shrink-0">{label}</dt>
                    <dd className="text-sm text-foreground text-right">{value}</dd>
                  </div>
                ))}
            </dl>

            {breakdown.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question by question review</div>
                  <div className="text-[11px] text-muted-foreground">
                    {breakdown.filter((b) => b.correct).length} right · {breakdown.filter((b) => !b.correct).length} wrong
                  </div>
                </div>
                <ProgressBar value={attempt.score} />
                <div className="space-y-2.5 mt-3">
                  {breakdown.map((row) => (
                    <div key={row.index} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${row.correct ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/20"}`}>
                      <span className={`text-base font-bold flex-shrink-0 mt-0.5 ${row.correct ? "text-emerald-600" : "text-red-500"}`}>
                        {row.correct ? "✓" : "✕"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground leading-relaxed">
                          {/* The server numbers questions from zero. */}
                          <span className="text-muted-foreground font-normal mr-1.5">Q{row.index + 1}:</span>
                          {row.question}
                        </div>
                        <div className="text-[11px] mt-1.5 space-y-1">
                          <div className={row.correct ? "text-emerald-700 font-medium" : "text-red-600 font-medium"}>
                            Your answer: {row.chosenText || (row.chosen != null ? `Option ${row.chosen + 1}` : "Not answered")}
                          </div>
                          {!row.correct && (
                            <div className="text-emerald-800 font-medium">
                              ✓ Correct answer: {row.correctText || `Option ${row.correctOption + 1}`}
                            </div>
                          )}
                          {row.explanation && (
                            <div className="text-[11px] text-muted-foreground bg-secondary/50 rounded-lg px-2.5 py-1.5 mt-1 leading-relaxed">
                              💡 {row.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Two different reasons there's no marking to show, and they are
                not the same thing to the person reading. */}
            {breakdown.length === 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {attempt.totalQuestions == null
                  ? "This was an in-person assessment, so there is no question-by-question marking to show — the host published the mark directly."
                  : "The question-by-question marking for this attempt wasn't kept. Sitting the test again will record it."}
              </p>
            )}
          </>
        ) : (
          <div className="rounded-xl bg-secondary px-4 py-3.5 text-sm text-muted-foreground leading-relaxed">
            {status === "upcoming"
              ? `You're registered. The paper opens at ${formatScheduled(test)}.`
              : status === "awaiting-result"
              ? "You attended, and the host hasn't published the mark yet. It will appear here as soon as they do."
              : "No attempt recorded for this test yet."}
          </div>
        )}

        {test.description && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">About this test</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{test.description}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
