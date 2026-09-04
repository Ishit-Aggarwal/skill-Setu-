"use client";

import { useState } from "react";
import { Button, Field, Modal, TextArea } from "./ui/Kit";

export default function ApplyConfirmModal({ internship, user, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleConfirm() {
    setSubmitting(true);
    setTimeout(() => onConfirm(note), 300);
  }

  return (
    <Modal
      title={`Apply to ${internship.title}`}
      description={`${internship.company} · ${internship.location}`}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="button" className="flex-1" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Submitting…" : "Confirm Application"}
          </Button>
        </div>
      }
    >
      <div className="bg-secondary rounded-xl p-3 mb-4 text-xs text-muted-foreground space-y-1">
        <div><span className="font-semibold text-foreground">Applying as:</span> {user.name}</div>
        <div><span className="font-semibold text-foreground">Institution:</span> {user.institution || "—"}</div>
        {user.course && <div><span className="font-semibold text-foreground">Course:</span> {user.course} {user.year ? `· ${user.year}` : ""}</div>}
      </div>

      <Field label="Note to recruiter (optional)">
        <TextArea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Anything you'd like to add?"
        />
      </Field>
    </Modal>
  );
}
