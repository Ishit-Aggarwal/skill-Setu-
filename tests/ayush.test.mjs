import { test } from "node:test";
import assert from "node:assert/strict";
import { AYUSH_SYSTEMS, AYUSH_SYSTEM_SLUGS, isAyushSystem, ayushSystemLabel, toAyushSystemSlug, needsAyushRetag } from "../lib/ayush.js";
import { GENERAL_DOMAINS, SECTOR_CLUSTERS } from "../lib/domains.js";

test("Section 1.2 — exactly five canonical systems, in order", () => {
  assert.deepEqual(AYUSH_SYSTEM_SLUGS, ["ayurveda", "yoga_naturopathy", "unani", "siddha", "homoeopathy"]);
  assert.deepEqual(AYUSH_SYSTEMS.map((s) => s.label), ["Ayurveda", "Yoga & Naturopathy", "Unani", "Siddha", "Homoeopathy"]);
});

test("only canonical slugs validate", () => {
  assert.equal(isAyushSystem("ayurveda"), true);
  assert.equal(isAyushSystem("Ayurveda"), false);
  assert.equal(isAyushSystem("homeopathy"), false);
  assert.equal(isAyushSystem(""), false);
  assert.equal(isAyushSystem(null), false);
  assert.equal(ayushSystemLabel("yoga_naturopathy"), "Yoga & Naturopathy");
  assert.equal(ayushSystemLabel("other"), "");
});

test("legacy names and degrees resolve, ambiguity does not", () => {
  assert.equal(toAyushSystemSlug("Homeopathy"), "homoeopathy");
  assert.equal(toAyushSystemSlug("BAMS"), "ayurveda");
  assert.equal(toAyushSystemSlug("Ayurveda (BAMS)"), "ayurveda");
  assert.equal(toAyushSystemSlug("Unani Medicine"), "unani");
  assert.equal(toAyushSystemSlug("Ayurveda and Unani"), null);
  assert.equal(toAyushSystemSlug("IT"), null);
  assert.equal(toAyushSystemSlug(""), null);
});

test("Section 1.5 — a record without a valid system needs re-tagging", () => {
  assert.equal(needsAyushRetag({ ayushSystem: "siddha" }), false);
  assert.equal(needsAyushRetag({ ayushSystem: "Siddha" }), true);
  assert.equal(needsAyushRetag({}), true);
  assert.equal(needsAyushRetag(null), false);
});

test("the sector taxonomy derives its clinical systems from the canonical list", () => {
  assert.deepEqual(GENERAL_DOMAINS.slice(0, 5), AYUSH_SYSTEMS.map((s) => s.label));
  assert.deepEqual(SECTOR_CLUSTERS[0].items, GENERAL_DOMAINS);
});
