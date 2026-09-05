"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import Calendar from "../mentorship/Calendar";
import { useAuth } from "../../lib/auth";
import { backendErrorMessage } from "../../lib/convexBrowser";
import {
  LOCAL,
  bookSlot,
  cancelMyBooking,
  loadAvailableSlots,
  loadMyBookings,
  schedulingMode,
} from "../../lib/scheduling";
import {
  isMentorshipSaved,
  toggleSavedMentorship,
  listUsersByRole,
  requestMentorship,
  listMentorshipRequestsForStudent,
} from "../../lib/store";
import { formatDateTime, relativeTime } from "../../lib/match";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Flash,
  Modal,
  PageHeader,
  ProgressBar,
  Section,
  StatGrid,
  Tabs,
  TextArea,
  TextInput,
  useFlash,
} from "../ui/Kit";

const COLLEGES_DATA = [
  {
    id: "apex",
    name: "Apex University of Technology",
    city: "Bengaluru, Karnataka",
    type: "Autonomous University",
    nirfRank: "A++ NAAC Accredited",
    placementRate: 94,
    studentsCount: 1420,
    medianPackage: "₹8.4 LPA",
    medianStipend: "₹42,000/mo",
    highestPackage: "₹38.5 LPA",
    activeMentors: 28,
    topRecruiters: ["Apex Global", "Meridian Software", "Google", "Shakti Motors"],
    departments: [
      { name: "Computer Science & Engineering", placed: 95 },
      { name: "Electronics & Communication", placed: 91 },
      { name: "Mechanical Engineering", placed: 82 },
      { name: "Management Studies (MBA)", placed: 88 },
    ],
  },
  {
    id: "iitd",
    name: "Indian Institute of Technology Delhi (IIT Delhi)",
    city: "Hauz Khas, New Delhi",
    type: "Institute of National Importance",
    nirfRank: "NIRF Rank 2 (Engineering)",
    placementRate: 97,
    studentsCount: 3200,
    medianPackage: "₹18.5 LPA",
    medianStipend: "₹75,000/mo",
    highestPackage: "₹1.45 Cr",
    activeMentors: 64,
    topRecruiters: ["Microsoft", "Google", "Uber", "Goldman Sachs", "Tower Research"],
    departments: [
      { name: "Computer Science & Engineering", placed: 99 },
      { name: "Electrical Engineering", placed: 96 },
      { name: "Mathematics & Computing", placed: 98 },
      { name: "Mechanical Engineering", placed: 94 },
    ],
  },
  {
    id: "iisc",
    name: "Indian Institute of Science (IISc Bengaluru)",
    city: "CV Raman Rd, Bengaluru, Karnataka",
    type: "Premier Research University",
    nirfRank: "NIRF Rank 1 (University)",
    placementRate: 96,
    studentsCount: 1850,
    medianPackage: "₹21.0 LPA",
    medianStipend: "₹85,000/mo",
    highestPackage: "₹88 LPA",
    activeMentors: 52,
    topRecruiters: ["Google DeepMind", "Intel Labs", "Amazon AWS", "Microsoft Research"],
    departments: [
      { name: "Computer Science & Automation", placed: 98 },
      { name: "Computational & Data Sciences", placed: 97 },
      { name: "Electronic Systems", placed: 95 },
      { name: "AI & Robotics", placed: 96 },
    ],
  },
  {
    id: "nitk",
    name: "National Institute of Technology Karnataka (NIT Surathkal)",
    city: "Mangalore, Karnataka",
    type: "Institute of National Importance",
    nirfRank: "NIRF Rank 12 (Engineering)",
    placementRate: 92,
    studentsCount: 2600,
    medianPackage: "₹13.2 LPA",
    medianStipend: "₹50,000/mo",
    highestPackage: "₹54 LPA",
    activeMentors: 36,
    topRecruiters: ["Oracle", "Adobe", "Qualcomm", "Samsung R&D", "Wells Fargo"],
    departments: [
      { name: "Information Technology", placed: 96 },
      { name: "Computer Science & Engineering", placed: 95 },
      { name: "Electronics & Communication", placed: 91 },
      { name: "Mechanical Engineering", placed: 86 },
    ],
  },
  {
    id: "bits",
    name: "Birla Institute of Technology and Science (BITS Pilani)",
    city: "Pilani / Goa / Hyderabad",
    type: "Institute of Eminence",
    nirfRank: "NAAC Grade A",
    placementRate: 95,
    studentsCount: 3800,
    medianPackage: "₹16.8 LPA",
    medianStipend: "₹65,000/mo",
    highestPackage: "₹68 LPA",
    activeMentors: 45,
    topRecruiters: ["D.E. Shaw", "Nvidia", "Cisco", "Flipkart", "Morgan Stanley"],
    departments: [
      { name: "Computer Science", placed: 98 },
      { name: "Electrical & Electronics", placed: 94 },
      { name: "Economics & Finance", placed: 96 },
      { name: "Mechanical", placed: 90 },
    ],
  },
];

