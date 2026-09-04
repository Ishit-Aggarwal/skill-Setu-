"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import ApplyConfirmModal from "../ApplyConfirmModal";
import { useAuth } from "../../lib/auth";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, ProgressBar, SearchInput, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../ui/Kit";
import { ALL_DOMAINS, DEPARTMENTS, DOMAIN_GROUPS, domainColor } from "../../lib/domains";
import {
  applyToInternship,
  cloneInternship,
  createInternship,
  getAssessment,
  getPortfolio,
  listApplicationsForOwner,
  listApplicationsForStudent,
  listInternships,
  listInternshipsByOwner,
  listRecruiters,
  recordInternshipView,
  setPostingStatus,
  update,
  PIPELINE_STAGES,
  TERMINAL_STAGES,
} from "../../lib/store";
import { checkEligibility, computeMatch, computeSkillGap, daysUntil, formatDate } from "../../lib/match";

const typeFilters = ["All", "Remote", "Hybrid", "Onsite"];
const STAGE_ORDER = PIPELINE_STAGES;

const typeColor = {
  Remote: "text-emerald-700 bg-emerald-50",
  Hybrid: "text-blue-700 bg-blue-50",
  Onsite: "text-amber-700 bg-amber-50",
};

function StudentView({ user }) {
  const [internships, setInternships] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("All");
  const [type, setType] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [saved, setSaved] = useState([]);
  const [applyTarget, setApplyTarget] = useState(null);

  function refresh() {
    setInternships(listInternships());
    setAssessment(getAssessment(user.id));
    setPortfolio(getPortfolio(user.id));
    setAppliedIds(new Set(listApplicationsForStudent(user.id).map((a) => a.internshipId)));
  }

  useEffect(() => { refresh(); }, [user]);

  const enriched = useMemo(
    () =>
      internships.map((i) => ({
        ...i,
        match: computeMatch(i, assessment),
        eligibility: checkEligibility(i, user, assessment),
      })),
    [internships, assessment, user]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched
      .filter((i) => {
        const matchesSearch =
          !q || i.title.toLowerCase().includes(q) || i.company.toLowerCase().includes(q) || (i.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesDomain = domain === "All" || i.domain === domain;
        const matchesType = type === "All" || i.type === type;
        const matchesEligibility = !eligibleOnly || i.eligibility.eligible;
        return matchesSearch && matchesDomain && matchesType && matchesEligibility && i.status !== "Closed";
      })
      .sort((a, b) => (sortBy === "match" ? b.match - a.match : new Date(a.deadline) - new Date(b.deadline)));
  }, [enriched, search, domain, type, sortBy, eligibleOnly]);

  // Views feed the recruiter's performance panel — recorded once per posting
  // per browser session, not on every re-render.
  useEffect(() => {
    filtered.forEach((i) => recordInternshipView(i.id));
  }, [filtered]);

  function confirmApply(note) {
    applyToInternship(applyTarget, user, applyTarget.match, note);
    setAppliedIds((prev) => new Set([...prev, applyTarget.id]));
    setApplyTarget(null);
  }

  // Ordered by the canonical taxonomy (Ayush first), but never drops a domain
  // a posting actually uses.
  const domainsInUse = useMemo(() => {
    const used = new Set(internships.map((i) => i.domain).filter(Boolean));
    const known = ALL_DOMAINS.filter((d) => used.has(d));
    const extra = [...used].filter((d) => !ALL_DOMAINS.includes(d));
    return ["All", ...known, ...extra];
  }, [internships]);

  return (
    <div className="animate-fade-slide space-y-5">
      <div className="flex gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search roles, organisations, skills…" className="flex-1" />
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
          <option value="match">Best Match</option>
          <option value="deadline">Deadline</option>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1">Sector:</span>
          {domainsInUse.map((f) => (
            <button
              key={f}
              onClick={() => setDomain(f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${
                domain === f ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1">Type:</span>
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setType(f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${
                type === f ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found</span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} className="w-3.5 h-3.5 accent-primary" />
            Only show roles I'm eligible for
          </label>
          {appliedIds.size > 0 && <span className="text-xs text-primary font-medium">{appliedIds.size} applied</span>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No results found">Try adjusting your filters or search terms.</EmptyState>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((intern) => {
            const isApplied = appliedIds.has(intern.id);
            const isSaved = saved.includes(intern.id);
            const gap = computeSkillGap(intern, portfolio);
            const blocked = !intern.eligibility.eligible;
            return (
              <div key={intern.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: intern.color || domainColor(intern.domain) }}>
                      {intern.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground leading-tight">{intern.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{intern.company}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSaved(isSaved ? saved.filter((id) => id !== intern.id) : [...saved, intern.id])}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                    aria-label={isSaved ? "Unsave" : "Save"}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor[intern.type] || "bg-muted text-muted-foreground"}`}>{intern.type}</span>
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{intern.domain}</span>
                  {intern.hot && <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">🔥 Hot</span>}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {(intern.tags || []).slice(0, 2).map((tag) => <span key={tag} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{tag}</span>)}
                  {(intern.tags || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{intern.tags.length - 2}</span>}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground mb-3">
                  <div className="truncate">📍 {intern.location}</div>
                  <div>⏱ {intern.duration}</div>
                  <div>💰 {intern.stipend}</div>
                  <div>📅 Due {formatDate(intern.deadline)}</div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Skill match</span>
                    <span className="font-semibold text-primary">{intern.match}%</span>
                  </div>
                  <ProgressBar value={intern.match} tone="bg-primary" />
                  {gap.missing.length > 0 && <div className="text-[10px] text-amber-600 mt-1.5">You're missing: {gap.missing.join(", ")}</div>}
                </div>

                {blocked && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2 mb-3">
                    {intern.eligibility.reasons[0]}
                  </div>
                )}

                <button
                  onClick={() => setApplyTarget(intern)}
                  disabled={isApplied || blocked}
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isApplied
                      ? "bg-primary/10 text-primary cursor-default"
                      : blocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary hover:bg-accent text-white hover:shadow-md hover:scale-[1.02]"
                  }`}
                >
                  {isApplied ? "✓ Applied" : blocked ? "Not eligible" : "Apply Now"}
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

const EMPTY_POSTING = {
  title: "",
  location: "",
  type: "Hybrid",
  domain: ALL_DOMAINS[0],
  duration: "",
  stipend: "",
  tags: "",
  deadline: "",
  description: "",
  minSkillScore: "",
  eligibleDepartments: [],
  eligibleInstitutions: "",
};

function IndustryView({ user }) {
  const [postings, setPostings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [flash, setFlash] = useFlash();

  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("deadline");

  function refresh() {
    setPostings(listInternshipsByOwner(user.id));
    setApplications(listApplicationsForOwner(user.id));
    setRecruiters(listRecruiters(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  function appsFor(internshipId) {
    return applications.filter((a) => a.internshipId === internshipId);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = postings.filter((p) => {
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesDomain = domainFilter === "All" || p.domain === domainFilter;
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesDomain && matchesStatus;
    });
    const sorters = {
      deadline: (a, b) => daysUntil(a.deadline) - daysUntil(b.deadline),
      applicants: (a, b) => appsFor(b.id).length - appsFor(a.id).length,
      views: (a, b) => (b.views || 0) - (a.views || 0),
      newest: (a, b) => new Date(b.postedAt) - new Date(a.postedAt),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...rows].sort(sorters[sortBy] || sorters.deadline);
  }, [postings, applications, search, domainFilter, statusFilter, sortBy]);

  function handleSubmit(data) {
    const payload = {
      title: data.title,
      location: data.location || "Remote",
      type: data.type,
      domain: data.domain,
      duration: data.duration || "3 months",
      stipend: data.stipend || "Unpaid",
      tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
      deadline: data.deadline || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      description: data.description,
      minSkillScore: data.minSkillScore ? Number(data.minSkillScore) : null,
      eligibleDepartments: data.eligibleDepartments,
      eligibleInstitutions: data.eligibleInstitutions.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editing) {
      update("internships", editing.id, payload);
      setFlash("Posting updated.");
    } else {
      createInternship(user.id, user.companyName || user.name, payload);
      setFlash("Posting published.");
    }
    setShowModal(false);
    setEditing(null);
    refresh();
  }

  const domainsInUse = ["All", ...[...new Set(postings.map((p) => p.domain))].sort()];
  const openCount = postings.filter((p) => p.status === "Open").length;
  const totalViews = postings.reduce((s, p) => s + (p.views || 0), 0);
  const totalUnique = postings.reduce((s, p) => s + (p.uniqueViews || 0), 0);

  return (
    <div className="animate-fade-slide space-y-5">
      <PageHeader
        title="Your Postings"
        subtitle={`${postings.length} opportunit${postings.length === 1 ? "y" : "ies"} posted · ${openCount} currently open`}
        actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>Post new opportunity</Button>}
      />

      <Flash message={flash} />

      <StatGrid
        stats={[
          { label: "Open postings", value: String(openCount), icon: "📋", hint: `${postings.length - openCount} closed` },
          { label: "Total views", value: String(totalViews), icon: "👁", hint: `${totalUnique} unique visitor${totalUnique === 1 ? "" : "s"}` },
          { label: "Applicants", value: String(applications.length), icon: "📥" },
          {
            label: "View → apply rate",
            value: totalUnique ? `${Math.round((applications.length / totalUnique) * 100)}%` : "—",
            icon: "📈",
            hint: "Applications per unique viewer",
          },
        ]}
      />

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search your postings…" className="flex-1 min-w-[200px]" />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
            <option value="deadline">Sort: Deadline soonest</option>
            <option value="applicants">Sort: Most applicants</option>
            <option value="views">Sort: Most viewed</option>
            <option value="newest">Sort: Recently posted</option>
            <option value="title">Sort: Title</option>
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Sector">
            <Select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
              {domainsInUse.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {["All", "Open", "Closed"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title={postings.length ? "No postings match these filters" : "No postings yet"}
          action={!postings.length && <Button size="sm" onClick={() => setShowModal(true)}>Post your first opening</Button>}
        >
          {postings.length ? "Try clearing a filter." : "Post an internship or job opening to start receiving applicants."}
        </EmptyState>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const apps = appsFor(p.id);
            const inPipeline = apps.filter((a) => !TERMINAL_STAGES.includes(a.status));
            const rejectedCount = apps.filter((a) => a.status === "Rejected").length;
            const days = daysUntil(p.deadline);
            const funnel = STAGE_ORDER.map((stage, i) => ({
              stage,
              count: inPipeline.filter((a) => STAGE_ORDER.indexOf(a.status) >= i).length,
            }));
            const applyRate = p.uniqueViews ? Math.round((apps.length / p.uniqueViews) * 100) : null;
            return (
              <Card key={p.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{p.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.location} · {p.type} · {p.duration}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge tone={p.status === "Open" ? "green" : "muted"}>{p.status}</Badge>
                    {p.status === "Closed" && p.closedReason && <span className="text-[9px] text-muted-foreground">{p.closedReason}</span>}
                    {p.status === "Open" && days >= 0 && days <= 10 && <Badge tone="red">{days}d left</Badge>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{p.domain}</span>
                  {(p.tags || []).slice(0, 2).map((t) => <span key={t} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{t}</span>)}
                </div>

                {(p.minSkillScore || (p.eligibleDepartments || []).length > 0) && (
                  <div className="text-[10px] text-muted-foreground mb-3">
                    🎯 {p.minSkillScore ? `Min. score ${p.minSkillScore}` : ""}
                    {p.minSkillScore && (p.eligibleDepartments || []).length ? " · " : ""}
                    {(p.eligibleDepartments || []).length ? `${p.eligibleDepartments.length} eligible department${p.eligibleDepartments.length === 1 ? "" : "s"}` : ""}
                  </div>
                )}

                <div className="mb-3">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Applicant funnel</div>
                  {apps.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No applicants yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {funnel.map((f) => (
                        <div key={f.stage} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{f.stage}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(f.count / (funnel[0].count || 1)) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-foreground w-4 text-right flex-shrink-0">{f.count}</span>
                        </div>
                      ))}
                      {rejectedCount > 0 && (
                        <p className="text-[9px] text-muted-foreground pt-1">
                          {rejectedCount} rejected, not in live funnel
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground mb-1">
                  👁 {p.views || 0} view{p.views === 1 ? "" : "s"} · {p.uniqueViews || 0} unique
                  {applyRate != null && ` · ${applyRate}% applied`}
                </div>
                <div className="text-[10px] text-muted-foreground mb-4">
                  📅 Due {formatDate(p.deadline)}{p.recruiterName ? ` · owned by ${p.recruiterName}` : " · unassigned"}
                </div>

                <div className="mt-auto grid grid-cols-3 gap-1.5">
                  <button onClick={() => { setEditing(p); setShowModal(true); }} className="text-[11px] font-medium py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    Edit
                  </button>
                  <button
                    onClick={() => { cloneInternship(p.id); refresh(); setFlash(`Duplicated "${p.title}" as a new draft.`); }}
                    className="text-[11px] font-medium py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => { setPostingStatus(p.id, p.status === "Open" ? "Closed" : "Open"); refresh(); setFlash(p.status === "Open" ? "Posting paused." : "Posting reopened."); }}
                    className="text-[11px] font-medium py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    {p.status === "Open" ? "Pause" : "Reopen"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <PostingModal
          posting={editing}
          recruiters={recruiters}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function PostingModal({ posting, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    posting
      ? {
          ...EMPTY_POSTING,
          ...posting,
          tags: (posting.tags || []).join(", "),
          minSkillScore: posting.minSkillScore ? String(posting.minSkillScore) : "",
          eligibleDepartments: posting.eligibleDepartments || [],
          eligibleInstitutions: (posting.eligibleInstitutions || []).join(", "),
        }
      : EMPTY_POSTING
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      title={posting ? "Edit posting" : "Post a new opportunity"}
      description="Minimum qualifications filter applications before they reach you."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
        <Field label="Role title"><TextInput required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ayurvedic Formulation Intern" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Work type">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {["Remote", "Hybrid", "Onsite"].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Sector">
            <Select value={form.domain} onChange={(e) => set("domain", e.target.value)}>
              {DOMAIN_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((d) => <option key={d}>{d}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Location"><TextInput value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Pune / Remote" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stipend / CTC"><TextInput value={form.stipend} onChange={(e) => set("stipend", e.target.value)} placeholder="₹18,000/mo" /></Field>
          <Field label="Duration"><TextInput value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="6 months" /></Field>
        </div>

        <Field label="Application deadline" hint="The posting closes itself once this date passes; you can reopen it manually.">
          <TextInput type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
        </Field>

        <Field label="Required skills" hint="Comma separated — these drive the skill-match score students see.">
          <TextInput value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Dravyaguna, Quality Control, GMP Compliance" />
        </Field>

        <div className="border-t border-border pt-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Minimum qualifications</div>

          <Field label="Minimum skill score" hint="Students below this can't apply. Leave blank for no floor." className="mb-3">
            <TextInput type="number" min="0" max="100" value={form.minSkillScore} onChange={(e) => set("minSkillScore", e.target.value)} placeholder="60" />
          </Field>

          <Field label="Eligible departments" hint="Leave empty to accept every department." className="mb-3">
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    set("eligibleDepartments", form.eligibleDepartments.includes(d) ? form.eligibleDepartments.filter((x) => x !== d) : [...form.eligibleDepartments, d])
                  }
                  className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
                    form.eligibleDepartments.includes(d) ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Eligible institutions" hint="Comma separated. Leave empty to open the role to every institution.">
            <TextInput value={form.eligibleInstitutions} onChange={(e) => set("eligibleInstitutions", e.target.value)} placeholder="Rajasthan Institute of Ayurvedic Sciences" />
          </Field>
        </div>

        <Field label="Description">
          <TextArea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What the intern will actually work on." />
        </Field>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">{posting ? "Save changes" : "Publish posting"}</Button>
        </div>
      </form>
    </Modal>
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
