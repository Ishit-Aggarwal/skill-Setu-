/**
 * Turning an uploaded file into something the model can read.
 *
 * Every AI feature (a paper from a professor's notes, an imported paper, the
 * sample-paper generator, the resume coach) accepts the same file types in
 * the same way, through `toParts`. PDFs and images go to the model as they
 * are — it reads scanned pages and photographs itself. Office and
 * OpenDocument files are unzipped here (lib/zip.js) and their XML walked into
 * plain text that keeps what matters for a question paper: headings, list
 * items, tables as pipe-delimited rows, and bold/underlined/highlighted runs
 * marked **like this**, because that is how professors mark answer keys.
 *
 * Server-side only (it inflates with node:zlib); the kind detection it uses
 * lives in lib/fileKinds.js so the browser can share it.
 */

import { openZip, ZipError } from "./zip";
import { AI } from "./settings";
import { LEGACY_KINDS, LEGACY_MESSAGE, detectKind, kindFromMagic, mimeForKind } from "./fileKinds";

export { detectKind } from "./fileKinds";

export class DocTextError extends Error {
  constructor(message, code = "UNREADABLE") {
    super(message);
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* XML                                                                  */
/* ------------------------------------------------------------------ */

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text) {
  return String(text || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named == null ? whole : named;
  });
}

/**
 * A tolerant tag walker (there is no DOM in Node): yields
 * { type: "open" | "close" | "self", name, attrs } and { type: "text", value }.
 * Processing instructions, comments and CDATA markers are skipped.
 */
export function* xmlTokens(xml) {
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[1] != null) {
      yield { type: "text", value: m[1] };
    } else if (m[3]) {
      const selfClosing = m[5] === "/" || /\/\s*$/.test(m[4] || "");
      yield { type: m[2] ? "close" : selfClosing ? "self" : "open", name: m[3], attrs: m[4] || "" };
    } else if (m[6] != null) {
      yield { type: "text", value: decodeEntities(m[6]) };
    }
  }
}

export function attr(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name.replace(/[.:]/g, "\\$&")}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs || "");
  return m ? decodeEntities(m[2] ?? m[3] ?? "") : null;
}

/** An on/off run property: present and not switched off by val="0|false|none". */
function propertyOn(token, offValues = ["0", "false", "none"]) {
  const val = attr(token.attrs, "w:val");
  return val == null || !offValues.includes(String(val).toLowerCase());
}

/** Joins runs, merging neighbours with the same emphasis so "**Ras**" + "**a**" reads "**Rasa**". */
function renderRuns(runs) {
  const merged = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = merged[merged.length - 1];
    if (last && last.emph === r.emph) last.text += r.text;
    else merged.push({ ...r });
  }
  return merged
    .map((r) => {
      if (!r.emph || !r.text.trim()) return r.text;
      const lead = r.text.match(/^\s*/)[0];
      const trail = r.text.match(/\s*$/)[0];
      return `${lead}**${r.text.trim()}**${trail}`;
    })
    .join("");
}

/* ------------------------------------------------------------------ */
/* Word                                                                 */
/* ------------------------------------------------------------------ */

/**
 * word/document.xml → text. Paragraphs become lines; Heading styles become
 * "#"-prefixed lines; list paragraphs "• "; tables "| a | b |" rows;
 * bold/underline/highlight runs **marked**.
 */
