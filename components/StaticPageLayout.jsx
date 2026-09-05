"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function StaticPageLayout({ title, children }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center cursor-pointer hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Skill Setu" className="h-8 sm:h-9 w-auto brand-logo" />
          </Link>
          <button onClick={() => router.push("/")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-5 py-14">
        <h1 className="text-3xl font-semibold text-foreground mb-8">{title}</h1>
        <div className="prose-sm space-y-5 text-sm text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:leading-relaxed">
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-3xl mx-auto px-5 py-8 text-xs text-muted-foreground text-center">
          © 2026 Skill Setu. Built for Smart India Hackathon · Problem Statement SIH26044.
        </div>
      </footer>
    </div>
  );
}
