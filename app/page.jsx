"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { roleHomePage, PAGE_PATHS } from "../lib/nav";
import DemoModeMenu from "../components/DemoModeMenu";

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const stats = [
  { value: "18,400+", label: "Students Enrolled" },
  { value: "920+", label: "Partner Industries" },
  { value: "210+", label: "Academic Institutions" },
  { value: "91%", label: "Placement Rate" },
];

const steps = [
  { num: "01", title: "Create Your Profile", desc: "Students complete a skill-mapped profile; industries post roles; academicians register programs." },
  { num: "02", title: "Skill Matching", desc: "Scores from skill tests are matched against each opportunity's required skills to surface the most relevant fits first." },
  { num: "03", title: "Connect & Collaborate", desc: "Apply, shortlist, and track placements — with real-time analytics for every stakeholder." },
];

const sectors = [
  { abbr: "IT", full: "Software & Information Technology" },
  { abbr: "MF", full: "Manufacturing & Core Engineering" },
  { abbr: "FN", full: "Banking, Finance & Consulting" },
  { abbr: "DS", full: "Design & Creative Industries" },
  { abbr: "HC", full: "Healthcare & Life Sciences" },
  { abbr: "RS", full: "Research & Public Sector" },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(PAGE_PATHS[roleHomePage(user.role)]);
  }, [loading, user, router]);

  function goToLogin(role) {
    router.push(`/login?role=${role}&mode=signup`);
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">S</div>
            <div>
              <span className="text-sm font-semibold text-foreground">Setu</span>
              <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Academia–Industry Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
              {darkMode ? <IconSun /> : <IconMoon />}
            </button>
            <div className="flex flex-col items-end">
              <button onClick={() => router.push("/login")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                Sign In
              </button>
              <DemoModeMenu className="mr-1" />
            </div>
            <button onClick={() => goToLogin("student")} className="text-sm font-medium bg-primary hover:bg-accent text-white px-4 py-2 rounded-xl transition-all duration-150 hover:shadow-md">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1659292862395-2ded345088df?w=1600&h=900&fit=crop&auto=format"
            alt="Indian Institute of Advanced Study, Shimla"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-olive-900/85 via-olive-800/70 to-olive-700/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
              <span className="w-4 h-4 text-base leading-none">🎯</span>
              <span>Smart India Hackathon · SIH26044</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.12] mb-6">
              Academia–Industry<br />
              <span className="text-olive-300">Collaboration</span> Portal
            </h1>

            <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-xl leading-relaxed">
              Skill mapping, internships, and placements — connecting students, industries, and academic institutions across every sector under one platform.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button onClick={() => goToLogin("student")} className="group flex items-center justify-center gap-2 bg-primary hover:bg-accent text-white px-7 py-3.5 rounded-xl font-medium transition-all duration-150 hover:scale-105 hover:shadow-xl">
                Join as Student
                <span className="transition-transform duration-150 group-hover:translate-x-0.5"><IconArrowRight /></span>
              </button>
              <button onClick={() => goToLogin("industry")} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-7 py-3.5 rounded-xl font-medium transition-all duration-150 hover:scale-105">
                For Industries
              </button>
              <button onClick={() => goToLogin("academician")} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-7 py-3.5 rounded-xl font-medium transition-all duration-150 hover:scale-105">
                For Academicians
              </button>
              <button onClick={() => goToLogin("institution")} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-7 py-3.5 rounded-xl font-medium transition-all duration-150 hover:scale-105">
                For Institutions
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </section>

      <section className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-5 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 divide-x-0 lg:divide-x divide-border">
          {stats.map((s) => (
            <div key={s.label} className="text-center px-4">
              <div className="text-2xl lg:text-3xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Who Is This For?</div>
          <h2 className="text-3xl font-semibold text-foreground mb-3">One Platform, Four Roles</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">One account, one purpose-built workspace — pick the role that matches what you're here to do.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { role: "student", emoji: "🎓", title: "Students", subtitle: "Engineering · Management · Design · Sciences · Arts", features: ["Skill tests & gap analysis", "Curated internship matches", "Portfolio & certification tracker"], cta: "Sign Up as Student" },
            { role: "industry", emoji: "🏢", title: "Industries", subtitle: "IT · Manufacturing · Finance · Consulting · Design", features: ["Post jobs & internships", "Skill-matched candidate shortlisting", "Applicant pipeline tracking"], cta: "Partner as Industry", featured: true },
            { role: "academician", emoji: "📚", title: "Academicians", subtitle: "Faculty · Researchers · Program Leads", features: ["Host & join FDP programs", "Research collaboration hub", "Track student placements"], cta: "Join as Academician" },
            { role: "institution", emoji: "🏫", title: "Institutions", subtitle: "Deans · Placement Cells · Admins", features: ["Placement funnel analytics", "Cohort skill-gap breakdowns", "Curriculum alignment insights"], cta: "Register Institution" },
          ].map((card) => (
            <div
              key={card.role}
              className={`flex flex-col rounded-2xl p-7 border transition-all duration-200 hover:shadow-lg group ${
                card.featured ? "bg-primary text-white border-transparent shadow-md" : "bg-card text-foreground border-border hover:-translate-y-1"
              }`}
            >
              <div className="text-3xl mb-4">{card.emoji}</div>
              <h3 className={`text-xl font-semibold mb-1 ${card.featured ? "text-white" : "text-foreground"}`}>{card.title}</h3>
              <p className={`text-sm mb-5 ${card.featured ? "text-white/70" : "text-muted-foreground"}`}>{card.subtitle}</p>
              <ul className="space-y-2 mb-7">
                {card.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${card.featured ? "text-white/85" : "text-muted-foreground"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${card.featured ? "bg-white" : "bg-primary"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => goToLogin(card.role)}
                className={`mt-auto w-full py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:scale-105 border ${
                  card.featured ? "bg-white text-primary border-transparent hover:bg-olive-50" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white hover:border-transparent"
                }`}
              >
                {card.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 border-y border-border py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Process</div>
            <h2 className="text-3xl font-semibold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">From registration to placement in three simple steps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[18%] right-[18%] h-px bg-border" />
            {steps.map((step) => (
              <div key={step.num} className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-card border-2 border-primary/30 mx-auto mb-5 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{step.num}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Network</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Every Sector, One Portal</h2>
          <p className="text-muted-foreground text-sm">Built for cross-industry academia collaboration, not locked to a single domain.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {sectors.map((s) => (
            <div key={s.abbr} className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/40 hover:shadow-sm transition-all duration-150 group">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all duration-150">
                {s.abbr}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">{s.full}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 border-y border-border py-20">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">FAQ</div>
            <h2 className="text-3xl font-semibold text-foreground mb-3">Common Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "Is Setu free to use?", a: "Yes. Creating an account and using every feature — skill tests, internship listings, portfolios, analytics — is free." },
              { q: "Which industries does it support?", a: "All of them. Setu isn't locked to one sector — IT, manufacturing, finance, design, and more all post and browse opportunities on the same platform." },
              { q: "How do industry, academician, and institution accounts get verified?", a: "Signup for those roles asks for a short partner verification code, similar to how many campus placement portals confirm an organisation before granting posting access." },
              { q: "Is my data safe?", a: "Your account and activity are stored locally in your browser rather than a shared server — see the Privacy Policy for the full picture." },
              { q: "What's Demo Mode?", a: "A one-click way to explore a fully populated Student, Industry, Academician, or Institution dashboard without creating an account first." },
            ].map((item) => (
              <div key={item.q} className="bg-card border border-border rounded-2xl p-5">
                <div className="text-sm font-semibold text-foreground mb-1.5">{item.q}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold">S</div>
                <span className="font-semibold text-foreground">Setu</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                A skill-mapping, internship, and placement platform bridging academia and industry across every sector.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <button onClick={() => router.push("/about")} className="hover:text-foreground transition-colors">About</button>
              <button onClick={() => router.push("/privacy")} className="hover:text-foreground transition-colors">Privacy Policy</button>
              <button onClick={() => router.push("/terms")} className="hover:text-foreground transition-colors">Terms of Use</button>
              <button onClick={() => router.push("/contact")} className="hover:text-foreground transition-colors">Contact</button>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground text-center">
            © 2026 Setu. Built for Smart India Hackathon · Problem Statement SIH26044.
          </div>
        </div>
      </footer>
    </div>
  );
}
