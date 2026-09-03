"use client";

import { useEffect, useMemo, useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import DashboardLayout from "../DashboardLayout";
import ApplyConfirmModal from "../ApplyConfirmModal";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { getAssessment, getPortfolio, listInternships, listApplicationsForStudent, applyToInternship } from "../../lib/store";
import TalentPoolToggle from "../TalentPoolToggle";
import { computeMatch, daysUntil, formatDate } from "../../lib/match";
import { SKILL_DOMAINS } from "../../lib/questionBank";

const RADAR_DOMAINS = SKILL_DOMAINS;

function ProfileCompletionBar({ percent }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 300);
    return () => clearTimeout(t);
  }, [percent]);
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}

const priorityColor = {
  High: "text-red-600 bg-red-50",
  Medium: "text-amber-600 bg-amber-50",
  Low: "text-muted-foreground bg-muted",
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNav();
  const [ready, setReady] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    setAssessment(getAssessment(user.id));
    setPortfolio(getPortfolio(user.id));
    setInternships(listInternships());
    const apps = listApplicationsForStudent(user.id);
    setApplications(apps);
    setAppliedIds(new Set(apps.map((a) => a.internshipId)));
    setReady(true);
  }, [user]);

  const radarData = useMemo(
    () => RADAR_DOMAINS.map((skill) => ({ skill, value: assessment?.domainScores?.[skill] ?? 0 })),
    [assessment]
  );

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

  const skillGaps = useMemo(() => {
    if (!assessment) return [];
    return Object.entries(assessment.domainScores || {})
      .sort((a, b) => a[1] - b[1])
      .slice(0, 4)
      .map(([skill, score]) => ({ skill, priority: score < 55 ? "High" : score < 75 ? "Medium" : "Low" }));
  }, [assessment]);

  const profileCompletion = useMemo(() => {
    let pct = 0;
    if (assessment) pct += 35;
    if (portfolio?.certifications?.length) pct += 20;
    if (portfolio?.timeline?.length) pct += 20;
    if (portfolio?.bio) pct += 10;
    if (applications.length) pct += 15;
    return Math.min(100, pct);
  }, [assessment, portfolio, applications]);

  const [applyTarget, setApplyTarget] = useState(null);

  function handleApply(internship) {
    setApplyTarget(internship);
  }

  function confirmApply(note) {
    applyToInternship(applyTarget, user, applyTarget.match, note);
    setAppliedIds((prev) => new Set([...prev, applyTarget.id]));
    setApplyTarget(null);
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Good to see you, {firstName} 👋</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{[user.course, user.year].filter(Boolean).join(" · ") || "Student"} · {user.institution || "Your Institution"}</p>
          </div>
          <button onClick={() => navigate("skill-assessment")} className="hidden sm:flex items-center gap-2 bg-primary hover:bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 hover:shadow-md">
            {assessment ? "Browse Skill Tests" : "Take a Skill Test"}
          </button>
        </div>

        <TalentPoolToggle />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Skill Score", value: assessment ? `${Math.round(assessment.overallScore)}/100` : "—", sub: assessment ? "Across skill tests taken" : "Take a skill test", up: !!assessment },
            { label: "Applications", value: String(applications.length), sub: `${applications.filter((a) => a.status !== "Applied").length} in progress`, up: applications.length > 0 },
            { label: "Certifications", value: String(portfolio?.certifications?.length || 0), sub: "In your portfolio", up: false },
            { label: "Profile Complete", value: `${profileCompletion}%`, sub: profileCompletion < 100 ? "Keep building your profile" : "All set!", up: profileCompletion >= 70 },
          ].map((tile) => (
            <div key={tile.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="text-xs text-muted-foreground mb-1">{tile.label}</div>
              <div className="text-2xl font-bold text-foreground mb-1">{tile.value}</div>
              <div className={`text-xs font-medium ${tile.up ? "text-olive-600" : "text-muted-foreground"}`}>{tile.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Skill Profile</h3>
                <p className="text-xs text-muted-foreground">{assessment ? "5 skill areas" : "Take a skill test to populate this"}</p>
              </div>
              <button onClick={() => navigate("skill-assessment")} className="text-xs font-medium text-primary hover:underline">Update →</button>
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
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-1">Profile Completion</h3>
              <p className="text-xs text-muted-foreground mb-3">{profileCompletion}% complete — add certifications and apply to opportunities to reach 100%</p>
              <ProfileCompletionBar percent={profileCompletion} />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{profileCompletion} / 100</span>
                <button onClick={() => navigate("student-portfolio")} className="text-xs text-primary font-medium hover:underline">Complete Profile →</button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-foreground text-sm mb-3">Skill Gap Nudges</h3>
              {skillGaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Take the skill assessment to see personalised gap analysis here.</p>
              ) : (
                <div className="space-y-2">
                  {skillGaps.map((gap) => (
                    <div key={gap.skill} className="flex items-center justify-between gap-3 py-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{gap.skill}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${priorityColor[gap.priority]}`}>{gap.priority}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Recommended Internships</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Based on your skill profile</p>
            </div>
            <button onClick={() => navigate("internship-listings")} className="text-sm text-primary font-medium hover:underline">View all →</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.map((intern) => {
              const isApplied = appliedIds.has(intern.id);
              return (
                <div key={intern.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: intern.color }}>
                      {intern.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{intern.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{intern.company}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-wrap gap-1">
                      {(intern.tags || []).slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-primary flex-shrink-0 ml-1">{intern.match}% match</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{intern.location}</span>
                    <span>{intern.stipend}</span>
                  </div>

                  <div className="w-full h-1.5 bg-muted rounded-full mb-3">
                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${intern.match}%` }} />
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
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Upcoming Deadlines</h3>
          <div className="space-y-3">
            {upcomingDeadlines.map((dl) => (
              <div key={dl.id} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary leading-tight">{dl.days}d</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{dl.title} · {dl.company}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(dl.deadline)}</div>
                </div>
                <div className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${dl.days <= 8 ? "text-red-600 bg-red-50" : "text-muted-foreground bg-muted"}`}>
                  {dl.days <= 8 ? "Urgent" : "Upcoming"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
    {applyTarget && <ApplyConfirmModal internship={applyTarget} user={user} onConfirm={confirmApply} onClose={() => setApplyTarget(null)} />}
    </>
  );
}
