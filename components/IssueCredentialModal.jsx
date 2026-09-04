"use client";

import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Field, Modal, Select, TextArea, TextInput } from "./ui/Kit";
import { CREDENTIAL_KINDS, issueCredential } from "../lib/store";

/**
 * Shared certificate issuer, used by companies, institutions and faculty.
 *
 * A credential issued here is owned by the issuer, not the student — the
 * student can view, print and share it but never edit it, which is what makes
 * it worth more than a self-declared line in their portfolio.
 *
 * `recipients` is `[{ id, name, email, score, alreadyIssued }]`. Anyone already
 * holding a certificate for this test is pre-excluded rather than hidden, so
 * the issuer can see the whole cohort and why someone is unavailable.
 */
export default function IssueCredentialModal({ issuer, recipients = [], defaults = {}, onClose, onIssued }) {
  const eligible = useMemo(() => recipients.filter((r) => !r.alreadyIssued), [recipients]);

  const [selected, setSelected] = useState(() => new Set(eligible.map((r) => r.id)));
  const [title, setTitle] = useState(defaults.title || "");
  const [kind, setKind] = useState(defaults.kind || "Participation");
  const [grade, setGrade] = useState("");
  const [remarks, setRemarks] = useState(defaults.remarks || "");
  const [includeScores, setIncludeScores] = useState(recipients.some((r) => r.score != null));
  const [error, setError] = useState(null);
  const [issuing, setIssuing] = useState(false);

  const allSelected = eligible.length > 0 && eligible.every((r) => selected.has(r.id));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(eligible.map((r) => r.id)));
  }

  function handleIssue() {
    setError(null);
    if (!title.trim()) return setError("Give the certificate a title — it is printed as the achievement.");
    if (!selected.size) return setError("Select at least one recipient.");

    setIssuing(true);
    const chosen = eligible.filter((r) => selected.has(r.id));
    chosen.forEach((r) =>
      issueCredential(
        issuer,
        { id: r.id, name: r.name, email: r.email },
        {
          title: title.trim(),
          kind,
          testId: defaults.testId || null,
          score: includeScores && r.score != null ? `${r.score}%` : null,
          grade: grade.trim() || null,
          remarks: remarks.trim(),
        }
      )
    );
    setIssuing(false);
    onIssued?.(chosen.length);
    onClose();
  }

  return (
    <Modal
      title="Issue certificates"
      description="Recipients get a verifiable certificate on their portfolio and a notification in their inbox."
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Certificate title" className="sm:col-span-2">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Frontend Engineering Fundamentals"
            />
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {CREDENTIAL_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </Select>
          </Field>
          <Field label="Grade" hint="Optional — printed next to the score.">
            <TextInput value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="A / Distinction" />
          </Field>
          <Field label="Remarks" hint="Optional line printed under the achievement." className="sm:col-span-2">
            <TextArea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Completed all modules with distinction." />
          </Field>
        </div>

        {recipients.some((r) => r.score != null) && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={includeScores} onChange={(e) => setIncludeScores(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
            Print each recipient&apos;s own score on their certificate
          </label>
        )}

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recipients ({selected.size} of {eligible.length})
            </div>
            {eligible.length > 0 && (
              <button onClick={toggleAll} className="text-xs text-primary font-medium hover:underline">
                {allSelected ? "Clear all" : "Select all"}
              </button>
            )}
          </div>

          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-secondary/40 border border-border rounded-xl px-3.5 py-3">
              Nobody has registered for this yet, so there is nobody to certify.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {recipients.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    r.alreadyIssued
                      ? "border-border bg-secondary/40 cursor-not-allowed opacity-70"
                      : selected.has(r.id)
                      ? "border-primary bg-primary/5 cursor-pointer"
                      : "border-border hover:border-primary/40 cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={r.alreadyIssued}
                    checked={!r.alreadyIssued && selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="w-4 h-4 accent-primary flex-shrink-0"
                  />
                  <Avatar name={r.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.email || r.subtitle || "—"}</div>
                  </div>
                  {r.score != null && <Badge tone="primary">{r.score}%</Badge>}
                  {r.alreadyIssued && <Badge tone="green">Issued</Badge>}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" disabled={issuing || !selected.size} onClick={handleIssue}>
            {issuing ? "Issuing…" : `Issue ${selected.size || ""} certificate${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
