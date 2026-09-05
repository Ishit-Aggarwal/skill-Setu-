"use client";

/**
 * Opening a file that was uploaded into the store.
 *
 * Uploads are held as `data:` URLs. Putting one straight into an
 * `<a href target="_blank">` looks like it works and does not: Chrome and
 * Edge both block top-level navigation to a `data:` URL, so the click is
 * swallowed and the browser stays exactly where it was. That is what made
 * "View resume" look like it reloaded the page — the anchor fired, the
 * navigation was refused, nothing else happened.
 *
 * So a data URL is turned into a Blob and opened through an object URL, which
 * is a real navigable document. Object URLs are revoked on a delay rather than
 * immediately, because revoking one before the new tab has finished reading it
 * gives the viewer an empty window.
 */

/** `#`, an empty string and a bare filename are placeholders, not files. */
export function hasFile(doc) {
  const url = doc?.dataUrl || doc?.fileDataUrl || doc?.url || doc?.document;
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#") return false;
  return /^(data:|blob:|https?:|\/)/i.test(trimmed);
}

/** The usable URL on a stored document, or null. */
export function fileUrl(doc) {
  if (!hasFile(doc)) return null;
  return (doc.dataUrl || doc.fileDataUrl || doc.url || doc.document).trim();
}

export function fileName(doc, fallback = "document") {
  return doc?.fileName || doc?.name || doc?.documentName || fallback;
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = String(dataUrl).split(",");
  if (payload == null) return null;
  const mime = /data:([^;,]+)/.exec(header)?.[1] || "application/octet-stream";
  if (!/;base64/i.test(header)) {
    return new Blob([decodeURIComponent(payload)], { type: mime });
  }
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Opens a stored document in a new tab. Returns false when there is nothing
 * to open, so a caller can say so rather than rendering a dead link.
 */
export function openStoredFile(doc) {
  const url = fileUrl(doc);
  if (!url || typeof window === "undefined") return false;

  if (!url.startsWith("data:")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  try {
    const blob = dataUrlToBlob(url);
    if (!blob) return false;
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
    // A blocked pop-up leaves `opened` null; fall back to this tab rather than
    // silently doing nothing.
    if (!opened) window.location.href = objectUrl;
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return true;
  } catch {
    return false;
  }
}

/** Saves a stored document to disk under its own filename. */
export function downloadStoredFile(doc) {
  const url = fileUrl(doc);
  if (!url || typeof document === "undefined") return false;
  try {
    const href = url.startsWith("data:") ? URL.createObjectURL(dataUrlToBlob(url)) : url;
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName(doc, "document");
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(href), 60000);
    return true;
  } catch {
    return false;
  }
}

/** Reads a File from an <input type="file"> into a data URL. */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