export function wordXmlToText(xml) {
  const lines = [];
  const tables = []; // stack of { rows: [], row: null, cell: null }
  let para = null;
  let run = null;
  let inText = false;
  let inRunProps = false;

  const emit = (line) => {
    const t = tables[tables.length - 1];
    if (t && t.cell) t.cell.push(line);
    else lines.push(line);
  };

  for (const tok of xmlTokens(xml)) {
    const { type, name } = tok;
    if (type === "text") {
      if (inText && run) run.text += tok.value;
      continue;
    }
    switch (name) {
      case "w:tbl":
        if (type === "open") tables.push({ rows: [], row: null, cell: null });
        else if (type === "close") {
          const t = tables.pop();
          if (t) {
            const rendered = t.rows.map((cells) => `| ${cells.join(" | ")} |`);
            if (tables.length && tables[tables.length - 1].cell) tables[tables.length - 1].cell.push(rendered.join(" / "));
            else lines.push("", ...rendered, "");
          }
        }
        break;
      case "w:tr": {
        const t = tables[tables.length - 1];
        if (!t) break;
        if (type === "open") t.row = [];
        else if (type === "close" && t.row) {
          if (t.row.some((c) => c)) t.rows.push(t.row);
          t.row = null;
        }
        break;
      }
      case "w:tc": {
        const t = tables[tables.length - 1];
        if (!t) break;
        if (type === "open") t.cell = [];
        else if (type === "close" && t.cell) {
          if (t.row) t.row.push(t.cell.join(" ").replace(/\s+/g, " ").trim().replace(/\|/g, "/"));
          t.cell = null;
        }
        break;
      }
      case "w:p":
        if (type === "open") para = { style: "", list: false, runs: [] };
        else if (type === "close" && para) {
          let text = renderRuns(para.runs).replace(/[  ]+$/g, "");
          const heading = /^(?:heading|berschrift|titre)\s*(\d)/i.exec(para.style) || (/^title$/i.test(para.style) ? [null, "1"] : null);
          if (text.trim()) {
            if (heading) text = `${"#".repeat(Math.min(6, Number(heading[1]) || 1))} ${text.trim()}`;
            else if (para.list) text = `• ${text.trim()}`;
          }
          emit(text);
          para = null;
        } else if (type === "self") emit("");
        break;
      case "w:pStyle":
        if (para) para.style = attr(tok.attrs, "w:val") || "";
        break;
      case "w:numPr":
        if (para && type !== "close") para.list = true;
        break;
      case "w:r":
        if (type === "open") run = { text: "", emph: false };
        else if (type === "close" && run) {
          if (para) para.runs.push(run);
          run = null;
        }
        break;
      case "w:rPr":
        inRunProps = type === "open";
        break;
      case "w:b":
      case "w:u":
      case "w:highlight":
        if (run && inRunProps && type !== "close" && propertyOn(tok)) run.emph = true;
        break;
      case "w:t":
        inText = type === "open";
        break;
      case "w:tab":
        if (run && type !== "close") run.text += "\t";
        break;
      case "w:br":
      case "w:cr":
        if (run && type !== "close") run.text += "\n";
        break;
      default:
        break;
    }
  }
  return tidy(lines.join("\n"));
}

function tidy(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mediaImages(zip, prefix) {
  return zip.entries
    .filter((e) => e.name.startsWith(prefix) && /\.(png|jpe?g|webp)$/i.test(e.name))
    .slice(0, AI.MAX_EMBEDDED_IMAGES)
    .map((e) => ({ name: e.name, mimeType: /\.png$/i.test(e.name) ? "image/png" : /\.webp$/i.test(e.name) ? "image/webp" : "image/jpeg" }));
}

export function docxToText(zip) {
  if (!zip.has("word/document.xml")) throw new DocTextError("This Word file is damaged or empty.");
  const parts = [wordXmlToText(zip.text("word/document.xml"))];
  for (const extra of ["word/footnotes.xml", "word/endnotes.xml"]) {
    if (!zip.has(extra)) continue;
    const t = wordXmlToText(zip.text(extra));
    if (t) parts.push(`Notes:\n${t}`);
  }
  return { text: tidy(parts.join("\n\n")), images: mediaImages(zip, "word/media/") };
}

/* ------------------------------------------------------------------ */
/* PowerPoint                                                           */
/* ------------------------------------------------------------------ */

/** DrawingML paragraphs (<a:p>, <a:t>, <a:br/>) → lines. */
export function drawingXmlToText(xml) {
  const lines = [];
  let line = null;
  let inText = false;
  let runs = null;
  let run = null;
  for (const tok of xmlTokens(xml)) {
    if (tok.type === "text") {
      if (inText && run) run.text += tok.value;
      continue;
    }
    switch (tok.name) {
      case "a:p":
        if (tok.type === "open") runs = [];
        else if (tok.type === "close" && runs) {
          line = renderRuns(runs).trim();
          if (line) lines.push(line);
          runs = null;
        }
        break;
      case "a:r":
      case "a:fld":
        if (tok.type === "open") run = { text: "", emph: false };
        else if (tok.type === "close" && run) {
          if (runs) runs.push(run);
          run = null;
        }
        break;
      case "a:rPr":
        if (run && tok.type !== "close") {
          const b = attr(tok.attrs, "b");
          const u = attr(tok.attrs, "u");
          if (b === "1" || b === "true" || (u && u !== "none")) run.emph = true;
        }
        break;
      case "a:t":
        inText = tok.type === "open";
        break;
      case "a:br":
        if (runs && tok.type !== "close") runs.push({ text: "\n", emph: false });
        break;
      default:
        break;
    }
  }
  return lines.join("\n");
}

function slideNumber(name) {
  const m = /(\d+)\.xml$/.exec(name);
  return m ? Number(m[1]) : 0;
}

export function pptxToText(zip) {
  // slide10 comes after slide9, not after slide1.
  const slides = zip.entries
    .map((e) => e.name)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => slideNumber(a) - slideNumber(b));
  if (!slides.length) throw new DocTextError("This presentation has no slides.");
  const out = [];
  for (const name of slides) {
    const n = slideNumber(name);
    const body = drawingXmlToText(zip.text(name));
    // A slide's speaker notes are found through its relationships file, not by number.
    let notes = "";
    const rels = zip.text(`ppt/slides/_rels/slide${n}.xml.rels`);
    const target = rels && /Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/.exec(rels);
    if (target && zip.has(`ppt/notesSlides/${target[1]}`)) {
      notes = drawingXmlToText(zip.text(`ppt/notesSlides/${target[1]}`))
        .split("\n")
        .filter((l) => !/^\d+$/.test(l.trim()))
        .join("\n");
    }
    out.push(`Slide ${n}: ${body || "(no text)"}${notes ? `\nNotes: ${notes}` : ""}`);
  }
  return { text: tidy(out.join("\n\n")), images: mediaImages(zip, "ppt/media/") };
}

