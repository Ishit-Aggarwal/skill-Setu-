/**
 * Puts the MediaPipe face-landmark runtime where the exam room can load it.
 *
 * The wasm runtime ships inside the @mediapipe/tasks-vision package (about
 * 12 MB per build, far too large to keep in git), so it is copied into
 * public/ before every dev run and build. The face model itself (a 3.7 MB
 * .task file) is fetched once from Google's public model bucket into
 * public/models; if that download fails the exam room falls back to loading
 * it from the bucket at runtime, so a build never breaks on it.
 *
 * Both output folders are gitignored.
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const wasmSrc = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDst = path.join(root, "public", "mediapipe", "wasm");
const modelDst = path.join(root, "public", "models", "face_landmarker.task");
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function copyWasm() {
  if (!fs.existsSync(wasmSrc)) {
    console.warn("[mediapipe] @mediapipe/tasks-vision is not installed; face monitoring will be unavailable.");
    return;
  }
  fs.mkdirSync(wasmDst, { recursive: true });
  for (const name of fs.readdirSync(wasmSrc)) {
    const from = path.join(wasmSrc, name);
    const to = path.join(wasmDst, name);
    const same = fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size;
    if (!same) fs.copyFileSync(from, to);
  }
}

async function fetchModel() {
  if (fs.existsSync(modelDst) && fs.statSync(modelDst).size > 1_000_000) return;
  fs.mkdirSync(path.dirname(modelDst), { recursive: true });
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(modelDst, bytes);
    console.log(`[mediapipe] face model saved (${(bytes.length / 1048576).toFixed(1)} MB).`);
  } catch (error) {
    console.warn(`[mediapipe] Could not download the face model (${error.message}); it will be loaded from the model bucket at runtime.`);
  }
}

copyWasm();
fetchModel();
