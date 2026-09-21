"use client";

import { useEffect, useRef, useState } from "react";
import CertificatePreview from "./CertificatePreview";
import { api } from "../../convex/_generated/api";
import { backendMutation } from "../../lib/convexBrowser";
import { authHeaders } from "../../lib/session";
import { CERTIFICATES, FILES } from "../../lib/settings";
import {
  BORDER_STYLES,
  DESIGN_PRESETS,
  NAME_STYLES,
  ORNAMENTS,
  PATTERNS,
  normaliseDesign,
  WATERMARK_OPACITY,
  WATERMARK_SIZES,
} from "../../lib/certificateDesign";
import { Button, Field, TextInput } from "../ui/Kit";

/**
 * The branding form (Section 4.1) with the AI design step (4.2), used for
 * the reusable default and, unchanged, for a one-off per-test override.
 *
 * Uploads go to Convex file storage. An SVG is rasterised to PNG in the
 * browser first so the PDF renderer, which cannot embed SVG, always has an
 * image it can draw. Every field is required before Save is allowed.
 *
 * Two ways to a design: "Generate" asks the AI for one from the branding
 * (each regeneration is guaranteed to look different from the ones already
 * shown), and "Upload an existing certificate" has the AI recreate the
 * host's current certificate as an editable template. Either way the
 * frame, pattern, ornament, name style and seal stay adjustable by hand.
 */

const MAX_MB = Math.round(CERTIFICATES.IMAGE_MAX_BYTES / (1024 * 1024));

const LABELS = {
  border: { double: "Double rule", single: "Single rule", ornate: "Ornate rule", corners: "Corner brackets", band: "Header band", sidebar: "Side panel", none: "No frame" },
  pattern: { none: "Plain", dots: "Dots", stripes: "Stripes", grid: "Grid", rings: "Rings", chevron: "Chevron" },
  ornament: { lotus: "Lotus", line: "Rule", diamonds: "Diamonds", none: "None" },
  nameStyle: { underline: "Underlined", boxed: "Boxed", plain: "Plain" },
};

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

async function svgToPngBlob(file) {
  const dataUrl = await readAsDataUrl(file);
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(4, 1024 / Math.max(img.width || 512, img.height || 512, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((img.width || 512) * scale));
      canvas.height = Math.max(1, Math.round((img.height || 512) * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not convert the SVG."))), "image/png");
    };
    img.onerror = () => reject(new Error("Could not read the SVG."));
    img.src = dataUrl;
  });
}

async function uploadImage(file) {
  if (!CERTIFICATES.IMAGE_TYPES.includes(file.type)) throw new Error("Please upload a PNG, JPG or SVG image.");
  if (file.size > CERTIFICATES.IMAGE_MAX_BYTES) throw new Error(`File is too large — please upload an image under ${MAX_MB}MB`);
  let blob = file;
  let type = file.type;
  if (file.type === "image/svg+xml") {
    blob = await svgToPngBlob(file);
    type = "image/png";
  }
  const url = await backendMutation(api.certificates.generateUploadUrl, {});
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": type }, body: blob });
  if (!res.ok) throw new Error("Upload failed. Please try again.");
  const { storageId } = await res.json();
  return { storageId, preview: await readAsDataUrl(blob) };
}

/**
 * The whole tile is the control: click anywhere on it (or drop a file on
 * it) to choose an image. The button beside it does the same.
 */
