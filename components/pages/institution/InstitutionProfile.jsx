"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, Field, Flash, PageHeader, Section, Select, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { ACCREDITATION_BODIES, DEPARTMENTS, INSTITUTION_TYPES } from "../../../lib/domains";
import { formatDate } from "../../../lib/match";
import { getInstitutionProfile, logActivity, saveInstitutionProfile, listInstitutionDocs, addInstitutionDoc, removeInstitutionDoc } from "../../../lib/store";
import { useInstitutionName } from "./useInstitution";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMPTY = {
  instituteType: INSTITUTION_TYPES[0],
  about: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  website: "",
  established: "",
  logoDataUrl: null,
  accreditations: [],
  departments: [],
  placementCell: { officer: "", designation: "", email: "", phone: "" },
};

/**
 * The full institution record — identity, accreditation with uploaded proof,
 * departments and their HODs, and placement-cell contacts. Previously the only
 * institution-level fields anywhere were a name and an ID behind the header's
 * Edit link.
 */
export default function InstitutionProfile() {
  const { user, updateProfile } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [name, setName] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [flash, setFlash] = useFlash();
  const [error, setError] = useState(null);

  const [docs, setDocs] = useState([]);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Brochure & Prospectus");
  const [docFile, setDocFile] = useState(null);

  useEffect(() => {
    const stored = getInstitutionProfile(instituteName);
    setForm({ ...EMPTY, ...(stored || {}), placementCell: { ...EMPTY.placementCell, ...(stored?.placementCell || {}) } });
    setName(instituteName);
    setInstituteId(user?.instituteId || "");
    if (instituteName) {
      setDocs(listInstitutionDocs(instituteName));
    }
    setReady(true);
  }, [instituteName, user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCell = (k, v) => setForm((f) => ({ ...f, placementCell: { ...f.placementCell, [k]: v } }));

  async function handleAddDoc(e) {
    e.preventDefault();
    if (!docTitle.trim() || !docFile) return setError("Please enter a title and select a PDF document.");
    if (docFile.size > 5 * 1024 * 1024) return setError("Document must be under 5MB.");
    setError(null);
    const dataUrl = await readFileAsDataUrl(docFile);
    addInstitutionDoc(instituteName, {
      title: docTitle.trim(),
      category: docCategory,
      fileName: docFile.name,
      fileSize: `${(docFile.size / 1024).toFixed(0)} KB`,
      dataUrl,
      uploadedBy: user?.name || "Admin",
    });
    setDocs(listInstitutionDocs(instituteName));
    setDocTitle("");
    setDocFile(null);
    setShowAddDoc(false);
    setFlash("Official institutional document uploaded successfully.");
  }

  function handleRemoveDoc(id) {
    removeInstitutionDoc(id);
    setDocs(listInstitutionDocs(instituteName));
    setFlash("Document removed.");
  }

  async function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError("Please choose an image under 1.5MB.");
    setError(null);
    set("logoDataUrl", await readFileAsDataUrl(file));
  }

  async function handleAccreditationDoc(index, file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError("Please choose a file under 1.5MB.");
    setError(null);
    const dataUrl = await readFileAsDataUrl(file);
    setForm((f) => {
      const next = [...f.accreditations];
      next[index] = { ...next[index], document: dataUrl, documentName: file.name, status: "Verified" };
      return { ...f, accreditations: next };
    });
  }

  function updateAccreditation(index, patch) {
    setForm((f) => {
      const next = [...f.accreditations];
      next[index] = { ...next[index], ...patch };
      return { ...f, accreditations: next };
    });
  }

  function addAccreditation() {
    setForm((f) => ({ ...f, accreditations: [...f.accreditations, { body: ACCREDITATION_BODIES[0], grade: "", validTill: "", document: null, status: "Pending" }] }));
  }

  function removeAccreditation(index) {
    setForm((f) => ({ ...f, accreditations: f.accreditations.filter((_, i) => i !== index) }));
  }

  function updateDepartment(index, patch) {
    setForm((f) => {
      const next = [...f.departments];
      next[index] = { ...next[index], ...patch };
      return { ...f, departments: next };
    });
  }

  function addDepartment() {
    setForm((f) => ({ ...f, departments: [...f.departments, { name: DEPARTMENTS[0], hod: "", seats: "" }] }));
  }

  function removeDepartment(index) {
    setForm((f) => ({ ...f, departments: f.departments.filter((_, i) => i !== index) }));
  }

  function submit(e) {
    e.preventDefault();
    saveInstitutionProfile(instituteName, form);
    if (name !== instituteName || instituteId !== user?.instituteId) {
      updateProfile({ instituteName: name, instituteId });
      if (name !== instituteName) saveInstitutionProfile(name, form);
    }
    logActivity(instituteName, user?.name || "Admin", "Updated institution profile");
    setFlash("Institution profile saved.");
  }

  const verifiedCount = form.accreditations.filter((a) => a.status === "Verified").length;
  const compliance = useMemo(
    () => [
      { label: "Partner verification code", ok: !!user?.verifiedCode, detail: user?.verifiedCode || "Not recorded at signup" },
      { label: "Admin email verified", ok: user?.emailVerified !== false, detail: user?.email || "" },
      { label: "Accreditation proof on file", ok: verifiedCount > 0, detail: `${verifiedCount} of ${form.accreditations.length} bodies verified` },
      { label: "Placement cell contact", ok: !!form.placementCell.email, detail: form.placementCell.email || "Add an email so recruiters can reach you" },
    ],
    [user, form, verifiedCount]
  );

  if (!ready) return null;

  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <DashboardLayout activePage="institution-profile" title="Institution Profile">
      <div className="animate-fade-slide max-w-4xl space-y-5">
        <PageHeader
          title="Institution Profile"
          subtitle="What recruiters and students see about your institution, and the compliance record behind the account."
        />

        {error && <Flash message={error} tone="red" />}
        <Flash message={flash} />

        <Card>
          <Section title="Verification & compliance" description="Signup already requires a partner verification code; this is the full picture.">
            <div className="grid sm:grid-cols-2 gap-3">
              {compliance.map((c) => (
                <div key={c.label} className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 ${c.ok ? "bg-green-50/60" : "bg-amber-50/60"}`}>
                  <span className={`text-sm ${c.ok ? "text-green-600" : "text-amber-600"}`}>{c.ok ? "✓" : "!"}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground">{c.label}</div>
                    <div className="text-[11px] text-muted-foreground break-words">{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </Card>

        <form onSubmit={submit} className="space-y-5">
          <Card>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
                {form.logoDataUrl ? <img src={form.logoDataUrl} alt="Institution logo" className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="flex-1 min-w-0">
                <label className="inline-block text-sm font-medium text-primary hover:underline cursor-pointer">
                  {form.logoDataUrl ? "Change logo" : "Upload logo"}
                  <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">JPG or PNG, under 1.5MB</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Institution name"><TextInput required value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Institution type" className="sm:col-span-2">
                  <Select value={form.instituteType} onChange={(e) => set("instituteType", e.target.value)}>
                    {INSTITUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Established"><TextInput value={form.established} onChange={(e) => set("established", e.target.value)} placeholder="1976" /></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="AISHE / Institution ID"><TextInput value={instituteId} onChange={(e) => setInstituteId(e.target.value)} placeholder="AISHE-U-0417" /></Field>
                <Field label="Website"><TextInput value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
              </div>
              <Field label="About" hint="Shown to students and recruiters browsing your institution.">
                <TextArea rows={4} value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="Programmes offered, hospital and pharmacy facilities, research focus." />
              </Field>
              <Field label="Address"><TextInput value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} placeholder="Street / campus address" /></Field>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="City"><TextInput value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
                <Field label="State"><TextInput value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
                <Field label="PIN code"><TextInput value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></Field>
              </div>
            </div>
          </Card>

          <Card>
            <Section
              title="Accreditation & recognition"
              description="Upload proof for each body. A verified record is what an accreditation or ranking submission asks for."
              actions={<Button type="button" size="sm" variant="outline" onClick={addAccreditation}>Add body</Button>}
            >
              {form.accreditations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No accreditation recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {form.accreditations.map((a, i) => (
                    <div key={i} className="border border-border rounded-xl p-4">
                      <div className="grid sm:grid-cols-4 gap-3 mb-3">
                        <Field label="Body">
                          <Select value={a.body} onChange={(e) => updateAccreditation(i, { body: e.target.value })}>
                            {ACCREDITATION_BODIES.map((b) => <option key={b}>{b}</option>)}
                          </Select>
                        </Field>
                        <Field label="Grade / status"><TextInput value={a.grade || ""} onChange={(e) => updateAccreditation(i, { grade: e.target.value })} placeholder="A+" /></Field>
                        <Field label="Valid till"><TextInput type="date" value={a.validTill || ""} onChange={(e) => updateAccreditation(i, { validTill: e.target.value })} /></Field>
                        <Field label="Record">
                          <div className="flex items-center gap-2 h-[42px]">
                            <Badge tone={a.status === "Verified" ? "green" : "amber"}>{a.status || "Pending"}</Badge>
                            {a.validTill && <span className="text-[10px] text-muted-foreground">till {formatDate(a.validTill)}</span>}
                          </div>
                        </Field>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-xs font-medium text-primary hover:underline cursor-pointer">
                          {a.document ? "Replace proof" : "Upload proof"}
                          <input type="file" accept="application/pdf,image/*" onChange={(e) => handleAccreditationDoc(i, e.target.files?.[0])} className="hidden" />
                        </label>
                        {a.document ? (
                          <a href={a.document} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline">
                            {a.documentName || "View uploaded document"}
                          </a>
                        ) : (
                          <span className="text-xs text-amber-600">Proof not uploaded — shows as pending</span>
                        )}
                        <button type="button" onClick={() => removeAccreditation(i)} className="ml-auto text-xs text-muted-foreground hover:text-red-600">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section
              title="Departments & heads"
              description="Drives the department filters across the roster, skill-gap and analytics views."
              actions={<Button type="button" size="sm" variant="outline" onClick={addDepartment}>Add department</Button>}
            >
              {form.departments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No departments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {form.departments.map((d, i) => (
                    <div key={i} className="grid sm:grid-cols-[2fr_1.4fr_0.7fr_auto] gap-2 items-center">
                      <Select value={d.name} onChange={(e) => updateDepartment(i, { name: e.target.value })}>
                        {[...new Set([...DEPARTMENTS, d.name].filter(Boolean))].map((n) => <option key={n}>{n}</option>)}
                      </Select>
                      <TextInput value={d.hod || ""} onChange={(e) => updateDepartment(i, { hod: e.target.value })} placeholder="Head of department" />
                      <TextInput type="number" min="0" value={d.seats ?? ""} onChange={(e) => updateDepartment(i, { seats: e.target.value })} placeholder="Seats" />
                      <button type="button" onClick={() => removeDepartment(i)} className="text-xs text-muted-foreground hover:text-red-600 px-2">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section title="Placement cell contact" description="How recruiters reach your team about drives and MOUs.">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Officer name"><TextInput value={form.placementCell.officer} onChange={(e) => setCell("officer", e.target.value)} /></Field>
                <Field label="Designation"><TextInput value={form.placementCell.designation} onChange={(e) => setCell("designation", e.target.value)} placeholder="Training & Placement Officer" /></Field>
                <Field label="Email"><TextInput type="email" value={form.placementCell.email} onChange={(e) => setCell("email", e.target.value)} /></Field>
                <Field label="Phone"><TextInput value={form.placementCell.phone} onChange={(e) => setCell("phone", e.target.value)} /></Field>
              </div>
            </Section>
          </Card>

          <Card>
            <Section
              title="Official Documents & Institutional PDFs"
              description="Upload official university brochures, NIRF disclosures, placement policies, and accreditation reports."
              actions={
                <Button type="button" size="sm" variant="outline" onClick={() => setShowAddDoc((v) => !v)}>
                  {showAddDoc ? "Close form" : "Upload new document"}
                </Button>
              }
            >
              {showAddDoc && (
                <div className="bg-secondary/40 border border-border rounded-xl p-4 mb-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Document Title">
                      <TextInput
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g. Campus Placement Guidelines & Policy 2026"
                      />
                    </Field>
                    <Field label="Category">
                      <Select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                        {["Brochure & Prospectus", "NIRF & Accreditations", "Placement Policy", "Annual Report", "Compliance & Guidelines"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Field label="Select PDF File" hint="PDF files up to 5MB">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-border file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-muted cursor-pointer"
                    />
                  </Field>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                    <Button type="button" size="sm" onClick={handleAddDoc}>Upload Document</Button>
                  </div>
                </div>
              )}

              {docs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No official documents uploaded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">📄</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate flex items-center gap-2">
                            <span>{d.title}</span>
                            <Badge tone="primary">{d.category}</Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {d.fileName} · {d.fileSize || "PDF"} {d.uploadedAt ? `· Uploaded ${formatDate(d.uploadedAt)}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <a
                          href={d.dataUrl || "#"}
                          download={d.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Download PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(d.id)}
                          className="text-muted-foreground hover:text-red-600 text-xs transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          <Button type="submit" className="w-full" size="lg">Save institution profile</Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