/* ------------------------------------------------------------------ */
/* Excel                                                                */
/* ------------------------------------------------------------------ */

function sharedStrings(zip) {
  const xml = zip.text("xl/sharedStrings.xml");
  if (!xml) return [];
  const out = [];
  let current = null;
  let inText = false;
  for (const tok of xmlTokens(xml)) {
    if (tok.type === "text") {
      if (inText && current != null) current += tok.value;
      continue;
    }
    if (tok.name === "si") {
      if (tok.type === "open") current = "";
      else if (tok.type === "close") {
        out.push(current || "");
        current = null;
      } else out.push("");
    } else if (tok.name === "t") inText = tok.type === "open";
    else if (tok.name === "rPh") inText = false; // phonetic hints are not content
  }
  return out;
}

function columnIndex(ref) {
  const letters = /^([A-Z]+)/i.exec(ref || "")?.[1]?.toUpperCase() || "";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, n - 1);
}

export function sheetXmlToRows(xml, strings) {
  const rows = [];
  let row = null;
  let cell = null;
  let inValue = false;
  let inInline = false;
  for (const tok of xmlTokens(xml)) {
    if (tok.type === "text") {
      if (cell && (inValue || inInline)) cell.value += tok.value;
      continue;
    }
    switch (tok.name) {
      case "row":
        if (tok.type === "open") row = { r: Number(attr(tok.attrs, "r")) || rows.length + 1, cells: [] };
        else if (tok.type === "close" && row) {
          if (row.cells.length) rows.push(row);
          row = null;
        }
        break;
      case "c":
        if (tok.type === "open") cell = { col: columnIndex(attr(tok.attrs, "r")), t: attr(tok.attrs, "t") || "n", value: "" };
        else if (tok.type === "close" && cell) {
          let value = cell.value;
          if (cell.t === "s") value = strings[Number(value)] ?? "";
          else if (cell.t === "b") value = value === "1" ? "TRUE" : "FALSE";
          value = String(value).replace(/\s+/g, " ").trim().replace(/\|/g, "/");
          if (value && row) row.cells.push({ col: cell.col, value });
          cell = null;
        }
        break;
      case "v":
        inValue = tok.type === "open";
        break;
      case "is":
        inInline = tok.type === "open";
        break;
      default:
        break;
    }
  }
  return rows.map((r) => {
    const width = Math.max(...r.cells.map((c) => c.col)) + 1;
    const cols = new Array(width).fill("");
    r.cells.forEach((c) => {
      cols[c.col] = c.value;
    });
    return { r: r.r, values: cols };
  });
}

export function xlsxToText(zip) {
  const strings = sharedStrings(zip);
  const workbook = zip.text("xl/workbook.xml") || "";
  const rels = zip.text("xl/_rels/workbook.xml.rels") || "";
  const targets = {};
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attr(m[1], "Id");
    const target = attr(m[1], "Target");
    if (id && target) targets[id] = target.replace(/^\/?xl\//, "").replace(/^\//, "");
  }
  const sheets = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = attr(m[1], "name") || `Sheet ${sheets.length + 1}`;
    const rid = attr(m[1], "r:id");
    const target = rid && targets[rid] ? `xl/${targets[rid]}` : null;
    if (target) sheets.push({ name, path: target });
  }
  if (!sheets.length) {
    zip.entries
      .map((e) => e.name)
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort((a, b) => slideNumber(a) - slideNumber(b))
      .forEach((path, i) => sheets.push({ name: `Sheet ${i + 1}`, path }));
  }
  const out = [];
  for (const sheet of sheets) {
    if (!zip.has(sheet.path)) continue;
    const rows = sheetXmlToRows(zip.text(sheet.path), strings);
    if (!rows.length) continue;
    out.push(`Sheet '${sheet.name}'`);
    rows.forEach((r) => out.push(`Row ${r.r}: ${r.values.join(" | ")}`));
    out.push("");
  }
  return { text: tidy(out.join("\n")), images: [] };
}

