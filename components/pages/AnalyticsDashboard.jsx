"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DashboardLayout from "../DashboardLayout";
import { all, listInternships, listApplications, listUsersByRole } from "../../lib/store";

const PIE_COLORS = ["#6B7C3C", "#8A9A4A", "#A8B860", "#3C5A8A", "#5A3C8A"];
const STATUS_COLORS = { Applied: "#8A9A4A", Shortlisted: "#3C5A8A", Interview: "#B8860B", Hired: "#6B7C3C" };
const STAGE_ORDER = ["Applied", "Shortlisted", "Interview", "Hired"];

function daysBetween(aIso, bIso) {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 86400000;
}

/** Look up when an application's statusHistory first reached a given stage. */
function stageTimestamp(app, stage) {
  return app.statusHistory?.find((h) => h.status === stage)?.at || null;
}

export default function AnalyticsDashboard({ activePage = "analytics", title = "Analytics Dashboard" }) {
  const [students, setStudents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    setStudents(listUsersByRole("student"));
    setInternships(listInternships());
    setApplications(listApplications());
    setAssessments(all("assessments"));
  }, []);

  const timeToHire = useMemo(() => {
    const days = applications
      .filter((a) => a.status === "Hired")
      .map((a) => {
        const applied = stageTimestamp(a, "Applied") || a.appliedAt;
        const hired = stageTimestamp(a, "Hired");
        return applied && hired ? daysBetween(applied, hired) : null;
      })
      .filter((d) => d != null);
    return days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null;
  }, [applications]);

  const kpis = useMemo(() => {
    const hired = applications.filter((a) => a.status === "Hired").length;
    const placementRate = applications.length ? Math.round((hired / applications.length) * 100) : 0;
    return [
      { label: "Students", value: String(students.length) },
      { label: "Internships Posted", value: String(internships.filter((i) => i.ownerId !== "seed").length) },
      { label: "Total Applications", value: String(applications.length) },
      { label: "Placement Rate", value: `${placementRate}%` },
      { label: "Avg. Time to Hire", value: timeToHire != null ? `${timeToHire}d` : "—" },
    ];
  }, [students, internships, applications, timeToHire]);

  // A funnel counts every application that REACHED a stage or further, not just
  // ones currently sitting there — Hired implies it already passed through
  // Shortlisted and Interview too.
  const funnel = useMemo(() => {
    return STAGE_ORDER.map((stage, i) => {
      const count = applications.filter((a) => STAGE_ORDER.indexOf(a.status) >= i).length;
      return { stage, count };
    });
  }, [applications]);

  const stageDurations = useMemo(() => {
    const pairs = [
      ["Applied", "Shortlisted"],
      ["Shortlisted", "Interview"],
      ["Interview", "Hired"],
    ];
    return pairs.map(([from, to]) => {
      const diffs = applications
        .map((a) => {
          const fromAt = from === "Applied" ? stageTimestamp(a, "Applied") || a.appliedAt : stageTimestamp(a, from);
          const toAt = stageTimestamp(a, to);
          return fromAt && toAt ? daysBetween(fromAt, toAt) : null;
        })
        .filter((d) => d != null);
      const avg = diffs.length ? Math.round((diffs.reduce((s, d) => s + d, 0) / diffs.length) * 10) / 10 : null;
      return { label: `${from} → ${to}`, avgDays: avg, sampleSize: diffs.length };
    });
  }, [applications]);

  const domainAverages = useMemo(() => {
    const totals = {};
    assessments.forEach((a) => {
      Object.entries(a.domainScores || {}).forEach(([domain, score]) => {
        if (!totals[domain]) totals[domain] = { sum: 0, count: 0 };
        totals[domain].sum += score;
        totals[domain].count += 1;
      });
    });
    return Object.entries(totals)
      .map(([skill, { sum, count }]) => ({ skill, current: Math.round(sum / count), target: 80 }))
      .sort((a, b) => a.current - b.current)
      .slice(0, 6);
  }, [assessments]);

  // Demand (applications) vs. supply (postings) per domain — surfaces where
  // competition is fiercest (high demand share, low supply share) rather than
  // just how postings happen to be distributed.
  const domainComparison = useMemo(() => {
    const postingCounts = {};
    internships.forEach((i) => { postingCounts[i.domain] = (postingCounts[i.domain] || 0) + 1; });
    const appCounts = {};
    applications.forEach((a) => {
      const posting = internships.find((i) => i.id === a.internshipId);
      const domain = posting?.domain || "Other";
      appCounts[domain] = (appCounts[domain] || 0) + 1;
    });
    const totalPostings = internships.length || 1;
    const totalApps = applications.length || 1;
    const domains = new Set([...Object.keys(postingCounts), ...Object.keys(appCounts)]);
    return [...domains]
      .map((domain) => ({
        domain,
        supply: Math.round(((postingCounts[domain] || 0) / totalPostings) * 100),
        demand: Math.round(((appCounts[domain] || 0) / totalApps) * 100),
      }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 8);
  }, [internships, applications]);

  const topCompanies = useMemo(() => {
    const counts = {};
    applications.filter((a) => a.status === "Hired").forEach((a) => { counts[a.company] = (counts[a.company] || 0) + 1; });
    return Object.entries(counts).map(([name, hired]) => ({ name, hired })).sort((a, b) => b.hired - a.hired).slice(0, 6);
  }, [applications]);

  const courseBreakdown = useMemo(() => {
    const groups = {};
    students.forEach((s) => {
      const key = s.course || "Unspecified";
      if (!groups[key]) groups[key] = { students: 0, placedIds: new Set() };
      groups[key].students++;
    });
    // Count distinct placed STUDENTS, not hired APPLICATIONS — one student can be
    // hired for more than one posting, which must not inflate the placement rate
    // past the actual number of students in that course.
    applications.filter((a) => a.status === "Hired").forEach((a) => {
      const student = students.find((s) => s.id === a.studentId);
      if (!student) return; // no matching registered student — nothing to attribute this to
      const key = student.course || "Unspecified";
      groups[key].placedIds.add(a.studentId);
    });
    return Object.entries(groups).map(([dept, v]) => ({
      dept,
      students: v.students,
      placed: v.placedIds.size,
      rate: v.students ? Math.round((v.placedIds.size / v.students) * 100) : 0,
    }));
  }, [students, applications]);

  const maxHired = topCompanies[0]?.hired || 1;

  return (
    <DashboardLayout activePage={activePage} title={title}>
      <div className="animate-fade-slide space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Placement & Skill Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Live insights computed from activity on this platform</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
              <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-1">Hiring Funnel</h3>
            <p className="text-xs text-muted-foreground mb-5">Applications that reached each stage, with conversion from the one before</p>
            {funnel[0].count === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No applications yet.</p>
            ) : (
              <div className="space-y-3">
                {funnel.map((f, i) => {
                  const widthPct = Math.max((f.count / funnel[0].count) * 100, f.count > 0 ? 6 : 0);
                  const conversion = i > 0 && funnel[i - 1].count ? Math.round((f.count / funnel[i - 1].count) * 100) : null;
                  return (
                    <div key={f.stage}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{f.stage}</span>
                        <span className="text-muted-foreground">
                          {f.count}
                          {conversion != null && <span className="ml-1.5">· {conversion}% from {funnel[i - 1].stage}</span>}
                        </span>
                      </div>
                      <div className="h-7 bg-muted rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg flex items-center justify-end pr-2 text-[10px] font-semibold text-white transition-all duration-700"
                          style={{ width: `${widthPct}%`, backgroundColor: STATUS_COLORS[f.stage] }}
                        >
                          {f.count > 0 && f.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-3 gap-2 pt-3 mt-1 border-t border-border">
                  {stageDurations.map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">{s.label}</div>
                      <div className="text-sm font-semibold text-foreground">{s.avgDays != null ? `${s.avgDays}d avg` : "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-1">Demand vs. Supply by Domain</h3>
            <p className="text-xs text-muted-foreground mb-4">Share of applications vs. share of postings</p>
            {domainComparison.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {domainComparison.map((d) => (
                  <div key={d.domain}>
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <span className="font-medium text-foreground truncate">{d.domain}</span>
                      <span className="text-muted-foreground flex-shrink-0">{d.demand}% demand · {d.supply}% supply</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/70 rounded-full transition-all duration-700" style={{ width: `${d.demand}%` }} />
                      <div className="absolute left-0 h-1 top-1/2 -translate-y-1/2 bg-foreground/50 rounded-full transition-all duration-700" style={{ width: `${d.supply}%` }} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/70 inline-block" /> Demand (applications)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-full bg-foreground/50 inline-block" /> Supply (postings)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-1">Top Skill Gaps</h3>
            <p className="text-xs text-muted-foreground mb-5">Average scores across all completed assessments vs. an 80% readiness target</p>
            {domainAverages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No skill assessments completed yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={domainAverages} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 60 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis dataKey="skill" type="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }} />
                  <Bar dataKey="current" fill="var(--primary)" radius={4} name="Current avg" barSize={7} />
                  <Bar dataKey="target" fill="var(--muted)" radius={4} name="Target" barSize={7} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 8 }} formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Top Hiring Partners</h3>
            {topCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hires recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {topCompanies.map((co, i) => (
                  <div key={co.name} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">{i + 1}</div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>
                      {co.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{co.name}</div>
                      <div className="w-full h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(co.hired / maxHired) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-foreground flex-shrink-0">{co.hired}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Course-wise Placement Summary</h3>
          {courseBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No students registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Course</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Students</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Placed</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {courseBreakdown.map((row) => (
                    <tr key={row.dept} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 font-medium text-foreground">{row.dept}</td>
                      <td className="py-3 text-center text-muted-foreground">{row.students}</td>
                      <td className="py-3 text-center text-foreground font-medium">{row.placed}</td>
                      <td className="py-3 text-center"><span className="text-primary font-semibold">{row.rate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
