import { test } from "node:test";
import assert from "node:assert/strict";
import { openZip, ZipError } from "../lib/zip.js";
import { buildZip } from "./_zipFixture.mjs";

test("reads stored and deflated entries", () => {
  const zip = openZip(
    buildZip([
      { name: "a.txt", data: "stored text", method: 0 },
      { name: "dir/b.xml", data: "<x>deflated</x>".repeat(50), method: 8 },
    ])
  );
  assert.deepEqual(zip.entries.map((e) => e.name), ["a.txt", "dir/b.xml"]);
  assert.equal(zip.text("a.txt"), "stored text");
  assert.equal(zip.text("dir/b.xml"), "<x>deflated</x>".repeat(50));
  assert.equal(zip.read("missing"), null);
});

test("refuses encrypted entries", () => {
  assert.throws(() => openZip(buildZip([{ name: "secret.xml", data: "x", encrypted: true }])), (e) => e instanceof ZipError && e.code === "ENCRYPTED");
});

test("zip-bomb guard: declared size checked before inflating", () => {
  const zip = openZip(buildZip([{ name: "big.xml", data: "x", declaredSize: 50 * 1024 * 1024 }]), { maxTotalBytes: 1024 * 1024 });
  assert.throws(() => zip.read("big.xml"), (e) => e.code === "TOO_LARGE");
});

test("zip-bomb guard: a lying declared size is caught on the real output", () => {
  const bomb = Buffer.alloc(3 * 1024 * 1024, 0);
  const zip = openZip(buildZip([{ name: "bomb.xml", data: bomb, declaredSize: 10 }]), { maxTotalBytes: 1024 * 1024 });
  assert.throws(() => zip.read("bomb.xml"), (e) => e.code === "TOO_LARGE");
});

test("paths with .. are ignored", () => {
  const zip = openZip(buildZip([{ name: "../evil.txt", data: "no" }, { name: "ok.txt", data: "yes" }]));
  assert.deepEqual(zip.entries.map((e) => e.name), ["ok.txt"]);
  assert.equal(zip.has("../evil.txt"), false);
});

test("too many entries and garbage are refused", () => {
  const many = buildZip(Array.from({ length: 5 }, (_, i) => ({ name: `f${i}.txt`, data: "x" })));
  assert.throws(() => openZip(many, { maxEntries: 3 }), (e) => e.code === "TOO_MANY");
  assert.throws(() => openZip(new Uint8Array(100)), (e) => e.code === "CORRUPT");
});
