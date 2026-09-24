import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFileLimits, bareMimeType } from "../lib/uploads.js";
import { FILES } from "../lib/settings.js";

const file = (name, type, size) => ({ name, type, size });

test("documents: PDF/Word up to 10 MB", () => {
  assert.equal(checkFileLimits(file("cv.pdf", "application/pdf", 1024), "document"), null);
  assert.equal(
    checkFileLimits(file("cv.pdf", "application/pdf", FILES.MAX_DOCUMENT_BYTES + 1), "document"),
    "File is too large — please upload a file under 10MB"
  );
  assert.equal(checkFileLimits(file("cv.png", "image/png", 10), "document"), "Please upload a PDF or Word document");
  assert.equal(checkFileLimits(file("cv.docx", "", 10), "document"), null); // sniffed from the extension
});

test("images: PNG/JPG/WebP up to 5 MB, SVG refused", () => {
  assert.equal(checkFileLimits(file("a.png", "image/png", 10), "image"), null);
  assert.equal(checkFileLimits(file("a.jpg", "image/jpeg", FILES.MAX_IMAGE_BYTES + 1), "image"), "File is too large — please upload a file under 5MB");
  assert.equal(checkFileLimits(file("a.svg", "image/svg+xml", 10), "image"), "Please upload a PNG, JPG or WebP image");
  assert.equal(checkFileLimits(file("a.pdf", "application/pdf", 10), "image"), "Please upload a PNG, JPG or WebP image");
});

test("mime types are sent bare", () => {
  assert.equal(bareMimeType("video/webm;codecs=vp8,opus"), "video/webm");
  assert.equal(bareMimeType("Application/PDF"), "application/pdf");
});

test("new kinds: source, resume, material, cover", () => {
  assert.equal(checkFileLimits(file("notes.docx", "application/octet-stream", 1000), "source"), null);
  assert.equal(checkFileLimits(file("bank.xlsx", "", 1000), "source"), null);
  assert.equal(checkFileLimits(file("topics.md", "", 1000), "source"), null);
  assert.equal(checkFileLimits(file("photo.jpg", "image/jpeg", 1000), "source"), null);
  assert.match(checkFileLimits(file("Unit 5.doc", "application/msword", 1000), "source"), /Save As/);
  assert.match(checkFileLimits(file("notes.pdf", "application/pdf", 21 * 1024 * 1024), "source"), /under 20MB/);
  assert.equal(checkFileLimits(file("cv.pdf", "application/pdf", 1000), "resume"), null);
  assert.match(checkFileLimits(file("cv.pdf", "application/pdf", 6 * 1024 * 1024), "resume"), /under 5MB/);
  assert.match(checkFileLimits(file("cv.pptx", "", 10), "resume"), /resume/);
  assert.equal(checkFileLimits(file("old.ppt", "", 10), "material"), null);
  assert.equal(checkFileLimits(file("pack.zip", "application/zip", 10), "material"), null);
  assert.match(checkFileLimits(file("big.pdf", "application/pdf", 26 * 1024 * 1024), "material"), /under 25MB/);
  assert.equal(checkFileLimits(file("cover.webp", "image/webp", 10), "cover"), null);
  assert.equal(checkFileLimits(file("cover.pdf", "application/pdf", 10), "cover"), "Please upload a PNG, JPG or WebP image");
});

test("blocked extensions and types are refused for every kind", () => {
  for (const kind of ["document", "image", "source", "material", "cover", "resume"]) {
    // Image slots keep their own sentence; every other slot names the refusal.
    const refused = kind === "image" || kind === "cover" ? /PNG, JPG or WebP/ : /isn't allowed/;
    assert.match(checkFileLimits(file("setup.exe", "application/octet-stream", 10), kind), refused);
    assert.match(checkFileLimits(file("page.html", "text/html", 10), kind), refused);
    assert.match(checkFileLimits(file("logo.svg", "image/svg+xml", 10), kind), refused);
    assert.match(checkFileLimits(file("run.ps1", "", 10), kind), refused);
  }
});
