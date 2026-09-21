"use client";

/**
 * On-device voice monitoring for the exam room.
 *
 * Google's open-source MediaPipe Audio Classifier runs YAMNet — a model
 * trained on 521 kinds of sound — on the candidate's own microphone, in the
 * browser; no audio leaves the device. Roughly once a second it says what
 * the last second sounded like. Seconds that score as a voice (speech,
 * conversation, whispering — VOICE.CATEGORIES) go into a rolling window,
 * and a window with enough of them is one
 *
 *   VOICE_DETECTED  voices in the room
 *
 * flag, not raised again for the same episode until VOICE.COOLDOWN_SECONDS
 * have passed. The candidate's own voice counts too: the paper is a written
 * one, and somebody reading questions aloud to another person is exactly
 * what the host wants to see.
 *
 * If the model cannot load the monitor says so once and the rest of the
 * exam room carries on — the existing sustained-noise meter keeps running.
 */

import { EXAM } from "./settings";

const { VOICE } = EXAM;

let classifierPromise = null;

async function loadClassifier() {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { AudioClassifier, FilesetResolver } = await import("@mediapipe/tasks-audio");
      const fileset = await FilesetResolver.forAudioTasks(VOICE.WASM_PATH);
      const create = (modelAssetPath) =>
        AudioClassifier.createFromOptions(fileset, {
          baseOptions: { modelAssetPath },
          maxResults: 5,
        });
      try {
        return await create(VOICE.MODEL_URL);
      } catch {
        return await create(VOICE.MODEL_FALLBACK_URL);
      }
    })().catch((error) => {
      classifierPromise = null;
      throw error;
    });
  }
  return classifierPromise;
}

/**
 * Pure: the highest score any voice category got in one classification
 * result, or 0. Exported so the category list is testable without a model.
 */
export function voiceScore(categories, limits = VOICE) {
  let best = 0;
  for (const c of categories || []) {
    if (limits.CATEGORIES.includes(c.categoryName)) best = Math.max(best, c.score || 0);
  }
  return best;
}

/**
 * Rolling-window bookkeeping: one reading per second in, at most one flag
 * per episode out. Pure and time-injected.
 */
export class VoiceTracker {
  constructor(limits = VOICE) {
    this.limits = limits;
    this.window = []; // [{ at, voice }]
    this.flaggedAt = null;
  }

  /** Returns { type: "VOICE_DETECTED", seconds } when a flag should be raised, else null. */
  update(score, now) {
    const voice = score >= this.limits.SCORE;
    this.window.push({ at: now, voice });
    const horizon = now - this.limits.WINDOW_SECONDS * 1000;
    while (this.window.length && this.window[0].at < horizon) this.window.shift();
    const seconds = this.window.filter((r) => r.voice).length;
    const cooled = this.flaggedAt == null || now - this.flaggedAt >= this.limits.COOLDOWN_SECONDS * 1000;
    if (seconds >= this.limits.SPEECH_SECONDS && cooled) {
      this.flaggedAt = now;
      this.window = [];
      return { type: "VOICE_DETECTED", seconds };
    }
    return null;
  }
}

/**
 * Starts listening to a MediaStream. `onEvent(type, detail, durationMs)`
 * per flag; `onStatus({ state })` reports "loading" | "active" |
 * "unavailable". Returns a stop() function.
 */
export function startVoiceMonitor(stream, { onEvent, onStatus, limits = VOICE } = {}) {
  let stopped = false;
  let ctx = null;
  let source = null;
  let processor = null;
  let sink = null;
  const tracker = new VoiceTracker(limits);

  onStatus?.({ state: "loading" });

  loadClassifier()
    .then((classifier) => {
      if (stopped || !stream?.getAudioTracks().length) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      try {
        ctx = new Ctx({ sampleRate: limits.SAMPLE_RATE });
      } catch {
        ctx = new Ctx();
      }
      source = ctx.createMediaStreamSource(stream);
      // 16384 frames ≈ one second at 16 kHz — YAMNet's own frame length.
      processor = ctx.createScriptProcessor(16384, 1, 1);
      // A processor only runs while connected to the output; the silent gain
      // keeps the microphone from being played back into the room.
      sink = ctx.createGain();
      sink.gain.value = 0;
      processor.onaudioprocess = (e) => {
        if (stopped) return;
        try {
          const data = e.inputBuffer.getChannelData(0);
          const results = classifier.classify(data, ctx.sampleRate);
          let score = 0;
          for (const r of results || []) {
            for (const c of r.classifications || []) score = Math.max(score, voiceScore(c.categories, limits));
          }
          const flag = tracker.update(score, Date.now());
          if (flag) onEvent?.(flag.type, `Voices heard for ${flag.seconds}s of the last ${limits.WINDOW_SECONDS}s`, flag.seconds * 1000);
        } catch (error) {
          console.warn("[voiceMonitor] second skipped:", error?.message || error);
        }
      };
      source.connect(processor);
      processor.connect(sink);
      sink.connect(ctx.destination);
      onStatus?.({ state: "active" });
    })
    .catch((error) => {
      if (stopped) return;
      console.warn("[voiceMonitor] could not start:", error?.message || error);
      onStatus?.({ state: "unavailable", error: error?.message || String(error) });
    });

  return () => {
    stopped = true;
    try {
      processor?.disconnect();
      source?.disconnect();
      sink?.disconnect();
      ctx?.close();
    } catch {
      /* ignore */
    }
  };
}
