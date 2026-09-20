"use client";

import { useEffect, useRef, useState } from "react";
import CertificatePreview from "./CertificatePreview";
import { api } from "../../convex/_generated/api";
import { backendMutation } from "../../lib/convexBrowser";
import { authHeaders } from "../../lib/session";
import { CERTIFICATES } from "../../lib/settings";
import { DESIGN_PRESETS, normaliseDesign, WATERMARK_OPACITY, WATERMARK_SIZES } from "../../lib/certificateDesign";
import { Button, Field, TextInput } from "../ui/Kit";

/**
 * The branding form (Section 4.1) with the AI design step (4.2), used for
 * the reusable default and, unchanged, for a one-off per-test override.
 *
 * Uploads go to Convex file storage. An SVG is rasterised to PNG in the
 * browser first so the PDF renderer, which cannot embed SVG, always has an
 * image it can draw. Every field is required before Save is allowed.
 */

const MAX_MB = Math.round(CERTIFICATES.IMAGE_MAX_BYTES / (1024 * 1024));

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

function ImageField({ label, hint, value, preview, onUpload, onError }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className="w-20 h-14 rounded-lg border border-border bg-secondary/60 flex items-center justify-center overflow-hidden flex-shrink-0">
          {preview ? <img src={preview} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-[10px] text-muted-foreground">None</span>}
        </div>
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
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

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

  /** A change to the current design (the watermark controls) edits it in place. */
  function updateDesign(patch) {
    setVariations((list) => {
      const next = list.length ? [...list] : [normaliseDesign(DESIGN_PRESETS[0])];
      next[Math.min(current, next.length - 1)] = normaliseDesign({ ...next[Math.min(current, next.length - 1)], ...patch });
      return next;
    });
  }
  const complete = form.logoStorageId && form.signatureStorageId && form.institutionName.trim() && form.professorName.trim() && form.professorTitle.trim();

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
      setVariations((prev) => {
        const next = [...prev, data.design].slice(-CERTIFICATES.VARIATIONS_KEPT);
        setCurrent(next.length - 1);
        return next;
      });
      if (data.note) setNote(data.note);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setGenerating(false);
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

  return (
    <form onSubmit={submit} className="space-y-5">
      {prefilledFromProfile && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          We've pre-filled this from your profile — please review and adjust before saving. Nothing is saved until you submit this form.
        </div>
      )}

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
            <Button type="button" size="sm" variant="outline" onClick={generate} disabled={generating}>
              {generating ? "Generating…" : variations.length ? "Regenerate" : "✨ Generate design"}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {variations.length ? `${design.name}. The last ${CERTIFICATES.VARIATIONS_KEPT} variations are kept so you can flip back before choosing.` : "Generate a layout from your branding, or save with the classic design."}
        </p>
        {note && <p className="text-[11px] text-amber-700">{note}</p>}
        <CertificatePreview branding={form} design={design} />

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

