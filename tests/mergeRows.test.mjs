import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeRow, pickWinner } from "../lib/mergeRows.js";

test("later updatedAt wins the whole row", () => {
  const local = { id: "a", title: "old", note: "mine", updatedAt: "2026-09-01T00:00:00.000Z" };
  const remote = { id: "a", title: "new", updatedAt: "2026-09-02T00:00:00.000Z", _id: "x", _creationTime: 1 };
  const { row, changed } = mergeRow(local, remote);
  assert.equal(changed, true);
  assert.equal(row.title, "new");
  assert.equal(row.note, "mine"); // loser-only fields survive
  assert.equal(row._id, undefined);
});

test("a newer local copy beats the server's", () => {
  const local = { id: "a", title: "edited here", updatedAt: "2026-09-03T00:00:00.000Z" };
  const remote = { id: "a", title: "stale", updatedAt: "2026-09-02T00:00:00.000Z" };
  const { row, changed } = mergeRow(local, remote);
  assert.equal(row.title, "edited here");
  assert.equal(changed, false);
});

test("a row without updatedAt loses to one with it; a tie goes to the server", () => {
  assert.equal(pickWinner({ updatedAt: undefined }, { updatedAt: "2026-09-02T00:00:00.000Z" }), "remote");
  assert.equal(pickWinner({ updatedAt: "2026-09-02T00:00:00.000Z" }, {}), "local");
  assert.equal(pickWinner({ updatedAt: "2026-09-02T00:00:00.000Z" }, { updatedAt: "2026-09-02T00:00:00.000Z" }), "remote");
  assert.equal(pickWinner({}, {}), "remote");
});

test("a row the device has never seen is taken as is", () => {
  const { row, changed } = mergeRow(null, { id: "b", x: 1, _creationTime: 5 });
  assert.deepEqual(row, { id: "b", x: 1 });
  assert.equal(changed, true);
});