/* ------------------------------------------------------------------ */
/* OpenDocument                                                         */
/* ------------------------------------------------------------------ */

export function odfToText(zip, kind) {
  const xml = zip.text("content.xml");
  if (!xml) throw new DocTextError("This document is damaged or empty.");
  const lines = [];
  let para = null;
  let row = null;
  let cell = null;
  let slide = 0;
  for (const tok of xmlTokens(xml)) {
    if (tok.type === "text") {
      if (para != null) para += tok.value;
      continue;
    }
    switch (tok.name) {
      case "draw:page":
        if (tok.type === "open") {
          slide += 1;
          lines.push("", `Slide ${slide}:`);
        }
        break;
      case "table:table-row":
        if (tok.type === "open") row = [];
        else if (tok.type === "close" && row) {
          while (row.length && !row[row.length - 1]) row.pop();
          if (row.length) lines.push(`| ${row.join(" | ")} |`);
          row = null;
        }
        break;
      case "table:table-cell":
        if (tok.type === "open") cell = [];
        else if (tok.type === "close" && cell) {
          const repeat = Math.min(50, Number(attr(tok.attrs, "table:number-columns-repeated")) || 1);
          const value = cell.join(" ").trim().replace(/\|/g, "/");
          if (row) for (let i = 0; i < repeat; i += 1) row.push(value);
          cell = null;
        } else if (tok.type === "self" && row) row.push("");
        break;
      case "text:p":
      case "text:h":
        if (tok.type === "open") para = "";
        else if (tok.type === "close" && para != null) {
          const text = tok.name === "text:h" && para.trim() ? `# ${para.trim()}` : para;
          if (cell) cell.push(text);
          else lines.push(text);
          para = null;
        }
        break;
      case "text:tab":
        if (para != null) para += "\t";
        break;
      case "text:line-break":
        if (para != null) para += "\n";
        break;
      case "text:s":
        if (para != null) para += " ".repeat(Math.min(20, Number(attr(tok.attrs, "text:c")) || 1));
        break;
      default:
        break;
    }
  }
  return { text: tidy(lines.join("\n")), images: kind === "odp" ? [] : [] };
}

/* ------------------------------------------------------------------ */
/* Text and RTF                                                         */
/* ------------------------------------------------------------------ */

export function decodeText(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  const start = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 3 : 0;
  return new TextDecoder("utf-8").decode(b.subarray(start));
}

const CP1252 = { 0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x99: "™" };

/** Best-effort RTF → plain text: control words stripped, destinations skipped. */
export function rtfToText(rtf) {
  const s = String(rtf || "");
  const SKIP = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer", "headerl", "headerr", "footerl", "footerr", "themedata", "colorschememapping", "latentstyles", "datastore", "xmlnstbl", "listtable", "listoverridetable", "rsidtbl", "generator"]);
  let out = "";
  const stack = [];
  let skipping = false;
  let ucSkip = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === "{") {
      stack.push(skipping);
      if (s[i + 1] === "\\" && s[i + 2] === "*") skipping = true;
      continue;
    }
    if (ch === "}") {
      skipping = stack.length ? stack.pop() : false;
      continue;
    }
    if (ch === "\\") {
      const next = s[i + 1];
      if (next === "\\" || next === "{" || next === "}") {
        if (!skipping) out += next;
        i += 1;
        continue;
      }
      if (next === "'") {
        const code = parseInt(s.slice(i + 2, i + 4), 16);
        if (!skipping && Number.isFinite(code)) out += CP1252[code] || String.fromCharCode(code);
        i += 3;
        continue;
      }
      const m = /^([a-z]+)(-?\d+)? ?/i.exec(s.slice(i + 1));
      if (!m) {
        i += 1;
        continue;
      }
      const word = m[1];
      i += m[0].length;
      if (SKIP.has(word)) skipping = true;
      if (skipping) continue;
      if (word === "par" || word === "line" || word === "row") out += "\n";
      else if (word === "tab" || word === "cell") out += "\t";
      else if (word === "u" && m[2]) {
        let code = Number(m[2]);
        if (code < 0) code += 65536;
        out += String.fromCharCode(code);
        ucSkip = 1;
      }
      continue;
    }
    if (skipping) continue;
    if (ucSkip > 0) {
      ucSkip -= 1;
      continue;
    }
    if (ch === "\r" || ch === "\n") continue;
    out += ch;
  }
  return tidy(out);
}

