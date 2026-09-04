import Link from "next/link";

export default function NotFound() {
  const personas = [
    { title: "Student Dashboard", desc: "Access verified skill scores, applications & career roadmaps", href: "/dashboard", icon: "🎓" },
    { title: "Recruiter & Industry", desc: "Manage talent pipelines, candidate shortlists & postings", href: "/industry", icon: "💼" },
    { title: "Academician Portal", desc: "Track student cohorts, curriculum mappings & research", href: "/academician", icon: "🔬" },
    { title: "Institution & TPO", desc: "Monitor institutional placements, drives & partnerships", href: "/institution", icon: "🏛️" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 sm:p-12">
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-8 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-base shadow-sm">
             सेतु
          </div>
          <div>
            <div className="font-bold text-foreground text-sm tracking-tight">Skill Setu</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">National Academia-Industry Bridge</div>
          </div>
        </Link>
        <Link
          href="/"
          className="text-xs font-medium px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
        >
          Back to Home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto w-full my-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary text-2xl font-bold mb-5">
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
          The requested route doesn't exist or may have been updated. Choose your role below to jump directly to your active workspace:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {personas.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="bg-card border border-border hover:border-primary/50 rounded-2xl p-4 transition-all duration-150 hover:shadow-sm group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">{p.icon}</span>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {p.title}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto w-full pt-8 border-t border-border text-center text-xs text-muted-foreground">
        Skill Setu · Smart India Hackathon Grand Finale (SIH26044) · Ministry of Ayush & Partner Industries
      </footer>
    </div>
  );
}
