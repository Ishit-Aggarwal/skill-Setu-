"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { roleHomePage, PAGE_PATHS } from "../lib/nav";
import DemoModeMenu from "../components/DemoModeMenu";
import RoleSwitcher from "../components/RoleSwitcher";
import { LANDING_SECTORS } from "../lib/domains";

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

const highlights = [
  {
    emoji: "🎯",
    title: "Skill Mapping & Gap Analysis",
    desc: "Every student gets a live skill radar across eight core employability domains — including quantitative aptitude, programming, data analysis, and critical thinking — with targeted gap nudges.",
  },
  {
    emoji: "🌐",
    title: "Cross-Industry Scale & Sector Depth",
    desc: "Software, Engineering, Data Science, Healthcare, Finance, Management, and Traditional Disciplines each feature dedicated recruitment pipelines, verified skill assessments, and institutional alignment.",
  },
  {
    emoji: "📋",
    title: "Live Applicant Pipeline",
    desc: "Recruiters track every candidate through Applied → Shortlisted → Interview → Hired → Joined, with skill-match scores, eligibility filters and bulk review for high-volume roles.",
  },
  {
    emoji: "🔬",
    title: "FDPs & Research Collaboration",
    desc: "Faculty host development programmes with managed rosters and certificates, publish their own calls for collaborators, and run accepted projects with milestones and a shared workspace.",
  },
  {
    emoji: "🏫",
    title: "A Real Placement-Cell Toolkit",
    desc: "Institutions get a searchable student roster, cohort skill-gap heatmaps, drive scheduling with recruiter RSVPs, MOU tracking and multi-year placement history for accreditation reporting.",
  },
  {
    emoji: "🧭",
    title: "Curriculum Alignment Insights",
    desc: "See what employers are actually hiring for against what your programmes produce, with specific electives and certifications suggested to close each gap.",
  },
  {
    emoji: "🔐",
    title: "Verified Accounts, Any Device",
    desc: "Email-OTP verification plus a partner verification code for every institution, faculty member and recruiter — one account works from a laptop or a phone.",
  },
];

const stats = [
  { value: "35+", label: "Industry & Academic Sectors" },
  { value: "8", label: "Core Competency Domains" },
  { value: "4", label: "Connected Stakeholder Roles" },
  { value: "SIH26044", label: "Academia-Industry Collaboration" },
];

const steps = [
  { num: "01", title: "Create Your Profile", desc: "Students map their skills; employers post roles in their sector; faculty and institutions register with a partner verification code." },
  { num: "02", title: "Skill Matching", desc: "Skill-test scores are matched against each opportunity's required skills, with minimum-qualification and eligible-department filters applied before an application is even sent." },
  { num: "03", title: "Connect & Collaborate", desc: "Apply, shortlist, run campus drives and research collaborations — with role-scoped analytics for every stakeholder." },
];

const sectors = LANDING_SECTORS;

