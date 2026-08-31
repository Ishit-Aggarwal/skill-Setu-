"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { PAGE_PATHS, roleHomePage } from "../lib/nav";

export default function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(PAGE_PATHS.login);
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(PAGE_PATHS[roleHomePage(user.role)]);
    }
  }, [loading, user, roles, router]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  return children;
}
