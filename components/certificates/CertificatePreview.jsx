"use client";

import { normaliseDesign, SAMPLE_CERTIFICATE } from "../../lib/certificateDesign";
import { CERTIFICATES } from "../../lib/settings";

/**
 * The certificate as it will print, drawn from the same spec the PDF uses:
 * institution and logo at the top, the logo again as a faint watermark, the
 * title, the student's name as the largest element, the course, the score,
 * the date, and the signature block at the bottom with the verification
 * code in small type.
 *
 * `branding` may carry `logoUrl`/`signatureUrl` (resolved storage URLs) or
 * `logoPreview`/`signaturePreview` (data URLs while a file is being chosen).
 */
export default function CertificatePreview({ branding, design, data = SAMPLE_CERTIFICATE, className = "", compact = false }) {
  const d = normaliseDesign(design);
  const logo = branding?.logoPreview || branding?.logoUrl || null;
  const signature = branding?.signaturePreview || branding?.signatureUrl || null;
  const title = branding?.title || CERTIFICATES.DEFAULT_TITLE;
  const date = data?.completedAt ? new Date(data.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  const serif = d.titleFont === "serif";
  const left = d.layout === "left";
  const borderStyle =
    d.border === "double"
      ? `8px double ${d.palette.primary}`
      : d.border === "single"
      ? `3px solid ${d.palette.primary}`
      : d.border === "ornate"
      ? `6px ridge ${d.palette.accent}`
      : "none";

  return (
    <div
      className={`relative w-full overflow-hidden shadow-md ${className}`}
      style={{ aspectRatio: "297 / 210", background: d.palette.paper, color: d.palette.ink, border: borderStyle, containerType: "inline-size" }}
      role="img"
      aria-label={`Certificate preview: ${title} for ${data?.studentName}`}
    >
      {d.border === "ornate" && <div className="absolute inset-2 pointer-events-none" style={{ border: `1px solid ${d.palette.primary}` }} />}
      {logo && d.watermark.enabled && (
        <img
          src={logo}
          alt=""
          className="absolute inset-0 m-auto object-contain pointer-events-none select-none"
          style={{ opacity: d.watermark.opacity, width: `${Math.round(d.watermark.size * 100)}%`, height: `${Math.round(d.watermark.size * 100)}%` }}
        />
      )}

      <div className={`relative h-full flex flex-col ${left ? "items-start text-left" : "items-center text-center"}`} style={{ padding: compact ? "4% 6%" : "5% 7%" }}>
        <div className={`flex items-center gap-[2cqw] ${left ? "" : "justify-center"}`}>
          {logo && <img src={logo} alt="" style={{ height: "10cqw", maxWidth: "22cqw", objectFit: "contain" }} />}
          <div>
            <div style={{ fontSize: "2.6cqw", fontWeight: 700, color: d.palette.primary, letterSpacing: "0.02em" }}>{branding?.institutionName || "Institution name"}</div>
            {branding?.programName && <div style={{ fontSize: "1.6cqw", opacity: 0.75 }}>{branding.programName}</div>}
          </div>
        </div>

        {d.ornament === "line" && <div style={{ width: left ? "18cqw" : "24cqw", height: "0.35cqw", background: d.palette.accent, marginTop: "2cqw" }} />}
        {d.ornament === "lotus" && (
          <div style={{ color: d.palette.accent, fontSize: "3cqw", lineHeight: 1, marginTop: "1.5cqw" }} aria-hidden>
            ❁
          </div>
        )}

        <div style={{ marginTop: "2.5cqw", fontSize: "4.2cqw", fontWeight: 700, color: d.palette.primary, fontFamily: serif ? "Georgia, 'Times New Roman', serif" : "inherit", letterSpacing: "0.04em" }}>
          {title}
        </div>
        <div style={{ marginTop: "1.6cqw", fontSize: "1.7cqw", opacity: 0.8, fontStyle: "italic" }}>This is proudly presented to</div>
        <div
          style={{
            marginTop: "0.8cqw",
            fontSize: "6cqw",
            fontWeight: 800,
            lineHeight: 1.1,
            fontFamily: serif ? "Georgia, 'Times New Roman', serif" : "inherit",
            borderBottom: `0.3cqw solid ${d.palette.accent}`,
            paddingBottom: "0.6cqw",
            maxWidth: "86%",
          }}
        >
          {data?.studentName || "Student Name"}
        </div>
        <div style={{ marginTop: "1.6cqw", fontSize: "1.8cqw", maxWidth: "80%", lineHeight: 1.5 }}>
          {d.tagline} <span style={{ fontWeight: 700, color: d.palette.primary }}>{data?.testTitle || "Test title"}</span>
          {data?.scorePercent != null && (
            <>
              {" "}
              with a score of <span style={{ fontWeight: 700 }}>{data.scorePercent}%</span>
            </>
          )}
          {date ? ` on ${date}` : ""}.
        </div>

        <div className={`mt-auto w-full flex items-end ${left ? "justify-between" : "justify-between"}`} style={{ paddingTop: "2cqw" }}>
          <div style={{ fontSize: "1.3cqw", opacity: 0.7, textAlign: "left" }}>
            <div>Certificate No. {data?.certificateNo || "—"}</div>
            <div>Verify: {data?.verifyCode || "—"}</div>
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
