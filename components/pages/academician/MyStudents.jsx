"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Flash,
  IconTile,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  Section,
  Select,
  StatGrid,
  Tabs,
  TextArea,
  useFlash,
} from "../../ui/Kit";
import { SKILL_DOMAINS } from "../../../lib/questionBank";
import { formatDate, relativeTime } from "../../../lib/match";
import {
  addAdvisee,
  downloadFile,
  getPortfolio,
  listApplicationsForStudent,
  listInternships,
  recommendPostingToStudent,
  removeAdvisee,
  saveMentorNote,
  toCsv,
} from "../../../lib/store";
import { FLAGS, FLAG_TONE, PLACEMENT_TONE, STUDENT_EXPORT_COLUMNS, buildFacultyStudents } from "./useFaculty";

const SCORE_RANGES = [
  { key: "All", label: "All scores", test: () => true },
  { key: "80+", label: "80 and above", test: (s) => s.score != null && s.score >= 80 },
  { key: "60-79", label: "60 – 79", test: (s) => s.score != null && s.score >= 60 && s.score < 80 },
  { key: "<60", label: "Below 60", test: (s) => s.score != null && s.score < 60 },
  { key: "none", label: "Not assessed", test: (s) => s.score == null },
];

/**
 * Cohort management for a faculty member: which students are explicitly theirs
 * to mentor, how each is doing, and the actions a mentor actually takes —
 * private notes, flags, and recommending a live posting to a specific student.
 */
