"use client";

import Link from "next/link";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import VerifyPanel from "./VerifyPanel";

const REVIEWER_ROLES = ["industry", "academician", "institution"];

/**
 * /verify and /verify/<code>. A company, professor or institution signed in
 * gets it inside their portal (sidebar, detailed results, bulk verify);
 * everyone else — an employer holding a printed certificate — gets the public
 * page with the minimal record.
 */
export default function VerifyPage({ code = "" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && REVIEWER_ROLES.includes(user.role)) {
    return (
      <DashboardLayout activePage="verify-certificate" title="Verify a certificate">
        <div className="animate-fade-slide max-w-3xl space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Verify a certificate</h1>
            <p className="text-sm text-muted-foreground">
              Enter the verification code from a Skill Setu certificate to confirm it is genuine, or check a batch of codes at once.
            </p>
          </div>
          <VerifyPanel initialCode={code} detailed />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex items-start sm:items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Skill Setu" className="h-8 w-auto brand-logo" />
          <div>
            <h1 className="text-base font-semibold text-foreground">Certificate verification</h1>
            <p className="text-xs text-muted-foreground">Enter the code printed on the certificate.</p>
          </div>
        </div>
        <VerifyPanel initialCode={code} />
        <p className="text-[11px] text-muted-foreground">
          Only the details printed on the certificate are shown here. Nothing about you is recorded when you verify.
        </p>
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Skill Setu
        </Link>
      </div>
    </div>
  );
}
