import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { hexToRgb, normaliseDesign } from "./certificateDesign";
import { CERTIFICATES } from "./settings";

/**
 * Draws a certificate PDF (A4 landscape) from a frozen snapshot and the
 * image bytes for its logo and signature. Server-side only — imported by
 * pages/api/certificates. The layout mirrors CertificatePreview so what a
 * professor approved on screen is what the student downloads.
 */

async function embedImage(pdf, bytes, mimeType) {
  if (!bytes) return null;
  try {
    if (mimeType === "image/png") return await pdf.embedPng(bytes);
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") return await pdf.embedJpg(bytes);
    // Unknown type: try PNG then JPEG.
    try {
      return await pdf.embedPng(bytes);
    } catch {
      return await pdf.embedJpg(bytes);
    }
  } catch {
    return null;
  }
}

function fit(image, maxW, maxH) {
  const scale = Math.min(maxW / image.width, maxH / image.height, 1e9);
  return { width: image.width * scale, height: image.height * scale };
}

function wrap(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderCertificatePdf({ snapshot, logo, signature }) {
  const d = normaliseDesign(snapshot?.design);
  const { width: W, height: H } = CERTIFICATES.PAGE;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${snapshot.title || CERTIFICATES.DEFAULT_TITLE} — ${snapshot.studentName}`);
  pdf.setProducer("Skill Setu");
  const page = pdf.addPage([W, H]);

  const primary = hexToRgb(d.palette.primary);
  const accent = hexToRgb(d.palette.accent);
  const ink = hexToRgb(d.palette.ink);
  const paper = hexToRgb(d.palette.paper);
  const c = (o) => rgb(o.r, o.g, o.b);

  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = d.titleFont === "serif" ? serifBold : sansBold;

  // Paper and border
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c(paper) });
  if (d.border === "double") {
    page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: c(primary), borderWidth: 3 });
    page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: c(primary), borderWidth: 1 });
  } else if (d.border === "single") {
    page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: c(primary), borderWidth: 2.5 });
  } else if (d.border === "ornate") {
    page.drawRectangle({ x: 16, y: 16, width: W - 32, height: H - 32, borderColor: c(accent), borderWidth: 5 });
    page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: c(primary), borderWidth: 1 });
  }

  const logoImg = await embedImage(pdf, logo?.bytes, logo?.mimeType);
  const signatureImg = await embedImage(pdf, signature?.bytes, signature?.mimeType);

  // Watermark
  if (logoImg) {
    const wm = fit(logoImg, W * 0.5, H * 0.5);
    page.drawImage(logoImg, { x: (W - wm.width) / 2, y: (H - wm.height) / 2, width: wm.width, height: wm.height, opacity: 0.06 });
  }

  const left = d.layout === "left";
  const marginX = 60;
  const centreX = W / 2;
  const textX = (font, size, text) => (left ? marginX : centreX - font.widthOfTextAtSize(text, size) / 2);

  // Header: logo + institution
  let y = H - 70;
  let headerX = left ? marginX : centreX;
  if (logoImg) {
    const lg = fit(logoImg, 90, 60);
    const instWidth = sansBold.widthOfTextAtSize(snapshot.institutionName || "", 20);
    const blockWidth = lg.width + 14 + instWidth;
    const startX = left ? marginX : centreX - blockWidth / 2;
    page.drawImage(logoImg, { x: startX, y: y - lg.height + 14, width: lg.width, height: lg.height });
    headerX = startX + lg.width + 14;
    page.drawText(snapshot.institutionName || "", { x: headerX, y: y - 6, size: 20, font: sansBold, color: c(primary) });
    if (snapshot.programName) page.drawText(snapshot.programName, { x: headerX, y: y - 24, size: 11, font: sans, color: c(ink), opacity: 0.8 });
    y -= lg.height + 10;
  } else {
    const inst = snapshot.institutionName || "";
    page.drawText(inst, { x: textX(sansBold, 20, inst), y: y - 6, size: 20, font: sansBold, color: c(primary) });
    if (snapshot.programName) page.drawText(snapshot.programName, { x: textX(sans, 11, snapshot.programName), y: y - 24, size: 11, font: sans, color: c(ink), opacity: 0.8 });
    y -= 36;
  }

  if (d.ornament === "line") {
    const lw = 170;
    page.drawRectangle({ x: left ? marginX : centreX - lw / 2, y: y - 6, width: lw, height: 2.5, color: c(accent) });
    y -= 16;
  } else if (d.ornament === "lotus") {
    // The standard PDF fonts have no lotus glyph; a small accent diamond
    // stands in for the ornament the preview shows.
    page.drawRectangle({ x: left ? marginX + 6 : centreX, y: y - 12, width: 9, height: 9, color: c(accent), rotate: degrees(45) });
    y -= 22;
  } else {
    y -= 8;
  }

  // Title
  const title = snapshot.title || CERTIFICATES.DEFAULT_TITLE;
  y -= 30;
  page.drawText(title, { x: textX(titleFont, 34, title), y, size: 34, font: titleFont, color: c(primary) });

  // Presented to
  y -= 30;
  const intro = "This is proudly presented to";
  page.drawText(intro, { x: textX(serif, 13, intro), y, size: 13, font: serif, color: c(ink), opacity: 0.85 });

  // Student name — the largest element
  y -= 52;
  const nameFont = d.titleFont === "serif" ? serifBold : sansBold;
  let nameSize = 44;
  const name = snapshot.studentName || "Student";
  while (nameFont.widthOfTextAtSize(name, nameSize) > W - 2 * marginX && nameSize > 20) nameSize -= 2;
  const nameX = textX(nameFont, nameSize, name);
  page.drawText(name, { x: nameX, y, size: nameSize, font: nameFont, color: c(ink) });
  page.drawRectangle({ x: nameX, y: y - 8, width: nameFont.widthOfTextAtSize(name, nameSize), height: 2, color: c(accent) });

  // Body line
  y -= 34;
  const date = snapshot.completedAt ? new Date(snapshot.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  const body = `${d.tagline} ${snapshot.testTitle || ""}${snapshot.scorePercent != null ? ` with a score of ${snapshot.scorePercent}%` : ""}${date ? ` on ${date}` : ""}.`;
  const lines = wrap(body, sans, 14, W - 2 * marginX - 80);
  for (const line of lines) {
    page.drawText(line, { x: textX(sans, 14, line), y, size: 14, font: sans, color: c(ink) });
    y -= 20;
  }

  // Footer: certificate number + verification (left), signature block (right)
  const footY = 62;
  page.drawText(`Certificate No. ${snapshot.certificateNo || ""}`, { x: marginX, y: footY + 14, size: 9, font: sans, color: c(ink), opacity: 0.7 });
  page.drawText(`Verify at /verify/${snapshot.verifyCode || ""}`, { x: marginX, y: footY, size: 9, font: sans, color: c(ink), opacity: 0.7 });

  const sigCentre = W - marginX - 110;
  if (signatureImg) {
    const sg = fit(signatureImg, 180, 54);
    page.drawImage(signatureImg, { x: sigCentre - sg.width / 2, y: footY + 34, width: sg.width, height: sg.height });
  }
  page.drawRectangle({ x: sigCentre - 100, y: footY + 28, width: 200, height: 1, color: c(ink) });
  const pn = snapshot.professorName || "";
  const pt = snapshot.professorTitle || "";
  page.drawText(pn, { x: sigCentre - sansBold.widthOfTextAtSize(pn, 12) / 2, y: footY + 14, size: 12, font: sansBold, color: c(ink) });
  page.drawText(pt, { x: sigCentre - sans.widthOfTextAtSize(pt, 10) / 2, y: footY, size: 10, font: sans, color: c(ink), opacity: 0.8 });

  return await pdf.save();
}
