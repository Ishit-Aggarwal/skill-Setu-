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

export default function DemoModeMenu({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);
  const router = useRouter();
  const { loginAsDemo } = useAuth();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function enterDemo(role) {
    setOpen(false);
    setBusy(role);
    // Demo personas are real server accounts now, so entering demo mode is a
    // round trip — without a session the graded tests and the mentorship
    // calendar would both be unavailable to a visitor looking around.
    try {
      const demoUser = await loginAsDemo(role);
      router.push(PAGE_PATHS[roleHomePage(demoUser.role)]);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
      >
        {busy ? "Starting demo…" : "Demo Mode (Full Access)"}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 animate-fade-slide">
          <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Explore as...
          </div>
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => enterDemo(r.key)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <span>{r.emoji}</span>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
