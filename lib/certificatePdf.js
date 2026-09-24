import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import "./regeneratorShim";
import fontkit from "@pdf-lib/fontkit";
import { hexToRgb, normaliseDesign } from "./certificateDesign";
import { CERTIFICATES } from "./settings";
import { certificateDetails, isWinAnsi, scriptOf, verifyUrl, winAnsiOnly } from "./credentials";

/**
 * Draws a certificate PDF (A4 landscape) from a frozen snapshot and the
 * image bytes for its logo and signature. Server-side only — imported by
 * pages/api/certificates. The layout mirrors CertificatePreview so what a
 * professor approved on screen is what the student downloads: the same
 * frame, pattern, ornament, name treatment and seal.
 *
 * The standard PDF fonts only cover Latin (WinAnsi). A name — or an
 * institution — in Devanagari, Urdu, Tamil or Tibetan is drawn with the
 * matching Noto font from public/fonts (passed in as `fonts`). If a script
 * has no font, the text falls back to a Latin spelling or to its printable
 * characters, and `nameFallback` is reported: the PDF is never refused.
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

/**
 * A faint background pattern in the primary colour. Drawn before the frame,
 * so a header band or side panel simply covers it; anything past the page
 * edge is outside the media box and never shows.
 */
function drawPattern(page, d, W, H, colour) {
  const c = rgb(colour.r, colour.g, colour.b);
  if (d.pattern === "dots") {
    for (let x = 20; x < W; x += 24) for (let y = 20; y < H; y += 24) page.drawCircle({ x, y, size: 1.1, color: c, opacity: 0.16 });
  } else if (d.pattern === "grid") {
    for (let x = 0; x <= W; x += 32) page.drawLine({ start: { x, y: 0 }, end: { x, y: H }, thickness: 0.6, color: c, opacity: 0.1 });
    for (let y = 0; y <= H; y += 32) page.drawLine({ start: { x: 0, y }, end: { x: W, y }, thickness: 0.6, color: c, opacity: 0.1 });
  } else if (d.pattern === "stripes" || d.pattern === "chevron") {
    for (let k = -H; k < W; k += 26) {
      page.drawLine({ start: { x: k, y: 0 }, end: { x: k + H, y: H }, thickness: 0.8, color: c, opacity: 0.08 });
      if (d.pattern === "chevron") page.drawLine({ start: { x: k, y: H }, end: { x: k + H, y: 0 }, thickness: 0.8, color: c, opacity: 0.06 });
    }
  } else if (d.pattern === "rings") {
    for (let r = 30; r < Math.max(W, H); r += 34) page.drawCircle({ x: W, y: 0, size: r, borderColor: c, borderWidth: 0.8, borderOpacity: 0.1, opacity: 0 });
  }
}

