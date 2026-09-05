"use client";

import { useEffect, useRef, useState } from "react";
import { getResume, savePortfolio, getPortfolio } from "../lib/store";
import { formatBytes, openStoredFile, readFileAsDataUrl } from "../lib/files";
import { formatStipend } from "../lib/money";
import { Button, Field, IconTile, Modal, TextArea } from "./ui/Kit";

const MAX_RESUME_BYTES = 2 * 1024 * 1024;
const RESUME_TYPES = ["application/pdf", "image/png", "image/jpeg"];

/**
 * The last step before an application exists.
 *
 * A resume is required here, and it is required for a reason a student can
 * see: it is the document the recruiter opens from the application. Rather
 * than blocking with "upload a resume first" and sending them away to find the
 * portfolio page, the uploader is inline — the file is attached to the
 * portfolio and to this application in the same click.
 *
 * The rule is also enforced in the store (applyToInternship), so a submission
 * that skips this dialog is still refused.
 */
export default function ApplyConfirmModal({ internship, user, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resume, setResume] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    setResume(getResume(user.id));
  }, [user.id]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!RESUME_TYPES.includes(file.type)) {
      return setError("Your resume needs to be a PDF, PNG or JPG.");
    }
    if (file.size > MAX_RESUME_BYTES) {
      return setError(`That file is ${formatBytes(file.size)}. Please keep it under ${formatBytes(MAX_RESUME_BYTES)}.`);
    }

    setError(null);
    setUploading(true);
    try {
      const doc = {
        id: `doc_${Date.now().toString(36)}`,
        type: "Resume",
        name: file.name,
        fileName: file.name,
        size: file.size,
        dataUrl: await readFileAsDataUrl(file),
        uploadedAt: new Date().toISOString(),
      };
      const existing = getPortfolio(user.id)?.documents || [];
      savePortfolio(user.id, { documents: [...existing, doc] });
      setResume(doc);
    } catch {
      setError("That file couldn't be read. Try a different one.");
    } finally {
      setUploading(false);
    }
  }

  function handleConfirm() {
    if (!resume) {
      setError("Attach your resume before applying — it's what the recruiter opens first.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => onConfirm(note), 300);
  }

  return (
    <Modal
      title={`Apply to ${internship.title}`}
      description={`${internship.company} · ${internship.location} · ${formatStipend(internship)}`}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={handleConfirm} disabled={submitting || uploading || !resume}>
            {submitting ? "Submitting…" : "Confirm Application"}
          </Button>
        </div>
      }
    >
      <div className="bg-secondary rounded-xl p-3 mb-4 text-xs text-muted-foreground space-y-1">
        <div>
          <span className="font-semibold text-foreground">Applying as:</span> {user.name}
        </div>
        <div>
          <span className="font-semibold text-foreground">Institution:</span> {user.institution || "—"}
        </div>
        {user.course && (
          <div>
            <span className="font-semibold text-foreground">Course:</span> {user.course} {user.year ? `· ${user.year}` : ""}
          </div>
        )}
      </div>

      <Field
        label="Resume"
        hint="Attached to this application and kept in your portfolio. PDF, PNG or JPG, up to 2MB."
        className="mb-4"
      >
        {resume ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3">
            <IconTile icon="📄" size={34} tone="green" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground truncate">{resume.fileName || resume.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {resume.size ? `${formatBytes(resume.size)} · ` : ""}Will be sent with this application
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={() => openStoredFile(resume)} className="text-xs text-primary hover:underline">
                Preview
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3.5 py-3">
            <div className="text-xs font-semibold text-amber-800 mb-1">You need a resume to apply</div>
            <p className="text-[11px] text-amber-700 leading-relaxed mb-2.5">
              Every recruiter opens it straight from your application, so an application without one goes nowhere.
              Upload it here and it is saved to your portfolio too.
            </p>
            <Button type="button" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload resume"}
            </Button>
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={handleFile}
          className="hidden"
        />
      </Field>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 mb-4">{error}</div>
      )}

      <Field label="Note to recruiter (optional)">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Anything you'd like to add?" />
      </Field>
    </Modal>
  );
}
