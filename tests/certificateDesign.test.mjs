import test from "node:test";
import assert from "node:assert/strict";
import { DESIGN_PRESETS, differsEnough, makeDifferent, normaliseDesign, structuralDistance } from "../lib/certificateDesign.js";

test("design — every preset differs enough from every other", () => {
  DESIGN_PRESETS.forEach((p, i) => {
    const others = DESIGN_PRESETS.filter((_, j) => j !== i);
    assert.ok(differsEnough(p, others), `${p.name} is too close to another preset`);
  });
});

test("design — a recolour of a shown design is not different enough, and is nudged into being", () => {
  const shown = normaliseDesign(DESIGN_PRESETS[0]);
  const recolour = { ...shown, id: "x", palette: { ...shown.palette, primary: "#2F6B60" } };
  assert.ok(!differsEnough(recolour, [shown]));
  assert.equal(structuralDistance(recolour, shown), 0);
  const nudged = makeDifferent(recolour, [shown]);
  assert.ok(differsEnough(nudged, [shown]));
  // Deterministic: the same near-copy always becomes the same alternative.
  assert.deepEqual(makeDifferent(recolour, [shown]), nudged);
});

test("design — a clearly different hue plus one structural change counts as different", () => {
  const shown = normaliseDesign(DESIGN_PRESETS[0]); // green, double frame
  const candidate = { ...shown, palette: { ...shown.palette, primary: "#2B3A67" }, border: "corners" }; // indigo, corners
  assert.ok(differsEnough(candidate, [shown]));
});

test("design — normalisation fills the new fields from the base and rejects unknown values", () => {
  const d = normaliseDesign({ border: "hexagon", pattern: "plaid", nameStyle: "neon", seal: "yes" });
  assert.equal(d.border, DESIGN_PRESETS[0].border);
  assert.equal(d.pattern, "none");
  assert.equal(d.nameStyle, "underline");
  // A saved design that never mentioned a seal does not gain one; a fresh preset does.
  assert.equal(d.seal, false);
  assert.equal(normaliseDesign(null).seal, true);
  const e = normaliseDesign({ border: "sidebar", pattern: "rings", nameStyle: "boxed", seal: false });
  assert.deepEqual([e.border, e.pattern, e.nameStyle, e.seal], ["sidebar", "rings", "boxed", false]);
});
