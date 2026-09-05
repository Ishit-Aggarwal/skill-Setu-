"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { DEPARTMENTS } from "../lib/domains";
import { getPortfolio, savePortfolio } from "../lib/store";
import { Field, TextInput, TextArea, Select, Button, Tabs, Overlay } from "./ui/Kit";

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year", "Graduated"];
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"];
const MAX_AVATAR_BYTES = 800 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * The quick profile editor behind the header avatar and the sidebar footer.
 *
 * It covers everything a person is asked for at signup plus the details that
 * used to be unreachable from anywhere in the UI (phone, location, public
 * links, academic standing). Longer-form content — a student's projects and
 * certifications, a faculty member's research profile, a company's description
 * and gallery — still lives on the dedicated pages; this is the identity layer
 * every role shares.
 *
 * The student "About" text is written through to the portfolio rather than the
 * user record, because that is where every recruiter-facing view reads a bio
 * from — keeping two copies would let them drift apart.
 */
export default function EditProfileModal({ onClose }) {
  const { user, updateProfile, deleteAccount } = useAuth();
  const [tab, setTab] = useState("identity");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const portfolio = user.role === "student" ? getPortfolio(user.id) : null;

  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    location: user.location || user.city || "",
    headline: user.headline || portfolio?.headline || "",
    about: portfolio?.bio || user.bio || "",
    linkedIn: user.linkedIn || "",
    github: user.github || "",
    website: user.website || user.companyWebsite || "",
    // Student
    institution: user.institution || "",
    course: user.course || "",
    year: user.year || "",
    batch: user.batch || "",
    rollNo: user.rollNo || "",
    department: user.department || "",
    cgpa: user.cgpa || "",
    graduationYear: user.graduationYear || "",
    openToOpportunities: user.openToOpportunities !== false,
    // Industry
    companyName: user.companyName || "",
    workEmailDomain: user.workEmailDomain || "",
    hqLocation: user.hqLocation || "",
    companySize: user.companySize || "",
    contactPersonName: user.contactPersonName || "",
    // Academician
    designation: user.designation || "",
    experienceYears: user.experienceYears || "",
    orcid: user.orcid || "",
    scholarUrl: user.scholarUrl || "",
    // Institution
    instituteName: user.instituteName || "",
    instituteId: user.instituteId || "",
    city: user.city || "",
    state: user.state || "",
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

    const patch = {
      name: form.name,
      avatarDataUrl: avatar,
      phone: form.phone,
      location: form.location,
      headline: form.headline,
      linkedIn: form.linkedIn,
      website: form.website,
    };

    if (user.role === "student") {
      Object.assign(patch, {
        institution: form.institution,
        course: form.course,
        year: form.year,
        batch: form.batch,
        rollNo: form.rollNo,
        department: form.department,
        cgpa: form.cgpa,
        graduationYear: form.graduationYear,
        github: form.github,
        openToOpportunities: form.openToOpportunities,
      });
      savePortfolio(user.id, { bio: form.about, headline: form.headline, location: form.location });
    } else if (user.role === "industry") {
      Object.assign(patch, {
        companyName: form.companyName,
        workEmailDomain: form.workEmailDomain,
        companyWebsite: form.website,
        hqLocation: form.hqLocation,
        companySize: form.companySize,
        contactPersonName: form.contactPersonName,
      });
    } else if (user.role === "academician") {
      Object.assign(patch, {
        institution: form.institution,
        department: form.department,
        designation: form.designation,
        experienceYears: form.experienceYears,
        orcid: form.orcid,
        scholarUrl: form.scholarUrl,
        bio: form.about,
      });
    } else if (user.role === "institution") {
      Object.assign(patch, {
        instituteName: form.instituteName,
        instituteId: form.instituteId,
        city: form.city,
        state: form.state,
      });
    }

    updateProfile(patch);
    setSaving(false);
    onClose();
  }

  const initials = (form.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const departmentOptions = [...new Set([...DEPARTMENTS, form.department].filter(Boolean))];

  return (
    <Overlay onClose={onClose}>
      <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-slide max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 z-10">
          <h3 className="font-semibold text-foreground text-lg tracking-tight">Edit Profile</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Keep your details current so recruiters, mentors and your placement cell see the right picture.
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <Tabs
            className="mb-5"
            tabs={[
              { key: "identity", label: "Basics" },
              { key: "details", label: user.role === "student" ? "Academics" : "Details" },
              { key: "links", label: "Links" },
            ]}
            value={tab}
            onChange={setTab}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "identity" && (
              <>
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
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => setAvatar(null)}
                        className="text-[11px] text-muted-foreground hover:text-red-600 transition-colors mt-0.5"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <Field label="Full Name">
                  <TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>

                <Field label="Headline" hint="One line shown under your name across the platform.">
                  <TextInput
                    value={form.headline}
                    onChange={(e) => set("headline", e.target.value)}
                    placeholder={
                      user.role === "student"
                        ? "Final-year CS student · Full-stack & data"
                        : user.role === "industry"
                        ? "Hiring engineering interns across India"
                        : "Associate Professor · Applied Research"
                    }
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone">
                    <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                  </Field>
                  <Field label={user.role === "institution" ? "City" : "Location"}>
                    <TextInput
                      value={user.role === "institution" ? form.city : form.location}
                      onChange={(e) => set(user.role === "institution" ? "city" : "location", e.target.value)}
                      placeholder="Bengaluru"
                    />
                  </Field>
                </div>

                <Field label="Email" hint="Your sign-in address can't be changed here.">
                  <TextInput value={user.email || ""} disabled className="opacity-60 cursor-not-allowed" />
                </Field>

                {(user.role === "student" || user.role === "academician") && (
                  <Field label="About" hint={user.role === "student" ? "Shown on your portfolio and to recruiters." : "Shown on your faculty profile."}>
                    <TextArea
                      rows={3}
                      value={form.about}
                      onChange={(e) => set("about", e.target.value)}
                      placeholder="A short summary of your interests, strengths and what you're looking for."
                    />
                  </Field>
                )}

                {user.role === "student" && (
                  <label className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 px-3.5 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.openToOpportunities}
                      onChange={(e) => set("openToOpportunities", e.target.checked)}
                      className="w-4 h-4 accent-primary mt-0.5 flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground block">Open to opportunities</span>
                      Let recruiters find you in the talent pool. Turn this off and you stay searchable only to your own institution.
                    </span>
                  </label>
                )}
              </>
            )}

            {tab === "details" && (
              <>
                {user.role === "student" && (
                  <>
                    <Field label="Institution">
                      <TextInput value={form.institution} onChange={(e) => set("institution", e.target.value)} />
                    </Field>
                    <Field label="Department">
                      <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
                        <option value="">Select your department</option>
                        {departmentOptions.map((d) => <option key={d}>{d}</option>)}
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Course">
                        <TextInput value={form.course} onChange={(e) => set("course", e.target.value)} placeholder="B.Tech / B.Sc / MBA" />
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
                        <TextInput value={form.rollNo} onChange={(e) => set("rollNo", e.target.value)} placeholder="CSE/2023/017" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="CGPA / Percentage">
                        <TextInput value={form.cgpa} onChange={(e) => set("cgpa", e.target.value)} placeholder="8.4 / 10" />
                      </Field>
                      <Field label="Graduating in">
                        <TextInput value={form.graduationYear} onChange={(e) => set("graduationYear", e.target.value)} placeholder="2027" />
                      </Field>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Skills, projects, certificates and documents are managed on your Portfolio page.
                    </p>
                  </>
                )}

                {user.role === "industry" && (
                  <>
                    <Field label="Organisation">
                      <TextInput value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
                    </Field>
                    <Field label="Work Email Domain">
                      <TextInput value={form.workEmailDomain} onChange={(e) => set("workEmailDomain", e.target.value)} placeholder="@yourcompany.com" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="HQ Location">
                        <TextInput value={form.hqLocation} onChange={(e) => set("hqLocation", e.target.value)} placeholder="Pune, Maharashtra" />
                      </Field>
                      <Field label="Company Size">
                        <Select value={form.companySize} onChange={(e) => set("companySize", e.target.value)}>
                          <option value="">Select</option>
                          {COMPANY_SIZES.map((s) => <option key={s}>{s} employees</option>)}
                        </Select>
                      </Field>
                    </div>
                    <Field label="Primary Contact Person">
                      <TextInput value={form.contactPersonName} onChange={(e) => set("contactPersonName", e.target.value)} placeholder="Campus hiring lead" />
                    </Field>
                    <p className="text-[11px] text-muted-foreground">
                      Company description, culture notes and the photo gallery live on the Company Profile page.
                    </p>
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
                        {departmentOptions.map((d) => <option key={d}>{d}</option>)}
                      </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Designation">
                        <TextInput value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Associate Professor" />
                      </Field>
                      <Field label="Experience (years)">
                        <TextInput value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} placeholder="12" />
                      </Field>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Research interests and subjects taught live on the full Faculty Profile page.
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
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="City">
                        <TextInput value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Bengaluru" />
                      </Field>
                      <Field label="State">
                        <TextInput value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Karnataka" />
                      </Field>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Accreditation, departments and placement-cell contacts live on the Institution Profile page.
                    </p>
                  </>
                )}
              </>
            )}

            {tab === "links" && (
              <>
                <Field label="LinkedIn">
                  <TextInput value={form.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} placeholder="https://linkedin.com/in/…" />
                </Field>
                {user.role === "student" && (
                  <Field label="GitHub / Portfolio repository">
                    <TextInput value={form.github} onChange={(e) => set("github", e.target.value)} placeholder="https://github.com/…" />
                  </Field>
                )}
                <Field label={user.role === "industry" ? "Company website" : "Website"}>
                  <TextInput value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
                </Field>
                {user.role === "academician" && (
                  <>
                    <Field label="ORCID">
                      <TextInput value={form.orcid} onChange={(e) => set("orcid", e.target.value)} placeholder="0000-0002-1825-0097" />
                    </Field>
                    <Field label="Google Scholar">
                      <TextInput value={form.scholarUrl} onChange={(e) => set("scholarUrl", e.target.value)} placeholder="https://scholar.google.com/citations?user=…" />
                    </Field>
                  </>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Links are shown on your public profile. Leave any of them blank to hide it.
                </p>
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
                className="px-3 py-1.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors flex-shrink-0"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Modal. z-[60] is an arbitrary value on purpose — Tailwind's
            default scale stops at z-50, which this has to sit above. */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-fade-slide">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mx-auto">
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
    </Overlay>
  );
}
