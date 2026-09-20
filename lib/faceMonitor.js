"use client";

/**
 * On-device face monitoring for the exam room.
 *
 * Runs Google's open-source MediaPipe Face Landmarker on the candidate's own
 * camera preview, entirely in the browser — no frame ever leaves the device.
 * Every few hundred milliseconds it asks three questions of the current
 * frame and turns a sustained "no" into one flagged event:
 *
 *   NO_FACE         nobody in front of the camera for FACE.NO_FACE_SECONDS
 *   MULTIPLE_FACES  more than one face for FACE.MULTIPLE_FACES_SECONDS
 *   LOOKING_AWAY    head turned past FACE.YAW/PITCH_LIMIT_DEG, or the eyes
 *                   held off-screen (iris blendshapes past FACE.GAZE_LIMIT),
 *                   for FACE.LOOK_AWAY_SECONDS
 *
 * A flag is raised once the condition has held for its window, then again
 * every FACE.COOLDOWN_SECONDS for as long as it persists — so a candidate who
 * glances at their keyboard is not flagged twenty times a minute, and one who
 * walks away is not charged only once. What each flag costs
 * is decided on the server (lib/settings.js EXAM.DEFAULT_VIOLATION_PENALTY,
 * or the host's own figure on the test).
 *
 * If the model cannot be loaded at all the monitor reports that once and the
 * rest of the exam room carries on: a missing model is a device problem, not
 * a violation.
 */

import { EXAM } from "./settings";

const { FACE } = EXAM;

let landmarkerPromise = null;

async function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(FACE.WASM_PATH);
      const create = (modelAssetPath) =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 3,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      try {
        return await create(FACE.MODEL_URL);
      } catch {
        return await create(FACE.MODEL_FALLBACK_URL);
      }
    })().catch((error) => {
      landmarkerPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

/** Yaw/pitch in degrees from the 4×4 column-major facial transformation matrix. */
export function headPose(matrix) {
  const m = matrix?.data;
  if (!m || m.length < 16) return { yaw: 0, pitch: 0 };
  // Rotation part of a column-major 4×4: r[row][col] = m[col * 4 + row].
  const r00 = m[0];
  const r10 = m[1];
  const r20 = m[2];
  const r21 = m[6];
  const r22 = m[10];
  const yaw = Math.atan2(-r20, Math.hypot(r00, r10)) * (180 / Math.PI);
  const pitch = Math.atan2(r21, r22) * (180 / Math.PI);
  return { yaw: yaw || 0, pitch: pitch || 0 };
}

/** Largest of the four "looking off-centre" iris blendshapes, across both eyes. */
export function gazeOffset(blendshapes) {
  const categories = blendshapes?.categories || [];
  let max = 0;
  for (const c of categories) {
    if (/^eyeLook(In|Out|Up|Down)(Left|Right)$/.test(c.categoryName)) max = Math.max(max, c.score || 0);
  }
  return max;
}

/**
 * Pure: turns one frame's reading into which conditions currently hold.
 * Exported so the thresholds are testable without a camera.
 */
export function assessFrame({ faces = 0, yaw = 0, pitch = 0, gaze = 0 } = {}, limits = FACE) {
  return {
    noFace: faces === 0,
    multipleFaces: faces > 1,
    lookingAway: faces === 1 && (Math.abs(yaw) > limits.YAW_LIMIT_DEG || Math.abs(pitch) > limits.PITCH_LIMIT_DEG || gaze > limits.GAZE_LIMIT),
  };
}

/**
 * Tracks how long each condition has held and decides when to flag it.
 * Pure and time-injected, so the episode logic is testable.
 */
export class EpisodeTracker {
  constructor(limits = FACE) {
    this.limits = limits;
    this.since = { noFace: null, multipleFaces: null, lookingAway: null };
    this.flaggedAt = { noFace: null, multipleFaces: null, lookingAway: null };
  }

  /** Returns the list of event types to raise for this frame (usually empty). */
  update(assessment, now) {
    const seconds = { noFace: this.limits.NO_FACE_SECONDS, multipleFaces: this.limits.MULTIPLE_FACES_SECONDS, lookingAway: this.limits.LOOK_AWAY_SECONDS };
    const types = { noFace: "NO_FACE", multipleFaces: "MULTIPLE_FACES", lookingAway: "LOOKING_AWAY" };
    const raise = [];
    for (const key of Object.keys(types)) {
      const holds = Boolean(assessment[key]);
      if (!holds) {
        this.since[key] = null;
        continue;
      }
      if (this.since[key] == null) this.since[key] = now;
      const heldFor = (now - this.since[key]) / 1000;
      const cooled = this.flaggedAt[key] == null || now - this.flaggedAt[key] >= this.limits.COOLDOWN_SECONDS * 1000;
      if (heldFor >= seconds[key] && cooled) {
        this.flaggedAt[key] = now;
        // The clock restarts: a condition that keeps holding is charged again
        // once the cooldown has passed and it has held for its window anew.
        this.since[key] = now;
        raise.push({ type: types[key], heldForMs: Math.round(heldFor * 1000) });
      }
    }
    return raise;
  }
}

/**
 * Starts monitoring a <video> element. `onEvent(type, detail)` is called
 * for each flag; `onStatus(status)` reports "loading" | "active" |
 * "unavailable" plus the latest reading for an on-screen indicator.
 * Returns a stop() function.
 */
export function startFaceMonitor(video, { onEvent, onStatus, limits = FACE } = {}) {
  let stopped = false;
  let timer = null;
  const tracker = new EpisodeTracker(limits);
  let lastTimestamp = 0;

  onStatus?.({ state: "loading" });

  loadLandmarker()
    .then((landmarker) => {
      if (stopped) return;
      onStatus?.({ state: "active", faces: 1 });
      const tick = () => {
        if (stopped) return;
        try {
          if (video && video.readyState >= 2 && video.videoWidth > 0) {
            // Timestamps must strictly increase for VIDEO mode.
            const ts = Math.max(performance.now(), lastTimestamp + 1);
            lastTimestamp = ts;
            const result = landmarker.detectForVideo(video, ts);
            const faces = result.faceLandmarks?.length || 0;
            const pose = faces === 1 ? headPose(result.facialTransformationMatrixes?.[0]) : { yaw: 0, pitch: 0 };
            const gaze = faces === 1 ? gazeOffset(result.faceBlendshapes?.[0]) : 0;
            const reading = { faces, yaw: pose.yaw, pitch: pose.pitch, gaze };
            const assessment = assessFrame(reading, limits);
            onStatus?.({ state: "active", ...reading, ...assessment });
            for (const flag of tracker.update(assessment, Date.now())) {
              const detail =
                flag.type === "NO_FACE"
                  ? `No face detected for ${Math.round(flag.heldForMs / 1000)}s`
                  : flag.type === "MULTIPLE_FACES"
                  ? `${faces} faces in frame`
                  : `Looking away for ${Math.round(flag.heldForMs / 1000)}s (yaw ${Math.round(pose.yaw)}°, pitch ${Math.round(pose.pitch)}°, gaze ${gaze.toFixed(2)})`;
              onEvent?.(flag.type, detail, flag.heldForMs);
            }
          }
        } catch (error) {
          // One bad frame is not a reason to stop watching.
          console.warn("[faceMonitor] frame skipped:", error?.message || error);
        }
        timer = setTimeout(tick, limits.INTERVAL_MS);
      };
      tick();
    })
    .catch((error) => {
      if (stopped) return;
      console.warn("[faceMonitor] could not start:", error?.message || error);
      onStatus?.({ state: "unavailable", error: error?.message || String(error) });
    });

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
