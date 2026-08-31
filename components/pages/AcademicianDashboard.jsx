"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  listPrograms,
  createProgram,
  registerForProgram,
  SEED_COLLABS,
  getCollabResponse,
  setCollabResponse,
  listUsersByRole,
  listApplicationsForStudent,
  getAssessment,
} from "../../lib/store";

const collabTypeColor = {
  Industry: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300",
  Academic: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300",
  Govt: "text-olive-700 bg-olive-100 dark:bg-olive-900/30 dark:text-olive-300",
};

const collabStatusColor = {
  Active: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400",
  "Pending Review": "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
};

const modeColor = {
  Hybrid: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300",
  Online: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  Onsite: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
};

const statusColor = {
  Placed: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400",
  "In Progress": "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300",
  Searching: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  "Not started": "text-muted-foreground bg-muted",
};

export default function AcademicianDashboard() {
  const { user } = useAuth();
  const navigate = useNav();
  const [activeTab, setActiveTab] = useState("fdp");
  const [programs, setPrograms] = useState([]);
  const [respondedCollabs, setRespondedCollabs] = useState({});
  const [students, setStudents] = useState([]);
  const [showHost, setShowHost] = useState(false);
  const [form, setForm] = useState({ title: "", dates: "", seats: "30", mode: "Hybrid" });

  function refresh() {
    setPrograms(listPrograms());
    const resp = {};
    SEED_COLLABS.forEach((c) => { resp[c.id] = getCollabResponse(c.id); });
    setRespondedCollabs(resp);

    const studentUsers = listUsersByRole("student");
    const rows = studentUsers
      .map((s) => {
        const assessment = getAssessment(s.id);
        const apps = listApplicationsForStudent(s.id);
        let placement = "Not started";
        if (apps.some((a) => a.status === "Hired")) placement = "Placed";
        else if (apps.some((a) => a.status === "Interview" || a.status === "Shortlisted")) placement = "In Progress";
        else if (apps.length) placement = "Searching";
        const match = apps.length ? Math.max(...apps.map((a) => a.match || 0)) : null;
        return { id: s.id, name: s.name, course: s.course || "—", institution: s.institution, score: assessment ? Math.round(assessment.overallScore) : null, match, placement };
      })
      .sort((a, b) => (b.institution === user.institution) - (a.institution === user.institution));
    setStudents(rows);
  }

  useEffect(() => { refresh(); }, [user]);

  function respond(collabId, response) {
    setCollabResponse(collabId, response);
    refresh();
  }

  function register(programId) {
    registerForProgram(programId, user.id);
    refresh();
  }

  function hostProgram(e) {
    e.preventDefault();
    createProgram(user.id, user.institution || user.name, { title: form.title, dates: form.dates, seats: Number(form.seats) || 30, mode: form.mode });
    setForm({ title: "", dates: "", seats: "30", mode: "Hybrid" });
    setShowHost(false);
    refresh();
  }

  const stats = useMemo(() => {
    const placed = students.filter((s) => s.placement === "Placed").length;
    return {
      mentored: students.length,
      placedRate: students.length ? Math.round((placed / students.length) * 100) : 0,
    };
  }, [students]);

  return (
    <DashboardLayout activePage="academician-dashboard" title="Academician Dashboard">
      <div className="animate-fade-slide space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Good to see you, {user.name?.split(" ")[0]} 👋</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{user.department || "Faculty"} · {user.institution}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-center">
              <div className="text-lg font-bold text-primary">{stats.mentored}</div>
              <div className="text-xs text-muted-foreground">Students on platform</div>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-center">
              <div className="text-lg font-bold text-primary">{programs.filter((p) => p.ownerId === user.id).length}</div>
              <div className="text-xs text-muted-foreground">Programs hosted</div>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-center">
              <div className="text-lg font-bold text-primary">{stats.placedRate}%</div>
              <div className="text-xs text-muted-foreground">Student placement</div>
            </div>
          </div>
        </div>

        <div className="flex bg-secondary rounded-xl p-1 w-full sm:w-auto sm:inline-flex">
          {[
            { key: "fdp", label: "FDP Programs" },
            { key: "collabs", label: "Research Collabs" },
            { key: "students", label: "Student Progress" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "fdp" && (
          <div className="space-y-4 animate-fade-slide">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Faculty Development Programs</p>
              <button onClick={() => setShowHost(true)} className="text-sm font-medium text-primary hover:underline">+ Host a Program</button>
            </div>
            {programs.map((fdp) => {
              const fillPct = Math.round(((fdp.enrolled || 0) / (fdp.seats || 1)) * 100);
              const status = fillPct >= 90 ? "Almost Full" : "Open";
              return (
                <div key={fdp.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground mb-0.5">{fdp.title}</div>
                      <div className="text-xs text-muted-foreground">{fdp.organiser}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${modeColor[fdp.mode] || "bg-muted text-muted-foreground"}`}>{fdp.mode}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === "Almost Full" ? "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400" : "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400"}`}>{status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>📅 {fdp.dates}</span>
                    <span>🪑 {fdp.enrolled || 0}/{fdp.seats} seats</span>
                  </div>

                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-4">
                    <div className={`h-full rounded-full transition-all duration-700 ${fillPct >= 90 ? "bg-red-500" : fillPct >= 60 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${fillPct}%` }} />
                  </div>

                  <button onClick={() => register(fdp.id)} className="w-full text-sm py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-medium transition-all duration-150">
                    Register Yourself
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "collabs" && (
          <div className="space-y-4 animate-fade-slide">
            <p className="text-sm text-muted-foreground">Industry and institutional research collaboration requests</p>
            {SEED_COLLABS.map((collab) => {
              const response = respondedCollabs[collab.id];
              return (
                <div key={collab.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground mb-1">{collab.title}</div>
                      <div className="text-xs text-muted-foreground">{collab.initiator}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${collabTypeColor[collab.type]}`}>{collab.type}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${response ? "bg-muted text-muted-foreground" : collabStatusColor[collab.status]}`}>{response ?? collab.status}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">Deadline: {collab.deadline}</div>

                  {collab.status === "Pending Review" && !response && (
                    <div className="flex gap-2">
                      <button onClick={() => respond(collab.id, "Accepted")} className="flex-1 text-sm py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-medium transition-all duration-150">Accept Collaboration</button>
                      <button onClick={() => respond(collab.id, "Declined")} className="text-sm px-4 py-2.5 rounded-xl bg-secondary text-muted-foreground hover:bg-muted font-medium transition-colors">Decline</button>
                    </div>
                  )}
                  {collab.status === "Active" && (
                    <button className="text-sm py-2.5 px-4 rounded-xl bg-secondary text-muted-foreground hover:text-foreground font-medium transition-colors">View Project Workspace →</button>
                  )}
                  {response && (
                    <div className={`text-sm py-2 text-center rounded-xl font-medium ${response === "Accepted" ? "text-green-600 bg-green-50 dark:bg-green-950/30" : "text-muted-foreground bg-muted"}`}>
                      {response === "Accepted" ? "✓ Collaboration accepted" : "Request declined"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "students" && (
          <div className="animate-fade-slide">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Students on the platform — skill scores and placement status</p>
              <button onClick={() => navigate("analytics")} className="text-sm text-primary font-medium hover:underline">View analytics →</button>
            </div>
            {students.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">No students have registered yet.</div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Student</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Institution</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Skill Score</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Best Match</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.course}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{s.institution}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-semibold text-foreground">{s.score ?? "—"}</span>
                              {s.score != null && (
                                <div className="w-12 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${s.score}%` }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-primary hidden md:table-cell">{s.match != null ? `${s.match}%` : "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[s.placement]}`}>{s.placement}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHost(false)} />
          <div className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-slide">
            <h3 className="font-semibold text-foreground text-lg mb-5">Host a Faculty Development Program</h3>
            <form onSubmit={hostProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Program Title</label>
                <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Advanced Data Science & Machine Learning"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Dates</label>
                <input value={form.dates} onChange={(e) => setForm((f) => ({ ...f, dates: e.target.value }))} placeholder="Nov 10–14, 2026"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Seats</label>
                  <input type="number" value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Mode</label>
                  <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {["Hybrid", "Online", "Onsite"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowHost(false)} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-all duration-150">Publish Program</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
