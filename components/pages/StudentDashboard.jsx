"use client";

import { useEffect, useMemo, useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import DashboardLayout from "../DashboardLayout";
import ApplyConfirmModal from "../ApplyConfirmModal";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { getAssessment, getPortfolio, listInternships, listApplicationsForStudent, applyToInternship, listAnnouncements } from "../../lib/store";
import TalentPoolToggle from "../TalentPoolToggle";
import StudentInbox from "../StudentInbox";
import MentoringPanel from "../MentoringPanel";
import { computeMatch, daysUntil, formatDate, relativeTime } from "../../lib/match";
import { SKILL_DOMAINS } from "../../lib/questionBank";
import { Badge, Flash, Modal, useFlash } from "../ui/Kit";
import { subscribeToMutations } from "../../lib/sync";
import AiGapAnalysisModal from "../AiGapAnalysisModal";

const RADAR_DOMAINS = SKILL_DOMAINS;

const appStatusBadge = {
  Applied: "bg-blue-100 text-blue-700 border-blue-200",
  Shortlisted: "bg-purple-100 text-purple-700 border-purple-200",
  Interview: "bg-amber-100 text-amber-700 border-amber-200",
  Hired: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

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
  const [announcements, setAnnouncements] = useState([]);
  const [viewAllNotices, setViewAllNotices] = useState(false);
  const [showAiGapModal, setShowAiGapModal] = useState(false);
  const [flash, setFlash] = useFlash(6000);

  function refresh() {
    if (!user) return;
    setAssessment(getAssessment(user.id));
    setPortfolio(getPortfolio(user.id));
    setInternships(listInternships());
    const apps = listApplicationsForStudent(user.id);
    setApplications(apps);
    setAppliedIds(new Set(apps.map((a) => a.internshipId)));
    const inst = user.institution || user.instituteName;
    setAnnouncements(listAnnouncements(inst));
    setReady(true);
  }

  useEffect(() => {
    refresh();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMutations(["applications", "studentNotifications", "internships", "announcements"], (event) => {
      refresh();
      if (event.collection === "applications" && event.action === "UPDATE" && event.payload) {
        if (event.payload.studentId === user.id) {
          setFlash(`Application update: "${event.payload.internshipTitle || "Internship"}" is now "${event.payload.status}"`);
        }
      }
    });
    return unsub;
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

        <Flash message={flash} />

        <TalentPoolToggle />

        <div className="grid lg:grid-cols-2 gap-5">
          <StudentInbox user={user} />
          <MentoringPanel user={user} />
        </div>

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
                <p className="text-xs text-muted-foreground">
                  {assessment ? `${Object.keys(assessment.domainScores || {}).length} of ${SKILL_DOMAINS.length} skill areas assessed` : "Take a skill test to populate this"}
                </p>
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
              <p className="text-xs text-muted-foreground mb-3">
                {profileCompletion >= 100
                  ? "Your profile is complete — recruiters see the full picture."
                  : `${profileCompletion}% complete — add certifications and apply to opportunities to reach 100%`}
              </p>
              <ProfileCompletionBar percent={profileCompletion} />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{profileCompletion} / 100</span>
                <button onClick={() => navigate("student-portfolio")} className="text-xs text-primary font-medium hover:underline">Complete Profile →</button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Skill Gap Nudges</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Competency deficits mapped against industry</p>
                </div>
                <button
                  onClick={() => setShowAiGapModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors border border-primary/20 shadow-sm"
                >
                  <span>✨ AI Roadmap</span>
                </button>
              </div>
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

        {/* Active Applications Section */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">Active Applications</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {applications.length} total
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live status and progression across your internship applications
              </p>
            </div>
            <button onClick={() => navigate("internship-listings")} className="text-xs text-primary font-medium hover:underline">
              Explore more roles →
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              You have not applied to any opportunities yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {applications.map((app) => (
                <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-secondary/40 border border-border rounded-xl hover:bg-secondary/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{app.internshipTitle || "Internship Role"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{app.company} · Applied {formatDate(app.appliedAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-primary">{app.match}% match</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all duration-300 ${appStatusBadge[app.status] || "bg-secondary text-muted-foreground border-border"}`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        {/* Campus Notice Board Widget */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">Campus Notice Board</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {user?.institution || "Apex University"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official circulars, schedules, and announcements from your faculty & placement cell
              </p>
            </div>
            {announcements.length > 2 && (
              <button
                onClick={() => setViewAllNotices(true)}
                className="text-xs text-primary font-medium hover:underline"
              >
                View all ({announcements.length}) →
              </button>
            )}
          </div>

          {announcements.length === 0 ? (
            <p className="text-xs text-muted-foreground">No circulars posted by your institution yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3.5">
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className="bg-secondary/30 border border-border rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-semibold text-foreground line-clamp-1">{a.title}</h4>
                      {a.pinned && <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Pinned</span>}
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
                </div>
              ))}
            </div>
          )}
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
    {viewAllNotices && (
      <Modal
        title={`Campus Notice Board · ${user?.institution || "Apex University"}`}
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
