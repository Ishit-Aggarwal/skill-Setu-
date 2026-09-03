"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useNav } from "../lib/nav";
import EditProfileModal from "./EditProfileModal";

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 1-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconBookOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function IconFlask() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" /><path d="M10 9l-4.5 9A1 1 0 0 0 6.5 20h11a1 1 0 0 0 .9-1.45L14 9" />
      <line x1="10" y1="3" x2="10" y2="9" /><line x1="14" y1="3" x2="14" y2="9" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

const NAV = {
  student: [
    { label: "Dashboard", page: "student-dashboard", icon: <IconGrid /> },
    { label: "Skill Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Internships", page: "internship-listings", icon: <IconBriefcase /> },
    { label: "My Portfolio", page: "student-portfolio", icon: <IconUser /> },
    { label: "Analytics", page: "analytics", icon: <IconBarChart /> },
  ],
  industry: [
    { label: "Dashboard", page: "industry-dashboard", icon: <IconGrid /> },
    { label: "Postings", page: "internship-listings", icon: <IconBriefcase /> },
    { label: "Talent Pool", page: "talent-pool", icon: <IconUsers /> },
    { label: "Skill Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Company Profile", page: "company-profile", icon: <IconUser /> },
    { label: "Analytics", page: "analytics", icon: <IconBarChart /> },
  ],
  academician: [
    { label: "Dashboard", page: "academician-dashboard", icon: <IconGrid /> },
    { label: "Programs (FDPs)", page: "academician-dashboard", query: { tab: "fdp" }, icon: <IconBookOpen /> },
    { label: "Research Collabs", page: "academician-dashboard", query: { tab: "collabs" }, icon: <IconFlask /> },
    { label: "Industry Alignment", page: "academician-dashboard", query: { tab: "alignment" }, icon: <IconBarChart /> },
    { label: "Skill Tests", page: "skill-assessment", icon: <IconTarget /> },
    { label: "Analytics", page: "analytics", icon: <IconBarChart /> },
  ],
  institution: [
    { label: "Dashboard", page: "institution-dashboard", icon: <IconGrid /> },
    { label: "Placement Analytics", page: "analytics", icon: <IconBarChart /> },
  ],
};

const ROLE_LABEL = {
  student: "Student",
  industry: "Industry Partner",
  academician: "Faculty & Research",
  institution: "Institution Admin",
};

export default function DashboardLayout({ children, activePage, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNav();

  const role = user?.role || "student";
  const navItems = NAV[role] || NAV.student;
  const userName = user?.name || "Guest";
  const userSub = `${ROLE_LABEL[role]} · ${user?.institution || user?.companyName || user?.instituteName || ""}`;
  const userInitials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
        <div className={mobile ? "relative z-10 flex flex-col w-64 min-h-screen bg-card border-r border-border" : "flex flex-col w-60 min-h-screen"}>
          <button onClick={() => navigate("landing")} className="flex flex-col items-start gap-1 px-5 py-4 border-b border-border text-left hover:bg-secondary/50 transition-colors">
            <img src="/logo.png" alt="Skill Setu" className="h-8 w-auto object-contain" />
            <div className="text-xs text-muted-foreground">Academia × Industry</div>
          </button>

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.page, item.query);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span className={isActive ? "text-primary" : ""}>{item.icon}</span>
                  {item.label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border space-y-2">
            <button onClick={() => setShowEditProfile(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-left">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0 overflow-hidden">
                {user?.avatarDataUrl ? <img src={user.avatarDataUrl} alt="" className="w-full h-full object-cover" /> : userInitials}
              </div>
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

      <div className="flex-1 flex flex-col min-h-screen lg:max-h-screen lg:overflow-y-auto">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 lg:px-6">
          <button className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors" onClick={() => setSidebarOpen(true)}>
            <IconMenu />
          </button>

          <button onClick={() => navigate("landing")} className="lg:hidden flex items-center">
            <img src="/logo.png" alt="Skill Setu" className="h-6 w-auto object-contain" />
          </button>

          <div className="flex-1 hidden lg:block">{title && <h1 className="text-base font-semibold text-foreground">{title}</h1>}</div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowEditProfile(true)} className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold overflow-hidden">
              {user?.avatarDataUrl ? <img src={user.avatarDataUrl} alt="" className="w-full h-full object-cover" /> : userInitials}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-2 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.page, item.query)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-150 ${isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-tight">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </div>
  );
}