export async function renderCertificatePdf({ snapshot, logo, signature, siteUrl = "", fonts = {} }) {
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

  // Script fonts, embedded only when a text needs one.
  const scriptFonts = new Map();
  let fontkitReady = false;
  let nameFallback = false;
  async function scriptFont(script) {
    if (scriptFonts.has(script)) return scriptFonts.get(script);
    let embedded = null;
    if (fonts[script]) {
      try {
        if (!fontkitReady) {
          pdf.registerFontkit(fontkit);
          fontkitReady = true;
        }
        embedded = await pdf.embedFont(fonts[script], { subset: true });
      } catch {
        embedded = null;
      }
    }
    scriptFonts.set(script, embedded);
    return embedded;
  }
  /** The text as it can be drawn, and the font to draw it in. */
  async function pick(text, base, latinFallback = null) {
    const value = String(text ?? "");
    if (isWinAnsi(value)) return { text: value, font: base, fallback: false };
    const embedded = await scriptFont(scriptOf(value));
    if (embedded) return { text: value, font: embedded, fallback: false };
    const latin = latinFallback && isWinAnsi(latinFallback) ? latinFallback : winAnsiOnly(value);
    return { text: latin, font: base, fallback: true };
  }

  const band = d.border === "band";
  const sidebar = d.border === "sidebar";
  const SIDEBAR_W = 170;
  const BAND_H = 145;

  // Paper, pattern and frame
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c(paper) });
  drawPattern(page, d, W, H, primary);
  if (d.border === "double") {
    page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: c(primary), borderWidth: 3 });
    page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: c(primary), borderWidth: 1 });
  } else if (d.border === "single") {
    page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: c(primary), borderWidth: 2.5 });
  } else if (d.border === "ornate") {
    page.drawRectangle({ x: 16, y: 16, width: W - 32, height: H - 32, borderColor: c(accent), borderWidth: 5 });
    page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: c(primary), borderWidth: 1 });
  } else if (d.border === "corners") {
    const L = 76;
    const T = 4;
    const m = 22;
    for (const [x, y, dx, dy] of [
      [m, H - m, 1, -1],
      [W - m, H - m, -1, -1],
      [m, m, 1, 1],
      [W - m, m, -1, 1],
    ]) {
      page.drawRectangle({ x: dx > 0 ? x : x - L, y: dy > 0 ? y : y - T, width: L, height: T, color: c(primary) });
      page.drawRectangle({ x: dx > 0 ? x : x - T, y: dy > 0 ? y : y - L, width: T, height: L, color: c(primary) });
    }
  } else if (band) {
    page.drawRectangle({ x: 0, y: H - BAND_H, width: W, height: BAND_H, color: c(primary) });
    page.drawRectangle({ x: 0, y: H - BAND_H - 6, width: W, height: 6, color: c(accent) });
  } else if (sidebar) {
    page.drawRectangle({ x: 0, y: 0, width: SIDEBAR_W, height: H, color: c(primary) });
  }

  const logoImg = await embedImage(pdf, logo?.bytes, logo?.mimeType);
  const signatureImg = await embedImage(pdf, signature?.bytes, signature?.mimeType);

  // Content column: everything to the right of a sidebar, centred otherwise.
  const contentX0 = sidebar ? SIDEBAR_W : 0;
  const contentW = W - contentX0;
  const left = d.layout === "left" || sidebar;
  const marginX = 60;
  const centreX = contentX0 + contentW / 2;
  const textX = (font, size, text) => (left ? contentX0 + marginX : centreX - font.widthOfTextAtSize(text, size) / 2);

  // Watermark — the logo behind the text, at the strength and size the design asks for.
  if (logoImg && d.watermark?.enabled !== false) {
    const share = d.watermark?.size || 0.5;
    const wm = fit(logoImg, contentW * share, H * share);
    page.drawImage(logoImg, { x: contentX0 + (contentW - wm.width) / 2, y: (H - wm.height) / 2, width: wm.width, height: wm.height, opacity: d.watermark?.opacity ?? 0.08 });
  }

  // Sidebar: logo on a light tile and the certificate number, in the panel.
  if (sidebar) {
    if (logoImg) {
      const tile = 120;
      page.drawRectangle({ x: (SIDEBAR_W - tile) / 2, y: H - 40 - tile, width: tile, height: tile, color: c(paper), opacity: 0.92 });
      const lg = fit(logoImg, tile - 20, tile - 20);
      page.drawImage(logoImg, { x: (SIDEBAR_W - lg.width) / 2, y: H - 40 - tile + (tile - lg.height) / 2, width: lg.width, height: lg.height });
    }
    const no = `No. ${snapshot.certificateNo || ""}`;
    page.drawText("Certificate", { x: (SIDEBAR_W - sans.widthOfTextAtSize("Certificate", 9)) / 2, y: 58, size: 9, font: sans, color: c(paper), opacity: 0.85 });
    page.drawText(no, { x: (SIDEBAR_W - sans.widthOfTextAtSize(no, 9)) / 2, y: 46, size: 9, font: sans, color: c(paper), opacity: 0.85 });
  }

  // Header: logo + institution
  let y = H - 70;
  const headerColour = band ? paper : primary;
  const headerY = band ? H - 62 : y;
  const inst = await pick(snapshot.institutionName || "", sansBold);
  const prog = snapshot.programName ? await pick(snapshot.programName, sans) : null;
  if (logoImg && !sidebar) {
    const lg = fit(logoImg, 90, 60);
    const instWidth = inst.font.widthOfTextAtSize(inst.text, 20);
    const blockWidth = lg.width + 14 + instWidth;
    const startX = left ? contentX0 + marginX : centreX - blockWidth / 2;
    page.drawImage(logoImg, { x: startX, y: headerY - lg.height + 14, width: lg.width, height: lg.height });
    const hx = startX + lg.width + 14;
    page.drawText(inst.text, { x: hx, y: headerY - 6, size: 20, font: inst.font, color: c(headerColour) });
    if (prog) page.drawText(prog.text, { x: hx, y: headerY - 24, size: 11, font: prog.font, color: c(band ? paper : ink), opacity: 0.8 });
    y = headerY - lg.height - 10;
  } else {
    page.drawText(inst.text, { x: textX(inst.font, 20, inst.text), y: headerY - 6, size: 20, font: inst.font, color: c(headerColour) });
    if (prog) page.drawText(prog.text, { x: textX(prog.font, 11, prog.text), y: headerY - 24, size: 11, font: prog.font, color: c(band ? paper : ink), opacity: 0.8 });
    y = headerY - 36;
  }
  if (band) y = H - BAND_H - 30;

  if (d.ornament === "line") {
    const lw = 170;
    page.drawRectangle({ x: left ? contentX0 + marginX : centreX - lw / 2, y: y - 6, width: lw, height: 2.5, color: c(accent) });
    y -= 16;
  } else if (d.ornament === "lotus") {
    // The standard PDF fonts have no lotus glyph; a small accent diamond
    // stands in for the ornament the preview shows.
    page.drawRectangle({ x: left ? contentX0 + marginX + 6 : centreX, y: y - 12, width: 9, height: 9, color: c(accent), rotate: degrees(45) });
    y -= 22;
  } else if (d.ornament === "diamonds") {
    const start = left ? contentX0 + marginX + 6 : centreX - 22;
    for (let i = 0; i < 3; i += 1) page.drawRectangle({ x: start + i * 22, y: y - 12, width: 7, height: 7, color: c(accent), rotate: degrees(45) });
    y -= 22;
  } else {
    y -= 8;
  }

  // Title
  const title = await pick(snapshot.title || CERTIFICATES.DEFAULT_TITLE, titleFont);
  y -= 30;
  let titleSize = 34;
  while (title.font.widthOfTextAtSize(title.text, titleSize) > contentW - 2 * marginX && titleSize > 20) titleSize -= 2;
  page.drawText(title.text, { x: textX(title.font, titleSize, title.text), y, size: titleSize, font: title.font, color: c(primary) });

  // Presented to
  y -= 30;
  const intro = "This is proudly presented to";
  page.drawText(intro, { x: textX(serif, 13, intro), y, size: 13, font: serif, color: c(ink), opacity: 0.85 });

  // Student name — the largest element
  y -= 52;
  const namePick = await pick(snapshot.studentName || "Student", d.titleFont === "serif" ? serifBold : sansBold, snapshot.studentNameLatin);
  if (namePick.fallback) nameFallback = true;
  const nameFont = namePick.font;
  let nameSize = 44;
  const name = namePick.text || "Student";
  // A long name shrinks to fit rather than running off the page.
  while (nameFont.widthOfTextAtSize(name, nameSize) > contentW - 2 * marginX - 40 && nameSize > 18) nameSize -= 2;
  // Still too wide at the smallest size: two lines, never clipped.
  const nameMax = contentW - 2 * marginX - 40;
  const nameLines = nameFont.widthOfTextAtSize(name, nameSize) > nameMax ? wrap(name, nameFont, nameSize, nameMax).slice(0, 2) : [name];
  if (nameLines.length > 1) y += nameSize * 0.6;
  nameLines.forEach((line, i) => {
    const lineW = nameFont.widthOfTextAtSize(line, nameSize);
    const lineX = textX(nameFont, nameSize, line);
    const ly = y - i * (nameSize + 6);
    page.drawText(line, { x: lineX, y: ly, size: nameSize, font: nameFont, color: c(ink) });
    if (d.nameStyle === "underline" && i === nameLines.length - 1) page.drawRectangle({ x: lineX, y: ly - 8, width: lineW, height: 2, color: c(accent) });
    if (d.nameStyle === "boxed" && nameLines.length === 1) page.drawRectangle({ x: lineX - 18, y: ly - 14, width: lineW + 36, height: nameSize + 22, borderColor: c(accent), borderWidth: 2 });
  });
  y -= (nameLines.length - 1) * (nameSize + 6);

  // The details: who (course, roll no., institution), what, when, the score
  // and grade. Old snapshots without these fields give the line they always
  // had. The block shrinks until it fits in three lines.
  y -= d.nameStyle === "boxed" ? 42 : 34;
  const details = await pick(certificateDetails(snapshot, d.tagline), sans);
  const bodyMax = contentW - 2 * marginX - 60;
  let bodySize = 14;
  let lines = wrap(details.text, details.font, bodySize, bodyMax);
  while (lines.length > 3 && bodySize > 10) {
    bodySize -= 1;
    lines = wrap(details.text, details.font, bodySize, bodyMax);
  }
  for (const line of lines) {
    page.drawText(line, { x: textX(details.font, bodySize, line), y, size: bodySize, font: details.font, color: c(ink) });
    y -= bodySize + 6;
  }

  // Footer: seal + certificate number + verification (left), signature block (right)
  const footY = 62;
  let footX = contentX0 + marginX;
  if (d.seal) {
    const r = 34;
    page.drawCircle({ x: footX + r, y: footY + r - 4, size: r + 4, borderColor: c(accent), borderWidth: 2, opacity: 0, borderOpacity: 1 });
    page.drawCircle({ x: footX + r, y: footY + r - 4, size: r, color: c(accent) });
    const score = snapshot.scorePercent != null ? `${snapshot.scorePercent}%` : "✓";
    const scoreText = snapshot.scorePercent != null ? score : "OK";
    page.drawText(scoreText, { x: footX + r - sansBold.widthOfTextAtSize(scoreText, 16) / 2, y: footY + r - 4, size: 16, font: sansBold, color: c(paper) });
    page.drawText("VERIFIED", { x: footX + r - sans.widthOfTextAtSize("VERIFIED", 6.5) / 2, y: footY + r - 18, size: 6.5, font: sans, color: c(paper) });
    footX += 2 * r + 18;
  }
  // The verify line is a full address a reader can type from paper, and the
  // code stands on its own line too.
  const verifyLine = `Verify at ${verifyUrl(siteUrl, snapshot.verifyCode)}`;
  if (!sidebar) page.drawText(winAnsiOnly(`Certificate No. ${snapshot.certificateNo || ""}`), { x: footX, y: footY + 26, size: 9, font: sans, color: c(ink), opacity: 0.7 });
  page.drawText(`Verification code: ${winAnsiOnly(snapshot.verifyCode || "")}`, { x: footX, y: footY + 13, size: 9, font: sansBold, color: c(ink), opacity: 0.85 });
  page.drawText(winAnsiOnly(verifyLine), { x: footX, y: footY, size: 8, font: sans, color: c(ink), opacity: 0.7 });

  const sigCentre = W - marginX - 110;
  if (signatureImg) {
    const sg = fit(signatureImg, 180, 54);
    page.drawImage(signatureImg, { x: sigCentre - sg.width / 2, y: footY + 34, width: sg.width, height: sg.height });
  }
  page.drawRectangle({ x: sigCentre - 100, y: footY + 28, width: 200, height: 1, color: c(ink) });
  const pn = await pick(snapshot.professorName || "", sansBold);
  const pt = await pick(snapshot.professorTitle || "", sans);
  page.drawText(pn.text, { x: sigCentre - pn.font.widthOfTextAtSize(pn.text, 12) / 2, y: footY + 14, size: 12, font: pn.font, color: c(ink) });
  page.drawText(pt.text, { x: sigCentre - pt.font.widthOfTextAtSize(pt.text, 10) / 2, y: footY, size: 10, font: pt.font, color: c(ink), opacity: 0.8 });

  const bytes = await pdf.save();
  return { bytes, nameFallback };
}
