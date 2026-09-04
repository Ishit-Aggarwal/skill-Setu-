"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { useNav } from "../../../lib/nav";
import { Badge, Button, Card, EmptyState, Field, IconTile, Modal, PageHeader, ProgressBar, Section, Select, StatGrid, Tabs } from "../../ui/Kit";
import { suggestIntervention } from "../../../lib/domains";
import { skillDomainForTag } from "../../../lib/match";
import { industrySkillDemand, listInternships, listPrograms, skillTrendByTerm } from "../../../lib/store";
import { averageDomainScores, buildFacultyStudents } from "./useFaculty";

const TARGET = 75;

/**
 * Industry alignment for a faculty member.
 *
 * The "Your Students' Weakest Areas" panel used to render empty even though
 * skill scores existed: it scoped to students whose `institution` string
 * matched the academician's, and the demo personas sat at different
 * institutions so the intersection was always zero. It now falls back through
 * advisees → department → institution and says which scope it is showing.
 */
export default function IndustryAlignment() {
  const { user } = useAuth();
  const navigate = useNav();
  const [ready, setReady] = useState(false);
  const [scope, setScope] = useState("advisees");
  const [tab, setTab] = useState("gap");
  const [drill, setDrill] = useState(null);

  useEffect(() => setReady(true), []);

  const students = useMemo(() => (ready && user ? buildFacultyStudents(user) : []), [user, ready]);
  const programs = useMemo(() => (ready ? listPrograms() : []), [ready]);
  const postings = useMemo(() => (ready ? listInternships().filter((i) => i.status !== "Closed") : []), [ready]);
  const demand = useMemo(() => (ready ? industrySkillDemand(10) : []), [ready]);

  const advisees = useMemo(() => students.filter((s) => s.isAdvisee), [students]);
  const department = useMemo(() => students.filter((s) => s.department === user?.department), [students, user]);

  // Fall back to a wider ring rather than showing an empty panel.
  const { cohort, scopeLabel } = useMemo(() => {
    const options = {
      advisees: { list: advisees, label: "your advisees" },
      department: { list: department, label: `the ${user?.department || "department"} cohort` },
      institution: { list: students, label: user?.institution || "your institution" },
    };
    const chosen = options[scope];
    if (chosen.list.some((s) => s.score != null)) return { cohort: chosen.list, scopeLabel: chosen.label };
    const fallback = [options.advisees, options.department, options.institution].find((o) => o.list.some((s) => s.score != null));
    return fallback ? { cohort: fallback.list, scopeLabel: fallback.label } : { cohort: chosen.list, scopeLabel: chosen.label };
  }, [scope, advisees, department, students, user]);

  const domainAverages = useMemo(() => averageDomainScores(cohort), [cohort]);
  const weakDomains = useMemo(() => domainAverages.slice(0, 5), [domainAverages]);
  const trend = useMemo(() => (ready ? skillTrendByTerm(cohort.map((s) => s.id)) : []), [cohort, ready]);

  const trendDelta = trend.length >= 2 ? trend[trend.length - 1].average - trend[0].average : null;

  // Which requested skills map onto a domain this cohort is weak in.
  const demandAgainstCohort = useMemo(() => {
    const byDomain = Object.fromEntries(domainAverages.map((d) => [d.domain, d.avg]));
    return demand.map((d) => {
      const domain = skillDomainForTag(d.skill);
      return {
        ...d,
        domain,
        cohortAvg: domain ? byDomain[domain] ?? null : null,
        employers: [...new Set(postings.filter((p) => (p.tags || []).includes(d.skill)).map((p) => p.company))],
      };
    });
  }, [demand, domainAverages, postings]);

  function programsFor(domain) {
    const key = String(domain || "").toLowerCase().split(/[&(]/)[0].trim();
    return programs.filter(
      (p) =>
        p.status !== "Cancelled" &&
        (p.title.toLowerCase().includes(key) || (p.description || "").toLowerCase().includes(key))
    );
  }

  return (
    <DashboardLayout activePage="academician-alignment" title="Industry Alignment">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Industry Alignment"
          subtitle="What employers are hiring for, against where your own students are weakest — and what to do about each gap."
        />

        <StatGrid
          stats={[
            { label: "Students in scope", value: String(cohort.length), icon: "🎓", hint: `Showing ${scopeLabel}` },
            { label: "Assessed", value: String(cohort.filter((s) => s.score != null).length), icon: "📝" },
            { label: "Weakest domain", value: weakDomains[0] ? `${weakDomains[0].avg}%` : "—", icon: "⚠️", hint: weakDomains[0]?.domain || "No data" },
            {
              label: "Semester movement",
              value: trendDelta == null ? "—" : `${trendDelta > 0 ? "+" : ""}${trendDelta}`,
              icon: trendDelta != null && trendDelta > 0 ? "📈" : "📉",
              hint: trendDelta == null ? "Needs two terms of data" : trendDelta > 0 ? "Gap is closing" : "Gap is widening",
            },
          ]}
        />

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Cohort">
            <Select value={scope} onChange={(e) => setScope(e.target.value)} className="w-auto">
              <option value="advisees">My advisees ({advisees.length})</option>
              <option value="department">My department ({department.length})</option>
              <option value="institution">Whole institution ({students.length})</option>
            </Select>
          </Field>
          <Tabs
            tabs={[{ key: "gap", label: "Demand vs. readiness" }, { key: "trend", label: "Trend over time" }]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "gap" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <Section
                title="In-demand skills"
                description="Most requested across live postings, with how your cohort scores on the matching assessment domain."
              >
                {demandAgainstCohort.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No live postings yet.</p>
                ) : (
                  <div className="space-y-4">
                    {demandAgainstCohort.map((d) => (
                      <div key={d.skill} className="flex items-start gap-3">
                        <IconTile icon="🎯" tone={d.cohortAvg != null && d.cohortAvg < TARGET ? "red" : "primary"} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-xs mb-1 gap-2">
                            <span className="text-foreground truncate">{d.skill}</span>
                            <span className="text-muted-foreground flex-shrink-0">
                              {d.count} posting{d.count === 1 ? "" : "s"}
                              {d.cohortAvg != null && <span className={d.cohortAvg < TARGET ? " text-red-600" : " text-primary"}> · cohort {d.cohortAvg}%</span>}
                            </span>
                          </div>
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-primary/30 rounded-full" style={{ width: `${(d.count / demand[0].count) * 100}%` }} />
                            {d.cohortAvg != null && <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${d.cohortAvg}%` }} />}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 truncate">
                            {d.employers.slice(0, 2).join(", ")}{d.employers.length > 2 ? ` +${d.employers.length - 2}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border">
                      <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-full bg-primary/30 inline-block" /> Employer demand</span>
                      <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-full bg-primary inline-block" /> Cohort readiness</span>
                    </div>
                  </div>
                )}
              </Section>
            </Card>

            <Card>
              <Section
                title="Your students' weakest areas"
                description={`Lowest average skill-test scores across ${scopeLabel}. Select a domain to see what would address it.`}
              >
                {weakDomains.length === 0 ? (
                  <EmptyState icon="📝" title="No completed assessments yet">
                    Once your students take skill tests, their weakest domains surface here.
                  </EmptyState>
                ) : (
                  <div className="space-y-2">
                    {weakDomains.map((d) => (
                      <button
                        key={d.domain}
                        onClick={() => setDrill(d)}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-transparent hover:border-border hover:bg-secondary/60 transition-all"
                      >
                        <div className="flex items-center justify-between text-xs mb-1 gap-2">
                          <span className="text-foreground truncate">{d.domain}</span>
                          <span className={`font-semibold flex-shrink-0 ${d.avg < 60 ? "text-red-600" : d.avg < TARGET ? "text-amber-600" : "text-primary"}`}>
                            {d.avg}%
                          </span>
                        </div>
                        <ProgressBar value={d.avg} />
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {d.assessed} student{d.assessed === 1 ? "" : "s"} assessed · tap for interventions
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Section>
            </Card>
          </div>
        )}

        {tab === "trend" && (
          <Card>
            <Section
              title="Is the gap closing?"
              description={`Average assessment score across ${scopeLabel}, by half-year term.`}
            >
              {trend.length < 2 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  Not enough history yet — the trend appears once this cohort has attempts across at least two terms.
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trend} margin={{ top: 10, right: 16, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="term" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                      <Line type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} name="Cohort average" />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-muted-foreground mt-3">
                    {trendDelta > 0
                      ? `Up ${trendDelta} points since ${trend[0].term} — the interventions are working.`
                      : trendDelta < 0
                      ? `Down ${Math.abs(trendDelta)} points since ${trend[0].term} — worth reviewing what changed.`
                      : "Flat across the period."}
                  </p>
                </>
              )}
            </Section>
          </Card>
        )}
      </div>

      {drill && (
        <Modal
          title={drill.domain}
          description={`Cohort average ${drill.avg}% across ${drill.assessed} assessed student${drill.assessed === 1 ? "" : "s"}.`}
          onClose={() => setDrill(null)}
        >
          <div className="space-y-5">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested intervention</div>
              {(() => {
                const suggestion = suggestIntervention(drill.domain);
                return (
                  <div className="flex items-start gap-3 bg-primary/5 rounded-xl px-3.5 py-3">
                    <IconTile icon="💡" tone="amber" size={32} />
                    <div>
                      <div className="text-sm font-medium text-foreground">{suggestion.elective}</div>
                      <div className="text-[11px] text-muted-foreground">Add as a {suggestion.type.toLowerCase()} for this cohort.</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Relevant programmes on the platform</div>
              {programsFor(drill.domain).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No FDP currently covers this. Hosting one is a direct way to close the gap.
                  <button onClick={() => { setDrill(null); navigate("academician-programs"); }} className="text-primary hover:underline ml-1">Host a programme →</button>
                </p>
              ) : (
                <div className="space-y-2">
                  {programsFor(drill.domain).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 border border-border rounded-xl px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.organiser} · {p.dates}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setDrill(null); navigate("academician-programs"); }}>Open</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Students below 60 in this domain</div>
              {cohort.filter((s) => (s.domainScores?.[drill.domain] ?? 100) < 60).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody in scope is below 60 here.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {cohort
                    .filter((s) => (s.domainScores?.[drill.domain] ?? 100) < 60)
                    .map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 bg-secondary/70 rounded-full px-2.5 py-1 text-[11px]">
                        <span className="text-foreground">{s.name}</span>
                        <Badge tone="red">{s.domainScores[drill.domain]}</Badge>
                      </span>
                    ))}
                </div>
              )}
            </div>

            <Button className="w-full" variant="outline" onClick={() => { setDrill(null); navigate("academician-students"); }}>
              Open My Students to act on this
            </Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
