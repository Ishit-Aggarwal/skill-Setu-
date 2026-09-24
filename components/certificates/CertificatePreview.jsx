"use client";

import { normaliseDesign, SAMPLE_CERTIFICATE } from "../../lib/certificateDesign";
import { CERTIFICATES } from "../../lib/settings";
import { certificateDetails } from "../../lib/credentials";

/**
 * The certificate as it will print, drawn from the same spec the PDF uses:
 * the frame (a border, corner brackets, a header band or a side panel), a
 * faint background pattern, institution and logo at the top, the logo again
 * as a watermark, the title, the student's name as the largest element, the
 * course, the score, the date, a seal, and the signature block at the bottom
 * with the verification code in small type.
 *
 * `branding` may carry `logoUrl`/`signatureUrl` (resolved storage URLs) or
 * `logoPreview`/`signaturePreview` (data URLs while a file is being chosen).
 */

function patternStyle(pattern, colour) {
  switch (pattern) {
    case "dots":
      return { backgroundImage: `radial-gradient(${colour} 0.35cqw, transparent 0.4cqw)`, backgroundSize: "3cqw 3cqw", opacity: 0.18 };
    case "stripes":
      return { backgroundImage: `repeating-linear-gradient(45deg, ${colour} 0 0.25cqw, transparent 0.25cqw 3cqw)`, opacity: 0.1 };
    case "grid":
      return { backgroundImage: `linear-gradient(${colour} 0.15cqw, transparent 0.15cqw), linear-gradient(90deg, ${colour} 0.15cqw, transparent 0.15cqw)`, backgroundSize: "4cqw 4cqw", opacity: 0.12 };
    case "rings":
      return { backgroundImage: `repeating-radial-gradient(circle at 100% 100%, ${colour} 0 0.2cqw, transparent 0.2cqw 4cqw)`, opacity: 0.12 };
    case "chevron":
      return { backgroundImage: `repeating-linear-gradient(135deg, ${colour} 0 0.25cqw, transparent 0.25cqw 3cqw), repeating-linear-gradient(45deg, ${colour} 0 0.25cqw, transparent 0.25cqw 3cqw)`, opacity: 0.08 };
    default:
      return null;
  }
}

function Corners({ colour }) {
  const base = { position: "absolute", width: "9cqw", height: "9cqw", borderColor: colour, borderStyle: "solid", borderWidth: 0 };
  return (
    <>
      <div style={{ ...base, top: "2.5cqw", left: "2.5cqw", borderTopWidth: "0.5cqw", borderLeftWidth: "0.5cqw" }} />
      <div style={{ ...base, top: "2.5cqw", right: "2.5cqw", borderTopWidth: "0.5cqw", borderRightWidth: "0.5cqw" }} />
      <div style={{ ...base, bottom: "2.5cqw", left: "2.5cqw", borderBottomWidth: "0.5cqw", borderLeftWidth: "0.5cqw" }} />
      <div style={{ ...base, bottom: "2.5cqw", right: "2.5cqw", borderBottomWidth: "0.5cqw", borderRightWidth: "0.5cqw" }} />
    </>
  );
}

