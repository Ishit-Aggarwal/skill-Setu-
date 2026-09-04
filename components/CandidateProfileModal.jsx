"use client";

import { useEffect, useState } from "react";
import { findOne, getAssessment, getPortfolio, listRecruiters, updateApplicationRecruiterFields } from "../lib/store";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/match";
import { Avatar, Badge, IconTile } from "./ui/Kit";

/**
 * Read-only candidate profile for a recruiter — opened either from an
 * applicant pipeline card (a real `application`, with an id) or from Talent
 * Pool search (a plain student record with no application behind it yet).
 * Everything about the STUDENT (bio, skills, certifications, timeline,
 * documents, contact info, test scores) is display-only — a company can never
 * edit it. The interview-mode/notes editor only appears when there's a real
 * application record to attach it to.
 */
export default function CandidateProfileModal({ application, onClose, onUpdated }) {
  const { user } = useAuth();
  const hasApplication = Boolean(application.id);

  // Team members can be excluded from other recruiters' private notes, so a
  // colleague's written assessment doesn't bias an independent review.
  const myRecruiterRecord = user
    ? listRecruiters(user.id).find((r) => r.email === user.email) || null
    : null;
  const canSeeNotes = !myRecruiterRecord || myRecruiterRecord.notesVisible !== false;
  const [interviewMode, setInterviewMode] = useState(application.interviewMode || "");
  const [interviewAt, setInterviewAt] = useState(application.interviewAt || "");
  const [notes, setNotes] = useState(application.recruiterNotes || "");
  const [saved, setSaved] = useState(false);

  const student = findOne("users", (u) => u.id === application.studentId);
  const assessment = getAssessment(application.studentId);
  const portfolio = getPortfolio(application.studentId);
  const resumeDoc = portfolio?.documents?.find((d) => d.type === "Resume");

  useEffect(() => {
    setInterviewMode(application.interviewMode || "");
    setInterviewAt(application.interviewAt || "");
    setNotes(application.recruiterNotes || "");
  }, [application.id]);

  function save() {
    updateApplicationRecruiterFields(application.id, { interviewMode, interviewAt, recruiterNotes: notes });
    setSaved(true);
    onUpdated?.();
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl animate-fade-slide max-h-[88vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-5 flex items-start justify-between gap-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={application.studentName} size={44} src={student?.avatarDataUrl} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{application.studentName}</div>
              <div className="text-xs text-muted-foreground truncate">
                {application.studentCourse || "—"} {application.studentYear ? `· ${application.studentYear}` : ""}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="neutral">{application.studentInstitution || "Institution unknown"}</Badge>
            {application.match != null && <Badge tone="primary">{application.match}% match</Badge>}
            {hasApplication && <Badge tone="neutral">Applied {formatDate(application.appliedAt)}</Badge>}
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</div>
            <div className="text-sm text-foreground space-y-1">
              <div>{student?.email || "Email not available"}</div>
              {student?.phone && <div>{student.phone}</div>}
            </div>
          </div>

          {portfolio?.bio && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{portfolio.bio}</p>
            </div>
          )}

          {assessment && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skill Assessment</div>
              <div className="flex items-center gap-3 mb-2.5">
                <IconTile icon="📊" size={34} />
                <div>
                  <span className="text-lg font-bold text-foreground">{Math.round(assessment.overallScore)}</span>
                  <span className="text-xs text-muted-foreground"> / 100 overall</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(assessment.domainScores || {}).map(([domain, score]) => (
                  <Badge key={domain} tone="neutral">{domain}: {Math.round(score)}</Badge>
                ))}
              </div>
            </div>
          )}

          {portfolio?.skillBadges && Object.keys(portfolio.skillBadges).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</div>
              <div className="space-y-2.5">
                {Object.entries(portfolio.skillBadges).map(([category, skills]) => (
                  <div key={category}>
                    <div className="text-[10px] text-muted-foreground mb-1.5">{category}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <Badge key={s.name} tone="primary">{s.name} · {s.level}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {portfolio?.certifications?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certifications</div>
              <div className="space-y-1.5">
                {portfolio.certifications.map((c, i) => (
                  <div key={i} className="text-sm text-foreground">{c.name} <span className="text-xs text-muted-foreground">— {c.issuer} ({c.year})</span></div>
                ))}
              </div>
            </div>
          )}

          {portfolio?.timeline?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Career Timeline</div>
              <div className="space-y-1.5">
                {portfolio.timeline.map((t, i) => (
                  <div key={i} className="text-sm text-foreground">{t.year} — {t.title} <span className="text-xs text-muted-foreground">({t.org})</span></div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resume / Documents</div>
            {resumeDoc ? (
              <a href={resumeDoc.dataUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline font-medium">View résumé ({resumeDoc.fileName})</a>
            ) : (
              <p className="text-sm text-muted-foreground">No résumé uploaded by this candidate yet.</p>
            )}
          </div>

          {hasApplication && (
          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-3">
              <IconTile icon="🔒" size={24} />
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">Recruiter-only</div>
            </div>

            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Interview Mode</label>
            <div className="flex gap-2 mb-4">
              {["Physical", "Online"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInterviewMode(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${interviewMode === m ? "bg-primary text-white border-transparent" : "bg-background border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Interview Date & Time</label>
            <input
              type="datetime-local"
              value={interviewAt}
              onChange={(e) => setInterviewAt(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Private Notes</label>
            {canSeeNotes ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Only visible to your company — not the candidate."
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            ) : (
              <p className="text-xs text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2.5">
                Private notes are hidden for your access level, so your assessment stays independent. An account owner can change this on the Hiring Team page.
              </p>
            )}
            <button onClick={save} className="mt-2 w-full py-2.5 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-all duration-150">
              {saved ? "Saved ✓" : "Save"}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
