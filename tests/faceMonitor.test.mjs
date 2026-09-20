import { test } from "node:test";
import assert from "node:assert/strict";
import { assessFrame, EpisodeTracker, gazeOffset, headPose } from "../lib/faceMonitor.js";
import { EXAM } from "../lib/settings.js";

const limits = EXAM.FACE;

test("a frame is read as no face / extra faces / looking away by the configured limits", () => {
  assert.deepEqual(assessFrame({ faces: 0 }), { noFace: true, multipleFaces: false, lookingAway: false });
  assert.deepEqual(assessFrame({ faces: 2 }), { noFace: false, multipleFaces: true, lookingAway: false });
  assert.deepEqual(assessFrame({ faces: 1, yaw: 5, pitch: 5, gaze: 0.1 }), { noFace: false, multipleFaces: false, lookingAway: false });
  assert.equal(assessFrame({ faces: 1, yaw: limits.YAW_LIMIT_DEG + 1 }).lookingAway, true);
  assert.equal(assessFrame({ faces: 1, pitch: -(limits.PITCH_LIMIT_DEG + 1) }).lookingAway, true);
  assert.equal(assessFrame({ faces: 1, gaze: limits.GAZE_LIMIT + 0.01 }).lookingAway, true);
});

test("a condition is flagged once it has held long enough, and again after the cooldown while it persists", () => {
  const t = new EpisodeTracker({ ...limits, NO_FACE_SECONDS: 2, COOLDOWN_SECONDS: 5 });
  const gone = { noFace: true, multipleFaces: false, lookingAway: false };
  const back = { noFace: false, multipleFaces: false, lookingAway: false };
  assert.deepEqual(t.update(gone, 0), []);
  assert.deepEqual(t.update(gone, 1000), []);
  const raised = t.update(gone, 2100);
  assert.equal(raised.length, 1);
  assert.equal(raised[0].type, "NO_FACE");
  assert.deepEqual(t.update(gone, 4000), []); // still absent, but inside the cooldown
  assert.deepEqual(t.update(gone, 7000), []); // cooldown ends at 7100
  assert.equal(t.update(gone, 7200).length, 1); // still absent → charged again
  t.update(back, 7500); // face returns: the clock resets
  assert.deepEqual(t.update(gone, 8000), []);
  assert.deepEqual(t.update(gone, 9900), []); // held 1.9 s: not yet
  assert.deepEqual(t.update(gone, 10100), []); // held 2.1 s, but cooldown from 7200 ends at 12200
  assert.equal(t.update(gone, 12300).length, 1);
});

test("head pose and gaze are read from the model's outputs", () => {
  const identity = { rows: 4, columns: 4, data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
  assert.deepEqual(headPose(identity), { yaw: 0, pitch: 0 });
  // 90° turn about the vertical axis: column 0 becomes (0, 0, -1).
  const turned = { rows: 4, columns: 4, data: [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1] };
  assert.equal(Math.round(headPose(turned).yaw), 90);
  assert.equal(headPose(null).yaw, 0);
  assert.equal(gazeOffset({ categories: [{ categoryName: "eyeLookOutLeft", score: 0.7 }, { categoryName: "jawOpen", score: 0.9 }] }), 0.7);
  assert.equal(gazeOffset(null), 0);
});
