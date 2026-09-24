/**
 * Builds the small sample documents the demo tour and its community use:
 * a Word file of Dravyaguna notes, a PowerPoint lecture, an Excel answer key,
 * a Word question paper and a PDF syllabus — real, openable files, written
 * without any package beyond the pdf-lib the certificates already use.
 *
 *   node scripts/make-demo-docs.mjs     → public/demo/*
 *
 * The output is committed; this script only needs re-running if the content
 * changes.
 */

import fs from "node:fs";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const OUT = path.join(process.cwd(), "public", "demo");
fs.mkdirSync(OUT, { recursive: true });

/* ---------------- a real ZIP writer (CRC-32 and all) ---------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const body = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, body);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cdBuf, end]);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/* ---------------- Word ---------------- */

function docx(blocks) {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const run = (text, bold) => `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  const para = (b) => {
    if (b.table) {
      const rows = b.table.map((r) => `<w:tr>${r.map((c) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr><w:p>${run(c)}</w:p></w:tc>`).join("")}</w:tr>`).join("");
      return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
    }
    const props = b.heading ? `<w:pPr><w:pStyle w:val="Heading${b.heading}"/></w:pPr>` : "";
    const runs = Array.isArray(b.runs) ? b.runs.map(([t, bold]) => run(t, bold)).join("") : run(b.text || "", b.bold);
    return `<w:p>${props}${runs}</w:p>`;
  };
  const styles = `${XML}<w:styles ${W}><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${[1, 2]
    .map((n) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${n === 1 ? 32 : 26}"/></w:rPr></w:style>`)
    .join("")}<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style></w:styles>`;
  return zip([
    ["[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
    ["_rels/.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/_rels/document.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["word/styles.xml", styles],
    ["word/document.xml", `${XML}<w:document ${W}><w:body>${blocks.map(para).join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`],
  ]);
}

/* ---------------- Excel ---------------- */

function xlsx(sheetName, rows) {
  const col = (i) => String.fromCharCode(65 + i);
  const sheetRows = rows
    .map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (typeof v === "number" ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`)).join("")}</row>`)
    .join("");
  return zip([
    ["[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
    ["_rels/.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml", `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`],
  ]);
}

/* ---------------- PowerPoint ---------------- */

const NS_A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const NS_R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const NS_P = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const GRP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

const THEME = `${XML}<a:theme ${NS_A} name="Skill Setu"><a:themeElements><a:clrScheme name="Skill Setu"><a:dk1><a:srgbClr val="1F2A24"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="2F4F3A"/></a:dk2><a:lt2><a:srgbClr val="F4F1E8"/></a:lt2><a:accent1><a:srgbClr val="6B7F3A"/></a:accent1><a:accent2><a:srgbClr val="A8743A"/></a:accent2><a:accent3><a:srgbClr val="3C7C6B"/></a:accent3><a:accent4><a:srgbClr val="8C5A3C"/></a:accent4><a:accent5><a:srgbClr val="5A6E8C"/></a:accent5><a:accent6><a:srgbClr val="9C8A3C"/></a:accent6><a:hlink><a:srgbClr val="3C7C6B"/></a:hlink><a:folHlink><a:srgbClr val="6B7F3A"/></a:folHlink></a:clrScheme><a:fontScheme name="Skill Setu"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Skill Setu"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

