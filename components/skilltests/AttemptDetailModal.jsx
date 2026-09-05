"use client";

import { Badge, Button, Modal, ProgressBar } from "../ui/Kit";
import { formatDateTime } from "../../lib/match";
import { formatScheduled, STATUS_LABEL, STATUS_TONE } from "../../lib/testStatus";

/**
 * One attempt, opened from the attempt log.
 *
 * The log used to be a read-only table: a score and a status, with the marking
 * that produced them thrown away at the end of the test dialog. A candidate
 * who wanted to know *which* questions they lost had exactly one chance to
 * look, immediately after submitting, and no way back.
 *
 * So every row now opens this — the score, the marking, how long they took,
 * when they sat it, and a way to sit it again where that is allowed.
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
  const breakdown = attempt?.breakdown || [];
  const timeTaken = formatDuration(attempt?.timeTakenMs);

  /* A completed online paper can be sat again — the store replaces the earlier
     attempt rather than stacking two scores for one test. An in-person result
     entered by the host is not the candidate's to redo. */
  const canRetake = test.mode === "Online" && status !== "upcoming" && attempt?.gradedBy !== "host";

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
                {attempt.totalQuestions ? (
                  <div className="text-sm font-semibold text-foreground">
                    {attempt.correctCount} of {attempt.totalQuestions} correct
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-foreground">Result entered by the host</div>
                )}
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Counted towards your <span className="font-medium text-foreground">{test.domain}</span> average
                  {attempt.weight && attempt.weight !== 1 ? ` at ${attempt.weight}× weight` : ""}.
                </p>
              </div>
            </div>

            <dl className="divide-y divide-border text-sm">
              {[
                ["Attempted", attempt.completedAt ? formatDateTime(attempt.completedAt) : "—"],
                ["Time taken", timeTaken || (test.mode === "Offline" ? "In person" : "Not recorded")],
                ["Scheduled for", formatScheduled(test)],
                ["Marked by", attempt.gradedBy === "server" ? "Automatic marking" : attempt.gradedBy ? "The test host" : "—"],
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
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question by question</div>
                  <div className="text-[11px] text-muted-foreground">
                    {breakdown.filter((b) => b.correct).length} right · {breakdown.filter((b) => !b.correct).length} wrong
                  </div>
                </div>
                <ProgressBar value={attempt.score} />
                <div className="space-y-2 mt-3">
                  {breakdown.map((row) => (
                    <div key={row.index} className="flex items-start gap-2.5 rounded-xl border border-border px-3.5 py-2.5">
                      <span className={`text-sm flex-shrink-0 ${row.correct ? "text-emerald-600" : "text-red-500"}`}>
                        {row.correct ? "✓" : "✕"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-foreground leading-relaxed">{row.question}</div>
                        {!row.correct && (
                          <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                            <div>
                              {row.chosen == null
                                ? "You didn't answer this one."
                                : `You chose: ${row.chosenText || `option ${row.chosen + 1}`}`}
                            </div>
                            <div className="text-emerald-700">
                              Correct answer: {row.correctText || `option ${row.correctOption + 1}`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {breakdown.length === 0 && attempt.totalQuestions == null && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                This was an in-person assessment, so there is no question-by-question marking to show — the host
                published the mark directly.
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
