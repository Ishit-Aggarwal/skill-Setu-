/**
 * What kind of file is this?
 *
 * Browsers on Windows are unreliable about MIME types: a .docx, a .md or a
 * .csv regularly arrives as `application/octet-stream`, and a file renamed by
 * hand can say anything. So the decision is made in one place, in a fixed
 * order: the extension first (what the person chose to call it), then the
 * MIME type the browser reported, then the first bytes of the file itself.
 *
 * Plain constants and pure functions, no "use client" and no Node imports:
 * the upload control, the API routes and the tests all load this file.
 */

import { AI, COMMUNITIES, RESUME } from "./settings";

/** Every kind this module can name, with the MIME type a stored copy is served with. */
export const KIND_MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  text: "text/plain",
  markdown: "text/markdown",
  csv: "text/csv",
  rtf: "application/rtf",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  doc: "application/msword",
  ppt: "application/vnd.ms-powerpoint",
  xls: "application/vnd.ms-excel",
  zip: "application/zip",
};

const EXTENSION_KIND = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".pptx": "pptx",
  ".xlsx": "xlsx",
  ".odt": "odt",
  ".odp": "odp",
  ".ods": "ods",
  ".txt": "text",
  ".md": "markdown",
  ".markdown": "markdown",
  ".csv": "csv",
  ".rtf": "rtf",
  ".png": "png",
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".webp": "webp",
  ".doc": "doc",
  ".ppt": "ppt",
  ".xls": "xls",
  ".zip": "zip",
};

const MIME_KIND = Object.fromEntries(Object.entries(KIND_MIME).map(([kind, mime]) => [mime, kind]));
Object.assign(MIME_KIND, {
  "image/jpg": "jpeg",
  "application/x-zip-compressed": "zip",
  "text/x-markdown": "markdown",
  "application/vnd.ms-excel.sheet.macroenabled.12": "xlsx",
  "text/rtf": "rtf",
});

/** Kinds that were an old binary Office format: stored fine, never read automatically. */
export const LEGACY_KINDS = new Set(["doc", "ppt", "xls"]);

export const LEGACY_MESSAGE =
  "Older .doc/.ppt/.xls files can't be read automatically. Open it and Save As .docx/.pptx/.xlsx or PDF, then upload again.";

/** ".PDF" → ".pdf"; "" when the name has no extension. */
export function extensionOf(fileName) {
  const m = /(\.[a-z0-9]+)$/i.exec(String(fileName || "").trim());
  return m ? m[1].toLowerCase() : "";
}

export function bareMime(type) {
  return String(type || "").split(";")[0].trim().toLowerCase();
}

function startsWith(bytes, signature, offset = 0) {
  if (!bytes || bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) if (bytes[offset + i] !== signature[i]) return false;
  return true;
}

/** The kind the first bytes of a file declare, or null. */
export function kindFromMagic(firstBytes) {
  const b = firstBytes instanceof Uint8Array ? firstBytes : firstBytes ? new Uint8Array(firstBytes) : null;
  if (!b || !b.length) return null;
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return "webp"; // RIFF....WEBP
  if (startsWith(b, [0x7b, 0x5c, 0x72, 0x74, 0x66])) return "rtf"; // {\rtf
  if (startsWith(b, [0xd0, 0xcf, 0x11, 0xe0])) return "doc"; // OLE compound file: a legacy Office document
  // A zip: the Office Open XML and OpenDocument formats are zips too, and
  // which one it is can only be told by listing its entries.
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) return "zip";
  return null;
}

/**
 * The file's kind: extension first, then MIME, then magic bytes. Returns one
 * of the keys of KIND_MIME, "blocked" for an executable or script, or
 * "unknown".
 */
export function detectKind(fileName, mimeType, firstBytes) {
  const ext = extensionOf(fileName);
  if (COMMUNITIES.BLOCKED_EXTENSIONS.includes(ext)) return "blocked";
  if (EXTENSION_KIND[ext]) return EXTENSION_KIND[ext];
  const mime = bareMime(mimeType);
  if (isBlockedMime(mime)) return "blocked";
  if (mime && mime !== "application/octet-stream" && MIME_KIND[mime]) return MIME_KIND[mime];
  if (mime.startsWith("text/") && mime !== "text/html") return "text";
  return kindFromMagic(firstBytes) || "unknown";
}

/** MIME types refused everywhere, whatever the file is called. */
export function isBlockedMime(mime) {
  const m = bareMime(mime);
  return (
    m === "text/html" ||
    m === "image/svg+xml" ||
    m === "application/javascript" ||
    m === "text/javascript" ||
    m === "application/x-msdownload" ||
    m === "application/x-msdos-program" ||
    m === "application/x-sh" ||
    m === "application/x-php" ||
    m === "application/java-archive" ||
    m === "application/vnd.android.package-archive" ||
    m === "application/x-ms-installer" ||
    m === "application/x-msi"
  );
}

/** A file refused by extension or by MIME type. */
export function isBlockedFile(fileName, mimeType) {
  return COMMUNITIES.BLOCKED_EXTENSIONS.includes(extensionOf(fileName)) || isBlockedMime(mimeType);
}

/** The MIME type a file should be stored under. */
export function mimeForKind(kind, fallback = "application/octet-stream") {
  return KIND_MIME[kind] || fallback;
}

/** Which kinds each upload purpose accepts, as extensions (for `accept=` and the checks). */
export const PURPOSE_EXTENSIONS = {
  source: AI.SOURCE_TYPES,
  resume: RESUME.TYPES,
  material: COMMUNITIES.MATERIAL_TYPES,
  cover: [".png", ".jpg", ".jpeg", ".webp"],
};

/** Whether a detected kind is accepted for a purpose. */
export function kindAllowed(kind, purpose) {
  const list = PURPOSE_EXTENSIONS[purpose];
  if (!list) return false;
  return list.some((ext) => EXTENSION_KIND[ext] === kind);
}

/** The short family name a materials table and an icon use. */
export function kindFamily(kind) {
  if (kind === "pdf") return "PDF";
  if (kind === "docx" || kind === "odt" || kind === "doc" || kind === "rtf") return "Word";
  if (kind === "pptx" || kind === "odp" || kind === "ppt") return "Slides";
  if (kind === "xlsx" || kind === "ods" || kind === "xls" || kind === "csv") return "Sheet";
  if (kind === "png" || kind === "jpeg" || kind === "webp") return "Image";
  if (kind === "text" || kind === "markdown") return "Text";
  return "Other";
}

export const FAMILY_ICON = { PDF: "📕", Word: "📘", Slides: "📙", Sheet: "📗", Image: "🖼️", Text: "📄", Other: "📎" };

export function iconForFile(fileName, mimeType) {
  return FAMILY_ICON[kindFamily(detectKind(fileName, mimeType))] || FAMILY_ICON.Other;
}

/** "PDF, DOCX, PPTX …" for a hint line. */
export function describeExtensions(list) {
  return [...new Set(list.map((e) => e.replace(".", "").toUpperCase()).map((e) => (e === "JPEG" ? "JPG" : e)))].join(", ");
}
