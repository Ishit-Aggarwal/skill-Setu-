"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import {
  getAssessment,
  getPortfolio,
  savePortfolio,
  listApplicationsForStudent,
  listCredentialsForStudent,
} from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { profileStrength } from "../../lib/profile";
import { formatDate } from "../../lib/match";
import { useNav } from "../../lib/nav";
import { Badge, Button, Card, EmptyState, Field, ProgressRing, Section, Select, StatGrid, Tabs, TextArea, TextInput } from "../ui/Kit";

const levelTone = {
  Advanced: "primary",
  Proficient: "blue",
  Intermediate: "amber",
  Beginner: "muted",
};

const SKILL_LEVELS = ["Beginner", "Intermediate", "Proficient", "Advanced"];

/* Deliberately cross-sector. The old list was three hard-coded categories that
   only fitted a technical CV; a student can also type their own, and any
   category already on their portfolio stays offered even if it isn't here. */
const DEFAULT_SKILL_CATEGORIES = [
  "Technical Skills",
  "Tools & Software",
  "Analytical & Research",
  "Clinical & Practical",
  "Business & Communication",
  "Design & Creative",
  "Languages",
];

const typeTone = {
  Education: "blue",
  Internship: "green",
  Research: "purple",
  Publication: "amber",
  Achievement: "primary",
  Volunteering: "muted",
};

const typeIcon = {
  Education: "🎓",
  Internship: "💼",
  Research: "🔬",
  Publication: "📄",
  Achievement: "🏆",
  Volunteering: "🤝",
};

const emptyPortfolio = {
  bio: "",
  headline: "",
  location: "",
  links: {},
  skillBadges: {},
  certifications: [],
  projects: [],
  education: [],
  timeline: [],
  documents: [],
};

const MAX_DOC_BYTES = 2 * 1024 * 1024;
const DOC_TYPES = ["Resume", "Degree / Marksheet", "Transcript", "ID Proof", "Offer Letter", "Recommendation", "Other"];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Small inline "remove this row" control, used by every editable list below. */
function RemoveButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="text-xs text-muted-foreground hover:text-red-600 transition-colors flex-shrink-0 px-1"
    >
      Remove
    </button>
  );
}

