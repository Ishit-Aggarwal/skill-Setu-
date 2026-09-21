/**
 * Puts the MediaPipe runtimes and models where the exam room can load them.
 *
 * The wasm runtimes ship inside the @mediapipe/tasks-vision and
 * @mediapipe/tasks-audio packages (about 12 MB per build, far too large to
 * keep in git), so they are copied into public/ before every dev run and
 * build. The models — the face landmarker (3.7 MB), the image embedder the
 * identity check uses (4 MB) and YAMNet for voices (4 MB) — are fetched once
 * from Google's public model bucket into public/models; if a download fails
 * the exam room falls back to loading that model from the bucket at runtime,
 * so a build never breaks on it.
 *
 * All output folders are gitignored.
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const modelsDir = path.join(root, "public", "models");

const RUNTIMES = [
  { pkg: "@mediapipe/tasks-vision", dst: path.join(root, "public", "mediapipe", "wasm"), what: "face monitoring" },
  { pkg: "@mediapipe/tasks-audio", dst: path.join(root, "public", "mediapipe", "audio-wasm"), what: "voice monitoring" },
];

const MODELS = [
  { name: "face_landmarker.task", url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", what: "face model" },
  { name: "mobilenet_v3_small.tflite", url: "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite", what: "identity embedder" },
  { name: "yamnet.tflite", url: "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite", what: "voice classifier" },
];

function copyWasm({ pkg, dst, what }) {
  const src = path.join(root, "node_modules", pkg, "wasm");
  if (!fs.existsSync(src)) {
    console.warn(`[mediapipe] ${pkg} is not installed; ${what} will be unavailable.`);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dst, name);
    const same = fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size;
    if (!same) fs.copyFileSync(from, to);
  }
}

async function fetchModel({ name, url, what }) {
  const dst = path.join(modelsDir, name);
  if (fs.existsSync(dst) && fs.statSync(dst).size > 500_000) return;
  fs.mkdirSync(modelsDir, { recursive: true });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dst, bytes);
    console.log(`[mediapipe] ${what} saved (${(bytes.length / 1048576).toFixed(1)} MB).`);
  } catch (error) {
    console.warn(`[mediapipe] Could not download the ${what} (${error.message}); it will be loaded from the model bucket at runtime.`);
  }
}

RUNTIMES.forEach(copyWasm);
Promise.all(MODELS.map(fetchModel));
