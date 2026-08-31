"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year", "Graduated"];
const MAX_AVATAR_BYTES = 800 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EditProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    institution: user.institution || "",
    course: user.course || "",
    year: user.year || "",
    companyName: user.companyName || "",
    workEmailDomain: user.workEmailDomain || "",
    department: user.department || "",
    instituteName: user.instituteName || "",
    instituteId: user.instituteId || "",
  });
  const [avatar, setAvatar] = useState(user.avatarDataUrl || null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Please choose an image under 800KB.");
      return;
    }
    setError(null);
    const dataUrl = await readFileAsDataUrl(file);
    setAvatar(dataUrl);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const patch = { name: form.name, avatarDataUrl: avatar };
    if (user.role === "student") {
      patch.institution = form.institution;
      patch.course = form.course;
      patch.year = form.year;
    } else if (user.role === "industry") {
      patch.companyName = form.companyName;
      patch.workEmailDomain = form.workEmailDomain;
    } else if (user.role === "academician") {
      patch.institution = form.institution;
      patch.department = form.department;
    } else if (user.role === "institution") {
      patch.instituteName = form.instituteName;
      patch.instituteId = form.instituteId;
    }
    updateProfile(patch);
    setSaving(false);
    onClose();
  }

  const initials = (form.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-foreground text-lg mb-5">Edit Profile</h3>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
              {avatar ? <img src={avatar} alt="Avatar preview" className="w-full h-full object-cover" /> : initials}
            </div>
            <div>
              <label className="inline-block text-xs font-medium text-primary hover:underline cursor-pointer">
                Change photo
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
              <p className="text-[11px] text-muted-foreground mt-0.5">JPG or PNG, under 800KB</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {user.role === "student" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Institution</label>
                <input value={form.institution} onChange={(e) => set("institution", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Course</label>
                  <input value={form.course} onChange={(e) => set("course", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Year</label>
                  <select value={form.year} onChange={(e) => set("year", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Select</option>
                    {YEAR_OPTIONS.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {user.role === "industry" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Organisation</label>
                <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Work Email Domain</label>
                <input value={form.workEmailDomain} onChange={(e) => set("workEmailDomain", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </>
          )}

          {user.role === "academician" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Institution</label>
                <input value={form.institution} onChange={(e) => set("institution", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Department</label>
                <input value={form.department} onChange={(e) => set("department", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </>
          )}

          {user.role === "institution" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Institution Name</label>
                <input value={form.instituteName} onChange={(e) => set("instituteName", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Institution / AISHE ID</label>
                <input value={form.instituteId} onChange={(e) => set("instituteId", e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary hover:bg-accent disabled:opacity-60 text-white text-sm font-medium transition-all duration-150">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
