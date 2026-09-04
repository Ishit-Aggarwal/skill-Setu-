"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import CandidateProfileModal from "../CandidateProfileModal";
import { useAuth } from "../../lib/auth";
import { Avatar, Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, ProgressBar, SearchInput, Section, Select, StatGrid, TextInput, useFlash } from "../ui/Kit";
import { DEPARTMENTS } from "../../lib/domains";
import { SKILL_DOMAINS } from "../../lib/questionBank";
import { downloadFile, getAssessment, getPortfolio, insert, listUsersByRole, placementStatusFor, remove, findMany, toCsv } from "../../lib/store";

const DEFAULT_FILTERS = {
  search: "",
  institution: "All",
  department: "All",
  domain: "All",
  minScore: 0,
  availability: "All",
  sortBy: "score",
};

/**
 * Proactive candidate discovery, separate from the applicants to any one
 * posting — the gap every applicant-only pipeline has. Students appear only if
 * they've opted in via the "Open to opportunities" toggle on their dashboard.
 */
export default function TalentPool() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [showSave, setShowSave] = useState(false);
  const [flash, setFlash] = useFlash();

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const pool = listUsersByRole("student").filter((s) => s.openToOpportunities !== false);
    setStudents(
      pool.map((s) => {
        const assessment = getAssessment(s.id);
        const portfolio = getPortfolio(s.id);
        return {
          ...s,
          score: assessment ? Math.round(assessment.overallScore) : null,
          domainScores: assessment?.domainScores || {},
          topSkills: Object.values(portfolio?.skillBadges || {}).flat().slice(0, 4).map((sk) => sk.name),
          status: placementStatusFor(s.id),
        };
      })
    );
    setReady(true);
  }, []);

  const savedSearches = useMemo(
    () => (ready && user ? findMany("savedSearches", (s) => s.ownerId === user.id) : []),
    [ready, user, version]
  );

  const institutions = useMemo(() => ["All", ...[...new Set(students.map((s) => s.institution).filter(Boolean))].sort()], [students]);
  const departments = useMemo(() => ["All", ...[...new Set(students.map((s) => s.department).filter(Boolean))].sort()], [students]);
  const locations = useMemo(() => [...new Set(students.map((s) => s.location).filter(Boolean))], [students]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return students
      .filter((s) => {
        const matchesSearch =
          !q ||
          s.name?.toLowerCase().includes(q) ||
          s.course?.toLowerCase().includes(q) ||
          s.institution?.toLowerCase().includes(q) ||
          s.topSkills.some((sk) => sk.toLowerCase().includes(q));
        const domainScore = filters.domain === "All" ? s.score : s.domainScores?.[filters.domain] ?? null;
        return (
          matchesSearch &&
          (filters.institution === "All" || s.institution === filters.institution) &&
          (filters.department === "All" || s.department === filters.department) &&
          (filters.availability === "All" || s.status === filters.availability) &&
          (filters.minScore === 0 || (domainScore != null && domainScore >= filters.minScore))
        );
      })
      .sort((a, b) => {
        if (filters.sortBy === "name") return (a.name || "").localeCompare(b.name || "");
        if (filters.sortBy === "domain" && filters.domain !== "All") {
          return (b.domainScores?.[filters.domain] ?? -1) - (a.domainScores?.[filters.domain] ?? -1);
        }
        return (b.score || 0) - (a.score || 0);
      });
  }, [students, filters]);

  function exportShortlist() {
    if (!filtered.length) return setFlash("Nothing to export with these filters.");
    downloadFile(
      `talent-pool-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(filtered, [
        { label: "Name", value: (s) => s.name },
        { label: "Email", value: (s) => s.email },
        { label: "Institution", value: (s) => s.institution },
        { label: "Department", value: (s) => s.department },
        { label: "Course", value: (s) => s.course },
        { label: "Year", value: (s) => s.year },
        { label: "Skill score", value: (s) => s.score ?? "" },
        { label: "Top skills", value: (s) => s.topSkills.join("; ") },
        { label: "Availability", value: (s) => s.status },
      ])
    );
    setFlash(`Exported ${filtered.length} candidate${filtered.length === 1 ? "" : "s"}.`);
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== DEFAULT_FILTERS[k] && k !== "sortBy"
  ).length;

  return (
    <DashboardLayout activePage="talent-pool" title="Talent Pool">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Talent Pool"
          subtitle="Search every student who has opted in — not just those who applied to your postings."
          actions={
            <>
              <Button size="sm" variant="outline" onClick={exportShortlist}>Export ({filtered.length})</Button>
              <Button size="sm" onClick={() => setShowSave(true)}>Save this search</Button>
            </>
          }
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Open to opportunities", value: String(students.length), icon: "🟢" },
            { label: "Matching your filters", value: String(filtered.length), icon: "🎯", hint: activeFilterCount ? `${activeFilterCount} filter(s) active` : "No filters" },
            { label: "Institutions represented", value: String(institutions.length - 1), icon: "🏛" },
            { label: "Not yet placed", value: String(filtered.filter((s) => s.status !== "Placed").length), icon: "✨" },
          ]}
        />

        {savedSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Saved searches:</span>
            {savedSearches.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 bg-secondary rounded-full pl-3 pr-2 py-1.5 text-xs">
                <button onClick={() => setFilters({ ...DEFAULT_FILTERS, ...s.filters })} className="text-foreground hover:text-primary font-medium">
                  {s.name}
                </button>
                <button
                  onClick={() => { remove("savedSearches", s.id); setVersion((v) => v + 1); }}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label={`Delete ${s.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <SearchInput value={filters.search} onChange={(v) => set("search", v)} placeholder="Search by name, course, institution or skill…" className="flex-1 min-w-[220px]" />
            <Select value={filters.sortBy} onChange={(e) => set("sortBy", e.target.value)} className="w-auto">
              <option value="score">Sort: Overall score</option>
              {filters.domain !== "All" && <option value="domain">Sort: {filters.domain}</option>}
              <option value="name">Sort: Name</option>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Field label="Institution">
              <Select value={filters.institution} onChange={(e) => set("institution", e.target.value)}>
                {institutions.map((i) => <option key={i}>{i}</option>)}
              </Select>
            </Field>
            <Field label="Department">
              <Select value={filters.department} onChange={(e) => set("department", e.target.value)}>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Skill domain" hint="Scores the filter against this domain.">
              <Select value={filters.domain} onChange={(e) => set("domain", e.target.value)}>
                <option>All</option>
                {SKILL_DOMAINS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label={`Minimum score: ${filters.minScore || "any"}`}>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={filters.minScore}
                onChange={(e) => set("minScore", Number(e.target.value))}
                className="w-full accent-primary mt-3"
              />
            </Field>
            <Field label="Availability">
              <Select value={filters.availability} onChange={(e) => set("availability", e.target.value)}>
                {["All", "Unplaced", "Applied", "In Process", "Placed"].map((a) => <option key={a}>{a}</option>)}
              </Select>
            </Field>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-muted-foreground hover:text-foreground">
              Clear all filters
            </button>
          )}
        </Card>

        {filtered.length === 0 ? (
          <EmptyState icon="🔍" title="No students match yet">
            Try a different search, widen the score threshold, or check back as more students opt in.
          </EmptyState>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const shownScore = filters.domain === "All" ? s.score : s.domainScores?.[filters.domain] ?? null;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="text-left bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={s.name} size={40} src={s.avatarDataUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.course || "—"}{s.year ? ` · ${s.year}` : ""}</div>
                    </div>
                    <Badge tone={s.status === "Placed" ? "green" : s.status === "Unplaced" ? "primary" : "amber"}>{s.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mb-1">{s.institution}</div>
                  {s.department && <div className="text-[10px] text-muted-foreground truncate mb-2">{s.department}</div>}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {s.topSkills.map((sk) => <span key={sk} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{sk}</span>)}
                    {s.topSkills.length === 0 && <span className="text-[10px] text-muted-foreground">No skills listed yet</span>}
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{filters.domain === "All" ? "Overall skill score" : filters.domain}</span>
                    <span className="font-semibold text-primary">{shownScore != null ? `${shownScore}/100` : "—"}</span>
                  </div>
                  {shownScore != null && <ProgressBar value={shownScore} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <CandidateProfileModal
          application={{
            studentId: selected.id,
            studentName: selected.name,
            studentCourse: selected.course,
            studentYear: selected.year,
            studentInstitution: selected.institution,
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {showSave && (
        <Modal title="Save this search" description="Reuse the current filters in one click next time." onClose={() => setShowSave(false)}>
          <SaveSearchForm
            defaultName={
              [filters.department !== "All" && filters.department, filters.domain !== "All" && filters.domain, filters.minScore ? `${filters.minScore}+` : null]
                .filter(Boolean)
                .join(" · ") || "My search"
            }
            onCancel={() => setShowSave(false)}
            onSubmit={(name) => {
              insert("savedSearches", { ownerId: user.id, name, filters, savedAt: new Date().toISOString() });
              setShowSave(false);
              setVersion((v) => v + 1);
              setFlash(`Saved "${name}".`);
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function SaveSearchForm({ defaultName, onCancel, onSubmit }) {
  const [name, setName] = useState(defaultName);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(name.trim() || defaultName); }} className="space-y-4">
      <Field label="Name this search"><TextInput required value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Save search</Button>
      </div>
    </form>
  );
}
