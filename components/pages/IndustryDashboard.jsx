"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import {
  listInternshipsByOwner,
  listApplicationsForOwner,
  updateApplicationStatus,
  createInternship,
} from "../../lib/store";
import { formatDate, daysUntil } from "../../lib/match";

const statusCols = ["Applied", "Shortlisted", "Interview", "Hired"];

const statusStyle = {
  Applied: "bg-secondary/70",
  Shortlisted: "bg-blue-50 dark:bg-blue-950/20",
  Interview: "bg-amber-50 dark:bg-amber-950/20",
  Hired: "bg-green-50 dark:bg-green-950/20",
};

const statusBadge = {
  Applied: "bg-secondary text-muted-foreground",
  Shortlisted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Interview: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Hired: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
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
  const [postings, setPostings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [showPostJob, setShowPostJob] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const [form, setForm] = useState({ title: "", location: "", stipend: "", duration: "", tags: "" });

  function refresh() {
    setPostings(listInternshipsByOwner(user.id));
    setApplications(listApplicationsForOwner(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  function moveApplicant(id, newStatus) {
    setMovingId(id);
    setTimeout(() => {
      updateApplicationStatus(id, newStatus);
      refresh();
      setMovingId(null);
    }, 150);
  }

  const byStatus = (status) => applications.filter((a) => a.status === status);

  const kpiData = useMemo(() => {
    const total = applications.length;
    const shortlisted = byStatus("Shortlisted").length + byStatus("Interview").length + byStatus("Hired").length;
    const interview = byStatus("Interview").length + byStatus("Hired").length;
    const hired = byStatus("Hired").length;
    return [
      { label: "Total Applications", value: String(total), icon: "📋", delta: `${postings.length} posting${postings.length === 1 ? "" : "s"}` },
      { label: "Shortlisted", value: String(shortlisted), icon: "⭐", delta: total ? `${Math.round((shortlisted / total) * 100)}% rate` : "—" },
      { label: "In Interview", value: String(interview), icon: "🎙", delta: total ? `${Math.round((interview / total) * 100)}% rate` : "—" },
      { label: "Hired", value: String(hired), icon: "✅", delta: total ? `${Math.round((hired / total) * 100)}% conversion` : "—" },
    ];
  }, [applications, postings]);

  function handleCreate(e) {
    e.preventDefault();
    createInternship(user.id, user.companyName || user.name, {
      title: form.title,
      location: form.location || "Remote",
      type: "Hybrid",
      domain: "IT",
      duration: form.duration || "3 months",
      stipend: form.stipend || "Unpaid",
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      description: "",
    });
    setForm({ title: "", location: "", stipend: "", duration: "", tags: "" });
    setShowPostJob(false);
    refresh();
  }

  return (
    <DashboardLayout activePage="industry-dashboard" title="Industry Dashboard">
      <div className="animate-fade-slide space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Welcome, {user.name?.split(" ")[0]} 👋</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{user.companyName || "Your organisation"} · Talent Acquisition</p>
          </div>
          <button onClick={() => setShowPostJob(true)} className="flex items-center gap-2 bg-primary hover:bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 hover:shadow-md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Post New Job
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <span className="text-lg">{kpi.icon}</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.delta}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-3 text-sm">Active Postings</h3>
          {postings.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
              You haven't posted any opportunities yet. Click "Post New Job" to get started.
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {postings.slice(0, 3).map((job) => {
                const apps = applications.filter((a) => a.internshipId === job.id).length;
                const urgent = daysUntil(job.deadline) <= 10;
                return (
                  <div key={job.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{job.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{job.location} · {job.type}</div>
                      </div>
                      {urgent && <span className="text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full flex-shrink-0">Closing soon</span>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{apps} applicant{apps === 1 ? "" : "s"}</span>
                      <span>Deadline: {formatDate(job.deadline)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-4">Applicant Pipeline</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
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
                      <div key={applicant.id} className={`bg-card border border-border rounded-xl p-3 hover:shadow-sm transition-all duration-150 ${movingId === applicant.id ? "opacity-40 scale-95" : ""}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: colorFor(applicant.studentName) }}>
                            {initials(applicant.studentName)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{applicant.studentName}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{applicant.studentCourse || applicant.internshipTitle}</div>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground mb-2 truncate">{applicant.studentInstitution}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-primary">{applicant.match}% match</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(applicant.appliedAt)}</span>
                        </div>

                        <div className="mt-2 flex gap-1">
                          {status !== "Applied" && (
                            <button onClick={() => moveApplicant(applicant.id, statusCols[statusCols.indexOf(status) - 1])} className="flex-1 text-[10px] py-1 bg-secondary rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                              ← Move back
                            </button>
                          )}
                          {status !== "Hired" && (
                            <button onClick={() => moveApplicant(applicant.id, statusCols[statusCols.indexOf(status) + 1])} className="flex-1 text-[10px] py-1 bg-primary/10 rounded-lg hover:bg-primary text-primary hover:text-white transition-colors">
                              Advance →
                            </button>
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
        </div>
      </div>

      {showPostJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPostJob(false)} />
          <div className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-foreground text-lg mb-5">Post New Opportunity</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Role Title</label>
                <input required type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Software Development Intern"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Location</label>
                <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Bengaluru / Remote"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Stipend / CTC</label>
                <input type="text" value={form.stipend} onChange={(e) => setForm((f) => ({ ...f, stipend: e.target.value }))} placeholder="₹12,000/mo"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Duration</label>
                <input type="text" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="3 months"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Required Skills</label>
                <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="React, SQL, Communication"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPostJob(false)} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-all duration-150">Post Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
