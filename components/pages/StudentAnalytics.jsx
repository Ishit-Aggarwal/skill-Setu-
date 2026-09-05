"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  all,
  getAssessment,
  getAttemptsForStudent,
  listApplicationsForStudent,
  listCredentialsForStudent,
  listSkillTests,
  listUsersByRole,
  PIPELINE_STAGES,
  TERMINAL_STAGES,
} from "../../lib/store";
import { scoresFor, taxonomyIdFor } from "../../lib/taxonomy";
import { formatDate } from "../../lib/match";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Section, StatGrid, Tabs } from "../ui/Kit";

/**
 * Analytics for a student, about that student.
 *
 * The previous page showed platform-wide market figures — how many students
 * were registered, how postings were spread across sectors — which is
 * interesting to an administrator and useless to the person looking at it. It
 * also duplicated tiles the dashboard already had.
 *
 * Everything here answers a question the student actually has: how am I doing,
 * where am I weak, am I improving, and how do I compare to people on the same
 * course? All of it is computed from recorded attempts and real applications —
 * there are no illustrative numbers on this page, and where there is not enough
 * data yet it says so instead of drawing an empty chart.
 */

const STAGE_COLORS = { Applied: "#8A9A4A", Shortlisted: "#3C5A8A", Interview: "#B8860B", Hired: "#6B7C3C" };

