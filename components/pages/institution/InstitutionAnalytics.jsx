"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, DataTable, EmptyState, Field, Flash, Modal, PageHeader, ProgressBar, Section, Select, StatGrid, Tabs, TextInput, useFlash } from "../../ui/Kit";
import { formatDate } from "../../../lib/match";
import {
  downloadFile,
  listApplications,
  listInternships,
  listPlacementHistory,
  logActivity,
  toCsv,
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  parseCsv,
  upsertPlacementHistory,
  updatePlacementHistory,
  removePlacementHistory,
  getInstitutionProfile,
} from "../../../lib/store";
import { DEPARTMENTS } from "../../../lib/domains";
import { PLACEMENT_TONE, buildRoster, useInstitutionName } from "./useInstitution";

const STAGE_ORDER = PIPELINE_STAGES;
const STAGE_COLORS = { Applied: "#8A9A4A", Shortlisted: "#3C5A8A", Interview: "#B8860B", Hired: "#6B7C3C" };

function daysBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
}

function stageAt(app, stage) {
  return app.statusHistory?.find((h) => h.status === stage)?.at || null;
}

/**
 * Placement analytics scoped to THIS institution's own students.
 *
 * The previous build pointed institutions at the same platform-wide,
 * industry-facing dashboard every other role saw — complete with a "Top Hiring
 * Partners" leaderboard ranking companies across the whole platform, which is
 * of no use to a college. Everything here is computed only from students
 * registered under this institution.
 */
