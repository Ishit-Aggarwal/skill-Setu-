/**
 * A minimal ZIP reader, server-side only.
 *
 * DOCX, PPTX, XLSX and the OpenDocument formats are all ZIP archives of XML.
 * Reading them needs exactly this much: find the central directory, list the
 * entries, and inflate the few that matter. Node's own zlib does the
 * decompression, so no package is involved.
 *
 * An uploaded archive is untrusted input, so every limit is checked before
 * any work is done and again afterwards: encrypted entries and ZIP64 are
 * refused, the entry count is capped, and the total uncompressed size is
 * checked against the declared sizes *before* inflating each entry and
 * against the real output after (a zip bomb lies about its sizes). Paths
 * containing ".." are ignored.
 */

import { inflateRawSync } from "node:zlib";
import { AI } from "./settings";

export class ZipError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  throw new ZipError("That file could not be read.", "CORRUPT");
}

function findEndOfCentralDirectory(view) {
  // The record is at least 22 bytes and may be followed by a comment of up
  // to 65,535 bytes, so it is searched for backwards over that range.
  const min = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let i = view.byteLength - 22; i >= min; i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIG) return i;
  }
  return -1;
}

const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;

function decodeName(bytes) {
  return decoder ? decoder.decode(bytes) : String.fromCharCode(...bytes);
}

/**
 * Opens an archive. Returns { entries, has(name), read(name), text(name) }.
 * `entries` lists { name, method, compressedSize, size }.
 */
export function openZip(input, { maxEntries = AI.MAX_ZIP_ENTRIES, maxTotalBytes = AI.MAX_UNZIPPED_BYTES } = {}) {
  const bytes = toBytes(input);
  if (bytes.length < 22) throw new ZipError("That file is empty or damaged.", "CORRUPT");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) throw new ZipError("That file is damaged or is not a document this reader understands.", "CORRUPT");

  const count = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw new ZipError("This file is too large to read automatically.", "ZIP64");
  }
  if (count > maxEntries) throw new ZipError("This file has too many parts to read automatically.", "TOO_MANY");
  if (cdOffset + cdSize > bytes.length) throw new ZipError("That file is damaged.", "CORRUPT");

  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== CD_SIG) throw new ZipError("That file is damaged.", "CORRUPT");
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decodeName(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (flags & 0x1) throw new ZipError("This file is password-protected, so it can't be read. Remove the password and upload it again.", "ENCRYPTED");
    if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) {
      throw new ZipError("This file is too large to read automatically.", "ZIP64");
    }
    // A path that climbs out of the archive is never a legitimate document part.
    if (name.split(/[\\/]/).includes("..")) continue;
    if (name.endsWith("/")) continue;
    entries.push({ name, method, compressedSize, size, localOffset });
  }

  const byName = new Map(entries.map((e) => [e.name, e]));
  let inflatedTotal = 0;

  function read(name) {
    const entry = byName.get(name);
    if (!entry) return null;
    if (inflatedTotal + entry.size > maxTotalBytes) {
      throw new ZipError("This file expands to more than can be read automatically.", "TOO_LARGE");
    }
    const lp = entry.localOffset;
    if (lp + 30 > bytes.length || view.getUint32(lp, true) !== LOCAL_SIG) throw new ZipError("That file is damaged.", "CORRUPT");
    const start = lp + 30 + view.getUint16(lp + 26, true) + view.getUint16(lp + 28, true);
    const end = start + entry.compressedSize;
    if (end > bytes.length) throw new ZipError("That file is damaged.", "CORRUPT");
    const raw = bytes.subarray(start, end);

    let out;
    if (entry.method === 0) {
      out = raw.slice();
    } else if (entry.method === 8) {
      const budget = Math.max(1, maxTotalBytes - inflatedTotal);
      try {
        out = new Uint8Array(inflateRawSync(raw, { maxOutputLength: budget }));
      } catch (error) {
        if (error?.code === "ERR_BUFFER_TOO_LARGE" || /maxOutputLength|too large/i.test(String(error?.message))) {
          throw new ZipError("This file expands to more than can be read automatically.", "TOO_LARGE");
        }
        throw new ZipError("That file is damaged.", "CORRUPT");
      }
    } else {
      throw new ZipError("This file uses a compression method that can't be read automatically.", "UNSUPPORTED");
    }
    // The declared size is only a claim; the real output is what counts.
    inflatedTotal += out.length;
    if (inflatedTotal > maxTotalBytes) throw new ZipError("This file expands to more than can be read automatically.", "TOO_LARGE");
    return out;
  }

  function text(name) {
    const data = read(name);
    if (!data) return null;
    return decoder ? decoder.decode(data) : Buffer.from(data).toString("utf8");
  }

  return { entries, has: (name) => byName.has(name), read, text };
}