function textBox(id, name, x, y, w, h, paragraphs, size) {
  const paras = paragraphs.map((t) => `<a:p><a:r><a:rPr lang="en-IN" sz="${size}" dirty="0"/><a:t>${esc(t)}</a:t></a:r></a:p>`).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`;
}

function pptx(slides) {
  const files = [];
  const ct = [
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    ...slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`),
  ];
  files.push(["[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join("")}</Types>`]);
  files.push(["_rels/.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`]);
  const slideRels = slides.map((_, i) => `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("");
  files.push([
    "ppt/_rels/presentation.xml.rels",
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>${slideRels}</Relationships>`,
  ]);
  files.push([
    "ppt/presentation.xml",
    `${XML}<p:presentation ${NS_A} ${NS_R} ${NS_P}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join("")}</p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
  ]);
  files.push([
    "ppt/slideMasters/slideMaster1.xml",
    `${XML}<p:sldMaster ${NS_A} ${NS_R} ${NS_P}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FBF8F1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${GRP}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`,
  ]);
  files.push([
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`,
  ]);
  files.push(["ppt/slideLayouts/slideLayout1.xml", `${XML}<p:sldLayout ${NS_A} ${NS_R} ${NS_P} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${GRP}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`]);
  files.push([
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
  ]);
  files.push(["ppt/theme/theme1.xml", THEME]);
  slides.forEach((s, i) => {
    files.push([
      `ppt/slides/slide${i + 1}.xml`,
      `${XML}<p:sld ${NS_A} ${NS_R} ${NS_P}><p:cSld><p:spTree>${GRP}${textBox(2, "Title", 457200, 342900, 8229600, 800100, [s.title], 3200)}${textBox(3, "Body", 457200, 1257300, 8229600, 3543300, s.points, 2000)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
    ]);
    files.push([
      `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
    ]);
  });
  return zip(files);
}

/* ---------------- the content (AYUSH, Dravyaguna Vigyan Unit 3) ---------------- */

const notes = docx([
  { heading: 1, text: "Dravyaguna Vigyan — Unit 3: Rasa Panchaka" },
  { text: "BAMS 2nd Professional · Department of Dravyaguna · All India Institute of Ayurveda, New Delhi" },
  { heading: 2, text: "1. Rasa (taste)" },
  { runs: [["There are ", false], ["six Rasa", true], [": Madhura (sweet), Amla (sour), Lavana (salty), Katu (pungent), Tikta (bitter) and Kashaya (astringent). Each is made of two predominant Mahabhuta.", false]] },
  { text: "Madhura — Prithvi + Jala; Amla — Prithvi + Agni; Lavana — Jala + Agni; Katu — Vayu + Agni; Tikta — Vayu + Akasha; Kashaya — Vayu + Prithvi." },
  { heading: 2, text: "2. Guna (properties)" },
  { text: "The Gurvadi Guna are twenty, arranged in ten opposite pairs, such as Guru–Laghu (heavy–light), Snigdha–Ruksha (unctuous–dry) and Ushna–Shita (hot–cold)." },
  { heading: 2, text: "3. Virya (potency)" },
  { runs: [["Charaka accepts two Virya: ", false], ["Ushna and Shita", true], [". Ushna Virya drugs such as Maricha and Chitraka increase Pitta; Shita Virya drugs such as Chandana pacify it.", false]] },
  { heading: 2, text: "4. Vipaka (post-digestive effect)" },
  { text: "Three Vipaka are described: Madhura (from Madhura and Lavana Rasa), Amla (from Amla Rasa) and Katu (from Katu, Tikta and Kashaya Rasa)." },
  { heading: 2, text: "5. Prabhava (specific action)" },
  { text: "Prabhava explains an action that Rasa, Guna, Virya and Vipaka cannot, as with Danti, whose purgative effect differs from Chitraka despite similar Rasa." },
  { table: [["Dravya", "Rasa", "Virya", "Vipaka"], ["Amalaki", "Pancha Rasa (Lavana varjita)", "Shita", "Madhura"], ["Guduchi", "Tikta, Kashaya", "Ushna", "Madhura"], ["Haritaki", "Pancha Rasa, Kashaya pradhana", "Ushna", "Madhura"]] },
  { text: "Reference: Charaka Samhita, Sutrasthana ch. 26 (Atreyabhadrakapyiya Adhyaya); Ayurvedic Pharmacopoeia of India, Part I." },
]);

const lecture = pptx([
  { title: "Rasa Panchaka — an overview", points: ["Rasa, Guna, Virya, Vipaka, Prabhava", "The five factors by which a Dravya acts", "Dravyaguna Vigyan · BAMS 2nd Professional"] },
  { title: "Shad Rasa and Mahabhuta", points: ["Madhura: Prithvi + Jala", "Tikta: Vayu + Akasha", "Katu: Vayu + Agni", "Rasa is perceived by Rasanendriya (the tongue)"] },
  { title: "Virya: Ushna and Shita", points: ["Ushna Virya: Maricha, Chitraka — increase Pitta", "Shita Virya: Chandana, Ushira — pacify Pitta", "Virya is the potency by which a drug acts"] },
  { title: "Vipaka and Prabhava", points: ["Madhura, Amla and Katu Vipaka", "Katu Vipaka arises from Katu, Tikta and Kashaya Rasa", "Prabhava: Danti versus Chitraka"] },
]);

const paper = docx([
  { heading: 1, text: "Dravyaguna Vigyan — Unit 3 Test (Set A)" },
  { text: "Answer all questions. Each carries one mark. The answer key is issued separately." },
  { text: "Q1. How many Rasa are described in Ayurveda?" },
  { text: "A) Four   B) Five   C) Six   D) Eight" },
  { text: "Q2. Which two Mahabhuta predominate in Tikta Rasa?" },
  { text: "A) Prithvi and Jala   B) Vayu and Akasha   C) Agni and Vayu   D) Jala and Agni" },
  { text: "Q3. According to Charaka, how many Virya are there?" },
  { text: "A) Two   B) Three   C) Eight   D) Twenty" },
  { text: "Q4. Katu Vipaka arises from which Rasa?" },
  { text: "A) Madhura and Lavana   B) Amla only   C) Katu, Tikta and Kashaya   D) Lavana only" },
  { text: "Q5. Which drug is cited to explain Prabhava?" },
  { text: "A) Danti   B) Amalaki   C) Chandana   D) Guduchi" },
]);

const key = xlsx("Unit 3 Key", [
  ["Question", "Answer", "Note"],
  ["Q1", "C", "Six Rasa: Madhura to Kashaya"],
  ["Q2", "B", "Tikta — Vayu + Akasha"],
  ["Q3", "A", "Ushna and Shita (Charaka)"],
  ["Q4", "C", "Katu, Tikta, Kashaya → Katu Vipaka"],
  ["Q5", "A", "Danti versus Chitraka"],
]);

async function syllabusPdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = [
    ["Dravyaguna Vigyan — Paper I, Unit 3", bold, 16],
    ["BAMS 2nd Professional (NCISM syllabus)", font, 11],
    ["", font, 11],
    ["Unit 3: Rasa Panchaka", bold, 13],
    ["3.1 Rasa: definition, the six Rasa, their Mahabhuta composition and actions", font, 11],
    ["3.2 Guna: the twenty Gurvadi Guna in ten opposite pairs", font, 11],
    ["3.3 Virya: Ushna and Shita; the eight-Virya view", font, 11],
    ["3.4 Vipaka: Madhura, Amla and Katu Vipaka", font, 11],
    ["3.5 Prabhava: specific action beyond the other four factors", font, 11],
    ["", font, 11],
    ["Assessment: one unit test (online, proctored) and a viva voce.", font, 11],
    ["Reference texts: Charaka Samhita Sutrasthana 26; Ayurvedic Pharmacopoeia of India.", font, 11],
  ];
  let y = 790;
  for (const [text, f, size] of lines) {
    page.drawText(text, { x: 56, y, size, font: f, color: rgb(0.12, 0.16, 0.14) });
    y -= size + 10;
  }
  return Buffer.from(await pdf.save());
}

/* A sample student resume (fictional), for the Resume Coach demo. */
const RESUME_LINES = [
  ["Aarav Sharma", 18, true],
  ["BAMS 3rd Professional · All India Institute of Ayurveda (AIIA), New Delhi · 2022–2027", 10],
  ["demo.student@example.test", 10],
  ["SUMMARY", 12, true],
  ["BAMS student interested in Kayachikitsa, Panchakarma and AYUSH pharmacovigilance.", 10],
  ["SKILLS", 12, true],
  ["Nadi Pariksha, Prakriti assessment, Panchakarma procedures (Snehana, Swedana),", 10],
  ["Pharmacovigilance signal detection, ADR reporting, ICH-GCP basics, MS Excel.", 10],
  ["PROJECTS", 12, true],
  ["Adverse drug reaction reporting audit — AIIA Pharmacovigilance Cell, 2025.", 10],
  ["Prakriti-based diet counselling survey of 60 OPD patients, 2024.", 10],
  ["EXPERIENCE", 12, true],
  ["Clinical observer, Panchakarma unit, AIIA hospital — 6 weeks, 2025.", 10],
  ["CERTIFICATIONS", 12, true],
  ["Yoga Certification Board — Level 1 Yoga Protocol Instructor, 2024.", 10],
  ["EDUCATION", 12, true],
  ["BAMS (pursuing), AIIA New Delhi — expected 2027.", 10],
];

async function resumePdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;
  for (const [text, size, isBold] of RESUME_LINES) {
    if (isBold && size === 12) y -= 6;
    page.drawText(text, { x: 56, y, size, font: isBold ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 8;
  }
  return Buffer.from(await pdf.save());
}

const resumeDocx = docx(RESUME_LINES.map(([text, size, isBold]) => (isBold && size === 12 ? { heading: 2, text } : isBold ? { heading: 1, text } : { text })));

fs.writeFileSync(path.join(OUT, "Aarav-Sharma-Resume.pdf"), await resumePdf());
fs.writeFileSync(path.join(OUT, "Aarav-Sharma-Resume.docx"), resumeDocx);
fs.writeFileSync(path.join(OUT, "Dravyaguna-Unit3-Notes.docx"), notes);
fs.writeFileSync(path.join(OUT, "Rasa-Panchaka-Lecture.pptx"), lecture);
fs.writeFileSync(path.join(OUT, "Unit3-Test-SetA.docx"), paper);
fs.writeFileSync(path.join(OUT, "Unit3-Answer-Key.xlsx"), key);
fs.writeFileSync(path.join(OUT, "Dravyaguna-Unit3-Syllabus.pdf"), await syllabusPdf());
console.log("Wrote", fs.readdirSync(OUT).join(", "));
