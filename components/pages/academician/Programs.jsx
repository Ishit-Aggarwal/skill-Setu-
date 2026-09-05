"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Field, Flash, Modal, PageHeader, ProgressBar, ProgressRing, Section, Select, StatGrid, Tabs, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { relativeTime } from "../../../lib/match";
import {
  cancelProgram,
  cancelProgramRegistration,
  createProgram,
  downloadFile,
  issueProgramCertificates,
  listProgramFeedback,
  listProgramRegistrations,
  listProgramRegistrationsForUser,
  listPrograms,
  markProgramAttendance,
  registerForProgram,
  setProgramRegistrationStatus,
  submitProgramFeedback,
  toCsv,
  updateProgram,
} from "../../../lib/store";
import { subscribeToMutations } from "../../../lib/sync";
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  datesCovered,
  extractDatesFromLegacy,
  formatDateRange,
  monthGrid,
  parseIsoDate,
  programmeDates,
  todayIso,
  validateDateRange,
} from "../../../lib/dates";

const MODE_TONE = { Hybrid: "blue", Online: "green", Onsite: "amber" };
const STATUS_TONE = { Open: "green", Completed: "muted", Cancelled: "red" };

export default function Programs() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState("hosting");
  const [flash, setFlash] = useFlash();
  const [showHost, setShowHost] = useState(false);
  const [editing, setEditing] = useState(null);
  const [manageId, setManageId] = useState(null);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [calView, setCalView] = useState("month");
  const [calDate, setCalDate] = useState(() => new Date(2026, 11, 1));
  const [selectedProgram, setSelectedProgram] = useState(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    const unsub = subscribeToMutations(["programs", "programRegistrations"], () => {
      setVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const programs = useMemo(() => (ready ? listPrograms() : []), [ready, version]);
  const hosting = useMemo(() => programs.filter((p) => p.ownerId === user?.id), [programs, user]);
  const myRegistrations = useMemo(() => (ready && user ? listProgramRegistrationsForUser(user.id) : []), [user, ready, version]);
  const registeredIds = useMemo(() => new Set(myRegistrations.map((r) => r.programId)), [myRegistrations]);
  const attending = useMemo(() => programs.filter((p) => registeredIds.has(p.id)), [programs, registeredIds]);

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  function handleDuplicate(prog) {
    const { id, _id, createdAt, status, enrolled, ...rest } = prog;
    createProgram(user.id, user.institution || user.name, {
      ...rest,
      title: `${prog.title} (Copy)`,
      linkPushCount: 0,
      lastPushedAt: undefined,
    });
    bump(`Duplicated "${prog.title}".`);
  }

  function handleCancelProgram(prog) {
    cancelProgram(prog.id, "Cancelled by host");
    bump(`"${prog.title}" has been cancelled.`);
  }

  function handleCancelRegistration(prog) {
    cancelProgramRegistration(prog.id, user.id);
    bump(`Withdrawn from "${prog.title}".`);
  }

  const calendar = useMemo(
    () =>
      [...hosting.map((p) => ({ ...p, role: "Hosting" })), ...attending.map((p) => ({ ...p, role: "Attending" }))]
        .filter((p) => p.status !== "Cancelled")
        .sort((a, b) => (a.dates || "").localeCompare(b.dates || "")),
    [hosting, attending]
  );

  const enrichedCalendar = useMemo(
    () =>
      calendar.map((p) => {
        const legacy = extractDatesFromLegacy(p.dates);
        const startIso = p.startDate || legacy.startDate || "";
        const endIso = p.endDate || legacy.endDate || startIso;
        const covered = datesCovered(startIso, endIso);
        return {
          ...p,
          startIso,
          endIso,
          covered,
          displayDates: programmeDates(p),
        };
      }),
    [calendar]
  );

  const totalRegistrations = hosting.reduce((s, p) => s + listProgramRegistrations(p.id).length, 0);
  const totalWaitlisted = hosting.reduce((s, p) => s + listProgramRegistrations(p.id).filter((r) => r.status === "Waitlisted").length, 0);

  function ProgramCard({ program, mine }) {
    const regs = listProgramRegistrations(program.id);
    const confirmed = regs.filter((r) => r.status === "Confirmed").length;
    const waitlisted = regs.filter((r) => r.status === "Waitlisted").length;
    const remainingSeats = Math.max(0, (program.seats || 0) - confirmed);
    const isFull = confirmed >= (program.seats || 0);
    const fill = program.seats ? Math.round((confirmed / program.seats) * 100) : 0;
    const myReg = myRegistrations.find((r) => r.programId === program.id);

    return (
      <Card hover>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground mb-0.5">{program.title}</div>
            <div className="text-xs text-muted-foreground">{program.organiser}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge tone={MODE_TONE[program.mode] || "muted"}>{program.mode}</Badge>
            <Badge tone={STATUS_TONE[program.status] || "green"}>{program.status || "Open"}</Badge>
          </div>
        </div>

        {program.description && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{program.description}</p>}

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary/60 rounded-full px-2.5 py-1">📅 {program.dates}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary/60 rounded-full px-2.5 py-1">🪑 {remainingSeats}/{program.seats} seats left</span>
          {waitlisted > 0 && <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">⏳ {waitlisted} waitlisted</span>}
          {program.venue && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary/60 rounded-full px-2.5 py-1 truncate max-w-[14rem]">📍 {program.venue}</span>}
        </div>

        <div className="mb-4"><ProgressBar value={fill} tone={fill >= 90 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-primary"} /></div>

        {mine ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setManageId(program.id)}>Manage attendees ({regs.length})</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(program)}>Edit</Button>
            {program.status !== "Cancelled" && (
              <Button size="sm" variant="danger" onClick={() => { cancelProgram(program.id); bump("Programme cancelled — registrants keep their record."); }}>
                Cancel
              </Button>
            )}
          </div>
        ) : myReg ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={myReg.status === "Confirmed" ? "green" : "amber"}>
              {myReg.status === "Confirmed" ? "✓ Your seat is confirmed" : "On the waitlist"}
            </Badge>
            {myReg.certificateNo && (
              <a
                href={`/academician/programs/certificate/${myReg.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                title="View & print certificate"
              >
                <Badge tone="primary">Certificate {myReg.certificateNo} ↗</Badge>
              </a>
            )}
            <button onClick={() => { cancelProgramRegistration(myReg.id); bump("Registration cancelled."); }} className="text-xs text-muted-foreground hover:text-red-600">
              Cancel registration
            </button>
            <button onClick={() => setFeedbackFor(program)} className="text-xs text-primary hover:underline ml-auto">Give feedback</button>
          </div>
        ) : (
          <Button
            className="w-full"
            variant={isFull ? "outline" : "primary"}
            disabled={isFull}
            onClick={() => {
              if (isFull) return;
              const reg = registerForProgram(program.id, user.id, {
                name: user.name,
                email: user.email,
                institution: user.institution,
                designation: user.designation || "Faculty",
              });
              bump(reg.status === "Confirmed" ? "Seat confirmed." : "Programme is full — you've been added to the waitlist.");
            }}
          >
            {isFull ? "Fully Booked" : "Register"}
          </Button>
        )}
      </Card>
    );
  }

  return (
    <DashboardLayout activePage="academician-programs" title="Faculty Development Programs">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Faculty Development Programs"
          subtitle="Host your own programmes with a managed roster, waitlist and certificates — and register for those run by peer institutions."
          actions={<Button size="sm" onClick={() => setShowHost(true)}>Host a programme</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Hosting", value: String(hosting.length), icon: "📘" },
            { label: "Registrations received", value: String(totalRegistrations), icon: "👥", hint: totalWaitlisted ? `${totalWaitlisted} waitlisted` : "No waitlist" },
            { label: "Attending", value: String(attending.length), icon: "🎫" },
            { label: "Certificates issued", value: String(hosting.reduce((s, p) => s + listProgramRegistrations(p.id).filter((r) => r.certificateNo).length, 0)), icon: "🏅" },
          ]}
        />

        <Tabs
          tabs={[
            { key: "hosting", label: `Hosting (${hosting.length})` },
            { key: "browse", label: "Browse programmes" },
            { key: "calendar", label: "My calendar" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "hosting" && (
          <div className="space-y-4">
            {hosting.length === 0 ? (
              <EmptyState icon="📘" title="You're not hosting anything yet" action={<Button size="sm" onClick={() => setShowHost(true)}>Host a programme</Button>}>
                Publish an FDP and manage its roster, waitlist, attendance and certificates from here.
              </EmptyState>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {hosting.map((p) => <ProgramCard key={p.id} program={p} mine />)}
              </div>
            )}
          </div>
        )}

        {tab === "browse" && (
          <div className="grid lg:grid-cols-2 gap-4">
            {programs.filter((p) => p.ownerId !== user?.id).map((p) => <ProgramCard key={p.id} program={p} />)}
          </div>
        )}

        {tab === "calendar" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    calView === "week"
                      ? setCalDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))
                      : setCalDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  aria-label="Previous"
                  className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors"
                >
                  ←
                </button>
                <div className="text-sm font-semibold text-foreground min-w-[140px] text-center">
                  {MONTH_NAMES[calDate.getMonth()]} {calDate.getFullYear()}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    calView === "week"
                      ? setCalDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))
                      : setCalDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                  aria-label="Next"
                  className="px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setCalDate(new Date())}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground font-medium transition-colors ml-1"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border text-xs">
                {["month", "week", "list"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCalView(v)}
                    className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                      calView === v
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {calView === "month" && (
              <Card className="p-3 sm:p-4">
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground mb-2">
                  {WEEKDAY_NAMES.map((w) => (
                    <div key={w} className="py-1">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {monthGrid(calDate.getFullYear(), calDate.getMonth()).map((cell, idx) => {
                    const dayProgs = enrichedCalendar.filter((p) => p.covered.includes(cell.iso));
                    return (
                      <div
                        key={idx}
                        className={`min-h-[85px] sm:min-h-[105px] border rounded-xl p-1.5 flex flex-col justify-between transition-colors ${
                          cell.inMonth
                            ? cell.isToday
                              ? "bg-primary/5 border-primary/40 font-semibold"
                              : "bg-background border-border"
                            : "bg-secondary/20 border-transparent opacity-40 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs ${
                              cell.isToday
                                ? "w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold"
                                : "text-muted-foreground font-medium"
                            }`}
                          >
                            {cell.date.getDate()}
                          </span>
                          {dayProgs.length > 0 && (
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              {dayProgs.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px]">
                          {dayProgs.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedProgram(p)}
                              title={`${p.title} (${p.mode}) — Click for options`}
                              className={`w-full text-left truncate text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded font-medium transition-all ${
                                p.role === "Hosting"
                                  ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:opacity-80 border border-emerald-300/40"
                              }`}
                            >
                              {p.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {calView === "week" && (
              <Card className="p-3 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                  {(() => {
                    const curr = new Date(calDate);
                    const dayOfWeek = (curr.getDay() + 6) % 7;
                    const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayOfWeek);
                    return Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
                      const pad = (n) => String(n).padStart(2, "0");
                      const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                      const isToday = iso === todayIso();
                      const progs = enrichedCalendar.filter((p) => p.covered.includes(iso));
                      return (
                        <div
                          key={iso}
                          className={`border rounded-xl p-2.5 min-h-[140px] flex flex-col ${
                            isToday ? "bg-primary/5 border-primary/50" : "bg-background border-border"
                          }`}
                        >
                          <div className="text-xs font-semibold text-muted-foreground mb-1">
                            {WEEKDAY_NAMES[i]} <span className="text-foreground">{d.getDate()}</span>
                          </div>
                          <div className="space-y-1.5 flex-1">
                            {progs.length === 0 ? (
                              <div className="text-[11px] text-muted-foreground italic mt-2">Free</div>
                            ) : (
                              progs.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setSelectedProgram(p)}
                                  className="w-full text-left p-1.5 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors space-y-1"
                                >
                                  <div className="text-xs font-medium text-foreground truncate">{p.title}</div>
                                  <div className="flex items-center gap-1">
                                    <Badge size="xs" tone={p.role === "Hosting" ? "primary" : "green"}>
                                      {p.role}
                                    </Badge>
                                    <Badge size="xs" tone={MODE_TONE[p.mode] || "muted"}>
                                      {p.mode}
                                    </Badge>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>
            )}

            {calView === "list" && (
              <Section title="Upcoming programmes" description="Everything you're hosting or attending, in date order.">
                {enrichedCalendar.length === 0 ? (
                  <EmptyState icon="📅" title="Nothing on the calendar">Register for a programme, or host your own.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    {enrichedCalendar.map((p) => (
                      <div
                        key={`${p.id}-${p.role}`}
                        onClick={() => setSelectedProgram(p)}
                        className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 cursor-pointer transition-all"
                      >
                        <div className="w-14 text-center flex-shrink-0">
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {p.displayDates.split(" ")[0]}
                          </div>
                          <div className="text-sm font-bold text-foreground truncate">
                            {p.displayDates.split(" ")[1]?.split("–")[0] || "—"}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">{p.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {p.organiser} · {p.displayDates}
                          </div>
                        </div>
                        <Badge tone={p.role === "Hosting" ? "primary" : "green"}>{p.role}</Badge>
                        <Badge tone={MODE_TONE[p.mode] || "muted"}>{p.mode}</Badge>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProgram(p);
                          }}
                        >
                          Actions
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}
          </div>
        )}
      </div>

      {showHost && (
        <Modal title="Host a Faculty Development Program" onClose={() => setShowHost(false)}>
          <ProgramForm
            onCancel={() => setShowHost(false)}
            onSubmit={(data) => {
              createProgram(user.id, user.institution || user.name, data);
              setShowHost(false);
              setTab("hosting");
              bump("Programme published — registrations are open.");
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit programme" onClose={() => setEditing(null)}>
          <ProgramForm
            program={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(data) => {
              updateProgram(editing.id, data);
              setEditing(null);
              bump("Programme updated.");
            }}
          />
        </Modal>
      )}

      {manageId && (
        <AttendeesModal
          program={programs.find((p) => p.id === manageId)}
          onClose={() => setManageId(null)}
          onChange={bump}
        />
      )}

      {feedbackFor && (
        <Modal title="Programme feedback" description={feedbackFor.title} onClose={() => setFeedbackFor(null)}>
          <FeedbackForm
            onCancel={() => setFeedbackFor(null)}
            onSubmit={(data) => {
              submitProgramFeedback(feedbackFor.id, user.id, { ...data, name: user.name });
              setFeedbackFor(null);
              bump("Thanks — your feedback has been recorded.");
            }}
          />
        </Modal>
      )}
      {selectedProgram && (
        <Modal
          title={selectedProgram.title}
          description={`${selectedProgram.role} · ${selectedProgram.displayDates || selectedProgram.dates}`}
          onClose={() => setSelectedProgram(null)}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={MODE_TONE[selectedProgram.mode] || "muted"}>{selectedProgram.mode}</Badge>
              <Badge tone={STATUS_TONE[selectedProgram.status] || "green"}>{selectedProgram.status || "Open"}</Badge>
              <span className="text-xs text-muted-foreground">{selectedProgram.organiser}</span>
            </div>

            {selectedProgram.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedProgram.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-xl text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Dates</span>
                <span className="font-medium text-foreground">{selectedProgram.displayDates || selectedProgram.dates}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Capacity</span>
                <span className="font-medium text-foreground">{selectedProgram.seats || 30} seats</span>
              </div>
              {selectedProgram.venue && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Venue</span>
                  <span className="font-medium text-foreground">📍 {selectedProgram.venue}</span>
                </div>
              )}
              {selectedProgram.mode === "Online" && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Online Meeting Link</span>
                  {selectedProgram.meetingUrl ? (
                    <a
                      href={selectedProgram.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium break-all flex items-center gap-1 mt-0.5"
                    >
                      🔗 {selectedProgram.meetingUrl}
                    </a>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                      ⚠️ No meeting link provided yet. (Required at least 1 day before start)
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {selectedProgram.role === "Hosting" ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      const prog = selectedProgram;
                      setSelectedProgram(null);
                      setManageId(prog.id);
                    }}
                  >
                    Manage attendees
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const prog = selectedProgram;
                      setSelectedProgram(null);
                      setEditing(prog);
                    }}
                  >
                    Edit details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleDuplicate(selectedProgram);
                      setSelectedProgram(null);
                    }}
                  >
                    Duplicate
                  </Button>
                  {selectedProgram.status !== "Cancelled" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        handleCancelProgram(selectedProgram);
                        setSelectedProgram(null);
                      }}
                    >
                      Cancel programme
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {selectedProgram.status !== "Cancelled" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        handleCancelRegistration(selectedProgram);
                        setSelectedProgram(null);
                      }}
                    >
                      Withdraw registration
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const prog = selectedProgram;
                      setSelectedProgram(null);
                      setFeedbackFor(prog);
                    }}
                  >
                    Give feedback
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function AttendeesModal({ program, onClose, onChange }) {
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  if (!program) return null;

  const regs = listProgramRegistrations(program.id);
  const feedback = listProgramFeedback(program.id);
  const confirmed = regs.filter((r) => r.status === "Confirmed");
  const waitlisted = regs.filter((r) => r.status === "Waitlisted");
  const attended = regs.filter((r) => r.attended).length;
  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.length).toFixed(1) : null;

  function refresh(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
    onChange();
  }

  const columns = [
    {
      key: "name",
      header: "Attendee",
      render: (r) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={r.name || "?"} size={30} />
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">{r.name || "Unnamed"}</div>
            <div className="text-[11px] text-muted-foreground truncate">{r.institution || r.email}</div>
          </div>
        </div>
      ),
    },
    { key: "designation", header: "Role", hideBelow: "hidden sm:table-cell", render: (r) => <span className="text-xs text-muted-foreground">{r.designation || "—"}</span> },
    {
      key: "status",
      header: "Seat",
      align: "center",
      render: (r) => (
        <Select value={r.status} onChange={(e) => { setProgramRegistrationStatus(r.id, e.target.value); refresh(); }} className="w-auto text-xs py-1.5 mx-auto">
          {["Confirmed", "Waitlisted"].map((s) => <option key={s}>{s}</option>)}
        </Select>
      ),
    },
    {
      key: "attended",
      header: "Attended",
      align: "center",
      render: (r) => (
        <input
          type="checkbox"
          checked={!!r.attended}
          onChange={(e) => { markProgramAttendance(r.id, e.target.checked); refresh(); }}
          className="w-4 h-4 accent-primary"
          aria-label={`Mark ${r.name} as attended`}
        />
      ),
    },
    {
      key: "certificate",
      header: "Certificate",
      align: "center",
      render: (r) =>
        r.certificateNo ? (
          <a
            href={`/academician/programs/certificate/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition inline-flex items-center"
            title="View & print certificate"
          >
            <Badge tone="green">{r.certificateNo} ↗</Badge>
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button onClick={() => { cancelProgramRegistration(r.id); refresh("Registration removed; the next waitlisted attendee was promoted."); }} className="text-xs text-muted-foreground hover:text-red-600">
          Remove
        </button>
      ),
    },
  ];

  return (
    <Modal title="Attendee management" description={program.title} onClose={onClose} size="xl">
      <div className="space-y-4">
        <Flash message={flash} />

        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-shrink-0 flex sm:flex-col items-center gap-3 sm:border-r sm:border-border sm:pr-5">
            <ProgressRing value={confirmed.length} max={program.seats || 1} size={76} stroke={7} sublabel="Seats filled" />
          </div>
          <div className="flex-1 min-w-0">
            <StatGrid
              columns={3}
              stats={[
                { label: "Waitlisted", value: String(waitlisted.length), icon: "⏳" },
                { label: "Attended", value: String(attended), icon: "✅" },
                { label: "Feedback", value: avgRating ? `${avgRating}/5` : "—", icon: "⭐", hint: `${feedback.length} response(s)` },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              const issued = issueProgramCertificates(program.id);
              refresh(issued ? `${issued} certificate${issued === 1 ? "" : "s"} issued.` : "Mark attendees present first — certificates go only to those who attended.");
            }}
          >
            Issue certificates
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              downloadFile(
                `${program.title.replace(/\W+/g, "-").toLowerCase()}-attendees.csv`,
                toCsv(regs, [
                  { label: "Name", value: (r) => r.name },
                  { label: "Email", value: (r) => r.email },
                  { label: "Institution", value: (r) => r.institution },
                  { label: "Designation", value: (r) => r.designation },
                  { label: "Seat status", value: (r) => r.status },
                  { label: "Attended", value: (r) => (r.attended ? "Yes" : "No") },
                  { label: "Certificate", value: (r) => r.certificateNo || "" },
                ])
              );
              setFlash("Attendee list exported.");
            }}
          >
            Export roster
          </Button>
        </div>

        <DataTable columns={columns} rows={regs} rowKey={(r) => r.id} empty="No registrations yet." />

        {feedback.length > 0 && (
          <Section title="Post-programme feedback">
            <div className="space-y-2">
              {feedback.map((f) => (
                <div key={f.id} className="border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">{f.name || "Anonymous"}</span>
                    <Badge tone={f.rating >= 4 ? "green" : f.rating >= 3 ? "amber" : "red"}>{f.rating}/5</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.comment}</p>
                  <div className="text-[10px] text-muted-foreground mt-1">{relativeTime(f.submittedAt)}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </Modal>
  );
}

function ProgramForm({ program, onCancel, onSubmit }) {
  const legacyDates = extractDatesFromLegacy(program?.dates);
  const [form, setForm] = useState({
    title: program?.title || "",
    startDate: program?.startDate || legacyDates.startDate || "",
    endDate: program?.endDate || legacyDates.endDate || "",
    seats: String(program?.seats || 30),
    mode: program?.mode || "Hybrid",
    venue: program?.venue || "",
    meetingUrl: program?.meetingUrl || "",
    description: program?.description || "",
  });
  const [dateError, setDateError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    const err = validateDateRange(form.startDate, form.endDate, { allowPast: !!program });
    if (err) {
      setDateError(err);
      return;
    }
    setDateError("");
    const formattedDates = formatDateRange(form.startDate, form.endDate);
    onSubmit({
      ...form,
      dates: formattedDates || program?.dates || "",
      seats: Number(form.seats) || 30,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Programme title">
        <TextInput
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Applied Machine Learning for Educators"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Start date" required>
          <TextInput
            type="date"
            required
            min={program ? undefined : todayIso()}
            value={form.startDate}
            onChange={(e) => {
              const val = e.target.value;
              set("startDate", val);
              setDateError("");
              if (!form.endDate || form.endDate < val) set("endDate", val);
            }}
          />
        </Field>
        <Field label="End date">
          <TextInput
            type="date"
            min={form.startDate || (program ? undefined : todayIso())}
            value={form.endDate}
            onChange={(e) => {
              set("endDate", e.target.value);
              setDateError("");
            }}
          />
        </Field>
      </div>
      {dateError && <p className="text-xs text-red-500 font-medium -mt-2">{dateError}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Seats">
          <TextInput
            type="number"
            min="1"
            value={form.seats}
            onChange={(e) => set("seats", e.target.value)}
          />
        </Field>
        <Field label="Mode">
          <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
            {["Hybrid", "Online", "Onsite"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>

      {form.mode === "Online" && (
        <Field
          label="Online Meeting Link (Google Meet / Zoom / Teams)"
          required
          hint="Required for online mode. Can be added or edited up to 1 day before the session. If missing by T-1 day, the session will be postponed automatically."
        >
          <TextInput
            type="url"
            required
            value={form.meetingUrl}
            onChange={(e) => set("meetingUrl", e.target.value)}
            placeholder="https://meet.google.com/xyz-abcd-efg"
          />
        </Field>
      )}

      {form.mode === "Onsite" && (
        <Field label="Venue" required hint="Campus building, hall, or room number.">
          <TextInput
            required
            value={form.venue}
            onChange={(e) => set("venue", e.target.value)}
            placeholder="e.g. Central Instrumentation Lab, Room 204"
          />
        </Field>
      )}

      {form.mode === "Hybrid" && (
        <div className="space-y-3">
          <Field label="Venue (Onsite location)">
            <TextInput
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
              placeholder="e.g. Auditorium Hall B"
            />
          </Field>
          <Field label="Meeting Link (Online livestream / stream link)">
            <TextInput
              type="url"
              value={form.meetingUrl}
              onChange={(e) => set("meetingUrl", e.target.value)}
              placeholder="https://meet.google.com/xyz-abcd-efg"
            />
          </Field>
        </div>
      )}

      <Field label="Description">
        <TextArea
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What the programme covers and who it's for."
        />
      </Field>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {program ? "Save changes" : "Publish programme"}
        </Button>
      </div>
    </form>
  );
}

function FeedbackForm({ onCancel, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ rating, comment }); }} className="space-y-4">
      <Field label="Overall rating">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                rating === n ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label="What worked, what didn't"><TextArea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Submit feedback</Button>
      </div>
    </form>
  );
}
