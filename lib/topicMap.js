/**
 * "Generate from my documents" — the pure parts.
 *
 * Step 1 reads the host's files into a topic map (topics, subtopics, how much
 * of the material covers each, and where in the files it came from). Step 2
 * writes questions topic by topic. Everything here is plain functions so the
 * API routes, the modal and the tests share one set of rules: how a map is
 * validated, how a total is split across topics and across difficulty and
 * Bloom levels, and which excerpt of the sources a topic is written from.
 */

import { AI } from "./settings";

export const BLOOM_LEVELS = ["remember", "understand", "apply", "analyse"];
export const BLOOM_LABEL = { remember: "Remember", understand: "Understand", apply: "Apply", analyse: "Analyse" };
export const DIFFICULTY_LEVELS = ["easy", "moderate", "hard"];
export const DIFFICULTY_LABEL = { easy: "Easy", moderate: "Medium", hard: "Hard" };

export const DEFAULT_DIFFICULTY_MIX = { easy: 30, moderate: 50, hard: 20 };
export const DEFAULT_BLOOM_MIX = { remember: 30, understand: 30, apply: 30, analyse: 10 };

const QUOTE_WORDS = 25;

/** A quote cut to at most `n` words (the citation limit — never a copied passage). */
export function truncateWords(text, n = QUOTE_WORDS) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= n) return words.join(" ");
  return `${words.slice(0, n).join(" ")}…`;
}

function cleanCitation(s) {
  return {
    fileName: String(s?.fileName || "").slice(0, 160),
    locator: String(s?.locator || "").slice(0, 80),
    quote: truncateWords(s?.quote),
  };
}

function slugId(title, i) {
  const base = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `t${i + 1}${base ? `-${base}` : ""}`;
}

/**
 * Checks and shapes the model's topic map. At most AI.MAX_TOPICS topics; a
 * topic that cites no source is dropped (it may be invented); quotes are cut
 * to 25 words; weights clamped to 1–5; an unknown file name in a citation is
 * dropped. Returns { topics, ayushSystemGuess, levelGuess, warnings, dropped }.
 */
export function validateTopicMap(raw, { fileNames = [], isAyushSystem = () => true } = {}) {
  const known = new Set(fileNames.map((n) => String(n).toLowerCase()));
  const rows = Array.isArray(raw?.topics) ? raw.topics : [];
  const topics = [];
  let dropped = 0;
  const seen = new Set();
  for (const t of rows) {
    if (topics.length >= AI.MAX_TOPICS) {
      dropped += 1;
      continue;
    }
    const title = String(t?.title || "").trim().slice(0, 120);
    if (!title) {
      dropped += 1;
      continue;
    }
    const sources = (Array.isArray(t?.sources) ? t.sources : [])
      .map(cleanCitation)
      .filter((s) => s.fileName && (!known.size || known.has(s.fileName.toLowerCase())));
    if (!sources.length) {
      dropped += 1;
      continue;
    }
    let id = String(t?.id || "").trim().slice(0, 40) || slugId(title, topics.length);
    if (seen.has(id)) id = `${id}-${topics.length + 1}`;
    seen.add(id);
    topics.push({
      id,
      title,
      subtopics: (Array.isArray(t?.subtopics) ? t.subtopics : []).map((s) => String(s || "").trim().slice(0, 120)).filter(Boolean).slice(0, 12),
      weight: Math.max(1, Math.min(5, Math.round(Number(t?.weight) || 1))),
      sources: sources.slice(0, 6),
    });
  }
  return {
    topics,
    ayushSystemGuess: isAyushSystem(raw?.ayushSystemGuess) ? raw.ayushSystemGuess : "",
    levelGuess: String(raw?.levelGuess || "").slice(0, 60),
    warnings: (Array.isArray(raw?.warnings) ? raw.warnings : []).map((w) => String(w || "").slice(0, 300)).filter(Boolean).slice(0, 10),
    dropped,
  };
}

