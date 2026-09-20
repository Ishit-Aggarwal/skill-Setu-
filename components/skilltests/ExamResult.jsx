"use client";

import CertificateCard from "../certificates/CertificateCard";
import { autoSubmitMessage } from "../../lib/examState";
import { TYPE_LABEL } from "../../lib/questions";
import { Badge, Button } from "../ui/Kit";

/**
 * The graded result, shown the moment the server has marked the paper.
 *
 * This is the first time the candidate sees a correct answer or an
 * explanation — the server only returns them for a GRADED attempt — so the
 * review is drawn straight from the grading payload rather than from
 * anything cached on the way in.
 */
export default function ExamResult({ test, result, onClose }) {
  const tone = result.score >= 70 ? "green" : result.score >= 50 ? "amber" : "red";
  const certificate = result.certificate || { status: "not_enabled", credential: null };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{test.title}</p>
          <h1 className="text-xl font-semibold text-foreground">Your result</h1>
        </div>
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>

      {result.autoSubmitted && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{autoSubmitMessage(result.autoSubmitReason)}</div>
      )}
      {result.disqualified && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Your attempt was flagged for review and is currently disqualified pending your professor's decision. Your answers were still marked and are shown below.
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
          <span className="text-2xl font-bold leading-none">{result.score}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">score</span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {result.points ?? result.correctCount} of {result.total ?? result.totalQuestions} points
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Added to your <span className="font-medium text-foreground">{test.domain}</span> average. Your overall skill score is now {Math.round(result.assessment?.overallScore ?? 0)}/100.
          </p>
        </div>
      </div>

      {certificate.status === "issued" && <CertificateCard credential={certificate.credential} status="issued" />}
      {certificate.status === "below_minimum" && <CertificateCard status="below_minimum" minScore={test.minCertificateScore} />}

      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Question by question</div>
        <div className="space-y-2">
          {(result.breakdown || []).map((row) => (
            <div key={row.questionId || row.index} className={`rounded-xl border px-3.5 py-3 ${row.correct ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/20"}`}>
              <div className="flex items-start gap-2.5">
                <span className={`text-sm flex-shrink-0 ${row.correct ? "text-emerald-600" : "text-red-500"}`}>{row.correct ? "✓" : "✕"}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Q{row.index + 1}</span>
                    <Badge tone={row.type === "multiple" ? "purple" : "blue"}>{TYPE_LABEL[row.type] || ""}</Badge>
                  </div>
                  <div className="text-xs text-foreground leading-relaxed">{row.question}</div>
                  <div className={`text-[11px] ${row.correct ? "text-emerald-700" : "text-red-600"}`}>Your answer: {row.chosenText || "Not answered"}</div>
                  {!row.correct && <div className="text-[11px] text-emerald-800">✓ Correct answer: {row.correctText}</div>}
                  {row.explanation && <div className="text-[11px] text-muted-foreground bg-secondary/50 rounded-lg px-2.5 py-1.5 leading-relaxed">💡 {row.explanation}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