export default function InstitutionAnalytics() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("current");
  const [batch, setBatch] = useState("All");
  const [flash, setFlash] = useFlash();
  const [version, setVersion] = useState(0);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const fileInputRef = useRef(null);

  const bump = (msg) => {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  };

  useEffect(() => setReady(true), []);

  const profile = useMemo(() => (ready && instituteName ? getInstitutionProfile(instituteName) : null), [instituteName, ready]);
  const departmentOptions = useMemo(() => (profile?.departments?.length ? profile.departments : DEPARTMENTS), [profile]);

  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready]);
  const history = useMemo(() => (ready && instituteName ? listPlacementHistory(instituteName) : []), [instituteName, ready, version]);

  const batches = useMemo(() => ["All", ...[...new Set(roster.map((r) => r.batch).filter(Boolean))].sort()], [roster]);
  const scoped = useMemo(() => roster.filter((r) => batch === "All" || r.batch === batch), [roster, batch]);
  const scopedIds = useMemo(() => new Set(scoped.map((r) => r.id)), [scoped]);

  const applications = useMemo(
    () => (ready ? listApplications().filter((a) => scopedIds.has(a.studentId)) : []),
    [scopedIds, ready]
  );

  const placed = scoped.filter((r) => r.status === "Placed").length;
  const placementRate = scoped.length ? Math.round((placed / scoped.length) * 100) : 0;

  const timeToHire = useMemo(() => {
    const days = applications
      .filter((a) => a.status === "Hired")
      .map((a) => {
        const from = stageAt(a, "Applied") || a.appliedAt;
        const to = stageAt(a, "Hired");
        return from && to ? daysBetween(from, to) : null;
      })
      .filter((d) => d != null);
    return days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null;
  }, [applications]);

  const inPipeline = useMemo(
    () => applications.filter((a) => !TERMINAL_STAGES.includes(a.status)),
    [applications]
  );
  const rejectedCount = useMemo(
    () => applications.filter((a) => a.status === "Rejected").length,
    [applications]
  );

  const funnel = useMemo(
    () =>
      STAGE_ORDER.map((stage, i) => ({
        stage,
        count: inPipeline.filter((a) => STAGE_ORDER.indexOf(a.status) >= i).length,
      })),
    [inPipeline]
  );

  const byDepartment = useMemo(() => {
    const groups = {};
    scoped.forEach((r) => {
      if (!groups[r.department]) groups[r.department] = { department: r.department, students: 0, placed: 0, inProcess: 0, scoreSum: 0, scored: 0 };
      const g = groups[r.department];
      g.students += 1;
      if (r.status === "Placed") g.placed += 1;
      if (r.status === "In Process") g.inProcess += 1;
      if (r.score != null) {
        g.scoreSum += r.score;
        g.scored += 1;
      }
    });
    return Object.values(groups)
      .map((g) => ({
        ...g,
        rate: g.students ? Math.round((g.placed / g.students) * 100) : 0,
        avgScore: g.scored ? Math.round(g.scoreSum / g.scored) : null,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [scoped]);

  // Recruiters who hired OUR students — not a platform-wide leaderboard.
  const ourRecruiters = useMemo(() => {
    const counts = {};
    applications.forEach((a) => {
      if (!counts[a.company]) counts[a.company] = { company: a.company, applications: 0, hired: 0, interviews: 0 };
      counts[a.company].applications += 1;
      if (a.status === "Hired") counts[a.company].hired += 1;
      if (a.status === "Interview" || a.status === "Hired") counts[a.company].interviews += 1;
    });
    return Object.values(counts)
      .map((c) => ({ ...c, conversion: c.applications ? Math.round((c.hired / c.applications) * 100) : 0 }))
      .sort((a, b) => b.hired - a.hired || b.applications - a.applications);
  }, [applications]);

  // Students most in need of intervention — an early-warning list a TPO can act on.
  const atRisk = useMemo(
    () =>
      scoped
        .filter((r) => r.status !== "Placed")
        .map((r) => ({
          ...r,
          risk:
            (r.score == null ? 40 : r.score < 55 ? 30 : r.score < 70 ? 15 : 0) +
            (r.status === "Rejected" ? 35 : r.applications === 0 ? 35 : r.applications < 2 ? 15 : 0) +
            (/4th|final/i.test(r.year || "") ? 25 : 0),
        }))
        .filter((r) => r.risk >= 40)
        .sort((a, b) => b.risk - a.risk)
        .slice(0, 12),
    [scoped]
  );

  const historyByBatch = useMemo(() => {
    const groups = {};
    history.forEach((h) => {
      if (!groups[h.batch]) groups[h.batch] = { batch: String(h.batch), students: 0, placed: 0, stipendSum: 0, rows: 0 };
      groups[h.batch].students += h.students;
      groups[h.batch].placed += h.placed;
      groups[h.batch].stipendSum += h.medianStipend || 0;
      groups[h.batch].rows += 1;
    });
    return Object.values(groups)
      .map((g) => ({
        batch: g.batch,
        students: g.students,
        placed: g.placed,
        rate: g.students ? Math.round((g.placed / g.students) * 100) : 0,
        medianStipend: g.rows ? Math.round(g.stipendSum / g.rows) : 0,
      }))
      .sort((a, b) => a.batch.localeCompare(b.batch));
  }, [history]);

  function exportReportCard() {
    const columns = [
      { label: "Department", value: (r) => r.department },
      { label: "Students", value: (r) => r.students },
      { label: "Placed", value: (r) => r.placed },
      { label: "In process", value: (r) => r.inProcess },
      { label: "Placement rate (%)", value: (r) => r.rate },
      { label: "Average skill score", value: (r) => r.avgScore ?? "" },
    ];
    downloadFile(
      `${(instituteName || "institution").replace(/\W+/g, "-").toLowerCase()}-placement-report-${batch === "All" ? "all" : batch}.csv`,
      toCsv(byDepartment, columns)
    );
    logActivity(instituteName, user?.name || "Admin", "Exported placement report card", batch === "All" ? "All batches" : `Batch ${batch}`);
    setFlash("Placement report card exported.");
  }

  function exportHistoryCsv() {
    const columns = [
      { label: "Batch", value: (r) => r.batch },
      { label: "Department", value: (r) => r.department },
      { label: "Students", value: (r) => r.students },
      { label: "Placed", value: (r) => r.placed },
      { label: "Placement Rate (%)", value: (r) => Math.round((r.placed / r.students) * 100) },
      { label: "Median Stipend (INR)", value: (r) => r.medianStipend || 0 },
      { label: "Top Recruiter", value: (r) => r.topRecruiter || "" },
    ];
    downloadFile(
      `${(instituteName || "institution").replace(/\W+/g, "-").toLowerCase()}-historic-placement.csv`,
      toCsv(history, columns)
    );
    logActivity(instituteName, user?.name || "Admin", "Exported historic placement records", `${history.length} records`);
    setFlash("Historic placement records exported.");
  }

  function handleCsvImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const { rows } = parseCsv(text);
        if (!rows.length) {
          setFlash("CSV file was empty or could not be parsed.");
          return;
        }

        let imported = 0;
        let skipped = 0;
        const errors = [];

        rows.forEach((row, i) => {
          const rowBatch = row.batch || row.year || row["batch year"];
          const rowDept = row.department || row.dept || row.course || row.branch;
          const students = parseInt(row.students || row.cohort || row.total || "0", 10);
          const placed = parseInt(row.placed || row.hired || row.offers || "0", 10);
          const medianStipend = parseInt(row.medianstipend || row["median stipend"] || row.stipend || row.package || "0", 10) || 0;
          const topRecruiter = row.toprecruiter || row["top recruiter"] || row.recruiter || row.company || "";

          if (!rowBatch || !rowDept) {
            skipped += 1;
            errors.push(`Row ${i + 2}: batch and department are required.`);
            return;
          }
          if (isNaN(students) || students <= 0) {
            skipped += 1;
            errors.push(`Row ${i + 2}: students must be a positive number.`);
            return;
          }
          if (isNaN(placed) || placed < 0) {
            skipped += 1;
            errors.push(`Row ${i + 2}: placed cannot be negative.`);
            return;
          }
          if (placed > students) {
            skipped += 1;
            errors.push(`Row ${i + 2}: placed (${placed}) cannot exceed students (${students}).`);
            return;
          }

          upsertPlacementHistory(instituteName, {
            batch: String(rowBatch).trim(),
            department: String(rowDept).trim(),
            students,
            placed,
            medianStipend,
            topRecruiter: String(topRecruiter).trim(),
          });
          imported += 1;
        });

        logActivity(
          instituteName,
          user?.name || "Admin",
          "Imported historic placement records from CSV",
          `${imported} imported, ${skipped} skipped`
        );
        bump(
          imported > 0
            ? `Successfully imported ${imported} historic record(s).${errors.length ? ` (${skipped} skipped)` : ""}`
            : `No valid records found in CSV. ${errors[0] || ""}`
        );
      } catch (err) {
        setFlash("Failed to read CSV file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  const deptColumns = [
    { key: "department", header: "Department", render: (r) => <span className="font-medium text-foreground">{r.department}</span> },
    { key: "students", header: "Students", align: "center", render: (r) => <span className="text-muted-foreground">{r.students}</span> },
    { key: "placed", header: "Placed", align: "center", render: (r) => <span className="font-medium text-foreground">{r.placed}</span> },
    { key: "inProcess", header: "In process", align: "center", hideBelow: "hidden sm:table-cell", render: (r) => <span className="text-muted-foreground">{r.inProcess}</span> },
    { key: "avgScore", header: "Avg. skill", align: "center", hideBelow: "hidden md:table-cell", render: (r) => <span className="text-muted-foreground">{r.avgScore ?? "—"}</span> },
    {
      key: "rate",
      header: "Rate",
      align: "center",
      render: (r) => (
        <div className="flex flex-col items-center gap-1 min-w-[70px]">
          <span className="text-primary font-semibold">{r.rate}%</span>
          <ProgressBar value={r.rate} />
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout activePage="institution-analytics" title="Placement Analytics">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Placement Analytics"
          subtitle={`Computed only from students registered under ${instituteName || "your institution"} — not platform-wide figures.`}
          actions={
            tab === "current" ? (
              <Button size="sm" variant="outline" onClick={exportReportCard}>Export report card</Button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={() => setShowAddBatch(true)}>+ Add historic batch</Button>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Import CSV</Button>
                <Button size="sm" variant="outline" onClick={exportHistoryCsv}>Export CSV</Button>
              </div>
            )
          }
        />

        <Flash message={flash} />

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Batch">
            <Select value={batch} onChange={(e) => setBatch(e.target.value)} className="w-auto">
              {batches.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </Field>
          <Tabs
            tabs={[{ key: "current", label: "Current cohort" }, { key: "history", label: "Multi-year history" }]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "current" && (
          <>
            <StatGrid
              stats={[
                { label: "Students in scope", value: String(scoped.length), icon: "🎓" },
                { label: "Placed", value: String(placed), icon: "✅", hint: `${placementRate}% placement rate` },
                { label: "Applications sent", value: String(applications.length), icon: "📤" },
                { label: "Partner companies engaged", value: String(ourRecruiters.length), icon: "🏢" },
                { label: "Avg. time to hire", value: timeToHire != null ? `${timeToHire}d` : "—", icon: "⏱" },
              ]}
              columns={5}
            />

            <div className="grid lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2">
                <Section title="Your students' hiring funnel" description="Applications from your students that reached each stage, with conversion from the stage before.">
                  {funnel[0].count === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No applications from your students yet.</p>
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
                                {f.count}
                                {conversion != null && <span className="ml-1.5">· {conversion}% from {funnel[i - 1].stage}</span>}
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
                      {rejectedCount > 0 && (
                        <p className="text-[11px] text-muted-foreground pt-1.5">
                          {rejectedCount} application{rejectedCount === 1 ? "" : "s"} rejected, not in live pipeline
                        </p>
                      )}
                    </div>
                  )}
                </Section>
              </Card>

              <Card>
                <Section title="Who hires from you" description="Recruiters ranked by hires from your students only.">
                  {ourRecruiters.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No engagement recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {ourRecruiters.slice(0, 6).map((c, i) => (
                        <div key={c.company}>
                          <div className="flex items-center justify-between text-xs mb-1 gap-2">
                            <span className="font-medium text-foreground truncate">{i + 1}. {c.company}</span>
                            <span className="text-muted-foreground flex-shrink-0">{c.hired} hired</span>
                          </div>
                          <ProgressBar value={c.hired} max={ourRecruiters[0].hired || 1} tone="bg-primary" />
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {c.applications} application{c.applications === 1 ? "" : "s"} · {c.conversion}% conversion
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </Card>
            </div>

            <Section title="Department-wise placement" description="Placement rate and average skill score for each of your departments.">
              <DataTable columns={deptColumns} rows={byDepartment} rowKey={(r) => r.department} empty="No students on the roster yet." />
            </Section>

            <Card className={atRisk.length ? "border-amber-200 bg-amber-50/40" : ""}>
              <Section
                title="Students needing intervention"
                description="Ranked by a combination of low skill score, few or no applications, and how close they are to graduating."
              >
                {atRisk.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No student in this cohort is flagged — every unplaced student has applied and is scoring above the threshold.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {atRisk.map((s) => (
                      <div key={s.id} className="bg-card border border-border rounded-xl px-3.5 py-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                          <Badge tone={s.risk >= 70 ? "red" : "amber"}>{s.risk >= 70 ? "High" : "Watch"}</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {s.department} · {s.year || s.batch}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Score {s.score ?? "not assessed"} · {s.applications} application{s.applications === 1 ? "" : "s"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </Card>
          </>
        )}

        {tab === "history" && (
          <>
            {historyByBatch.length === 0 ? (
              <EmptyState
                icon="📈"
                title="No historic batches recorded"
                action={
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Button size="sm" onClick={() => setShowAddBatch(true)}>+ Add historic batch</Button>
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Import CSV</Button>
                  </div>
                }
              >
                Multi-year placement history lets you answer the questions accreditation and ranking bodies ask about past cohorts.
              </EmptyState>
            ) : (
              <>
                <StatGrid
                  stats={[
                    { label: "Batches on record", value: String(historyByBatch.length), icon: "📚" },
                    { label: "Alumni tracked", value: String(historyByBatch.reduce((s, b) => s + b.students, 0)), icon: "🎓" },
                    { label: "Best placement year", value: `${[...historyByBatch].sort((a, b) => b.rate - a.rate)[0].rate}%`, icon: "🏅", hint: `Batch ${[...historyByBatch].sort((a, b) => b.rate - a.rate)[0].batch}` },
                    {
                      label: "Median stipend trend",
                      value: `₹${(historyByBatch[historyByBatch.length - 1].medianStipend / 1000).toFixed(1)}k`,
                      icon: "💰",
                      hint: `from ₹${(historyByBatch[0].medianStipend / 1000).toFixed(1)}k in ${historyByBatch[0].batch}`,
                    },
                  ]}
                />

                <div className="grid lg:grid-cols-2 gap-5">
                  <Card>
                    <Section title="Placement rate across batches">
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={historyByBatch} margin={{ top: 10, right: 16, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="batch" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                          <Line type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} name="Placement rate %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Section>
                  </Card>

                  <Card>
                    <Section title="Cohort size vs. placed">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={historyByBatch} margin={{ top: 10, right: 16, bottom: 0, left: -20 }} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="batch" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          <Bar dataKey="students" fill="var(--muted)" radius={4} name="Cohort" />
                          <Bar dataKey="placed" fill="var(--primary)" radius={4} name="Placed" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Section>
                  </Card>
                </div>

                <Section
                  title="Batch-and-department record"
                  description="The granularity accreditation submissions ask for."
                  actions={
                    <Button size="sm" variant="secondary" onClick={() => setShowAddBatch(true)}>
                      + Add batch record
                    </Button>
                  }
                >
                  <DataTable
                    columns={[
                      { key: "batch", header: "Batch", render: (r) => <span className="font-medium text-foreground">{r.batch}</span> },
                      { key: "department", header: "Department", render: (r) => <span className="text-muted-foreground">{r.department}</span> },
                      { key: "students", header: "Students", align: "center", render: (r) => <span className="text-muted-foreground">{r.students}</span> },
                      { key: "placed", header: "Placed", align: "center", render: (r) => <span className="font-medium text-foreground">{r.placed}</span> },
                      { key: "rate", header: "Rate", align: "center", render: (r) => <span className="text-primary font-semibold">{Math.round((r.placed / r.students) * 100)}%</span> },
                      { key: "stipend", header: "Median stipend", align: "center", hideBelow: "hidden sm:table-cell", render: (r) => <span className="text-muted-foreground">₹{(r.medianStipend || 0).toLocaleString("en-IN")}</span> },
                      { key: "top", header: "Top recruiter", hideBelow: "hidden lg:table-cell", render: (r) => <span className="text-xs text-muted-foreground">{r.topRecruiter || "—"}</span> },
                      {
                        key: "actions",
                        header: "Actions",
                        align: "right",
                        render: (r) => (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingRecord(r)}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete historic record for Batch ${r.batch} (${r.department})?`)) {
                                  removePlacementHistory(r.id);
                                  logActivity(instituteName, user?.name || "Admin", "Deleted historic placement record", `Batch ${r.batch} · ${r.department}`);
                                  bump("Historic record deleted.");
                                }
                              }}
                              className="text-xs text-muted-foreground hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        ),
                      },
                    ]}
                    rows={history}
                    rowKey={(r) => r.id}
                  />
                </Section>
              </>
            )}
          </>
        )}
      </div>

      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleCsvImport}
        className="hidden"
      />

      {showAddBatch && (
        <BatchRecordModal
          departments={departmentOptions}
          instituteName={instituteName}
          onClose={() => setShowAddBatch(false)}
          onSave={(msg) => {
            setShowAddBatch(false);
            bump(msg);
          }}
        />
      )}

      {editingRecord && (
        <BatchRecordModal
          record={editingRecord}
          departments={departmentOptions}
          instituteName={instituteName}
          onClose={() => setEditingRecord(null)}
          onSave={(msg) => {
            setEditingRecord(null);
            bump(msg);
          }}
        />
      )}
    </DashboardLayout>
  );
}

function BatchRecordModal({ record, onClose, onSave, departments, instituteName }) {
  const [batch, setBatch] = useState(record ? String(record.batch) : new Date().getFullYear().toString());
  const [department, setDepartment] = useState(record ? record.department : departments[0] || "Computer Science & Engineering");
  const [students, setStudents] = useState(record ? String(record.students) : "");
  const [placed, setPlaced] = useState(record ? String(record.placed) : "");
  const [medianStipend, setMedianStipend] = useState(record ? String(record.medianStipend || "") : "");
  const [topRecruiter, setTopRecruiter] = useState(record ? record.topRecruiter || "" : "");
  const [error, setError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const b = batch.trim();
    const d = department.trim();
    const s = parseInt(students, 10);
    const p = parseInt(placed, 10);
    const m = parseInt(medianStipend, 10) || 0;

    if (!b) {
      setError("Batch year is required (e.g. 2024).");
      return;
    }
    if (!d) {
      setError("Department is required.");
      return;
    }
    if (isNaN(s) || s <= 0) {
      setError("Total cohort students must be at least 1.");
      return;
    }
    if (isNaN(p) || p < 0) {
      setError("Placed students cannot be negative.");
      return;
    }
    if (p > s) {
      setError(`Placed students (${p}) cannot exceed total cohort size (${s}).`);
      return;
    }
    if (m < 0) {
      setError("Median stipend cannot be negative.");
      return;
    }

    const payload = {
      batch: b,
      department: d,
      students: s,
      placed: p,
      medianStipend: m,
      topRecruiter: topRecruiter.trim(),
    };

    if (record?.id) {
      updatePlacementHistory(record.id, payload);
      onSave("Historic placement record updated.");
    } else {
      upsertPlacementHistory(instituteName, payload);
      onSave("Historic placement record added.");
    }
  }

  return (
    <Modal
      title={record ? "Edit historic batch record" : "Add historic batch record"}
      description="Record multi-year placement performance for accreditation and ranking benchmarks."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Graduation Batch" hint="e.g. 2024">
            <TextInput
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="2024"
              required
            />
          </Field>
          <Field label="Department">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cohort Size (Students)" hint="Total eligible students">
            <TextInput
              type="number"
              min="1"
              value={students}
              onChange={(e) => setStudents(e.target.value)}
              placeholder="e.g. 80"
              required
            />
          </Field>
          <Field label="Students Placed" hint="Must be ≤ cohort size">
            <TextInput
              type="number"
              min="0"
              value={placed}
              onChange={(e) => setPlaced(e.target.value)}
              placeholder="e.g. 68"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Median Stipend (₹/mo)" hint="Monthly INR">
            <TextInput
              type="number"
              min="0"
              step="500"
              value={medianStipend}
              onChange={(e) => setMedianStipend(e.target.value)}
              placeholder="e.g. 25000"
            />
          </Field>
          <Field label="Top Recruiter" hint="Leading employer">
            <TextInput
              value={topRecruiter}
              onChange={(e) => setTopRecruiter(e.target.value)}
              placeholder="e.g. Meridian Software Labs"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            {record ? "Update record" : "Save record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