/**
 * Splits `total` across items by weight with the largest-remainder method,
 * so the parts are whole numbers that add up exactly.
 */
export function splitByWeight(total, weights) {
  const n = Math.max(0, Math.round(Number(total) || 0));
  const w = weights.map((x) => Math.max(0, Number(x) || 0));
  const sum = w.reduce((a, b) => a + b, 0);
  if (!w.length) return [];
  if (!sum) return splitByWeight(n, w.map(() => 1));
  const exact = w.map((x) => (x / sum) * n);
  const out = exact.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0 && k < order.length; k += 1, left -= 1) out[order[k][1]] += 1;
  return out;
}

/** Per-topic default counts, proportional to weight, adding up to `total` (capped at AI.MAX_QUESTIONS_PER_RUN). */
export function allocateCounts(topics, total = 20) {
  const capped = Math.min(AI.MAX_QUESTIONS_PER_RUN, Math.max(0, Math.round(Number(total) || 0)));
  const counts = splitByWeight(capped, topics.map((t) => t.weight || 1));
  return Object.fromEntries(topics.map((t, i) => [t.id, counts[i] || 0]));
}

/** { easy: 30, moderate: 50, hard: 20 } over 7 questions → { easy: 2, moderate: 4, hard: 1 }. */
export function mixCounts(total, mix) {
  const keys = Object.keys(mix);
  const parts = splitByWeight(total, keys.map((k) => mix[k]));
  return Object.fromEntries(keys.map((k, i) => [k, parts[i]]));
}

/** Null when a percentage mix adds up to 100, otherwise the message. */
export function mixError(mix, label) {
  const values = Object.values(mix).map(Number);
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) return `${label} percentages must each be between 0 and 100.`;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum === 100 ? null : `${label} percentages must add up to 100 (now ${sum}).`;
}

function normalise(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The part of a text source one topic is written from: windows around every
 * place the topic's quotes, title and subtopics appear, merged and capped.
 * Only these excerpts (not every file every time) are sent for a topic.
 * Returns "" when nothing in the text matches.
 */
export function excerptFor(text, topic, { window = 1500, maxChars = 12000 } = {}) {
  const src = String(text || "");
  if (!src) return "";
  const hay = src.toLowerCase();
  const needles = [
    ...(topic?.sources || []).map((s) => String(s.quote || "").replace(/…$/, "").split(/\s+/).slice(0, 8).join(" ")),
    topic?.title,
    ...(topic?.subtopics || []),
  ]
    .map(normalise)
    .filter((n) => n.length >= 4);
  const spans = [];
  for (const needle of needles) {
    let from = 0;
    let hits = 0;
    while (hits < 4) {
      const at = hay.indexOf(needle, from);
      if (at < 0) break;
      spans.push([Math.max(0, at - window), Math.min(src.length, at + needle.length + window)]);
      from = at + needle.length;
      hits += 1;
    }
  }
  if (!spans.length) return "";
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([...s]);
  }
  let out = "";
  for (const [a, b] of merged) {
    const piece = src.slice(a, b);
    if (out.length + piece.length > maxChars) {
      out += `${out ? "\n…\n" : ""}${piece.slice(0, Math.max(0, maxChars - out.length))}`;
      break;
    }
    out += `${out ? "\n…\n" : ""}${piece}`;
  }
  return out;
}

/** The rules every document-grounded prompt carries. */
export const SOURCE_RULES = [
  "Ground everything in the attached sources. Each source begins with a line like === Source 2 of 4: \"file name\" ===; cite files by that exact name.",
  "Never copy a passage longer than 25 words from a textbook or the sources; quotes are only short citations.",
  "Never invent references, page numbers, slide numbers or quotes. If you cannot point to where something is in the sources, leave it out.",
  "Use correct AYUSH terminology. Transliterate Sanskrit, Arabic/Persian and Tamil terms consistently, with the English meaning in brackets on first use (for example Rasa (taste), Mizaj (temperament), Vatham (Vata)).",
].join("\n");
