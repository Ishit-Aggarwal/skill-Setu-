import test from "node:test";
import assert from "node:assert/strict";
import { IdentityTracker, cosine, faceBox } from "../lib/faceMonitor.js";
import { VoiceTracker, voiceScore } from "../lib/voiceMonitor.js";
import { EXAM } from "../lib/settings.js";

const ID = { ...EXAM.IDENTITY, REFERENCE_SAMPLES: 2, REFERENCE_WINDOW_SECONDS: 5, MISMATCH_SECONDS: 4, COOLDOWN_SECONDS: 10, MATCH_THRESHOLD: 0.8 };

test("identity — reference samples are gathered first, then every face is judged against them", () => {
  const t = new IdentityTracker(ID, 0);
  const me = [1, 0, 0];
  assert.equal(t.update(me, 100), "reference");
  assert.equal(t.update([0.9, 0.1, 0], 600), "reference");
  assert.ok(t.ready);
  // The same person: nothing.
  assert.equal(t.update([0.95, 0.05, 0], 1000), null);
  // Somebody else, briefly: nothing yet.
  const other = [0, 1, 0];
  assert.equal(t.update(other, 2000), null);
  assert.equal(t.update(other, 4000), null);
  // Held for the window: one flag, with the similarity in it.
  const flag = t.update(other, 6100);
  assert.equal(flag?.type, "FACE_MISMATCH");
  assert.ok(flag.similarity < 0.2);
  // Not again inside the cooldown, even though it persists.
  assert.equal(t.update(other, 8000), null);
  assert.equal(t.update(other, 12000), null);
  // The same person back: the episode clears.
  assert.equal(t.update(me, 13000), null);
  assert.equal(t.mismatchSince, null);
});

test("identity — with no reference (nobody in frame at the start) nothing is ever flagged", () => {
  const t = new IdentityTracker(ID, 0);
  assert.equal(t.update([0, 1, 0], 10000), null);
  assert.equal(t.update([0, 1, 0], 20000), null);
});

test("identity — cosine and the face crop are plain arithmetic", () => {
  assert.ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([], []), 0);
  const box = faceBox([{ x: 0.4, y: 0.3 }, { x: 0.6, y: 0.7 }], 0.25);
  assert.ok(box.left < 0.4 && box.right > 0.6 && box.top < 0.3 && box.bottom > 0.7);
  assert.ok(box.left >= 0 && box.right <= 1);
  assert.equal(faceBox([]), null);
});

const VOICE = { ...EXAM.VOICE, SCORE: 0.5, WINDOW_SECONDS: 6, SPEECH_SECONDS: 3, COOLDOWN_SECONDS: 10 };

test("voice — enough speech inside the window is one flag, then a cooldown", () => {
  const t = new VoiceTracker(VOICE);
  const s = (k) => k * 1000;
  assert.equal(t.update(0.9, s(1)), null);
  assert.equal(t.update(0.1, s(2)), null);
  assert.equal(t.update(0.9, s(3)), null);
  const flag = t.update(0.9, s(4));
  assert.equal(flag?.type, "VOICE_DETECTED");
  assert.equal(flag.seconds, 3);
  // Straight after, still talking: not charged again until the cooldown passes.
  for (let k = 5; k < 14; k += 1) assert.equal(t.update(0.9, s(k)), null);
  assert.equal(t.update(0.9, s(15))?.type, "VOICE_DETECTED");
});

test("voice — a lone clap or a word does not reach the window", () => {
  const t = new VoiceTracker(VOICE);
  assert.equal(t.update(0.9, 1000), null);
  for (let k = 2; k < 20; k += 1) assert.equal(t.update(0.05, k * 1000), null);
  assert.equal(t.update(0.9, 21000), null);
});

test("voice — only the voice categories count", () => {
  assert.equal(voiceScore([{ categoryName: "Dog", score: 0.9 }, { categoryName: "Speech", score: 0.4 }]), 0.4);
  assert.equal(voiceScore([{ categoryName: "Typing", score: 0.9 }]), 0);
  assert.equal(voiceScore([{ categoryName: "Conversation", score: 0.7 }, { categoryName: "Whispering", score: 0.8 }]), 0.8);
});
