/**
 * Uploaded source files → model parts, for the AI routes. Server-side only.
 *
 * The browser uploads each file to storage and sends only
 * `{ storageId, fileName, mimeType, bytes }`. Each id is resolved through
 * `files.sourceUrlFor`, which answers only for files the caller uploaded
 * themselves, then fetched here and read by lib/docText.js.
 *
 * One file that cannot be read never sinks the rest: it is skipped and
 * listed with the reason, and the run carries on. Budgets (inline bytes for
 * PDFs and images, characters of extracted text) are applied in the order
 * the host arranged the files; whatever did not fit is reported, never
 * silently dropped.
 */

import { api } from "../convex/_generated/api";
import { AI } from "./settings";
import { toParts } from "./docText";

const CHARS_PER_PAGE = 3000;

/** Cleans the request's `sources` list: at most `max` entries of the documented shape. */
export function cleanSourceList(list, max = AI.MAX_SOURCE_FILES) {
  return (Array.isArray(list) ? list : [])
    .filter((s) => s && typeof s === "object" && typeof s.storageId === "string" && s.storageId)
    .slice(0, max)
    .map((s) => ({ storageId: s.storageId, fileName: String(s.fileName || "document").slice(0, 160), mimeType: String(s.mimeType || "").slice(0, 120), bytes: Number(s.bytes) || 0 }));
}

async function fetchBytes(url, limit) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`the file could not be fetched (HTTP ${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > limit) throw new Error("it is larger than the reader accepts");
  return buf;
}

/**
 * Reads every source. Returns
 *   { docs: [{ fileName, kind, text, parts, inlineBytes }], skipped, truncated }
 * `skipped` and `truncated` are [{ fileName, reason }] lists to show the host.
 */
export async function loadSources(auth, sources, { maxFiles = AI.MAX_SOURCE_FILES, maxInlineBytes = AI.MAX_INLINE_BYTES, maxChars = AI.MAX_SOURCE_CHARS } = {}) {
  const list = cleanSourceList(sources, maxFiles);
  const docs = [];
  const skipped = [];
  const truncated = [];
  let fetchedBytes = 0;
  let inlineLeft = maxInlineBytes;
  let charsLeft = maxChars;

  for (let i = 0; i < list.length; i += 1) {
    const src = list[i];
    let meta = null;
    try {
      meta = await auth.convex.query(api.files.sourceUrlFor, { sessionToken: auth.sessionToken, storageId: src.storageId });
    } catch {
      meta = null;
    }
    const fileName = meta?.fileName || src.fileName;
    if (!meta?.url) {
      skipped.push({ fileName, reason: "it isn't one of your uploads" });
      continue;
    }
    let bytes;
    try {
      bytes = await fetchBytes(meta.url, AI.MAX_SOURCE_FILE_BYTES);
    } catch (error) {
      skipped.push({ fileName, reason: error.message });
      continue;
    }
    fetchedBytes += bytes.length;
    if (fetchedBytes > AI.MAX_SOURCE_TOTAL_BYTES) {
      skipped.push({ fileName, reason: `the files together are over ${Math.round(AI.MAX_SOURCE_TOTAL_BYTES / (1024 * 1024))} MB` });
      continue;
    }

    let read;
    try {
      read = toParts(bytes, { fileName, mimeType: meta.mimeType || src.mimeType, index: i + 1, total: list.length });
    } catch (error) {
      skipped.push({ fileName, reason: error.message || "it could not be read" });
      continue;
    }

    let parts = read.parts;
    // Inline data (a PDF, a photo, pictures inside a Word file) against the request budget.
    if (read.inlineBytes > inlineLeft) {
      const kept = parts.filter((p) => !p.inline_data);
      const hasText = kept.some((p, idx) => idx > 0 && p.text && !p.text.startsWith("(Image from"));
      if (!hasText) {
        skipped.push({ fileName, reason: "the files before it already used the space the AI can read in one go" });
        continue;
      }
      parts = kept.filter((p) => !(p.text || "").startsWith("(Image from"));
      truncated.push({ fileName, reason: `The pictures in "${fileName}" were skipped to stay within what the AI can read at once.` });
    } else {
      inlineLeft -= read.inlineBytes;
    }

    // Extracted text against the character budget.
    let text = read.text;
    if (read.chars > charsLeft) {
      if (charsLeft <= 0) {
        skipped.push({ fileName, reason: "the files before it already filled the reading budget" });
        continue;
      }
      text = read.text.slice(0, charsLeft);
      parts = parts.map((p) => (p.text === read.text ? { text } : p));
      truncated.push({ fileName, reason: `Only the first ${Math.max(1, Math.round(text.length / CHARS_PER_PAGE))} pages of "${fileName}" were read.` });
    }
    charsLeft -= text.length;

    docs.push({ fileName, kind: read.kind, text, parts, inlineBytes: read.inlineBytes, storageId: src.storageId });
  }
  return { docs, skipped, truncated };
}

/** Every doc's parts, in order, for a single model call. */
export function allParts(docs) {
  return docs.flatMap((d) => d.parts);
}

/** "'Unit 5.doc' was skipped: older Word format." lines for the modal. */
export function skippedNotes(skipped) {
  return (skipped || []).map((s) => `"${s.fileName}" was skipped: ${s.reason}`);
}
