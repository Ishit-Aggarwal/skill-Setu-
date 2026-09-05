"use client";

import { useEffect, useState } from "react";
import { findOne, getAssessment, getPortfolio, listRecruiters, updateApplicationRecruiterFields, updateApplicationStatus, PIPELINE_STAGES } from "../lib/store";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/match";
import { hasFile, openStoredFile } from "../lib/files";
import { scoresFor } from "../lib/taxonomy";
import { Avatar, Badge, IconTile, Overlay } from "./ui/Kit";

/**
 * Read-only candidate profile for a recruiter — opened either from an
 * applicant pipeline card (a real `application`, with an id) or from Talent
 * Pool search (a plain student record with no application behind it yet).
 * Everything about the STUDENT (bio, skills, certifications, timeline,
 * documents, contact info, test scores) is display-only — a company can never
 * edit it. The interview-mode/notes editor only appears when there's a real
 * application record to attach it to.
 */
const STRENGTH_OPTIONS = [
  "Strong problem solving",
  "Solid domain fundamentals",
  "Good project portfolio",
  "Clear communication",
  "Quick learner",
  "Relevant coursework",
];

const IMPROVEMENT_OPTIONS = [
  "Deepen domain knowledge",
  "Build more deployed projects",
  "Practice algorithmic problem solving",
  "Strengthen technical communication",
  "Gain hands-on tool experience",
];

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
  const [stage, setStage] = useState(application.status || "Applied");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [showFeedback, setShowFeedback] = useState(Boolean(application.feedback));
  const [feedbackRating, setFeedbackRating] = useState(application.feedback?.rating || 4);
  const [feedbackStrengths, setFeedbackStrengths] = useState(application.feedback?.strengths || []);
  const [feedbackImprovements, setFeedbackImprovements] = useState(application.feedback?.improvements || []);
  const [feedbackSummary, setFeedbackSummary] = useState(application.feedback?.summary || "");

  const stageIndex = PIPELINE_STAGES.indexOf(stage);

  /** Writes the stage change, then hands the updated record back to the caller. */
  function setStage_(next, extra) {
    const updated = updateApplicationStatus(application.id, next, extra);
    setStage(next);
    onUpdated?.(updated);
  }

  const student = findOne("users", (u) => u.id === application.studentId);
  const assessment = getAssessment(application.studentId);
  const portfolio = getPortfolio(application.studentId);
  const resumeDoc = portfolio?.documents?.find((d) => d.type === "Resume" && hasFile(d)) || null;

  /* The categories shown are this candidate's own rubric, derived from their
     department and course — not a fixed list applied to every student. A CSE
     candidate is never shown clinical axes, and a nursing candidate is never shown
     programming ones. */
  const competency = scoresFor(
    student || {
      department: application.studentDepartment,
      course: application.studentCourse,
    },
    assessment
  );

  const showContact = student?.showContactToRecruiters !== false;
  const showScores = student?.showScoresToRecruiters !== false;

  useEffect(() => {
    setInterviewMode(application.interviewMode || "");
    setInterviewAt(application.interviewAt || "");
    setNotes(application.recruiterNotes || "");
    setStage(application.status || "Applied");
    setRejecting(false);
    setRejectReason("");
  }, [application.id]);

  function save() {
    const feedbackPayload =
      showFeedback || feedbackSummary.trim() || feedbackStrengths.length || feedbackImprovements.length
        ? {
            rating: Number(feedbackRating) || 4,
            strengths: feedbackStrengths,
            improvements: feedbackImprovements,
            summary: feedbackSummary.trim(),
            providedAt: new Date().toISOString(),
          }
        : undefined;

    updateApplicationRecruiterFields(application.id, {
      interviewMode,
      interviewAt,
      recruiterNotes: notes,
      ...(feedbackPayload ? { feedback: feedbackPayload } : {}),
    });
    setSaved(true);
    onUpdated?.();
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    /* Opened from an applicant card that lifts on hover; without the portal in
       Overlay the transform on that card would re-anchor this fixed overlay. */
    <Overlay onClose={onClose}>
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

          {/* The student's own privacy switches decide this. The same rule is
              enforced in the Convex query that serves a portfolio, so hiding it
              here is the visible half of a real control, not the whole of it. */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</div>
            {showContact ? (
              <div className="text-sm text-foreground space-y-1">
                <div>{student?.email || "Email not available"}</div>
                {student?.phone && <div>{student.phone}</div>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This candidate has chosen not to share contact details. Reach them by moving their application forward —
                they&apos;ll be notified.
              </p>
            )}
          </div>

          {portfolio?.bio && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{portfolio.bio}</p>
            </div>
          )}

          {/* What they said they're interested in, in their own words — the
              part of a candidate a score can't tell you. */}
          {student?.interests?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Interests</div>
              <div className="flex flex-wrap gap-1.5">
                {student.interests.map((interest) => (
                  <Badge key={interest} tone="primary">{interest}</Badge>
                ))}
              </div>
            </div>
          )}

          {assessment && !showScores && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skill Assessment</div>
              <p className="text-sm text-muted-foreground">
                This candidate keeps their test scores private. Their skills, projects and certifications are below.
              </p>
            </div>
          )}

          {assessment && showScores && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skill Assessment</div>
              <div className="flex items-center gap-3 mb-1.5">
                <IconTile icon="📊" size={34} />
                <div>
                  <span className="text-lg font-bold text-foreground">{Math.round(assessment.overallScore)}</span>
                  <span className="text-xs text-muted-foreground"> / 100 overall</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2.5">
                {competency.taxonomy.label} · {competency.assessed} of {competency.total} areas assessed
              </p>
              <div className="flex flex-wrap gap-1.5">
                {competency.rows.map(({ skill, score }) => (
                  <Badge key={skill} tone={score == null ? "muted" : "neutral"}>
                    {skill}: {score == null ? "not assessed" : Math.round(score)}
                  </Badge>
                ))}
                {competency.extra.map(({ skill, score }) => (
                  <Badge key={skill} tone="blue" title="Assessed outside this candidate's own rubric">
                    {skill}: {Math.round(score)}
                  </Badge>
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
            {/* Opened through lib/files rather than an <a href={dataUrl}>: the
                browser refuses top-level navigation to a data: URL, which is
                why this link used to look like it reloaded the page. And a
                document row with no file behind it is not a resume — saying so
                beats rendering a link that cannot open. */}
            {resumeDoc ? (
              <button
                type="button"
                onClick={() => openStoredFile(resumeDoc)}
                className="text-sm text-primary hover:underline font-medium text-left"
              >
                View resume ({resumeDoc.fileName || resumeDoc.name || "PDF"})
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">No resume uploaded by this candidate yet.</p>
            )}
          </div>

          {hasApplication && (
          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-3">
              <IconTile icon="🔒" size={24} />
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">Recruiter-only</div>
            </div>

            {/* Stage controls live here as well as on the pipeline card, so a
                recruiter who opens a profile to make the call can act on it
                without closing the modal first — including saying no. */}
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Pipeline stage</label>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge tone={stage === "Rejected" ? "red" : "primary"} dot>{stage}</Badge>
              {application.rejectionReason && (
                <span className="text-[11px] text-red-700">Reason: {application.rejectionReason}</span>
              )}
            </div>

            {stage === "Rejected" ? (
              <button
                onClick={() => setStage_("Applied")}
                className="w-full py-2 rounded-xl bg-secondary hover:bg-muted text-sm font-medium text-foreground transition-colors mb-4"
              >
                Restore to Applied
              </button>
            ) : (
              <div className="flex gap-2 mb-4 flex-wrap">
                {stageIndex > 0 && (
                  <button
                    onClick={() => setStage_(PIPELINE_STAGES[stageIndex - 1])}
                    className="flex-1 min-w-[7rem] py-2 rounded-xl bg-secondary hover:bg-muted text-sm font-medium text-foreground transition-colors"
                  >
                    ← Move back
                  </button>
                )}
                {stageIndex < PIPELINE_STAGES.length - 1 && (
                  <button
                    onClick={() => setStage_(PIPELINE_STAGES[stageIndex + 1])}
                    className="flex-1 min-w-[7rem] py-2 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-colors"
                  >
                    Advance to {PIPELINE_STAGES[stageIndex + 1]}
                  </button>
                )}
                <button
                  onClick={() => setRejecting(true)}
                  className="flex-1 min-w-[7rem] py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                >
                  Reject
                </button>
              </div>
            )}

            {rejecting && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50/60 p-3 space-y-2">
                <label className="block text-xs font-semibold text-red-700 uppercase tracking-wider">Reason (optional)</label>
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Shared with the candidate so they know where they stand"
                  className="w-full bg-card border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRejecting(false); setRejectReason(""); }}
                    className="flex-1 py-2 rounded-xl bg-card border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setStage_("Rejected", rejectReason.trim() ? { rejectionReason: rejectReason.trim() } : undefined);
                      setRejecting(false);
                      setRejectReason("");
                    }}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                  >
                    Confirm rejection
                  </button>
                </div>
              </div>
            )}

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

            {/* Structured Feedback (Visible to Candidate) */}
            <div className="rounded-xl border border-border bg-secondary/30 p-3.5 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wider">Candidate Feedback</div>
                  <div className="text-[11px] text-muted-foreground">Constructive feedback shared with the student.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFeedback((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {showFeedback ? "Collapse" : "Provide Feedback"}
                </button>
              </div>

              {showFeedback && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Rating (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFeedbackRating(r)}
                          className={`w-9 h-9 rounded-lg text-xs font-semibold flex items-center justify-center border transition-all ${
                            feedbackRating === r
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-background border-border text-foreground hover:border-primary/40"
                          }`}
                        >
                          {r}★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Key Strengths</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STRENGTH_OPTIONS.map((strength) => {
                        const active = feedbackStrengths.includes(strength);
                        return (
                          <button
                            key={strength}
                            type="button"
                            onClick={() =>
                              setFeedbackStrengths((prev) =>
                                active ? prev.filter((s) => s !== strength) : [...prev, strength]
                              )
                            }
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              active
                                ? "bg-primary/10 border-primary text-primary font-medium"
                                : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {strength}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Areas for Growth / Improvement</label>
                    <div className="flex flex-wrap gap-1.5">
                      {IMPROVEMENT_OPTIONS.map((improvement) => {
                        const active = feedbackImprovements.includes(improvement);
                        return (
                          <button
                            key={improvement}
                            type="button"
                            onClick={() =>
                              setFeedbackImprovements((prev) =>
                                active ? prev.filter((i) => i !== improvement) : [...prev, improvement]
                              )
                            }
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              active
                                ? "bg-amber-500/10 border-amber-500 text-amber-700 font-medium dark:text-amber-400"
                                : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border"
                            }`}
                          >
                            {active ? "✓ " : "+ "}
                            {improvement}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Constructive Advice & Summary</label>
                    <textarea
                      value={feedbackSummary}
                      onChange={(e) => setFeedbackSummary(e.target.value)}
                      rows={2}
                      placeholder="e.g. Great communication during the round, recommend practicing system design problems."
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

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
    </Overlay>
  );
}
