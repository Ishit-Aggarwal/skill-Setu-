"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { useNav } from "../../../lib/nav";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, Section, StatGrid } from "../../ui/Kit";
import { formatDate, relativeTime } from "../../../lib/match";
import {
  getInstitutionProfile,
  listActivity,
  listAnnouncements,
  listDriveInvites,
  listDrives,
  listInstitutionAdmins,
  listMous,
  mouStatus,
} from "../../../lib/store";
import { PLACEMENT_TONE, useInstitutionName, useRoster } from "./useInstitution";

/**
 * The institution home page. Previously this was four stat tiles and a single
 * partnerships table; a placement cell's actual morning view is closer to
 * this — what needs attention today, what's coming up, and who changed what.
 */
export default function InstitutionDashboard() {
  const { user } = useAuth();
  const navigate = useNav();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const roster = useRoster(instituteName, [ready]);
  const profile = useMemo(() => (ready ? getInstitutionProfile(instituteName) : null), [instituteName, ready]);
  const drives = useMemo(() => (ready ? listDrives(instituteName) : []), [instituteName, ready]);
  const mous = useMemo(() => (ready ? listMous(instituteName) : []), [instituteName, ready]);
  const notices = useMemo(() => (ready ? listAnnouncements(instituteName) : []), [instituteName, ready]);
  const activity = useMemo(() => (ready ? listActivity(instituteName, 6) : []), [instituteName, ready]);
  const admins = useMemo(() => (ready ? listInstitutionAdmins(instituteName) : []), [instituteName, ready]);

  const placed = roster.filter((r) => r.status === "Placed").length;
  const inProcess = roster.filter((r) => r.status === "In Process").length;
  const unplaced = roster.filter((r) => r.status === "Unplaced").length;
  const notAssessed = roster.filter((r) => r.score == null).length;
  const activeMous = mous.filter((m) => mouStatus(m) === "Active").length;
  const renewalDue = mous.filter((m) => mouStatus(m) === "Renewal due" || mouStatus(m) === "Expired");

  const upcomingDrive = drives.find((d) => d.date >= new Date().toISOString().slice(0, 10));
  const upcomingInvites = upcomingDrive ? listDriveInvites(upcomingDrive.id) : [];
  const confirmed = upcomingInvites.filter((i) => i.rsvp === "Confirmed");

  const stats = [
    { label: "Registered students", value: String(roster.length), icon: "🎓", hint: `${notAssessed} not yet assessed` },
    { label: "Placed", value: String(placed), icon: "✅", hint: roster.length ? `${Math.round((placed / roster.length) * 100)}% of cohort` : "—" },
    { label: "In process", value: String(inProcess), icon: "🔄", hint: `${unplaced} yet to apply` },
    { label: "Active MOUs", value: String(activeMous), icon: "🤝", hint: renewalDue.length ? `${renewalDue.length} need renewal` : "All current" },
    { label: "Upcoming drives", value: String(drives.filter((d) => d.date >= new Date().toISOString().slice(0, 10)).length), icon: "📅", hint: upcomingDrive ? formatDate(upcomingDrive.date) : "None scheduled" },
  ];

  const byDepartment = useMemo(() => {
    const groups = {};
    roster.forEach((r) => {
      if (!groups[r.department]) groups[r.department] = { department: r.department, total: 0, placed: 0 };
      groups[r.department].total += 1;
      if (r.status === "Placed") groups[r.department].placed += 1;
    });
    return Object.values(groups)
      .map((g) => ({ ...g, rate: g.total ? Math.round((g.placed / g.total) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);
  }, [roster]);

  const verification = [
    { label: "Partner verification code", ok: !!user?.verifiedCode, detail: user?.verifiedCode || "Not on record" },
    { label: "Admin email verified", ok: user?.emailVerified !== false, detail: user?.email || "" },
    ...(profile?.accreditations || []).map((a) => ({
      label: `${a.body} accreditation`,
      ok: a.status === "Verified",
      detail: a.status === "Verified" ? `${a.grade} · valid till ${a.validTill ? formatDate(a.validTill) : "—"}` : "Proof pending upload",
    })),
  ];

  return (
    <DashboardLayout activePage="institution-dashboard" title="Institution Dashboard">
      <div className="animate-fade-slide space-y-6">
        <PageHeader
          title={instituteName || "Your Institution"}
          subtitle={`${profile?.instituteType || "Ayush institution"}${profile?.city ? ` · ${profile.city}, ${profile.state}` : ""} · placement cell overview`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("institution-students")}>Manage roster</Button>
              <Button size="sm" onClick={() => navigate("institution-drives")}>Schedule a drive</Button>
            </>
          }
        />

        <StatGrid stats={stats} columns={5} />

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <Section
              title="Placement rate by department"
              description="Share of each department's registered students who have been hired through the platform."
              actions={<button onClick={() => navigate("institution-analytics")} className="text-xs text-primary font-medium hover:underline">Full analytics →</button>}
            >
              {byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No students on the roster yet.</p>
              ) : (
                <div className="space-y-3">
                  {byDepartment.map((d) => (
                    <div key={d.department}>
                      <div className="flex items-center justify-between text-xs mb-1 gap-2">
                        <span className="font-medium text-foreground truncate">{d.department}</span>
                        <span className="text-muted-foreground flex-shrink-0">{d.placed}/{d.total} · {d.rate}%</span>
                      </div>
                      <ProgressBar value={d.rate} />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section title="Verification & compliance" description="What the Ministry-facing record currently shows.">
              <div className="space-y-2.5">
                {verification.map((v) => (
                  <div key={v.label} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 text-xs ${v.ok ? "text-green-600" : "text-amber-600"}`}>{v.ok ? "✓" : "•"}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground">{v.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{v.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("institution-profile")} className="mt-4 text-xs text-primary font-medium hover:underline">
                Manage accreditation proof →
              </button>
            </Section>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <Section title="Next placement drive">
              {!upcomingDrive ? (
                <EmptyState icon="📅" title="No drive scheduled">
                  Schedule a campus drive and invite your MOU partners to it.
                </EmptyState>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{upcomingDrive.title}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(upcomingDrive.date)} · {upcomingDrive.venue}</div>
                    </div>
                    <Badge tone="primary">{confirmed.length} confirmed</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 my-4">
                    {[
                      { label: "Invited", value: upcomingInvites.length },
                      { label: "Confirmed", value: confirmed.length },
                      { label: "Roles offered", value: confirmed.reduce((s, i) => s + (Number(i.expectedRoles) || 0), 0) },
                    ].map((m) => (
                      <div key={m.label} className="bg-secondary/50 rounded-xl py-2.5 text-center">
                        <div className="text-lg font-bold text-foreground">{m.value}</div>
                        <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate("institution-drives")} className="text-xs text-primary font-medium hover:underline">
                    Open drive-day dashboard →
                  </button>
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section
              title="Latest notices"
              actions={<button onClick={() => navigate("institution-announcements")} className="text-xs text-primary font-medium hover:underline">Post →</button>}
            >
              {notices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nothing posted to your students yet.</p>
              ) : (
                <div className="space-y-3">
                  {notices.slice(0, 3).map((n) => (
                    <div key={n.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">{n.title}</span>
                        {n.pinned && <Badge tone="amber">Pinned</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>
                      <div className="text-[10px] text-muted-foreground mt-1">{n.audience} · {relativeTime(n.postedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>
        </div>

        {renewalDue.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <Section title="Partnerships needing attention" description="MOUs expiring within 90 days, or already lapsed.">
              <div className="space-y-2">
                {renewalDue.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">{m.partner}</span>
                    <span className="text-xs text-muted-foreground">
                      {mouStatus(m)} · expires {formatDate(m.expiryDate)}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("institution-partnerships")} className="mt-3 text-xs text-primary font-medium hover:underline">
                Open MOU tracker →
              </button>
            </Section>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <Section title="Recent activity" description={`${admins.length} staff member${admins.length === 1 ? "" : "s"} can access this account.`}>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No changes recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">{a.actor}</span>{" "}
                        <span className="text-muted-foreground">{a.action.toLowerCase()}</span>
                        {a.detail && <span className="text-muted-foreground"> — {a.detail}</span>}
                        <div className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(a.at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => navigate("institution-team")} className="mt-3 text-xs text-primary font-medium hover:underline">
                Manage team & full log →
              </button>
            </Section>
          </Card>

          <Card>
            <Section title="Quick actions">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Add / import students", page: "institution-students", icon: "👥" },
                  { label: "Cohort skill gaps", page: "institution-skill-gaps", icon: "🧭" },
                  { label: "Curriculum alignment", page: "institution-curriculum", icon: "📚" },
                  { label: "Post a notice", page: "institution-announcements", icon: "📣" },
                  { label: "Track an MOU", page: "institution-partnerships", icon: "🤝" },
                  { label: "Institution profile", page: "institution-profile", icon: "🏫" },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.page)}
                    className="flex items-center gap-2 text-left text-xs font-medium text-foreground bg-secondary/60 hover:bg-secondary rounded-xl px-3 py-3 transition-colors"
                  >
                    <span className="text-base">{a.icon}</span>
                    <span className="min-w-0">{a.label}</span>
                  </button>
                ))}
              </div>
            </Section>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
