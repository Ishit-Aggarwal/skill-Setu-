"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { Card, PageHeader, ProgressBar, Section, StatGrid, Tabs } from "../ui/Kit";
import { all, listApplications, listInternships, listInternshipsByOwner, listUsersByRole, PIPELINE_STAGES, TERMINAL_STAGES } from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { canonicalDomain } from "../../lib/domains";

const PIE_COLORS = ["#6B7C3C", "#8A9A4A", "#A8B860", "#3C5A8A", "#5A3C8A"];
const STATUS_COLORS = { Applied: "#8A9A4A", Shortlisted: "#3C5A8A", Interview: "#B8860B", Hired: "#6B7C3C" };
const STAGE_ORDER = PIPELINE_STAGES;

const COURSE_COLUMNS = [
  { key: "dept", label: "Course" },
  { key: "students", label: "Students" },
  { key: "placed", label: "Placed" },
  { key: "rate", label: "Rate" },
];

const DATE_RANGES = [
  { key: "all", label: "All time", days: null },
  { key: "month", label: "This month", days: 30 },
  { key: "quarter", label: "This quarter", days: 90 },
  { key: "year", label: "This year", days: 365 },
];

function daysBetween(aIso, bIso) {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 86400000;
}

/** Look up when an application's statusHistory first reached a given stage. */
function stageTimestamp(app, stage) {
  return app.statusHistory?.find((h) => h.status === stage)?.at || null;
}

function buildFunnel(applications) {
  const inPipeline = applications.filter((a) => !TERMINAL_STAGES.includes(a.status));
  return STAGE_ORDER.map((stage, i) => ({
    stage,
    count: inPipeline.filter((a) => STAGE_ORDER.indexOf(a.status) >= i).length,
  }));
}

function avgTimeToHire(applications) {
  const days = applications
    .filter((a) => a.status === "Hired")
    .map((a) => {
      const applied = stageTimestamp(a, "Applied") || a.appliedAt;
      const hired = stageTimestamp(a, "Hired");
      return applied && hired ? daysBetween(applied, hired) : null;
    })
    .filter((d) => d != null);
  return days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null;
}

/**
 * Platform-wide market analytics for students, and company-scoped hiring
 * analytics for industry accounts (with the platform figures kept alongside as
 * a benchmark). Academician and institution accounts have their own
 * role-scoped analytics pages and never land here.
 */
