"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Field, Flash, Modal, PageHeader, Section, Select, StatGrid, TextInput, useFlash } from "../../ui/Kit";
import { formatDate, relativeTime } from "../../../lib/match";
import {
  addRecruiter,
  assignPostingToRecruiter,
  listApplicationsForOwner,
  listInternshipsByOwner,
  listRecruiters,
  removeRecruiter,
  updateRecruiter,
} from "../../../lib/store";

const ACCESS_LEVELS = ["Owner", "Recruiter", "Interviewer"];

const ACCESS_DESCRIPTION = {
  Owner: "Full access — postings, candidates, offers, company profile and team.",
  Recruiter: "Manages assigned postings and their candidates.",
  Interviewer: "Views assigned candidates only; cannot edit postings.",
};

/**
 * Company accounts are rarely one person. Postings can be assigned to a named
 * recruiter, and private candidate notes can be hidden from team members who
 * shouldn't see other people's assessments.
 */
export default function HiringTeam() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => setReady(true), []);

  const recruiters = useMemo(() => (ready && user ? listRecruiters(user.id) : []), [user, ready, version]);
  const postings = useMemo(() => (ready && user ? listInternshipsByOwner(user.id) : []), [user, ready, version]);
  const applications = useMemo(() => (ready && user ? listApplicationsForOwner(user.id) : []), [user, ready, version]);

  const workload = useMemo(() => {
    const byRecruiter = {};
    postings.forEach((p) => {
      const key = p.recruiterName || "Unassigned";
      if (!byRecruiter[key]) byRecruiter[key] = { name: key, postings: 0, applicants: 0, hired: 0 };
      byRecruiter[key].postings += 1;
      const apps = applications.filter((a) => a.internshipId === p.id);
      byRecruiter[key].applicants += apps.length;
      byRecruiter[key].hired += apps.filter((a) => a.status === "Hired").length;
    });
    return Object.values(byRecruiter).sort((a, b) => b.applicants - a.applicants);
  }, [postings, applications]);

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  const teamColumns = [
    {
      key: "name",
      header: "Team member",
      render: (r) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={r.name} size={32} />
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">{r.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{r.title || "Recruiter"} · {r.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "access",
      header: "Access",
      align: "center",
      render: (r) => (
        <Select
          value={r.accessLevel}
          onChange={(e) => { updateRecruiter(r.id, { accessLevel: e.target.value }); bump(`${r.name} is now ${e.target.value.toLowerCase()}.`); }}
          className="w-auto text-xs py-1.5 mx-auto"
        >
          {ACCESS_LEVELS.map((a) => <option key={a}>{a}</option>)}
        </Select>
      ),
    },
    {
      key: "notes",
      header: "Sees private notes",
      align: "center",
      render: (r) => (
        <input
          type="checkbox"
          checked={r.notesVisible !== false}
          onChange={(e) => { updateRecruiter(r.id, { notesVisible: e.target.checked }); bump(); }}
          className="w-4 h-4 accent-primary"
          aria-label={`Toggle private-note visibility for ${r.name}`}
        />
      ),
    },
    { key: "added", header: "Added", align: "center", hideBelow: "hidden lg:table-cell", render: (r) => <span className="text-[11px] text-muted-foreground">{relativeTime(r.addedAt)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) =>
        r.accessLevel === "Owner" ? (
          <Badge tone="primary">Account owner</Badge>
        ) : (
          <button onClick={() => { removeRecruiter(r.id); bump(`${r.name} removed from the team.`); }} className="text-xs text-muted-foreground hover:text-red-600">Remove</button>
        ),
    },
  ];

  return (
    <DashboardLayout activePage="industry-team" title="Hiring Team">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Hiring Team"
          subtitle={`Everyone recruiting for ${user?.companyName || "your organisation"}, what they can see, and which postings they own.`}
          actions={<Button size="sm" onClick={() => setShowAdd(true)}>Add team member</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Team members", value: String(recruiters.length), icon: "👥" },
            { label: "Postings", value: String(postings.length), icon: "📋", hint: `${postings.filter((p) => !p.recruiterName).length} unassigned` },
            { label: "Live applicants", value: String(applications.length), icon: "📥" },
            { label: "Hires made", value: String(applications.filter((a) => a.status === "Hired").length), icon: "✅" },
          ]}
        />

        <Section title="Team & access" description="Private candidate notes can be hidden per member, so one recruiter's assessment doesn't bias another's.">
          <DataTable columns={teamColumns} rows={recruiters} rowKey={(r) => r.id} empty="No team members added yet." />
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            {ACCESS_LEVELS.map((level) => (
              <div key={level} className="flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2.5">
                <Badge tone={level === "Owner" ? "primary" : "muted"}>{level}</Badge>
                <span>{ACCESS_DESCRIPTION[level]}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Posting assignment" description="Give each opening a named owner so candidates aren't left unattended.">
          {postings.length === 0 ? (
            <EmptyState icon="📋" title="No postings yet">Publish an opening and you can assign it to a recruiter here.</EmptyState>
          ) : (
            <div className="space-y-2">
              {postings.map((p) => {
                const apps = applications.filter((a) => a.internshipId === p.id);
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.domain} · {apps.length} applicant{apps.length === 1 ? "" : "s"} · closes {formatDate(p.deadline)}
                      </div>
                    </div>
                    <Badge tone={p.status === "Open" ? "green" : "muted"}>{p.status}</Badge>
                    <Select
                      value={p.recruiterName || ""}
                      onChange={(e) => {
                        const r = recruiters.find((x) => x.name === e.target.value);
                        assignPostingToRecruiter(p.id, r?.id || null, e.target.value || null);
                        bump(e.target.value ? `${p.title} assigned to ${e.target.value}.` : "Assignment cleared.");
                      }}
                      className="w-auto text-xs py-1.5"
                    >
                      <option value="">Unassigned</option>
                      {recruiters.map((r) => <option key={r.id}>{r.name}</option>)}
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {workload.length > 0 && (
          <Card>
            <Section title="Workload by recruiter" description="Who is carrying how much of the pipeline.">
              <DataTable
                columns={[
                  { key: "name", header: "Recruiter", render: (r) => <span className={`font-medium ${r.name === "Unassigned" ? "text-amber-600" : "text-foreground"}`}>{r.name}</span> },
                  { key: "postings", header: "Postings", align: "center", render: (r) => <span className="text-muted-foreground">{r.postings}</span> },
                  { key: "applicants", header: "Applicants", align: "center", render: (r) => <span className="text-foreground font-medium">{r.applicants}</span> },
                  { key: "hired", header: "Hired", align: "center", render: (r) => <span className="text-primary font-semibold">{r.hired}</span> },
                ]}
                rows={workload}
                rowKey={(r) => r.name}
              />
            </Section>
          </Card>
        )}
      </div>

      {showAdd && (
        <Modal title="Add a team member" description="They'll be able to recruit under this company account." onClose={() => setShowAdd(false)}>
          <AddRecruiterForm
            onCancel={() => setShowAdd(false)}
            onSubmit={(data) => {
              addRecruiter(user.id, data);
              setShowAdd(false);
              bump(`${data.name} added to the hiring team.`);
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function AddRecruiterForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", title: "", accessLevel: "Recruiter", notesVisible: true });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Field label="Full name"><TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Work email"><TextInput required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <Field label="Job title"><TextInput value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Campus Recruiter" /></Field>
      <Field label="Access level" hint={ACCESS_DESCRIPTION[form.accessLevel]}>
        <Select value={form.accessLevel} onChange={(e) => set("accessLevel", e.target.value)}>
          {ACCESS_LEVELS.filter((a) => a !== "Owner").map((a) => <option key={a}>{a}</option>)}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={form.notesVisible} onChange={(e) => set("notesVisible", e.target.checked)} className="w-4 h-4 accent-primary" />
        Can see other recruiters' private candidate notes
      </label>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Add to team</Button>
      </div>
    </form>
  );
}