const SEED_MENTORS = [
  {
    id: "demo-academician",
    name: "Dr. Arvind Sundaram",
    designation: "Professor & Head of Computing",
    department: "Computer Science & Engineering",
    institution: "Apex University of Technology",
    rating: 4.9,
    reviewsCount: 38,
    sessionsCompleted: 54,
    expertise: ["Distributed Systems", "Cloud Architecture", "System Design", "Placement Prep"],
    bio: "20+ years guiding students through system design, distributed infrastructure and engineering career roadmaps. Former senior engineer at Bell Labs.",
    previousMentorships: "Mentored 80+ candidates with placements at Google, Microsoft, and premier research labs.",
  },
  {
    id: "mentor-iitd-sunita",
    name: "Prof. Sunita Krishnan",
    designation: "Associate Professor",
    department: "Computer Science & Engineering",
    institution: "Indian Institute of Technology Delhi (IIT Delhi)",
    rating: 4.95,
    reviewsCount: 46,
    sessionsCompleted: 62,
    expertise: ["Algorithms & Data Structures", "Competitive Programming", "AI/ML", "Higher Studies"],
    bio: "Ph.D. from Carnegie Mellon University. Mentors students on algorithmic rigor, Olympiad programming, and research publications in premier conferences.",
    previousMentorships: "Helped 40+ students secure global research internships and MS/Ph.D. admissions at CMU, Stanford and MIT.",
  },
  {
    id: "mentor-iisc-rajesh",
    name: "Dr. Rajesh Nair",
    designation: "Principal Research Faculty",
    department: "Computational & Data Sciences",
    institution: "Indian Institute of Science (IISc Bengaluru)",
    rating: 4.88,
    reviewsCount: 29,
    sessionsCompleted: 41,
    expertise: ["Deep Learning", "Generative AI", "Computer Vision", "Research Strategy"],
    bio: "Leads AI research initiatives at IISc with grants from Google and DST. Enthusiastic about mentoring undergraduates interested in applied machine learning.",
    previousMentorships: "Guided 30+ capstone and research theses resulting in IEEE/CVPR workshop publications.",
  },
  {
    id: "mentor-nitk-ananya",
    name: "Prof. Ananya Roy",
    designation: "Head of Industry Linkages",
    department: "Information Technology",
    institution: "National Institute of Technology Karnataka (NIT Surathkal)",
    rating: 4.92,
    reviewsCount: 34,
    sessionsCompleted: 48,
    expertise: ["Full Stack Development", "System Architecture", "Resume Review", "Mock Interviews"],
    bio: "Ex-Engineering Manager at Adobe. Passionate about bridging industry expectations with academic curriculum and behavioral interview coaching.",
    previousMentorships: "Over 50 mentees recruited into Tier-1 product tech roles across India and Southeast Asia.",
  },
];

