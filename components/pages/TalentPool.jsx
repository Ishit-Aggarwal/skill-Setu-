"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import CandidateProfileModal from "../CandidateProfileModal";
import { listUsersByRole, getAssessment, getPortfolio } from "../../lib/store";

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Lets recruiters search the WHOLE student pool, not just people who already
 * applied to one of their postings — the gap every applicant-only pipeline
 * has (Naukri's Resdex / LinkedIn Recruiter solve exactly this on the general
 * job market). A student only shows up here if they've opted in via the
 * "Open to opportunities" toggle on their own dashboard.
 */
export default function TalentPool() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [institution, setInstitution] = useState("All");
  const [sortBy, setSortBy] = useState("score");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const all = listUsersByRole("student").filter((s) => s.openToOpportunities !== false);
    const enriched = all.map((s) => {
      const assessment = getAssessment(s.id);
      const portfolio = getPortfolio(s.id);
      return {
        ...s,
        score: assessment ? Math.round(assessment.overallScore) : null,
        topSkills: Object.values(portfolio?.skillBadges || {}).flat().slice(0, 4).map((sk) => sk.name),
      };
    });
    setStudents(enriched);
  }, []);

  const institutions = useMemo(() => ["All", ...new Set(students.map((s) => s.institution).filter(Boolean))], [students]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students
      .filter((s) => {
        const matchesSearch =
          !q ||
          s.name?.toLowerCase().includes(q) ||
          s.course?.toLowerCase().includes(q) ||
          s.topSkills.some((sk) => sk.toLowerCase().includes(q));
        const matchesInstitution = institution === "All" || s.institution === institution;
        return matchesSearch && matchesInstitution;
      })
      .sort((a, b) => (sortBy === "score" ? (b.score || 0) - (a.score || 0) : (a.name || "").localeCompare(b.name || "")));
  }, [students, search, institution, sortBy]);

  return (
    <DashboardLayout activePage="talent-pool" title="Talent Pool">
      <div className="animate-fade-slide space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Talent Pool</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} student{filtered.length === 1 ? "" : "s"} open to opportunities</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, course, or skill..."
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select value={institution} onChange={(e) => setInstitution(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            {institutions.map((i) => <option key={i}>{i}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="score">Sort: Skill Score</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-medium text-foreground mb-1">No students match yet</div>
            <div className="text-sm">Try a different search, or check back as more students opt in.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <button key={s.id} onClick={() => setSelected(s)} className="text-left bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">{initials(s.name)}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.course || "—"} {s.year ? `· ${s.year}` : ""}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate mb-2">{s.institution}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.topSkills.map((sk) => <span key={sk} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{sk}</span>)}
                  {s.topSkills.length === 0 && <span className="text-[10px] text-muted-foreground">No skills listed yet</span>}
                </div>
                <div className="text-xs font-semibold text-primary">{s.score != null ? `${s.score}/100 skill score` : "No assessment yet"}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <CandidateProfileModal
          application={{ studentId: selected.id, studentName: selected.name, studentCourse: selected.course, studentYear: selected.year, studentInstitution: selected.institution }}
          onClose={() => setSelected(null)}
        />
      )}
    </DashboardLayout>
  );
}
