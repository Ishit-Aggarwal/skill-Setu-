"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { getAssessment, getPortfolio, savePortfolio, listApplicationsForStudent } from "../../lib/store";

const levelColor = {
  Advanced: "bg-primary/10 text-primary border-primary/20",
  Proficient: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800",
  Intermediate: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800",
};

const typeColor = {
  Education: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
  Internship: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  Research: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
  Publication: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  Achievement: "bg-olive-100 text-olive-700 dark:bg-olive-900/30 dark:text-olive-300",
};

const typeIcon = { Education: "🎓", Internship: "💼", Research: "🔬", Publication: "📄", Achievement: "🏆" };

const emptyPortfolio = { bio: "", skillBadges: {}, certifications: [], timeline: [], documents: [] };
const MAX_DOC_BYTES = 2 * 1024 * 1024;
const DOC_TYPES = ["Resume", "Degree / Marksheet", "ID Proof", "Other"];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentPortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(emptyPortfolio);
  const [assessment, setAssessment] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activeSection, setActiveSection] = useState("skills");
  const [downloaded, setDownloaded] = useState(false);

  const [skillForm, setSkillForm] = useState({ category: "Technical Skills", name: "", level: "Proficient" });
  const [certForm, setCertForm] = useState({ name: "", issuer: "", year: "", score: "" });
  const [timelineForm, setTimelineForm] = useState({ year: "", title: "", org: "", type: "Internship" });
  const [showAdd, setShowAdd] = useState(null);
  const [docType, setDocType] = useState("Resume");
  const [docError, setDocError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const existing = getPortfolio(user.id);
    setPortfolio(existing || emptyPortfolio);
    setAssessment(getAssessment(user.id));
    setApplications(listApplicationsForStudent(user.id));
  }, [user]);

  function persist(patch) {
    const merged = { ...portfolio, ...patch };
    setPortfolio(merged);
    savePortfolio(user.id, patch);
  }

  function handleDownload() {
    setDownloaded(true);
    window.print();
    setTimeout(() => setDownloaded(false), 2500);
  }

  function addSkill(e) {
    e.preventDefault();
    if (!skillForm.name.trim()) return;
    const next = { ...(portfolio.skillBadges || {}) };
    next[skillForm.category] = [...(next[skillForm.category] || []), { name: skillForm.name, level: skillForm.level }];
    persist({ skillBadges: next });
    setSkillForm({ ...skillForm, name: "" });
    setShowAdd(null);
  }

  function addCert(e) {
    e.preventDefault();
    if (!certForm.name.trim()) return;
    persist({ certifications: [...(portfolio.certifications || []), { ...certForm }] });
    setCertForm({ name: "", issuer: "", year: "", score: "" });
    setShowAdd(null);
  }

  function addTimeline(e) {
    e.preventDefault();
    if (!timelineForm.title.trim()) return;
    persist({ timeline: [...(portfolio.timeline || []), { ...timelineForm }] });
    setTimelineForm({ year: "", title: "", org: "", type: "Internship" });
    setShowAdd(null);
  }

  async function handleDocUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      setDocError("Please choose a file under 2MB.");
      return;
    }
    setDocError(null);
    setUploading(true);
    const dataUrl = await readFileAsDataUrl(file);
    persist({
      documents: [
        ...(portfolio.documents || []),
        { id: `doc_${Date.now()}`, type: docType, fileName: file.name, dataUrl, uploadedAt: new Date().toISOString() },
      ],
    });
    setUploading(false);
    e.target.value = "";
  }

  function removeDoc(id) {
    persist({ documents: (portfolio.documents || []).filter((d) => d.id !== id) });
  }

  const certCount = portfolio.certifications?.length || 0;
  const publicationCount = (portfolio.timeline || []).filter((t) => t.type === "Publication").length;
  const avgMatch = applications.length ? Math.round(applications.reduce((s, a) => s + (a.match || 0), 0) / applications.length) : 0;

  const userInitials = (user.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <DashboardLayout activePage="student-portfolio" title="My Portfolio">
      <div className="max-w-3xl mx-auto animate-fade-slide space-y-6">
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
                <div className="pb-1">
                  <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
                  <p className="text-sm text-muted-foreground">{[user.course, user.year].filter(Boolean).join(" · ") || "Student"} · {user.institution}</p>
                </div>
              </div>
              <button onClick={handleDownload} className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-200 flex-shrink-0 ${downloaded ? "bg-green-50 text-green-600 dark:bg-green-950/30" : "bg-primary hover:bg-accent text-white hover:shadow-md"}`}>
                {downloaded ? "Preparing PDF…" : "Download Resume"}
              </button>
            </div>

            <div className="mt-4">
              <textarea
                value={portfolio.bio || ""}
                onChange={(e) => persist({ bio: e.target.value })}
                placeholder="Write a short bio about your interests and goals…"
                rows={2}
                className="w-full text-sm text-muted-foreground leading-relaxed max-w-xl bg-transparent border border-dashed border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>📧 {user.email}</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Open to internships
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Skill Score", value: assessment ? String(Math.round(assessment.overallScore)) : "—", unit: assessment ? "/100" : "" },
            { label: "Certifications", value: String(certCount), unit: "" },
            { label: "Publications", value: String(publicationCount), unit: "" },
            { label: "Avg Match", value: String(avgMatch), unit: "%" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-primary">{s.value}<span className="text-xs font-normal text-muted-foreground">{s.unit}</span></div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex bg-secondary rounded-xl p-1">
          {[
            { key: "skills", label: "Skills & Competencies" },
            { key: "certs", label: "Certifications" },
            { key: "timeline", label: "Career Timeline" },
            { key: "documents", label: "Documents" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => { setActiveSection(tab.key); setShowAdd(null); }} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${activeSection === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeSection === "skills" && (
          <div className="space-y-5 animate-fade-slide">
            {Object.keys(portfolio.skillBadges || {}).length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">No skills added yet.</div>
            )}
            {Object.entries(portfolio.skillBadges || {}).map(([category, skills]) => (
              <div key={category} className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${levelColor[skill.level]}`}>
                      {skill.name}<span className="opacity-60 text-[10px]">· {skill.level}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {showAdd === "skill" ? (
              <form onSubmit={addSkill} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select value={skillForm.category} onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))} className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm">
                    {["Technical Skills", "Research & Analytical", "Soft Skills"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select value={skillForm.level} onChange={(e) => setSkillForm((f) => ({ ...f, level: e.target.value }))} className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm">
                    {["Intermediate", "Proficient", "Advanced"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <input value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} placeholder="Skill name, e.g. Python Programming" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium">Add Skill</button>
                  <button type="button" onClick={() => setShowAdd(null)} className="px-4 rounded-xl border border-border text-sm text-muted-foreground">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowAdd("skill")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add Skill</button>
            )}
          </div>
        )}

        {activeSection === "certs" && (
          <div className="space-y-3 animate-fade-slide">
            {certCount === 0 && <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">No certifications added yet.</div>}
            {(portfolio.certifications || []).map((cert, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">🎓</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{cert.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{cert.issuer}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-primary">{cert.score}</div>
                  <div className="text-xs text-muted-foreground">{cert.year}</div>
                </div>
              </div>
            ))}

            {showAdd === "cert" ? (
              <form onSubmit={addCert} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <input value={certForm.name} onChange={(e) => setCertForm((f) => ({ ...f, name: e.target.value }))} placeholder="Certification name" required className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                <input value={certForm.issuer} onChange={(e) => setCertForm((f) => ({ ...f, issuer: e.target.value }))} placeholder="Issuing body" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={certForm.year} onChange={(e) => setCertForm((f) => ({ ...f, year: e.target.value }))} placeholder="Year" className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                  <input value={certForm.score} onChange={(e) => setCertForm((f) => ({ ...f, score: e.target.value }))} placeholder="Score / Grade" className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium">Add Certification</button>
                  <button type="button" onClick={() => setShowAdd(null)} className="px-4 rounded-xl border border-border text-sm text-muted-foreground">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowAdd("cert")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add Certification</button>
            )}
          </div>
        )}

        {activeSection === "timeline" && (
          <div className="animate-fade-slide space-y-4">
            {(portfolio.timeline || []).length === 0 && <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">No timeline entries yet.</div>}
            <div className="relative">
              {(portfolio.timeline || []).length > 0 && <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-border" />}
              <div className="space-y-4">
                {[...(portfolio.timeline || [])].reverse().map((item, i) => (
                  <div key={i} className="relative flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-xl flex-shrink-0 z-10 shadow-sm">{typeIcon[item.type] || "📌"}</div>
                    <div className="flex-1 bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-semibold text-foreground">{item.title}</div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor[item.type] ?? "bg-muted text-muted-foreground"}`}>{item.type}</span>
                          <span className="text-xs font-semibold text-muted-foreground">{item.year}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{item.org}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showAdd === "timeline" ? (
              <form onSubmit={addTimeline} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <input value={timelineForm.title} onChange={(e) => setTimelineForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title, e.g. Summer Research Assistant" required className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                <input value={timelineForm.org} onChange={(e) => setTimelineForm((f) => ({ ...f, org: e.target.value }))} placeholder="Organisation" className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={timelineForm.year} onChange={(e) => setTimelineForm((f) => ({ ...f, year: e.target.value }))} placeholder="Year" className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm" />
                  <select value={timelineForm.type} onChange={(e) => setTimelineForm((f) => ({ ...f, type: e.target.value }))} className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm">
                    {Object.keys(typeColor).map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium">Add Entry</button>
                  <button type="button" onClick={() => setShowAdd(null)} className="px-4 rounded-xl border border-border text-sm text-muted-foreground">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowAdd("timeline")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add Timeline Entry</button>
            )}
          </div>
        )}

        {activeSection === "documents" && (
          <div className="space-y-3 animate-fade-slide">
            {docError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <span>⚠️</span><span>{docError}</span>
              </div>
            )}

            {(portfolio.documents || []).length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
            )}

            {(portfolio.documents || []).map((doc) => (
              <div key={doc.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{doc.fileName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{doc.type} · Uploaded {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}</div>
                </div>
                <a href={doc.dataUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline flex-shrink-0">View</a>
                <button onClick={() => removeDoc(doc.id)} className="text-xs text-muted-foreground hover:text-red-600 flex-shrink-0">Remove</button>
              </div>
            ))}

            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="text-sm font-semibold text-foreground">Upload a document</div>
              <p className="text-xs text-muted-foreground">Add your resume, degree certificate, or ID proof. PDF or image, under 2MB.</p>
              <div className="grid grid-cols-2 gap-3">
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm">
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <label className="flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer text-center transition-colors">
                  {uploading ? "Uploading…" : "Choose File"}
                  <input type="file" accept=".pdf,image/*" onChange={handleDocUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
