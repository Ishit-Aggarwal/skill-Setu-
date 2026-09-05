"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth";

function strengthOf(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_BAR = ["bg-red-400", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { resetPassword } = useAuth();

  const email = params.get("email") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const strength = strengthOf(password);
  const linkIsUsable = Boolean(email && token);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Choose a password of at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");

    setSaving(true);
    try {
      await resetPassword(email, token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-7 space-y-5">
        <Link href="/" className="inline-flex">
          <img src="/logo.png" alt="Skill Setu" className="h-9 w-auto max-w-[180px] brand-logo" />
        </Link>

        {!linkIsUsable ? (
          <>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">This reset link is incomplete</h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Open the link exactly as it appears in your email, or request a new one from the sign-in page.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center w-full py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-colors"
            >
              Back to sign in
            </Link>
          </>
        ) : done ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xl">✓</div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Password updated</h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                You can now sign in with your new password. Taking you to the sign-in page…
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center w-full py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-colors"
            >
              Sign in now
            </Link>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Choose a new password</h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Resetting the password for <span className="font-medium text-foreground">{email}</span>. This link works once
                and expires 30 minutes after it was requested.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${STRENGTH_BAR[strength]}`}
                        style={{ width: `${((strength + 1) / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{STRENGTH_LABEL[strength]}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Updating…" : "Update password"}
              </button>
            </form>

            <Link href="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary or the App Router build fails.
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
