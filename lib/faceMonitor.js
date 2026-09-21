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
 * A fourth question is asked quietly. In the first seconds of the paper the
 * face in frame is sampled with MediaPipe's Image Embedder (a still is also
 * handed back for the host's report), and from then on every later frame's
 * embedding is compared with those samples. A face that stays unlike every
 * sample for IDENTITY.MISMATCH_SECONDS is
 *
 *   FACE_MISMATCH   somebody else in front of the camera
 *
 * Nothing in the on-screen status reports this; the candidate sees the same
 * indicator either way, and the host sees the flag with the reference still.
 *
 * A flag is raised once the condition has held for its window, then again
 * every COOLDOWN_SECONDS for as long as it persists — so a candidate who
 * glances at their keyboard is not flagged twenty times a minute, and one who
 * walks away is not charged only once. What each flag costs is decided on
 * the server (lib/settings.js EXAM.DEFAULT_VIOLATION_PENALTY, or the host's
 * own figure on the test).
 *
 * If a model cannot be loaded at all the monitor reports that once and the
 * rest of the exam room carries on: a missing model is a device problem, not
 * a violation.
 */

import { EXAM } from "./settings";

const { FACE, IDENTITY } = EXAM;

let landmarkerPromise = null;
let embedderPromise = null;

async function fileset() {
  const { FilesetResolver } = await import("@mediapipe/tasks-vision");
  return await FilesetResolver.forVisionTasks(FACE.WASM_PATH);
}

async function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const fs = await fileset();
      const create = (modelAssetPath) =>
        FaceLandmarker.createFromOptions(fs, {
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

async function loadEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { ImageEmbedder } = await import("@mediapipe/tasks-vision");
      const fs = await fileset();
      const create = (modelAssetPath) =>
        ImageEmbedder.createFromOptions(fs, {
          baseOptions: { modelAssetPath, delegate: "GPU" },
          runningMode: "IMAGE",
          l2Normalize: true,
        });
      try {
        return await create(IDENTITY.EMBEDDER_MODEL_URL);
      } catch {
        return await create(IDENTITY.EMBEDDER_FALLBACK_URL);
      }
    })().catch((error) => {
      embedderPromise = null;
      throw error;
    });
  }
  return embedderPromise;
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
 * The face's bounding box from its landmarks, as a normalised rect padded
 * a little so the crop keeps the hairline and chin. Pure.
 */
export function faceBox(landmarks, pad = 0.25) {
  if (!Array.isArray(landmarks) || !landmarks.length) return null;
  let left = 1;
  let top = 1;
  let right = 0;
  let bottom = 0;
  for (const p of landmarks) {
    if (p.x < left) left = p.x;
    if (p.x > right) right = p.x;
    if (p.y < top) top = p.y;
    if (p.y > bottom) bottom = p.y;
  }
  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) return null;
  return {
    left: Math.max(0, left - w * pad),
    top: Math.max(0, top - h * pad),
    right: Math.min(1, right + w * pad),
    bottom: Math.min(1, bottom + h * pad),
  };
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

/** Cosine similarity of two L2-normalised float embeddings. Pure. */
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

/**
 * The identity check's bookkeeping: gathers reference samples while the
 * paper opens, then judges every later sample against the best of them and
 * raises FACE_MISMATCH once a mismatch has held for its window. Pure and
 * time-injected.
 */
export class IdentityTracker {
  constructor(limits = IDENTITY, startedAt = Date.now()) {
    this.limits = limits;
    this.startedAt = startedAt;
    this.references = [];
    this.mismatchSince = null;
    this.flaggedAt = null;
    this.lastSimilarity = null;
  }

  get ready() {
    return this.references.length >= this.limits.REFERENCE_SAMPLES;
  }

  /** True while samples are still being collected. */
  collecting(now) {
    return !this.ready && now - this.startedAt <= this.limits.REFERENCE_WINDOW_SECONDS * 1000;
  }

