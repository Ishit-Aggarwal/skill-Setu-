"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { useNav } from "../../../lib/nav";
import { Avatar, Badge, Button, Card, EmptyState, IconTile, PageHeader, ProgressBar, ProgressRing, Section, StatGrid } from "../../ui/Kit";
import { formatDate, formatDateTime, relativeTime } from "../../../lib/match";
import {
  SEED_COLLABS,
  getCollabResponse,
  listCollabInterests,
  listCollabListingsByOwner,
  listCollabMilestones,
  listProgramRegistrations,
  listPrograms,
  listResearchOutputs,
} from "../../../lib/store";
import { FLAG_TONE, PLACEMENT_TONE, averageDomainScores, buildFacultyStudents } from "./useFaculty";
import { api } from "../../../convex/_generated/api";
import { backendQuerySafe, isBackendConfigured } from "../../../lib/convexBrowser";
import { getSessionToken } from "../../../lib/session";

/**
 * A real overview page. Previously "Dashboard" and "Programs (FDPs)" in the
 * sidebar both landed on the same route with the same default tab, so clicking
 * Dashboard from anywhere just re-rendered the FDP list — there was no
 * overview at all.
 */
export default function AcademicianDashboard() {
  const { user } = useAuth();
  const navigate = useNav();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const students = useMemo(() => (ready && user ? buildFacultyStudents(user) : []), [user, ready]);
  const advisees = useMemo(() => students.filter((s) => s.isAdvisee), [students]);
  const programs = useMemo(() => (ready ? listPrograms() : []), [ready]);
  const myPrograms = useMemo(() => programs.filter((p) => p.ownerId === user?.id), [programs, user]);
  const listings = useMemo(() => (ready && user ? listCollabListingsByOwner(user.id) : []), [user, ready]);
  const outputs = useMemo(() => (ready && user ? listResearchOutputs(user.id) : []), [user, ready]);
  /* Office hours live in Convex now, because they are two-sided — a slot
     published here has to be bookable by a student on another device. */
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    if (!isBackendConfigured() || !getSessionToken()) return;
    let cancelled = false;
    backendQuerySafe(api.mentorship.mySlots, {}, []).then((rows) => {
      if (!cancelled) setSlots(rows || []);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const pendingCollabs = useMemo(
    () => (ready ? SEED_COLLABS.filter((c) => c.status === "Pending Review" && !getCollabResponse(c.id)) : []),
    [ready]
  );

  const interests = useMemo(
    () => (ready ? listings.flatMap((l) => listCollabInterests(l.id).map((i) => ({ ...i, listingTitle: l.title }))) : []),
    [listings, ready]
  );

  const weakAreas = useMemo(() => averageDomainScores(advisees.length ? advisees : students).slice(0, 3), [advisees, students]);

  const slipping = useMemo(
    () => (advisees.length ? advisees : students).filter((s) => s.score != null && s.score < 60).sort((a, b) => a.score - b.score).slice(0, 4),
    [advisees, students]
  );

  const upcomingBookings = useMemo(
    () =>
      slots
        .flatMap((slot) => (slot.bookings || []).map((b) => ({ ...b, slot })))
        .filter((b) => b.status !== "Cancelled" && new Date(b.slot.slot).getTime() > Date.now())
        .sort((a, b) => new Date(a.slot.slot) - new Date(b.slot.slot))
        .slice(0, 4),
    [slots]
  );

  const seatAlerts = useMemo(
    () =>
      myPrograms
        .map((p) => {
          const regs = listProgramRegistrations(p.id);
          const confirmed = regs.filter((r) => r.status === "Confirmed").length;
          const waitlisted = regs.filter((r) => r.status === "Waitlisted").length;
          return { ...p, confirmed, waitlisted, fill: p.seats ? Math.round((confirmed / p.seats) * 100) : 0 };
        })
        .sort((a, b) => b.fill - a.fill),
    [myPrograms]
  );

  const openMilestones = useMemo(() => {
    if (!ready) return [];
    const accepted = SEED_COLLABS.filter((c) => c.status === "Active" || getCollabResponse(c.id) === "Accepted");
    return accepted
      .flatMap((c) => listCollabMilestones(c.id).map((m) => ({ ...m, collabTitle: c.title })))
      .filter((m) => !m.done)
      .sort((a, b) => (a.due || "").localeCompare(b.due || ""))
      .slice(0, 4);
  }, [ready]);

  // A single chronological feed, so the things needing a response are in one place.
  const feed = useMemo(() => {
    const items = [
      ...pendingCollabs.map((c) => ({
        icon: "🔬",
        text: `${c.initiator} sent a research collaboration request`,
        detail: c.title,
        at: null,
        action: () => navigate("academician-collabs"),
        tone: "amber",
      })),
      ...interests.map((i) => ({
        icon: "🤝",
        text: `${i.name} expressed interest in your listing`,
        detail: i.listingTitle,
        at: i.at,
        action: () => navigate("academician-collabs"),
        tone: "primary",
      })),
      ...seatAlerts
        .filter((p) => p.waitlisted > 0 || p.fill >= 90)
        .map((p) => ({
          icon: "🪑",
          text: p.waitlisted > 0 ? `${p.waitlisted} on the waitlist for your programme` : "Your programme is nearly full",
          detail: p.title,
          at: p.createdAt,
          action: () => navigate("academician-programs"),
          tone: "amber",
        })),
      ...slipping.map((s) => ({
        icon: "📉",
        text: `${s.name}'s skill score has slipped to ${s.score}`,
        detail: `${s.department} · ${s.year || s.batch}`,
        at: null,
        action: () => navigate("academician-students"),
        tone: "red",
      })),
      ...upcomingBookings.map((b) => ({
        icon: "📅",
        text: `${b.studentName} booked a mentoring slot`,
        detail: `${formatDateTime(b.slot.slot)}${b.topic ? ` · ${b.topic}` : ""}`,
        at: b.bookedAt,
        action: () => navigate("academician-mentorship"),
        tone: "primary",
      })),
    ];
    return items.slice(0, 8);
  }, [pendingCollabs, interests, seatAlerts, slipping, upcomingBookings, navigate]);

  const placedAdvisees = advisees.filter((s) => s.status === "Placed").length;
  const departmentCount = students.filter((s) => s.department === user?.department).length;

  // "Dr. Shalini Kulkarni" reads better as "Dr. Kulkarni" than either the bare
  // surname or a title-less first name.
  const greetingName = useMemo(() => {
    const parts = (user?.name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "Professor";
    const title = /^(dr|prof|professor)\.?$/i.test(parts[0]) ? parts[0] : null;
    return title && parts.length > 1 ? `${title} ${parts[parts.length - 1]}` : parts[0];
  }, [user]);

  return (
    <DashboardLayout activePage="academician-dashboard" title="Faculty Dashboard">
      <div className="animate-fade-slide space-y-6">
        <PageHeader
          eyebrow="Academician Workspace"
          title={`Good to see you, ${greetingName}`}
          subtitle={`${user?.designation ? `${user.designation} · ` : ""}${user?.department || "Faculty"} · ${user?.institution || ""}`}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("academician-collabs")}>Research hub</Button>
              <Button size="sm" onClick={() => navigate("academician-programs")}>Host a programme</Button>
            </>
          }
        />

        <StatGrid
          stats={[
            { label: "My advisees", value: String(advisees.length), icon: "🎓", hint: `${departmentCount} in my department` },
            { label: "Advisees placed", value: String(placedAdvisees), icon: "✅", hint: advisees.length ? `${Math.round((placedAdvisees / advisees.length) * 100)}% of my students` : "—" },
            { label: "Programmes hosted", value: String(myPrograms.length), icon: "📘", hint: `${seatAlerts.reduce((s, p) => s + p.confirmed, 0)} registrations` },
            { label: "Active collaborations", value: String(listings.length + SEED_COLLABS.filter((c) => getCollabResponse(c.id) === "Accepted" || c.status === "Active").length), icon: "🔬" },
            { label: "Research outputs", value: String(outputs.length), icon: "📄", hint: outputs.filter((o) => o.type === "Patent").length ? `${outputs.filter((o) => o.type === "Patent").length} patent(s)` : "Papers & patents" },
          ]}
          columns={5}
        />

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <Section
              title="Needs your attention"
              description="Collaboration requests, seat movement on your programmes, students slipping, and booked mentoring slots."
            >
              {feed.length === 0 ? (
                <EmptyState icon="✅" title="You're all caught up">
                  Nothing is waiting on you right now.
                </EmptyState>
              ) : (
                <div className="space-y-1.5">
                  {feed.map((f, i) => (
                    <button
                      key={i}
                      onClick={f.action}
                      className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border border-transparent hover:border-border hover:bg-secondary/60 transition-all"
                    >
                      <IconTile icon={f.icon} tone={f.tone} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground leading-snug">{f.text}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{f.detail}</div>
                      </div>
                      {f.at && <span className="text-[10px] text-muted-foreground flex-shrink-0">{relativeTime(f.at)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section
              title="Where my students are weakest"
              description={advisees.length ? "Across your advisees." : "Across your department cohort."}
              actions={<button onClick={() => navigate("academician-alignment")} className="text-xs text-primary font-medium hover:underline">Details →</button>}
            >
              {weakAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No completed assessments yet.</p>
              ) : (
                <div className="space-y-3">
                  {weakAreas.map((w) => (
                    <div key={w.domain}>
                      <div className="flex items-center justify-between text-xs mb-1 gap-2">
                        <span className="text-foreground truncate">{w.domain}</span>
                        <span className={`font-semibold flex-shrink-0 ${w.avg < 60 ? "text-red-600" : "text-amber-600"}`}>{w.avg}%</span>
                      </div>
                      <ProgressBar value={w.avg} />
                      <div className="text-[10px] text-muted-foreground mt-1">{w.assessed} student{w.assessed === 1 ? "" : "s"} assessed</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <Section
              title="My advisees"
              actions={<button onClick={() => navigate("academician-students")} className="text-xs text-primary font-medium hover:underline">Manage →</button>}
            >
              {advisees.length === 0 ? (
                <EmptyState icon="🎓" title="No advisees assigned yet" action={<Button size="sm" onClick={() => navigate("academician-students")}>Assign students</Button>}>
                  Assign students from your department as advisees to track them here.
                </EmptyState>
              ) : (
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 flex-shrink-0 sm:w-24 sm:border-r sm:border-border sm:pr-5">
                    <ProgressRing
                      value={placedAdvisees}
                      max={advisees.length || 1}
                      size={78}
                      stroke={7}
                      sublabel="Placed"
                    />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    {advisees.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 border border-border rounded-xl px-3 py-2.5 hover:border-primary/30 hover:bg-secondary/30 transition-colors">
                        <Avatar name={s.name} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{s.course || s.department} · {s.year || s.batch}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {s.flag && <Badge tone={FLAG_TONE[s.flag]}>{s.flag}</Badge>}
                          <Badge tone={PLACEMENT_TONE[s.status]}>{s.status}</Badge>
                          <span className="text-xs font-semibold text-foreground w-6 text-right">{s.score ?? "—"}</span>
                        </div>
                      </div>
                    ))}
                    {advisees.length > 5 && (
                      <p className="text-[11px] text-muted-foreground text-center pt-1">+{advisees.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section
              title="Upcoming"
              actions={<button onClick={() => navigate("academician-mentorship")} className="text-xs text-primary font-medium hover:underline">Calendar →</button>}
            >
              <div className="space-y-3">
                {upcomingBookings.length === 0 && seatAlerts.length === 0 && openMilestones.length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled.</p>
                )}
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-2.5">
                    <IconTile icon="📅" tone="primary" size={30} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground">Mentoring — {b.studentName}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDateTime(b.slot.slot)} · {b.slot.mode}</div>
                    </div>
                  </div>
                ))}
                {seatAlerts.slice(0, 2).map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <IconTile icon="📘" tone="blue" size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground">{p.dates} · {p.confirmed}/{p.seats} seats{p.waitlisted ? ` · ${p.waitlisted} waitlisted` : ""}</div>
                    </div>
                  </div>
                ))}
                {openMilestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <IconTile icon="🎯" tone="amber" size={30} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground">{m.title}</div>
                      <div className="text-[11px] text-muted-foreground">Due {formatDate(m.due)} · {m.collabTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
