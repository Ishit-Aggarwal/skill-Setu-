import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateCounts, excerptFor, mixCounts, mixError, splitByWeight, truncateWords, validateTopicMap } from "../lib/topicMap.js";
import { cleanCitation, normaliseQuestion } from "../lib/questions.js";

test("validateTopicMap drops unsourced topics, caps quotes and weights, checks file names", () => {
  const raw = {
    topics: [
      { id: "t1", title: "Rasa Panchaka", subtopics: ["Rasa", "Guna"], weight: 9, sources: [{ fileName: "Unit 3.docx", locator: "Heading 'Rasa'", quote: Array(40).fill("word").join(" ") }] },
      { id: "t2", title: "Invented topic", subtopics: [], weight: 3, sources: [] },
      { id: "t3", title: "Vipaka", subtopics: [], weight: 0, sources: [{ fileName: "unknown.pdf", locator: "p. 1", quote: "x" }] },
      { id: "t1", title: "Virya", subtopics: [], weight: 2, sources: [{ fileName: "unit 3.DOCX", locator: "p. 2", quote: "Ushna and Shita" }] },
    ],
    ayushSystemGuess: "ayurveda",
    levelGuess: "UG 2nd Prof",
    warnings: ["Page 4 was blurred"],
  };
  const map = validateTopicMap(raw, { fileNames: ["Unit 3.docx"], isAyushSystem: (s) => s === "ayurveda" });
  assert.deepEqual(map.topics.map((t) => t.title), ["Rasa Panchaka", "Virya"]);
  assert.equal(map.topics[0].weight, 5);
  assert.equal(map.topics[0].sources[0].quote.split(" ").length, 25);
  assert.notEqual(map.topics[1].id, map.topics[0].id);
  assert.equal(map.dropped, 2);
  assert.equal(map.ayushSystemGuess, "ayurveda");
});

test("counts split by weight add up exactly, capped per run", () => {
  assert.deepEqual(splitByWeight(10, [1, 1, 1]), [4, 3, 3]);
  assert.equal(splitByWeight(7, [5, 2, 1]).reduce((a, b) => a + b, 0), 7);
  const counts = allocateCounts([{ id: "a", weight: 5 }, { id: "b", weight: 1 }], 20);
  assert.equal(counts.a + counts.b, 20);
  assert.ok(counts.a > counts.b);
  const capped = allocateCounts([{ id: "a", weight: 1 }], 500);
  assert.equal(capped.a, 60);
  assert.deepEqual(mixCounts(7, { easy: 30, moderate: 50, hard: 20 }), { easy: 2, moderate: 4, hard: 1 });
  assert.equal(mixError({ a: 30, b: 70 }, "Difficulty"), null);
  assert.match(mixError({ a: 30, b: 60 }, "Difficulty"), /add up to 100/);
});

test("excerptFor returns only the passages around the topic", () => {
  const filler = "Unrelated material about hospital administration. ".repeat(200);
  const text = `${filler}Rasa Panchaka comprises Rasa, Guna, Virya, Vipaka and Prabhava.${filler}`;
  const out = excerptFor(text, { title: "Rasa Panchaka", subtopics: ["Vipaka"], sources: [] }, { window: 100 });
  assert.match(out, /Rasa Panchaka comprises/);
  assert.ok(out.length < 600);
  assert.equal(excerptFor(text, { title: "Marma", subtopics: [], sources: [] }), "");
});

test("quotes stay under 25 words; citations survive normalisation", () => {
  assert.equal(truncateWords("a b c", 2), "a b…");
  const c = cleanCitation({ fileName: "Slides.pptx", locator: "Slide 7", quote: Array(30).fill("x").join(" "), extra: "dropped" });
  assert.deepEqual(Object.keys(c), ["fileName", "locator", "quote"]);
  assert.equal(c.quote.split(" ").length, 25);
  assert.equal(cleanCitation({ locator: "p. 1" }), null);
  const q = normaliseQuestion({ text: "Q", type: "single", options: [{ text: "a", isCorrect: true }, { text: "b" }], bloom: "apply", citation: { fileName: "n.docx", locator: "p. 2", quote: "q" } });
  assert.equal(q.bloom, "apply");
  assert.equal(q.citation.fileName, "n.docx");
  assert.equal(normaliseQuestion({ bloom: "create" }).bloom, "");
});
