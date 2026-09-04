"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, EmptyState, Field, Flash, IconTile, PageHeader, ProgressBar, Section, Select, StatGrid, Tabs, useFlash } from "../../ui/Kit";
import { SKILL_DOMAINS } from "../../../lib/questionBank";
import { cohortSkillMatrix, downloadFile, listInstitutionStudents, logActivity, skillTrendByTerm, toCsv } from "../../../lib/store";
import { subscribeToMutations } from "../../../lib/sync";
import { buildRoster, useInstitutionName } from "./useInstitution";

const READINESS_TARGET = 75;

function heatColor(value) {
  if (value == null) return { background: "var(--muted)", color: "var(--muted-foreground)" };
  // A single-hue ramp from a warning red through amber to the brand olive, so
  // the weak cells read as weak at a glance without needing the legend.
  if (value < 50) return { background: "#c2492f", color: "#fff" };
  if (value < 60) return { background: "#d9793f", color: "#fff" };
  if (value < 70) return { background: "#e0a94a", color: "#3a2f14" };
  if (value < 80) return { background: "#a8b860", color: "#26301a" };
  return { background: "#6b7c3c", color: "#fff" };
}

/**
 * Cohort skill-gap breakdown — a department × skill-domain heatmap over the
 * institution's own students. The landing page advertised this for
 * institutions but nothing behind it existed; this is that view, plus a
 * semester trend and an export shaped for accreditation reporting.
 */
