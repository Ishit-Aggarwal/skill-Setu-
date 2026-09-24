/**
 * Deterministic shuffling, seeded by an attempt id.
 *
 * An open-window test is sat by different candidates at different times, so
 * the first one could otherwise pass the paper on in order ("Q7 is B"). Each
 * candidate therefore gets the questions — and each question's options — in
 * an order drawn from their own attempt id. The same attempt always gets the
 * same order (a reload changes nothing), and marking is by question id and
 * option id (lib/grading.js), so the order never touches the score.
 *
 * Pure functions: the Convex functions and the tests share them.
 */

/** A 32-bit seed from any string (xmur3). */
export function seedFrom(value) {
  const str = String(value ?? "");
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** A small, fast PRNG (mulberry32) returning floats in [0, 1). */
export function prng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new array: `items` in a Fisher–Yates order drawn from `seed`. The input is not touched. */
export function seededShuffle(items, seed) {
  const out = Array.isArray(items) ? items.slice() : [];
  const rand = prng(typeof seed === "number" ? seed >>> 0 : seedFrom(seed));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The `n` question ids one candidate receives from a larger paper: stable
 * for the attempt, kept in the paper's own order (the shuffle, if any, is
 * applied separately when the paper is served).
 */
export function drawPool(questionIds, n, seed) {
  const ids = Array.isArray(questionIds) ? questionIds : [];
  const count = Math.max(0, Math.min(ids.length, Math.round(Number(n) || 0)));
  if (!count || count >= ids.length) return ids.slice();
  const picked = new Set(seededShuffle(ids, `${seed}:pool`).slice(0, count));
  return ids.filter((id) => picked.has(id));
}

/**
 * The paper as one candidate sees it: questions reordered, and each
 * question's options reordered, both from the attempt id.
 */
export function shufflePaperFor(questions, seed) {
  return seededShuffle(questions, `${seed}:questions`).map((q) => ({
    ...q,
    options: seededShuffle(q.options || [], `${seed}:options:${q.id}`),
  }));
}
