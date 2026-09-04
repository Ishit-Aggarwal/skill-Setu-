"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  Flash,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatGrid,
  TextArea,
  TextInput,
  useFlash,
} from "../../ui/Kit";
import { DEPARTMENTS } from "../../../lib/domains";
import {
  BULK_STUDENT_TEMPLATE,
  bulkInviteStudents,
  createStudentRecord,
  downloadFile,
  listDrives,
  logActivity,
  notifyStudents,
  parseCsv,
  tagStudentsForDrive,
  toCsv,
} from "../../../lib/store";
import { PLACEMENT_STATUSES, PLACEMENT_TONE, ROSTER_EXPORT_COLUMNS, SCORE_BANDS, buildRoster, useInstitutionName } from "./useInstitution";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year", "Graduated"];

/**
 * The roster a Training & Placement Officer actually works from: filter down
 * to a cohort, then act on it in bulk — export for internal reporting, notify
 * the group, or tag them as eligible for a specific drive.
 */
export default function StudentRoster() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useFlash();

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [batch, setBatch] = useState("All");
  const [band, setBand] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState(() => new Set());
  const [viewingStudent, setViewingStudent] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [showTag, setShowTag] = useState(false);

  useEffect(() => setReady(true), []);

  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready, version]);
  const drives = useMemo(() => (ready ? listDrives(instituteName) : []), [instituteName, ready, version]);

  const batches = useMemo(() => ["All", ...[...new Set(roster.map((r) => r.batch).filter(Boolean))].sort()], [roster]);
  const departments = useMemo(() => ["All", ...[...new Set(roster.map((r) => r.department))].sort()], [roster]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bandTest = SCORE_BANDS.find((b) => b.key === band)?.test || (() => true);
    const rows = roster.filter((r) => {
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.rollNo.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (department === "All" || r.department === department) &&
        (batch === "All" || r.batch === batch) &&
        (status === "All" || r.status === status) &&
        bandTest(r)
      );
    });
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      score: (a, b) => (b.score ?? -1) - (a.score ?? -1),
      department: (a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name),
      batch: (a, b) => (a.batch || "").localeCompare(b.batch || "") || a.name.localeCompare(b.name),
      status: (a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name),
    };
    return [...rows].sort(sorters[sort] || sorters.name);
  }, [roster, search, department, batch, band, status, sort]);

  const selectedRows = useMemo(() => filtered.filter((r) => selected.has(r.id)), [filtered, selected]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((r) => next.delete(r.id));
      else filtered.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportRows(rows, label) {
    if (!rows.length) return setFlash("Nothing to export — adjust your filters first.");
    downloadFile(
      `${instituteName.replace(/\W+/g, "-").toLowerCase()}-roster-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows, ROSTER_EXPORT_COLUMNS)
    );
    logActivity(instituteName, user?.name || "Admin", "Exported student list", `${rows.length} ${label}`);
    setFlash(`Exported ${rows.length} student${rows.length === 1 ? "" : "s"} to CSV.`);
    setVersion((v) => v + 1);
  }

  const stats = [
    { label: "On roster", value: String(roster.length) },
    { label: "Matching filters", value: String(filtered.length) },
    { label: "Selected", value: String(selected.size) },
    { label: "Awaiting first application", value: String(roster.filter((r) => r.status === "Unplaced").length) },
  ];

  const columns = [
    {
      key: "select",
      header: (
        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} className="w-3.5 h-3.5 accent-primary" aria-label="Select all visible students" />
      ),
      render: (r) => (
        <input
          type="checkbox"
          checked={selected.has(r.id)}
          onChange={() => toggleOne(r.id)}
          className="w-3.5 h-3.5 accent-primary"
          aria-label={`Select ${r.name}`}
        />
      ),
    },
    {
      key: "name",
      header: "Student",
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground flex items-center gap-1.5">
            <button
              onClick={() => setViewingStudent(r)}
              className="truncate text-foreground hover:text-primary hover:underline font-medium text-left"
              title="Click to view full read-only student profile"
            >
              {r.name}
            </button>
            {r.invited && <Badge tone="amber">Invited</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{r.rollNo || r.email}</div>
        </div>
      ),
    },
    { key: "department", header: "Department", hideBelow: "hidden md:table-cell", render: (r) => <span className="text-xs text-muted-foreground">{r.department}</span> },
    { key: "batch", header: "Batch", align: "center", hideBelow: "hidden sm:table-cell", render: (r) => <span className="text-xs text-muted-foreground">{r.batch || "—"}</span> },
    {
      key: "score",
      header: "Skill score",
      align: "center",
      render: (r) => (
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-foreground">{r.score ?? "—"}</span>
          {r.score != null && (
            <div className="w-12 h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div className={`h-full rounded-full ${r.score < 60 ? "bg-red-500" : r.score < 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${r.score}%` }} />
            </div>
          )}
        </div>
      ),
    },
    { key: "applications", header: "Apps", align: "center", hideBelow: "hidden lg:table-cell", render: (r) => <span className="text-xs text-muted-foreground">{r.applications}</span> },
    {
      key: "status",
      header: "Placement",
      align: "center",
      render: (r) => (
        <div className="flex flex-col items-center gap-0.5">
          <Badge tone={PLACEMENT_TONE[r.status]}>{r.status}</Badge>
          {r.placedAt && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{r.placedAt}</span>}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout activePage="institution-students" title="Student Roster">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Student Roster"
          subtitle={`Every student registered under ${instituteName || "your institution"} — filter, export, notify, and tag for drives.`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>Bulk import</Button>
              <Button size="sm" onClick={() => setShowAdd(true)}>Add student</Button>
            </>
          }
        />

        <Flash message={flash} />

        <StatGrid stats={stats} />

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, roll number, email or course…" className="flex-1 min-w-[220px]" />
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
              <option value="name">Sort: Name</option>
              <option value="score">Sort: Skill score</option>
              <option value="department">Sort: Department</option>
              <option value="batch">Sort: Batch</option>
              <option value="status">Sort: Placement status</option>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Department">
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Batch / Year of entry">
              <Select value={batch} onChange={(e) => setBatch(e.target.value)}>
                {batches.map((b) => <option key={b}>{b}</option>)}
              </Select>
            </Field>
            <Field label="Skill-score band">
              <Select value={band} onChange={(e) => setBand(e.target.value)}>
                {SCORE_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
              </Select>
            </Field>
            <Field label="Placement status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {PLACEMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => exportRows(filtered, "matching the current filters")}>
              Export filtered ({filtered.length})
            </Button>
            <Button variant="outline" size="sm" disabled={!selected.size} onClick={() => exportRows(selectedRows, "selected")}>
              Export selected
            </Button>
            <Button variant="outline" size="sm" disabled={!selected.size} onClick={() => setShowNotify(true)}>
              Notify selected
            </Button>
            <Button variant="outline" size="sm" disabled={!selected.size} onClick={() => setShowTag(true)}>
              Tag for a drive
            </Button>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">
                Clear selection
              </button>
            )}
          </div>
        </Card>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          empty={roster.length ? "No students match these filters." : "No students registered under this institution yet — add or import them to get started."}
        />
      </div>

      {showAdd && (
        <AddStudentModal
          instituteName={instituteName}
          actor={user?.name}
          onClose={() => setShowAdd(false)}
          onDone={(msg) => {
            setShowAdd(false);
            setFlash(msg);
            setVersion((v) => v + 1);
          }}
        />
      )}

      {showImport && (
        <BulkImportModal
          instituteName={instituteName}
          actor={user?.name}
          onClose={() => setShowImport(false)}
          onDone={(msg) => {
            setShowImport(false);
            setFlash(msg);
            setVersion((v) => v + 1);
          }}
        />
      )}

      {showNotify && (
        <NotifyModal
          instituteName={instituteName}
          actor={user?.name}
          students={selectedRows}
          onClose={() => setShowNotify(false)}
          onDone={(msg) => {
            setShowNotify(false);
            setFlash(msg);
            setSelected(new Set());
            setVersion((v) => v + 1);
          }}
        />
      )}

      {showTag && (
        <TagForDriveModal
          instituteName={instituteName}
          actor={user?.name}
          drives={drives}
          students={selectedRows}
          onClose={() => setShowTag(false)}
          onDone={(msg) => {
            setShowTag(false);
            setFlash(msg);
            setVersion((v) => v + 1);
          }}
        />
      )}

      {viewingStudent && (
        <StudentProfileModal
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </DashboardLayout>
  );
}

function AddStudentModal({ instituteName, actor, onClose, onDone }) {
  const [form, setForm] = useState({ name: "", email: "", rollNo: "", department: DEPARTMENTS[0], batch: "2024", year: "3rd Year", course: "", phone: "" });
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    const created = createStudentRecord(instituteName, form);
    if (!created) return setError("An account already exists with that email address.");
    logActivity(instituteName, actor || "Admin", "Added a student", form.name);
    onDone(`${form.name} added to the roster and invited to complete their profile.`);
  }

  return (
    <Modal title="Add a student" description="Creates an invited record the student can claim when they sign up with this email." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Flash message={error} tone="red" />}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full name"><TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Aarav Sharma" /></Field>
          <Field label="Email"><TextInput required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="aarav@college.edu.in" /></Field>
          <Field label="Roll number"><TextInput value={form.rollNo} onChange={(e) => set("rollNo", e.target.value)} placeholder="BAMS/2024/017" /></Field>
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" /></Field>
          <Field label="Department">
            <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Course"><TextInput value={form.course} onChange={(e) => set("course", e.target.value)} placeholder="BAMS" /></Field>
          <Field label="Batch (year of entry)"><TextInput value={form.batch} onChange={(e) => set("batch", e.target.value)} placeholder="2024" /></Field>
          <Field label="Current year">
            <Select value={form.year} onChange={(e) => set("year", e.target.value)}>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">Add to roster</Button>
        </div>
      </form>
    </Modal>
  );
}

function BulkImportModal({ instituteName, actor, onClose, onDone }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ""));
      setPreview(null);
      setError(null);
    };
    reader.readAsText(file);
  }

  function doPreview() {
    const { headers, rows } = parseCsv(text);
    if (!rows.length) return setError("No data rows found. Check the file has a header row plus at least one student.");
    if (!headers.includes("name") || !headers.includes("email")) return setError("The file must include at least 'name' and 'email' columns.");
    setError(null);
    setPreview(rows);
  }

  function doImport() {
    const result = bulkInviteStudents(instituteName, preview);
    logActivity(instituteName, actor || "Admin", "Imported students", `${result.created} created, ${result.skipped} skipped`);
    onDone(`Imported ${result.created} student${result.created === 1 ? "" : "s"}${result.skipped ? `, skipped ${result.skipped}` : ""}.`);
  }

  return (
    <Modal title="Bulk student onboarding" description="Invite a whole batch at once from a CSV, instead of adding students one at a time." onClose={onClose} size="lg">
      <div className="space-y-4">
        {error && <Flash message={error} tone="red" />}

        <div className="bg-secondary/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-foreground mb-1">1. Start from the template</div>
          <p className="text-xs text-muted-foreground mb-3">
            Columns: name, email, rollNo, department, batch, year, course, phone. Name and email are required; the rest are optional.
          </p>
          <Button variant="outline" size="sm" onClick={() => downloadFile("skill-setu-student-template.csv", BULK_STUDENT_TEMPLATE)}>
            Download CSV template
          </Button>
        </div>

        <Field label="2. Upload or paste your CSV">
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary mb-2" />
          <TextArea rows={6} value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} placeholder="name,email,rollNo,department,batch,year,course,phone" className="font-mono text-[11px]" />
        </Field>

        {preview && (
          <div>
            <div className="text-xs font-semibold text-foreground mb-2">3. Preview — {preview.length} row{preview.length === 1 ? "" : "s"}</div>
            <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-secondary/50">
                  <tr>
                    {["name", "email", "department", "batch"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground capitalize">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 text-foreground">{r.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.email}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.department}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.batch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          {preview ? (
            <Button className="flex-1" onClick={doImport}>Import {preview.length} student{preview.length === 1 ? "" : "s"}</Button>
          ) : (
            <Button className="flex-1" disabled={!text.trim()} onClick={doPreview}>Preview import</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function NotifyModal({ instituteName, actor, students, onClose, onDone }) {
  const [message, setMessage] = useState("");

  function send() {
    notifyStudents(instituteName, students.map((s) => s.id), message, actor || "Placement Cell");
    logActivity(instituteName, actor || "Admin", "Notified students", `${students.length} recipients`);
    onDone(`Notification queued for ${students.length} student${students.length === 1 ? "" : "s"}.`);
  }

  return (
    <Modal title={`Notify ${students.length} student${students.length === 1 ? "" : "s"}`} description="Goes to the selected students' portal inbox." onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-secondary/50 rounded-xl p-3 max-h-32 overflow-y-auto text-xs text-muted-foreground">
          {students.map((s) => s.name).join(", ")}
        </div>
        <Field label="Message">
          <TextArea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Shortlisting for the winter drive closes on Friday — please confirm your participation on the portal." />
        </Field>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!message.trim()} onClick={send}>Send notification</Button>
        </div>
      </div>
    </Modal>
  );
}

function TagForDriveModal({ instituteName, actor, drives, students, onClose, onDone }) {
  const [driveId, setDriveId] = useState(drives[0]?.id || "");

  function tag() {
    const added = tagStudentsForDrive(driveId, students.map((s) => s.id));
    const drive = drives.find((d) => d.id === driveId);
    logActivity(instituteName, actor || "Admin", "Tagged students as drive-eligible", `${added} for ${drive?.title || "a drive"}`);
    onDone(`Tagged ${added} student${added === 1 ? "" : "s"} as eligible for ${drive?.title || "the drive"}.`);
  }

  if (!drives.length) {
    return (
      <Modal title="Tag for a placement drive" onClose={onClose}>
        <p className="text-sm text-muted-foreground">
          You haven't scheduled a drive yet. Create one from the Placement Drives page first, then come back to tag eligible students.
        </p>
        <Button className="w-full mt-4" onClick={onClose}>Close</Button>
      </Modal>
    );
  }

  return (
    <Modal title={`Tag ${students.length} student${students.length === 1 ? "" : "s"} as eligible`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Placement drive">
          <Select value={driveId} onChange={(e) => setDriveId(e.target.value)}>
            {drives.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </Select>
        </Field>
        <div className="bg-secondary/50 rounded-xl p-3 max-h-32 overflow-y-auto text-xs text-muted-foreground">
          {students.map((s) => s.name).join(", ")}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={tag}>Tag as eligible</Button>
        </div>
      </div>
    </Modal>
  );
}