export default function CohortSkillGaps() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [batch, setBatch] = useState("All");
  const [tab, setTab] = useState("heatmap");
  const [drill, setDrill] = useState(null);
  const [flash, setFlash] = useFlash();

  useEffect(() => setReady(true), []);

  useEffect(() => {
    const unsub = subscribeToMutations(["applications", "assessments", "users"], () => {
      setVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready, version]);
  const batches = useMemo(() => ["All", ...[...new Set(roster.map((r) => r.batch).filter(Boolean))].sort()], [roster]);

  const matrix = useMemo(
    () => (ready && instituteName ? cohortSkillMatrix(instituteName, { batch: batch === "All" ? undefined : batch }) : []),
    [instituteName, ready, batch]
  );

  const scopedRoster = useMemo(() => roster.filter((r) => batch === "All" || r.batch === batch), [roster, batch]);

  const trend = useMemo(
    () => (ready ? skillTrendByTerm(scopedRoster.map((r) => r.id)) : []),
    [scopedRoster, ready]
  );

  const domainAverages = useMemo(() => {
    const totals = {};
    scopedRoster.forEach((r) => {
      Object.entries(r.domainScores).forEach(([domain, score]) => {
        if (!totals[domain]) totals[domain] = { sum: 0, count: 0 };
        totals[domain].sum += score;
        totals[domain].count += 1;
      });
    });
    return SKILL_DOMAINS.map((domain) => {
      const t = totals[domain];
      return { domain, average: t ? Math.round(t.sum / t.count) : null, assessed: t?.count || 0 };
    });
  }, [scopedRoster]);

  const weakest = useMemo(
    () => domainAverages.filter((d) => d.average != null).sort((a, b) => a.average - b.average).slice(0, 3),
    [domainAverages]
  );

  const belowTarget = domainAverages.filter((d) => d.average != null && d.average < READINESS_TARGET).length;
  const assessedCount = scopedRoster.filter((r) => r.score != null).length;

  function exportMatrix() {
    const columns = [
      { label: "Department", value: (r) => r.department },
      { label: "Students", value: (r) => r.students },
      { label: "Assessed", value: (r) => r.assessed },
      ...SKILL_DOMAINS.map((d) => ({ label: d, value: (r) => r.averages[d] ?? "" })),
    ];
    downloadFile(
      `${instituteName.replace(/\W+/g, "-").toLowerCase()}-cohort-skill-gap-${batch === "All" ? "all-batches" : batch}.csv`,
      toCsv(matrix, columns)
    );
    logActivity(instituteName, user?.name || "Admin", "Exported cohort skill-gap report", batch === "All" ? "All batches" : `Batch ${batch}`);
    setFlash("Skill-gap matrix exported — ready to attach to an accreditation submission.");
  }

  const drillRow = matrix.find((m) => m.department === drill);
  const drillStudents = scopedRoster.filter((r) => r.department === drill);

  return (
    <DashboardLayout activePage="institution-skill-gaps" title="Cohort Skill Gaps">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Cohort Skill-Gap Breakdown"
          subtitle="Average skill-test performance across every department and skill domain, computed from your own students' assessments."
          actions={<Button size="sm" variant="outline" onClick={exportMatrix}>Export for accreditation</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Students in scope", value: String(scopedRoster.length), icon: "🎓", tone: "blue", hint: `${assessedCount} assessed` },
            { label: "Departments covered", value: String(matrix.length), icon: "🏛", tone: "purple" },
            { label: "Domains below target", value: `${belowTarget}/${SKILL_DOMAINS.length}`, icon: "⚠️", tone: "amber", hint: `Target ${READINESS_TARGET}%` },
            { label: "Weakest domain", value: weakest[0] ? `${weakest[0].average}%` : "—", icon: "🧭", tone: "red", hint: weakest[0]?.domain || "No assessments yet" },
          ]}
        />

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Batch">
            <Select value={batch} onChange={(e) => { setBatch(e.target.value); setDrill(null); }} className="w-auto">
              {batches.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </Field>
          <Tabs
            tabs={[{ key: "heatmap", label: "Heatmap" }, { key: "trend", label: "Semester trend" }]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "heatmap" && (
          <>
            {matrix.length === 0 ? (
              <EmptyState icon="🧭" title="No assessment data yet">
                Once your students complete skill tests, their scores roll up into this department × domain matrix.
              </EmptyState>
            ) : (
              <Card padded={false}>
                <div className="p-5 pb-3">
                  <h3 className="font-semibold text-foreground text-sm">Department × skill domain</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Average score out of 100. Select a department row to drill in.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-card text-left font-semibold text-muted-foreground px-5 py-2 min-w-[180px] z-10">Department</th>
                        {SKILL_DOMAINS.map((d) => (
                          <th key={d} className="px-1 py-2 font-semibold text-muted-foreground text-center min-w-[74px] align-bottom">
                            <span className="block leading-tight">{d}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((row) => (
                        <tr key={row.department} className={drill === row.department ? "bg-primary/5" : ""}>
                          <td className="sticky left-0 bg-card px-5 py-2 z-10">
                            <button onClick={() => setDrill(drill === row.department ? null : row.department)} className="text-left hover:text-primary transition-colors">
                              <div className="font-medium text-foreground">{row.department}</div>
                              <div className="text-[10px] text-muted-foreground">{row.assessed}/{row.students} assessed</div>
                            </button>
                          </td>
                          {SKILL_DOMAINS.map((d) => {
                            const value = row.averages[d];
                            const style = heatColor(value);
                            return (
                              <td key={d} className="px-1 py-1 text-center">
                                <div className="rounded-lg py-2 font-semibold" style={style} title={`${row.department} · ${d}: ${value ?? "no data"}`}>
                                  {value ?? "—"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-t border-border text-[10px] text-muted-foreground">
                  <span className="font-medium">Scale:</span>
                  {[["<50", 45], ["50–59", 55], ["60–69", 65], ["70–79", 75], ["80+", 85]].map(([label, v]) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className="w-4 h-3 rounded" style={{ background: heatColor(v).background }} />
                      {label}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {drillRow && (
              <Card>
                <Section
                  title={`${drillRow.department} — drill-down`}
                  description={`${drillStudents.length} student${drillStudents.length === 1 ? "" : "s"} in scope, ${drillRow.assessed} with completed assessments.`}
                  actions={<button onClick={() => setDrill(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>}
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Domain averages vs {READINESS_TARGET}% target</div>
                      {SKILL_DOMAINS.map((d) => {
                        const v = drillRow.averages[d];
                        return (
                          <div key={d}>
                            <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                              <span className="text-foreground truncate">{d}</span>
                              <span className={`flex-shrink-0 font-semibold ${v == null ? "text-muted-foreground" : v < READINESS_TARGET ? "text-red-600" : "text-primary"}`}>
                                {v == null ? "—" : `${v}%`}
                              </span>
                            </div>
                            <ProgressBar value={v || 0} />
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Students needing support (score below 60)</div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {drillStudents.filter((s) => s.score != null && s.score < 60).length === 0 ? (
                          <p className="text-xs text-muted-foreground">No student in this department is below 60 — the gap here is a ceiling problem, not a floor one.</p>
                        ) : (
                          drillStudents
                            .filter((s) => s.score != null && s.score < 60)
                            .sort((a, b) => a.score - b.score)
                            .map((s) => (
                              <div key={s.id} className="flex items-center justify-between gap-2 text-xs bg-secondary/50 rounded-lg px-3 py-2">
                                <span className="text-foreground truncate">{s.name}</span>
                                <span className="flex items-center gap-2 flex-shrink-0">
                                  <Badge tone="red">{s.score}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{s.batch}</span>
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </Section>
              </Card>
            )}
          </>
        )}

        {tab === "trend" && (
          <Card>
            <Section
              title="Semester-over-semester movement"
              description="Average assessment score across every attempt your students recorded in each half-year window. A rising line means the gap is closing."
            >
              {trend.length < 2 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Not enough assessment history yet — the trend appears once your students have attempts across at least two terms.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={trend} margin={{ top: 10, right: 16, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="term" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                      <Line type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} name="Cohort average" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    {trend.map((t) => (
                      <div key={t.term} className="bg-secondary/50 rounded-xl p-3">
                        <div className="text-xs text-muted-foreground">{t.term}</div>
                        <div className="text-lg font-bold text-foreground">{t.average}%</div>
                        <div className="text-[10px] text-muted-foreground">{t.attempts} attempts recorded</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>
          </Card>
        )}

        <Card>
          <Section title="Where to intervene first" description="The three weakest domains across the selected cohort.">
            {weakest.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessment data yet.</p>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3">
                {weakest.map((w, i) => (
                  <div key={w.domain} className="border border-border rounded-xl p-4 transition-shadow hover:shadow-[0_4px_14px_rgba(25,25,26,0.06)]">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <IconTile icon={`#${i + 1}`} tone={w.average < 60 ? "red" : "amber"} size={30} className="text-xs font-bold" />
                      <Badge tone={w.average < 60 ? "red" : "amber"}>{w.average}%</Badge>
                    </div>
                    <div className="text-sm font-semibold text-foreground">{w.domain}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {w.average < READINESS_TARGET
                        ? `${READINESS_TARGET - w.average} points below the readiness target across ${w.assessed} assessed students.`
                        : "Meeting the readiness target."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </Card>
      </div>
    </DashboardLayout>
  );
}
