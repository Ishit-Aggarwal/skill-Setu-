"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { getAssessment, getPortfolio, savePortfolio, listApplicationsForStudent } from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { Badge, Button, Card, EmptyState, Select, StatGrid, Tabs, TextInput } from "../ui/Kit";

const levelTone = {
  Advanced: "primary",
  Proficient: "blue",
  Intermediate: "amber",
};

const typeTone = {
  Education: "blue",
  Internship: "green",
  Research: "purple",
  Publication: "amber",
  Achievement: "primary",
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

    const unsub = subscribeToMutations(["applications"], () => {
      setApplications(listApplicationsForStudent(user.id));
    });
    return unsub;
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
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <Link
                  href="/portfolio/resume"
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-primary hover:bg-accent text-white hover:shadow-md transition-all duration-200"
                >
                  <span>📄 Generate ATS Resume</span>
                </Link>
                <button
                  onClick={handleDownload}
                  title="Quick print current screen"
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border border-border transition-all duration-200 ${
                    downloaded ? "bg-green-50 text-green-600 border-green-200" : "bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  <span>🖨️</span>
                </button>
              </div>
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

        <StatGrid
          columns={4}
          stats={[
            { label: "Skill Score", value: assessment ? `${Math.round(assessment.overallScore)}/100` : "—", icon: "🎯", tone: "primary" },
            { label: "Certifications", value: String(certCount), icon: "🏅", tone: "amber" },
            { label: "Publications", value: String(publicationCount), icon: "📄", tone: "purple" },
            { label: "Avg Match", value: `${avgMatch}%`, icon: "📈", tone: "green" },
          ]}
        />

        <Tabs
          className="w-full"
          tabs={[
            { key: "skills", label: "Skills & Competencies" },
            { key: "certs", label: "Certifications" },
            { key: "timeline", label: "Career Timeline" },
            { key: "documents", label: "Documents" },
          ]}
          value={activeSection}
          onChange={(key) => { setActiveSection(key); setShowAdd(null); }}
        />

        {activeSection === "skills" && (
          <div className="space-y-5 animate-fade-slide">
            {Object.keys(portfolio.skillBadges || {}).length === 0 && (
              <EmptyState icon="🧩" title="No skills added yet" />
            )}
            {Object.entries(portfolio.skillBadges || {}).map(([category, skills]) => (
              <Card key={category}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <Badge key={i} tone={levelTone[skill.level]} className="!text-xs !px-3 !py-1.5">
                      {skill.name}<span className="opacity-60 text-[10px]">· {skill.level}</span>
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}

            {showAdd === "skill" ? (
              <Card>
                <form onSubmit={addSkill} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={skillForm.category} onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))}>
                      {["Technical Skills", "Research & Analytical", "Soft Skills"].map((c) => <option key={c}>{c}</option>)}
                    </Select>
                    <Select value={skillForm.level} onChange={(e) => setSkillForm((f) => ({ ...f, level: e.target.value }))}>
                      {["Intermediate", "Proficient", "Advanced"].map((l) => <option key={l}>{l}</option>)}
                    </Select>
                  </div>
                  <TextInput value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} placeholder="Skill name, e.g. Python Programming" />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add Skill</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <button onClick={() => setShowAdd("skill")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add Skill</button>
            )}
          </div>
        )}

        {activeSection === "certs" && (
          <div className="space-y-3 animate-fade-slide">
            {certCount === 0 && <EmptyState icon="🎓" title="No certifications added yet" />}
            {(portfolio.certifications || []).map((cert, i) => (
              <Card key={i} className="flex items-center gap-4" hover>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">🎓</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{cert.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{cert.issuer}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-primary">{cert.score}</div>
                  <div className="text-xs text-muted-foreground">{cert.year}</div>
                </div>
              </Card>
            ))}

            {showAdd === "cert" ? (
              <Card>
                <form onSubmit={addCert} className="space-y-3">
                  <TextInput value={certForm.name} onChange={(e) => setCertForm((f) => ({ ...f, name: e.target.value }))} placeholder="Certification name" required />
                  <TextInput value={certForm.issuer} onChange={(e) => setCertForm((f) => ({ ...f, issuer: e.target.value }))} placeholder="Issuing body" />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput value={certForm.year} onChange={(e) => setCertForm((f) => ({ ...f, year: e.target.value }))} placeholder="Year" />
                    <TextInput value={certForm.score} onChange={(e) => setCertForm((f) => ({ ...f, score: e.target.value }))} placeholder="Score / Grade" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add Certification</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <button onClick={() => setShowAdd("cert")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add Certification</button>
            )}
          </div>
        )}

        {activeSection === "timeline" && (
          <div className="animate-fade-slide space-y-4">
            {(portfolio.timeline || []).length === 0 && <EmptyState icon="🧭" title="No timeline entries yet" />}
            <div className="relative">
              {(portfolio.timeline || []).length > 0 && <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-border" />}
              <div className="space-y-4">
                {[...(portfolio.timeline || [])].reverse().map((item, i) => (
                  <div key={i} className="relative flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-xl flex-shrink-0 z-10 shadow-sm">{typeIcon[item.type] || "📌"}</div>
                    <Card className="flex-1" hover>
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <div className="text-sm font-semibold text-foreground">{item.title}</div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge tone={typeTone[item.type] ?? "muted"}>{item.type}</Badge>
                          <span className="text-xs font-semibold text-muted-foreground">{item.year}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{item.org}</div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {showAdd === "timeline" ? (
              <Card>
                <form onSubmit={addTimeline} className="space-y-3">
                  <TextInput value={timelineForm.title} onChange={(e) => setTimelineForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title, e.g. Summer Research Assistant" required />
                  <TextInput value={timelineForm.org} onChange={(e) => setTimelineForm((f) => ({ ...f, org: e.target.value }))} placeholder="Organisation" />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput value={timelineForm.year} onChange={(e) => setTimelineForm((f) => ({ ...f, year: e.target.value }))} placeholder="Year" />
                    <Select value={timelineForm.type} onChange={(e) => setTimelineForm((f) => ({ ...f, type: e.target.value }))}>
                      {Object.keys(typeTone).map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Add Entry</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <button onClick={() => setShowAdd("timeline")} className="w-full text-sm text-center text-primary hover:underline py-2">+ Add Timeline Entry</button>
            )}
          </div>
        )}

        {activeSection === "documents" && (
          <div className="space-y-3 animate-fade-slide">
            {docError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <span>⚠️</span><span>{docError}</span>
              </div>
            )}

            {(portfolio.documents || []).length === 0 && (
              <EmptyState icon="📁" title="No documents uploaded yet" />
            )}

            {(portfolio.documents || []).map((doc) => (
              <Card key={doc.id} className="flex items-center gap-4" hover>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{doc.fileName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{doc.type} · Uploaded {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}</div>
                </div>
                <a href={doc.dataUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline flex-shrink-0">View</a>
                <button onClick={() => removeDoc(doc.id)} className="text-xs text-muted-foreground hover:text-red-600 flex-shrink-0">Remove</button>
              </Card>
            ))}

            <Card className="space-y-3">
              <div className="text-sm font-semibold text-foreground">Upload a document</div>
              <p className="text-xs text-muted-foreground">Add your resume, degree certificate, or ID proof. PDF or image, under 2MB.</p>
              <div className="grid grid-cols-2 gap-3">
                <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
                <label className="flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer text-center transition-colors">
                  {uploading ? "Uploading…" : "Choose File"}
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
