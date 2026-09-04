"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import CandidateProfileModal from "../CandidateProfileModal";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { Avatar, Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, ProgressBar, SearchInput, Section, Select, StatGrid, TextInput, useFlash } from "../ui/Kit";
import {
  createInternship,
  listApplicationsForOwner,
  listInternshipsByOwner,
  listRecruiters,
  updateApplicationStatus,
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  ALL_APPLICATION_STATUSES,
} from "../../lib/store";
import { ALL_DOMAINS, DOMAIN_GROUPS } from "../../lib/domains";
import { daysUntil, formatDate } from "../../lib/match";
import { subscribeToMutations } from "../../lib/sync";

const statusCols = [...PIPELINE_STAGES, "Rejected"];

const statusStyle = {
  Applied: "bg-secondary/70",
  Shortlisted: "bg-blue-50",
  Interview: "bg-amber-50",
  Hired: "bg-green-50",
  Rejected: "bg-red-50 border-red-200",
};

const statusBadge = {
  Applied: "bg-secondary text-muted-foreground",
  Shortlisted: "bg-blue-100 text-blue-700",
  Interview: "bg-amber-100 text-amber-700",
  Hired: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function colorFor(name) {
  const palette = ["#6B7C3C", "#3C5A8A", "#8A5A3C", "#5A3C8A", "#3C7C6B", "#8A3C6B"];
  let hash = 0;
  for (const ch of name || "") hash = (hash * 31 + ch.charCodeAt(0)) % palette.length;
  return palette[hash];
}

export default function IndustryDashboard() {
  const { user } = useAuth();
  const navigate = useNav();
  const [postings, setPostings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [showPostJob, setShowPostJob] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [postingFilter, setPostingFilter] = useState("All");
  const [flash, setFlash] = useFlash();
  const [newApplicantIds, setNewApplicantIds] = useState(() => new Set());

  const [form, setForm] = useState({ title: "", location: "", stipend: "", duration: "", tags: "", domain: ALL_DOMAINS[0] });

  function refresh() {
    if (!user) return;
    setPostings(listInternshipsByOwner(user.id));
    setApplications(listApplicationsForOwner(user.id));
    setRecruiters(listRecruiters(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMutations(["applications", "internships", "collabInterests"], (event) => {
      refresh();
      if (event.collection === "applications" && event.action === "INSERT" && event.payload) {
        const app = event.payload;
        const myJobs = listInternshipsByOwner(user.id);
        const belongsToMe = myJobs.some((j) => j.id === app.internshipId) || (user.companyName && app.company === user.companyName);
        if (belongsToMe) {
          setFlash(`New application received from ${app.studentName || "a candidate"}!`);
          if (app.id) {
            setNewApplicantIds((prev) => new Set([...prev, app.id]));
            setTimeout(() => {
              setNewApplicantIds((prev) => {
                const next = new Set(prev);
                next.delete(app.id);
                return next;
              });
            }, 8000);
          }
        }
      }
    });
    return unsub;
  }, [user]);

  const scoped = useMemo(
    () => (postingFilter === "All" ? applications : applications.filter((a) => a.internshipId === postingFilter)),
    [applications, postingFilter]
  );

  function toggleCompare(id) {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev));
  }

  function moveApplicant(id, newStatus) {
    setMovingId(id);
    setTimeout(() => {
      updateApplicationStatus(id, newStatus);
      refresh();
      setMovingId(null);
    }, 150);
  }

  const byStatus = (status) => scoped.filter((a) => a.status === status);

  const kpiData = useMemo(() => {
    const total = scoped.length;
    const shortlisted = scoped.filter((a) => ["Shortlisted", "Interview", "Hired"].includes(a.status)).length;
    const interview = scoped.filter((a) => ["Interview", "Hired"].includes(a.status)).length;
    const hired = scoped.filter((a) => a.status === "Hired").length;
    const joined = scoped.filter((a) => a.offerStage === "Joined").length;
    const rejected = scoped.filter((a) => a.status === "Rejected").length;
    return [
      { label: "Total applications", value: String(total), icon: "📋", hint: `${rejected} terminal/rejected applications accounted for` },
      { label: "Shortlisted", value: String(shortlisted), icon: "⭐", hint: total ? `${Math.round((shortlisted / total) * 100)}% rate` : "—" },
      { label: "In interview", value: String(interview), icon: "🎙", hint: total ? `${Math.round((interview / total) * 100)}% rate` : "—" },
      { label: "Hired", value: String(hired), icon: "✅", hint: total ? `${Math.round((hired / total) * 100)}% conversion` : "—" },
      { label: "Joined", value: String(joined), icon: "🎉", hint: hired ? `${Math.round((joined / hired) * 100)}% of hires` : "—" },
    ];
  }, [scoped, postings]);

  function handleCreate(e) {
    e.preventDefault();
    createInternship(user.id, user.companyName || user.name, {
      title: form.title,
      location: form.location || "Remote",
      type: "Hybrid",
      domain: form.domain,
      duration: form.duration || "3 months",
      stipend: form.stipend || "Unpaid",
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      description: "",
    });
    setForm({ title: "", location: "", stipend: "", duration: "", tags: "", domain: ALL_DOMAINS[0] });
    setShowPostJob(false);
    refresh();
    setFlash("Posting published.");
  }

  return (
    <DashboardLayout activePage="industry-dashboard" title="Industry Dashboard">
      <div className="animate-fade-slide space-y-6">
        <PageHeader
          title={`Welcome, ${user.name?.split(" ")[0] || "there"}`}
          subtitle={`${user.companyName || "Your organisation"} · ${user.companyDomain || "Talent acquisition"}`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("talent-pool")}>Search talent</Button>
              <Button size="sm" onClick={() => setShowPostJob(true)}>Post new job</Button>
            </>
          }
        />

        <Flash message={flash} />

        <StatGrid stats={kpiData} columns={5} />

        <Section
          title="Active postings"
          description="Live openings with their applicant counts."
          actions={<button onClick={() => navigate("internship-listings")} className="text-xs text-primary font-medium hover:underline">Manage all →</button>}
        >
          {postings.length === 0 ? (
            <EmptyState icon="📋" title="No postings yet" action={<Button size="sm" onClick={() => setShowPostJob(true)}>Post your first opening</Button>}>
              Publish an opportunity to start receiving applicants.
            </EmptyState>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {postings.slice(0, 3).map((job) => {
                const apps = applications.filter((a) => a.internshipId === job.id).length;
                const days = daysUntil(job.deadline);
                return (
                  <Card key={job.id}>
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{job.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{job.location} · {job.type}</div>
                      </div>
                      {job.status === "Open" && days >= 0 && days <= 10 && <Badge tone="red">{days}d left</Badge>}
                      {job.status === "Closed" && <Badge tone="muted">Closed</Badge>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{apps} applicant{apps === 1 ? "" : "s"}</span>
                      <span>👁 {job.views || 0}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Due {formatDate(job.deadline)}{job.recruiterName ? ` · ${job.recruiterName}` : ""}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>

        <Section
          title="Applicant pipeline"
          description={bulkMode ? "Select candidates, then accept, shortlist or reject them together." : "Drag candidates through the stages, or switch on bulk review for high-volume postings."}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={postingFilter} onChange={(e) => setPostingFilter(e.target.value)} className="w-auto text-xs py-1.5">
                <option value="All">All postings</option>
                {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
              <Button size="sm" variant={bulkMode ? "primary" : "outline"} onClick={() => { setBulkMode((v) => !v); setCompareIds([]); }}>
                {bulkMode ? "Exit bulk review" : "Bulk review"}
              </Button>
            </div>
          }
        >
          {bulkMode ? (
            <BulkReview
              applications={scoped}
              onAction={(ids, status) => {
                ids.forEach((id) => updateApplicationStatus(id, status));
                refresh();
                setFlash(`${ids.length} candidate${ids.length === 1 ? "" : "s"} moved to ${status}.`);
              }}
              onOpen={setSelectedApplicant}
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto">
              {statusCols.map((status) => {
                const cols = byStatus(status);
                return (
                  <div key={status} className={`rounded-2xl p-3 min-h-[300px] ${statusStyle[status]}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-foreground">{status}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[status]}`}>{cols.length}</span>
                    </div>

                    <div className="space-y-2">
                      {cols.map((applicant) => (
                        <div
                          key={applicant.id}
                          className={`bg-card border rounded-xl p-3 hover:shadow-sm transition-all duration-200 ${compareIds.includes(applicant.id) ? "border-primary" : "border-border"} ${movingId === applicant.id ? "opacity-40 scale-95" : ""} ${newApplicantIds.has(applicant.id) ? "ring-2 ring-emerald-500 bg-emerald-50/50 shadow-md animate-pulse" : ""}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={compareIds.includes(applicant.id)}
                              onChange={() => toggleCompare(applicant.id)}
                              className="w-3.5 h-3.5 flex-shrink-0 accent-primary"
                              aria-label={`Select ${applicant.studentName} to compare`}
                            />
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: colorFor(applicant.studentName) }}>
                              {initials(applicant.studentName)}
                            </div>
                            <div className="min-w-0">
                              <button onClick={() => setSelectedApplicant(applicant)} className="text-xs font-semibold text-foreground hover:text-primary hover:underline truncate block text-left">
                                {applicant.studentName}
                              </button>
                              <div className="text-[10px] text-muted-foreground truncate">{applicant.studentCourse || applicant.internshipTitle}</div>
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground mb-2 truncate">{applicant.studentInstitution}</div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-primary">{applicant.match}% match</span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(applicant.appliedAt)}</span>
                          </div>
                          {applicant.interviewMode && (
                            <div className="text-[10px] text-muted-foreground mb-1">
                              🎙 {applicant.interviewMode} interview
                              {applicant.interviewAt && ` · ${new Date(applicant.interviewAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`}
                            </div>
                          )}
                          {status === "Hired" && (
                            <button onClick={() => navigate("industry-offers")} className="text-[10px] text-primary hover:underline block mb-1">
                              {applicant.offerStage && applicant.offerStage !== "Not sent" ? `Offer: ${applicant.offerStage}` : "Track offer →"}
                            </button>
                          )}

                          <div className="mt-2 flex gap-1">
                            {status === "Rejected" ? (
                              <button
                                onClick={() => moveApplicant(applicant.id, "Applied")}
                                className="w-full text-[10px] py-1 bg-secondary rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                              >
                                Restore to Applied
                              </button>
                            ) : (
                              <>
                                {status !== "Applied" && (
                                  <button
                                    onClick={() => moveApplicant(applicant.id, PIPELINE_STAGES[PIPELINE_STAGES.indexOf(status) - 1])}
                                    className="flex-1 text-[10px] py-1 bg-secondary rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                  >
                                    ← Move back
                                  </button>
                                )}
                                {status !== "Hired" && (
                                  <button
                                    onClick={() => moveApplicant(applicant.id, PIPELINE_STAGES[PIPELINE_STAGES.indexOf(status) + 1])}
                                    className="flex-1 text-[10px] py-1 bg-primary/10 rounded-lg hover:bg-primary text-primary hover:text-white transition-colors"
                                  >
                                    Advance →
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {cols.length === 0 && <div className="text-center py-8 text-xs text-muted-foreground">No candidates</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {!bulkMode && compareIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-fade-slide">
          <span className="text-sm text-foreground font-medium">{compareIds.length} candidates selected</span>
          <Button size="sm" onClick={() => setShowCompare(true)}>Compare</Button>
          <button onClick={() => setCompareIds([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {showCompare && (
        <Modal title="Compare candidates" onClose={() => setShowCompare(false)} size="lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[500px]">
              <tbody>
                {[
                  {
                    label: "",
                    render: (a) => (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: colorFor(a.studentName) }}>{initials(a.studentName)}</div>
                        <span className="font-semibold text-foreground text-center">{a.studentName}</span>
                      </div>
                    ),
                  },
                  { label: "Institution", render: (a) => a.studentInstitution || "—" },
                  { label: "Course", render: (a) => a.studentCourse || "—" },
                  { label: "Skill match", render: (a) => <span className="font-semibold text-primary">{a.match}%</span> },
                  { label: "Stage", render: (a) => a.status },
                  { label: "Offer", render: (a) => a.offerStage || "—" },
                  { label: "Interview mode", render: (a) => a.interviewMode || "Not set" },
                  { label: "Applied", render: (a) => formatDate(a.appliedAt) },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {row.label && <td className="py-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap">{row.label}</td>}
                    {applications.filter((a) => compareIds.includes(a.id)).map((a) => (
                      <td key={a.id} className={`py-3 px-3 text-center ${!row.label ? "align-bottom" : ""}`}>{row.render(a)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {showPostJob && (
        <Modal title="Post a new opportunity" onClose={() => setShowPostJob(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Role title"><TextInput required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Software Engineer Intern (Full-Stack)" /></Field>
            <Field label="Sector">
              <Select value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}>
                {DOMAIN_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.items.map((d) => <option key={d}>{d}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Location"><TextInput value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Pune / Remote" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stipend / CTC"><TextInput value={form.stipend} onChange={(e) => setForm((f) => ({ ...f, stipend: e.target.value }))} placeholder="₹18,000/mo" /></Field>
              <Field label="Duration"><TextInput value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="6 months" /></Field>
            </div>
            <Field label="Required skills" hint="Comma separated."><TextInput value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="Dravyaguna, Quality Control" /></Field>
            <p className="text-[11px] text-muted-foreground">
              Need eligibility filters and a deadline? Use the full form on the Postings page.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPostJob(false)}>Cancel</Button>
              <Button type="submit" className="flex-1">Post job</Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedApplicant && (
        <CandidateProfileModal application={selectedApplicant} onClose={() => setSelectedApplicant(null)} onUpdated={refresh} />
      )}
    </DashboardLayout>
  );
}

/**
 * High-volume review: one scrollable list sorted by match, with checkboxes and
 * a single action bar — far faster than dragging cards one at a time when a
 * posting pulls a hundred applications.
 */
function BulkReview({ applications, onAction, onOpen }) {
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("Applied");
  const [minMatch, setMinMatch] = useState(0);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications
      .filter((a) => a.status === stage)
      .filter((a) => (a.match || 0) >= minMatch)
      .filter((a) => !q || a.studentName.toLowerCase().includes(q) || (a.studentInstitution || "").toLowerCase().includes(q))
      .sort((a, b) => (b.match || 0) - (a.match || 0));
  }, [applications, stage, minMatch, search]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function act(status) {
    onAction([...selected], status);
    setSelected(new Set());
  }

  const nextStage = PIPELINE_STAGES[Math.min(PIPELINE_STAGES.indexOf(stage) + 1, PIPELINE_STAGES.length - 1)];

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search candidates…" className="flex-1 min-w-[180px]" />
          <Select value={stage} onChange={(e) => { setStage(e.target.value); setSelected(new Set()); }} className="w-auto">
            {statusCols.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))} className="w-auto">
            {[0, 60, 70, 80, 90].map((m) => <option key={m} value={m}>{m === 0 ? "Any match" : `${m}%+ match`}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 accent-primary" />
            Select all {rows.length}
          </label>
          <span className="text-xs text-muted-foreground">· {selected.size} selected</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            {stage === "Rejected" ? (
              <Button size="sm" disabled={!selected.size} onClick={() => act("Applied")}>
                Restore to Applied
              </Button>
            ) : (
              <>
                {stage !== "Hired" && <Button size="sm" disabled={!selected.size} onClick={() => act(nextStage)}>Advance to {nextStage}</Button>}
                {stage !== "Applied" && <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => act(PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage) - 1])}>Move back</Button>}
                <Button size="sm" variant="danger" disabled={!selected.size} onClick={() => act("Rejected")}>Reject</Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon="📥" title={`No candidates in ${stage}`}>Try a different stage or lower the match threshold.</EmptyState>
      ) : (
        <div className="space-y-1.5">
          {rows.map((a) => (
            <div key={a.id} className={`flex flex-wrap items-center gap-3 bg-card border rounded-xl px-4 py-2.5 transition-colors ${selected.has(a.id) ? "border-primary" : "border-border"}`}>
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(a.id)) next.delete(a.id);
                    else next.add(a.id);
                    return next;
                  })
                }
                className="w-4 h-4 accent-primary flex-shrink-0"
                aria-label={`Select ${a.studentName}`}
              />
              <Avatar name={a.studentName} size={32} />
              <div className="min-w-0 flex-1">
                <button onClick={() => onOpen(a)} className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block text-left">
                  {a.studentName}
                </button>
                <div className="text-[11px] text-muted-foreground truncate">{a.studentCourse} · {a.studentInstitution}</div>
              </div>
              <div className="w-24 flex-shrink-0">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">Match</span>
                  <span className="font-semibold text-primary">{a.match}%</span>
                </div>
                <ProgressBar value={a.match} tone="bg-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">{formatDate(a.appliedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
