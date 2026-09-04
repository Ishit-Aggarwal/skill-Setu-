"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { formatDate } from "../../../lib/match";
import {
  createDrive,
  deleteDrive,
  inviteCompanyToDrive,
  listDriveEligibility,
  listDriveInvites,
  listDrives,
  listInternships,
  listMous,
  logActivity,
  removeDriveInvite,
  setDriveInviteRsvp,
  untagStudentFromDrive,
  updateDrive,
} from "../../../lib/store";
import { buildRoster, useInstitutionName } from "./useInstitution";

const RSVP_TONE = { Confirmed: "green", Tentative: "amber", Declined: "red", Invited: "muted" };
const RSVP_OPTIONS = ["Invited", "Tentative", "Confirmed", "Declined"];

export default function PlacementDrives() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  const [showCreate, setShowCreate] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => setReady(true), []);

  const drives = useMemo(() => (ready && instituteName ? listDrives(instituteName) : []), [instituteName, ready, version]);
  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready, version]);
  const mous = useMemo(() => (ready && instituteName ? listMous(instituteName) : []), [instituteName, ready, version]);
  const platformCompanies = useMemo(
    () => (ready ? [...new Set(listInternships().map((i) => i.company))] : []),
    [ready]
  );

  const active = drives.find((d) => d.id === activeId) || drives[0] || null;
  const invites = useMemo(() => (active ? listDriveInvites(active.id) : []), [active, version]);
  const eligibility = useMemo(() => (active ? listDriveEligibility(active.id) : []), [active, version]);
  const eligibleStudents = useMemo(() => {
    const ids = new Set(eligibility.map((e) => e.studentId));
    return roster.filter((r) => ids.has(r.id));
  }, [eligibility, roster]);

  const confirmed = invites.filter((i) => i.rsvp === "Confirmed");
  const today = new Date().toISOString().slice(0, 10);

  function bump(message) {
    setVersion((v) => v + 1);
    if (message) setFlash(message);
  }

  return (
    <DashboardLayout activePage="institution-drives" title="Placement Drives">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Placement Drives"
          subtitle="Schedule a campus drive, invite industry partners, track who has confirmed, and run the day itself from one dashboard."
          actions={<Button size="sm" onClick={() => setShowCreate(true)}>Schedule a drive</Button>}
        />

        <Flash message={flash} />

        {drives.length === 0 ? (
          <EmptyState icon="📅" title="No drives scheduled yet" action={<Button size="sm" onClick={() => setShowCreate(true)}>Schedule your first drive</Button>}>
            A drive lets you invite several recruiters to one campus date, track their RSVPs, and see expected footfall before the day.
          </EmptyState>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {drives.map((d) => {
                const dInvites = listDriveInvites(d.id);
                const dConfirmed = dInvites.filter((i) => i.rsvp === "Confirmed").length;
                const upcoming = d.date >= today;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveId(d.id)}
                    className={`text-left bg-card border rounded-2xl p-4 transition-all duration-150 hover:shadow-md ${active?.id === d.id ? "border-primary" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-sm font-semibold text-foreground min-w-0">{d.title}</div>
                      <Badge tone={upcoming ? "primary" : "muted"}>{upcoming ? "Upcoming" : "Past"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">{formatDate(d.date)} · {d.venue || "Venue TBC"}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>🏢 {dConfirmed}/{dInvites.length} confirmed</span>
                      <span>🎓 {listDriveEligibility(d.id).length} eligible</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {active && (
              <>
                <StatGrid
                  stats={[
                    { label: "Companies invited", value: String(invites.length), icon: "✉️" },
                    { label: "Confirmed", value: String(confirmed.length), icon: "✅", hint: `${invites.filter((i) => i.rsvp === "Tentative").length} tentative` },
                    { label: "Roles on offer", value: String(confirmed.reduce((s, i) => s + (Number(i.expectedRoles) || 0), 0)), icon: "💼" },
                    { label: "Expected footfall", value: String(eligibleStudents.length), icon: "🎓", hint: "Students tagged eligible" },
                  ]}
                />

                <div className="grid lg:grid-cols-3 gap-5">
                  <Card className="lg:col-span-2">
                    <Section
                      title={`${active.title} — participating companies`}
                      description={`${formatDate(active.date)} · ${active.venue || "Venue to be confirmed"}${active.eligibleBatches?.length ? ` · batches ${active.eligibleBatches.join(", ")}` : ""}`}
                      actions={<Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>Invite a company</Button>}
                    >
                      {invites.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">No companies invited yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {invites.map((i) => (
                            <div key={i.id} className="flex flex-wrap items-center gap-3 border border-border rounded-xl px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-foreground truncate">{i.company}</div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {i.contact ? `${i.contact} · ` : ""}{i.roles || "Roles to be confirmed"}
                                </div>
                              </div>
                              <div className="text-[11px] text-muted-foreground whitespace-nowrap">{i.expectedRoles || 0} roles</div>
                              <Select
                                value={i.rsvp}
                                onChange={(e) => { setDriveInviteRsvp(i.id, e.target.value); bump(); }}
                                className="w-auto text-xs py-1.5"
                              >
                                {RSVP_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                              </Select>
                              <Badge tone={RSVP_TONE[i.rsvp]}>{i.rsvp}</Badge>
                              <button
                                onClick={() => { removeDriveInvite(i.id); bump("Invitation withdrawn."); }}
                                className="text-xs text-muted-foreground hover:text-red-600"
                                aria-label={`Remove ${i.company}`}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  </Card>

                  <Card>
                    <Section
                      title="Drive-day checklist"
                      description="Snapshot the placement cell can read out on the morning of the drive."
                    >
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-muted-foreground text-xs">Confirmed recruiters</span>
                          <span className="text-foreground font-medium text-xs text-right">
                            {confirmed.length ? confirmed.map((c) => c.company).join(", ") : "None yet"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground text-xs">Eligible students tagged</span>
                          <span className="text-foreground font-medium text-xs">{eligibleStudents.length}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground text-xs">Already placed among them</span>
                          <span className="text-foreground font-medium text-xs">{eligibleStudents.filter((s) => s.status === "Placed").length}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground text-xs">Avg. skill score of attendees</span>
                          <span className="text-foreground font-medium text-xs">
                            {eligibleStudents.filter((s) => s.score != null).length
                              ? Math.round(
                                  eligibleStudents.filter((s) => s.score != null).reduce((sum, s) => sum + s.score, 0) /
                                    eligibleStudents.filter((s) => s.score != null).length
                                )
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <Select
                          value={active.status || "Scheduled"}
                          onChange={(e) => { updateDrive(active.id, { status: e.target.value }); bump("Drive status updated."); }}
                        >
                          {["Scheduled", "In progress", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                        </Select>
                        <button
                          onClick={() => {
                            deleteDrive(active.id);
                            setActiveId(null);
                            logActivity(instituteName, user?.name || "Admin", "Deleted a placement drive", active.title);
                            bump("Drive deleted.");
                          }}
                          className="mt-3 text-xs text-muted-foreground hover:text-red-600"
                        >
                          Delete this drive
                        </button>
                      </div>
                    </Section>
                  </Card>
                </div>

                <Card>
                  <Section
                    title="Eligible students"
                    description="Tag students from the Student Roster page — filter to a cohort there, then use “Tag for a drive”."
                  >
                    {eligibleStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No students tagged yet. Open the Student Roster, filter to the cohort you want, select them and choose “Tag for a drive”.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {eligibleStudents.map((s) => (
                          <span key={s.id} className="inline-flex items-center gap-2 bg-secondary/70 rounded-full pl-3 pr-2 py-1.5 text-xs">
                            <span className="text-foreground">{s.name}</span>
                            <span className="text-muted-foreground">{s.department.split(" ")[0]}</span>
                            {s.score != null && <Badge tone={s.score >= 75 ? "green" : s.score >= 60 ? "amber" : "red"}>{s.score}</Badge>}
                            <button
                              onClick={() => { untagStudentFromDrive(active.id, s.id); bump(); }}
                              className="text-muted-foreground hover:text-red-600"
                              aria-label={`Remove ${s.name}`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </Section>
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateDriveModal
          instituteName={instituteName}
          actor={user?.name}
          batches={[...new Set(roster.map((r) => r.batch).filter(Boolean))].sort()}
          onClose={() => setShowCreate(false)}
          onDone={(id, msg) => { setShowCreate(false); setActiveId(id); bump(msg); }}
        />
      )}

      {showInvite && active && (
        <InviteCompanyModal
          drive={active}
          instituteName={instituteName}
          actor={user?.name}
          suggestions={[...new Set([...mous.map((m) => m.partner), ...platformCompanies])]}
          onClose={() => setShowInvite(false)}
          onDone={(msg) => { setShowInvite(false); bump(msg); }}
        />
      )}
    </DashboardLayout>
  );
}

function CreateDriveModal({ instituteName, actor, batches, onClose, onDone }) {
  const [form, setForm] = useState({ title: "", date: "", venue: "", description: "" });
  const [selectedBatches, setSelectedBatches] = useState([]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    const drive = createDrive(instituteName, { ...form, eligibleBatches: selectedBatches });
    logActivity(instituteName, actor || "Admin", "Created placement drive", form.title);
    onDone(drive.id, `“${form.title}” scheduled for ${formatDate(form.date)}.`);
  }

  return (
    <Modal title="Schedule a placement drive" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Drive title"><TextInput required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Annual Campus Placement Drive 2026" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><TextInput required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Venue"><TextInput value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Main Auditorium" /></Field>
        </div>
        {batches.length > 0 && (
          <Field label="Eligible batches" hint="Leave empty to open the drive to every batch.">
            <div className="flex flex-wrap gap-2">
              {batches.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBatches((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    selectedBatches.includes(b) ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field label="Notes"><TextArea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Which sectors, what the day looks like, anything recruiters should know." /></Field>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">Schedule drive</Button>
        </div>
      </form>
    </Modal>
  );
}

function InviteCompanyModal({ drive, instituteName, actor, suggestions, onClose, onDone }) {
  const [form, setForm] = useState({ company: "", contact: "", roles: "", expectedRoles: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    inviteCompanyToDrive(drive.id, { ...form, expectedRoles: Number(form.expectedRoles) || 0 });
    logActivity(instituteName, actor || "Admin", "Invited a company to a drive", `${form.company} → ${drive.title}`);
    onDone(`${form.company} invited to ${drive.title}.`);
  }

  return (
    <Modal title="Invite a company" description={`They'll appear on ${drive.title} with an RSVP you can track.`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Company" hint="Existing partners and platform recruiters are suggested as you type.">
          <input
            required
            list="drive-company-suggestions"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Apex Global Technologies & Innovations"
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <datalist id="drive-company-suggestions">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary contact"><TextInput value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Name of their recruiter" /></Field>
          <Field label="Expected openings"><TextInput type="number" min="0" value={form.expectedRoles} onChange={(e) => set("expectedRoles", e.target.value)} placeholder="12" /></Field>
        </div>
        <Field label="Roles being offered"><TextInput value={form.roles} onChange={(e) => set("roles", e.target.value)} placeholder="Formulation Intern, QC Analyst" /></Field>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">Send invitation</Button>
        </div>
      </form>
    </Modal>
  );
}
