"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { Badge, Button, Card, Field, Flash, PageHeader, ProgressBar, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../ui/Kit";
import { DOMAIN_GROUPS } from "../../lib/domains";
import { relativeTime } from "../../lib/match";
import { companyRating, listApplicationsForOwner, listCompanyReviews, listInternshipsByOwner } from "../../lib/store";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const MAX_IMAGE_BYTES = 800 * 1024;
const MAX_GALLERY = 6;

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
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    companyDomain: "",
    companyDescription: "",
    whyWorkWithUs: "",
    companyWebsite: "",
    workEmailDomain: "",
    hqLocation: "",
    companySize: "",
    contactPersonName: "",
    phone: "",
    linkedIn: "",
  });
  const [logo, setLogo] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useFlash();

  useEffect(() => {
    if (!user) return;
    setForm({
      companyName: user.companyName || "",
      companyDomain: user.companyDomain || "",
      companyDescription: user.companyDescription || "",
      whyWorkWithUs: user.whyWorkWithUs || "",
      companyWebsite: user.companyWebsite || "",
      workEmailDomain: user.workEmailDomain || "",
      hqLocation: user.hqLocation || "",
      companySize: user.companySize || "",
      contactPersonName: user.contactPersonName || "",
      phone: user.phone || "",
      linkedIn: user.linkedIn || "",
    });
    setLogo(user.logoDataUrl || null);
    setGallery(user.gallery || []);
    setReady(true);
  }, [user]);

  const reviews = useMemo(() => (ready && user ? listCompanyReviews(user.companyName) : []), [ready, user]);
  const rating = useMemo(() => (ready && user ? companyRating(user.companyName) : null), [ready, user]);
  const postings = useMemo(() => (ready && user ? listInternshipsByOwner(user.id) : []), [ready, user]);
  const applications = useMemo(() => (ready && user ? listApplicationsForOwner(user.id) : []), [ready, user]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) return setError("Please choose an image under 800KB.");
    setError(null);
    setLogo(await readFileAsDataUrl(file));
  }

  async function handleGalleryAdd(e) {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    if (gallery.length + files.length > MAX_GALLERY) return setError(`You can show up to ${MAX_GALLERY} photos.`);
    if (files.some((f) => f.size > MAX_IMAGE_BYTES)) return setError("Each image must be under 800KB.");
    setError(null);
    const added = await Promise.all(files.map(async (f) => ({ name: f.name, dataUrl: await readFileAsDataUrl(f) })));
    setGallery((g) => [...g, ...added]);
    e.target.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    updateProfile({ ...form, logoDataUrl: logo, gallery });
    setFlash("Company profile saved.");
  }

  // Verification is derived from the partner code checked at signup plus the
  // verified sign-up email — never something a company can set on itself.
  const codeVerified = Boolean(user?.verifiedCode);
  const emailVerified = user?.emailVerified !== false;
  const isVerified = codeVerified && emailVerified;

  const completeness = useMemo(() => {
    const checks = [form.companyName, form.companyDomain, form.companyDescription, form.whyWorkWithUs, form.companyWebsite, form.hqLocation, form.companySize, logo, gallery.length];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, logo, gallery]);

  if (!ready) return null;

  const initials = (form.companyName || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <DashboardLayout activePage="company-profile" title="Company Profile">
      <div className="max-w-3xl mx-auto animate-fade-slide space-y-5">
        <PageHeader
          title="Company Profile"
          subtitle="What students see before they apply. A fuller profile converts more of the people who view your postings."
        />

        {error && <Flash message={error} tone="red" />}
        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Profile completeness", value: `${completeness}%`, icon: "📋" },
            { label: "Live postings", value: String(postings.filter((p) => p.status === "Open").length), icon: "💼" },
            { label: "Applicants reached", value: String(applications.length), icon: "📥" },
            { label: "Intern rating", value: rating ? `${rating.average}/5` : "—", icon: "⭐", hint: rating ? `${rating.count} review(s)` : "No reviews yet" },
          ]}
        />

        <Card>
          <Section title="Verification status" description="How the “verified partner” badge on your postings is earned.">
            <div className="space-y-2.5">
              {[
                { label: "Partner code checked at signup", ok: codeVerified, detail: user?.verifiedCode || "No partner code on record — contact the platform admin." },
                { label: "Sign-up email verified by OTP", ok: emailVerified, detail: user?.email || "" },
              ].map((c) => (
                <div key={c.label} className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 ${c.ok ? "bg-green-50/60" : "bg-amber-50/60"}`}>
                  <span className={`text-sm ${c.ok ? "text-green-600" : "text-amber-600"}`}>{c.ok ? "✓" : "!"}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground">{c.label}</div>
                    <div className="text-[11px] text-muted-foreground break-words">{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Both checks must pass for the badge to appear. It is read-only — a company can never mark itself verified, which is the point of verifying it.
            </p>
          </Section>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="flex items-center gap-4">
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
            <Badge tone={isVerified ? "green" : "amber"}>{isVerified ? "✓ Verified partner" : "Verification pending"}</Badge>
          </Card>

          <Card className="space-y-4">
            <Field label="Company name">
              <TextInput required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Sector">
                <Select value={form.companyDomain} onChange={(e) => set("companyDomain", e.target.value)}>
                  <option value="">Select a sector</option>
                  {DOMAIN_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map((d) => <option key={d}>{d}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <Field label="Company size">
                <Select value={form.companySize} onChange={(e) => set("companySize", e.target.value)}>
                  <option value="">Select</option>
                  {COMPANY_SIZES.map((s) => <option key={s}>{s} employees</option>)}
                </Select>
              </Field>
            </div>

            <Field label="About">
              <TextArea rows={3} value={form.companyDescription} onChange={(e) => set("companyDescription", e.target.value)} placeholder="What your organisation does in the Ayush ecosystem." />
            </Field>

            <Field label="Why work with us" hint="Shown prominently to students browsing your postings — what an intern actually gets out of it.">
              <TextArea rows={3} value={form.whyWorkWithUs} onChange={(e) => set("whyWorkWithUs", e.target.value)} placeholder="Mentorship, rotations across teams, exposure to real clinical or lab work." />
            </Field>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Website"><TextInput value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} placeholder="https://…" /></Field>
              <Field label="HQ location"><TextInput value={form.hqLocation} onChange={(e) => set("hqLocation", e.target.value)} placeholder="Pune, Maharashtra" /></Field>
            </div>

            <Field label="Work email domain" hint="Used to verify colleagues who join your hiring team.">
              <TextInput value={form.workEmailDomain} onChange={(e) => set("workEmailDomain", e.target.value)} placeholder="@yourcompany.in" />
            </Field>
          </Card>

          <Card>
            <Section
              title="Culture gallery"
              description={`Up to ${MAX_GALLERY} photos of your workplace, lab or team. Students see these on your company page.`}
            >
              {gallery.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {gallery.map((g, i) => (
                    <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-border">
                      <img src={g.dataUrl} alt={g.name || `Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGallery((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {gallery.length < MAX_GALLERY && (
                <label className="inline-block text-sm font-medium text-primary hover:underline cursor-pointer">
                  Add photos
                  <input type="file" accept="image/*" multiple onChange={handleGalleryAdd} className="hidden" />
                </label>
              )}
              {gallery.length === 0 && <p className="text-xs text-muted-foreground mt-1">No photos yet — a couple of real workplace shots noticeably lift application rates.</p>}
            </Section>
          </Card>

          <Card className="space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact person</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Name"><TextInput value={form.contactPersonName} onChange={(e) => set("contactPersonName", e.target.value)} /></Field>
              <Field label="Phone"><TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91…" /></Field>
            </div>
            <Field label="LinkedIn"><TextInput value={form.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} placeholder="https://linkedin.com/company/…" /></Field>
          </Card>

          <Button type="submit" className="w-full" size="lg">Save changes</Button>
        </form>

        <Card>
          <Section
            title="What past interns say"
            description="Feedback from students who completed an internship or placement with you. Read-only — you can't edit or remove a review."
          >
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No reviews yet. Once interns you've hired complete their placement, their feedback appears here and builds trust with future applicants.
              </p>
            ) : (
              <>
                {rating && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl font-bold text-foreground">{rating.average}</div>
                    <div className="min-w-0 flex-1">
                      <ProgressBar value={(rating.average / 5) * 100} tone="bg-primary" />
                      <div className="text-[11px] text-muted-foreground mt-1">Average across {rating.count} review{rating.count === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="border border-border rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">{r.author}{r.role ? ` · ${r.role}` : ""}</span>
                        <Badge tone={r.rating >= 4 ? "green" : r.rating >= 3 ? "amber" : "red"}>{r.rating}/5</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                      <div className="text-[10px] text-muted-foreground mt-1">{relativeTime(r.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Section>
        </Card>
      </div>
    </DashboardLayout>
  );
}
