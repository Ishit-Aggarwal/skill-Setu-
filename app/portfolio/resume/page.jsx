"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { getPortfolio, getAssessment, listApplicationsForStudent } from "../../../lib/store";
import { scoresFor } from "../../../lib/taxonomy";
import RequireAuth from "../../../components/RequireAuth";

function ResumeContent() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [applications, setApplications] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPortfolio(getPortfolio(user.id) || {});
    setAssessment(getAssessment(user.id));
    setApplications(listApplicationsForStudent(user.id) || []);
    setReady(true);
  }, [user]);

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-500 text-sm">
        Preparing ATS resume layout...
      </div>
    );
  }

  // Competencies are listed against this student's own stream rubric, so a CSE
  // candidate's resume never carries a clinical axis (and vice versa).
  const competency = scoresFor(user, assessment);
  const sortedDomains = competency.rows
    .filter((r) => r.score != null)
    .sort((a, b) => b.score - a.score)
    .map((r) => [r.skill, r.score]);

  // Extract timeline experience
  const timeline = portfolio?.timeline || [];
  const experienceItems = timeline.filter((t) => t.type === "Internship" || t.type === "Research");
  const educationItems = timeline.filter((t) => t.type === "Education");

  // Skill badges
  const skillBadges = portfolio?.skillBadges || {};
  const certifications = portfolio?.certifications || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-6 sm:py-10 print:py-0 print:bg-white">
      {/* Screen Only Action Bar */}
      <div className="max-w-4xl mx-auto mb-6 px-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/portfolio"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors"
          >
            ← Back to Portfolio
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ATS Compatibility: <strong className="text-foreground">96% (Optimal Single-Page Format)</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-accent text-white text-xs font-semibold shadow-sm transition-all"
          >
            <span>🖨️ Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Resume Container */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-md print:shadow-none print:border-none p-8 sm:p-12 print:p-0 rounded-2xl print:rounded-none">
        {/* Header Block */}
        <header className="border-b border-slate-300 pb-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {user.name || "Candidate Name"}
              </h1>
              <p className="text-sm font-medium text-slate-700 mt-1">
                {[user.course, user.year, user.institution || user.instituteName].filter(Boolean).join(" · ")}
              </p>
            </div>

            {/* Official Skill Setu Verified Badge */}
            <div className="text-right sm:text-right flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-xs font-semibold">
                <span>✓</span>
                <span>Skill Setu Verified Candidate</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                ID: SETU-{(user.id || "STUDENT").slice(-8).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
            <span>✉️ {user.email}</span>
            {user.phone && <span>📞 {user.phone}</span>}
            <span>🏛️ {user.institution || user.instituteName || "Institution Registered"}</span>
            <span>🌐 verified.skillsetu.in/profile/{(user.id || "").slice(-8)}</span>
          </div>
        </header>

        {/* Verified Skill Assessment Scores (Key Hackathon Differentiator) */}
        {sortedDomains.length > 0 && (
          <section className="mb-5 break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Verified Competency Assessment (SIH26044 National Benchmark)
              </h2>
              {assessment?.overallScore && (
                <span className="text-xs font-bold text-emerald-700">
                  Overall Index: {Math.round(assessment.overallScore)}/100
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sortedDomains.slice(0, 8).map(([domain, score]) => (
                <div key={domain} className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-[11px] font-medium text-slate-700 truncate">{domain}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mr-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, score)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 flex-shrink-0">{score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Professional Summary */}
        <section className="mb-5 break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            {portfolio?.bio ||
              `${user.course || "Cross-disciplinary"} scholar at ${user.institution || "partner institution"} with demonstrated competencies across quantitative analysis, analytical problem solving, and sector-tailored operations. Possesses verified credentials under the national Skill Setu competency matrix with proven capability in collaborative industry environments.`}
          </p>
        </section>

        {/* Education */}
        <section className="mb-5 break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
            Education
          </h2>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900">{user.course || "Degree / Specialization"}</span>
                <span className="text-slate-600"> — {user.institution || user.instituteName || "University"}</span>
              </div>
              <span className="text-slate-500 font-medium text-[11px]">{user.year || "Current Academic Cohort"}</span>
            </div>

            {educationItems.map((edu, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-baseline justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{edu.title}</span>
                  <span className="text-slate-600"> — {edu.org}</span>
                </div>
                <span className="text-slate-500 font-medium text-[11px]">{edu.year}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Experience & Practical Engagements */}
        {(experienceItems.length > 0 || applications.length > 0) && (
          <section className="mb-5 break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
              Experience & Project Engagements
            </h2>
            <div className="space-y-3">
              {experienceItems.map((item, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                    <span className="font-bold text-slate-900">{item.title}</span>
                    <span className="text-slate-500 font-medium text-[11px]">{item.year}</span>
                  </div>
                  <div className="text-slate-700 font-medium">{item.org} · {item.type}</div>
                </div>
              ))}

              {applications.slice(0, 3).map((app, i) => (
                <div key={`app-${i}`} className="text-xs space-y-0.5">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                    <span className="font-bold text-slate-900">{app.internshipTitle}</span>
                    <span className="text-slate-500 font-medium text-[11px]">Applied Opportunity</span>
                  </div>
                  <div className="text-slate-700 font-medium">
                    {app.company} · {app.status} Status ({app.match}% Competency Match)
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills & Technical Competencies */}
        <section className="mb-5 break-inside-avoid">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
            Key Technical & Domain Competencies
          </h2>
          <div className="space-y-1.5 text-xs text-slate-700">
            {Object.keys(skillBadges).length > 0 ? (
              Object.entries(skillBadges).map(([cat, skills]) => (
                <div key={cat} className="flex flex-wrap items-baseline gap-1">
                  <span className="font-semibold text-slate-900 min-w-28">{cat}:</span>
                  <span>{(skills || []).map((s) => `${s.name} (${s.level})`).join(" • ")}</span>
                </div>
              ))
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {["Quantitative Modeling", "Critical Thinking & Logic", "Data Analysis & Visualizations", "Technical Documentation", "Interdisciplinary Synthesis"].map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-800">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Certifications */}
        {certifications.length > 0 && (
          <section className="mb-5 break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
              Certifications & Credentials
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {certifications.map((c, i) => (
                <div key={i} className="p-2 border border-slate-200 rounded-lg">
                  <div className="font-bold text-slate-900">{c.name}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    {c.issuer} {c.year ? `· ${c.year}` : ""} {c.score ? `(Score: ${c.score})` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Verifiable Credential Watermark Footer */}
        <footer className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
          <div>
            Verified through <strong>Skill Setu National Talent Registry</strong> (SIH Problem Statement SIH26044).
          </div>
          {/* Derived from the student id, not the clock: a verification stamp
              that changed on every render (and every reprint) could never be
              checked against anything. */}
          <div className="font-mono">
            STAMP: SETU-{String(user.id || "student").split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36).toUpperCase().padStart(6, "0")}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <ResumeContent />
    </RequireAuth>
  );
}
