"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { DEPARTMENTS } from "../lib/domains";
import { Field, TextInput, Select, Button } from "./ui/Kit";

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
  const { user, updateProfile, deleteAccount } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    institution: user.institution || "",
    course: user.course || "",
    year: user.year || "",
    batch: user.batch || "",
    rollNo: user.rollNo || "",
    companyName: user.companyName || "",
    workEmailDomain: user.workEmailDomain || "",
    department: user.department || "",
    designation: user.designation || "",
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
      patch.batch = form.batch;
      patch.rollNo = form.rollNo;
      patch.department = form.department;
    } else if (user.role === "industry") {
      patch.companyName = form.companyName;
      patch.workEmailDomain = form.workEmailDomain;
    } else if (user.role === "academician") {
      patch.institution = form.institution;
      patch.department = form.department;
      patch.designation = form.designation;
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
      <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-slide max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 z-10">
          <h3 className="font-semibold text-foreground text-lg tracking-tight">Edit Profile</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Keep your details current so recruiters and mentors see the right picture.</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4 p-3 -mx-1 rounded-2xl bg-secondary/40">
              <div className="w-16 h-16 rounded-2xl bg-primary shadow-sm flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
                {avatar ? <img src={avatar} alt="Avatar preview" className="w-full h-full object-cover" /> : initials}
              </div>
              <div>
                <label className="inline-block text-xs font-semibold text-primary hover:underline cursor-pointer">
                  Change photo
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">JPG or PNG, under 800KB</p>
              </div>
            </div>

            <Field label="Full Name">
              <TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>

            {user.role === "student" && (
              <>
                <Field label="Institution">
                  <TextInput value={form.institution} onChange={(e) => set("institution", e.target.value)} />
                </Field>
                <Field label="Department">
                  <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
                    <option value="">Select your department</option>
                    {[...new Set([...DEPARTMENTS, form.department].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Course">
                    <TextInput value={form.course} onChange={(e) => set("course", e.target.value)} placeholder="BAMS" />
                  </Field>
                  <Field label="Year">
                    <Select value={form.year} onChange={(e) => set("year", e.target.value)}>
                      <option value="">Select</option>
                      {YEAR_OPTIONS.map((y) => <option key={y}>{y}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Batch">
                    <TextInput value={form.batch} onChange={(e) => set("batch", e.target.value)} placeholder="2023" />
                  </Field>
                  <Field label="Roll Number">
                    <TextInput value={form.rollNo} onChange={(e) => set("rollNo", e.target.value)} placeholder="BAMS/2023/017" />
                  </Field>
                </div>
              </>
            )}

            {user.role === "industry" && (
              <>
                <Field label="Organisation">
                  <TextInput value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                </Field>
                <Field label="Work Email Domain">
                  <TextInput value={form.workEmailDomain} onChange={(e) => set("workEmailDomain", e.target.value)} />
                </Field>
              </>
            )}

            {user.role === "academician" && (
              <>
                <Field label="Institution">
                  <TextInput value={form.institution} onChange={(e) => set("institution", e.target.value)} />
                </Field>
                <Field label="Department">
                  <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
                    <option value="">Select a department</option>
                    {[...new Set([...DEPARTMENTS, form.department].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label="Designation">
                  <TextInput value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Associate Professor" />
                </Field>
                <p className="text-[11px] text-muted-foreground">
                  Research interests, subjects taught and academic profile links live on the full Faculty Profile page.
                </p>
              </>
            )}

            {user.role === "institution" && (
              <>
                <Field label="Institution Name">
                  <TextInput value={form.instituteName} onChange={(e) => set("instituteName", e.target.value)} />
                </Field>
                <Field label="Institution / AISHE ID">
                  <TextInput value={form.instituteId} onChange={(e) => set("instituteId", e.target.value)} />
                </Field>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 py-3">Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving} className="flex-1 py-3">Save Changes</Button>
            </div>
          </form>

          {/* Danger Zone: Account Deletion */}
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wider">Danger Zone</div>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and profile data</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium transition-colors flex-shrink-0"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-fade-slide">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center text-xl mx-auto">
                ⚠️
              </div>
              <div className="text-center">
                <h4 className="font-bold text-foreground text-base">Delete Account?</h4>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  This action cannot be undone. All your profile information, assessments, applications, and saved preferences will be permanently wiped.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-secondary font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    await deleteAccount();
                    onClose();
                    window.location.href = "/";
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                >
                  {deleting ? "Deleting..." : "Yes, Delete Account"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