function toneForAvailable(slot, mine) {
  if (new Date(slot.slot).getTime() < Date.now()) return "past";
  if (mine) return "booked";
  if (slot.remaining <= 0) return "full";
  if (slot.booked > 0) return "partial";
  return "open";
}

export default function StudentMentorship() {
  const { user } = useAuth();
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useFlash();
  const [tab, setTab] = useState("upcoming");
  const [view, setView] = useState("month");
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);

  const [savedIds, setSavedIds] = useState(() => new Set());
  const [myRequests, setMyRequests] = useState([]);
  const [requestingMentor, setRequestingMentor] = useState(null);
  const [requestTopic, setRequestTopic] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const [mentorSearch, setMentorSearch] = useState("");
  const [collegeSearch, setCollegeSearch] = useState("");

  const mode = schedulingMode();

  const load = useCallback(async () => {
    try {
      const [slots, bookings] = await Promise.all([loadAvailableSlots(user), loadMyBookings(user)]);
      setAvailable(slots || []);
      setMine(bookings || []);
      setSavedIds(new Set([...(slots || []), ...(bookings || [])].filter((s) => isMentorshipSaved(user?.id, s.id)).map((s) => s.id)));
      if (user?.id) {
        setMyRequests(listMentorshipRequestsForStudent(user.id) || []);
      }
      setError(null);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not load mentorship slots."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  function handleToggleSave(slot) {
    const nowSaved = toggleSavedMentorship(user.id, slot);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(slot.id);
      else next.delete(slot.id);
      return next;
    });
    setFlash(nowSaved ? "Saved — it's under Saved Mentorships." : "Removed from your saved mentorships.");
  }

  useEffect(() => {
    load();
  }, [load]);

  const myIds = useMemo(() => new Set(mine.map((m) => m.id)), [mine]);

  const events = useMemo(() => {
    const rows = tab === "upcoming" ? mine : available;
    return rows.map((s) => {
      const isMine = myIds.has(s.id);
      return {
        id: s.id,
        start: s.slot,
        durationMins: s.durationMins,
        title: isMine ? `${s.mentorName || "Mentor"} — ${s.title}` : s.title,
        subtitle: isMine ? s.mode : `${s.mentorName} · ${s.remaining} left`,
        tone: toneForAvailable(s, isMine),
        raw: s,
      };
    });
  }, [tab, mine, available, myIds]);

  const now = Date.now();
  const upcomingMine = mine.filter((m) => new Date(m.slot).getTime() >= now && m.booking?.status !== "Cancelled");
  const pastMine = mine.filter((m) => new Date(m.slot).getTime() < now);
  const bookable = available.filter((s) => new Date(s.slot).getTime() >= now && s.remaining > 0 && !myIds.has(s.id));

  const selectedSlot = useMemo(
    () => [...mine, ...available].find((s) => s.id === selected) || null,
    [selected, mine, available]
  );

  const allMentors = useMemo(() => {
    const registeredAcademicians = listUsersByRole("academician") || [];
    const map = new Map();

    SEED_MENTORS.forEach((m) => map.set(m.id, m));
    registeredAcademicians.forEach((a) => {
      const existing = map.get(a.id) || {};
      map.set(a.id, {
        ...existing,
        id: a.id,
        name: a.name || existing.name || "Faculty Mentor",
        designation: a.designation || existing.designation || "Faculty Mentor",
        department: a.department || existing.department || "Engineering",
        institution: a.institution || existing.institution || "Apex University of Technology",
        rating: existing.rating || 4.9,
        reviewsCount: existing.reviewsCount || 24,
        sessionsCompleted: existing.sessionsCompleted || 32,
        expertise: existing.expertise || ["System Architecture", "Academic Research", "Career Guidance"],
        bio: existing.bio || "Dedicated faculty mentor helping students prepare for internships, research and technical careers.",
        previousMentorships: existing.previousMentorships || "Guided over 30+ students in career planning and skill development.",
      });
    });

    return Array.from(map.values());
  }, []);

  const filteredMentors = useMemo(() => {
    const q = mentorSearch.trim().toLowerCase();
    if (!q) return allMentors;
    return allMentors.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.institution?.toLowerCase().includes(q) ||
        m.expertise?.some((e) => e.toLowerCase().includes(q))
    );
  }, [allMentors, mentorSearch]);

  const filteredColleges = useMemo(() => {
    const q = collegeSearch.trim().toLowerCase();
    if (!q) return COLLEGES_DATA;
    return COLLEGES_DATA.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.type?.toLowerCase().includes(q) ||
        c.nirfRank?.toLowerCase().includes(q)
    );
  }, [collegeSearch]);

  async function run(fn, message) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      if (message) setFlash(message);
      return true;
    } catch (err) {
      setError(backendErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleSendMentorshipRequest(e) {
    e.preventDefault();
    if (!requestingMentor) return;

    try {
      const fullMessage = `${requestTopic ? `[${requestTopic}] ` : ""}${requestNote.trim()}`;
      requestMentorship(user, requestingMentor, fullMessage);
      setRequestingMentor(null);
      setRequestTopic("");
      setRequestNote("");
      load();
      setFlash(`Mentorship request submitted to ${requestingMentor.name}! They have been notified.`);
    } catch (err) {
      setFlash(`⚠️ ${err.message}`);
    }
  }

  return (
    <DashboardLayout activePage="student-mentorship" title="Mentorship">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="Mentorship"
          title="Mentorship, Office Hours & Partner Colleges"
          subtitle={`Connect with top faculty across ${user?.institution || "partner universities"}. Book open office hours, explore verified mentors, or request personalized guidance.`}
        />

        <Flash message={flash} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}

        {mode === LOCAL && (
          <div className="rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Browsing verified session schedule.</span> Sign in with a
            full account to sync calendar invites directly to your phone.
          </div>
        )}

        <StatGrid
          columns={4}
          stats={[
            { label: "Upcoming sessions", value: String(upcomingMine.length), icon: "📅", tone: "primary" },
            { label: "Slots you can book", value: String(bookable.length), icon: "🪑" },
            { label: "Active mentors", value: String(allMentors.length), icon: "👨‍🏫" },
            { label: "Sessions attended", value: String(pastMine.filter((m) => m.booking?.status === "Completed").length), icon: "🎓" },
          ]}
        />

        <Tabs
          tabs={[
            { key: "upcoming", label: `My sessions (${mine.length})` },
            { key: "browse", label: `Open slots (${bookable.length})` },
            { key: "mentors", label: `Browse Mentors & Request (${allMentors.length})` },
            { key: "colleges", label: `Colleges & Stats (${COLLEGES_DATA.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {/* ---------------- Tab 1 & 2: Calendar & Open Slots ---------------- */}
        {(tab === "upcoming" || tab === "browse") && (
          <>
            {loading ? (
              <div className="h-96 rounded-2xl skeleton" />
            ) : (
              <Calendar
                events={events}
                view={view}
                onViewChange={setView}
                onSelectEvent={(e) => setSelected(e.id)}
                emptyMessage={
                  tab === "upcoming"
                    ? "You haven't booked any mentoring sessions yet. Switch to Open slots to find one."
                    : "No faculty has published open office hours right now. You can request a mentorship session directly from the Browse Mentors tab!"
                }
              />
            )}

            {tab === "upcoming" && upcomingMine.length > 0 && (
              <Section title="Next up" description="The same sessions as blocks above, listed for quick scanning.">
                <div className="grid md:grid-cols-2 gap-3">
                  {upcomingMine.map((s) => (
                    <Card key={s.id} hover as="button" className="text-left w-full" onClick={() => setSelected(s.id)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{s.mentorName}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {s.mentorDepartment || "Faculty"} · {s.title}
                          </div>
                        </div>
                        <Badge tone="primary">{s.mode}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>📅 {formatDateTime(s.slot)} · {s.durationMins} min</div>
                        {(s.mode === "Online" || s.mode === "Hybrid") && (
                          s.meetingUrl ? (
                            <div className="truncate text-primary font-medium">🔗 Meeting link ready (Click to view)</div>
                          ) : (
                            <div className="text-amber-600">🔗 Link not published yet</div>
                          )
                        )}
                        {(s.mode === "In person" || s.mode === "Hybrid") &&
                          (s.location ? (
                            <div className="truncate">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.location)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1 font-medium text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                📍 {s.location} <span className="text-[10px]">↗ (Google Maps)</span>
                              </a>
                            </div>
                          ) : (
                            <div>📍 Location to be confirmed</div>
                          ))}
                        {s.booking?.topic && <div className="truncate">💬 Topic: {s.booking.topic}</div>}
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {/* ---------------- Tab 3: Browse Mentors & Request ---------------- */}
        {tab === "mentors" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground flex-1">
                Browse verified faculty mentors, explore their previous mentorship outcomes, and request 1-on-1 guidance even if they don&apos;t have open slots right now.
              </p>
              <div className="relative min-w-[280px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
                <input
                  type="text"
                  value={mentorSearch}
                  onChange={(e) => setMentorSearch(e.target.value)}
                  placeholder="Search by mentor name, domain, or college..."
                  className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {mentorSearch && (
                  <button onClick={() => setMentorSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground">✕</button>
                )}
              </div>
            </div>

            {filteredMentors.length === 0 ? (
              <EmptyState icon="👨‍🏫" title="No mentors found">
                Try searching with another keyword, department or institution name.
              </EmptyState>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredMentors.map((mentor) => {
                  const mentorSlots = available.filter(
                    (s) => (s.mentorName === mentor.name || s.facultyId === mentor.id) && s.remaining > 0
                  );
                  const existingReq = myRequests.find((r) => r.facultyId === mentor.id);

                  return (
                    <Card key={mentor.id} className="flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar name={mentor.name} size={42} />
                            <div>
                              <div className="text-base font-semibold text-foreground">{mentor.name}</div>
                              <div className="text-xs text-muted-foreground">{mentor.designation} · {mentor.department}</div>
                              <div className="text-[11px] text-primary font-medium">{mentor.institution}</div>
                            </div>
                          </div>
                          <Badge tone="amber">★ {mentor.rating} ({mentor.reviewsCount})</Badge>
                        </div>

                        <p className="text-xs text-foreground/80 leading-relaxed mt-2.5">
                          {mentor.bio}
                        </p>

                        <div className="mt-3">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Areas of Expertise
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {mentor.expertise?.map((skill) => (
                              <span key={skill} className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium border border-border/60">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-snug">
                          <strong className="text-foreground font-medium">Mentorship Track Record: </strong>
                          {mentor.previousMentorships}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {mentorSlots.length > 0 ? (
                            <strong className="text-emerald-600 font-medium">✓ {mentorSlots.length} open slot{mentorSlots.length === 1 ? "" : "s"} ready</strong>
                          ) : (
                            "No open calendar slots currently"
                          )}
                        </span>

                        <div className="flex items-center gap-2 ml-auto">
                          {mentorSlots.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTab("browse");
                              }}
                            >
                              📅 View Slots
                            </Button>
                          )}
                          <Button
                            size="sm"
                            disabled={Boolean(existingReq && existingReq.status === "Pending")}
                            onClick={() => setRequestingMentor(mentor)}
                          >
                            {existingReq && existingReq.status === "Pending" ? "Request Pending" : "💬 Request Mentorship"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- Tab 4: Colleges & Stats ---------------- */}
        {tab === "colleges" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground flex-1">
                Explore affiliated colleges and institutes on SkillSetu. Inspect their placement statistics, average packages, key recruiters, and faculty mentors.
              </p>
              <div className="relative min-w-[280px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
                <input
                  type="text"
                  value={collegeSearch}
                  onChange={(e) => setCollegeSearch(e.target.value)}
                  placeholder="Search by college name, city, or ranking..."
                  className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {collegeSearch && (
                  <button onClick={() => setCollegeSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground">✕</button>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {filteredColleges.map((college) => (
                <Card key={college.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-base">{college.name}</h3>
                        <Badge tone="primary">{college.nirfRank}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        📍 {college.city} · {college.type}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-foreground">Overall Campus Placement Rate</span>
                      <span className="font-semibold text-emerald-600">{college.placementRate}%</span>
                    </div>
                    <ProgressBar value={college.placementRate} max={100} tone="green" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-border text-center">
                    <div className="p-2 bg-secondary/40 rounded-xl">
                      <div className="text-[10px] text-muted-foreground">Median Package</div>
                      <div className="text-sm font-semibold text-foreground">{college.medianPackage}</div>
                    </div>
                    <div className="p-2 bg-secondary/40 rounded-xl">
                      <div className="text-[10px] text-muted-foreground">Median Stipend</div>
                      <div className="text-sm font-semibold text-foreground">{college.medianStipend}</div>
                    </div>
                    <div className="p-2 bg-secondary/40 rounded-xl">
                      <div className="text-[10px] text-muted-foreground">Active Mentors</div>
                      <div className="text-sm font-semibold text-foreground">{college.activeMentors}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Department Placement Breakdown
                    </div>
                    <div className="space-y-2">
                      {college.departments.map((dept) => (
                        <div key={dept.name} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[200px]">{dept.name}</span>
                          <span className="font-medium text-foreground">{dept.placed}% placed</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Top Hiring Partners
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {college.topRecruiters.map((company) => (
                        <span key={company} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => {
                        setMentorSearch(college.name.split(" ")[0]);
                        setTab("mentors");
                      }}
                    >
                      👨‍🏫 View Mentors From This Institution →
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Detail Modal ---------------- */}
      {selectedSlot && (
        <Modal
          title={selectedSlot.title || "Office hours"}
          description={`${selectedSlot.mentorName || "Mentor"} · ${formatDateTime(selectedSlot.slot)} · ${selectedSlot.durationMins} min · ${selectedSlot.mode}`}
          onClose={() => setSelected(null)}
          size="lg"
          footer={
            myIds.has(selectedSlot.id) ? (
              new Date(selectedSlot.slot).getTime() > Date.now() ? (
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm("Cancel this session? The slot goes back into the pool for other students.")) return;
                    const ok = await run(
                      () => cancelMyBooking(user, selectedSlot.id),
                      "Booking cancelled."
                    );
                    if (ok) setSelected(null);
                  }}
                >
                  Cancel my booking
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground text-center">This session has already taken place.</p>
              )
            ) : selectedSlot.remaining > 0 && new Date(selectedSlot.slot).getTime() > Date.now() ? (
              <Button
                className="w-full"
                onClick={() => {
                  setBooking(selectedSlot);
                  setSelected(null);
                }}
              >
                Book this slot
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center">This slot is no longer available.</p>
            )
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{selectedSlot.mode}</Badge>
              {myIds.has(selectedSlot.id) ? (
                <Badge tone="green" dot>
                  You&apos;re booked
                </Badge>
              ) : (
                <Badge tone={selectedSlot.remaining > 0 ? "green" : "muted"}>
                  {selectedSlot.remaining > 0 ? `${selectedSlot.remaining} of ${selectedSlot.capacity} free` : "Full"}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => handleToggleSave(selectedSlot)}
                className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  savedIds.has(selectedSlot.id)
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {savedIds.has(selectedSlot.id) ? "★ Saved" : "☆ Save for later"}
              </button>
            </div>

            <dl className="divide-y divide-border text-sm">
              {[
                ["Mentor", selectedSlot.mentorName],
                ["Department", selectedSlot.mentorDepartment],
                ["When", formatDateTime(selectedSlot.slot)],
                ["Length", `${selectedSlot.durationMins} minutes`],
                (selectedSlot.mode === "In person" || selectedSlot.mode === "Hybrid")
                  ? [
                      "Where",
                      selectedSlot.location ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedSlot.location)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 font-medium text-xs"
                        >
                          📍 {selectedSlot.location} <span className="text-[10px]">↗ (Google Maps)</span>
                        </a>
                      ) : (
                        "To be confirmed"
                      ),
                    ]
                  : null,
                myIds.has(selectedSlot.id) && selectedSlot.booking?.topic ? ["Your topic", selectedSlot.booking.topic] : null,
                myIds.has(selectedSlot.id) && selectedSlot.booking?.bookedAt
                  ? ["Booked", relativeTime(selectedSlot.booking.bookedAt)]
                  : null,
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-xs text-muted-foreground flex-shrink-0">{label}</dt>
                    <dd className="text-sm text-foreground text-right">{value || "—"}</dd>
                  </div>
                ))}
            </dl>

            {(selectedSlot.mode === "Online" || selectedSlot.mode === "Hybrid") && (
              <div className="rounded-xl border border-border px-3.5 py-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Joining Online</div>
                {myIds.has(selectedSlot.id) ? (
                  selectedSlot.meetingUrl ? (
                    <a
                      href={selectedSlot.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary font-medium hover:underline break-all inline-flex items-center gap-1.5"
                    >
                      🔗 {selectedSlot.meetingUrl} <span className="text-xs">↗ (Join Meeting)</span>
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Your mentor hasn&apos;t added the meeting link yet.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">The meeting link appears here once you book the slot.</p>
                )}
              </div>
            )}

            {selectedSlot.notes && (
              <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">From your mentor: </span>
                {selectedSlot.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ---------------- Booking Modal ---------------- */}
      {booking && (
        <Modal
          title={`Book time with ${booking.mentorName}`}
          description={`${formatDateTime(booking.slot)} · ${booking.durationMins} min · ${booking.mode}`}
          onClose={() => setBooking(null)}
        >
          <BookingForm
            busy={busy}
            onCancel={() => setBooking(null)}
            onSubmit={async (topic) => {
              const ok = await run(
                () => bookSlot(user, booking, topic),
                `Slot booked with ${booking.mentorName}.`
              );
              if (ok) setBooking(null);
            }}
          />
        </Modal>
      )}

      {/* ---------------- Request Mentorship Modal ---------------- */}
      {requestingMentor && (
        <Modal
          title={`Request Mentorship with ${requestingMentor.name}`}
          description={`${requestingMentor.designation} · ${requestingMentor.department} at ${requestingMentor.institution}`}
          onClose={() => setRequestingMentor(null)}
        >
          <form onSubmit={handleSendMentorshipRequest} className="space-y-4">
            <Field label="Mentorship Objective / Topic" hint="What specific guidance or preparation do you need?">
              <TextInput
                required
                value={requestTopic}
                onChange={(e) => setRequestTopic(e.target.value)}
                placeholder="e.g. Portfolio Review & System Design Guidance for Summer Internships"
              />
            </Field>

            <Field label="Note for Mentor" hint="Introduce yourself and explain why you'd like to be mentored by them.">
              <TextArea
                required
                rows={3}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Share your current projects, questions, and learning goals..."
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setRequestingMentor(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Send Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function BookingForm({ onSubmit, onCancel, busy }) {
  const [topic, setTopic] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(topic);
      }}
      className="space-y-4"
    >
      <Field label="What would you like to discuss?" hint="Your mentor sees this before the session, so they can prepare.">
        <TextInput
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Choosing between two internship offers"
          maxLength={160}
        />
      </Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? "Booking…" : "Confirm booking"}
        </Button>
      </div>
    </form>
  );
}
