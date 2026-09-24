"use client";

/**
 * Uploading a document or image into Convex file storage.
 *
 * Uploads used to be read into a base64 `data:` URL and stored on the row
 * itself. A Convex document is capped at 1 MB, so a PDF resume could never be
 * mirrored, and a browser-local row with a 6 MB string in it made every read
 * of that collection slow. Files now go to storage and the row keeps a small
 * reference: { storageId, fileName, mimeType, bytes } plus the resolved `url`.
 *
 * Every upload is then registered (`files.registerUpload`) with its purpose,
 * which is where the server re-checks size and type and records who uploaded
 * it — the AI routes will only read files their caller registered.
 *
 * Limits live in lib/settings.js. The error strings below are shown inline
 * by the upload controls.
 */

import { api } from "../convex/_generated/api";
import { backendMutation, backendQuery } from "./convexBrowser";
import { getSessionToken } from "./session";
import { AI, COMMUNITIES, FILES, RESUME } from "./settings";
import { describeExtensions, detectKind, extensionOf, isBlockedFile, kindAllowed, mimeForKind } from "./fileKinds";

const DOCUMENT_TOO_LARGE = "File is too large — please upload a file under 10MB";
const IMAGE_TOO_LARGE = "File is too large — please upload a file under 5MB";
const NOT_A_DOCUMENT = "Please upload a PDF or Word document";
const NOT_AN_IMAGE = "Please upload a PNG, JPG or WebP image";
const BLOCKED = "That kind of file isn't allowed. Upload a document, spreadsheet, presentation or image.";

/** Bare mime type — storage rejects a type with parameters attached. */
export function bareMimeType(type) {
  return String(type || "").split(";")[0].trim().toLowerCase();
}

/** Sniff a type from the extension when the browser reports none (or a useless one). */
function inferMimeType(file) {
  const bare = bareMimeType(file?.type);
  if (bare && bare !== "application/octet-stream") return bare;
  const kind = detectKind(file?.name, "", null);
  if (kind && kind !== "unknown" && kind !== "blocked") return mimeForKind(kind);
  return bare;
}

function tooLarge(limit) {
  return `File is too large — please upload a file under ${Math.round(limit / (1024 * 1024))}MB`;
}

/** The newer purposes: which extensions, how large, and the "wrong type" sentence. */
const PURPOSES = {
  source: {
    max: AI.MAX_SOURCE_FILE_BYTES,
    wrongType: (file) =>
      ["doc", "ppt", "xls"].includes(detectKind(file?.name, file?.type))
        ? "Older .doc/.ppt/.xls files can't be read automatically. Open it and Save As .docx/.pptx/.xlsx or PDF, then upload again."
        : `Please upload ${describeExtensions(AI.SOURCE_TYPES)}`,
  },
  resume: { max: RESUME.MAX_BYTES, wrongType: () => `Please upload your resume as ${describeExtensions(RESUME.TYPES)}` },
  material: { max: COMMUNITIES.MATERIAL_MAX_BYTES, wrongType: () => `Please upload ${describeExtensions(COMMUNITIES.MATERIAL_TYPES)}` },
  cover: { max: COMMUNITIES.COVER_MAX_BYTES, wrongType: () => NOT_AN_IMAGE },
};

/**
 * Pure check, so the limits are unit-tested. Returns null when the file is
 * acceptable, otherwise the exact message to show.
 */
export function checkFileLimits(file, kind = "document") {
  const mime = inferMimeType(file);
  const bytes = Number(file?.size) || 0;
  // Executables and scripts are refused everywhere, by extension and by type.
  if (isBlockedFile(file?.name, file?.type)) return kind === "image" || kind === "cover" ? NOT_AN_IMAGE : BLOCKED;
  const purpose = PURPOSES[kind];
  if (purpose) {
    const detected = detectKind(file?.name, file?.type);
    if (!kindAllowed(detected, kind)) return purpose.wrongType(file);
    if (bytes > purpose.max) return tooLarge(purpose.max);
    return null;
  }
  if (kind === "image") {
    if (!FILES.IMAGE_TYPES.includes(mime)) return NOT_AN_IMAGE;
    if (bytes > FILES.MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;
    return null;
  }
  if (!FILES.DOCUMENT_TYPES.includes(mime)) return NOT_A_DOCUMENT;
  if (bytes > FILES.MAX_DOCUMENT_BYTES) return DOCUMENT_TOO_LARGE;
  return null;
}

/** POSTs the file to storage, reporting progress (0–1) when the browser can. */
function postFile(uploadUrl, file, mimeType, onProgress) {
  if (typeof XMLHttpRequest === "undefined" || !onProgress) {
    return fetch(uploadUrl, { method: "POST", headers: { "Content-Type": mimeType }, body: file }).then(async (response) => {
      if (!response.ok) throw new Error("The upload did not complete. Please try again.");
      return await response.json();
    });
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error("The upload did not complete. Please try again."));
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("The upload did not complete. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("The upload did not complete. Check your connection and try again."));
    xhr.send(file);
  });
}

/**
 * Validates, uploads, registers, and returns the reference to store on the
 * row. Throws with one of the messages above, or a generic one if the network
 * failed.
 */
export async function uploadToStorage(file, { kind = "document", onProgress } = {}) {
  const problem = checkFileLimits(file, kind);
  if (problem) throw new Error(problem);

  const mimeType = inferMimeType(file) || "application/octet-stream";
  const uploadUrl = await backendMutation(api.files.generateUploadUrl, {});
  const { storageId } = (await postFile(uploadUrl, file, mimeType, onProgress)) || {};
  if (!storageId) throw new Error("The upload did not complete. Please try again.");

  const fileName = file.name || "document";
  const registration = backendMutation(api.files.registerUpload, { storageId, fileName, mimeType, bytes: file.size || 0, purpose: kind });
  if (PURPOSES[kind]) {
    // The newer purposes are only usable once registered (the AI routes and
    // community attachments resolve files through the registration).
    await registration;
  } else {
    registration.catch((error) => console.warn("[uploads] Could not register the upload:", error?.message || error));
  }

  let url = null;
  try {
    url = await backendQuery(api.files.urlFor, { storageId });
  } catch {
    /* the row's own query resolves the URL on the next pull */
  }

  return {
    storageId,
    fileName,
    mimeType,
    bytes: file.size || 0,
    url,
  };
}

/** The upload of an already-stored data URL, used by the local backfill. */
export async function uploadDataUrl(dataUrl, fileName, { kind = "document" } = {}) {
  const [header, payload] = String(dataUrl || "").split(",");
  if (!payload) throw new Error("Not a data URL.");
  const mime = /data:([^;,]+)/.exec(header)?.[1] || "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const file = new File([bytes], fileName || "document", { type: mime });
  return await uploadToStorage(file, { kind });
}

/** Whether a session exists to upload with (the upload control greys out without one). */
export function canUpload() {
  return Boolean(getSessionToken());
}

export { extensionOf };
