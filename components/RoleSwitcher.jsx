"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { PAGE_PATHS, roleHomePage } from "../lib/nav";

const ROLES = [
  { key: "student", label: "Student", emoji: "🎓" },
  { key: "industry", label: "Industry", emoji: "🏢" },
  { key: "academician", label: "Academician", emoji: "📚" },
  { key: "institution", label: "Institution", emoji: "🏫" },
];

export default function RoleSwitcher({ className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();
  const { user, loginAsDemo } = useAuth();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;
  const isDemo = user.id?.startsWith("demo-");

  async function switchTo(role) {
    setOpen(false);
    if (role === user.role) {
      router.push(PAGE_PATHS[roleHomePage(role)]);
      return;
    }
    if (isDemo) {
      const demoUser = await loginAsDemo(role);
      router.push(PAGE_PATHS[roleHomePage(demoUser.role)]);
    } else {
      router.push(`/login?role=${role}&mode=login`);
    }
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 flex items-center gap-1"
      >
        Switch role
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 animate-fade-slide">
          <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isDemo ? "Switch demo persona" : "Switch account"}
          </div>
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => switchTo(r.key)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left ${
                r.key === user.role ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
              }`}
            >
              <span>{r.emoji}</span>
              {r.label}
              {r.key === user.role && <span className="ml-auto text-[10px] text-muted-foreground">Current</span>}
            </button>
          ))}
          {!isDemo && (
            <div className="px-2.5 pt-1.5 pb-1 mt-1 border-t border-border text-[10px] text-muted-foreground leading-relaxed">
              You'll need to sign in with that account's own credentials.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
