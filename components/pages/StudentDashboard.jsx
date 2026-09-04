"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import DashboardLayout from "../DashboardLayout";
import ApplyConfirmModal from "../ApplyConfirmModal";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  getAssessment,
  getPortfolio,
  listInternships,
  listApplicationsForStudent,
  applyToInternship,
  listAnnouncements,
  listRegistrationsForStudent,
  getAttemptsForStudent,
  checkAndRecordMissedTests,
  listSkillTests,
  listCredentialsForStudent,
  listSavedInternships,
  toggleSavedInternship,
  PIPELINE_STAGES,
  TERMINAL_STAGES,
} from "../../lib/store";
import TalentPoolToggle from "../TalentPoolToggle";
import StudentInbox from "../StudentInbox";
import MentoringPanel from "../MentoringPanel";
import { computeMatch, daysUntil, formatDate, formatDateTime, relativeTime } from "../../lib/match";
import { getRegistrationStatus, isLinkRevealWindow, formatScheduled } from "../../lib/testStatus";
import { profileStrength } from "../../lib/profile";
import { scoresFor, taxonomyFor } from "../../lib/taxonomy";
import { Badge, Flash, Modal, useFlash, PageHeader, Card, Section, StatGrid, ProgressRing, Button, ProgressBar, EmptyState } from "../ui/Kit";
import { subscribeToMutations } from "../../lib/sync";
import AiGapAnalysisModal from "../AiGapAnalysisModal";

const appStatusTone = {
  Applied: "blue",
  Shortlisted: "purple",
  Interview: "amber",
  Hired: "green",
  Rejected: "red",
  Withdrawn: "muted",
};

const priorityTone = {
  High: "red",
  Medium: "amber",
  Low: "muted",
};

const testStatusTone = {
  upcoming: "blue",
  available: "primary",
  completed: "green",
  missed: "red",
};

const testStatusLabel = {
  upcoming: "Scheduled",
  available: "Ready to take",
  completed: "Completed",
  missed: "Missed",
};

