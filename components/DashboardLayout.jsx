"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import { useNav } from "../lib/nav";
import EditProfileModal from "./EditProfileModal";
import NotificationBell from "./NotificationBell";
import { useTheme } from "../lib/preferences";
import {
  listApplicationsForStudent,
  listSavedInternships,
  listSavedMentorships,
  listStudentNotifications,
} from "../lib/store";
import { subscribeToMutations } from "../lib/sync";
import { Avatar, IconTile } from "./ui/Kit";

function Icon({ children }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const IconGrid = () => (
  <Icon><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></Icon>
);
const IconBriefcase = () => (
  <Icon><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></Icon>
);
const IconBarChart = () => (
  <Icon><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></Icon>
);
const IconUser = () => (
  <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>
);
const IconTarget = () => (
  <Icon><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Icon>
);
const IconUsers = () => (
  <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>
);
const IconBookOpen = () => (
  <Icon><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Icon>
);
const IconFlask = () => (
  <Icon><path d="M9 3h6" /><path d="M10 9l-4.5 9A1 1 0 0 0 6.5 20h11a1 1 0 0 0 .9-1.45L14 9" /><line x1="10" y1="3" x2="10" y2="9" /><line x1="14" y1="3" x2="14" y2="9" /></Icon>
);
const IconGrid3 = () => (
  <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></Icon>
);
const IconCalendar = () => (
  <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>
);
const IconHandshake = () => (
  <Icon><path d="M11 17 8.5 14.5" /><path d="m2 12 4-4 5 5 2-2 5 5 4-4" /><path d="M2 12v4a2 2 0 0 0 2 2h2" /><path d="M22 12v4a2 2 0 0 1-2 2h-2" /></Icon>
);
const IconMegaphone = () => (
  <Icon><path d="m3 11 15-6v14L3 13z" /><path d="M7 12v5a2 2 0 0 0 2 2h1" /><path d="M18 8a3 3 0 0 1 0 6" /></Icon>
);
const IconBuilding = () => (
  <Icon><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="7" x2="9" y2="7" /><line x1="15" y1="7" x2="15" y2="7" /><line x1="9" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="15" y2="12" /><path d="M10 22v-4h4v4" /></Icon>
);
const IconCompass = () => (
  <Icon><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></Icon>
);
const IconCheckCircle = () => (
  <Icon><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>
);
const IconSettings = () => (
  <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconBookmark = () => (
  <Icon><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Icon>
);
const IconInbox = () => (
  <Icon><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Icon>
);
const IconSend = () => (
  <Icon><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Icon>
);
const IconGauge = () => (
  <Icon><path d="M12 20a8 8 0 1 1 8-8" /><path d="m12 12 5-3" /></Icon>
);

/**
 * Every nav item points at its own route. An earlier version pointed several
 * academician entries at the same page with only a `?tab=` difference, so
 * "Dashboard" and "Programs (FDPs)" rendered identical content and the active
 * marker lit up on all of them at once — each destination now has a real,
 * separately-populated page behind it.
 *
 * `section` starts a labelled group. The student rail has grown past the point
 * where a flat list of fourteen entries is scannable, and grouping is what
 * keeps "where do I find the roles I applied to" answerable at a glance.
 */
const NAV = {
  student: [
    { label: "Dashboard", short: "Home", page: "student-dashboard", icon: <IconGrid /> },
    { label: "Skill Tests", short: "Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Internships", short: "Jobs", page: "internship-listings", icon: <IconBriefcase /> },
    { label: "Mentorship", short: "Mentor", page: "student-mentorship", icon: <IconCalendar /> },
    { label: "Directory", short: "Browse", page: "directory", icon: <IconCompass /> },

    /* Applied and Saved were sub-tabs nested under Internships and Mentorship.
       Nesting the two lists a student checks most often one level down made
       them the hardest things on the portal to reach. */
    { section: "My activity", label: "Applied Internships", short: "Applied", page: "applied-internships", icon: <IconSend /> },
    { label: "Saved Internships", short: "Saved", page: "saved-internships", icon: <IconBookmark /> },
    { label: "Applied Mentorships", short: "Sessions", page: "applied-mentorships", icon: <IconHandshake /> },
    { label: "Saved Mentorships", short: "Saved", page: "saved-mentorships", icon: <IconBookmark /> },
    { label: "Notifications", short: "Inbox", page: "notifications", icon: <IconInbox /> },

    { section: "My profile", label: "My Portfolio", short: "Profile", page: "student-portfolio", icon: <IconUser /> },
    { label: "Placement Readiness", short: "Ready", page: "placement-readiness", icon: <IconGauge /> },
    { label: "Analytics", short: "Insights", page: "analytics", icon: <IconBarChart /> },
    { label: "Settings", short: "Settings", page: "settings", icon: <IconSettings /> },
  ],
  industry: [
    { label: "Dashboard", short: "Home", page: "industry-dashboard", icon: <IconGrid /> },
    { label: "Postings", short: "Posts", page: "internship-listings", icon: <IconBriefcase /> },
    { label: "Talent Pool", short: "Talent", page: "talent-pool", icon: <IconUsers /> },
    { label: "Offers & Joining", short: "Offers", page: "industry-offers", icon: <IconCheckCircle /> },
    { label: "Analytics", short: "Insights", page: "analytics", icon: <IconBarChart /> },
    { label: "Skill Tests", short: "Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Hiring Team", short: "Team", page: "industry-team", icon: <IconUser /> },
    { label: "Company Profile", short: "Company", page: "company-profile", icon: <IconBuilding /> },
    { label: "Settings", short: "Settings", page: "settings", icon: <IconSettings /> },
  ],
  academician: [
    { label: "Dashboard", short: "Home", page: "academician-dashboard", icon: <IconGrid /> },
    { label: "My Students", short: "Students", page: "academician-students", icon: <IconUsers /> },
    { label: "Mentorship", short: "Mentor", page: "academician-mentorship", icon: <IconCalendar /> },
    { label: "Research Collabs", short: "Research", page: "academician-collabs", icon: <IconFlask /> },
    { label: "Programs (FDPs)", short: "FDPs", page: "academician-programs", icon: <IconBookOpen /> },
    { label: "Industry Alignment", short: "Align", page: "academician-alignment", icon: <IconCompass /> },
    { label: "Campus Board", short: "Board", page: "institution-announcements", icon: <IconMegaphone /> },
    { label: "Analytics", short: "Insights", page: "academician-analytics", icon: <IconBarChart /> },
    { label: "Skill Tests", short: "Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Faculty Profile", short: "Profile", page: "academician-profile", icon: <IconUser /> },
    { label: "Settings", short: "Settings", page: "settings", icon: <IconSettings /> },
  ],
  institution: [
    { label: "Dashboard", short: "Home", page: "institution-dashboard", icon: <IconGrid /> },
    { label: "Student Roster", short: "Roster", page: "institution-students", icon: <IconUsers /> },
    { label: "Placement Analytics", short: "Insights", page: "institution-analytics", icon: <IconBarChart /> },
    { label: "Cohort Skill Gaps", short: "Gaps", page: "institution-skill-gaps", icon: <IconGrid3 /> },
    { label: "Curriculum Alignment", short: "Curriculum", page: "institution-curriculum", icon: <IconCompass /> },
    { label: "Placement Drives", short: "Drives", page: "institution-drives", icon: <IconCalendar /> },
    { label: "MOUs & Partners", short: "MOUs", page: "institution-partnerships", icon: <IconHandshake /> },
    { label: "Notice Board", short: "Notices", page: "institution-announcements", icon: <IconMegaphone /> },
    { label: "Skill Tests", short: "Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Team & Activity", short: "Team", page: "institution-team", icon: <IconUser /> },
    { label: "Institution Profile", short: "Profile", page: "institution-profile", icon: <IconBuilding /> },
    { label: "Settings", short: "Settings", page: "settings", icon: <IconSettings /> },
  ],
};

const ROLE_LABEL = {
  student: "Student",
  industry: "Industry Partner",
  academician: "Faculty & Research",
  institution: "Institution Admin",
};

const ROLE_PORTAL_LABEL = {
  student: "Student Portal",
  industry: "Industry Portal",
  academician: "Academician Portal",
  institution: "Institution Portal",
};

const ROLE_EMOJI = {
  student: "🎓",
  industry: "🏢",
  academician: "📚",
  institution: "🏫",
};

/**
 * Live counts beside the student's activity entries.
 *
 * Kept here rather than inside each page so the rail is accurate wherever you
 * are standing — a new application or an incoming notice updates the number
 * you can see without navigating to it. Non-student roles get nothing; their
 * counts belong on their own dashboards.
 */
function useNavBadges(user, role) {
  const [badges, setBadges] = useState({});

  useEffect(() => {
    if (role !== "student" || !user?.id) return undefined;

    function recount() {
      setBadges({
        "applied-internships": listApplicationsForStudent(user.id).filter((a) => !["Rejected", "Withdrawn"].includes(a.status)).length,
        "saved-internships": listSavedInternships(user.id).length,
        "saved-mentorships": listSavedMentorships(user.id).length,
        notifications: listStudentNotifications(user.id).filter((n) => !n.read).length,
      });
    }

    recount();
    return subscribeToMutations(
      ["applications", "savedInternships", "savedMentorships", "studentNotifications"],
      recount
    );
  }, [user?.id, role]);

  return badges;
}

export default function DashboardLayout({ children, activePage, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNav();

  const role = user?.role || "student";

  /* The appearance preference is applied only while a portal page is mounted,
     and cleared on unmount. That is what keeps dark mode inside the signed-in
     product: the landing page and the other public pages never carry the
     attribute, so they always render in the one look they were designed for. */
  const { resolved: resolvedTheme, theme, setTheme } = useTheme({ active: true });

  // Sets data-role on <html> (not just this subtree) so role-accent CSS vars
  // in globals.css also reach modals like ApplyConfirmModal that render as
  // siblings of DashboardLayout rather than as its children.
  useEffect(() => {
    document.documentElement.setAttribute("data-role", role);
    return () => document.documentElement.removeAttribute("data-role");
  }, [role]);

  const navItems = NAV[role] || NAV.student;
  const badges = useNavBadges(user, role);
  const userName = user?.name || "Guest";
  const userSub = `${ROLE_LABEL[role]} · ${user?.institution || user?.companyName || user?.instituteName || ""}`;

  function handleSignOut() {
    logout();
    navigate("landing");
  }

  function Sidebar({ mobile = false }) {
    return (
      <aside
        className={
          mobile
            ? "fixed inset-0 z-50 flex"
            : "hidden lg:flex flex-col w-60 min-h-screen border-r border-border bg-card sticky top-0 h-screen overflow-y-auto"
        }
      >
        {mobile && <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />}
        <div
          className={
            mobile
              ? "relative z-10 flex flex-col w-64 min-h-screen bg-card border-r border-border overflow-y-auto"
              : "flex flex-col w-60 min-h-screen"
          }
        >
          <Link href="/" className="flex flex-col items-start gap-1 px-5 py-4 border-b border-border text-left hover:bg-secondary/50 transition-colors cursor-pointer">
            {/* The wordmark is wide (≈3.6:1) — capped by height and allowed to
                size its own width so it never overflows the 240px rail. */}
            <img src="/logo.png" alt="Skill Setu" className="h-9 w-auto max-w-[190px] brand-logo" />
            <div className="text-[11px] text-muted-foreground">Academia–Industry Portal</div>
          </Link>

          <div className="px-3 pt-3.5">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary/10">
              <IconTile icon={ROLE_EMOJI[role]} tone="primary" size={28} />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary truncate">{ROLE_PORTAL_LABEL[role]}</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              const badge = badges[item.page];
              return (
                <div key={item.label}>
                  {item.section && (
                    <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      {item.section}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      navigate(item.page, item.query);
                      setSidebarOpen(false);
                    }}
                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive ? "bg-primary/10 text-primary shadow-[0_1px_2px_rgba(25,25,26,0.03)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />}
                    <span className={isActive ? "text-primary" : ""}>{item.icon}</span>
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {/* A count is only worth showing when it is actionable —
                        unread notices, live applications, saved roles. */}
                    {badge > 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isActive ? "bg-primary text-white" : "bg-secondary text-secondary-foreground"}`}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border space-y-1">
            <button onClick={() => setShowEditProfile(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-left">
              <Avatar name={userName} size={34} src={user?.avatarDataUrl} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{userName}</div>
                <div className="text-xs text-muted-foreground truncate">{userSub}</div>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">Edit</span>
            </button>
            <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      {sidebarOpen && <Sidebar mobile />}

      <div className="flex-1 flex flex-col min-h-screen lg:max-h-screen lg:overflow-y-auto min-w-0">
        <header className="sticky top-0 z-40 bg-card/85 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 lg:px-6">
          <button className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <IconMenu />
          </button>

          <Link href="/" className="lg:hidden flex items-center min-w-0 cursor-pointer">
            <img src="/logo.png" alt="Skill Setu" className="h-8 w-auto max-w-[150px] brand-logo" />
          </Link>

          <div className="flex-1 hidden lg:block min-w-0">{title && <h1 className="text-base font-semibold text-foreground truncate tracking-tight">{title}</h1>}</div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* A one-click toggle in reach at all times; Settings owns the full
                choice including "match my device". */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={resolvedTheme === "dark" ? "Switch to light appearance" : "Switch to dark appearance"}
              title={
                theme === "system"
                  ? "Matching your device — click to override"
                  : resolvedTheme === "dark"
                  ? "Dark appearance"
                  : "Light appearance"
              }
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {resolvedTheme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            {role === "student" && <NotificationBell user={user} onOpenInbox={() => navigate("notifications")} />}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 min-w-0">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-2 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.page, item.query)}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-150 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-tight">{item.short || item.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-muted-foreground"
          aria-label="More"
        >
          <IconMenu />
          <span className="text-[10px] font-medium leading-tight">More</span>
        </button>
      </nav>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </div>
  );
}