/* ------------------------------------------------------------------ */
/* The one entry point                                                  */
/* ------------------------------------------------------------------ */

function toBase64(bytes) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
}

/**
 * Reads one file. Returns
 *   { kind, text, images: [{ mimeType, bytes }], inline: { mimeType, bytes } | null }
 * where `inline` is set for a PDF or an image the model reads itself.
 * Throws DocTextError (or ZipError) with a message safe to show.
 */
export function extract(buffer, { fileName = "document", mimeType = "" } = {}) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let kind = detectKind(fileName, mimeType, bytes.subarray(0, 16));
  // A bare zip (no helpful extension) is identified by what is inside it.
  if (kind === "zip" || kind === "unknown") {
    const magic = kindFromMagic(bytes.subarray(0, 16));
    if (magic === "zip") {
      const zip = openZip(bytes);
      if (zip.has("word/document.xml")) kind = "docx";
      else if (zip.has("ppt/presentation.xml")) kind = "pptx";
      else if (zip.has("xl/workbook.xml")) kind = "xlsx";
      else if (zip.has("content.xml")) kind = "odt";
    } else if (magic) kind = magic;
  }
  if (kind === "blocked") throw new DocTextError("That kind of file isn't allowed.", "BLOCKED");
  if (LEGACY_KINDS.has(kind)) throw new DocTextError(LEGACY_MESSAGE, "LEGACY");
  if (kind === "pdf") return { kind, text: "", images: [], inline: { mimeType: "application/pdf", bytes } };
  if (kind === "png" || kind === "jpeg" || kind === "webp") return { kind, text: "", images: [], inline: { mimeType: mimeForKind(kind), bytes } };
  if (kind === "text" || kind === "markdown" || kind === "csv") return { kind, text: tidy(decodeText(bytes)), images: [], inline: null };
  if (kind === "rtf") return { kind, text: rtfToText(decodeText(bytes)), images: [], inline: null };

  if (["docx", "pptx", "xlsx", "odt", "odp", "ods"].includes(kind)) {
    const zip = openZip(bytes);
    let out;
    if (kind === "docx") out = docxToText(zip);
    else if (kind === "pptx") out = pptxToText(zip);
    else if (kind === "xlsx") out = xlsxToText(zip);
    else out = odfToText(zip, kind);
    const images = (out.images || [])
      .map((img) => {
        try {
          const data = zip.read(img.name);
          return data && data.length ? { mimeType: img.mimeType, bytes: data, name: img.name } : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return { kind, text: out.text, images, inline: null };
  }
  throw new DocTextError("That file type can't be read automatically. Upload a PDF, Word, PowerPoint, Excel, text or image file.", "UNSUPPORTED");
}

/**
 * The model-ready parts for one file: a header line naming the source, then
 * its text and/or inline data. Returns
 *   { kind, parts: [{ text } | { inline_data: { mime_type, data } }], text, chars, inlineBytes }.
 */
export function toParts(buffer, { fileName = "document", mimeType = "", index = 1, total = 1 } = {}) {
  let out;
  try {
    out = extract(buffer, { fileName, mimeType });
  } catch (error) {
    if (error instanceof ZipError) throw new DocTextError(error.message, error.code);
    throw error;
  }
  const header = `=== Source ${index} of ${total}: "${fileName}" ===`;
  const parts = [{ text: header }];
  let inlineBytes = 0;
  if (out.inline) {
    parts.push({ inline_data: { mime_type: out.inline.mimeType, data: toBase64(out.inline.bytes) } });
    inlineBytes += out.inline.bytes.length;
  }
  if (out.text) parts.push({ text: out.text });
  for (const img of out.images || []) {
    parts.push({ text: `(Image from "${fileName}": ${img.name.split("/").pop()})` });
    parts.push({ inline_data: { mime_type: img.mimeType, data: toBase64(img.bytes) } });
    inlineBytes += img.bytes.length;
  }
  if (!out.inline && !out.text && !(out.images || []).length) {
    throw new DocTextError(`No readable text was found in "${fileName}".`, "EMPTY");
  }
  return { kind: out.kind, parts, text: out.text || "", chars: (out.text || "").length, inlineBytes, imageCount: (out.images || []).length };
}
