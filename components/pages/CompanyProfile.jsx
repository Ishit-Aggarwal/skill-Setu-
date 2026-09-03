"use client";

import { useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const MAX_LOGO_BYTES = 800 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CompanyProfile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    companyName: user.companyName || "",
    companyDomain: user.companyDomain || "",
    companyDescription: user.companyDescription || "",
    companyWebsite: user.companyWebsite || "",
    workEmailDomain: user.workEmailDomain || "",
    hqLocation: user.hqLocation || "",
    companySize: user.companySize || "",
    contactPersonName: user.contactPersonName || "",
    phone: user.phone || "",
    linkedIn: user.linkedIn || "",
  });
  const [logo, setLogo] = useState(user.logoDataUrl || null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("Please choose an image under 800KB.");
      return;
    }
    setError(null);
    setLogo(await readFileAsDataUrl(file));
    setSaved(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    updateProfile({ ...form, logoDataUrl: logo });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Verification status is derived from the partner code checked at signup —
  // shown here as read-only. Letting a company edit its own "verified" badge
  // would defeat the point of verifying it in the first place.
  const isVerified = Boolean(user.verifiedCode) && user.emailVerified;

  const initials = (form.companyName || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <DashboardLayout activePage="company-profile" title="Company Profile">
      <div className="max-w-2xl mx-auto animate-fade-slide space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Company Profile</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Visible to students browsing your postings — keep it current.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
              {logo ? <img src={logo} alt="Company logo" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <label className="inline-block text-sm font-medium text-primary hover:underline cursor-pointer">
                {logo ? "Change logo" : "Upload logo"}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">JPG or PNG, under 800KB</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${isVerified ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
              {isVerified ? "✓ Verified partner" : "Verification pending"}
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Company Name</label>
              <input required value={form.companyName} onChange={(e) => set("companyName", e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Industry / Domain</label>
                <input value={form.companyDomain} onChange={(e) => set("companyDomain", e.target.value)} placeholder="e.g. IT Services"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Company Size</label>
                <select value={form.companySize} onChange={(e) => set("companySize", e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select</option>
                  {COMPANY_SIZES.map((s) => <option key={s}>{s} employees</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">About</label>
              <textarea value={form.companyDescription} onChange={(e) => set("companyDescription", e.target.value)} rows={3} placeholder="What does your company do?"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Website</label>
                <input value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} placeholder="https://…"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">HQ Location</label>
                <input value={form.hqLocation} onChange={(e) => set("hqLocation", e.target.value)} placeholder="Bengaluru, India"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Work Email Domain</label>
              <input value={form.workEmailDomain} onChange={(e) => set("workEmailDomain", e.target.value)} placeholder="@yourcompany.com"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Person</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Name</label>
                <input value={form.contactPersonName} onChange={(e) => set("contactPersonName", e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Phone</label>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91…"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">LinkedIn</label>
              <input value={form.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} placeholder="https://linkedin.com/company/…"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <button type="submit" className="w-full py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-all duration-150">
            {saved ? "Saved ✓" : "Save Changes"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
