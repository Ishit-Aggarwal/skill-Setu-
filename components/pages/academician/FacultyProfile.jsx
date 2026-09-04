"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, Field, Flash, PageHeader, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { COLLAB_EXPERTISE, DEPARTMENTS } from "../../../lib/domains";
import { listAdvisees, listCollabListingsByOwner, listPrograms, listResearchOutputs } from "../../../lib/store";

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Reader", "Lecturer", "Research Officer", "Head of Department", "Dean"];

/**
 * A faculty profile with enough substance to actually match on. The previous
 * version stored three fields (name, institution, department) which meant
 * Research Collabs had literally no data to match collaborators against.
 */
export default function FacultyProfile() {
  const { user, updateProfile } = useAuth();
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useFlash();
  const [form, setForm] = useState({
    name: "",
    designation: DESIGNATIONS[1],
    institution: "",
    department: "",
    email: "",
    phone: "",
    experienceYears: "",
    bio: "",
    linkedIn: "",
    scholarUrl: "",
    orcid: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      designation: user.designation || DESIGNATIONS[1],
      institution: user.institution || "",
      department: user.department || "",
      email: user.email || "",
      phone: user.phone || "",
      experienceYears: user.experienceYears || "",
      bio: user.bio || "",
      linkedIn: user.linkedIn || "",
      scholarUrl: user.scholarUrl || "",
      orcid: user.orcid || "",
    });
    setSubjects(user.subjectsTaught || []);
    setInterests(user.researchInterests || []);
    setReady(true);
  }, [user]);

  const outputs = useMemo(() => (ready && user ? listResearchOutputs(user.id) : []), [user, ready]);
  const listings = useMemo(() => (ready && user ? listCollabListingsByOwner(user.id) : []), [user, ready]);
  const advisees = useMemo(() => (ready && user ? listAdvisees(user.id) : []), [user, ready]);
  const programs = useMemo(() => (ready && user ? listPrograms().filter((p) => p.ownerId === user.id) : []), [user, ready]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function addSubject() {
    const value = subjectDraft.trim();
    if (!value || subjects.includes(value)) return;
    setSubjects((s) => [...s, value]);
    setSubjectDraft("");
  }

  function submit(e) {
    e.preventDefault();
    updateProfile({ ...form, subjectsTaught: subjects, researchInterests: interests });
    setFlash("Faculty profile saved.");
  }

  const completeness = useMemo(() => {
    const checks = [
      form.name,
      form.designation,
      form.department,
      form.email,
      form.experienceYears,
      form.bio,
      subjects.length,
      interests.length,
      form.scholarUrl || form.orcid || form.linkedIn,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, subjects, interests]);

  if (!ready) return null;

  return (
    <DashboardLayout activePage="academician-profile" title="Faculty Profile">
      <div className="animate-fade-slide max-w-3xl space-y-5">
        <PageHeader
          title="Faculty Profile"
          subtitle="Your research interests here are what Research Collabs matches listings against — an empty profile means no matches."
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Profile completeness", value: `${completeness}%`, icon: "📋" },
            { label: "Publications & patents", value: String(outputs.length), icon: "📄", hint: `${outputs.filter((o) => o.type === "Patent").length} patent(s)` },
            { label: "Ongoing projects", value: String(listings.length), icon: "🔬" },
            { label: "Advisees mentored", value: String(advisees.length), icon: "🎓", hint: `${programs.length} programme(s) hosted` },
          ]}
        />

        <form onSubmit={submit} className="space-y-5">
          <Card>
            <div className="flex items-center gap-4 mb-5">
              <Avatar name={form.name} size={64} src={user?.avatarDataUrl} />
              <div className="min-w-0">
                <div className="text-lg font-semibold text-foreground truncate">{form.name || "Your name"}</div>
                <div className="text-sm text-muted-foreground truncate">{form.designation} · {form.department || "Department"}</div>
                <div className="text-xs text-muted-foreground truncate">{form.institution}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Full name"><TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
                <Field label="Designation">
                  <Select value={form.designation} onChange={(e) => set("designation", e.target.value)}>
                    {[...new Set([...DESIGNATIONS, form.designation].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label="Institution"><TextInput value={form.institution} onChange={(e) => set("institution", e.target.value)} /></Field>
                <Field label="Department">
                  <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
                    <option value="">Select a department</option>
                    {[...new Set([...DEPARTMENTS, form.department].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                <Field label="Phone"><TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                <Field label="Years of experience"><TextInput type="number" min="0" value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} placeholder="14" /></Field>
              </div>
              <Field label="Short bio" hint="Shown to students booking mentoring and to prospective collaborators.">
                <TextArea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Clinical and research focus, notable work, what you'd like to collaborate on." />
              </Field>
            </div>
          </Card>

          <Card>
            <Section title="Subjects taught" description="Helps students find the right faculty member for mentoring.">
              <div className="flex flex-wrap gap-2 mb-3">
                {subjects.length === 0 && <span className="text-sm text-muted-foreground">None added yet.</span>}
                {subjects.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 bg-primary/8 text-primary rounded-full pl-3 pr-2 py-1.5 text-xs font-medium">
                    {s}
                    <button type="button" onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))} aria-label={`Remove ${s}`}>×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <TextInput
                  value={subjectDraft}
                  onChange={(e) => setSubjectDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
                  placeholder="Dravyaguna Vigyan"
                />
                <Button type="button" variant="outline" onClick={addSubject}>Add</Button>
              </div>
            </Section>
          </Card>

          <Card>
            <Section
              title="Research interests"
              description="This is the matching signal for Research Collabs — listings tagged with an interest you've selected are highlighted as a match for you."
            >
              <div className="flex flex-wrap gap-2">
                {COLLAB_EXPERTISE.map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setInterests((prev) => (prev.includes(x) ? prev.filter((v) => v !== x) : [...prev, x]))}
                    className={`text-[11px] px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      interests.includes(x) ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {x}
                  </button>
                ))}
              </div>
              {interests.length === 0 && (
                <p className="text-xs text-amber-600 mt-3">
                  No interests selected — Research Collabs has nothing to match you on. Pick at least two.
                </p>
              )}
            </Section>
          </Card>

          <Card>
            <Section title="Academic profiles" description="Public links other researchers can verify you against.">
              <div className="space-y-3">
                <Field label="Google Scholar"><TextInput value={form.scholarUrl} onChange={(e) => set("scholarUrl", e.target.value)} placeholder="https://scholar.google.com/citations?user=…" /></Field>
                <Field label="ORCID"><TextInput value={form.orcid} onChange={(e) => set("orcid", e.target.value)} placeholder="0000-0002-1825-0097" /></Field>
                <Field label="LinkedIn"><TextInput value={form.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
              </div>
            </Section>
          </Card>

          {outputs.length > 0 && (
            <Card>
              <Section title="Publication record" description="Logged from the Research Collabs page — shown here as your credibility summary.">
                <div className="space-y-2">
                  {outputs.map((o) => (
                    <div key={o.id} className="flex items-start gap-3">
                      <Badge tone={o.type === "Patent" ? "purple" : "primary"}>{o.type}</Badge>
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">{o.title}</div>
                        <div className="text-[11px] text-muted-foreground">{o.venue}{o.year ? ` · ${o.year}` : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </Card>
          )}

          <Button type="submit" className="w-full" size="lg">Save profile</Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
