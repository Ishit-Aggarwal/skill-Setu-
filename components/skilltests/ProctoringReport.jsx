"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuery, isBackendConfigured } from "../../lib/convexBrowser";
import { EVENT_LABEL, autoSubmitMessage } from "../../lib/examState";
import { EXAM } from "../../lib/settings";
import { Badge, Button, Card, PageHeader } from "../ui/Kit";

/**
 * The proctoring report (Section 2.6), host only.
 *
 * The recording was uploaded as consecutive chunks, so the player is a
 * playlist: one scrub bar spans the whole sitting, every flagged moment is a
 * marker on it, and clicking a marker loads the chunk that covers that
 * second and seeks inside it. Gaps where no chunk arrived are drawn on the
 * bar and listed, so a missing minute is never mistaken for a quiet one.
 */

const MARKER_TONE = {
  FULLSCREEN_EXIT: "#DC2626",
  TAB_SWITCH: "#D97706",
  BLOCKED_ACTION: "#7C3AED",
  AUDIO_FLAG: "#2563EB",
  DEVICE_DISCONNECTED: "#DB2777",
  RECORDING_UPLOAD_FAILURE: "#6B7280",
  AUTO_SUBMIT_TRIGGERED: "#111827",
};

function clock(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function describe(e) {
  const base = EVENT_LABEL[e.type] || e.type;
  if (e.type === "AUTO_SUBMIT_TRIGGERED") return autoSubmitMessage(e.detail).replace("Your test was", "The test was");
  if (e.type === "FULLSCREEN_EXIT" && e.durationMs != null) return `${base} for ${Math.round(e.durationMs / 1000)}s`;
  if (e.detail) return `${base} — ${e.detail}`;
  return base;
}

export default function ProctoringReport({ attemptId }) {
  const { user } = useAuth();
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [pendingSeek, setPendingSeek] = useState(null);
  const [positionMs, setPositionMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);

  async function load() {
    if (!isBackendConfigured()) {
      setError("The proctoring report needs a connection to the shared database.");
      setData(null);
      return;
    }
    try {
      setData(await backendQuery(api.exams.report, { attemptId }));
    } catch (err) {
      setError(backendErrorMessage(err, "Could not load this report."));
      setData(null);
    }
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, attemptId]);

  const attempt = data?.attempt;
  const chunks = data?.chunks || [];
  const totalMs = useMemo(() => {
    if (!attempt?.startedAt) return 0;
    const end = attempt.endedAt ? new Date(attempt.endedAt) - new Date(attempt.startedAt) : chunks.length ? chunks[chunks.length - 1].endedAtMs : 0;
    return Math.max(end, chunks.length ? chunks[chunks.length - 1].endedAtMs : 0, 1000);
  }, [attempt, chunks]);

  const counts = useMemo(() => {
    const c = {};
    (data?.events || []).forEach((e) => {
      c[e.type] = (c[e.type] || 0) + 1;
    });
    return c;
  }, [data]);

  /* ---- playlist player ---- */
  function jumpTo(ms) {
    const idx = chunks.findIndex((c) => ms >= c.startedAtMs && ms < c.endedAtMs);
    const target = idx >= 0 ? idx : chunks.findIndex((c) => c.startedAtMs > ms);
    if (target < 0) return;
    setPendingSeek(Math.max(0, ms - chunks[target].startedAtMs));
    setChunkIndex(target);
    if (target === chunkIndex && videoRef.current) seekWithin(videoRef.current, Math.max(0, ms - chunks[target].startedAtMs));
  }

  function seekWithin(video, seconds) {
    const go = () => {
      video.currentTime = seconds / 1000;
      video.play().catch(() => {});
    };
    if (Number.isFinite(video.duration) && video.duration > 0) return go();
    // MediaRecorder output has no duration header; forcing a seek to the end
    // makes the browser compute it, after which real seeking works.
    const onUpdate = () => {
      video.removeEventListener("timeupdate", onUpdate);
      go();
    };
    video.addEventListener("timeupdate", onUpdate);
    video.currentTime = 1e101;
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !chunks[chunkIndex]) return undefined;
    const onLoaded = () => {
      if (pendingSeek != null) {
        seekWithin(video, pendingSeek);
        setPendingSeek(null);
      }
    };
    const onTime = () => setPositionMs(chunks[chunkIndex].startedAtMs + video.currentTime * 1000);
    const onEnded = () => {
      if (chunkIndex < chunks.length - 1) {
        setPendingSeek(0);
        setChunkIndex(chunkIndex + 1);
      }
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);
    video.load();
    if (pendingSeek != null || chunkIndex > 0) video.play().catch(() => {});
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkIndex, chunks.length]);

  async function setDisqualified(value) {
    setBusy(true);
    try {
      await backendMutation(api.exams.setDisqualified, { attemptId, disqualified: value });
      await load();
    } catch (err) {
      setError(backendErrorMessage(err, "Could not update this attempt."));
    } finally {
      setBusy(false);
    }
  }

  const finalState = attempt?.state === "GRADED" ? (attempt.autoSubmitReason ? "AUTO_SUBMITTED" : "SUBMITTED") : attempt?.state;

  return (
    <DashboardLayout activePage="skill-assessment" title="Proctoring Report">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="Secure exam room"
          title="Proctoring Report"
          subtitle={data?.test?.title || ""}
          actions={
            <Link href="/skill-assessment" className="text-xs text-muted-foreground hover:text-foreground">
              ← Back to tests
            </Link>
          }
        />

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">⚠️ {error}</div>}
        {data === undefined && !error && <p className="text-xs text-muted-foreground">Loading the report…</p>}

        {data && attempt && (
          <>
            {/* Summary */}
            <Card className="space-y-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Student</div>
                  <div className="font-medium text-foreground">{data.student?.name || attempt.studentId}</div>
                  <div className="text-muted-foreground">{data.student?.institution || ""}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sitting</div>
                  <div className="text-foreground">
                    {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Not started"}
                    {attempt.endedAt ? ` → ${new Date(attempt.endedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}
                  </div>
                  <div className="text-muted-foreground">Duration {clock(totalMs)}{attempt.pausedMs ? ` · paused ${clock(attempt.pausedMs)}` : ""}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Final state</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge tone={finalState === "AUTO_SUBMITTED" ? "amber" : finalState === "SUBMITTED" ? "green" : "neutral"}>{String(finalState || "").replace(/_/g, " ")}</Badge>
                    {attempt.score != null && <Badge tone="primary">{attempt.score}%</Badge>}
                    {attempt.disqualified && <Badge tone="red">Disqualified</Badge>}
                  </div>
                  {attempt.autoSubmitReason && <div className="text-muted-foreground mt-1">{autoSubmitMessage(attempt.autoSubmitReason).replace("Your test was", "Test was")}</div>}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Violations · {attempt.violationCount || 0}/{data.violationLimit}</div>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    <li>Fullscreen exits: {counts.FULLSCREEN_EXIT || 0}</li>
                    <li>Tab switches: {counts.TAB_SWITCH || 0}</li>
                    <li>Blocked actions: {counts.BLOCKED_ACTION || 0}</li>
                    <li>Audio flags: {counts.AUDIO_FLAG || 0}</li>
                    <li>Device disconnects: {counts.DEVICE_DISCONNECTED || 0}</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
                <span>{EXAM.MONITORING_NOTICE}</span>
                <span>· Recordings and event logs are deleted automatically after {data.retentionDays} days; the score and consent record are kept.</span>
                {data.consentedAt && <span>· Consent recorded {new Date(data.consentedAt).toLocaleString("en-IN")}.</span>}
                <span className="ml-auto flex gap-2">
                  {data.test?.autoDisqualifyAfter != null && <Badge tone="neutral">Auto-disqualify at {data.test.autoDisqualifyAfter}</Badge>}
                  {attempt.disqualified ? (
                    <Button size="sm" variant="outline" onClick={() => setDisqualified(false)} disabled={busy}>
                      Reverse disqualification
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setDisqualified(true)} disabled={busy}>
                      Mark as disqualified
                    </Button>
                  )}
                </span>
              </div>
            </Card>

            {/* Recording */}
            <Card className="space-y-3">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">Recording</div>
              {data.recordingDeletedAt ? (
                <div className="rounded-xl bg-secondary px-4 py-6 text-center text-xs text-muted-foreground">Recording no longer available (retention period expired)</div>
              ) : chunks.length === 0 ? (
                <div className="rounded-xl bg-secondary px-4 py-6 text-center text-xs text-muted-foreground">
                  No recording was uploaded for this attempt{attempt.state === "GRADED" ? "" : " yet"}.
                </div>
              ) : (
                <>
                  <video ref={videoRef} src={chunks[chunkIndex]?.url} controls playsInline className="w-full max-h-[420px] rounded-xl bg-black" />
                  {/* Whole-sitting scrub bar with markers */}
                  <div className="space-y-1">
                    <div className="relative h-8 rounded-lg bg-secondary overflow-hidden cursor-pointer" onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      jumpTo(((e.clientX - rect.left) / rect.width) * totalMs);
                    }}>
                      {chunks.map((c) => (
                        <div key={c.seq} className="absolute top-0 h-full bg-primary/25" style={{ left: `${(c.startedAtMs / totalMs) * 100}%`, width: `${((c.endedAtMs - c.startedAtMs) / totalMs) * 100}%` }} />
                      ))}
                      {data.gaps.map((g, i) => (
                        <div key={i} title={`Recording unavailable ${clock(g.fromMs)}–${clock(g.toMs)}`} className="absolute top-0 h-full bg-red-200/80" style={{ left: `${(g.fromMs / totalMs) * 100}%`, width: `${((g.toMs - g.fromMs) / totalMs) * 100}%`, backgroundImage: "repeating-linear-gradient(45deg, transparent 0 4px, rgba(220,38,38,.35) 4px 8px)" }} />
                      ))}
                      {data.events.filter((e) => e.type !== "RECORDING_UPLOAD_FAILURE").map((e, i) => (
                        <button
                          key={i}
                          type="button"
                          title={`${clock(e.atMs)} · ${describe(e)}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            jumpTo(e.atMs);
                          }}
                          className="absolute top-0 h-full w-1.5 hover:w-2.5 -translate-x-1/2 rounded-sm"
                          style={{ left: `${(e.atMs / totalMs) * 100}%`, background: MARKER_TONE[e.type] || "#111827" }}
                          aria-label={`Jump to ${clock(e.atMs)}: ${describe(e)}`}
                        />
                      ))}
                      <div className="absolute top-0 h-full w-0.5 bg-foreground" style={{ left: `${Math.min(100, (positionMs / totalMs) * 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{clock(positionMs)} / {clock(totalMs)} · chunk {chunkIndex + 1} of {chunks.length}</span>
                      <span className="flex flex-wrap gap-2">
                        {Object.entries(MARKER_TONE).filter(([t]) => counts[t]).map(([t, colour]) => (
                          <span key={t} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: colour }} />{EVENT_LABEL[t]}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {data.gaps.length > 0 && !data.recordingDeletedAt && (
                <ul className="text-[11px] text-red-700 space-y-0.5">
                  {data.gaps.map((g, i) => (
                    <li key={i}>⚠️ Recording unavailable from {clock(g.fromMs)} to {clock(g.toMs)}</li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Timeline */}
            <Card className="space-y-2">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">Event timeline</div>
              {data.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">{data.recordingDeletedAt ? "The detailed event log was deleted with the recording." : "No flagged events during this sitting."}</p>
              ) : (
                <ol className="divide-y divide-border">
                  {data.events.map((e, i) => (
                    <li key={i} className="flex items-start gap-3 py-2 text-xs">
                      <button type="button" onClick={() => jumpTo(e.atMs)} className="font-mono text-primary hover:underline flex-shrink-0 w-12 text-left" disabled={!chunks.length}>
                        {clock(e.atMs)}
                      </button>
                      <span className="w-2 h-2 rounded-sm mt-1 flex-shrink-0" style={{ background: MARKER_TONE[e.type] || "#111827" }} />
                      <span className="text-foreground">{describe(e)}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">{new Date(e.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                    </li>
                  ))}
                </ol>
              )}
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer">State transitions</summary>
                <ol className="mt-1 space-y-0.5">
                  {(attempt.transitions || []).map((t, i) => (
                    <li key={i} className="font-mono">
                      {new Date(t.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })} → {t.state}{t.reason ? ` (${t.reason})` : ""}
                    </li>
                  ))}
                </ol>
              </details>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