function ImageField({ label, hint, value, preview, onUpload, onError }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function handle(file) {
    if (!file) return;
    setBusy(true);
    onError(null);
    try {
      onUpload(await uploadImage(file));
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    handle(file);
  }

  function drop(e) {
    e.preventDefault();
    setOver(false);
    handle(e.dataTransfer?.files?.[0]);
  }

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          disabled={busy}
          aria-label={`${value ? "Replace" : "Upload"} ${label.toLowerCase()}`}
          title={`Click or drop a file to ${value ? "replace" : "upload"} the ${label.toLowerCase()}`}
          className={`w-24 h-16 rounded-lg border flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors ${
            over ? "border-primary bg-primary/10" : "border-dashed border-border bg-secondary/60 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          {busy ? (
            <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          ) : preview ? (
            <img src={preview} alt="" className="max-w-full max-h-full object-contain pointer-events-none" />
          ) : (
            <span className="text-[10px] text-muted-foreground text-center leading-tight px-1">
              ＋<br />Click to upload
            </span>
          )}
        </button>
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={pick} className="hidden" />
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : value ? "Replace" : "Upload"}
        </Button>
      </div>
    </Field>
  );
}

export function brandingFromProfile(user) {
  return {
    institutionName: user?.instituteName || user?.institution || user?.companyName || "",
    professorName: user?.name || "",
    professorTitle: user?.designation || (user?.role === "industry" ? "Hiring Partner" : user?.role === "institution" ? "Placement Officer" : ""),
    programName: "",
    title: CERTIFICATES.DEFAULT_TITLE,
  };
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BrandingEditor({ user, initial, prefilledFromProfile = false, saveLabel = "Save certificate settings", onSave, onCancel, saving = false }) {
  const [form, setForm] = useState(() => ({
    logoStorageId: initial?.logoStorageId || null,
    signatureStorageId: initial?.signatureStorageId || null,
    logoPreview: initial?.logoUrl || null,
    signaturePreview: initial?.signatureUrl || null,
    institutionName: initial?.institutionName || "",
    professorName: initial?.professorName || "",
    professorTitle: initial?.professorTitle || "",
    programName: initial?.programName || "",
    title: initial?.title || CERTIFICATES.DEFAULT_TITLE,
  }));
  const [variations, setVariations] = useState(() => (initial?.design ? [normaliseDesign(initial.design)] : []));
  const [current, setCurrent] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [recreating, setRecreating] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const certificateInputRef = useRef(null);

  useEffect(() => {
    if (!initial) return;
    setForm((f) => ({
      ...f,
      logoStorageId: initial.logoStorageId || f.logoStorageId,
      signatureStorageId: initial.signatureStorageId || f.signatureStorageId,
      logoPreview: initial.logoUrl || f.logoPreview,
      signaturePreview: initial.signatureUrl || f.signaturePreview,
    }));
  }, [initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const design = normaliseDesign(variations[current] || DESIGN_PRESETS[0]);

  /** A change to the current design (the hand controls) edits it in place. */
  function updateDesign(patch) {
    setVariations((list) => {
      const next = list.length ? [...list] : [normaliseDesign(DESIGN_PRESETS[0])];
      const i = Math.min(current, next.length - 1);
      next[i] = normaliseDesign({ ...next[i], ...patch });
      return next;
    });
  }
  const complete = form.logoStorageId && form.signatureStorageId && form.institutionName.trim() && form.professorName.trim() && form.professorTitle.trim();

  function addVariation(next) {
    setVariations((prev) => {
      const list = [...prev, next].slice(-CERTIFICATES.VARIATIONS_KEPT);
      setCurrent(list.length - 1);
      return list;
    });
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/ai/certificate-design", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ institutionName: form.institutionName, professorName: form.professorName, professorTitle: form.professorTitle, title: form.title, seen: variations }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "Could not generate a design. Please try again.");
        return;
      }
      addVariation(data.design);
      if (data.note) setNote(data.note);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  }

  /** The host's existing certificate, recreated as an editable template. */
  async function recreate(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const type = String(file.type || "").split(";")[0].toLowerCase();
    const isPdf = type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf && !FILES.IMAGE_TYPES.includes(type)) return setError("Please upload a PNG, JPG, WebP or PDF of the certificate.");
    if (file.size > (isPdf ? FILES.MAX_DOCUMENT_BYTES : CERTIFICATES.IMAGE_MAX_BYTES)) return setError(`File is too large — please upload a file under ${isPdf ? 10 : MAX_MB}MB`);
    setRecreating(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/ai/certificate-from-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ file: await toBase64(file), mimeType: isPdf ? "application/pdf" : type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "The certificate could not be read. Please try again.");
        return;
      }
      addVariation(data.design);
      const t = data.text || {};
      setForm((f) => ({
        ...f,
        institutionName: t.institutionName || f.institutionName,
        programName: t.programName || f.programName,
        title: t.title || f.title,
        professorName: t.professorName || f.professorName,
        professorTitle: t.professorTitle || f.professorTitle,
      }));
      const bits = ["Recreated from your certificate — the text fields and the design below were filled from it; adjust anything before saving."];
      if (!form.logoStorageId || !form.signatureStorageId) bits.push("Upload the logo and signature as image files so they print sharply.");
      if (data.notes) bits.push(data.notes);
      setNote(bits.join(" "));
      setShowControls(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setRecreating(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!complete) {
      setError("Upload a logo and a signature, and fill in the institution, professor name and title.");
      return;
    }
    onSave({
      logoStorageId: form.logoStorageId,
      signatureStorageId: form.signatureStorageId,
      institutionName: form.institutionName.trim(),
      professorName: form.professorName.trim(),
      professorTitle: form.professorTitle.trim(),
      programName: form.programName.trim() || undefined,
      title: form.title.trim() || CERTIFICATES.DEFAULT_TITLE,
      design,
    });
  }

  const busy = generating || recreating;

  return (
    <form onSubmit={submit} className="space-y-5">
      {prefilledFromProfile && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          We've pre-filled this from your profile — please review and adjust before saving. Nothing is saved until you submit this form.
        </div>
      )}

      {/* Start from a certificate the host already has. */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 text-xs text-foreground">
          <div className="font-semibold">Already have a certificate?</div>
          <div className="text-[11px] text-muted-foreground">Upload a photo, scan, PNG or PDF of it. It is recreated as an editable template — colours, frame, layout and wording — that then prints for any test and any candidate.</div>
        </div>
        <input ref={certificateInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf" onChange={recreate} className="hidden" />
        <Button type="button" size="sm" variant="outline" onClick={() => certificateInputRef.current?.click()} disabled={busy}>
          {recreating ? "Reading the certificate…" : "📤 Upload an existing certificate"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ImageField
          label="Logo"
          hint={`PNG, JPG or SVG under ${MAX_MB}MB. A square or transparent-background image works best as a watermark.`}
          value={form.logoStorageId}
          preview={form.logoPreview}
          onUpload={({ storageId, preview }) => setForm((f) => ({ ...f, logoStorageId: storageId, logoPreview: preview }))}
          onError={setError}
        />
        <ImageField
          label="Signature"
          hint={`PNG, JPG or SVG under ${MAX_MB}MB. A transparent-background image of a handwritten or scanned signature.`}
          value={form.signatureStorageId}
          preview={form.signaturePreview}
          onUpload={({ storageId, preview }) => setForm((f) => ({ ...f, signatureStorageId: storageId, signaturePreview: preview }))}
          onError={setError}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Institution name">
          <TextInput required value={form.institutionName} onChange={(e) => set("institutionName", e.target.value)} placeholder="All India Institute of Ayurveda" />
        </Field>
        <Field label="Certificate title">
          <TextInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={CERTIFICATES.DEFAULT_TITLE} />
        </Field>
        <Field label="Professor name">
          <TextInput required value={form.professorName} onChange={(e) => set("professorName", e.target.value)} placeholder="Dr. Jane Doe" />
        </Field>
        <Field label="Professor title">
          <TextInput required value={form.professorTitle} onChange={(e) => set("professorTitle", e.target.value)} placeholder="Professor of Ayurveda" />
        </Field>
        <Field label="Course / programme name (optional)" hint="Printed under the institution on every certificate.">
          <TextInput value={form.programName} onChange={(e) => set("programName", e.target.value)} placeholder="Department of Dravyaguna" />
        </Field>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">Certificate design</div>
          <div className="ml-auto flex items-center gap-2">
            {variations.length > 1 && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <button type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="px-2 py-1 rounded-lg border border-border disabled:opacity-40">‹</button>
                {current + 1} / {variations.length}
                <button type="button" onClick={() => setCurrent((c) => Math.min(variations.length - 1, c + 1))} disabled={current === variations.length - 1} className="px-2 py-1 rounded-lg border border-border disabled:opacity-40">›</button>
              </div>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => setShowControls((v) => !v)}>
              {showControls ? "Hide controls" : "🎛️ Adjust by hand"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={generate} disabled={busy}>
              {generating ? "Generating…" : variations.length ? "✨ Regenerate" : "✨ Generate design"}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {variations.length
            ? `${design.name}. Every regeneration changes the frame, layout or pattern as well as the colours — never a recolour of the last one. The last ${CERTIFICATES.VARIATIONS_KEPT} are kept so you can flip back.`
            : "Generate a layout from your branding, upload a certificate you already use, or save with the classic design."}
        </p>
        {note && <p className="text-[11px] text-amber-700">{note}</p>}
        <CertificatePreview branding={form} design={design} />

        {showControls && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            {[
              ["border", "Frame", BORDER_STYLES],
              ["pattern", "Background", PATTERNS],
              ["ornament", "Ornament", ORNAMENTS],
              ["nameStyle", "Name style", NAME_STYLES],
            ].map(([key, label, options]) => (
              <label key={key} className="text-[11px] text-muted-foreground">
                {label}
                <select value={design[key]} onChange={(e) => updateDesign({ [key]: e.target.value })} className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                  {options.map((o) => (
                    <option key={o} value={o}>{LABELS[key][o] || o}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="text-[11px] text-muted-foreground">
              Layout
              <select value={design.layout} onChange={(e) => updateDesign({ layout: e.target.value })} className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                <option value="centered">Centred</option>
                <option value="left">Left-aligned</option>
              </select>
            </label>
            <label className="text-[11px] text-muted-foreground">
              Title typeface
              <select value={design.titleFont} onChange={(e) => updateDesign({ titleFont: e.target.value })} className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
                <option value="serif">Serif</option>
                <option value="sans">Sans-serif</option>
              </select>
            </label>
            {[
              ["primary", "Headings & frame"],
              ["accent", "Accent & seal"],
              ["ink", "Body text"],
              ["paper", "Paper"],
            ].map(([key, label]) => (
              <label key={key} className="text-[11px] text-muted-foreground flex items-center gap-2">
                <input type="color" value={design.palette[key]} onChange={(e) => updateDesign({ palette: { ...design.palette, [key]: e.target.value } })} className="w-8 h-8 rounded border border-border bg-transparent" />
                {label}
              </label>
            ))}
            <label className="text-[11px] text-muted-foreground flex items-center gap-2">
              <input type="checkbox" checked={design.seal} onChange={(e) => updateDesign({ seal: e.target.checked })} />
              Score seal in the footer
            </label>
            <label className="text-[11px] text-muted-foreground sm:col-span-2">
              Tagline (before the course name)
              <input value={design.tagline} onChange={(e) => updateDesign({ tagline: e.target.value })} maxLength={80} className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground" />
            </label>
          </div>
        )}

        {/* The logo as a watermark: on by default, faint; the professor can
            make it stronger or larger, or turn it off, and the preview and
            the PDF both follow. */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={design.watermark.enabled} onChange={(e) => updateDesign({ watermark: { ...design.watermark, enabled: e.target.checked } })} />
            Logo watermark behind the certificate
          </label>
          {design.watermark.enabled && (
            <div className="grid sm:grid-cols-2 gap-3 pl-6">
              <label className="text-[11px] text-muted-foreground">
                Strength · {Math.round(design.watermark.opacity * 100)}%
                <input
                  type="range"
                  min={WATERMARK_OPACITY.min}
                  max={WATERMARK_OPACITY.max}
                  step="0.01"
                  value={design.watermark.opacity}
                  onChange={(e) => updateDesign({ watermark: { ...design.watermark, opacity: Number(e.target.value) } })}
                  className="w-full mt-1 accent-[var(--primary,#3C7C6B)]"
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Size
                <select
                  value={design.watermark.size}
                  onChange={(e) => updateDesign({ watermark: { ...design.watermark, size: Number(e.target.value) } })}
                  className="w-full mt-1 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground"
                >
                  {WATERMARK_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">⚠️ {error}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={saving || !complete}>
          {saving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </form>
  );
}
