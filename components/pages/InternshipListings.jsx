"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import ApplyConfirmModal from "../ApplyConfirmModal";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  listInternships,
  listInternshipsByOwner,
  listApplicationsForStudent,
  listApplicationsForOwner,
  applyToInternship,
  createInternship,
  getAssessment,
  update,
} from "../../lib/store";
import { computeMatch, formatDate } from "../../lib/match";

const INTERNSHIP_DOMAINS = ["IT", "Manufacturing", "Finance", "Marketing", "Design", "Operations", "Consulting"];
const domainFilters = ["All", ...INTERNSHIP_DOMAINS];
const typeFilters = ["All", "Remote", "Hybrid", "Onsite"];

const typeColor = {
  Remote: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
  Hybrid: "text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300",
  Onsite: "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
};

function StudentView({ user }) {
  const [internships, setInternships] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("All");
  const [type, setType] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [saved, setSaved] = useState([]);
  const [applyTarget, setApplyTarget] = useState(null);

  function refresh() {
    setInternships(listInternships());
    setAssessment(getAssessment(user.id));
    setAppliedIds(new Set(listApplicationsForStudent(user.id).map((a) => a.internshipId)));
  }

  useEffect(() => { refresh(); }, [user]);

  const filtered = useMemo(() => {
    return internships
      .map((i) => ({ ...i, match: computeMatch(i, assessment) }))
      .filter((i) => {
        const q = search.toLowerCase();
        const matchesSearch = !q || i.title.toLowerCase().includes(q) || i.company.toLowerCase().includes(q) || (i.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesDomain = domain === "All" || i.domain === domain;
        const matchesType = type === "All" || i.type === type;
        return matchesSearch && matchesDomain && matchesType && i.status !== "Closed";
      })
      .sort((a, b) => (sortBy === "match" ? b.match - a.match : new Date(a.deadline) - new Date(b.deadline)));
  }, [internships, assessment, search, domain, type, sortBy]);

  function handleApply(intern) {
    setApplyTarget(intern);
  }

  function confirmApply(note) {
    applyToInternship(applyTarget, user, applyTarget.match, note);
    setAppliedIds((prev) => new Set([...prev, applyTarget.id]));
    setApplyTarget(null);
  }

  return (
    <div className="animate-fade-slide space-y-5">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search roles, companies, skills..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
          <option value="match">Best Match</option>
          <option value="deadline">Deadline</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1">Domain:</span>
          {domainFilters.map((f) => (
            <button key={f} onClick={() => setDomain(f)} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${domain === f ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1">Type:</span>
          {typeFilters.map((f) => (
            <button key={f} onClick={() => setType(f)} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${type === f ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found</span>
        {appliedIds.size > 0 && <span className="text-xs text-primary font-medium">{appliedIds.size} applied</span>}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-4">🔍</div>
          <div className="font-medium text-foreground mb-1">No results found</div>
          <div className="text-sm">Try adjusting your filters or search terms</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((intern) => {
            const isApplied = appliedIds.has(intern.id);
            const isSaved = saved.includes(intern.id);
            return (
              <div key={intern.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: intern.color }}>
                      {intern.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground leading-tight">{intern.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{intern.company}</div>
                    </div>
                  </div>
                  <button onClick={() => setSaved(isSaved ? saved.filter((id) => id !== intern.id) : [...saved, intern.id])} className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor[intern.type] || "bg-muted text-muted-foreground"}`}>{intern.type}</span>
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{intern.domain}</span>
                  {intern.hot && <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 px-2 py-0.5 rounded-full">🔥 Hot</span>}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {(intern.tags || []).slice(0, 2).map((tag) => <span key={tag} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{tag}</span>)}
                  {(intern.tags || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{intern.tags.length - 2}</span>}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground mb-3">
                  <div>📍 {intern.location}</div>
                  <div>⏱ {intern.duration}</div>
                  <div>💰 {intern.stipend}</div>
                  <div>📅 Due {formatDate(intern.deadline)}</div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Skill match</span>
                    <span className="font-semibold text-primary">{intern.match}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${intern.match}%` }} />
                  </div>
                </div>

                <button
                  onClick={() => handleApply(intern)}
                  disabled={isApplied}
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isApplied ? "bg-primary/10 text-primary cursor-default" : "bg-primary hover:bg-accent text-white hover:shadow-md hover:scale-[1.02]"}`}
                >
                  {isApplied ? "✓ Applied" : "Apply Now"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {applyTarget && (
        <ApplyConfirmModal internship={applyTarget} user={user} onConfirm={confirmApply} onClose={() => setApplyTarget(null)} />
      )}
    </div>
  );
}

function IndustryView({ user }) {
  const [postings, setPostings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", location: "", type: "Hybrid", domain: "IT", duration: "", stipend: "", tags: "", deadline: "", description: "" });

  function refresh() {
    setPostings(listInternshipsByOwner(user.id));
    setApplications(listApplicationsForOwner(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  function applicantCount(internshipId) {
    return applications.filter((a) => a.internshipId === internshipId).length;
  }

  function handleCreate(e) {
    e.preventDefault();
    createInternship(user.id, user.companyName || user.name, {
      title: form.title,
      location: form.location,
      type: form.type,
      domain: form.domain,
      duration: form.duration,
      stipend: form.stipend,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      deadline: form.deadline || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      description: form.description,
    });
    setForm({ title: "", location: "", type: "Hybrid", domain: "IT", duration: "", stipend: "", tags: "", deadline: "", description: "" });
    setShowModal(false);
    refresh();
  }

  function toggleStatus(id, status) {
    update("internships", id, { status: status === "Open" ? "Closed" : "Open" });
    refresh();
  }

  return (
    <div className="animate-fade-slide space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your Postings</h2>
          <p className="text-sm text-muted-foreground">{postings.length} opportunity{postings.length === 1 ? "" : "s"} posted</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary hover:bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 hover:shadow-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Post New Opportunity
        </button>
      </div>

      {postings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <div className="text-4xl mb-4">📋</div>
          <div className="font-medium text-foreground mb-1">No postings yet</div>
          <div className="text-sm">Post your first internship or job opening to start receiving applicants.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {postings.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-sm transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-semibold text-foreground">{p.title}</div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${p.status === "Open" ? "text-green-600 bg-green-50 dark:bg-green-950/30" : "text-muted-foreground bg-muted"}`}>{p.status}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">{p.location} · {p.type} · {p.duration}</div>
              <div className="flex flex-wrap gap-1 mb-4">
                {(p.tags || []).slice(0, 3).map((t) => <span key={t} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{t}</span>)}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span>{applicantCount(p.id)} applicant{applicantCount(p.id) === 1 ? "" : "s"}</span>
                <span>Due {formatDate(p.deadline)}</span>
              </div>
              <button onClick={() => toggleStatus(p.id, p.status)} className="mt-auto text-xs font-medium py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                {p.status === "Open" ? "Close posting" : "Reopen posting"}
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-foreground text-lg mb-5">Post New Opportunity</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Role Title</label>
                <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Development Intern"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {["Remote", "Hybrid", "Onsite"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Domain</label>
                  <select value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {INTERNSHIP_DOMAINS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Location</label>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Bengaluru / Remote"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Stipend / CTC</label>
                  <input value={form.stipend} onChange={(e) => setForm((f) => ({ ...f, stipend: e.target.value }))} placeholder="₹12,000/mo"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Duration</label>
                  <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="3 months"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Application Deadline</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Required Skills (comma separated)</label>
                <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="React, SQL, Communication"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="What will the intern work on?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-all duration-150">Post Opportunity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InternshipListings() {
  const { user } = useAuth();
  const title = user.role === "industry" ? "Manage Postings" : "Internship & Job Listings";

  return (
    <DashboardLayout activePage="internship-listings" title={title}>
      {user.role === "industry" ? <IndustryView user={user} /> : <StudentView user={user} />}
    </DashboardLayout>
  );
}
