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
 * Limits live in lib/settings.js (FILES). The error strings below are shown
 * inline by the upload controls and are the only new user-facing text.
 */

import { api } from "../convex/_generated/api";
import { backendMutation, backendQuery } from "./convexBrowser";
import { FILES } from "./settings";

const DOCUMENT_TOO_LARGE = "File is too large — please upload a file under 10MB";
const IMAGE_TOO_LARGE = "File is too large — please upload a file under 5MB";
const NOT_A_DOCUMENT = "Please upload a PDF or Word document";
const NOT_AN_IMAGE = "Please upload a PNG, JPG or WebP image";

/** Bare mime type — storage rejects a type with parameters attached. */
export function bareMimeType(type) {
  return String(type || "").split(";")[0].trim().toLowerCase();
}

/** Sniff a type from the extension when the browser reports none. */
function inferMimeType(file) {
  const bare = bareMimeType(file?.type);
  if (bare) return bare;
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
}

/**
 * Pure check, so the limits are unit-tested. Returns null when the file is
 * acceptable, otherwise the exact message to show.
 */
export function checkFileLimits(file, kind = "document") {
  const mime = inferMimeType(file);
  const bytes = Number(file?.size) || 0;
  if (kind === "image") {
    if (!FILES.IMAGE_TYPES.includes(mime)) return NOT_AN_IMAGE;
    if (bytes > FILES.MAX_IMAGE_BYTES) return IMAGE_TOO_LARGE;
    return null;
  }
  if (!FILES.DOCUMENT_TYPES.includes(mime)) return NOT_A_DOCUMENT;
  if (bytes > FILES.MAX_DOCUMENT_BYTES) return DOCUMENT_TOO_LARGE;
  return null;
}

/**
 * Validates, uploads, and returns the reference to store on the row.
 * Throws with one of the messages above, or a generic one if the network failed.
 */
export async function uploadToStorage(file, { kind = "document" } = {}) {
  const problem = checkFileLimits(file, kind);
  if (problem) throw new Error(problem);

  const mimeType = inferMimeType(file);
  const uploadUrl = await backendMutation(api.files.generateUploadUrl, {});
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: file,
  });
  if (!response.ok) throw new Error("The upload did not complete. Please try again.");
  const { storageId } = await response.json();
  if (!storageId) throw new Error("The upload did not complete. Please try again.");

  let url = null;
  try {
    url = await backendQuery(api.files.urlFor, { storageId });
  } catch {
    /* the row's own query resolves the URL on the next pull */
  }

  return {
    storageId,
    fileName: file.name || "document",
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
