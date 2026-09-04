"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, DataTable, EmptyState, Field, Flash, PageHeader, ProgressBar, Section, Select, StatGrid, useFlash } from "../../ui/Kit";
import { SKILL_DOMAINS } from "../../../lib/questionBank";
import { downloadFile, listApplications, listProgramRegistrations, listPrograms, toCsv } from "../../../lib/store";
import { PLACEMENT_TONE, STUDENT_EXPORT_COLUMNS, averageDomainScores, buildFacultyStudents } from "./useFaculty";

const STAGE_ORDER = ["Applied", "Shortlisted", "Interview", "Hired"];
const STAGE_COLORS = { Applied: "#8A9A4A", Shortlisted: "#3C5A8A", Interview: "#B8860B", Hired: "#6B7C3C" };

/**
 * Analytics scoped to a faculty member's own students — their advisees by
 * default, widening to the department. The previous build sent both the
 * academician and the institution to the same platform-wide, industry-facing
 * dashboard, which told a lecturer nothing about their own cohort.
 */
export default function AcademicianAnalytics() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [scope, setScope] = useState("department");
  const [batch, setBatch] = useState("All");
  const [flash, setFlash] = useFlash();

  useEffect(() => setReady(true), []);

  const students = useMemo(() => (ready && user ? buildFacultyStudents(user) : []), [user, ready]);
  const programs = useMemo(() => (ready ? listPrograms().filter((p) => p.ownerId === user?.id) : []), [ready, user]);

  const batches = useMemo(() => ["All", ...[...new Set(students.map((s) => s.batch).filter(Boolean))].sort()], [students]);

  const cohort = useMemo(() => {
    const base =
      scope === "advisees"
        ? students.filter((s) => s.isAdvisee)
        : scope === "department"
        ? students.filter((s) => s.department === user?.department)
        : students;
    return base.filter((s) => batch === "All" || s.batch === batch);
  }, [students, scope, batch, user]);

  const cohortIds = useMemo(() => new Set(cohort.map((s) => s.id)), [cohort]);
  const applications = useMemo(() => (ready ? listApplications().filter((a) => cohortIds.has(a.studentId)) : []), [cohortIds, ready]);

  const placed = cohort.filter((s) => s.status === "Placed").length;
  const assessed = cohort.filter((s) => s.score != null);
  const avgScore = assessed.length ? Math.round(assessed.reduce((s, x) => s + x.score, 0) / assessed.length) : null;

  const funnel = useMemo(
    () => STAGE_ORDER.map((stage, i) => ({ stage, count: applications.filter((a) => STAGE_ORDER.indexOf(a.status) >= i).length })),
    [applications]
  );

  const radarData = useMemo(() => {
    const averages = Object.fromEntries(averageDomainScores(cohort).map((d) => [d.domain, d.avg]));
    return SKILL_DOMAINS.map((skill) => ({ skill: skill.split(" ")[0], full: skill, value: averages[skill] ?? 0 }));
  }, [cohort]);

  const byBatch = useMemo(() => {
    const groups = {};
    cohort.forEach((s) => {
      const key = s.batch || "Unassigned";
      if (!groups[key]) groups[key] = { batch: key, students: 0, placed: 0, scoreSum: 0, scored: 0 };
      groups[key].students += 1;
      if (s.status === "Placed") groups[key].placed += 1;
      if (s.score != null) {
        groups[key].scoreSum += s.score;
        groups[key].scored += 1;
      }
    });
    return Object.values(groups)
      .map((g) => ({ ...g, rate: g.students ? Math.round((g.placed / g.students) * 100) : 0, avgScore: g.scored ? Math.round(g.scoreSum / g.scored) : 0 }))
      .sort((a, b) => a.batch.localeCompare(b.batch));
  }, [cohort]);

  const employers = useMemo(() => {
    const counts = {};
    applications.forEach((a) => {
      if (!counts[a.company]) counts[a.company] = { company: a.company, applications: 0, hired: 0 };
      counts[a.company].applications += 1;
      if (a.status === "Hired") counts[a.company].hired += 1;
    });
    return Object.values(counts).sort((a, b) => b.hired - a.hired || b.applications - a.applications).slice(0, 6);
  }, [applications]);

  const programImpact = useMemo(
    () =>
      programs.map((p) => {
        const regs = listProgramRegistrations(p.id);
        return {
          title: p.title,
          dates: p.dates,
          confirmed: regs.filter((r) => r.status === "Confirmed").length,
          attended: regs.filter((r) => r.attended).length,
          certificates: regs.filter((r) => r.certificateNo).length,
          seats: p.seats,
        };
      }),
    [programs]
  );

  function exportCohort() {
    if (!cohort.length) return setFlash("No students in this scope to export.");
    downloadFile(`cohort-analytics-${scope}-${batch}.csv`, toCsv(cohort, STUDENT_EXPORT_COLUMNS));
    setFlash(`Exported ${cohort.length} student record${cohort.length === 1 ? "" : "s"}.`);
  }

  return (
    <DashboardLayout activePage="academician-analytics" title="Cohort Analytics">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Cohort Analytics"
          subtitle={`Scoped to ${user?.department || "your department"} at ${user?.institution || "your institution"} — not platform-wide figures.`}
          actions={<Button size="sm" variant="outline" onClick={exportCohort}>Export cohort</Button>}
        />

        <Flash message={flash} />

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Cohort">
            <Select value={scope} onChange={(e) => setScope(e.target.value)} className="w-auto">
              <option value="advisees">My advisees</option>
              <option value="department">My department</option>
              <option value="institution">Whole institution</option>
            </Select>
          </Field>
          <Field label="Batch">
            <Select value={batch} onChange={(e) => setBatch(e.target.value)} className="w-auto">
              {batches.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </Field>
        </div>

        <StatGrid
          stats={[
            { label: "Students in scope", value: String(cohort.length), icon: "🎓" },
            { label: "Placed", value: String(placed), icon: "✅", hint: cohort.length ? `${Math.round((placed / cohort.length) * 100)}% of cohort` : "—" },
            { label: "Average skill score", value: avgScore != null ? String(avgScore) : "—", icon: "📊", hint: `${assessed.length} assessed` },
            { label: "Applications", value: String(applications.length), icon: "📤" },
            { label: "Employers engaged", value: String(employers.length), icon: "🏢" },
          ]}
          columns={5}
        />

        {cohort.length === 0 ? (
          <EmptyState icon="📊" title="No students in this scope">
            Assign advisees or widen the scope to see cohort analytics.
          </EmptyState>
        ) : (
          <>
            <div className="grid lg:grid-cols-5 gap-5">
              <Card className="lg:col-span-3">
                <Section title="Your cohort's hiring funnel" description="Applications from these students that reached each stage.">
                  {funnel[0].count === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">This cohort hasn't applied to anything yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {funnel.map((f, i) => {
                        const width = Math.max((f.count / funnel[0].count) * 100, f.count > 0 ? 6 : 0);
                        const conversion = i > 0 && funnel[i - 1].count ? Math.round((f.count / funnel[i - 1].count) * 100) : null;
                        return (
                          <div key={f.stage}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-foreground">{f.stage}</span>
                              <span className="text-muted-foreground">
                                {f.count}{conversion != null && <span className="ml-1.5">· {conversion}% from {funnel[i - 1].stage}</span>}
                              </span>
                            </div>
                            <div className="h-7 bg-muted rounded-lg overflow-hidden">
                              <div
                                className="h-full rounded-lg flex items-center justify-end pr-2 text-[10px] font-semibold text-white transition-all duration-700"
                                style={{ width: `${width}%`, backgroundColor: STAGE_COLORS[f.stage] }}
                              >
                                {f.count > 0 && f.count}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>
              </Card>

              <Card className="lg:col-span-2">
                <Section title="Cohort skill profile" description="Average score across every assessed domain.">
                  {assessed.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No assessments completed yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                        <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
                        <Tooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                          formatter={(value, _n, entry) => [`${value}`, entry?.payload?.full]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </Section>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <Card>
                <Section title="Batch comparison" description="Placement rate and average skill score, batch by batch.">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={byBatch} margin={{ top: 10, right: 16, bottom: 0, left: -20 }} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="batch" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="avgScore" fill="var(--muted)" radius={4} name="Avg. skill score" />
                      <Bar dataKey="rate" fill="var(--primary)" radius={4} name="Placement rate %" />
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              </Card>

              <Card>
                <Section title="Where your students go" description="Employers ranked by hires from this cohort only.">
                  {employers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No applications from this cohort yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {employers.map((c, i) => (
                        <div key={c.company}>
                          <div className="flex items-center justify-between text-xs mb-1 gap-2">
                            <span className="font-medium text-foreground truncate">{i + 1}. {c.company}</span>
                            <span className="text-muted-foreground flex-shrink-0">{c.hired} hired / {c.applications} applied</span>
                          </div>
                          <ProgressBar value={c.hired} max={employers[0].hired || 1} tone="bg-primary" />
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </Card>
            </div>

            <Section title="Students in scope" description="Click through from My Students to open a full profile and add mentor notes.">
              <DataTable
                columns={[
                  { key: "name", header: "Student", render: (s) => <span className="font-medium text-foreground">{s.name}</span> },
                  { key: "batch", header: "Batch", align: "center", render: (s) => <span className="text-xs text-muted-foreground">{s.batch || "—"}</span> },
                  { key: "score", header: "Skill", align: "center", render: (s) => <span className="font-semibold text-foreground">{s.score ?? "—"}</span> },
                  { key: "apps", header: "Apps", align: "center", hideBelow: "hidden sm:table-cell", render: (s) => <span className="text-xs text-muted-foreground">{s.applications}</span> },
                  { key: "status", header: "Placement", align: "center", render: (s) => <Badge tone={PLACEMENT_TONE[s.status]}>{s.status}</Badge> },
                  { key: "advisee", header: "Advisee", align: "center", hideBelow: "hidden md:table-cell", render: (s) => (s.isAdvisee ? <Badge tone="primary">Mine</Badge> : <span className="text-[11px] text-muted-foreground">—</span>) },
                ]}
                rows={cohort}
                rowKey={(s) => s.id}
              />
            </Section>

            {programImpact.length > 0 && (
              <Card>
                <Section title="Programme reach" description="Turnout and certification across the FDPs you host.">
                  <div className="space-y-3">
                    {programImpact.map((p) => (
                      <div key={p.title}>
                        <div className="flex items-center justify-between text-xs mb-1 gap-2">
                          <span className="font-medium text-foreground truncate">{p.title}</span>
                          <span className="text-muted-foreground flex-shrink-0">
                            {p.confirmed}/{p.seats} registered · {p.attended} attended · {p.certificates} certified
                          </span>
                        </div>
                        <ProgressBar value={p.confirmed} max={p.seats || 1} />
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
