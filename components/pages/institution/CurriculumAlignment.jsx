"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, EmptyState, Flash, IconTile, PageHeader, ProgressBar, Section, StatGrid, useFlash } from "../../ui/Kit";
import { suggestIntervention } from "../../../lib/domains";
import { skillDomainForTag } from "../../../lib/match";
import { downloadFile, getPortfolio, industrySkillDemand, listInternships, logActivity, toCsv } from "../../../lib/store";
import { buildRoster, useInstitutionName } from "./useInstitution";

const READY_AT = 65;

/**
 * Curriculum alignment for the whole institution: what live Ayush postings are
 * asking for, versus what the institution's own students can currently
 * evidence — either through an assessed skill domain or a portfolio skill.
 * Anything with high demand and low coverage is a curriculum gap.
 */
export default function CurriculumAlignment() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useFlash();

  useEffect(() => setReady(true), []);

  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready]);
  const demand = useMemo(() => (ready ? industrySkillDemand(14) : []), [ready]);
  const postings = useMemo(() => (ready ? listInternships().filter((i) => i.status !== "Closed") : []), [ready]);

  const portfolioSkills = useMemo(() => {
    const map = new Map();
    roster.forEach((r) => {
      const portfolio = getPortfolio(r.id);
      const names = Object.values(portfolio?.skillBadges || {})
        .flat()
        .map((s) => String(s.name).toLowerCase());
      map.set(r.id, new Set(names));
    });
    return map;
  }, [roster]);

  const rows = useMemo(() => {
    const maxDemand = demand[0]?.count || 1;
    return demand.map((d) => {
      const domain = skillDomainForTag(d.skill);
      const assessedReady = domain
        ? roster.filter((r) => (r.domainScores?.[domain] ?? 0) >= READY_AT).length
        : 0;
      const portfolioReady = roster.filter((r) => portfolioSkills.get(r.id)?.has(d.skill.toLowerCase())).length;
      const covered = new Set();
      roster.forEach((r) => {
        const byScore = domain && (r.domainScores?.[domain] ?? 0) >= READY_AT;
        const byPortfolio = portfolioSkills.get(r.id)?.has(d.skill.toLowerCase());
        if (byScore || byPortfolio) covered.add(r.id);
      });
      const coverage = roster.length ? Math.round((covered.size / roster.length) * 100) : 0;
      const demandShare = Math.round((d.count / maxDemand) * 100);
      return {
        skill: d.skill,
        postings: d.count,
        domain,
        demandShare,
        coverage,
        assessedReady,
        portfolioReady,
        gap: Math.max(0, demandShare - coverage),
        employers: [...new Set(postings.filter((p) => (p.tags || []).includes(d.skill)).map((p) => p.company))],
      };
    });
  }, [demand, roster, portfolioSkills, postings]);

  const gaps = useMemo(() => [...rows].sort((a, b) => b.gap - a.gap).filter((r) => r.gap > 0), [rows]);
  const strengths = useMemo(() => [...rows].sort((a, b) => b.coverage - a.coverage).slice(0, 3), [rows]);

  function exportReport() {
    const columns = [
      { label: "Skill requested by industry", value: (r) => r.skill },
      { label: "Live postings requesting it", value: (r) => r.postings },
      { label: "Mapped skill domain", value: (r) => r.domain || "Unmapped" },
      { label: "Demand index (%)", value: (r) => r.demandShare },
      { label: "Student coverage (%)", value: (r) => r.coverage },
      { label: "Curriculum gap", value: (r) => r.gap },
      { label: "Suggested intervention", value: (r) => suggestIntervention(r.skill).elective },
    ];
    downloadFile(
      `${instituteName.replace(/\W+/g, "-").toLowerCase()}-curriculum-alignment.csv`,
      toCsv([...rows].sort((a, b) => b.gap - a.gap), columns)
    );
    logActivity(instituteName, user?.name || "Admin", "Exported curriculum alignment report");
    setFlash("Curriculum alignment report exported.");
  }

  const avgCoverage = rows.length ? Math.round(rows.reduce((s, r) => s + r.coverage, 0) / rows.length) : 0;

  return (
    <DashboardLayout activePage="institution-curriculum" title="Curriculum Alignment">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Curriculum Alignment Insights"
          subtitle="What employers are hiring for right now, against what your programmes currently produce — and the concrete electives that would close the difference."
          actions={<Button size="sm" variant="outline" onClick={exportReport}>Export report</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Live postings analysed", value: String(postings.length), icon: "📋", tone: "blue" },
            { label: "Distinct skills requested", value: String(rows.length), icon: "🎯", tone: "purple" },
            { label: "Average student coverage", value: `${avgCoverage}%`, icon: "🎓", tone: "green", hint: `Ready = ${READY_AT}+ in the mapped domain` },
            { label: "Skills with a gap", value: String(gaps.length), icon: "⚠️", tone: "amber", hint: gaps[0] ? `Widest: ${gaps[0].skill}` : "None" },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState icon="📚" title="No live postings to analyse">
            Once industry partners publish openings, this page compares their required skills against your cohort.
          </EmptyState>
        ) : (
          <>
            <Card>
              <Section
                title="Industry demand vs. institutional supply"
                description="Demand index is relative to the most-requested skill on the platform. Coverage is the share of your registered students who can evidence that skill today."
              >
                <div className="space-y-4">
                  {rows.map((r) => (
                    <div key={r.skill}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{r.skill}</span>
                          {r.gap >= 40 && <Badge tone="red">Critical gap</Badge>}
                          {r.gap > 0 && r.gap < 40 && <Badge tone="amber">Gap {r.gap}</Badge>}
                          {r.gap === 0 && <Badge tone="green">Covered</Badge>}
                        </div>
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">
                          {r.postings} posting{r.postings === 1 ? "" : "s"} · {r.coverage}% of students ready
                        </span>
                      </div>
                      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-primary/25 rounded-full transition-all duration-700" style={{ width: `${r.demandShare}%` }} />
                        <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700" style={{ width: `${r.coverage}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Sought by {r.employers.slice(0, 2).join(", ")}
                        {r.employers.length > 2 && ` +${r.employers.length - 2} more`}
                        {r.domain ? ` · assessed via "${r.domain}"` : " · no matching skill test yet"}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border">
                    <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-full bg-primary/25 inline-block" /> Industry demand index</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 h-2 rounded-full bg-primary inline-block" /> Your students ready</span>
                  </div>
                </div>
              </Section>
            </Card>

            <div className="grid lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2 border-amber-200 bg-amber-50/40">
                <Section
                  title="Curriculum gap — recommended additions"
                  description="Each row pairs an unmet employer requirement with a specific elective or certification the institution could introduce."
                >
                  {gaps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No gaps: every requested skill is covered by at least as many students as the demand index implies.</p>
                  ) : (
                    <div className="space-y-3">
                      {gaps.slice(0, 6).map((g) => {
                        const suggestion = suggestIntervention(g.skill);
                        return (
                          <div key={g.skill} className="bg-card border border-border rounded-xl p-4 transition-shadow hover:shadow-[0_4px_14px_rgba(25,25,26,0.06)]">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">{g.skill}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {g.postings} live posting{g.postings === 1 ? "" : "s"} · only {g.coverage}% of your students can evidence it
                                </div>
                              </div>
                              <Badge tone={g.gap >= 40 ? "red" : "amber"}>Gap {g.gap}</Badge>
                            </div>
                            <div className="flex items-start gap-2.5 bg-primary/5 rounded-lg px-3 py-2.5">
                              <IconTile icon="💡" tone="primary" size={26} />
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-foreground">{suggestion.elective}</div>
                                <div className="text-[10px] text-muted-foreground">Introduce as a {suggestion.type.toLowerCase()} — closes the gap for {g.domain || "this requirement"}.</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Section>
              </Card>

              <Card>
                <Section title="Where you're already strong" description="Highest-coverage requested skills — worth naming in your placement brochure.">
                  <div className="space-y-3">
                    {strengths.map((s) => (
                      <div key={s.skill}>
                        <div className="flex items-center justify-between text-xs mb-1 gap-2">
                          <span className="font-medium text-foreground truncate">{s.skill}</span>
                          <span className="text-primary font-semibold flex-shrink-0">{s.coverage}%</span>
                        </div>
                        <ProgressBar value={s.coverage} />
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {s.assessedReady} via assessments · {s.portfolioReady} via portfolios
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
