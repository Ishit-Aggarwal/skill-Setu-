"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import DashboardLayout from "../DashboardLayout";
import { all, listInternships, listApplications, listUsersByRole } from "../../lib/store";

const PIE_COLORS = ["#6B7C3C", "#8A9A4A", "#A8B860", "#3C5A8A", "#5A3C8A"];
const STATUS_COLORS = { Applied: "#8A9A4A", Shortlisted: "#3C5A8A", Interview: "#B8860B", Hired: "#6B7C3C" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-md text-xs">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
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

  const kpis = useMemo(() => {
    const companies = new Set(internships.filter((i) => i.ownerId !== "seed").map((i) => i.company));
    const hired = applications.filter((a) => a.status === "Hired").length;
    const placementRate = applications.length ? Math.round((hired / applications.length) * 100) : 0;
    return [
      { label: "Students", value: String(students.length) },
      { label: "Internships Posted", value: String(internships.filter((i) => i.ownerId !== "seed").length) },
      { label: "Total Applications", value: String(applications.length) },
      { label: "Placement Rate", value: `${placementRate}%` },
    ];
  }, [students, internships, applications]);

  const statusBreakdown = useMemo(() => {
    const counts = { Applied: 0, Shortlisted: 0, Interview: 0, Hired: 0 };
    applications.forEach((a) => { if (counts[a.status] != null) counts[a.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
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

  const domainDistribution = useMemo(() => {
    const counts = {};
    internships.forEach((i) => { counts[i.domain] = (counts[i.domain] || 0) + 1; });
    const total = internships.length || 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value: Math.round((value / total) * 100) }));
  }, [internships]);

  const topCompanies = useMemo(() => {
    const counts = {};
    applications.filter((a) => a.status === "Hired").forEach((a) => { counts[a.company] = (counts[a.company] || 0) + 1; });
    return Object.entries(counts).map(([name, hired]) => ({ name, hired })).sort((a, b) => b.hired - a.hired).slice(0, 6);
  }, [applications]);

  const courseBreakdown = useMemo(() => {
    const groups = {};
    students.forEach((s) => {
      const key = s.course || "Unspecified";
      if (!groups[key]) groups[key] = { students: 0, placed: 0 };
      groups[key].students++;
    });
    applications.filter((a) => a.status === "Hired").forEach((a) => {
      const student = students.find((s) => s.id === a.studentId);
      const key = student?.course || "Unspecified";
      if (groups[key]) groups[key].placed++;
    });
    return Object.entries(groups).map(([dept, v]) => ({ dept, ...v, rate: v.students ? Math.round((v.placed / v.students) * 100) : 0 }));
  }, [students, applications]);

  const maxHired = topCompanies[0]?.hired || 1;

  return (
    <DashboardLayout activePage={activePage} title={title}>
      <div className="animate-fade-slide space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Placement & Skill Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Live insights computed from activity on this platform</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
              <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-1">Applicant Pipeline</h3>
            <p className="text-xs text-muted-foreground mb-5">Applications by current stage, across all postings</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusBreakdown} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={6} name="applications">
                  {statusBreakdown.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-foreground text-sm mb-1">Postings by Domain</h3>
            <p className="text-xs text-muted-foreground mb-4">Share of listed opportunities</p>
            {domainDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No postings yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={domainDistribution} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                      {domainDistribution.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} formatter={(value) => [`${value}%`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {domainDistribution.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground flex-1">{d.name}</span>
                      <span className="font-semibold text-foreground">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </>
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
