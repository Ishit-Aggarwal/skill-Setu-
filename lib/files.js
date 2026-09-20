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

/**
 * Two shapes are accepted everywhere: the legacy row that carries the file as
 * a `data:` URL (`dataUrl` / `fileDataUrl` / `document`), and the current one
 * that points at Convex file storage (`storageId` + the resolved `url`). Rows
 * written before the move keep opening on the device that holds them.
 */
function candidateUrl(doc) {
  if (!doc || typeof doc !== "object") return null;
  const candidates = [doc.url, doc.dataUrl, doc.fileDataUrl, doc.document, doc.documentDataUrl, doc.resumeUrl, doc.resumeDataUrl];
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed === "#") continue;
    if (/^(data:|blob:|https?:|\/)/i.test(trimmed)) return trimmed;
  }
  return null;
}

/** `#`, an empty string and a bare filename are placeholders, not files. */
export function hasFile(doc) {
  if (candidateUrl(doc)) return true;
  // A storage reference whose URL has not been resolved yet is still a file.
  return Boolean(doc?.storageId);
}

/** The usable URL on a stored document, or null. */
export function fileUrl(doc) {
  return candidateUrl(doc);
}

/**
 * A profile image (avatar, logo, banner) in either shape: the storage-backed
 * `<kind>Url` written by the current uploader, or the legacy `<kind>DataUrl`
 * still held on accounts and devices from before the move.
 */
export function profileImage(user, kind = "avatar") {
  if (!user) return null;
  return user[`${kind}Url`] || user[`${kind}DataUrl`] || null;
}

/**
 * A row's attached document as something hasFile/openStoredFile understand,
 * whether the field holds a legacy data URL string or a storage reference.
 */
export function attachedDocument(row, field = "document", nameField = "documentName") {
  const value = row?.[field];
  if (!value) return null;
  if (typeof value === "string") return { dataUrl: value, fileName: row?.[nameField] };
  if (typeof value === "object") return { ...value, fileName: row?.[nameField] || value.fileName };
  return null;
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

function triggerDownload(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(href), 60000);
}

/**
 * Saves a stored document to disk under its own filename.
 *
 * An `https:` URL from file storage is fetched to a Blob first: a cross-origin
 * anchor ignores the `download` attribute, so without this the browser would
 * open the file in a tab under its storage id instead of saving it by name.
 */
export function downloadStoredFile(doc) {
  const url = fileUrl(doc);
  if (!url || typeof document === "undefined") return false;
  const name = fileName(doc, "document");
  try {
    if (url.startsWith("data:")) {
      triggerDownload(URL.createObjectURL(dataUrlToBlob(url)), name);
      return true;
    }
    if (/^https?:/i.test(url)) {
      fetch(url)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((blob) => triggerDownload(URL.createObjectURL(blob), name))
        .catch(() => window.open(url, "_blank", "noopener,noreferrer"));
      return true;
    }
    triggerDownload(url, name);
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
