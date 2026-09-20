"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuery, convexClient, isBackendConfigured } from "../../lib/convexBrowser";
import { getSessionToken } from "../../lib/session";
import { getAssessment, insert, findOne, recordGradedAttempt } from "../../lib/store";
import { EXAM } from "../../lib/settings";
import { autoSubmitMessage } from "../../lib/examState";
import { TYPE_LABEL } from "../../lib/questions";
import { Badge, Button, ProgressBar } from "../ui/Kit";
import ExamResult from "./ExamResult";

/**
 * The secure exam room (Section 2).
 *
 * A full-page surface, not a dialog. The candidate goes through consent →
 * camera/microphone permission → a live device check → fullscreen, and only
 * then does the server start the clock and hand over the paper (with no
 * answer key in it). While the paper is open the room records continuously
 * in short chunks, watches fullscreen, tab focus, blocked shortcuts,
 * sustained microphone noise and device loss, and reports every event to
 * the server — which keeps the count, decides when the limit forces a
 * submission, and grades the paper.
 *
 * Nothing here claims cheating is impossible. The copy is the one line from
 * lib/settings.js: recorded and monitored, flagged for the host's review.
 */

const BLOCKED_KEYS = [
  { test: (e) => e.key === "F12", name: "Developer tools (F12)" },
  { test: (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()), name: "Developer tools shortcut" },
  { test: (e) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u", name: "View source" },
  { test: (e) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p", name: "Print" },
  { test: (e) => (e.ctrlKey || e.metaKey) && ["c", "x", "v"].includes(e.key.toLowerCase()), name: "Copy / cut / paste" },
  { test: (e) => (e.ctrlKey || e.metaKey) && e.altKey && ["i", "j", "c", "u"].includes(e.key.toLowerCase()), name: "Developer tools shortcut" },
];

function formatClock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function browserSupport() {
  if (typeof window === "undefined") return { ok: false, reason: "no-window" };
  const ua = navigator.userAgent || "";
  const mobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|Opera Mini/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua) && window.innerWidth < 900);
  const fullscreen = Boolean(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  const recorder = typeof window.MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  const inApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter/i.test(ua);
  return { ok: !mobile && fullscreen && recorder && !inApp, mobile, fullscreen, recorder, inApp };
}

function pickMimeType() {
  const candidates = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4"];
  return candidates.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
}

/* The page chrome around every phase. Declared at module level so its identity
   is stable across renders — an inline component would remount on every
   state change and lose the fullscreen element and the preview video. */
function Shell({ rootRef, showBanner, violations, title, wide = false, children }) {
  // Portalled to <body>: a test card's hover transform would otherwise turn
  // this fixed overlay into a box the size of the card.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[100] bg-background overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      {showBanner && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2 bg-red-600 text-white text-xs font-semibold">
          <span>🔴 Recording & Monitoring Active — Violations: {violations}/{EXAM.VIOLATION_LIMIT}</span>
          <span className="font-normal opacity-90 hidden sm:inline">{EXAM.MONITORING_NOTICE}</span>
        </div>
      )}
      <div className={`mx-auto px-4 py-6 sm:py-10 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>{children}</div>
    </div>,
    document.body
  );
}

const PERMISSION_STEPS = {
  Chrome: ["Click the lock (or tune) icon at the left of the address bar.", 'Set both "Camera" and "Microphone" to "Allow".', "Reload this page and click Try again."],
  Edge: ["Click the lock icon at the left of the address bar.", 'Under "Permissions for this site", set Camera and Microphone to "Allow".', "Reload the page and click Try again."],
  Firefox: ["Click the camera/microphone icon at the left of the address bar.", 'Remove the "Blocked" entries, then click Try again and choose "Allow".'],
  Safari: ['Open Safari → Settings → Websites → Camera / Microphone.', 'Set this site to "Allow", then click Try again.'],
};

export default function ExamRoom({ test, user, onClose, onGraded }) {
  const proctored = test.mode === "Online" && test.proctored !== false;
  const [phase, setPhase] = useState("starting"); // starting | unsupported | consent | permissions | denied | device | fullscreen | paper | grading | result | error
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [violations, setViolations] = useState(0);
  const [paused, setPaused] = useState(null); // { reason: "fullscreen" | "device", until: ms }
  const [pauseLeft, setPauseLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const [videoLive, setVideoLive] = useState(false);
  const [micHeard, setMicHeard] = useState(false);
  const [uploadIssue, setUploadIssue] = useState(false);

  const rootRef = useRef(null);
  const streamRef = useRef(null);
  const previewRef = useRef(null);
  const recorderRef = useRef(null);
  const chunkSeqRef = useRef(0);
  const chunkStartRef = useRef(0);
  const recordingRef = useRef(false);
  const startedAtRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const meterTimerRef = useRef(null);
  const noiseSinceRef = useRef(null);
  const noiseFlaggedRef = useRef(false);
  const eventQueueRef = useRef([]);
  const flushTimerRef = useRef(null);
  const submittingRef = useRef(false);
  const phaseRef = useRef(phase);
  const pausedRef = useRef(null);
  const pauseStartRef = useRef(null);
  const lastBlockedRef = useRef({});
  const answersRef = useRef({});
  const saveTimerRef = useRef(null);
  const attemptRef = useRef(null);
  const deviceLostRef = useRef(false);
  /* Server clock minus this device's clock. Every server timestamp (start,
     deadline) is converted through this before it is compared with Date.now(),
     so a laptop whose clock is a few seconds off still counts down correctly
     and stamps events at the right offset into the recording. */
  const clockOffsetRef = useRef(0);
  const toLocal = (serverMs) => (serverMs == null ? null : serverMs - clockOffsetRef.current);

  phaseRef.current = phase;
  pausedRef.current = paused;
  answersRef.current = answers;
  attemptRef.current = attempt;

  const elapsedMs = useCallback(() => (startedAtRef.current ? Date.now() - startedAtRef.current : 0), []);

  /* ------------------------------------------------------------------ */
  /* Server helpers                                                       */
  /* ------------------------------------------------------------------ */

  const applyGraded = useCallback(
    (payload) => {
      const enriched = {
        ...payload.result,
        autoSubmitted: Boolean(payload.autoSubmitReason),
        autoSubmitReason: payload.autoSubmitReason || null,
        startedAt: startedAtRef.current ? new Date(startedAtRef.current).toISOString() : null,
        timeTakenMs: startedAtRef.current ? Date.now() - startedAtRef.current : null,
        weight: 1,
        assessment: payload.assessment,
        certificate: payload.certificate,
        disqualified: Boolean(payload.disqualified),
      };
      // Mirror into this device's store so the dashboard tiles, the radar and
      // the attempt log read the same verdict the server just wrote.
      recordGradedAttempt(user.id, test, enriched);
      if (!enriched.assessment) enriched.assessment = getAssessment(user.id);
      const credential = payload.certificate?.credential;
      if (credential && !findOne("credentials", (c) => c.id === credential.id)) insert("credentials", credential);
      setResult(enriched);
      setPhase("result");
      onGraded?.(enriched);
    },
    [test, user.id, onGraded]
  );

  const flushEvents = useCallback(async () => {
    const batch = eventQueueRef.current.splice(0);
    const att = attemptRef.current;
    if (!batch.length || !att) return null;
    try {
      const out = await backendMutation(api.exams.logEvents, { attemptId: att.id, events: batch });
      if (out?.violationCount != null) setViolations(out.violationCount);
      if (out?.state === "GRADED" && out.result) {
        stopEverything();
        applyGraded(out);
      }
      return out;
    } catch (err) {
      // Put them back for the next flush; a flaky connection must not lose a flag.
      eventQueueRef.current.unshift(...batch);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyGraded]);

  const logEvent = useCallback(
    (type, detail, durationMs, { immediate = false } = {}) => {
      eventQueueRef.current.push({ type, atMs: elapsedMs(), detail, durationMs: durationMs ?? null });
      if (immediate || EXAM.VIOLATION_TYPES.includes(type)) {
        clearTimeout(flushTimerRef.current);
        flushEvents();
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushEvents();
        }, 2000);
      }
    },
    [elapsedMs, flushEvents]
  );

  const submit = useCallback(
    async ({ auto = false, reason } = {}) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      const att = attemptRef.current;
      setPhase("grading");
      try {
        clearTimeout(flushTimerRef.current);
        await flushEvents();
        if (phaseRef.current === "result") return;
        const out = await backendMutation(api.exams.submit, { attemptId: att.id, answers: answersRef.current, auto, reason, atMs: elapsedMs() });
        stopEverything();
        if (out?.ok === false && out.state === "GRADED") {
          const review = await backendQuery(api.exams.review, { attemptId: att.id });
          if (review?.ok) applyGraded({ result: review.result, certificate: review.certificate, autoSubmitReason: review.attempt.autoSubmitReason, disqualified: review.attempt.disqualified });
          return;
        }
        applyGraded(out);
      } catch (err) {
        setError(backendErrorMessage(err, "Could not submit your answers. Your progress is saved — please try again."));
        setPhase("paper");
      } finally {
        submittingRef.current = false;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [applyGraded, elapsedMs, flushEvents]
  );

  /* ------------------------------------------------------------------ */
  /* Media                                                                */
  /* ------------------------------------------------------------------ */

  function stopMeter() {
    clearInterval(meterTimerRef.current);
    meterTimerRef.current = null;
    try {
      audioCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  function startMeter(stream) {
    stopMeter();
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const buffer = new Uint8Array(analyser.fftSize);
      meterTimerRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        if (phaseRef.current === "device") {
          setMicLevel(rms);
          if (rms > 0.02) setMicHeard(true);
        }
        // Sustained noise → one AUDIO_FLAG per episode.
        if (phaseRef.current === "paper") {
          if (rms > EXAM.AUDIO_FLAG_LEVEL) {
            if (!noiseSinceRef.current) noiseSinceRef.current = Date.now();
            else if (!noiseFlaggedRef.current && Date.now() - noiseSinceRef.current >= EXAM.AUDIO_FLAG_SECONDS * 1000) {
              noiseFlaggedRef.current = true;
              logEvent("AUDIO_FLAG", `Microphone above threshold for ${EXAM.AUDIO_FLAG_SECONDS}s`, null);
            }
          } else {
            noiseSinceRef.current = null;
            noiseFlaggedRef.current = false;
          }
        }
      }, 200);
    } catch {
      /* no meter — the device check still shows the video */
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function uploadChunk(blob, seq, startedAtMs, endedAtMs, mimeType) {
    const att = attemptRef.current;
    if (!att || !blob?.size) return;
    // Storage takes a bare media type; the codec parameters the recorder
    // reports ("video/webm;codecs=vp8,opus") are rejected with a 400.
    mimeType = String(mimeType || "video/webm").split(";")[0].trim() || "video/webm";
    for (let i = 0; i <= EXAM.CHUNK_UPLOAD_RETRIES; i += 1) {
      try {
        const url = await backendMutation(api.exams.generateUploadUrl, { attemptId: att.id });
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": mimeType || "video/webm" }, body: blob });
        if (!res.ok) throw new Error(`upload ${res.status}`);
        const { storageId } = await res.json();
        await backendMutation(api.exams.registerChunk, { attemptId: att.id, seq, storageId, startedAtMs, endedAtMs, bytes: blob.size, mimeType: mimeType || "video/webm" });
        return;
      } catch (err) {
        console.warn(`[exam] Chunk ${seq} upload attempt ${i + 1} failed:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
    setUploadIssue(true);
    logEvent("RECORDING_UPLOAD_FAILURE", `Chunk ${seq} (${formatClock(startedAtMs)}–${formatClock(endedAtMs)}) could not be uploaded`, endedAtMs - startedAtMs);
  }

  function recordNextChunk() {
    const stream = streamRef.current;
    if (!recordingRef.current || !stream) return;
    const mimeType = pickMimeType();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: EXAM.VIDEO.videoBitsPerSecond,
        audioBitsPerSecond: EXAM.VIDEO.audioBitsPerSecond,
      });
    } catch (err) {
      logEvent("RECORDING_UPLOAD_FAILURE", "Recorder could not start", null);
      return;
    }
    const seq = chunkSeqRef.current;
    chunkSeqRef.current += 1;
    const startedAtMs = elapsedMs();
    chunkStartRef.current = startedAtMs;
    const parts = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) parts.push(e.data);
    };
    recorder.onstop = () => {
      const endedAtMs = elapsedMs();
      const blob = new Blob(parts, { type: recorder.mimeType || mimeType || "video/webm" });
      uploadChunk(blob, seq, startedAtMs, endedAtMs, recorder.mimeType || mimeType);
      if (recordingRef.current) recordNextChunk();
    };
    recorderRef.current = recorder;
    recorder.start();
    setTimeout(() => {
      if (recorderRef.current === recorder && recorder.state === "recording") recorder.stop();
    }, EXAM.CHUNK_SECONDS * 1000);
  }

  function startRecording() {
    if (!proctored || recordingRef.current) return;
    recordingRef.current = true;
    chunkSeqRef.current = 0;
    recordNextChunk();
  }

  function stopRecording() {
    recordingRef.current = false;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    try {
      if (recorder && recorder.state === "recording") recorder.stop();
    } catch {
      /* ignore */
    }
  }

  function stopEverything() {
    stopRecording();
    stopMeter();
    stopStream();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  /* Pre-test state changes are best-effort: on a resumed live attempt the
     server rightly refuses to move back to a pre-test state, and that must
     not read as a permission failure. */
  async function safeSetState(to, reason) {
    const att = attemptRef.current;
    if (!att || att.state === to || ["IN_PROGRESS", "PAUSED_VIOLATION"].includes(att.state)) return;
    try {
      await backendMutation(api.exams.setState, { attemptId: att.id, to, reason });
      attemptRef.current = { ...att, state: to };
      setAttempt((a) => ({ ...a, state: to }));
    } catch {
      /* already there, or the attempt is live */
    }
  }

  async function requestMedia() {
    setError(null);
    setPhase("permissions");
    await safeSetState("PERMISSIONS_PENDING", "requesting_permissions");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: EXAM.VIDEO.width }, height: { ideal: EXAM.VIDEO.height }, frameRate: { ideal: EXAM.VIDEO.frameRate } },
        audio: true,
      });
      streamRef.current = stream;
      setVideoLive(false);
      setMicHeard(false);
      startMeter(stream);
      await safeSetState("DEVICE_CHECK", "permissions_granted");
      setPhase("device");
    } catch (err) {
      await safeSetState("PERMISSIONS_DENIED", err?.name || "denied");
      setPhase("denied");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                            */
  /* ------------------------------------------------------------------ */

  // Begin: create or resume the attempt.
  useEffect(() => {
    let cancelled = false;
    async function begin() {
      if (!isBackendConfigured() || !convexClient() || !getSessionToken()) {
        setError("Graded tests aren't available right now. Please sign in again or try again shortly.");
        setPhase("error");
        return;
      }
      const support = browserSupport();
      if (proctored && !support.ok) {
        setPhase("unsupported");
        return;
      }
      try {
        const out = await backendMutation(api.exams.begin, {
          testId: test.id,
          fallback: { domain: test.domain, title: test.title, duration: test.duration, mode: test.mode },
          clientInfo: { userAgent: navigator.userAgent, screen: `${window.screen.width}x${window.screen.height}` },
        });
        if (cancelled) return;
        setAttempt(out.attempt);
        attemptRef.current = out.attempt;
        const state = out.attempt.state;
        if (["IN_PROGRESS", "PAUSED_VIOLATION"].includes(state)) {
          // A reload mid-test: the clock is still running on the server.
          if (proctored) setPhase("consent");
          else await resumePaper(out.attempt);
        } else if (!proctored) {
          await fastTrack(out.attempt);
        } else if (state === "CONSENT_PENDING") {
          setPhase("consent");
        } else if (state === "PERMISSIONS_PENDING" || state === "PERMISSIONS_DENIED") {
          setPhase("consent");
        } else if (state === "DEVICE_CHECK" || state === "FULLSCREEN_PENDING") {
          setPhase("consent");
        }
      } catch (err) {
        if (cancelled) return;
        setError(backendErrorMessage(err, "Could not open the test."));
        setPhase("error");
      }
    }
    begin();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test.id]);

  async function fastTrack(att) {
    // Unproctored online test: walk the pre-test states without stopping.
    try {
      for (const to of ["PERMISSIONS_PENDING", "DEVICE_CHECK", "FULLSCREEN_PENDING"]) {
        if (att.state === to) continue;
        await backendMutation(api.exams.setState, { attemptId: att.id, to, reason: "unproctored" });
        att = { ...att, state: to };
      }
      await startPaper(att);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not open the test."));
      setPhase("error");
    }
  }

  async function startPaper(att) {
    const out = await backendMutation(api.exams.start, { attemptId: att.id });
    clockOffsetRef.current = (out.serverNow || out.startedAt) - Date.now();
    startedAtRef.current = toLocal(out.startedAt);
    setQuestions(out.questions);
    setAnswers({});
    setDeadline(toLocal(out.deadlineAt));
    setRemaining(toLocal(out.deadlineAt) - Date.now());
    setAttempt((a) => ({ ...a, state: "IN_PROGRESS" }));
    setPhase("paper");
    startRecording();
  }

  async function resumePaper(att) {
    const paper = await backendQuery(api.exams.paper, { attemptId: att.id });
    if (!paper?.ok) throw new Error("This attempt can no longer be resumed.");
    clockOffsetRef.current = (paper.serverNow || Date.now()) - Date.now();
    startedAtRef.current = toLocal(new Date(paper.startedAt).getTime());
    setQuestions(paper.questions);
    setAnswers(paper.answers || {});
    let deadlineAt = paper.deadlineAt;
    if (att.state === "PAUSED_VIOLATION") {
      const r = await backendMutation(api.exams.resume, { attemptId: att.id });
      deadlineAt = r.deadlineAt;
    }
    setDeadline(toLocal(deadlineAt));
    setRemaining(toLocal(deadlineAt) - Date.now());
    setAttempt((a) => ({ ...a, state: "IN_PROGRESS" }));
    setPhase("paper");
    startRecording();
  }

  // Consent → permissions.
  async function continueFromConsent() {
    if (!agreed) return;
    const att = attemptRef.current;
    try {
      if (att.state === "CONSENT_PENDING") {
        await backendMutation(api.exams.consent, { attemptId: att.id, agreed: true });
        setAttempt((a) => ({ ...a, state: "PERMISSIONS_PENDING" }));
        attemptRef.current = { ...att, state: "PERMISSIONS_PENDING" };
      }
      await requestMedia();
    } catch (err) {
      setError(backendErrorMessage(err, "Could not record your consent. Please try again."));
    }
  }

  async function cancelFromConsent() {
    const att = attemptRef.current;
    try {
      if (att?.state === "CONSENT_PENDING") await backendMutation(api.exams.consent, { attemptId: att.id, agreed: false });
    } catch {
      /* nothing recorded either way */
    }
    onClose();
  }

  // Device check preview.
  useEffect(() => {
    if (phase !== "device" || !previewRef.current || !streamRef.current) return undefined;
    const video = previewRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
    const timer = setInterval(() => {
      if (video.videoWidth > 0 && video.readyState >= 2) setVideoLive(true);
    }, 300);
    return () => clearInterval(timer);
  }, [phase]);

  async function confirmDevices() {
    await safeSetState("FULLSCREEN_PENDING", "device_check_passed");
    setPhase("fullscreen");
  }

  async function enterFullscreenAndStart() {
    setError(null);
    try {
      const el = rootRef.current || document.documentElement;
      await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen());
    } catch {
      setError("Fullscreen was blocked. Click the button again and allow fullscreen when your browser asks.");
      return;
    }
    try {
      const att = attemptRef.current;
      if (["IN_PROGRESS", "PAUSED_VIOLATION"].includes(att.state)) await resumePaper(att);
      else await startPaper(att);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not start the test. Please try again."));
    }
  }

  // Clock.
  useEffect(() => {
    if (phase !== "paper" || !deadline || paused) return undefined;
    const tick = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        submit({ auto: true, reason: "time_up" });
      }
    }, 500);
    return () => clearInterval(tick);
  }, [phase, deadline, paused, submit]);

  // Autosave answers.
  useEffect(() => {
    if (phase !== "paper" || !attempt) return undefined;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      backendMutation(api.exams.saveAnswers, { attemptId: attempt.id, answers }).catch(() => {});
    }, 700);
    return () => clearTimeout(saveTimerRef.current);
  }, [answers, phase, attempt]);

  // Pause / resume with a grace countdown.
  const beginPause = useCallback(
    async (reason) => {
      if (pausedRef.current || phaseRef.current !== "paper") return;
      const seconds = reason === "device" ? EXAM.DEVICE_GRACE_SECONDS : EXAM.FULLSCREEN_GRACE_SECONDS;
      pauseStartRef.current = Date.now();
      const until = Date.now() + seconds * 1000;
      setPaused({ reason, until });
      setPauseLeft(seconds);
      try {
        await backendMutation(api.exams.pause, { attemptId: attemptRef.current.id, reason: reason === "device" ? "device_disconnected" : "fullscreen_exit" });
      } catch {
        /* the countdown still runs locally */
      }
    },
    []
  );

  const endPause = useCallback(async () => {
    const p = pausedRef.current;
    if (!p) return;
    const outFor = Date.now() - (pauseStartRef.current || Date.now());
    setPaused(null);
    try {
      const r = await backendMutation(api.exams.resume, { attemptId: attemptRef.current.id });
      if (r?.deadlineAt) setDeadline(toLocal(r.deadlineAt));
    } catch {
      setDeadline((d) => (d ? d + outFor : d));
    }
    if (p.reason === "device") logEvent("DEVICE_DISCONNECTED", "Camera or microphone reconnected", outFor);
    else logEvent("FULLSCREEN_EXIT", "Returned to fullscreen", outFor);
  }, [logEvent]);

  useEffect(() => {
    if (!paused) return undefined;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((paused.until - Date.now()) / 1000));
      setPauseLeft(left);
      if (left <= 0) {
        clearInterval(tick);
        if (paused.reason === "device") logEvent("DEVICE_DISCONNECTED", "Not reconnected in time", Date.now() - pauseStartRef.current);
        else logEvent("FULLSCREEN_EXIT", "Did not return in time", Date.now() - pauseStartRef.current);
        submit({ auto: true, reason: paused.reason === "device" ? "device_timeout" : "fullscreen_timeout" });
      }
    }, 250);
    return () => clearInterval(tick);
  }, [paused, submit, logEvent]);

  // Monitoring listeners while the paper is open.
  useEffect(() => {
    if (phase !== "paper" || !proctored) return undefined;

    const onFullscreen = () => {
      if (!document.fullscreenElement) beginPause("fullscreen");
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") logEvent("TAB_SWITCH", "Tab hidden or window minimised");
    };
    const onBlur = () => {
      // A tab switch fires blur and then visibilitychange; wait for the
      // second so one switch is one violation, not two.
      setTimeout(() => {
        if (document.visibilityState === "visible" && !document.hasFocus()) logEvent("TAB_SWITCH", "Focus moved to another window");
      }, 200);
    };
    const blocked = (name, e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - (lastBlockedRef.current[name] || 0) < 1000) return;
      lastBlockedRef.current[name] = now;
      logEvent("BLOCKED_ACTION", name);
    };
    const onKey = (e) => {
      const hit = BLOCKED_KEYS.find((k) => k.test(e));
      if (hit) blocked(hit.name, e);
    };
    const onContext = (e) => blocked("Right-click menu", e);
    const onCopy = (e) => blocked("Copy", e);
    const onCut = (e) => blocked("Cut", e);
    const onPaste = (e) => blocked("Paste", e);
    const onSelect = (e) => {
      if (e.target?.closest?.("[data-exam-content]")) e.preventDefault();
    };

    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("selectstart", onSelect);

    // Device loss: a track ending or going mute for more than two seconds.
    const stream = streamRef.current;
    let muteTimer = null;
    const checkTracks = () => {
      const tracks = stream?.getTracks() || [];
      const lost = !tracks.length || tracks.some((t) => t.readyState === "ended");
      if (lost && !deviceLostRef.current) {
        deviceLostRef.current = true;
        beginPause("device");
      } else if (!lost && deviceLostRef.current && pausedRef.current?.reason === "device") {
        deviceLostRef.current = false;
        endPause();
      }
    };
    const onEnded = () => checkTracks();
    const onMute = () => {
      clearTimeout(muteTimer);
      muteTimer = setTimeout(() => {
        if (stream?.getTracks().some((t) => t.muted)) {
          deviceLostRef.current = true;
          beginPause("device");
        }
      }, 2000);
    };
    const onUnmute = () => {
      clearTimeout(muteTimer);
      if (deviceLostRef.current && pausedRef.current?.reason === "device" && !stream?.getTracks().some((t) => t.muted || t.readyState === "ended")) {
        deviceLostRef.current = false;
        endPause();
      }
    };
    stream?.getTracks().forEach((t) => {
      t.addEventListener("ended", onEnded);
      t.addEventListener("mute", onMute);
      t.addEventListener("unmute", onUnmute);
    });
    const trackPoll = setInterval(checkTracks, 2000);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("selectstart", onSelect);
      stream?.getTracks().forEach((t) => {
        t.removeEventListener("ended", onEnded);
        t.removeEventListener("mute", onMute);
        t.removeEventListener("unmute", onUnmute);
      });
      clearInterval(trackPoll);
      clearTimeout(muteTimer);
    };
  }, [phase, proctored, beginPause, endPause, logEvent]);

  async function reconnectDevices() {
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      startMeter(stream);
      deviceLostRef.current = false;
      if (recordingRef.current) {
        stopRecording();
        startRecording();
      }
      await endPause();
    } catch {
      setError("Still no camera or microphone. Check the device is connected and allowed, then try again.");
    }
  }

  async function returnToFullscreen() {
    try {
      const el = rootRef.current || document.documentElement;
      await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : el.webkitRequestFullscreen());
      await endPause();
    } catch {
      setError("Fullscreen was blocked. Click the button again and allow fullscreen when your browser asks.");
    }
  }

  // Cleanup on unmount.
  useEffect(() => () => stopEverything(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------------------------------------------------------------ */
  /* Answering                                                            */
  /* ------------------------------------------------------------------ */

  function choose(question, optionId) {
    setAnswers((prev) => {
      const currentIds = prev[question.id] || [];
      let next;
      if (question.type === "multiple") next = currentIds.includes(optionId) ? currentIds.filter((id) => id !== optionId) : [...currentIds, optionId];
      else next = [optionId];
      return { ...prev, [question.id]: next };
    });
  }

  const answeredCount = useMemo(() => questions.filter((q) => (answers[q.id] || []).length > 0).length, [questions, answers]);
  const question = questions[current];

  /* ------------------------------------------------------------------ */
  /* Screens                                                              */
  /* ------------------------------------------------------------------ */

  const shellProps = { rootRef, showBanner: proctored && (phase === "paper" || Boolean(paused)), violations, title: test.title };

  if (phase === "starting") {
    return (
      <Shell {...shellProps}>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell {...shellProps}>
        <div className="space-y-4">
          <h1 className="text-lg font-semibold text-foreground">Test unavailable</h1>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          <p className="text-xs text-muted-foreground">If this keeps happening, contact your test host or support with the test name and the time it happened.</p>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </Shell>
    );
  }

  if (phase === "unsupported") {
    return (
      <Shell {...shellProps}>
        <div className="space-y-4">
          <h1 className="text-lg font-semibold text-foreground">This device can't run the exam room</h1>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This test must be taken on a desktop or laptop computer using Chrome, Edge, or Firefox.
          </div>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Go back
          </Button>
        </div>
      </Shell>
    );
  }

  if (phase === "consent") {
    return (
      <Shell {...shellProps}>
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{test.title}</p>
            <h1 className="text-2xl font-semibold text-foreground">Before you begin</h1>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-foreground leading-relaxed space-y-3">
            <p>
              This test is recorded and monitored for academic integrity. Your camera and microphone will record continuously for the entire duration of the test. The system will also automatically
              detect and flag things like leaving fullscreen, switching tabs or windows, and unusual background noise. Your professor will be able to review the recording and the flagged moments after you
              submit. Recordings are automatically deleted after {EXAM.RETENTION_DAYS} days.
            </p>
            <p className="text-xs text-muted-foreground">{EXAM.MONITORING_NOTICE}</p>
          </div>
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4" />
            <span>I understand and agree to be recorded and monitored for this test.</span>
          </label>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={cancelFromConsent} className="text-sm text-muted-foreground hover:text-foreground px-2 py-2 text-left">
              ← Cancel and go back
            </button>
            <Button className="sm:ml-auto sm:min-w-[160px]" disabled={!agreed} onClick={continueFromConsent}>
              Continue
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "permissions") {
    return (
      <Shell {...shellProps}>
        <div className="space-y-4 text-center py-10">
          <div className="w-10 h-10 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mx-auto" />
          <h1 className="text-lg font-semibold text-foreground">Requesting camera and microphone access…</h1>
          <p className="text-sm text-muted-foreground">Choose “Allow” when your browser asks.</p>
        </div>
      </Shell>
    );
  }

  if (phase === "denied") {
    return (
      <Shell {...shellProps}>
        <div className="space-y-5">
          <h1 className="text-xl font-semibold text-foreground">Camera and microphone access is required</h1>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Camera and microphone access is required to take this test. Please allow access in your browser settings and try again.
          </div>
          <Button onClick={requestMedia}>Try again</Button>
          <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-foreground">How to reset site permissions</summary>
            <div className="mt-3 space-y-3 text-xs text-muted-foreground">
              {Object.entries(PERMISSION_STEPS).map(([browser, steps]) => (
                <div key={browser}>
                  <div className="font-semibold text-foreground">{browser}</div>
                  <ol className="list-decimal ml-4 space-y-0.5">
                    {steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </details>
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            ← Leave without starting
          </button>
        </div>
      </Shell>
    );
  }

  if (phase === "device") {
    const level = Math.min(100, Math.round(micLevel * 400));
    return (
      <Shell {...shellProps}>
        <div className="space-y-5">
          <h1 className="text-xl font-semibold text-foreground">Check your camera and microphone</h1>
          <p className="text-sm text-muted-foreground">You should see yourself below and the meter should move when you speak. Say a few words to test the microphone.</p>
          <video ref={previewRef} muted playsInline className="w-full max-w-md mx-auto rounded-xl bg-black aspect-video" />
          <div className="max-w-md mx-auto space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Microphone level</span>
              <span>{micHeard ? "✓ Sound detected" : "Waiting for sound…"}</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-150" style={{ width: `${level}%` }} />
            </div>
            <div className="text-xs text-muted-foreground">{videoLive ? "✓ Camera is producing video" : "Waiting for the camera…"}</div>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Button variant="outline" className="flex-1" onClick={requestMedia}>
              Re-request devices
            </Button>
            <Button className="flex-1" disabled={!videoLive || !micHeard} onClick={confirmDevices}>
              Yes, I can see myself and the mic is picking up sound
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === "fullscreen") {
    return (
      <Shell {...shellProps}>
        <div className="space-y-5 text-center py-8">
          <h1 className="text-xl font-semibold text-foreground">Click below to enter fullscreen and begin your test.</h1>
          <p className="text-sm text-muted-foreground">
            {questions.length || test.questionCount || ""}{test.questionCount ? ` questions · ` : ""}{attempt?.durationMins || ""} minutes. The clock starts when you enter fullscreen. Leaving fullscreen pauses the test and counts as a violation.
          </p>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
          <Button size="lg" onClick={enterFullscreenAndStart}>
            Enter Fullscreen & Start Test
          </Button>
        </div>
      </Shell>
    );
  }

  if (phase === "grading") {
    return (
      <Shell {...shellProps}>
        <div className="py-12 flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <span className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          Your answers are being checked against the marking scheme.
        </div>
      </Shell>
    );
  }

  if (phase === "result" && result) {
    return (
      <Shell {...shellProps} wide>
        <ExamResult test={test} result={result} onClose={onClose} />
      </Shell>
    );
  }

  /* ---------------- The paper ---------------- */

  const lowOnTime = remaining != null && remaining < 60 * 1000;

  return (
    <Shell {...shellProps} wide>
      {paused && (
        <div className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full space-y-4 text-center">
            <h2 className="text-lg font-semibold text-foreground">{paused.reason === "device" ? "Your camera/microphone has been disconnected." : "You have left fullscreen."}</h2>
            <p className="text-sm text-muted-foreground">
              {paused.reason === "device"
                ? `Reconnect within ${EXAM.DEVICE_GRACE_SECONDS} seconds or your test will be automatically submitted.`
                : `Return to fullscreen within ${EXAM.FULLSCREEN_GRACE_SECONDS} seconds or your test will be automatically submitted.`}
            </p>
            <div className="text-4xl font-bold text-red-600 tabular-nums">{pauseLeft}</div>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
            <Button className="w-full" onClick={paused.reason === "device" ? reconnectDevices : returnToFullscreen}>
              {paused.reason === "device" ? "Reconnect devices" : "Return to Fullscreen"}
            </Button>
            <p className="text-[11px] text-muted-foreground">The timer is paused. Recording continues.</p>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${paused ? "blur-sm pointer-events-none select-none" : ""}`} data-exam-content>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{test.title}</div>
            <div className="text-xs text-muted-foreground">
              Question {current + 1} of {questions.length} · {answeredCount} answered
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uploadIssue && <Badge tone="amber">Recording upload retrying</Badge>}
            <Badge tone={lowOnTime ? "red" : "neutral"}>⏱ {formatClock(remaining ?? 0)} left</Badge>
          </div>
        </div>
        <ProgressBar value={answeredCount} max={questions.length || 1} />

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}

        {question && (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge tone={question.type === "multiple" ? "purple" : "blue"}>{TYPE_LABEL[question.type]}</Badge>
              <span className="text-[11px] text-muted-foreground">{question.type === "multiple" ? "Select every option that applies." : "Select one option."}</span>
            </div>
            <p className="text-base font-medium text-foreground leading-relaxed">{question.text}</p>
            <div className="space-y-2">
              {question.options.map((o, i) => {
                const selected = (answers[question.id] || []).includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={`w-full flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm cursor-pointer transition-all duration-150 ${
                      selected ? "border-primary bg-primary/8 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <input
                      type={question.type === "multiple" ? "checkbox" : "radio"}
                      name={`q-${question.id}`}
                      checked={selected}
                      onChange={() => choose(question, o.id)}
                      className="mt-1 w-4 h-4 accent-[var(--primary,#3C7C6B)]"
                      aria-label={`Option ${i + 1}`}
                    />
                    <span className="leading-relaxed">{o.text}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            ← Back
          </Button>
          {current < questions.length - 1 ? (
            <Button type="button" className="flex-1" onClick={() => setCurrent((c) => c + 1)}>
              Next question
            </Button>
          ) : (
            <Button type="button" className="flex-1" onClick={() => submit()}>
              Submit for marking
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to question ${i + 1}`}
              className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-colors ${
                i === current ? "bg-primary text-white" : (answers[q.id] || []).length ? "bg-primary/12 text-primary" : "bg-secondary text-muted-foreground hover:bg-muted"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}