function monthKey(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export default function StudentAnalytics() {
  const { user } = useAuth();
  const navigate = useNav();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("skills");

  useEffect(() => setReady(true), []);

  const assessment = useMemo(() => (ready && user ? getAssessment(user.id) : null), [ready, user]);
  const attempts = useMemo(() => (ready && user ? getAttemptsForStudent(user.id) : []), [ready, user]);
  const applications = useMemo(() => (ready && user ? listApplicationsForStudent(user.id) : []), [ready, user]);
  const credentials = useMemo(() => (ready && user ? listCredentialsForStudent(user.id) : []), [ready, user]);
  const tests = useMemo(() => (ready ? listSkillTests() : []), [ready]);

  const competency = useMemo(() => scoresFor(user, assessment), [user, assessment]);

  /**
   * The benchmark cohort: other students on the same rubric — same taxonomy,
   * and where possible the same department. Comparing a CSE student's score
   * against a platform-wide average that includes clinical streams assessed on
   * entirely different domains would not mean anything.
   */
  const peers = useMemo(() => {
    if (!ready || !user) return { rows: [], scope: "" };
    const myTaxonomy = taxonomyIdFor(user);
    const everyone = listUsersByRole("student").filter((s) => s.id !== user.id);
    const assessments = all("assessments");
    const byStudent = new Map(assessments.map((a) => [a.studentId, a]));

    const sameDepartment = everyone.filter((s) => s.department && s.department === user.department);
    const sameTaxonomy = everyone.filter((s) => taxonomyIdFor(s) === myTaxonomy);
    const pool = sameDepartment.length >= 5 ? sameDepartment : sameTaxonomy;
    const scope =
      sameDepartment.length >= 5
        ? `${user.department} students`
        : `students on the ${competency.taxonomy.label.toLowerCase()} rubric`;

    return {
      scope,
      rows: pool.map((s) => byStudent.get(s.id)).filter(Boolean),
    };
  }, [ready, user, competency.taxonomy]);

  /* ---------------- skills ---------------- */

  const skillRows = useMemo(() => {
    const peerScores = {};
    peers.rows.forEach((a) => {
      Object.entries(a.domainScores || {}).forEach(([domain, score]) => {
        if (!peerScores[domain]) peerScores[domain] = [];
        peerScores[domain].push(score);
      });
    });
    return competency.rows.map(({ skill, score }) => ({
      skill,
      short: skill.length > 22 ? `${skill.slice(0, 20)}…` : skill,
      you: score,
      cohort: peerScores[skill]?.length ? Math.round(peerScores[skill].reduce((a, b) => a + b, 0) / peerScores[skill].length) : null,
      attempts: attempts.filter((a) => a.domain === skill && !a.missed).length,
    }));
  }, [competency.rows, peers.rows, attempts]);

  const percentile = useMemo(() => {
    if (!assessment || peers.rows.length < 3) return null;
    const mine = assessment.overallScore;
    const below = peers.rows.filter((a) => a.overallScore < mine).length;
    return Math.round((below / peers.rows.length) * 100);
  }, [assessment, peers.rows]);

  const cohortMedian = useMemo(() => median(peers.rows.map((a) => a.overallScore)), [peers.rows]);

  /* ---------------- test history ---------------- */

  const history = useMemo(() => {
    const graded = attempts
      .filter((a) => a.completedAt)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    let running = 0;
    return graded.map((a, i) => {
      running += a.score;
      return {
        label: formatDate(a.completedAt),
        domain: a.domain,
        score: a.score,
        average: Math.round(running / (i + 1)),
        missed: a.missed,
        title: tests.find((t) => t.id === a.testId)?.title || a.domain,
      };
    });
  }, [attempts, tests]);

  const improvement = useMemo(() => {
    if (history.length < 2) return null;
    const firstHalf = history.slice(0, Math.ceil(history.length / 2));
    const secondHalf = history.slice(Math.ceil(history.length / 2));
    const avg = (rows) => Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
    return avg(secondHalf) - avg(firstHalf);
  }, [history]);

  /* ---------------- applications ---------------- */

  const funnel = useMemo(() => {
    const live = applications.filter((a) => !TERMINAL_STAGES.includes(a.status));
    return PIPELINE_STAGES.map((stage, i) => ({
      stage,
      count: live.filter((a) => PIPELINE_STAGES.indexOf(a.status) >= i).length,
    }));
  }, [applications]);

  const applicationsByMonth = useMemo(() => {
    const buckets = {};
    applications.forEach((a) => {
      const key = monthKey(a.appliedAt);
      if (!key) return;
      if (!buckets[key]) buckets[key] = { month: key, applied: 0, shortlisted: 0, interview: 0, hired: 0 };
      buckets[key].applied += 1;
      const reached = (stage) => (a.statusHistory || []).some((h) => h.status === stage) || a.status === stage;
      if (reached("Shortlisted")) buckets[key].shortlisted += 1;
      if (reached("Interview")) buckets[key].interview += 1;
      if (reached("Hired")) buckets[key].hired += 1;
    });
    return Object.values(buckets)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((b) => ({ ...b, label: monthLabel(b.month) }));
  }, [applications]);

  const responseRate = useMemo(() => {
    if (!applications.length) return null;
    const responded = applications.filter(
      (a) => a.status !== "Applied" || (a.statusHistory || []).length > 1
    ).length;
    return Math.round((responded / applications.length) * 100);
  }, [applications]);

  const noData = !assessment && attempts.length === 0 && applications.length === 0;

  if (!ready) {
    return (
      <DashboardLayout activePage="analytics" title="Analytics">
        <div className="space-y-5">
          <div className="h-24 skeleton rounded-2xl" />
          <div className="h-80 skeleton rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePage="analytics" title="Analytics">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="Your analytics"
          title="How you're actually doing"
          subtitle="Built from your recorded test results and real applications. Nothing on this page is illustrative — where there isn't enough data yet, it says so."
        />

        {noData ? (
          <EmptyState icon="📊" title="Nothing to analyse yet">
            Sit a skill test or apply to a posting and this page fills in. Both take a few minutes.
          </EmptyState>
        ) : (
          <>
            <StatGrid
              columns={4}
              stats={[
                {
                  label: "Overall skill score",
                  value: assessment ? `${Math.round(assessment.overallScore)}/100` : "—",
                  hint:
                    percentile != null
                      ? `Ahead of ${percentile}% of ${peers.scope}`
                      : assessment
                      ? `${competency.assessed} of ${competency.total} areas assessed`
                      : "Take a test",
                  icon: "🎯",
                  tone: "primary",
                },
                {
                  label: "Tests completed",
                  value: String(attempts.filter((a) => !a.missed).length),
                  hint:
                    improvement != null
                      ? `${improvement >= 0 ? "+" : ""}${improvement} since your first half`
                      : attempts.some((a) => a.missed)
                      ? `${attempts.filter((a) => a.missed).length} missed`
                      : "—",
                  icon: "📝",
                  tone: "purple",
                },
                {
                  label: "Applications",
                  value: String(applications.length),
                  hint: responseRate != null ? `${responseRate}% got a response` : "—",
                  icon: "📄",
                  tone: "blue",
                },
                {
                  label: "Verified certificates",
                  value: String(credentials.length),
                  hint: credentials.length ? "Issued to you on Skill Setu" : "None yet",
                  icon: "🏅",
                  tone: "amber",
                },
              ]}
            />

            <Tabs
              tabs={[
                { key: "skills", label: "Skill breakdown" },
                { key: "history", label: "Test history" },
                { key: "applications", label: "Applications" },
              ]}
              value={tab}
              onChange={setTab}
            />

            {/* ---------------- skills ---------------- */}
            {tab === "skills" && (
              <div className="space-y-5">
                <Card>
                  <Section
                    title="You against your cohort"
                    description={`Each bar is one domain on the ${competency.taxonomy.label.toLowerCase()} rubric — the one your course is assessed on. The comparison is against ${peers.scope}${
                      peers.rows.length ? ` (${peers.rows.length})` : ""
                    }.`}
                  >
                    {competency.assessed === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No domain has been assessed yet — sit a test and this chart fills in.
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={Math.max(240, skillRows.length * 42)}>
                        <BarChart data={skillRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                          <YAxis
                            type="category"
                            dataKey="short"
                            width={140}
                            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          />
                          <Tooltip
                            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }}
                            formatter={(value, name) => [value == null ? "not assessed" : value, name === "you" ? "You" : "Cohort average"]}
                          />
                          <Legend formatter={(v) => (v === "you" ? "You" : "Cohort average")} wrapperStyle={{ fontSize: 12 }} />
                          <ReferenceLine x={80} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: "target", fontSize: 10, fill: "var(--muted-foreground)" }} />
                          <Bar dataKey="you" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={11}>
                            {skillRows.map((row) => (
                              <Cell key={row.skill} fillOpacity={row.you == null ? 0.15 : 1} />
                            ))}
                          </Bar>
                          <Bar dataKey="cohort" fill="var(--muted-foreground)" fillOpacity={0.45} radius={[0, 4, 4, 0]} barSize={11} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Section>
                </Card>

                <div className="grid md:grid-cols-2 gap-5">
                  <Card>
                    <Section title="Where to spend your time" description="Your weakest assessed domains, hardest first.">
                      {competency.assessed === 0 ? (
                        <p className="text-sm text-muted-foreground">Nothing assessed yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {skillRows
                            .filter((r) => r.you != null)
                            .sort((a, b) => a.you - b.you)
                            .slice(0, 4)
                            .map((r) => (
                              <div key={r.skill}>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-xs font-medium text-foreground truncate">{r.skill}</span>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {r.you}
                                    {r.cohort != null && (
                                      <span className={r.you >= r.cohort ? " text-emerald-600" : " text-amber-600"}>
                                        {" "}
                                        ({r.you >= r.cohort ? "+" : ""}
                                        {r.you - r.cohort} vs cohort)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <ProgressBar value={r.you} />
                              </div>
                            ))}
                        </div>
                      )}
                    </Section>
                  </Card>

                  <Card>
                    <Section title="Not assessed yet" description="Domains on your rubric with no result behind them. Each one you sit makes your profile more complete.">
                      {competency.rows.filter((r) => r.score == null).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Every domain on your rubric has been assessed. Retake any test to improve the average.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {competency.rows
                            .filter((r) => r.score == null)
                            .map((r) => (
                              <button
                                key={r.skill}
                                onClick={() => navigate("skill-assessment")}
                                className="text-[11px] px-2.5 py-1.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                              >
                                {r.skill}
                              </button>
                            ))}
                        </div>
                      )}
                      {cohortMedian != null && assessment && (
                        <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
                          The median overall score among {peers.scope} is {cohortMedian}. Yours is{" "}
                          {Math.round(assessment.overallScore)}.
                        </p>
                      )}
                    </Section>
                  </Card>
                </div>
              </div>
            )}

            {/* ---------------- history ---------------- */}
            {tab === "history" && (
              <div className="space-y-5">
                <Card>
                  <Section
                    title="Every result, in order"
                    description="One point per attempt, with your running average. A missed test is recorded as zero and pulls the average down — that is deliberate."
                  >
                    {history.length < 2 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        {history.length === 1
                          ? "One result so far. Sit another test and the trend appears here."
                          : "No results yet."}
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={history} margin={{ left: -18, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                          <Tooltip
                            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
                          />
                          <Legend formatter={(v) => (v === "score" ? "This attempt" : "Running average")} wrapperStyle={{ fontSize: 12 }} />
                          <ReferenceLine y={cohortMedian ?? 0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="average" stroke="#3C5A8A" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </Section>
                </Card>

                <Card padded={false}>
                  <div className="px-5 pt-5 pb-3">
                    <h3 className="font-semibold text-foreground text-sm">Attempt log</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Newest first, with the marking behind each score.</p>
                  </div>
                  <div className="divide-y divide-border">
                    {[...history].reverse().map((h, i) => (
                      <div key={`${h.label}-${i}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-foreground truncate">{h.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {h.domain} · {h.label}
                          </div>
                        </div>
                        <Badge tone={h.missed ? "red" : h.score >= 70 ? "green" : h.score >= 50 ? "amber" : "red"}>
                          {h.missed ? "Missed · 0%" : `${h.score}%`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ---------------- applications ---------------- */}
            {tab === "applications" && (
              <div className="space-y-5">
                {applications.length === 0 ? (
                  <EmptyState icon="📄" title="You haven't applied to anything yet">
                    Your funnel and response rate appear here once you do.
                  </EmptyState>
                ) : (
                  <>
                    <Card>
                      <Section
                        title="Your funnel"
                        description="How far your live applications have got. Each stage counts applications that reached it or beyond, so the numbers can only go down."
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {funnel.map((s, i) => {
                            const previous = i > 0 ? funnel[i - 1].count : null;
                            return (
                              <div key={s.stage} className="rounded-xl border border-border bg-secondary/30 px-3.5 py-3">
                                <div className="text-2xl font-bold text-foreground tracking-tight">{s.count}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{s.stage}</div>
                                {previous ? (
                                  <div className="text-[10px] text-muted-foreground mt-1">
                                    {Math.round((s.count / previous) * 100)}% of {funnel[i - 1].stage.toLowerCase()}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        {applications.filter((a) => TERMINAL_STAGES.includes(a.status)).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-3">
                            {applications.filter((a) => a.status === "Rejected").length} rejected and{" "}
                            {applications.filter((a) => a.status === "Withdrawn").length} withdrawn are counted separately, so
                            the stages above and these add up to your {applications.length} total.
                          </p>
                        )}
                      </Section>
                    </Card>

                    {applicationsByMonth.length > 1 && (
                      <Card>
                        <Section title="Over time" description="Applications you sent each month, and how far they got.">
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={applicationsByMonth} margin={{ left: -18, right: 12 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              {["applied", "shortlisted", "interview", "hired"].map((key) => (
                                <Bar
                                  key={key}
                                  dataKey={key}
                                  name={key[0].toUpperCase() + key.slice(1)}
                                  fill={STAGE_COLORS[key[0].toUpperCase() + key.slice(1)] || "var(--primary)"}
                                  radius={[4, 4, 0, 0]}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </Section>
                      </Card>
                    )}

                    <Card padded={false}>
                      <div className="px-5 pt-5 pb-3">
                        <h3 className="font-semibold text-foreground text-sm">Every application</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          With the match score computed from your assessment at the time you applied.
                        </p>
                      </div>
                      <div className="divide-y divide-border">
                        {[...applications]
                          .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
                          .map((a) => (
                            <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-foreground truncate">{a.internshipTitle}</div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {a.company} · applied {formatDate(a.appliedAt)}
                                </div>
                              </div>
                              {a.match != null && <Badge tone="neutral">{a.match}% match</Badge>}
                              <Badge
                                tone={
                                  a.status === "Hired"
                                    ? "green"
                                    : a.status === "Rejected"
                                    ? "red"
                                    : a.status === "Interview"
                                    ? "amber"
                                    : "blue"
                                }
                              >
                                {a.status}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </Card>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