  /**
   * One embedding of the single face in frame. Returns "reference" while
   * collecting, otherwise { type: "FACE_MISMATCH", heldForMs, similarity }
   * when a flag should be raised, else null.
   */
  update(embedding, now) {
    if (!embedding) return null;
    if (this.collecting(now)) {
      this.references.push(embedding);
      return "reference";
    }
    // Too few samples to judge anyone (the face was not in frame at the
    // start): use whatever was gathered, or nothing at all.
    if (!this.references.length) return null;
    let best = 0;
    for (const ref of this.references) best = Math.max(best, cosine(ref, embedding));
    this.lastSimilarity = best;
    if (best >= this.limits.MATCH_THRESHOLD) {
      this.mismatchSince = null;
      return null;
    }
    if (this.mismatchSince == null) this.mismatchSince = now;
    const heldFor = now - this.mismatchSince;
    const cooled = this.flaggedAt == null || now - this.flaggedAt >= this.limits.COOLDOWN_SECONDS * 1000;
    if (heldFor >= this.limits.MISMATCH_SECONDS * 1000 && cooled) {
      this.flaggedAt = now;
      this.mismatchSince = now;
      return { type: "FACE_MISMATCH", heldForMs: Math.round(heldFor), similarity: best };
    }
    return null;
  }
}

/** A JPEG still of the current frame, cropped to the face. */
function captureStill(video, box) {
  try {
    const canvas = document.createElement("canvas");
    const sx = Math.round((box?.left ?? 0) * video.videoWidth);
    const sy = Math.round((box?.top ?? 0) * video.videoHeight);
    const sw = Math.max(1, Math.round(((box?.right ?? 1) - (box?.left ?? 0)) * video.videoWidth));
    const sh = Math.max(1, Math.round(((box?.bottom ?? 1) - (box?.top ?? 0)) * video.videoHeight));
    const scale = Math.min(1, 320 / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8));
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * Starts monitoring a <video> element. `onEvent(type, detail, heldForMs)` is
 * called for each flag; `onStatus(status)` reports "loading" | "active" |
 * "unavailable" plus the latest reading for an on-screen indicator (the
 * identity check never appears in it); `onReference(blob)` hands back the
 * still taken when the first reference sample was gathered.
 * Returns a stop() function.
 */
export function startFaceMonitor(video, { onEvent, onStatus, onReference, limits = FACE, identity = IDENTITY, identityCheck = true } = {}) {
  let stopped = false;
  let timer = null;
  const tracker = new EpisodeTracker(limits);
  const ident = new IdentityTracker(identity, Date.now());
  let embedder = null;
  let lastTimestamp = 0;
  let lastEmbedAt = 0;
  let stillTaken = false;

  onStatus?.({ state: "loading" });

  if (identityCheck) {
    loadEmbedder()
      .then((e) => {
        if (!stopped) embedder = e;
      })
      .catch((error) => {
        // The landmark checks carry on without the identity check.
        console.warn("[faceMonitor] identity check unavailable:", error?.message || error);
      });
  }

  const sample = (landmarks) => {
    if (!embedder) return;
    const now = Date.now();
    if (now - lastEmbedAt < identity.INTERVAL_MS) return;
    lastEmbedAt = now;
    const box = faceBox(landmarks);
    if (!box) return;
    let result;
    try {
      result = embedder.embed(video, { regionOfInterest: box });
    } catch (error) {
      console.warn("[faceMonitor] embedding skipped:", error?.message || error);
      return;
    }
    const embedding = result?.embeddings?.[0]?.floatEmbedding;
    if (!embedding?.length) return;
    const verdict = ident.update(Array.from(embedding), now);
    if (verdict === "reference") {
      if (!stillTaken) {
        stillTaken = true;
        captureStill(video, box).then((blob) => blob && !stopped && onReference?.(blob));
      }
      return;
    }
    if (verdict?.type) {
      onEvent?.(verdict.type, `Face unlike the candidate's for ${Math.round(verdict.heldForMs / 1000)}s (similarity ${verdict.similarity.toFixed(2)})`, verdict.heldForMs);
    }
  };

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
            if (faces === 1) sample(result.faceLandmarks[0]);
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
