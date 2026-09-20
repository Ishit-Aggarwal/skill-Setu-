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
