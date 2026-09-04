"use client";

import { useState } from "react";
import { formatScheduled } from "../../lib/testStatus";
import { Button, Field, Modal, Select, TextInput } from "../ui/Kit";

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year", "Graduated"];

export default function RegisterModal({ test, user, onConfirm, onClose }) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    institution: user.institution || "",
    course: user.course || "",
    year: user.year || "",
    phone: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const isPaid = (test.price || 0) > 0;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) return;
    if (isPaid) {
      setPaying(true);
      setTimeout(() => {
        onConfirm({ ...form, paid: true });
      }, 700);
      return;
    }
    onConfirm({ ...form, paid: false });
  }

  return (
    <Modal
      title={`Register for ${test.title}`}
      description={`Hosted by ${test.hostName} · ${test.mode} · ${formatScheduled(test)}`}
      onClose={onClose}
    >
      {test.prerequisites && (
        <div className="bg-secondary rounded-xl p-3 mb-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Before you register: </span>
          {test.prerequisites}
        </div>
      )}
      {test.certification && (
        <div className="bg-primary/8 rounded-xl p-3 mb-4 text-xs text-primary font-medium">
          🏅 On passing, you'll earn: {test.certification}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full Name">
            <TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Email">
          <TextInput required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Institution">
          <TextInput required value={form.institution} onChange={(e) => set("institution", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Course / Branch">
            <TextInput value={form.course} onChange={(e) => set("course", e.target.value)} placeholder="e.g. B.Tech CSE" />
          </Field>
          <Field label="Year">
            <Select value={form.year} onChange={(e) => set("year", e.target.value)}>
              <option value="">Select</option>
              {YEAR_OPTIONS.map((y) => <option key={y}>{y}</option>)}
            </Select>
          </Field>
        </div>

        {test.rules?.length > 0 && (
          <div className="bg-secondary rounded-xl p-3">
            <div className="text-xs font-semibold text-foreground mb-1.5">Rules</div>
            <ul className="space-y-1">
              {test.rules.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-primary flex-shrink-0">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {test.mode === "Offline" && test.documentsRequired?.length > 0 && (
          <div className="bg-secondary rounded-xl p-3">
            <div className="text-xs font-semibold text-foreground mb-1.5">Documents to bring</div>
            <ul className="space-y-1">
              {test.documentsRequired.map((d, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-primary flex-shrink-0">•</span>{d}
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
          I have read and agree to the rules{test.mode === "Offline" ? " and will bring the required documents" : ""}.
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={!agreed || paying}>
            {paying ? "Processing payment…" : isPaid ? `Pay ₹${test.price} & Register` : "Register"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
