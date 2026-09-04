"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Field, Flash, Modal, PageHeader, Section, Select, StatGrid, TextInput, useFlash } from "../../ui/Kit";
import { formatDateTime, relativeTime } from "../../../lib/match";
import {
  addInstitutionAdmin,
  listActivity,
  listInstitutionAdmins,
  logActivity,
  removeInstitutionAdmin,
  updateInstitutionAdmin,
} from "../../../lib/store";
import { useInstitutionName } from "./useInstitution";

const ROLE_TONE = { Admin: "primary", Viewer: "muted" };

const ROLE_DESCRIPTION = {
  Admin: "Full placement-cell administrative access (recorded for the audit log).",
  Viewer: "Institutional observer and reporting access level (recorded for the audit log).",
};

/**
 * A placement cell is more than one person, so the account supports several
 * staff logins with an admin/viewer distinction, and every change is written
 * to an activity log so a Dean can see who did what.
 */
export default function TeamActivity() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => setReady(true), []);

  const admins = useMemo(() => (ready && instituteName ? listInstitutionAdmins(instituteName) : []), [instituteName, ready, version]);
  const activity = useMemo(() => (ready && instituteName ? listActivity(instituteName, 60) : []), [instituteName, ready, version]);

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  function changeRole(admin, role) {
    updateInstitutionAdmin(admin.id, { role });
    logActivity(instituteName, user?.name || "Admin", "Changed a team member's access", `${admin.name} → ${role}`);
    bump(`${admin.name} is now a ${role.toLowerCase()}.`);
  }

  function revoke(admin) {
    removeInstitutionAdmin(admin.id);
    logActivity(instituteName, user?.name || "Admin", "Removed a team member", admin.name);
    bump(`${admin.name}'s access removed.`);
  }

  const columns = [
    {
      key: "name",
      header: "Team member",
      render: (a) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={a.name} size={32} />
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">{a.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{a.designation || "Placement cell"}</div>
          </div>
        </div>
      ),
    },
    { key: "email", header: "Email", hideBelow: "hidden md:table-cell", render: (a) => <span className="text-xs text-muted-foreground">{a.email}</span> },
    {
      key: "role",
      header: "Access",
      align: "center",
      render: (a) => (
        <Select value={a.role} onChange={(e) => changeRole(a, e.target.value)} className="w-auto text-xs py-1.5 mx-auto">
          {["Admin", "Viewer"].map((r) => <option key={r}>{r}</option>)}
        </Select>
      ),
    },
    { key: "added", header: "Added", align: "center", hideBelow: "hidden lg:table-cell", render: (a) => <span className="text-[11px] text-muted-foreground">{relativeTime(a.addedAt)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <button onClick={() => revoke(a)} className="text-xs text-muted-foreground hover:text-red-600">Revoke</button>
      ),
    },
  ];

  return (
    <DashboardLayout activePage="institution-team" title="Team & Activity">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Team & Activity Log"
          subtitle="Several placement-cell staff can share this institution account, each with their own access level and an auditable trail of changes."
          actions={<Button size="sm" onClick={() => setShowAdd(true)}>Add team member</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Team members", value: String(admins.length), icon: "👥", tone: "blue" },
            { label: "Admins", value: String(admins.filter((a) => a.role === "Admin").length), icon: "🔑", tone: "primary" },
            { label: "Viewers", value: String(admins.filter((a) => a.role === "Viewer").length), icon: "👁", tone: "purple" },
            { label: "Logged changes", value: String(activity.length), icon: "📝", tone: "amber", hint: activity[0] ? relativeTime(activity[0].at) : "None yet" },
          ]}
        />

        <Section title="Who can access this account" description="Team members and their recorded access roles for the institutional audit log.">
          <DataTable columns={columns} rows={admins} rowKey={(a) => a.id} empty="No team members added yet." />
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {Object.entries(ROLE_DESCRIPTION).map(([role, desc]) => (
              <div key={role} className="flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2.5">
                <Badge tone={ROLE_TONE[role]}>{role}</Badge>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Card>
          <Section title="Activity log" description="Every roster import, notice, drive and MOU change, newest first.">
            {activity.length === 0 ? (
              <EmptyState icon="📝" title="Nothing logged yet">Actions taken from this account will appear here.</EmptyState>
            ) : (
              <div className="space-y-0">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                    <Avatar name={a.actor} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground">
                        <span className="font-medium">{a.actor}</span>{" "}
                        <span className="text-muted-foreground">{a.action.toLowerCase()}</span>
                        {a.detail && <span className="text-muted-foreground"> — {a.detail}</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(a.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </Card>
      </div>

      {showAdd && (
        <Modal title="Add a team member" description="They'll be able to sign in against this institution's account." onClose={() => setShowAdd(false)}>
          <AddForm
            onCancel={() => setShowAdd(false)}
            onSubmit={(data) => {
              addInstitutionAdmin(instituteName, data);
              logActivity(instituteName, user?.name || "Admin", "Added a team member", `${data.name} (${data.role})`);
              setShowAdd(false);
              bump(`${data.name} added as a ${data.role.toLowerCase()}.`);
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function AddForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", designation: "", role: "Admin" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Field label="Full name"><TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Work email"><TextInput required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@college.edu.in" /></Field>
      <Field label="Designation"><TextInput value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Placement Executive" /></Field>
      <Field label="Access level" hint={ROLE_DESCRIPTION[form.role]}>
        <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
          {["Admin", "Viewer"].map((r) => <option key={r}>{r}</option>)}
        </Select>
      </Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Add member</Button>
      </div>
    </form>
  );
}