export default function CertificatePreview({ branding, design, data = SAMPLE_CERTIFICATE, className = "", compact = false }) {
  const d = normaliseDesign(design);
  const logo = branding?.logoPreview || branding?.logoUrl || null;
  const signature = branding?.signaturePreview || branding?.signatureUrl || null;
  const title = branding?.title || CERTIFICATES.DEFAULT_TITLE;
  const serif = d.titleFont === "serif";
  const titleFamily = serif ? "Georgia, 'Times New Roman', serif" : "inherit";
  const left = d.layout === "left";
  const band = d.border === "band";
  const sidebar = d.border === "sidebar";
  const borderStyle =
    d.border === "double"
      ? `8px double ${d.palette.primary}`
      : d.border === "single"
      ? `3px solid ${d.palette.primary}`
      : d.border === "ornate"
      ? `6px ridge ${d.palette.accent}`
      : "none";
  const pattern = patternStyle(d.pattern, d.palette.primary);
  const institution = branding?.institutionName || "Institution name";

  const header = (
    <div className={`flex items-center gap-[2cqw] ${left || sidebar ? "" : "justify-center"}`} style={band ? { color: d.palette.paper } : undefined}>
      {logo && !sidebar && <img src={logo} alt="" style={{ height: "10cqw", maxWidth: "22cqw", objectFit: "contain" }} />}
      <div>
        <div style={{ fontSize: "2.6cqw", fontWeight: 700, color: band ? d.palette.paper : d.palette.primary, letterSpacing: "0.02em" }}>{institution}</div>
        {branding?.programName && <div style={{ fontSize: "1.6cqw", opacity: 0.8 }}>{branding.programName}</div>}
      </div>
    </div>
  );

  const nameStyle =
    d.nameStyle === "boxed"
      ? { border: `0.25cqw solid ${d.palette.accent}`, padding: "0.6cqw 2.4cqw", borderRadius: "0.6cqw" }
      : d.nameStyle === "underline"
      ? { borderBottom: `0.3cqw solid ${d.palette.accent}`, paddingBottom: "0.6cqw" }
      : { paddingBottom: "0.4cqw" };

  return (
    <div
      className={`relative w-full overflow-hidden shadow-md ${className}`}
      style={{ aspectRatio: "297 / 210", background: d.palette.paper, color: d.palette.ink, border: borderStyle, containerType: "inline-size" }}
      role="img"
      aria-label={`Certificate preview: ${title} for ${data?.studentName}`}
    >
      {pattern && <div className="absolute inset-0 pointer-events-none" style={pattern} />}
      {d.border === "ornate" && <div className="absolute inset-2 pointer-events-none" style={{ border: `1px solid ${d.palette.primary}` }} />}
      {d.border === "corners" && <Corners colour={d.palette.primary} />}
      {band && <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: "17cqw", background: d.palette.primary }} />}
      {band && <div className="absolute left-0 right-0 pointer-events-none" style={{ top: "17cqw", height: "0.7cqw", background: d.palette.accent }} />}
      {sidebar && (
        <div className="absolute top-0 bottom-0 left-0 flex flex-col items-center justify-between pointer-events-none" style={{ width: "20cqw", background: d.palette.primary, padding: "4cqw 1.5cqw" }}>
          {logo ? <img src={logo} alt="" style={{ width: "14cqw", maxHeight: "14cqw", objectFit: "contain", background: "rgba(255,255,255,.9)", borderRadius: "1cqw", padding: "0.8cqw" }} /> : <span />}
          <div style={{ color: d.palette.paper, fontSize: "1.3cqw", opacity: 0.85, textAlign: "center", lineHeight: 1.4 }}>
            Certificate No.
            <br />
            {data?.certificateNo || "—"}
          </div>
        </div>
      )}
      {logo && d.watermark.enabled && (
        <img
          src={logo}
          alt=""
          className="absolute inset-0 m-auto object-contain pointer-events-none select-none"
          style={{ opacity: d.watermark.opacity, width: `${Math.round(d.watermark.size * 100)}%`, height: `${Math.round(d.watermark.size * 100)}%`, left: sidebar ? "20cqw" : 0 }}
        />
      )}

      <div
        className={`relative h-full flex flex-col ${left || sidebar ? "items-start text-left" : "items-center text-center"}`}
        style={{ padding: compact ? "4% 6%" : "5% 7%", paddingLeft: sidebar ? "25cqw" : undefined, paddingTop: band ? "3.5cqw" : undefined }}
      >
        {header}

        {d.ornament === "line" && <div style={{ width: left || sidebar ? "18cqw" : "24cqw", height: "0.35cqw", background: d.palette.accent, marginTop: band ? "5cqw" : "2cqw" }} />}
        {d.ornament === "lotus" && (
          <div style={{ color: d.palette.accent, fontSize: "3cqw", lineHeight: 1, marginTop: band ? "5cqw" : "1.5cqw" }} aria-hidden>
            ❁
          </div>
        )}
        {d.ornament === "diamonds" && (
          <div style={{ color: d.palette.accent, fontSize: "1.6cqw", lineHeight: 1, letterSpacing: "0.8cqw", marginTop: band ? "5cqw" : "1.8cqw" }} aria-hidden>
            ◆◆◆
          </div>
        )}
        {d.ornament === "none" && band && <div style={{ height: "4cqw" }} />}

        <div style={{ marginTop: "2.2cqw", fontSize: "4.2cqw", fontWeight: 700, color: d.palette.primary, fontFamily: titleFamily, letterSpacing: "0.04em" }}>{title}</div>
        <div style={{ marginTop: "1.4cqw", fontSize: "1.7cqw", opacity: 0.8, fontStyle: "italic" }}>This is proudly presented to</div>
        <div
          style={{
            marginTop: "0.8cqw",
            fontSize: "6cqw",
            fontWeight: 800,
            lineHeight: 1.1,
            fontFamily: titleFamily,
            maxWidth: "86%",
            ...nameStyle,
          }}
        >
          {data?.studentName || "Student Name"}
        </div>
        {/* The same details sentence the PDF prints (course, roll number,
            institution, test, AYUSH system, date, score and grade). */}
        <div style={{ marginTop: "1.6cqw", fontSize: "1.7cqw", maxWidth: "80%", lineHeight: 1.5 }}>
          {certificateDetails({ ...data, testTitle: data?.testTitle || "Test title", showGrade: d.showGrade !== false, grade: d.showGrade !== false ? data?.grade : null }, d.tagline)}
        </div>

        <div className="mt-auto w-full flex items-end justify-between" style={{ paddingTop: "2cqw" }}>
          <div className="flex items-end gap-[2cqw]">
            {d.seal && (
              <div
                aria-hidden
                style={{
                  width: "11cqw",
                  height: "11cqw",
                  borderRadius: "50%",
                  background: d.palette.accent,
                  color: d.palette.paper,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 0 0.4cqw ${d.palette.paper}, 0 0 0 0.7cqw ${d.palette.accent}`,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                <span style={{ fontSize: "2.8cqw" }}>{data?.scorePercent != null ? `${data.scorePercent}%` : "✓"}</span>
                <span style={{ fontSize: "1cqw", letterSpacing: "0.1em", marginTop: "0.5cqw" }}>VERIFIED</span>
              </div>
            )}
            {!sidebar && (
              <div style={{ fontSize: "1.3cqw", opacity: 0.7, textAlign: "left" }}>
                <div>Certificate No. {data?.certificateNo || "—"}</div>
                <div>Verify: {data?.verifyCode || "—"}</div>
              </div>
            )}
            {sidebar && (
              <div style={{ fontSize: "1.3cqw", opacity: 0.7, textAlign: "left" }}>
                <div>Verify: {data?.verifyCode || "—"}</div>
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", minWidth: "22cqw" }}>
            {signature && <img src={signature} alt="" style={{ height: "7cqw", maxWidth: "26cqw", objectFit: "contain", margin: "0 auto" }} />}
            <div style={{ borderTop: `0.2cqw solid ${d.palette.ink}`, marginTop: "0.5cqw", paddingTop: "0.6cqw", fontSize: "1.7cqw", fontWeight: 700 }}>{branding?.professorName || "Professor name"}</div>
            <div style={{ fontSize: "1.4cqw", opacity: 0.8 }}>{branding?.professorTitle || "Title"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
