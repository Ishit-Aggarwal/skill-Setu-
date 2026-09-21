import test from "node:test";
import assert from "node:assert/strict";
import { filterAgainstSamples, jaccard, normaliseText, tooSimilar } from "../lib/similarity.js";

const sample = {
  text: "Which of the following is the principal dosha responsible for movement in the body?",
  options: ["Vata", "Pitta", "Kapha", "Rakta"],
};

test("similarity — the same question, reworded lightly, is caught", () => {
  const copy = { text: "Which of the following doshas is principally responsible for movement in the body?", options: [{ text: "Pitta" }, { text: "Vata" }, { text: "Rakta" }, { text: "Kapha" }] };
  assert.ok(tooSimilar(copy, sample));
  // The same stem with a new option list is still the same question.
  const shuffled = { text: sample.text, options: [{ text: "Ojas" }, { text: "Vata" }, { text: "Agni" }, { text: "Ama" }] };
  assert.ok(tooSimilar(shuffled, sample));
});

test("similarity — the same concept through a different case passes", () => {
  const fresh = {
    text: "A patient reports dry skin, constipation and restless sleep after a long journey. Which dosha is most likely aggravated?",
    options: [{ text: "Vata" }, { text: "Pitta" }, { text: "Kapha" }, { text: "Ama" }],
  };
  assert.ok(!tooSimilar(fresh, sample));
});

test("similarity — filterAgainstSamples keeps the fresh questions and names the copies", () => {
  const generated = [
    { text: "Which dosha governs movement in the body?", options: [{ text: "Vata" }, { text: "Pitta" }, { text: "Kapha" }, { text: "Rakta" }] },
    { text: "Under Schedule T, which record must a licensed ASU manufacturer keep for every batch?", options: [{ text: "Batch manufacturing record" }, { text: "Sales ledger" }, { text: "Visitor log" }, { text: "Tender file" }] },
  ];
  const { kept, dropped } = filterAgainstSamples(generated, [sample]);
  assert.equal(kept.length, 1);
  assert.equal(dropped.length, 1);
  assert.equal(dropped[0].sampleIndex, 0);
  assert.match(kept[0].text, /Schedule T/);
});

test("similarity — normalisation strips lettering and punctuation; jaccard is symmetric", () => {
  assert.equal(normaliseText("(a) Vata, (b) Pitta!"), "vata pitta");
  assert.equal(jaccard("the dosha of movement", "movement dosha"), jaccard("movement dosha", "the dosha of movement"));
  assert.equal(jaccard("", ""), 1);
});