export default function MyStudents() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();

  const [scope, setScope] = useState("advisees");
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState("All");
  const [section, setSection] = useState("All");
  const [domain, setDomain] = useState("All");
  const [range, setRange] = useState("All");
  const [sort, setSort] = useState("name");
  const [profileOf, setProfileOf] = useState(null);
  const [recommendTo, setRecommendTo] = useState(null);

  useEffect(() => setReady(true), []);

  const students = useMemo(() => (ready && user ? buildFacultyStudents(user) : []), [user, ready, version]);
  const postings = useMemo(() => (ready ? listInternships().filter((i) => i.status !== "Closed") : []), [ready]);

  const batches = useMemo(() => ["All", ...[...new Set(students.map((s) => s.batch).filter(Boolean))].sort()], [students]);
  const departments = useMemo(() => ["All", ...[...new Set(students.map((s) => s.department))].sort()], [students]);

  const scoped = useMemo(() => {
    if (scope === "advisees") return students.filter((s) => s.isAdvisee);
    if (scope === "department") return students.filter((s) => s.department === user?.department);
    return students;
  }, [students, scope, user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rangeTest = SCORE_RANGES.find((r) => r.key === range)?.test || (() => true);
    const rows = scoped.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchesDomain = domain === "All" || (s.domainScores?.[domain] ?? null) != null;
      return (
        matchesSearch &&
        matchesDomain &&
        (batch === "All" || s.batch === batch) &&
        (section === "All" || s.department === section) &&
        rangeTest(s)
      );
    });
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
      domain: (a, b) => (b.domainScores?.[domain] ?? -1) - (a.domainScores?.[domain] ?? -1),
      status: (a, b) => a.status.localeCompare(b.status),
      applications: (a, b) => b.applications - a.applications,
    };
    return [...rows].sort(sorters[sort] || sorters.name);
  }, [scoped, search, batch, section, domain, range, sort]);

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  function toggleAdvisee(s) {
    if (s.isAdvisee) {
      removeAdvisee(user.id, s.id);
      bump(`${s.name} removed from your advisee list.`);
    } else {
      addAdvisee(user.id, s.id);
      bump(`${s.name} added as your advisee.`);
    }
  }

  function setFlag(s, flag) {
    saveMentorNote(user.id, s.id, { flag });
    bump(flag ? `${s.name} flagged as "${flag}".` : `Flag cleared for ${s.name}.`);
  }

  function exportRows() {
    if (!filtered.length) return setFlash("Nothing to export with these filters.");
    downloadFile(`my-students-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filtered, STUDENT_EXPORT_COLUMNS));
    setFlash(`Exported ${filtered.length} student record${filtered.length === 1 ? "" : "s"}.`);
  }

  const columns = [
    {
      key: "name",
      header: "Student",
      render: (s) => (
        <button onClick={() => setProfileOf(s)} className="flex items-center gap-2.5 min-w-0 text-left group">
          <Avatar name={s.name} size={32} />
          <div className="min-w-0">
            <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">{s.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{s.rollNo || s.course || s.department}</div>
          </div>
        </button>
      ),
    },
    { key: "batch", header: "Batch", align: "center", hideBelow: "hidden sm:table-cell", render: (s) => <span className="text-xs text-muted-foreground">{s.batch || "—"}</span> },
    {
      key: "score",
      header: domain === "All" ? "Skill score" : domain,
      align: "center",
      render: (s) => {
        const value = domain === "All" ? s.score : s.domainScores?.[domain] ?? null;
        return (
          <div className="flex flex-col items-center min-w-[56px]">
            <span className="text-sm font-semibold text-foreground">{value ?? "—"}</span>
            {value != null && <div className="w-12 mt-1"><ProgressBar value={value} /></div>}
          </div>
        );
      },
    },
    { key: "applications", header: "Apps", align: "center", hideBelow: "hidden md:table-cell", render: (s) => <span className="text-xs text-muted-foreground">{s.applications}</span> },
    {
      key: "flag",
      header: "Flag",
      align: "center",
      hideBelow: "hidden lg:table-cell",
      render: (s) => (
        <Select value={s.flag} onChange={(e) => setFlag(s, e.target.value)} className="w-auto text-xs py-1.5 mx-auto">
          {FLAGS.map((f) => <option key={f || "none"} value={f}>{f || "None"}</option>)}
        </Select>
      ),
    },
    { key: "status", header: "Placement", align: "center", render: (s) => <Badge tone={PLACEMENT_TONE[s.status]}>{s.status}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (s) => (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <button onClick={() => setRecommendTo(s)} className="text-xs text-primary hover:underline">Recommend</button>
          <button onClick={() => toggleAdvisee(s)} className="text-xs text-muted-foreground hover:text-foreground">
            {s.isAdvisee ? "Unassign" : "Assign to me"}
          </button>
        </div>
      ),
    },
  ];

  const adviseeCount = students.filter((s) => s.isAdvisee).length;

  return (
    <DashboardLayout activePage="academician-students" title="My Students">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="My Students"
          subtitle="Students explicitly assigned to you as mentor, plus the wider department cohort you can pull from."
          actions={<Button size="sm" variant="outline" onClick={exportRows}>Export ({filtered.length})</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Mentored advisees", value: String(adviseeCount), icon: "🎓", hint: `${scoped.length} in current view` },
            { label: "Students flagged", value: String(students.filter((s) => Boolean(s.flag)).length), icon: "🚩", hint: `${students.filter((s) => s.flag === "Promising").length} promising` },
            { label: "Private notes saved", value: String(students.filter((s) => Boolean(s.note && s.note.trim())).length), icon: "📝", hint: "Confidential guidance logs" },
            { label: "Department cohort", value: String(students.filter((s) => s.department === user?.department).length), icon: "🏛", hint: user?.department || "Campus-wide" },
          ]}
        />

        <Tabs
          tabs={[
            { key: "advisees", label: `My advisees (${adviseeCount})` },
            { key: "department", label: "My department" },
            { key: "institution", label: "Whole institution" },
          ]}
          value={scope}
          onChange={setScope}
        />

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, roll number or email…" className="flex-1 min-w-[220px]" />
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
              <option value="name">Sort: Name</option>
              <option value="score">Sort: Overall score</option>
              {domain !== "All" && <option value="domain">Sort: {domain}</option>}
              <option value="applications">Sort: Applications</option>
              <option value="status">Sort: Placement status</option>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Batch">
              <Select value={batch} onChange={(e) => setBatch(e.target.value)}>{batches.map((b) => <option key={b}>{b}</option>)}</Select>
            </Field>
            <Field label="Section / department">
              <Select value={section} onChange={(e) => setSection(e.target.value)}>{departments.map((d) => <option key={d}>{d}</option>)}</Select>
            </Field>
            <Field label="Skill domain" hint="Switches the score column to that domain.">
              <Select value={domain} onChange={(e) => setDomain(e.target.value)}>
                <option>All</option>
                {SKILL_DOMAINS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Score range">
              <Select value={range} onChange={(e) => setRange(e.target.value)}>
                {SCORE_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </Select>
            </Field>
          </div>
        </Card>

        {filtered.length === 0 && scope === "advisees" && adviseeCount === 0 ? (
          <EmptyState
            icon="🎓"
            title="No advisees assigned yet"
            action={<Button size="sm" onClick={() => setScope("department")}>Browse my department</Button>}
          >
            Students aren't linked to a faculty member automatically. Open your department cohort and use “Assign to me” to build your advisee list.
          </EmptyState>
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(s) => s.id} empty="No students match these filters." />
        )}
      </div>

      {profileOf && (
        <StudentProfileModal
          faculty={user}
          student={profileOf}
          onClose={() => setProfileOf(null)}
          onSaved={(msg) => { bump(msg); setProfileOf(null); }}
        />
      )}

      {recommendTo && (
        <RecommendModal
          faculty={user}
          student={recommendTo}
          postings={postings}
          onClose={() => setRecommendTo(null)}
          onDone={(msg) => { setRecommendTo(null); bump(msg); }}
        />
      )}
    </DashboardLayout>
  );
}

function StudentProfileModal({ faculty, student, onClose, onSaved }) {
  const [note, setNote] = useState(student.note || "");
  const [flag, setFlag] = useState(student.flag || "");
  const portfolio = useMemo(() => getPortfolio(student.id), [student.id]);
  const applications = useMemo(() => listApplicationsForStudent(student.id), [student.id]);

  function save() {
    saveMentorNote(faculty.id, student.id, { note, flag });
    onSaved(`Notes saved for ${student.name}.`);
  }

  return (
    <Modal title={student.name} description={`${student.course || student.department} · ${student.year || student.batch}`} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-3.5">
          <Avatar name={student.name} size={48} />
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="neutral">{student.department}</Badge>
            {student.rollNo && <Badge tone="neutral">{student.rollNo}</Badge>}
            <Badge tone={PLACEMENT_TONE[student.status]}>{student.status}</Badge>
            {student.isAdvisee && <Badge tone="primary">My advisee</Badge>}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</div>
          <p className="text-sm text-foreground">{student.email || "Email not available"}</p>
        </div>

        {Object.keys(student.domainScores).length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Skill profile — overall {student.score}
            </div>
            <div className="space-y-2">
              {SKILL_DOMAINS.filter((d) => student.domainScores[d] != null).map((d) => (
                <div key={d}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-foreground">{d}</span>
                    <span className="text-muted-foreground">{student.domainScores[d]}</span>
                  </div>
                  <ProgressBar value={student.domainScores[d]} />
                </div>
              ))}
            </div>
          </div>
        )}

        {portfolio?.bio && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{portfolio.bio}</p>
          </div>
        )}

        {portfolio?.certifications?.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Certifications</div>
            <div className="space-y-1">
              {portfolio.certifications.map((c, i) => (
                <div key={i} className="text-sm text-foreground">
                  {c.name} <span className="text-xs text-muted-foreground">— {c.issuer} ({c.year})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Applications ({applications.length})</div>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hasn't applied to anything yet.</p>
          ) : (
            <div className="space-y-1.5">
              {applications.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-xs bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-foreground truncate">{a.internshipTitle} · {a.company}</span>
                  <Badge tone={a.status === "Hired" ? "green" : a.status === "Applied" ? "muted" : "blue"}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {student.recommendations?.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">My recommendations</div>
            <div className="space-y-1">
              {student.recommendations.map((r) => (
                <div key={r.internshipId} className="text-xs text-muted-foreground">
                  {r.title} · {r.company} <span className="text-[10px]">({relativeTime(r.at)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Mentor-only</div>
          <Field label="Flag" className="mb-3">
            <Select value={flag} onChange={(e) => setFlag(e.target.value)}>
              {FLAGS.map((f) => <option key={f || "none"} value={f}>{f || "No flag"}</option>)}
            </Select>
          </Field>
          <Field label="Private notes" hint="Visible only to you — never to the student or to recruiters.">
            <TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Progress, guidance given, what to follow up on." />
          </Field>
          <Button className="w-full mt-3" onClick={save}>Save notes</Button>
        </div>
      </div>
    </Modal>
  );
}

function RecommendModal({ faculty, student, postings, onClose, onDone }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return postings
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.company.toLowerCase().includes(q) || p.domain.toLowerCase().includes(q))
      .slice(0, 20);
  }, [postings, search]);

  return (
    <Modal
      title={`Recommend a role to ${student.name}`}
      description="The recommendation is logged against your mentor notes and lands in the student's portal inbox."
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search live postings…" />
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No open postings match.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-colors">
                <IconTile icon="💼" tone="blue" size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{p.company} · {p.domain} · closes {formatDate(p.deadline)}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    recommendPostingToStudent(faculty, student.id, p);
                    onDone(`Recommended “${p.title}” to ${student.name}.`);
                  }}
                >
                  Recommend
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
