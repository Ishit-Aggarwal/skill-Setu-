"use client";

import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation, isBackendConfigured } from "../../lib/convexBrowser";
import { recordHostEnteredScore } from "../../lib/store";
import { Avatar, Badge, Button, Flash, Modal } from "../ui/Kit";

/**
 * Where an in-person test's marks come from.
 *
 * An online paper is marked by the server against its answer key. An offline
 * one has no paper the server can see, so its mark has to be entered by the
 * account hosting the test — which is checked server-side, so a candidate
 * cannot post a score for themselves. Previously nobody entered anything and
 * every attendee was silently awarded 85%.
 */
export default function RecordResultsModal({ test, issuer, recipients, onClose, onSaved }) {
  const [scores, setScores] = useState(() =>
    Object.fromEntries(recipients.map((r) => [r.id, r.score != null ? String(r.score) : ""]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  function set(id, value) {
    if (value !== "" && !/^\d{0,3}$/.test(value)) return;
    setScores((s) => ({ ...s, [id]: value }));
  }

  const entered = Object.entries(scores).filter(([, v]) => v !== "" && Number(v) >= 0 && Number(v) <= 100);

  async function save() {
    setError(null);
    if (!entered.length) return setError("Enter a mark out of 100 for at least one candidate.");

    setSaving(true);
    let saved = 0;
    try {
      for (const [studentId, value] of entered) {
        const score = Number(value);
        if (isBackendConfigured()) {
          await backendMutation(api.skillTests.recordOfflineResult, {
            testId: test.id,
            studentId,
            domain: test.domain,
            score,
          });
        }
        // Mirror locally so this device's roster and the student's cached
        // profile agree with what the server now holds.
        recordHostEnteredScore(studentId, test, score, issuer?.id);
        saved += 1;
      }
      setFlash(`Recorded ${saved} result${saved === 1 ? "" : "s"}.`);
      onSaved?.(saved);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not record these results."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Record results — ${test.title}`}
      description={`${test.domain} · marks out of 100 · ${recipients.length} registered`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button type="button" className="flex-1" onClick={save} disabled={saving}>
            {saving ? "Saving…" : `Save ${entered.length || ""} result${entered.length === 1 ? "" : "s"}`.trim()}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}
        <Flash message={flash} />

        {recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nobody has registered for this test yet.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These marks go straight into each candidate&apos;s <span className="font-medium text-foreground">{test.domain}</span>{" "}
              average and are visible on their profile. Leave a row blank to skip it.
            </p>
            <div className="space-y-2">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
                  <Avatar name={r.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.subtitle || r.email}</div>
                  </div>
                  {r.attended ? <Badge tone="green">Attended</Badge> : <Badge tone="muted">No attendance</Badge>}
                  <input
                    value={scores[r.id] ?? ""}
                    onChange={(e) => set(r.id, e.target.value)}
                    inputMode="numeric"
                    placeholder="—"
                    aria-label={`Mark for ${r.name}`}
                    className="w-16 text-center bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
