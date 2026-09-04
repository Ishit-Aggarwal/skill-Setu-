"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import { useNav } from "../lib/nav";
import EditProfileModal from "./EditProfileModal";
import NotificationBell from "./NotificationBell";
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
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

/**
 * Every nav item points at its own route. An earlier version pointed several
 * academician entries at the same page with only a `?tab=` difference, so
 * "Dashboard" and "Programs (FDPs)" rendered identical content and the active
 * marker lit up on all of them at once — each destination now has a real,
 * separately-populated page behind it.
 */
const NAV = {
  student: [
    { label: "Dashboard", short: "Home", page: "student-dashboard", icon: <IconGrid /> },
    { label: "Skill Tests", short: "Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Internships", short: "Jobs", page: "internship-listings", icon: <IconBriefcase /> },
    { label: "My Portfolio", short: "Profile", page: "student-portfolio", icon: <IconUser /> },
    { label: "Analytics", short: "Insights", page: "analytics", icon: <IconBarChart /> },
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

export default function DashboardLayout({ children, activePage, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNav();

  const role = user?.role || "student";

  // Sets data-role on <html> (not just this subtree) so role-accent CSS vars
  // in globals.css also reach modals like ApplyConfirmModal that render as
  // siblings of DashboardLayout rather than as its children.
  useEffect(() => {
    document.documentElement.setAttribute("data-role", role);
    return () => document.documentElement.removeAttribute("data-role");
  }, [role]);

  const navItems = NAV[role] || NAV.student;
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
            <img src="/logo.png" alt="Skill Setu" className="h-9 w-auto max-w-[190px] object-contain mix-blend-multiply" />
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
              return (
                <button
                  key={item.label}
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
                  <span className="truncate">{item.label}</span>
                </button>
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
            <img src="/logo.png" alt="Skill Setu" className="h-8 w-auto max-w-[150px] object-contain mix-blend-multiply" />
          </Link>

          <div className="flex-1 hidden lg:block min-w-0">{title && <h1 className="text-base font-semibold text-foreground truncate tracking-tight">{title}</h1>}</div>

          <div className="ml-auto flex items-center gap-2.5">
            {role === "student" && <NotificationBell user={user} onOpenInbox={() => navigate("student-dashboard")} />}
            <button onClick={() => setShowEditProfile(true)} aria-label="Edit profile" className="rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
              <Avatar name={userName} size={34} src={user?.avatarDataUrl} />
            </button>
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
