/**
 * Real, openable PDFs for the sample documents.
 *
 * Every seeded circular used to carry `{ name: "…​.pdf", url: "#" }`. The
 * download control pointed straight at that, so the browser happily saved a
 * file called `National_Campus_Hiring_Schedule_2026.pdf` whose contents were
 * the HTML of the page you were standing on — which is exactly why downloads
 * "worked" and then failed to open. A sample that advertises a document has to
 * hold one.
 *
 * This builds a genuine single-page PDF rather than shipping a base64 blob per
 * file: the same few kilobytes of code cover every sample document, and the
 * text on the page can say what the document is.
 *
 * lib/sampleResume.js does the same thing for the sample résumé; that one is a
 * pre-baked blob because it is a designed, multi-section page rather than a
 * generated placeholder.
 */

/** Characters with meaning inside a PDF string literal. */
function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    // The content stream is written as Latin-1, so anything outside it (an
    // en dash in a title, say) is transliterated rather than mangled.
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function toBase64(input) {
  if (typeof btoa === "function") return btoa(input);
  return Buffer.from(input, "binary").toString("base64");
}

/**
 * A one-page A4 PDF with a heading and a few body lines.
 * Returns a `data:application/pdf;base64,…` URL.
 */
export function makeSamplePdf(title, lines = []) {
  const body = [
    "BT",
    "/F1 16 Tf",
    "60 780 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 10 Tf",
    "0 -28 Td",
    ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, "0 -16 Td"]),
    "ET",
  ].join("\n");

  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
    `<</Length ${body.length}>>\nstream\n${body}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];

  // The cross-reference table is byte offsets into the file, so it has to be
  // built as the file is assembled rather than guessed afterwards.
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return `data:application/pdf;base64,${toBase64(pdf)}`;
}

/** An attachment record the notice board and the student dashboard can render. */
export function sampleAttachment(name, title, lines) {
  const dataUrl = makeSamplePdf(title, lines);
  // The size shown is the real one, so it cannot disagree with the file.
  const bytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
  return { name, size: `${Math.max(1, Math.round(bytes / 1024))} KB`, dataUrl };
}
