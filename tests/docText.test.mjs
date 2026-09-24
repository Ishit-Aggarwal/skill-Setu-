import { test } from "node:test";
import assert from "node:assert/strict";
import { detectKind, extract, toParts, rtfToText, decodeText, DocTextError } from "../lib/docText.js";
import { buildZip } from "./_zipFixture.mjs";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

test("detectKind: extension first, then MIME, then magic bytes", () => {
  assert.equal(detectKind("notes.docx", "application/octet-stream"), "docx");
  assert.equal(detectKind("README.md", "application/octet-stream"), "markdown");
  assert.equal(detectKind("bank.csv", ""), "csv");
  assert.equal(detectKind("paper", "application/pdf"), "pdf");
  assert.equal(detectKind("scan", "application/octet-stream", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), "pdf");
  assert.equal(detectKind("photo", "", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])), "png");
  assert.equal(detectKind("blob", "", new Uint8Array([0x50, 0x4b, 0x03, 0x04])), "zip");
  assert.equal(detectKind("old", "", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0])), "doc");
  assert.equal(detectKind("run.exe", "application/pdf"), "blocked");
  assert.equal(detectKind("page", "text/html"), "blocked");
  assert.equal(detectKind("x", ""), "unknown");
});

const docxXml = `<?xml version="1.0"?><w:document xmlns:w="w"><w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Rasa Panchaka</w:t></w:r></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>Rasa &amp; Guna</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Q1. Which is </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>Madhura</w:t></w:r><w:r><w:rPr><w:b w:val="0"/></w:rPr><w:t> rasa?</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Dravya</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Rasa</w:t></w:r></w:p></w:tc></w:tr>
<w:tr><w:tc><w:p><w:r><w:t>Amalaki</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Amla</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>Line</w:t><w:br/><w:t>two</w:t><w:tab/><w:t>tabbed</w:t></w:r></w:p>
</w:body></w:document>`;

test("DOCX: headings, lists, bold runs, tables, breaks", () => {
  const bytes = buildZip([{ name: "word/document.xml", data: docxXml }]);
  const out = extract(bytes, { fileName: "Dravyaguna Unit 3.docx", mimeType: "application/octet-stream" });
  assert.equal(out.kind, "docx");
  assert.match(out.text, /^# Rasa Panchaka/m);
  assert.match(out.text, /^• Rasa & Guna/m);
  assert.match(out.text, /Q1\. Which is \*\*Madhura\*\* rasa\?/);
  assert.match(out.text, /\| Dravya \| Rasa \|/);
  assert.match(out.text, /\| Amalaki \| Amla \|/);
  assert.match(out.text, /Line\ntwo\ttabbed/);
});

test("PPTX: slides in numeric order (slide10 after slide9) with notes", () => {
  const slide = (t) => `<p:sld><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:sld>`;
  const entries = [];
  for (const n of [10, 1, 9, 2]) entries.push({ name: `ppt/slides/slide${n}.xml`, data: slide(`Title ${n}`) });
  entries.push({ name: "ppt/slides/_rels/slide2.xml.rels", data: `<Relationships><Relationship Id="r1" Target="../notesSlides/notesSlide7.xml"/></Relationships>` });
  entries.push({ name: "ppt/notesSlides/notesSlide7.xml", data: slide("Explain Vipaka here") });
  entries.push({ name: "ppt/presentation.xml", data: "<p/>" });
  const out = extract(buildZip(entries), { fileName: "Lecture.pptx" });
  const order = [...out.text.matchAll(/Slide (\d+):/g)].map((m) => Number(m[1]));
  assert.deepEqual(order, [1, 2, 9, 10]);
  assert.match(out.text, /Slide 2: Title 2\nNotes: Explain Vipaka here/);
});

test("XLSX: shared strings, inline strings, sheet names and row numbers", () => {
  const entries = [
    { name: "xl/workbook.xml", data: `<workbook><sheets><sheet name="Unit 3" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/sharedStrings.xml", data: `<sst><si><t>Question</t></si><si><t>Answer</t></si><si><r><t>Guduchi is </t></r><r><t>Tikta</t></r></si></sst>` },
    {
      name: "xl/worksheets/sheet1.xml",
      data: `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="14"><c r="A14" t="s"><v>2</v></c><c r="C14" t="inlineStr"><is><t>B</t></is></c></row></sheetData></worksheet>`,
    },
  ];
  const out = extract(buildZip(entries), { fileName: "bank.xlsx" });
  assert.match(out.text, /Sheet 'Unit 3'/);
  assert.match(out.text, /Row 1: Question \| Answer/);
  assert.match(out.text, /Row 14: Guduchi is Tikta \|  \| B/);
});

test("text, BOM and RTF", () => {
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69])), "hi");
  assert.equal(rtfToText("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0 Vata \\b Pitta\\b0\\par Kapha}"), "Vata Pitta\nKapha");
});

test("legacy Office and empty files fail with a clear message; parts carry a header", () => {
  assert.throws(
    () => extract(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]), { fileName: "Unit 5.doc" }),
    (e) => e instanceof DocTextError && e.code === "LEGACY" && /Save As/.test(e.message)
  );
  assert.throws(() => toParts(new Uint8Array(0), { fileName: "empty.txt" }), (e) => e.code === "EMPTY");
  const out = toParts(new TextEncoder().encode("Rasa Panchaka topics"), { fileName: "topics.txt", index: 2, total: 4 });
  assert.equal(out.parts[0].text, '=== Source 2 of 4: "topics.txt" ===');
  assert.equal(out.parts[1].text, "Rasa Panchaka topics");
  const pdf = toParts(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), { fileName: "syllabus.pdf" });
  assert.equal(pdf.parts[1].inline_data.mime_type, "application/pdf");
});

test("a Word file is recognised whatever MIME type arrives", () => {
  const bytes = buildZip([{ name: "word/document.xml", data: docxXml }]);
  assert.equal(extract(bytes, { fileName: "blob", mimeType: DOCX_MIME }).kind, "docx");
  assert.equal(extract(bytes, { fileName: "blob", mimeType: "application/octet-stream" }).kind, "docx");
});
