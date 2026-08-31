"use client";

import { useState } from "react";
import { formatScheduled } from "../../lib/testStatus";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-foreground text-lg mb-1">Register for {test.title}</h3>
        <p className="text-xs text-muted-foreground mb-5">Hosted by {test.hostName} · {test.mode} · {formatScheduled(test)}</p>

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
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Optional" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
            <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Institution</label>
            <input required value={form.institution} onChange={(e) => set("institution", e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Course / Branch</label>
              <input value={form.course} onChange={(e) => set("course", e.target.value)} placeholder="e.g. B.Tech CSE" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Year</label>
              <select value={form.year} onChange={(e) => set("year", e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select</option>
                {YEAR_OPTIONS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
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
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={!agreed || paying} className="flex-1 py-3 rounded-xl bg-primary hover:bg-accent disabled:opacity-50 text-white text-sm font-medium transition-all duration-150">
              {paying ? "Processing payment…" : isPaid ? `Pay ₹${test.price} & Register` : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
