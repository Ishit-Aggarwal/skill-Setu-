import { test } from "node:test";
import assert from "node:assert/strict";
import { drawPool, seededShuffle, shufflePaperFor } from "../lib/shuffle.js";
import { gradePaper, withholdAnswers } from "../lib/grading.js";

const ids = Array.from({ length: 30 }, (_, i) => `q${i + 1}`);

test("seededShuffle is deterministic per seed and a permutation", () => {
  const a = seededShuffle(ids, "att_1");
  const b = seededShuffle(ids, "att_1");
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort(), [...ids].sort());
  assert.notDeepEqual(a, ids);
  assert.notDeepEqual(seededShuffle(ids, "att_2"), a);
  assert.deepEqual(ids[0], "q1"); // the input is untouched
});

test("drawPool: stable N of the paper, in paper order", () => {
  const pool = drawPool(ids, 20, "att_1");
  assert.equal(pool.length, 20);
  assert.deepEqual(drawPool(ids, 20, "att_1"), pool);
  assert.notDeepEqual(drawPool(ids, 20, "att_9"), pool);
  const order = pool.map((id) => ids.indexOf(id));
  assert.deepEqual(order, [...order].sort((x, y) => x - y));
  assert.deepEqual(drawPool(ids, 40, "x"), ids);
});

test("grading is by question and option id, so a shuffled paper marks the same", () => {
  const paper = [
    { id: "q1", text: "Rasa of Guduchi?", type: "single", options: [{ id: "a", text: "Tikta", isCorrect: true }, { id: "b", text: "Madhura", isCorrect: false }, { id: "c", text: "Lavana", isCorrect: false }] },
    { id: "q2", text: "Tridosha?", type: "multiple", options: [{ id: "d", text: "Vata", isCorrect: true }, { id: "e", text: "Pitta", isCorrect: true }, { id: "f", text: "Ama", isCorrect: false }] },
  ];
  const answers = { q1: ["a"], q2: ["e", "d"] };
  const shuffled = shufflePaperFor(paper, "att_7");
  assert.deepEqual(shufflePaperFor(paper, "att_7"), shuffled);
  const original = gradePaper(paper, answers);
  const reordered = gradePaper(shuffled, answers);
  assert.equal(original.points, 2);
  assert.equal(reordered.points, 2);
  assert.equal(reordered.score, 100);
});

test("withholdAnswers strips the key but keeps right/wrong", () => {
  const paper = [{ id: "q1", text: "?", type: "single", options: [{ id: "a", text: "Tikta", isCorrect: true }, { id: "b", text: "Katu", isCorrect: false }], explanation: "Charaka" }];
  const out = withholdAnswers(gradePaper(paper, { q1: ["b"] }));
  assert.equal(out.answersWithheld, true);
  assert.equal(out.breakdown[0].correct, false);
  assert.equal(out.breakdown[0].chosenText, "Katu");
  assert.equal("correctIds" in out.breakdown[0], false);
  assert.equal("correctText" in out.breakdown[0], false);
  assert.equal("explanation" in out.breakdown[0], false);
});
