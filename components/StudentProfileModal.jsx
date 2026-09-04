"use client";

import { useEffect, useState } from "react";
import { findOne, getAssessment, getPortfolio } from "../lib/store";
import { Badge, IconTile } from "./ui/Kit";

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
  const resumeDoc = portfolio?.documents?.find((d) => d.type === "Resume" || d.fileName?.endsWith(".pdf"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
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
              <span className="font-medium text-foreground truncate block">{student?.email || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Phone</span>
              <span className="font-medium text-foreground truncate block">{student?.phone || "+91 98•••• ••••"}</span>
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

          {/* Skill Assessment & Domain Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill Assessment & Readiness</h4>
              {assessment && (
                <Badge tone="primary">Overall {Math.round(assessment.overallScore || 0)} / 100</Badge>
              )}
            </div>

            {assessment ? (
              <div className="grid sm:grid-cols-2 gap-2.5">
                {Object.entries(assessment.domainScores || {}).map(([domain, score]) => (
                  <div key={domain} className="bg-background border border-border rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-foreground truncate pr-2">{domain}</span>
                      <span className="font-bold text-primary">{Math.round(score)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          score >= 80 ? "bg-primary" : score >= 60 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3 border border-border">
                Standardized employability assessments pending.
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
                <a
                  href={resumeDoc.dataUrl || "#"}
                  download={resumeDoc.fileName || "Resume.pdf"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-accent transition-colors flex-shrink-0"
                >
                  Download PDF
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 bg-background border border-border rounded-xl p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <IconTile icon="📄" size={34} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{name.replace(/\s+/g, "_")}_Resume.pdf</div>
                    <div className="text-[10px] text-muted-foreground">Generated Institutional Portfolio PDF</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert("Institutional resume generated and downloaded.")}
                  className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors flex-shrink-0"
                >
                  Download Profile PDF
                </button>
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
    </div>
  );
}
