"use client";

import { Badge, Button, Modal } from "../ui/Kit";
import { TYPE_LABEL } from "../../lib/questions";

/**
 * The before/after view for a "Recheck with AI" result.
 *
 * Current version on the left (top on a phone), the proposal on the right,
 * with every changed line highlighted. Two explicit actions and nothing
 * automatic: "Accept changes" replaces the question, "Keep original" logs
 * that a recheck was run and declined.
 */

function changed(a, b) {
  return String(a || "").trim() !== String(b || "").trim();
}

function Side({ title, q, other, tone }) {
  const hl = tone === "after" ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-200 line-through decoration-red-400";
  const otherOptions = other?.options || [];
  return (
    <div className="rounded-xl border border-border p-3 space-y-2 min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={q.type === "multiple" ? "purple" : "blue"} className={changed(q.type, other?.type) ? "ring-2 ring-amber-300" : ""}>
          {TYPE_LABEL[q.type]}
        </Badge>
      </div>
      <p className={`text-xs text-foreground leading-relaxed rounded-lg px-2 py-1 border ${changed(q.text, other?.text) ? hl : "border-transparent"}`}>{q.text}</p>
      <ul className="space-y-1">
        {q.options.map((o, i) => {
          const counterpart = otherOptions.find((x) => x.id === o.id) || otherOptions[i];
          const diff = !counterpart || changed(o.text, counterpart.text) || Boolean(o.isCorrect) !== Boolean(counterpart.isCorrect);
          return (
            <li key={o.id || i} className={`flex items-start gap-2 text-xs rounded-lg px-2 py-1 border ${diff ? hl : "border-transparent"}`}>
              <span className={`flex-shrink-0 w-4 h-4 rounded-full border text-[9px] flex items-center justify-center ${o.isCorrect ? "bg-emerald-600 border-transparent text-white" : "border-border text-muted-foreground"}`}>
                {o.isCorrect ? "✓" : ""}
              </span>
              <span className="leading-relaxed">{o.text}</span>
            </li>
          );
        })}
      </ul>
      <div className={`text-[11px] text-muted-foreground rounded-lg px-2 py-1 border ${changed(q.explanation, other?.explanation) ? hl : "border-transparent"}`}>
        💡 {q.explanation || <span className="italic">No explanation</span>}
      </div>
    </div>
  );
}

export default function RecheckDialog({ question, result, busy, onAccept, onKeep, onClose }) {
  const ok = result?.verdict === "ok" || !result?.proposed;
  return (
    <Modal title="Recheck with AI" description={result?.reason || (ok ? "" : "The AI suggests a correction.")} onClose={busy ? () => {} : onClose} size="lg">
      {ok ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ AI reviewed this question and found no issues.</div>
          <Button type="button" className="w-full" onClick={onKeep} disabled={busy}>
            {busy ? "Saving…" : "Close"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Side title="Current version" q={question} other={result.proposed} tone="before" />
            <Side title="AI proposal" q={result.proposed} other={question} tone="after" />
          </div>
          <p className="text-[11px] text-muted-foreground">Highlighted lines differ between the two versions. Nothing changes until you choose.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onKeep} disabled={busy}>
              Keep original
            </Button>
            <Button type="button" className="flex-1" onClick={onAccept} disabled={busy}>
              {busy ? "Applying…" : "Accept changes"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