export default function StudentPortfolio() {
  const { user, updateProfile } = useAuth();
  const navigate = useNav();
  const [portfolio, setPortfolio] = useState(emptyPortfolio);
  const [assessment, setAssessment] = useState(null);
  const [applications, setApplications] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [activeSection, setActiveSection] = useState("skills");
  const [printing, setPrinting] = useState(false);
  const [showAdd, setShowAdd] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [skillForm, setSkillForm] = useState({ category: DEFAULT_SKILL_CATEGORIES[0], customCategory: "", name: "", level: "Proficient" });
  const [certForm, setCertForm] = useState({ name: "", issuer: "", year: "", score: "", credentialUrl: "" });
  const [certFile, setCertFile] = useState(null);
  const [projectForm, setProjectForm] = useState({ title: "", description: "", tags: "", link: "", year: "" });
  const [eduForm, setEduForm] = useState({ degree: "", institution: "", startYear: "", endYear: "", score: "" });
  const [timelineForm, setTimelineForm] = useState({ year: "", title: "", org: "", type: "Internship", detail: "" });
  const [docType, setDocType] = useState("Resume");

  // The bio used to hit localStorage on every keystroke. It is still saved
  // automatically — just once the typing stops.
  const bioTimer = useRef(null);
  const [bioDraft, setBioDraft] = useState("");

  function reload(uid) {
    const existing = getPortfolio(uid);
    setPortfolio(existing ? { ...emptyPortfolio, ...existing } : emptyPortfolio);
    setBioDraft(existing?.bio || "");
    setAssessment(getAssessment(uid));
    setApplications(listApplicationsForStudent(uid));
    setCredentials(listCredentialsForStudent(uid));
  }

  useEffect(() => {
    if (!user) return;
    reload(user.id);

    const unsub = subscribeToMutations(["applications", "credentials", "assessments"], () => {
      setApplications(listApplicationsForStudent(user.id));
      setCredentials(listCredentialsForStudent(user.id));
      setAssessment(getAssessment(user.id));
    });
    return () => {
      unsub();
      if (bioTimer.current) clearTimeout(bioTimer.current);
    };
  }, [user]);

  function persist(patch) {
    setPortfolio((prev) => ({ ...prev, ...patch }));
    savePortfolio(user.id, patch);
  }

  function handleBioChange(value) {
    setBioDraft(value);
    if (bioTimer.current) clearTimeout(bioTimer.current);
    bioTimer.current = setTimeout(() => persist({ bio: value }), 500);
  }

  function handlePrint() {
    setPrinting(true);
    window.print();
    setTimeout(() => setPrinting(false), 2500);
  }

  /* ---------------- Skills ---------------- */

  function addSkill(e) {
    e.preventDefault();
    const category = (skillForm.category === "__custom" ? skillForm.customCategory : skillForm.category).trim();
    if (!skillForm.name.trim() || !category) return;
    const next = { ...(portfolio.skillBadges || {}) };
    next[category] = [...(next[category] || []), { name: skillForm.name.trim(), level: skillForm.level }];
    persist({ skillBadges: next });
    setSkillForm((f) => ({ ...f, name: "" }));
    setShowAdd(null);
  }

  function removeSkill(category, index) {
    const next = { ...(portfolio.skillBadges || {}) };
    next[category] = (next[category] || []).filter((_, i) => i !== index);
    if (!next[category].length) delete next[category];
    persist({ skillBadges: next });
  }

  /* ---------------- Certifications ---------------- */

  async function handleCertFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      setError("Certificate files must be under 2MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    const dataUrl = await readFileAsDataUrl(file);
    setCertFile({ fileName: file.name, size: file.size, dataUrl });
  }

  function addCert(e) {
    e.preventDefault();
    if (!certForm.name.trim()) return;
    persist({
      certifications: [
        ...(portfolio.certifications || []),
        {
          id: newId("cert"),
          ...certForm,
          ...(certFile ? { fileName: certFile.fileName, fileSize: certFile.size, dataUrl: certFile.dataUrl } : {}),
        },
      ],
    });
    setCertForm({ name: "", issuer: "", year: "", score: "", credentialUrl: "" });
    setCertFile(null);
    setShowAdd(null);
  }

  function removeCert(index) {
    persist({ certifications: (portfolio.certifications || []).filter((_, i) => i !== index) });
  }

  /* ---------------- Projects ---------------- */

  function addProject(e) {
    e.preventDefault();
    if (!projectForm.title.trim()) return;
    persist({
      projects: [
        ...(portfolio.projects || []),
        {
          id: newId("proj"),
          ...projectForm,
          tags: projectForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        },
      ],
    });
    setProjectForm({ title: "", description: "", tags: "", link: "", year: "" });
    setShowAdd(null);
  }

  function removeProject(id) {
    persist({ projects: (portfolio.projects || []).filter((p) => p.id !== id) });
  }

  /* ---------------- Education ---------------- */

  function addEducation(e) {
    e.preventDefault();
    if (!eduForm.degree.trim()) return;
    persist({ education: [...(portfolio.education || []), { id: newId("edu"), ...eduForm }] });
    setEduForm({ degree: "", institution: "", startYear: "", endYear: "", score: "" });
    setShowAdd(null);
  }

  function removeEducation(id) {
    persist({ education: (portfolio.education || []).filter((e2) => e2.id !== id) });
  }

  /* ---------------- Experience timeline ---------------- */

  function addTimeline(e) {
    e.preventDefault();
    if (!timelineForm.title.trim()) return;
    persist({ timeline: [...(portfolio.timeline || []), { id: newId("tl"), ...timelineForm }] });
    setTimelineForm({ year: "", title: "", org: "", type: "Internship", detail: "" });
    setShowAdd(null);
  }

  function removeTimeline(index) {
    persist({ timeline: (portfolio.timeline || []).filter((_, i) => i !== index) });
  }

  /* ---------------- Documents ---------------- */

  async function handleDocUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      setError("Please choose a file under 2MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setUploading(true);
    const dataUrl = await readFileAsDataUrl(file);
    persist({
      documents: [
        ...(portfolio.documents || []),
        { id: newId("doc"), type: docType, fileName: file.name, size: file.size, dataUrl, uploadedAt: new Date().toISOString() },
      ],
    });
    setUploading(false);
    e.target.value = "";
  }

  function removeDoc(id) {
    persist({ documents: (portfolio.documents || []).filter((d) => d.id !== id) });
  }

  /* ---------------- Derived ---------------- */

  const strength = useMemo(
    () => profileStrength({ assessment, portfolio, applications, credentials }),
    [assessment, portfolio, applications, credentials]
  );

  const certCount = (portfolio.certifications?.length || 0) + credentials.length;
  const projectCount = portfolio.projects?.length || 0;
  const avgMatch = applications.length
    ? Math.round(applications.reduce((s, a) => s + (a.match || 0), 0) / applications.length)
    : 0;

  const skillCategories = useMemo(
    () => [...new Set([...DEFAULT_SKILL_CATEGORIES, ...Object.keys(portfolio.skillBadges || {})])],
    [portfolio.skillBadges]
  );

  const userInitials = (user.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const links = [
    user.linkedIn && { label: "LinkedIn", href: user.linkedIn, icon: "in" },
    user.github && { label: "GitHub", href: user.github, icon: "gh" },
    user.website && { label: "Website", href: user.website, icon: "🌐" },
  ].filter(Boolean);

  return (
    <DashboardLayout activePage="student-portfolio" title="My Portfolio">
      <div className="max-w-3xl mx-auto animate-fade-slide space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/80 to-accent/60 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 60%)" }} />
          </div>
          <div className="px-6 pb-6 -mt-10 relative">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold border-4 border-card shadow-md overflow-hidden">
                  {user.avatarDataUrl ? <img src={user.avatarDataUrl} alt="" className="w-full h-full object-cover" /> : userInitials}
                </div>
                <div className="pb-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {user.headline || [user.course, user.year].filter(Boolean).join(" · ") || "Student"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[user.institution, user.department].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <Link
                  href="/portfolio/resume"
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary hover:bg-accent text-white hover:shadow-md transition-all duration-200"
                >
                  <span>📄 Generate ATS Resume</span>
                </Link>
                <button
                  onClick={handlePrint}
                  title="Print this portfolio"
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border border-border transition-all duration-200 ${
                    printing ? "bg-green-50 text-green-600 border-green-200" : "bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  <span>🖨️</span>
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">About</label>
              <textarea
                value={bioDraft}
                onChange={(e) => handleBioChange(e.target.value)}
                placeholder="Write a short bio about your interests, strengths and what you're looking for…"
                rows={3}
                className="w-full text-sm text-muted-foreground leading-relaxed bg-transparent border border-dashed border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span>📧 {user.email}</span>
              {user.phone && <span>📞 {user.phone}</span>}
              {(user.location || user.city) && <span>📍 {user.location || user.city}</span>}
              <button
                onClick={() => updateProfile({ openToOpportunities: !(user.openToOpportunities !== false) })}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                title="Toggle whether recruiters can find you in the talent pool"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    user.openToOpportunities !== false ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                {user.openToOpportunities !== false ? "Open to opportunities" : "Not currently looking"}
              </button>
            </div>

            {links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <Card className="flex flex-wrap items-center gap-5">
          <ProgressRing value={strength.percent} tone="primary" size={92} sublabel="Profile strength" />
          <div className="flex-1 min-w-[14rem]">
            <h3 className="font-semibold text-foreground text-sm mb-1">
              {strength.percent >= 100 ? "Your profile is complete" : `${strength.missing.length} thing${strength.missing.length === 1 ? "" : "s"} left`}
            </h3>
            {strength.percent >= 100 ? (
              <p className="text-xs text-muted-foreground">Recruiters see the full picture. Keep it current as you go.</p>
            ) : (
              <ul className="space-y-1.5 mt-2">
                {strength.missing.slice(0, 3).map((item) => (
                  <li key={item.key} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <button
                      onClick={() => (item.action === "student-portfolio" ? null : navigate(item.action))}
                      className="text-left text-xs text-foreground hover:text-primary transition-colors"
                    >
                      <span className="font-medium">{item.label}</span>{" "}
                      <span className="text-muted-foreground">— {item.detail}</span>
                      <span className="text-muted-foreground"> (+{item.weight}%)</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <StatGrid
          columns={4}
          stats={[
            { label: "Skill Score", value: assessment ? `${Math.round(assessment.overallScore)}/100` : "—", icon: "🎯", tone: "primary" },
            { label: "Certificates", value: String(certCount), icon: "🏅", tone: "amber" },
            { label: "Projects", value: String(projectCount), icon: "🛠", tone: "purple" },
            { label: "Avg Match", value: `${avgMatch}%`, icon: "📈", tone: "green" },
          ]}
        />

        <Tabs
          className="w-full"
          tabs={[
            { key: "skills", label: "Skills" },
            { key: "projects", label: "Projects" },
            { key: "education", label: "Education" },
            { key: "certs", label: "Certificates" },
            { key: "timeline", label: "Experience" },
            { key: "documents", label: "Documents" },
          ]}
          value={activeSection}
          onChange={(key) => { setActiveSection(key); setShowAdd(null); }}
        />

        {activeSection === "skills" && (
          <div className="space-y-4 animate-fade-slide">
            {Object.keys(portfolio.skillBadges || {}).length === 0 && (
              <EmptyState icon="🧩" title="No skills added yet">
                Skills are matched against the requirements on every posting — add the ones you can back up.
              </EmptyState>
            )}
            {Object.entries(portfolio.skillBadges || {}).map(([category, skills]) => (
              <Card key={category}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <span
                      key={`${skill.name}-${i}`}
                      className="group inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20"
                    >
                      {skill.name}
                      <span className="opacity-60 text-[10px]">· {skill.level}</span>
                      <button
                        onClick={() => removeSkill(category, i)}
                        aria-label={`Remove ${skill.name}`}
                        className="opacity-40 hover:opacity-100 hover:text-red-600 transition-opacity leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </Card>
            ))}

            {showAdd === "skill" ? (
              <Card>
                <form onSubmit={addSkill} className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Category">
                      <Select value={skillForm.category} onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))}>
                        {skillCategories.map((c) => <option key={c}>{c}</option>)}
                        <option value="__custom">+ New category…</option>
                      </Select>
                    </Field>
                    <Field label="Level">
                      <Select value={skillForm.level} onChange={(e) => setSkillForm((f) => ({ ...f, level: e.target.value }))}>
                        {SKILL_LEVELS.map((l) => <option key={l}>{l}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {skillForm.category === "__custom" && (
                    <Field label="New category name">
                      <TextInput
                        value={skillForm.customCategory}
                        onChange={(e) => setSkillForm((f) => ({ ...f, customCategory: e.target.value }))}
                        placeholder="e.g. Laboratory Techniques"
                        required
                      />
                    </Field>
                  )}
                  <Field label="Skill">
                    <TextInput
                      value={skillForm.name}
                      onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Python, Financial Modelling, Patient Counselling"
                      required
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add skill</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <button onClick={() => setShowAdd("skill")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add skill</button>
            )}
          </div>
        )}

        {activeSection === "projects" && (
          <div className="space-y-3 animate-fade-slide">
            {projectCount === 0 && (
              <EmptyState icon="🛠" title="No projects yet">
                A project is the fastest way to show what you can actually do — coursework counts.
              </EmptyState>
            )}
            {(portfolio.projects || []).map((p) => (
              <Card key={p.id} hover>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.title}</span>
                      {p.year && <Badge tone="muted">{p.year}</Badge>}
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{p.description}</p>}
                    {(p.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                      </div>
                    )}
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">
                        View project ↗
                      </a>
                    )}
                  </div>
                  <RemoveButton onClick={() => removeProject(p.id)} label={`Remove ${p.title}`} />
                </div>
              </Card>
            ))}

            {showAdd === "project" ? (
              <Card>
                <form onSubmit={addProject} className="space-y-3">
                  <Field label="Title">
                    <TextInput value={projectForm.title} onChange={(e) => setProjectForm((f) => ({ ...f, title: e.target.value }))} placeholder="Campus placement analytics dashboard" required />
                  </Field>
                  <Field label="What you built and why">
                    <TextArea rows={3} value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} placeholder="One or two lines on the problem, your approach and the outcome." />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Skills used" hint="Comma separated.">
                      <TextInput value={projectForm.tags} onChange={(e) => setProjectForm((f) => ({ ...f, tags: e.target.value }))} placeholder="React, SQL, Data Visualisation" />
                    </Field>
                    <Field label="Year">
                      <TextInput value={projectForm.year} onChange={(e) => setProjectForm((f) => ({ ...f, year: e.target.value }))} placeholder="2026" />
                    </Field>
                  </div>
                  <Field label="Link" hint="Repository, demo or write-up. Optional.">
                    <TextInput value={projectForm.link} onChange={(e) => setProjectForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://…" />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add project</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <button onClick={() => setShowAdd("project")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add project</button>
            )}
          </div>
        )}

        {activeSection === "education" && (
          <div className="space-y-3 animate-fade-slide">
            {(portfolio.education || []).length === 0 && (
              <EmptyState icon="🎓" title="No education entries yet">
                Add your degree, school and results so recruiters don&apos;t have to ask.
              </EmptyState>
            )}
            {(portfolio.education || []).map((ed) => (
              <Card key={ed.id} className="flex items-center gap-4" hover>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">🎓</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{ed.degree}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[ed.institution, [ed.startYear, ed.endYear].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {ed.score && <Badge tone="primary">{ed.score}</Badge>}
                <RemoveButton onClick={() => removeEducation(ed.id)} label={`Remove ${ed.degree}`} />
              </Card>
            ))}

            {showAdd === "education" ? (
              <Card>
                <form onSubmit={addEducation} className="space-y-3">
                  <Field label="Degree / Programme">
                    <TextInput value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} placeholder="B.Tech Computer Science" required />
                  </Field>
                  <Field label="Institution / Board">
                    <TextInput value={eduForm.institution} onChange={(e) => setEduForm((f) => ({ ...f, institution: e.target.value }))} placeholder={user.institution || "University name"} />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="From">
                      <TextInput value={eduForm.startYear} onChange={(e) => setEduForm((f) => ({ ...f, startYear: e.target.value }))} placeholder="2023" />
                    </Field>
                    <Field label="To">
                      <TextInput value={eduForm.endYear} onChange={(e) => setEduForm((f) => ({ ...f, endYear: e.target.value }))} placeholder="2027" />
                    </Field>
                    <Field label="Score">
                      <TextInput value={eduForm.score} onChange={(e) => setEduForm((f) => ({ ...f, score: e.target.value }))} placeholder="8.4 CGPA" />
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add education</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <button onClick={() => setShowAdd("education")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add education</button>
            )}
          </div>
        )}

        {activeSection === "certs" && (
          <div className="space-y-5 animate-fade-slide">
            {/* Issued on the platform — the student can't edit these, which is
                exactly what makes them worth more than a self-declared line. */}
            <Section
              title="Issued to you"
              description="Certificates awarded by companies, institutions and faculty on Skill Setu. Verified — you can print or share them, but not edit them."
            >
              {credentials.length === 0 ? (
                <Card>
                  <p className="text-xs text-muted-foreground">
                    Nothing yet. Complete a hosted skill test or an internship and the issuer can award you a verified certificate here.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {credentials.map((c) => (
                    <Card key={c.id} className="flex flex-wrap items-center gap-4" hover>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl flex-shrink-0">🏅</div>
                      <div className="flex-1 min-w-[10rem]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{c.title}</span>
                          <Badge tone="green">Verified</Badge>
                          <Badge tone="muted">{c.kind}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {c.issuer} · Issued {formatDate(c.issuedAt)} · {c.certificateNo}
                        </div>
                      </div>
                      {c.score && <Badge tone="primary">{c.score}</Badge>}
                      <Link
                        href={`/certificate/${c.id}`}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-accent transition-colors flex-shrink-0"
                      >
                        View / Print PDF
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </Section>

            <Section
              title="Added by you"
              description="Certificates you earned elsewhere. Attach the PDF or image so a recruiter can open the proof from your profile."
            >
              <div className="space-y-2.5">
                {(portfolio.certifications || []).length === 0 && (
                  <Card>
                    <p className="text-xs text-muted-foreground">No certifications added yet.</p>
                  </Card>
                )}
                {(portfolio.certifications || []).map((cert, i) => (
                  <Card key={cert.id || i} className="flex flex-wrap items-center gap-4" hover>
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">🎓</div>
                    <div className="flex-1 min-w-[10rem]">
                      <div className="text-sm font-semibold text-foreground">{cert.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[cert.issuer, cert.year].filter(Boolean).join(" · ") || "—"}
                        {cert.fileName && <span> · {cert.fileName} ({formatBytes(cert.fileSize)})</span>}
                      </div>
                    </div>
                    {cert.score && <Badge tone="primary">{cert.score}</Badge>}
                    {cert.dataUrl && (
                      <a
                        href={cert.dataUrl}
                        download={cert.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                      >
                        Open PDF
                      </a>
                    )}
                    {!cert.dataUrl && cert.credentialUrl && (
                      <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex-shrink-0">
                        Verify ↗
                      </a>
                    )}
                    <RemoveButton onClick={() => removeCert(i)} label={`Remove ${cert.name}`} />
                  </Card>
                ))}

                {showAdd === "cert" ? (
                  <Card>
                    <form onSubmit={addCert} className="space-y-3">
                      <Field label="Certification name">
                        <TextInput value={certForm.name} onChange={(e) => setCertForm((f) => ({ ...f, name: e.target.value }))} placeholder="AWS Cloud Practitioner" required />
                      </Field>
                      <Field label="Issuing body">
                        <TextInput value={certForm.issuer} onChange={(e) => setCertForm((f) => ({ ...f, issuer: e.target.value }))} placeholder="Amazon Web Services" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Year">
                          <TextInput value={certForm.year} onChange={(e) => setCertForm((f) => ({ ...f, year: e.target.value }))} placeholder="2026" />
                        </Field>
                        <Field label="Score / Grade">
                          <TextInput value={certForm.score} onChange={(e) => setCertForm((f) => ({ ...f, score: e.target.value }))} placeholder="892 / 1000" />
                        </Field>
                      </div>
                      <Field label="Verification link" hint="Optional — the issuer's own verification page.">
                        <TextInput value={certForm.credentialUrl} onChange={(e) => setCertForm((f) => ({ ...f, credentialUrl: e.target.value }))} placeholder="https://…" />
                      </Field>
                      <Field label="Certificate file" hint="PDF or image, under 2MB. Recruiters open this straight from your profile.">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors">
                            {certFile ? "Choose a different file" : "Attach PDF / image"}
                            <input type="file" accept=".pdf,image/*" onChange={handleCertFile} className="hidden" />
                          </label>
                          {certFile && (
                            <span className="text-xs text-muted-foreground truncate">
                              {certFile.fileName} ({formatBytes(certFile.size)})
                              <button type="button" onClick={() => setCertFile(null)} className="ml-2 text-muted-foreground hover:text-red-600">
                                remove
                              </button>
                            </span>
                          )}
                        </div>
                      </Field>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">Add certification</Button>
                        <Button type="button" variant="outline" onClick={() => { setShowAdd(null); setCertFile(null); }}>Cancel</Button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  <button onClick={() => setShowAdd("cert")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add certification</button>
                )}
              </div>
            </Section>
          </div>
        )}

        {activeSection === "timeline" && (
          <div className="animate-fade-slide space-y-4">
            {(portfolio.timeline || []).length === 0 && (
              <EmptyState icon="🧭" title="No experience added yet">
                Internships, research stints, part-time roles and volunteering all belong here.
              </EmptyState>
            )}
            <div className="relative">
              {(portfolio.timeline || []).length > 0 && <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-border" />}
              <div className="space-y-4">
                {[...(portfolio.timeline || [])]
                  .map((item, index) => ({ item, index }))
                  .reverse()
                  .map(({ item, index }) => (
                    <div key={item.id || index} className="relative flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-xl flex-shrink-0 z-10 shadow-sm">
                        {typeIcon[item.type] || "📌"}
                      </div>
                      <Card className="flex-1" hover>
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="text-sm font-semibold text-foreground">{item.title}</div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge tone={typeTone[item.type] ?? "muted"}>{item.type}</Badge>
                            <span className="text-xs font-semibold text-muted-foreground">{item.year}</span>
                            <RemoveButton onClick={() => removeTimeline(index)} label={`Remove ${item.title}`} />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">{item.org}</div>
                        {item.detail && <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{item.detail}</p>}
                      </Card>
                    </div>
                  ))}
              </div>
            </div>

            {showAdd === "timeline" ? (
              <Card>
                <form onSubmit={addTimeline} className="space-y-3">
                  <Field label="Title">
                    <TextInput value={timelineForm.title} onChange={(e) => setTimelineForm((f) => ({ ...f, title: e.target.value }))} placeholder="Summer Research Assistant" required />
                  </Field>
                  <Field label="Organisation">
                    <TextInput value={timelineForm.org} onChange={(e) => setTimelineForm((f) => ({ ...f, org: e.target.value }))} placeholder="Where you did it" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Year">
                      <TextInput value={timelineForm.year} onChange={(e) => setTimelineForm((f) => ({ ...f, year: e.target.value }))} placeholder="2026" />
                    </Field>
                    <Field label="Type">
                      <Select value={timelineForm.type} onChange={(e) => setTimelineForm((f) => ({ ...f, type: e.target.value }))}>
                        {Object.keys(typeTone).map((t) => <option key={t}>{t}</option>)}
                      </Select>
                    </Field>
                  </div>
                  <Field label="What you did" hint="Optional — one or two lines.">
                    <TextArea rows={2} value={timelineForm.detail} onChange={(e) => setTimelineForm((f) => ({ ...f, detail: e.target.value }))} />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add entry</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <button onClick={() => setShowAdd("timeline")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add experience</button>
            )}
          </div>
        )}

        {activeSection === "documents" && (
          <div className="space-y-3 animate-fade-slide">
            {(portfolio.documents || []).length === 0 && (
              <EmptyState icon="📁" title="No documents uploaded yet">
                Your résumé is the one recruiters open from every application — start there.
              </EmptyState>
            )}

            {(portfolio.documents || []).map((doc) => (
              <Card key={doc.id} className="flex flex-wrap items-center gap-4" hover>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">📄</div>
                <div className="flex-1 min-w-[10rem]">
                  <div className="text-sm font-semibold text-foreground truncate">{doc.fileName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {doc.type} · {formatBytes(doc.size)} · Uploaded {formatDate(doc.uploadedAt)}
                  </div>
                </div>
                <a href={doc.dataUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline flex-shrink-0">View</a>
                <a href={doc.dataUrl} download={doc.fileName} className="text-xs font-medium text-primary hover:underline flex-shrink-0">Download</a>
                <RemoveButton onClick={() => removeDoc(doc.id)} label={`Remove ${doc.fileName}`} />
              </Card>
            ))}

            <Card className="space-y-3">
              <div className="text-sm font-semibold text-foreground">Upload a document</div>
              <p className="text-xs text-muted-foreground">Résumé, degree certificate, transcript or ID proof. PDF or image, under 2MB.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
                <label className="flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer text-center transition-colors">
                  {uploading ? "Uploading…" : "Choose file"}
                  <input type="file" accept=".pdf,image/*" onChange={handleDocUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
