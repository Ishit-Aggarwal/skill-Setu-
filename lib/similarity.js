/**
 * "Same concept, never the same question."
 *
 * When a paper is generated from a host's sample papers the model is told
 * not to repeat them, and this module is the check behind that instruction:
 * every generated question is compared with every sample question, and one
 * that reads like a copy — same words in slightly different order, a
 * rearranged option list — is dropped before the professor sees it.
 *
 * Plain text similarity, no model, no "use client": the API route and the
 * tests both import it.
 */

const STOPWORDS = new Set(
  "a an the of in on at to for from by with and or is are was were be been being which what who whom whose that this these those as into than then it its their there here not no does do did can could should would will may might one".split(" ")
);

/** Lower-case, strip punctuation and option lettering, collapse whitespace. */
export function normaliseText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\b[a-d]\)|\([a-d]\)|\b[ivx]+\)|\b\d+\)/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The informative words of a text, as a set. */
export function tokenSet(text) {
  const out = new Set();
  for (const w of normaliseText(text).split(" ")) if (w && !STOPWORDS.has(w) && w.length > 1) out.add(w);
  return out;
}

/** Jaccard similarity of two token sets (0–1). */
export function jaccard(a, b) {
  const A = a instanceof Set ? a : tokenSet(a);
  const B = b instanceof Set ? b : tokenSet(b);
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * The whole question — stem plus options — as one token set, so a question
 * that keeps the stem and shuffles the options still reads as the same one.
 */
export function questionTokens(q) {
  const parts = [q?.text || ""];
  for (const o of q?.options || []) parts.push(typeof o === "string" ? o : o?.text || "");
  return tokenSet(parts.join(" "));
}

/** Default cut-offs: above these a generated question is a copy of a sample. */
export const SIMILARITY = { QUESTION: 0.6, STEM: 0.72 };

/**
 * True when `candidate` is too close to `sample`: by the whole question, or
 * by the stem alone (a rewritten option list does not make a new question).
 */
export function tooSimilar(candidate, sample, limits = SIMILARITY) {
  if (jaccard(questionTokens(candidate), questionTokens(sample)) >= limits.QUESTION) return true;
  const a = normaliseText(candidate?.text);
  const b = normaliseText(sample?.text);
  if (a && b && (a === b || (a.length > 30 && (a.includes(b) || b.includes(a))))) return true;
  return jaccard(tokenSet(a), tokenSet(b)) >= limits.STEM;
}

/**
 * Splits a generated paper into the questions to keep and those that copy
 * a sample. Returns { kept, dropped: [{ question, sampleIndex }] }.
 */
export function filterAgainstSamples(generated, samples, limits = SIMILARITY) {
  const kept = [];
  const dropped = [];
  for (const q of generated || []) {
    const hit = (samples || []).findIndex((s) => tooSimilar(q, s, limits));
    if (hit >= 0) dropped.push({ question: q, sampleIndex: hit });
    else kept.push(q);
  }
  return { kept, dropped };
}