export default function LandingPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    logout();
    router.push("/");
  }

  function goToLogin(role) {
    router.push(`/login?role=${role}&mode=signup`);
  }

  const [slide, setSlide] = useState(0);
  const nextSlide = () => setSlide((s) => (s + 1) % highlights.length);
  const prevSlide = () => setSlide((s) => (s - 1 + highlights.length) % highlights.length);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Skill Setu" className="h-8 w-auto object-contain flex-shrink-0" />
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">Academia–Industry Portal</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <RoleSwitcher />
                <button onClick={handleSignOut} className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                  Sign out
                </button>
                <button onClick={() => router.push(PAGE_PATHS[roleHomePage(user.role)])} className="text-sm font-medium bg-primary hover:bg-accent text-white px-3 py-2 sm:px-4 rounded-xl transition-all duration-150 hover:shadow-md whitespace-nowrap">
                  <span className="sm:hidden">Dashboard →</span>
                  <span className="hidden sm:inline">Go to Dashboard →</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col items-end">
                  <button onClick={() => router.push("/login")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                    Sign In
                  </button>
                  <DemoModeMenu className="mr-1" />
                </div>
                <button onClick={() => goToLogin("student")} className="text-sm font-medium bg-primary hover:bg-accent text-white px-4 py-2 rounded-xl transition-all duration-150 hover:shadow-md">
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1656321717360-be568acc171b?w=1600&h=900&fit=crop&auto=format"
            alt="A university campus"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-olive-900/85 via-olive-800/70 to-olive-700/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
              <span className="w-4 h-4 text-base leading-none">🎯</span>
              <span>Smart India Hackathon · Problem Statement SIH26044 · Academia–Industry Bridge</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.12] mb-6">
              Academia–Industry<br />
              <span className="text-olive-300">Collaboration</span> Portal
            </h1>

            <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-xl leading-relaxed">
              Skill mapping, internships and placements across every sector — connecting students, academicians, institutions and employers nationwide across engineering, technology, management, and health sciences.
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
            { role: "student", emoji: "🎓", title: "Students", subtitle: "Engineering · Management · Technology · Sciences · Healthcare · Design", features: ["Skill tests & gap analysis", "Matched internships across every sector", "Portfolio & certification tracker"], cta: "Sign Up as Student" },
            { role: "industry", emoji: "🏢", title: "Industries", subtitle: "IT & Tech · Manufacturing · Finance · Healthcare & Life Sciences · Enterprise", features: ["Post roles with eligibility filters", "Proactive talent-pool search", "Pipeline, offers & joining tracking"], cta: "Partner as Industry", featured: true },
            { role: "academician", emoji: "📚", title: "Academicians", subtitle: "Faculty · Researchers · Programme Leads", features: ["Host FDPs with rosters & certificates", "Propose & run research collaborations", "Mentor advisees and book office hours"], cta: "Join as Academician" },
            { role: "institution", emoji: "🏫", title: "Institutions", subtitle: "Placement Cells · Deans · Multi-faculty Institutes", features: ["Student roster, drives & MOU tracking", "Cohort skill-gap heatmaps", "Curriculum alignment & accreditation exports"], cta: "Register Institution" },
          ].map((card) => (
            <div
              key={card.role}
              className={`relative flex flex-col rounded-2xl p-7 border transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group ${
                card.featured ? "bg-card text-foreground border-primary/60 shadow-md" : "bg-card text-foreground border-border"
              }`}
            >
              {card.featured && (
                <span className="absolute -top-3 left-7 text-[10px] font-semibold tracking-wide uppercase bg-primary text-white px-2.5 py-1 rounded-full">
                  Most Active
                </span>
              )}
              <div className="text-3xl mb-4">{card.emoji}</div>
              <h3 className="text-xl font-semibold mb-1 text-foreground">{card.title}</h3>
              <p className="text-sm mb-5 text-muted-foreground">{card.subtitle}</p>
              <ul className="space-y-2 mb-7">
                {card.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => goToLogin(card.role)}
                className="mt-auto w-full py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:scale-105 border bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white hover:border-transparent"
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

      <section className="max-w-4xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Highlights</div>
          <h2 className="text-3xl font-semibold text-foreground mb-3">What Makes Skill Setu Work</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">A closer look at what each role actually gets — built around how institutions, faculty and employers really work.</p>
        </div>

        <div className="relative bg-card border border-border rounded-2xl p-8 sm:p-12 text-center min-h-[260px] flex flex-col items-center justify-center overflow-hidden">
          <button
            onClick={prevSlide}
            aria-label="Previous highlight"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-secondary hover:bg-muted text-foreground flex items-center justify-center transition-colors"
          >
            <IconChevronLeft />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next highlight"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-secondary hover:bg-muted text-foreground flex items-center justify-center transition-colors"
          >
            <IconChevronRight />
          </button>

          <div key={slide} className="animate-fade-slide max-w-md mx-auto px-8">
            <div className="text-4xl mb-4">{highlights[slide].emoji}</div>
            <h3 className="text-xl font-semibold text-foreground mb-3">{highlights[slide].title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{highlights[slide].desc}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {highlights.map((h, i) => (
            <button
              key={h.title}
              onClick={() => setSlide(i)}
              aria-label={`Go to highlight ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-200 ${i === slide ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-border"}`}
            />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Network</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Every Sector, One Portal</h2>
          <p className="text-muted-foreground text-sm">From engineering, software, and finance to healthcare, traditional medicine, and creative arts — one unified platform connecting academia with industry.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sectors.map((s) => (
            <div
              key={s.abbr}
              className="relative bg-card border border-border hover:border-primary/40 rounded-xl p-4 text-center hover:shadow-sm transition-all duration-150 group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all duration-150">
                {s.abbr}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight">{s.full}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Representative cross-section of industry sectors across Technology, Engineering, Management, Healthcare, and Traditional Disciplines.
        </p>
      </section>

      <section className="bg-secondary/50 border-y border-border py-20">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">FAQ</div>
            <h2 className="text-3xl font-semibold text-foreground mb-3">Common Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "Is Skill Setu free to use?", a: "Yes. Creating an account and using every feature — skill tests, internship listings, portfolios, drives and analytics — is free." },
              { q: "Which sectors does the platform support?", a: "All major industries. Software & AI, Core Engineering, Manufacturing, Finance & Banking, Design, Healthcare & Life Sciences, Biotechnology, Management, and Traditional Disciplines all collaborate on the same platform. Every sector has dedicated skill tests, eligible departments, and custom talent filters." },
              { q: "How do industry, academician, and institution accounts get verified?", a: "Signup for those roles asks for a short partner verification code, similar to how many campus placement portals confirm an organisation before granting posting access." },
              { q: "Is my data safe?", a: "Your account and activity are stored server-side in our Convex database (with your device's local storage as an offline fallback) — see the Privacy Policy for the full picture, including how passwords and OTPs are handled." },
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
              <Link href="/" className="flex items-center mb-2 inline-block cursor-pointer hover:opacity-90 transition-opacity">
                <img src="/logo.png" alt="Skill Setu" className="h-7 w-auto object-contain" />
              </Link>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                A unified skill-mapping, internship and placement platform bridging academia and industry across engineering, technology, management, healthcare, and allied sectors. Built for SIH26044.
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
            © 2026 Skill Setu. Built for Smart India Hackathon · Problem Statement SIH26044.
          </div>
        </div>
      </footer>
    </div>
  );
}