/** Priority ordering for the action centre — lower sorts first. */
const URGENCY = { critical: 0, high: 1, normal: 2 };

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNav();
  const [ready, setReady] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [announcements, setAnnouncements] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [tests, setTests] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [viewAllNotices, setViewAllNotices] = useState(false);
  const [showAiGapModal, setShowAiGapModal] = useState(false);
  const [flash, setFlash] = useFlash(6000);

  function refresh() {
    if (!user) return;
    // A missed test only used to be recorded when the student happened to open
    // the Skill Tests page, so a 0-score attempt could sit unrecorded for weeks.
    checkAndRecordMissedTests(user.id);
    setAssessment(getAssessment(user.id));
    setPortfolio(getPortfolio(user.id));
    setInternships(listInternships());
    const apps = listApplicationsForStudent(user.id);
    setApplications(apps);
    setAppliedIds(new Set(apps.map((a) => a.internshipId)));
    const inst = user.institution || user.instituteName;
    setAnnouncements(listAnnouncements(inst));
    setRegistrations(listRegistrationsForStudent(user.id));
    setAttempts(getAttemptsForStudent(user.id));
    setTests(listSkillTests());
    setCredentials(listCredentialsForStudent(user.id));
    setSavedIds(new Set(listSavedInternships(user.id).map((s) => s.internshipId)));
    setReady(true);
  }

  useEffect(() => {
    refresh();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMutations(
      ["applications", "studentNotifications", "internships", "announcements", "credentials", "skillTestRegistrations", "assessments"],
      (event) => {
        refresh();
        if (event.collection === "applications" && event.action === "UPDATE" && event.payload) {
          if (event.payload.studentId === user.id) {
            setFlash(`Application update: "${event.payload.internshipTitle || "Internship"}" is now "${event.payload.status}"`);
          }
        }
        if (event.collection === "credentials" && event.action === "INSERT" && event.payload?.studentId === user.id) {
          setFlash(`🏅 ${event.payload.issuer} issued you a certificate: "${event.payload.title}"`);
        }
      }
    );
    return unsub;
  }, [user]);

  /* ---------------- Derived data ---------------- */

  /* The radar, the nudges and the "N of M assessed" counter all read the
     rubric for this student's own stream — a CSE candidate is never charted on
     clinical axes, and a BAMS candidate is never charted on programming. */
  const taxonomy = useMemo(() => taxonomyFor(user), [user]);
  const competency = useMemo(() => scoresFor(user, assessment), [user, assessment]);

  const radarData = useMemo(
    () => competency.rows.map(({ skill, score }) => ({ skill, value: score ?? 0 })),
    [competency]
  );

  /* Score over time, so a student can see whether they're actually improving
     rather than only where they stand today. */
  const trendData = useMemo(() => {
    const sorted = [...attempts]
      .filter((a) => a.completedAt)
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    let runningSum = 0;
    return sorted.map((a, i) => {
      runningSum += a.score;
      return { n: i + 1, label: formatDate(a.completedAt), domain: a.domain, average: Math.round(runningSum / (i + 1)), score: a.score };
    });
  }, [attempts]);

  const recommended = useMemo(() => {
    return [...internships]
      .filter((i) => i.status !== "Closed")
      .map((i) => ({ ...i, match: computeMatch(i, assessment) }))
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);
  }, [internships, assessment]);

  const upcomingDeadlines = useMemo(() => {
    return [...internships]
      .map((i) => ({ ...i, days: daysUntil(i.deadline) }))
      .filter((i) => i.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 3);
  }, [internships]);

  const savedRoles = useMemo(
    () =>
      internships
        .filter((i) => savedIds.has(i.id))
        .map((i) => ({ ...i, days: daysUntil(i.deadline), match: computeMatch(i, assessment) })),
    [internships, savedIds, assessment]
  );

  const skillGaps = useMemo(() => {
    if (!assessment) return [];
    return competency.rows
      .filter((r) => r.score != null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map(({ skill, score }) => ({ skill, score, priority: score < 55 ? "High" : score < 75 ? "Medium" : "Low" }));
  }, [assessment, competency]);

  const strength = useMemo(
    () => profileStrength({ assessment, portfolio, applications, credentials }),
    [assessment, portfolio, applications, credentials]
  );

  /** Registrations joined to their test and current status, newest first. */
  const myTests = useMemo(() => {
    return registrations
      .map((reg) => {
        const test = tests.find((t) => t.id === reg.testId);
        if (!test) return null;
        const attempt = attempts.find((a) => a.testId === reg.testId);
        return { reg, test, attempt, status: getRegistrationStatus(test, reg, attempt) };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.reg.registeredAt) - new Date(a.reg.registeredAt));
  }, [registrations, tests, attempts]);

  const upcomingTests = useMemo(
    () => myTests.filter((t) => t.status === "upcoming" || t.status === "available").slice(0, 4),
    [myTests]
  );

  const interviews = useMemo(
    () =>
      applications
        .filter((a) => a.interviewAt && a.status !== "Rejected")
        .sort((a, b) => new Date(a.interviewAt) - new Date(b.interviewAt)),
    [applications]
  );

  const pipeline = useMemo(() => {
    const live = applications.filter((a) => !TERMINAL_STAGES.includes(a.status));
    return {
      stages: PIPELINE_STAGES.map((stage, i) => ({
        stage,
        count: live.filter((a) => PIPELINE_STAGES.indexOf(a.status) >= i).length,
      })),
      rejected: applications.filter((a) => a.status === "Rejected").length,
      live: live.length,
    };
  }, [applications]);

  /**
   * The action centre. Everything the student should do next, ranked, rather
   * than leaving them to infer it from five separate widgets.
   */
  const actions = useMemo(() => {
    const items = [];
    const now = Date.now();

    if (!assessment) {
      items.push({
        key: "first-test",
        urgency: "critical",
        icon: "🎯",
        title: "Take your first skill test",
        detail: "Your skill radar and every match score are computed from it.",
        cta: "Browse tests",
        onClick: () => navigate("skill-assessment"),
      });
    }

    myTests.forEach(({ test, status, reg }) => {
      const scheduled = test.scheduledAt ? new Date(`${test.scheduledAt}T${test.scheduledTime || "00:00"}`).getTime() : null;
      if (status === "upcoming" && scheduled && scheduled - now < 48 * 3600 * 1000) {
        items.push({
          key: `test-${test.id}`,
          urgency: "critical",
          icon: "⏰",
          title: `${test.title} starts ${relativeTimeAhead(scheduled)}`,
          detail:
            test.mode === "Online"
              ? isLinkRevealWindow(test) && test.meetingLink
                ? "The meeting link is live now."
                : "The meeting link appears 24 hours before the start time."
              : `${test.venue || "Venue to be confirmed"}${reg?.reportingTime ? ` · report by ${reg.reportingTime}` : ""}`,
          cta: test.mode === "Online" && isLinkRevealWindow(test) && test.meetingLink ? "Join test" : "View details",
          href: test.mode === "Online" && isLinkRevealWindow(test) && test.meetingLink ? test.meetingLink : undefined,
          onClick: () => navigate("skill-assessment"),
        });
      }
      if (status === "available") {
        items.push({
          key: `take-${test.id}`,
          urgency: "high",
          icon: "📝",
          title: `${test.title} is ready to take`,
          detail: "Complete it to add the score to your skill profile.",
          cta: "Take test",
          onClick: () => navigate("skill-assessment"),
        });
      }
      if (status === "missed") {
        items.push({
          key: `missed-${test.id}`,
          urgency: "high",
          icon: "⚠️",
          title: `You missed ${test.title}`,
          detail: "It was recorded as a zero. Register for another test to recover the average.",
          cta: "Find another test",
          onClick: () => navigate("skill-assessment"),
        });
      }
    });

    interviews.forEach((a) => {
      const at = new Date(a.interviewAt).getTime();
      if (at < now) return;
      items.push({
        key: `interview-${a.id}`,
        urgency: at - now < 72 * 3600 * 1000 ? "critical" : "high",
        icon: "🎙",
        title: `${a.interviewMode || ""} interview with ${a.company}`.trim(),
        detail: `${a.internshipTitle || "Role"} · ${formatDateTime(a.interviewAt)}`,
        cta: "See application",
        onClick: () => navigate("internship-listings"),
      });
    });

    strength.missing.slice(0, 2).forEach((item) => {
      items.push({
        key: `profile-${item.key}`,
        urgency: "normal",
        icon: "🧩",
        title: item.label,
        detail: `${item.detail} (+${item.weight}% profile strength)`,
        cta: item.action === "student-portfolio" ? "Open portfolio" : "Go",
        onClick: () => navigate(item.action),
      });
    });

    savedRoles
      .filter((r) => r.days >= 0 && r.days <= 7 && !appliedIds.has(r.id))
      .forEach((r) => {
        items.push({
          key: `saved-${r.id}`,
          urgency: "high",
          icon: "🔖",
          title: `${r.title} closes in ${r.days} day${r.days === 1 ? "" : "s"}`,
          detail: `${r.company} · you saved this role but haven't applied.`,
          cta: "Apply now",
          onClick: () => navigate("internship-listings"),
        });
      });

    return items.sort((a, b) => URGENCY[a.urgency] - URGENCY[b.urgency]).slice(0, 5);
  }, [assessment, myTests, interviews, strength, savedRoles, appliedIds, navigate]);

  /* ---------------- Actions ---------------- */

  const [applyTarget, setApplyTarget] = useState(null);

  function handleApply(internship) {
    setApplyTarget(internship);
  }

  function confirmApply(note) {
    applyToInternship(applyTarget, user, applyTarget.match, note);
    setAppliedIds((prev) => new Set([...prev, applyTarget.id]));
    setApplyTarget(null);
  }

  function handleToggleSave(internship) {
    const nowSaved = toggleSavedInternship(user.id, internship.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(internship.id);
      else next.delete(internship.id);
      return next;
    });
    setFlash(nowSaved ? `Saved "${internship.title}" for later.` : `Removed "${internship.title}" from saved roles.`);
  }

  if (!ready) {
    return (
      <DashboardLayout activePage="student-dashboard" title="Dashboard">
        <div className="space-y-5 animate-pulse">
          <div className="h-8 skeleton w-56 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 h-64 skeleton rounded-2xl" />
            <div className="lg:col-span-2 h-64 skeleton rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const firstName = user.name?.split(" ")[0] || "there";

  return (
    <>
      <DashboardLayout activePage="student-dashboard" title="Dashboard">
        <div className="space-y-6 animate-fade-slide">
          <PageHeader
            eyebrow="Student Workspace"
            title={`Good to see you, ${firstName} 👋`}
            subtitle={`${[user.course, user.year].filter(Boolean).join(" · ") || "Student"} · ${user.institution || "Your Institution"}`}
            actions={
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate("student-portfolio")}>My portfolio</Button>
                <Button onClick={() => navigate("skill-assessment")}>
                  {assessment ? "Browse skill tests" : "Take a skill test"}
                </Button>
              </div>
            }
          />

          <Flash message={flash} />

          <TalentPoolToggle />

          {/* ---------- Action centre ---------- */}
          <Section
            title="What needs you next"
            description="Ranked by urgency, drawn from your tests, applications and profile."
          >
            {actions.length === 0 ? (
              <Card>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg flex-shrink-0">✓</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">You&apos;re all caught up</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nothing is waiting on you. Browse new openings or strengthen a weak skill area.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card padded={false}>
                <div className="divide-y divide-border">
                  {actions.map((a) => (
                    <div key={a.key} className="flex flex-wrap items-center gap-3 p-4">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                          a.urgency === "critical" ? "bg-red-50" : a.urgency === "high" ? "bg-amber-50" : "bg-secondary"
                        }`}
                      >
                        {a.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{a.detail}</div>
                      </div>
                      {a.href ? (
                        <a
                          href={a.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-accent transition-colors flex-shrink-0"
                        >
                          {a.cta}
                        </a>
                      ) : (
                        <button
                          onClick={a.onClick}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                        >
                          {a.cta}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Section>

          <StatGrid
            columns={5}
            stats={[
              {
                label: "Skill Score",
                value: assessment ? `${Math.round(assessment.overallScore)}/100` : "—",
                hint: assessment ? `${competency.assessed} of ${competency.total} areas assessed` : "Take a skill test",
                icon: "🎯",
                tone: "primary",
              },
              {
                label: "Applications",
                value: String(applications.length),
                hint: `${pipeline.live} live · ${pipeline.rejected} closed`,
                icon: "📄",
                tone: "blue",
              },
              {
                label: "Certificates",
                value: String(credentials.length + (portfolio?.certifications?.length || 0)),
                hint: credentials.length ? `${credentials.length} verified` : "None yet",
                icon: "🏅",
                tone: "amber",
              },
              {
                label: "Tests Taken",
                value: String(attempts.filter((a) => !a.missed).length),
                hint: `${upcomingTests.length} upcoming`,
                icon: "📝",
                tone: "purple",
              },
              {
                label: "Profile Strength",
                value: `${strength.percent}%`,
                hint: strength.percent < 100 ? `${strength.missing.length} items left` : "All set!",
                icon: "✅",
                tone: "green",
              },
            ]}
          />

          {/* ---------- Application pipeline ---------- */}
          {applications.length > 0 && (
            <Section
              title="Your application pipeline"
              description="Where your live applications stand. Closed applications are counted separately so the numbers add up."
            >
              <Card>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pipeline.stages.map((s, i) => (
                    <div key={s.stage} className="relative rounded-xl border border-border bg-secondary/30 px-3.5 py-3">
                      <div className="text-2xl font-bold text-foreground tracking-tight">{s.count}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.stage}</div>
                      {i > 0 && pipeline.stages[i - 1].count > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {Math.round((s.count / pipeline.stages[i - 1].count) * 100)}% carried through
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {pipeline.rejected > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {pipeline.rejected} application{pipeline.rejected === 1 ? " was" : "s were"} closed by the recruiter and
                    {pipeline.rejected === 1 ? " is" : " are"} not shown in the funnel above.
                  </p>
                )}
              </Card>
            </Section>
          )}

          {/* ---------- Skill profile + strength ---------- */}
          <div className="grid lg:grid-cols-3 gap-5">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Skill Profile</h3>
                  <p className="text-xs text-muted-foreground">
                    {assessment
                      ? `${competency.assessed} of ${competency.total} skill areas assessed · ${taxonomy.label}`
                      : `Take a skill test to populate this · ${taxonomy.label}`}
                  </p>
                </div>
                <button onClick={() => navigate("skill-assessment")} className="text-xs font-medium text-primary hover:underline flex-shrink-0">Update →</button>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <Card className="flex flex-wrap items-center gap-5">
                <ProgressRing value={strength.percent} tone="primary" size={92} sublabel="Profile strength" />
                <div className="flex-1 min-w-[13rem]">
                  <h3 className="font-semibold text-foreground text-sm mb-1">
                    {strength.percent >= 100 ? "Your profile is complete" : "Finish your profile"}
                  </h3>
                  {strength.percent >= 100 ? (
                    <p className="text-xs text-muted-foreground">Recruiters see the full picture — keep it current as you go.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {strength.missing.slice(0, 3).map((item) => (
                        <li key={item.key}>
                          <button
                            onClick={() => navigate(item.action)}
                            className="text-left text-xs text-foreground hover:text-primary transition-colors"
                          >
                            <span className="font-medium">{item.label}</span>{" "}
                            <span className="text-muted-foreground">+{item.weight}%</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button onClick={() => navigate("student-portfolio")} className="text-xs text-primary font-medium hover:underline mt-2 inline-block">
                    Open portfolio →
                  </button>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Skill Gap Nudges</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Your weakest areas, mapped against industry demand</p>
                  </div>
                  <button
                    onClick={() => setShowAiGapModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors border border-primary/20 shadow-sm flex-shrink-0"
                  >
                    <span>✨ AI Roadmap</span>
                  </button>
                </div>
                {skillGaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Take a skill test to see personalised gap analysis here.</p>
                ) : (
                  <div className="space-y-2.5">
                    {skillGaps.map((gap) => (
                      <div key={gap.skill} className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-foreground truncate">{gap.skill}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">{Math.round(gap.score)}</span>
                            <Badge tone={priorityTone[gap.priority]} dot>{gap.priority}</Badge>
                          </div>
                        </div>
                        <ProgressBar value={gap.score} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ---------- Score trend ---------- */}
          {trendData.length >= 2 && (
            <Section
              title="How your score is moving"
              description="Each point is one completed test, on the date you sat it. The solid line is your running average; the dashed line is that test's own score."
            >
              <Card>
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={trendData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" }}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.domain ? `${payload[0].payload.domain} · ${label}` : label}
                    />
                    <Legend verticalAlign="bottom" height={24} iconType="plainline" wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                    <Line type="monotone" dataKey="average" name="Running average" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="score" name="That test's score" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Section>
          )}

          {/* ---------- Upcoming tests ---------- */}
          <Section
            title={
              <span className="flex items-center gap-2">
                My Skill Tests
                {upcomingTests.length > 0 && <Badge tone="primary">{upcomingTests.length} upcoming</Badge>}
              </span>
            }
            description="Everything you've registered for, with joining details as they unlock."
            actions={
              <button onClick={() => navigate("skill-assessment")} className="text-xs text-primary font-medium hover:underline">
                Browse all tests →
              </button>
            }
          >
            {myTests.length === 0 ? (
              <Card>
                <p className="text-xs text-muted-foreground">
                  You haven&apos;t registered for any skill tests yet. Tests hosted by companies and institutions are what build
                  your verified skill profile — and what earn you certificates.
                </p>
              </Card>
            ) : (
              <Card padded={false}>
                <div className="divide-y divide-border">
                  {myTests.slice(0, 5).map(({ test, status, attempt }) => (
                    <div key={test.id} className="flex flex-wrap items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{test.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {test.hostName} · {test.mode} · {formatScheduled(test)}
                        </div>
                        {test.mode === "Offline" && test.venue && status !== "completed" && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">📍 {test.venue}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {attempt && !attempt.missed && <span className="text-sm font-semibold text-foreground">{attempt.score}%</span>}
                        <Badge tone={testStatusTone[status]} dot>{testStatusLabel[status]}</Badge>
                        {test.mode === "Online" && test.meetingLink && isLinkRevealWindow(test) && status !== "completed" && (
                          <a
                            href={test.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-accent transition-colors"
                          >
                            Join
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Section>

          {/* ---------- Issued certificates ---------- */}
          <Section
            title={
              <span className="flex items-center gap-2">
                My Certificates
                {credentials.length > 0 && <Badge tone="green">{credentials.length} verified</Badge>}
              </span>
            }
            description="Issued to you by companies, institutions and faculty. Print any of them as a PDF."
            actions={
              <button onClick={() => navigate("student-portfolio")} className="text-xs text-primary font-medium hover:underline">
                Manage in portfolio →
              </button>
            }
          >
            {credentials.length === 0 ? (
              <Card>
                <p className="text-xs text-muted-foreground">
                  Nothing yet. Complete a hosted skill test or an internship and the issuer can award you a verified certificate
                  here — it appears on your portfolio and prints as a PDF.
                </p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3.5">
                {credentials.slice(0, 4).map((c) => (
                  <Card key={c.id} hover className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl flex-shrink-0">🏅</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {c.issuer} · {formatDate(c.issuedAt)}
                      </div>
                    </div>
                    <Link
                      href={`/certificate/${c.id}`}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                    >
                      View
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          {/* ---------- Saved roles ---------- */}
          {savedRoles.length > 0 && (
            <Section
              title={
                <span className="flex items-center gap-2">
                  Saved Roles
                  <Badge tone="primary">{savedRoles.length}</Badge>
                </span>
              }
              description="Postings you bookmarked. Deadlines shown first."
            >
              <Card padded={false}>
                <div className="divide-y divide-border">
                  {[...savedRoles]
                    .sort((a, b) => a.days - b.days)
                    .map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {r.company} · {r.location} · {r.stipend}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-primary flex-shrink-0">{r.match}% match</span>
                        <Badge tone={r.days < 0 ? "muted" : r.days <= 7 ? "red" : "neutral"}>
                          {r.days < 0 ? "Closed" : `${r.days}d left`}
                        </Badge>
                        {appliedIds.has(r.id) ? (
                          <Badge tone="green">Applied</Badge>
                        ) : (
                          <button
                            onClick={() => handleApply({ ...r })}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                          >
                            Apply
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleSave(r)}
                          className="text-xs text-muted-foreground hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          Unsave
                        </button>
                      </div>
                    ))}
                </div>
              </Card>
            </Section>
          )}

          {/* ---------- Applications ---------- */}
          <Section
            title={
              <span className="flex items-center gap-2">
                Active Applications
                <Badge tone="primary">{applications.length} total</Badge>
              </span>
            }
            description="Live status and progression across your internship applications"
            actions={
              <button onClick={() => navigate("internship-listings")} className="text-xs text-primary font-medium hover:underline">
                Explore more roles →
              </button>
            }
          >
            <Card padded={false}>
              {applications.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  You have not applied to any opportunities yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {applications.map((app) => (
                    <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-secondary/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{app.internshipTitle || "Internship Role"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {app.company} · Applied {formatDate(app.appliedAt)}
                        </div>
                        {app.status === "Rejected" && app.rejectionReason && (
                          <div className="text-[11px] text-red-700 mt-1">Recruiter note: {app.rejectionReason}</div>
                        )}
                        {app.interviewAt && app.status !== "Rejected" && (
                          <div className="text-[11px] text-amber-700 mt-1">
                            🎙 {app.interviewMode || "Interview"} · {formatDateTime(app.interviewAt)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-primary">{app.match}% match</span>
                        <Badge tone={appStatusTone[app.status] || "neutral"} dot>{app.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Section>

          <Section
            title="Recommended Internships"
            description="Based on your skill profile"
            actions={<button onClick={() => navigate("internship-listings")} className="text-sm text-primary font-medium hover:underline">View all →</button>}
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended.map((intern) => {
                const isApplied = appliedIds.has(intern.id);
                const isSaved = savedIds.has(intern.id);
                return (
                  <Card key={intern.id} hover className="group">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: intern.color }}>
                        {intern.company.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">{intern.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{intern.company}</div>
                      </div>
                      <button
                        onClick={() => handleToggleSave(intern)}
                        aria-label={isSaved ? `Unsave ${intern.title}` : `Save ${intern.title}`}
                        title={isSaved ? "Remove from saved" : "Save for later"}
                        className={`text-base leading-none flex-shrink-0 transition-colors ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                      >
                        {isSaved ? "★" : "☆"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-wrap gap-1">
                        {(intern.tags || []).slice(0, 2).map((tag) => (
                          <Badge key={tag} tone="neutral">{tag}</Badge>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-primary flex-shrink-0 ml-1">{intern.match}% match</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{intern.location}</span>
                      <span>{intern.stipend}</span>
                    </div>

                    <div className="mb-3">
                      <ProgressBar value={intern.match} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Due {formatDate(intern.deadline)}</span>
                      <button
                        onClick={() => handleApply(intern)}
                        disabled={isApplied}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${isApplied ? "bg-primary/10 text-primary cursor-default" : "bg-primary/10 text-primary hover:bg-primary hover:text-white"}`}
                      >
                        {isApplied ? "✓ Applied" : "Apply"}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Section>

          <div className="grid lg:grid-cols-2 gap-5">
            <StudentInbox user={user} />
            <MentoringPanel user={user} />
          </div>

          {/* Campus Notice Board Widget */}
          <Section
            title={
              <span className="flex items-center gap-2">
                Campus Notice Board
                <Badge tone="primary">{user?.institution || "Your Institution"}</Badge>
              </span>
            }
            description="Official circulars, schedules, and announcements from your faculty & placement cell"
            actions={
              announcements.length > 2 && (
                <button
                  onClick={() => setViewAllNotices(true)}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  View all ({announcements.length}) →
                </button>
              )
            }
          >
            {announcements.length === 0 ? (
              <Card>
                <p className="text-xs text-muted-foreground">No circulars posted by your institution yet.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-3.5">
                {announcements.slice(0, 4).map((a) => (
                  <Card key={a.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-semibold text-foreground line-clamp-1">{a.title}</h4>
                        {a.pinned && <Badge tone="amber">Pinned</Badge>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mb-2">
                        {a.author || "Placement Cell"} · {relativeTime(a.postedAt)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{a.body}</p>
                    </div>

                    {a.attachment && (
                      <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm">📄</span>
                          <span className="text-[11px] font-medium text-foreground truncate">{a.attachment.name}</span>
                        </div>
                        <a
                          href={a.attachment.dataUrl || a.attachment.url || "#"}
                          download={a.attachment.name}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline flex-shrink-0"
                        >
                          PDF ↓
                        </a>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Upcoming Deadlines">
            {upcomingDeadlines.length === 0 ? (
              <EmptyState icon="🗓" title="No open deadlines right now" />
            ) : (
              <Card padded={false}>
                <div className="divide-y divide-border">
                  {upcomingDeadlines.map((dl) => (
                    <div key={dl.id} className="flex items-center gap-4 p-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-center flex-shrink-0 ${dl.days <= 8 ? "bg-red-50 text-red-600" : "bg-primary/8 text-primary"}`}>
                        <span className="text-xs font-bold leading-tight">{dl.days}d</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{dl.title} · {dl.company}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(dl.deadline)}</div>
                      </div>
                      <Badge tone={dl.days <= 8 ? "red" : "muted"}>{dl.days <= 8 ? "Urgent" : "Upcoming"}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Section>
        </div>
      </DashboardLayout>

      {applyTarget && <ApplyConfirmModal internship={applyTarget} user={user} onConfirm={confirmApply} onClose={() => setApplyTarget(null)} />}

      {viewAllNotices && (
        <Modal
          title={`Campus Notice Board · ${user?.institution || "Your Institution"}`}
          description="All official announcements, drive notifications, and attached PDF documents."
          onClose={() => setViewAllNotices(false)}
        >
          <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
            {announcements.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-foreground">{a.title}</h4>
                  {a.pinned && <Badge tone="amber">Pinned</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {a.author || "Placement Cell"} · {relativeTime(a.postedAt)} · Audience: {a.audience}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line mb-3">{a.body}</p>
                {a.attachment && (
                  <div className="flex items-center justify-between gap-3 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">📄</span>
                      <span className="font-medium text-foreground truncate">{a.attachment.name}</span>
                      {a.attachment.size && <span className="text-muted-foreground">({a.attachment.size})</span>}
                    </div>
                    <a
                      href={a.attachment.dataUrl || a.attachment.url || "#"}
                      download={a.attachment.name}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:bg-accent transition-colors flex-shrink-0"
                    >
                      Download PDF
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      <AiGapAnalysisModal
        isOpen={showAiGapModal}
        onClose={() => setShowAiGapModal(false)}
        assessment={assessment}
        internships={internships}
        applications={applications}
      />
    </>
  );
}

/** "in 3 hours" / "tomorrow" / "in 2 days" — the mirror of relativeTime(). */
function relativeTimeAhead(timestamp) {
  const mins = Math.round((timestamp - Date.now()) / 60000);
  if (mins < 60) return `in ${Math.max(mins, 1)} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}
