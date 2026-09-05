"use client";

import { useEffect, useState } from "react";
import { findOne, getAssessment, getPortfolio } from "../lib/store";
import { scoresFor } from "../lib/taxonomy";
import { downloadStoredFile, hasFile, openStoredFile } from "../lib/files";
import { Badge, IconTile, Overlay } from "./ui/Kit";

function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Universal Read-Only Student Profile Modal.
 * Can be opened from:
 * - Industry Dashboard (Kanban cards / applicant review)
 * - Industry Offers & Joining table
 * - Institution Student Roster
 * - Talent Pool
 *
 * Strict read-only view: no editing fields, no profile alterations.
 */
export default function StudentProfileModal({ studentId, student: propStudent, application, onClose }) {
  const resolvedId = application?.studentId || propStudent?.id || studentId;
  const [student, setStudent] = useState(() => propStudent || (resolvedId ? findOne("users", (u) => u.id === resolvedId) : null));
  const [assessment, setAssessment] = useState(() => (resolvedId ? getAssessment(resolvedId) : null));
  const [portfolio, setPortfolio] = useState(() => (resolvedId ? getPortfolio(resolvedId) : null));

  useEffect(() => {
    if (resolvedId) {
      const u = propStudent || findOne("users", (user) => user.id === resolvedId);
      setStudent(u);
      setAssessment(getAssessment(resolvedId));
      setPortfolio(getPortfolio(resolvedId));
    }
  }, [resolvedId, propStudent]);

  const name = student?.name || application?.studentName || "Student Profile";
  const course = student?.course || application?.studentCourse || "Undergraduate";
  const institution = student?.institution || application?.studentInstitution || student?.instituteName || "University Student";
  const department = student?.department || "Academic Department";
  const rollNo = student?.rollNo || "—";
  const year = student?.year || application?.studentYear || "";
  const batch = student?.batch || "";
  const resumeDoc = portfolio?.documents?.find((d) => (d.type === "Resume" || d.fileName?.endsWith(".pdf")) && hasFile(d)) || null;

  /* Categories come from this student's own department/course rubric and the
     tests they have actually sat — never a fixed list applied to everybody. */
  const competency = scoresFor(student || { course, department }, assessment);

  /* The student's own privacy switches, enforced here and in the Convex query
     that serves the underlying portfolio. */
  const showContact = student?.showContactToRecruiters !== false;
  const showScores = student?.showScoresToRecruiters !== false;

  return (
    /* Opened from roster rows and talent-pool cards that lift on hover — the
       portal in Overlay keeps this out of their transformed subtree. */
    <Overlay onClose={onClose}>
      <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-slide max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border bg-card flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-[0_1px_2px_rgba(25,25,26,0.06)]">
              {student?.avatarDataUrl ? (
                <img src={student.avatarDataUrl} alt={name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                initials(name)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground truncate">{name}</h2>
                <Badge tone="green">Verified Student</Badge>
                {student?.openToOpportunities && <Badge tone="primary">Open to Offers</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {course} {year ? `· ${year}` : ""} {batch ? `(Batch ${batch})` : ""} · Roll No: {rollNo}
              </p>
              <p className="text-xs text-primary font-medium truncate mt-0.5">{institution}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none p-1 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Contact & Meta */}
          <div className="grid sm:grid-cols-3 gap-3 bg-secondary/40 rounded-xl p-3.5 border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Email</span>
              <span className="font-medium text-foreground truncate block">{showContact ? student?.email || "—" : "Hidden by the student"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Phone</span>
              <span className="font-medium text-foreground truncate block">{showContact ? student?.phone || "Not provided" : "Hidden by the student"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Department</span>
              <span className="font-medium text-foreground truncate block">{department}</span>
            </div>
          </div>

          {/* Bio */}
          {portfolio?.bio && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Professional Summary</h4>
              <p className="text-sm text-foreground leading-relaxed bg-background border border-border rounded-xl p-3.5">
                {portfolio.bio}
              </p>
            </div>
          )}

          {/* Interests — the student's own words, not a preset list */}
          {student?.interests?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {student.interests.map((interest) => (
                  <span key={interest} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium border border-primary/20">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skill Assessment & Domain Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill Assessment & Readiness</h4>
              {assessment && showScores && (
                <Badge tone="primary">Overall {Math.round(assessment.overallScore || 0)} / 100</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              {competency.taxonomy.label} — the rubric for this student&apos;s course
              {assessment ? ` · ${competency.assessed} of ${competency.total} areas assessed` : ""}
            </p>

            {assessment && !showScores ? (
              <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3 border border-border">
                This student keeps their test scores private. Their skills and projects are below.
              </div>
            ) : assessment ? (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {[...competency.rows, ...competency.extra].map(({ skill, score }) => (
                  <div key={skill} className="bg-background border border-border rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="font-medium text-foreground truncate">{skill}</span>
                      <span className={`font-bold flex-shrink-0 ${score == null ? "text-muted-foreground" : "text-primary"}`}>
                        {score == null ? "—" : `${Math.round(score)}%`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          score == null ? "bg-transparent" : score >= 80 ? "bg-primary" : score >= 60 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, score || 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3 border border-border">
                This student hasn&apos;t sat a skill test yet, so there is nothing to report here.
              </div>
            )}
          </div>

          {/* Skills & Badges */}
          {portfolio?.skillBadges && Object.keys(portfolio.skillBadges).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Skills & Competencies</h4>
              <div className="space-y-3">
                {Object.entries(portfolio.skillBadges).map(([category, skills]) => (
                  <div key={category} className="bg-background border border-border rounded-xl p-3">
                    <div className="text-[11px] font-semibold text-muted-foreground mb-2">{category}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <span key={s.name} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium border border-primary/20">
                          {s.name} <span className="opacity-70 text-[10px]">· {s.level}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {portfolio?.certifications && portfolio.certifications.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Verified Certifications</h4>
              <div className="space-y-2">
                {portfolio.certifications.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs">
                    <IconTile icon="🎓" tone="blue" size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{c.name}</div>
                      <div className="text-muted-foreground">{c.issuer} · Issued {c.year}</div>
                    </div>
                    {c.score && <Badge tone="primary">{c.score}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Career & Academic Timeline */}
          {portfolio?.timeline && portfolio.timeline.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Education & Experience</h4>
              <div className="space-y-2 border-l-2 border-primary/30 ml-2 pl-4 py-1">
                {portfolio.timeline.map((t, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                    <div className="text-xs font-semibold text-foreground">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground">{t.org} · {t.year} {t.type ? `(${t.type})` : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume / Document */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Verified Resume & Documents</h4>
            {resumeDoc ? (
              <div className="flex items-center justify-between gap-3 bg-background border border-border rounded-xl p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <IconTile icon="📄" size={34} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{resumeDoc.fileName || resumeDoc.name || "Student Resume.pdf"}</div>
                    <div className="text-[10px] text-muted-foreground">PDF Document · Verified on Setu</div>
                  </div>
                </div>
                {/* Both go through lib/files. `href={dataUrl}` with target
                    _blank is refused by the browser, and `href="#"` — which is
                    what a document with no file behind it produced — navigated
                    to the top of the page and looked like a reload. */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openStoredFile(resumeDoc)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-accent transition-colors"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadStoredFile(resumeDoc)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            ) : (
              /* This used to offer a "Download Profile PDF" button that only
                 popped an alert claiming a file had been generated. Saying so
                 plainly is more use to a recruiter than a button that lies. */
              <div className="flex items-center gap-3 bg-background border border-border rounded-xl p-3.5">
                <IconTile icon="📄" size={34} tone="amber" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">No resume on file</div>
                  <div className="text-[11px] text-muted-foreground">
                    {name.split(" ")[0]} hasn&apos;t uploaded one yet. The profile above is the full record Skill Setu holds.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Read-only Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <span className="text-xs text-muted-foreground">🔒 Read-only view. Student profiles are managed by their respective verified holders.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-muted text-foreground text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Overlay>
  );
}