export default function AnalyticsDashboard({ activePage = "analytics", title = "Analytics Dashboard" }) {
  const { user } = useAuth();
  const isIndustry = user?.role === "industry";

  const [students, setStudents] = useState([]);
  const [internships, setInternships] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [myPostingIds, setMyPostingIds] = useState(new Set());
  const [scope, setScope] = useState(isIndustry ? "company" : "platform");
  const [range, setRange] = useState("all");
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [showAllInstitutions, setShowAllInstitutions] = useState(false);
  const [courseQuery, setCourseQuery] = useState("");
  const [courseSort, setCourseSort] = useState({ key: "rate", dir: "desc" });

  /* Every figure on this page used to cover all time with no way to say so or
     change it. The range narrows applications by when they were submitted;
     postings and students are stock counts, not flows, so they stay whole. */
  const applications = useMemo(() => {
    const window = DATE_RANGES.find((r) => r.key === range) || DATE_RANGES[0];
    if (!window.days) return allApplications;
    const cutoff = Date.now() - window.days * 86400000;
    return allApplications.filter((a) => (a.appliedAt ? new Date(a.appliedAt).getTime() >= cutoff : true));
  }, [allApplications, range]);

  const refresh = () => {
    setStudents(listUsersByRole("student"));
    setInternships(listInternships());
    setAllApplications(listApplications());
    setAssessments(all("assessments"));
    if (user?.role === "industry") setMyPostingIds(new Set(listInternshipsByOwner(user.id).map((i) => i.id)));
  };

  useEffect(() => {
    refresh();
  }, [user]);

  useEffect(() => {
    return subscribeToMutations(["applications", "internships", "assessments"], () => {
      refresh();
    });
  }, [user]);

  const myApplications = useMemo(
    () => applications.filter((a) => myPostingIds.has(a.internshipId)),
    [applications, myPostingIds]
  );

  const scopedApplications = scope === "company" ? myApplications : applications;
  const scopedFunnel = useMemo(() => buildFunnel(scopedApplications), [scopedApplications]);
  const platformFunnel = useMemo(() => buildFunnel(applications), [applications]);
  const scopedRejected = useMemo(
    () => scopedApplications.filter((a) => a.status === "Rejected").length,
    [scopedApplications]
  );

  const timeToHire = useMemo(() => avgTimeToHire(scopedApplications), [scopedApplications]);
  const platformTimeToHire = useMemo(() => avgTimeToHire(applications), [applications]);

  const kpis = useMemo(() => {
    const hired = scopedApplications.filter((a) => a.status === "Hired").length;
    const rate = scopedApplications.length ? Math.round((hired / scopedApplications.length) * 100) : 0;
    if (scope === "company") {
      const joined = scopedApplications.filter((a) => a.offerStage === "Joined").length;
      return [
        { label: "Your postings", value: String(myPostingIds.size), icon: "📋" },
        { label: "Applications received", value: String(scopedApplications.length), icon: "📥" },
        { label: "Hires", value: String(hired), icon: "✅", hint: `${rate}% conversion` },
        { label: "Joined", value: String(joined), icon: "🎉", hint: hired ? `${Math.round((joined / hired) * 100)}% of hires` : "—" },
        { label: "Avg. time to hire", value: timeToHire != null ? `${timeToHire}d` : "—", icon: "⏱", hint: platformTimeToHire != null ? `Platform ${platformTimeToHire}d` : "" },
      ];
    }
    return [
      { label: "Students on platform", value: String(students.length), icon: "🎓" },
      { label: "Live opportunities", value: String(internships.filter((i) => i.status !== "Closed").length), icon: "💼" },
      { label: "Total applications", value: String(applications.length), icon: "📥" },
      { label: "Placement rate", value: `${rate}%`, icon: "✅" },
      { label: "Avg. time to hire", value: timeToHire != null ? `${timeToHire}d` : "—", icon: "⏱" },
    ];
  }, [scope, scopedApplications, myPostingIds, students, internships, applications, timeToHire, platformTimeToHire]);

  const stageDurations = useMemo(() => {
    const pairs = [["Applied", "Shortlisted"], ["Shortlisted", "Interview"], ["Interview", "Hired"]];
    return pairs.map(([from, to]) => {
      const diffs = scopedApplications
        .map((a) => {
          const fromAt = from === "Applied" ? stageTimestamp(a, "Applied") || a.appliedAt : stageTimestamp(a, from);
          const toAt = stageTimestamp(a, to);
          return fromAt && toAt ? daysBetween(fromAt, toAt) : null;
        })
        .filter((d) => d != null);
      const avg = diffs.length ? Math.round((diffs.reduce((s, d) => s + d, 0) / diffs.length) * 10) / 10 : null;
      return { label: `${from} → ${to}`, avgDays: avg };
    });
  }, [scopedApplications]);

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
      .slice(0, 7);
  }, [assessments]);

  // Demand (applications) vs. supply (postings) per sector — surfaces
  // where competition is fiercest rather than just how postings are spread.
  const domainComparison = useMemo(() => {
    const postingCounts = {};
    internships.forEach((i) => {
      const d = canonicalDomain(i.domain);
      postingCounts[d] = (postingCounts[d] || 0) + 1;
    });
    const appCounts = {};
    applications.forEach((a) => {
      const posting = internships.find((i) => i.id === a.internshipId);
      const domain = canonicalDomain(posting?.domain) || "Unattributed";
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
      .sort((a, b) => b.demand - a.demand || b.supply - a.supply);
  }, [internships, applications]);

  /* Only the sectors with enough share to draw a readable bar are charted.
     Rendering fifteen categories in this space produced a stack of 4px slivers
     that could not be read or compared; the rest roll into one expandable
     "Other" row so nothing is hidden, just not shouted. */
  const TOP_SECTORS = 7;
  const visibleDomains = showAllSectors ? domainComparison : domainComparison.slice(0, TOP_SECTORS);
  const hiddenDomains = showAllSectors ? [] : domainComparison.slice(TOP_SECTORS);
  const hiddenDomainTotals = hiddenDomains.reduce(
    (acc, d) => ({ demand: acc.demand + d.demand, supply: acc.supply + d.supply }),
    { demand: 0, supply: 0 }
  );

  const topCompanies = useMemo(() => {
    const counts = {};
    applications.filter((a) => a.status === "Hired").forEach((a) => { counts[a.company] = (counts[a.company] || 0) + 1; });
    return Object.entries(counts).map(([name, hired]) => ({ name, hired })).sort((a, b) => b.hired - a.hired).slice(0, 6);
  }, [applications]);

  // Where a company's own applicants come from — far more useful to a
  // recruiter than a platform-wide leaderboard.
  const sourceInstitutions = useMemo(() => {
    const counts = {};
    myApplications.forEach((a) => {
      const key = a.studentInstitution || "Unknown";
      if (!counts[key]) counts[key] = { name: key, applications: 0, hired: 0 };
      counts[key].applications += 1;
      if (a.status === "Hired") counts[key].hired += 1;
    });
    return Object.values(counts).sort((a, b) => b.applications - a.applications);
  }, [myApplications]);

  const TOP_INSTITUTIONS = 5;
  const visibleInstitutions = showAllInstitutions ? sourceInstitutions : sourceInstitutions.slice(0, TOP_INSTITUTIONS);
  const hiddenInstitutionCount = Math.max(0, sourceInstitutions.length - TOP_INSTITUTIONS);

  const postingPerformance = useMemo(() => {
    if (!isIndustry) return [];
    return listInternshipsByOwner(user.id)
      .map((p) => {
        const apps = applications.filter((a) => a.internshipId === p.id);
        return {
          title: p.title,
          views: p.views || 0,
          unique: p.uniqueViews || 0,
          applications: apps.length,
          hired: apps.filter((a) => a.status === "Hired").length,
          rate: p.uniqueViews ? Math.round((apps.length / p.uniqueViews) * 100) : 0,
        };
      })
      .sort((a, b) => b.applications - a.applications);
  }, [isIndustry, user, applications]);

  const courseBreakdown = useMemo(() => {
    const groups = {};
    students.forEach((s) => {
      const key = s.course || "Unspecified";
      if (!groups[key]) groups[key] = { students: 0, placedIds: new Set() };
      groups[key].students++;
    });
    // Count distinct placed STUDENTS, not hired APPLICATIONS — one student can be
    // hired for more than one posting, which must not inflate the rate.
    applications.filter((a) => a.status === "Hired").forEach((a) => {
      const student = students.find((s) => s.id === a.studentId);
      if (!student) return;
      const key = student.course || "Unspecified";
      groups[key].placedIds.add(a.studentId);
    });
    return Object.entries(groups)
      .map(([dept, v]) => ({ dept, students: v.students, placed: v.placedIds.size, rate: v.students ? Math.round((v.placedIds.size / v.students) * 100) : 0 }))
      .sort((a, b) => b.students - a.students);
  }, [students, applications]);

  /* Searchable and sortable rather than a fixed top-10 slice: this table grows
     with every course on the platform, and a hard slice hid the rest with no
     way to reach them. */
  const visibleCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    const rows = q ? courseBreakdown.filter((r) => r.dept.toLowerCase().includes(q)) : [...courseBreakdown];
    const { key, dir } = courseSort;
    return rows.sort((a, b) => {
      const cmp = key === "dept" ? String(a.dept).localeCompare(String(b.dept)) : (a[key] || 0) - (b[key] || 0);
      return dir === "asc" ? cmp : -cmp;
    });
  }, [courseBreakdown, courseQuery, courseSort]);

  function toggleCourseSort(key) {
    setCourseSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "dept" ? "asc" : "desc" }));
  }

  const maxHired = topCompanies[0]?.hired || 1;

  return (
    <DashboardLayout activePage={activePage} title={title}>
      <div className="animate-fade-slide space-y-6">
        <PageHeader
          title={scope === "company" ? "Your Hiring Analytics" : "Placement & Skill Analytics"}
          subtitle={
            scope === "company"
              ? `Computed from ${user?.companyName || "your"} postings only, with platform figures shown as a benchmark.`
              : "Live market insight across every sector on this platform."
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                aria-label="Date range for application figures"
                className="text-xs bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {DATE_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
              {isIndustry && (
                <Tabs
                  tabs={[{ key: "company", label: "My company" }, { key: "platform", label: "Platform benchmark" }]}
                  value={scope}
                  onChange={setScope}
                />
              )}
            </div>
          }
        />

        {range !== "all" && (
          <p className="text-xs text-muted-foreground -mt-2">
            Application figures cover {DATE_RANGES.find((r) => r.key === range).label.toLowerCase()}. Posting and student
            counts are totals, not filtered by date.
          </p>
        )}

        <StatGrid stats={kpis} columns={5} />

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <Section
              title={scope === "company" ? "Your hiring funnel" : "Platform hiring funnel"}
              description="Applications that reached each stage, with conversion from the one before."
            >
              {scopedFunnel[0].count === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {scope === "company" ? "No applications to your postings yet." : "No applications yet."}
                </p>
              ) : (
                <div className="space-y-3">
                  {scopedFunnel.map((f, i) => {
                    const widthPct = Math.max((f.count / scopedFunnel[0].count) * 100, f.count > 0 ? 6 : 0);
                    const conversion = i > 0 && scopedFunnel[i - 1].count ? Math.round((f.count / scopedFunnel[i - 1].count) * 100) : null;
                    const benchmark =
                      scope === "company" && i > 0 && platformFunnel[i - 1].count
                        ? Math.round((platformFunnel[i].count / platformFunnel[i - 1].count) * 100)
                        : null;
                    return (
                      <div key={f.stage}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{f.stage}</span>
                          <span className="text-muted-foreground">
                            {f.count}
                            {conversion != null && <span className="ml-1.5">· {conversion}% from {scopedFunnel[i - 1].stage}</span>}
                            {benchmark != null && <span className="ml-1.5 text-[10px]">(platform {benchmark}%)</span>}
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
                  {scopedRejected > 0 && (
                    <p className="text-[11px] text-muted-foreground pt-1">
                      {scopedRejected} terminal/rejected application{scopedRejected === 1 ? "" : "s"} accounted for
                    </p>
                  )}
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
            </Section>
          </Card>

          <Card>
            <Section title="Demand vs. supply by sector" description="Share of applications vs. share of postings across every sector on the platform.">
              {domainComparison.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {visibleDomains.map((d) => (
                    <div key={d.domain}>
                      <div className="flex items-center justify-between text-xs mb-1 gap-2">
                        <span className="font-medium text-foreground truncate" title={d.domain}>{d.domain}</span>
                        <span className="text-muted-foreground flex-shrink-0 text-[10px]">{d.demand}% / {d.supply}%</span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-primary/70 rounded-full transition-all duration-700" style={{ width: `${d.demand}%` }} />
                        <div className="absolute left-0 h-1 top-1/2 -translate-y-1/2 bg-foreground/50 rounded-full transition-all duration-700" style={{ width: `${d.supply}%` }} />
                      </div>
                    </div>
                  ))}

                  {hiddenDomains.length > 0 && (
                    <button
                      onClick={() => setShowAllSectors(true)}
                      className="w-full text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
                    >
                      <div className="flex items-center justify-between text-xs mb-1 gap-2">
                        <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          Other ({hiddenDomains.length} sector{hiddenDomains.length === 1 ? "" : "s"}) — show all
                        </span>
                        <span className="text-muted-foreground flex-shrink-0 text-[10px]">
                          {hiddenDomainTotals.demand}% / {hiddenDomainTotals.supply}%
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-primary/30 rounded-full" style={{ width: `${hiddenDomainTotals.demand}%` }} />
                        <div className="absolute left-0 h-1 top-1/2 -translate-y-1/2 bg-foreground/25 rounded-full" style={{ width: `${hiddenDomainTotals.supply}%` }} />
                      </div>
                    </button>
                  )}

                  {showAllSectors && domainComparison.length > TOP_SECTORS && (
                    <button
                      onClick={() => setShowAllSectors(false)}
                      className="text-[11px] text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
                    >
                      Show top {TOP_SECTORS} only
                    </button>
                  )}

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/70 inline-block" /> Demand (applications)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-full bg-foreground/50 inline-block" /> Supply (postings)</span>
                  </div>
                </div>
              )}
            </Section>
          </Card>
        </div>

        {scope === "company" && postingPerformance.length > 0 && (
          <Card>
            <Section title="Posting performance" description="Reach and conversion for each of your openings.">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Posting</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Views</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Unique</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Applications</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground pb-3">Hired</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground pb-3">View → apply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postingPerformance.map((p) => (
                      <tr key={p.title} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 font-medium text-foreground">{p.title}</td>
                        <td className="py-3 text-center text-muted-foreground">{p.views}</td>
                        <td className="py-3 text-center text-muted-foreground">{p.unique}</td>
                        <td className="py-3 text-center text-foreground font-medium">{p.applications}</td>
                        <td className="py-3 text-center text-foreground font-medium">{p.hired}</td>
                        <td className="py-3 text-center"><span className="text-primary font-semibold">{p.rate}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </Card>
        )}

        <div className="grid lg:grid-cols-5 gap-5">
          <Card className="lg:col-span-3">
            <Section title="Skill readiness across the platform" description="Average scores by skill domain against an 80% readiness target.">
              {domainAverages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No skill assessments completed yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={domainAverages} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 70 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <YAxis dataKey="skill" type="category" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={68} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }} />
                    <Bar dataKey="current" fill="var(--primary)" radius={4} name="Current avg" barSize={7} />
                    <Bar dataKey="target" fill="var(--muted)" radius={4} name="Target" barSize={7} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 8 }} formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>
          </Card>

          <Card className="lg:col-span-2">
            {scope === "company" ? (
              <Section title="Where your applicants come from" description="Your own source institutions, ranked.">
                {sourceInstitutions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No applications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {visibleInstitutions.map((c, i) => (
                      <div key={c.name}>
                        <div className="flex items-start justify-between text-xs mb-1 gap-2">
                          {/* Institution names run long ("Deccan College of Architecture
                              & Planning, Hyderabad"), so they wrap rather than
                              being cut mid-word. */}
                          <span className="font-medium text-foreground break-words leading-snug min-w-0">{i + 1}. {c.name}</span>
                          <span className="text-muted-foreground flex-shrink-0">{c.applications}</span>
                        </div>
                        <ProgressBar value={c.applications} max={sourceInstitutions[0].applications || 1} tone="bg-primary" />
                        <div className="text-[10px] text-muted-foreground mt-1">{c.hired} hired from here</div>
                      </div>
                    ))}
                    {hiddenInstitutionCount > 0 && !showAllInstitutions && (
                      <button
                        onClick={() => setShowAllInstitutions(true)}
                        className="text-[11px] text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
                      >
                        +{hiddenInstitutionCount} more institution{hiddenInstitutionCount === 1 ? "" : "s"}
                      </button>
                    )}
                    {showAllInstitutions && sourceInstitutions.length > TOP_INSTITUTIONS && (
                      <button
                        onClick={() => setShowAllInstitutions(false)}
                        className="text-[11px] text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
                      >
                        Show top {TOP_INSTITUTIONS} only
                      </button>
                    )}
                  </div>
                )}
              </Section>
            ) : (
              <Section title="Most active recruiters" description="Organisations with the most hires on the platform.">
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
              </Section>
            )}
          </Card>
        </div>

        <Card>
          <Section
            title="Course-wise placement summary"
            description="Across every institution on the platform."
            actions={
              <input
                type="search"
                value={courseQuery}
                onChange={(e) => setCourseQuery(e.target.value)}
                placeholder="Find a course…"
                aria-label="Search courses"
                className="text-xs bg-card border border-border rounded-xl px-3 py-1.5 text-foreground placeholder:text-muted-foreground w-40 focus:outline-none focus:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            }
          >
            {courseBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No students registered yet.</p>
            ) : visibleCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No course matches “{courseQuery}”.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {/* The table grows with every course on the platform, so
                          it is sortable rather than fixed to one order. */}
                      {COURSE_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`text-xs font-semibold text-muted-foreground pb-3 ${col.key === "dept" ? "text-left" : "text-center"}`}
                        >
                          <button
                            onClick={() => toggleCourseSort(col.key)}
                            aria-label={`Sort by ${col.label}`}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
                          >
                            {col.label}
                            <span aria-hidden="true" className={courseSort.key === col.key ? "opacity-100" : "opacity-25"}>
                              {courseSort.key === col.key && courseSort.dir === "asc" ? "▲" : "▼"}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCourses.map((row) => (
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
          </Section>
        </Card>
      </div>
    </DashboardLayout>
  );
}
