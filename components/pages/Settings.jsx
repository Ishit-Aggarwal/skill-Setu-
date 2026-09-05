"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { getReduceMotion, setReduceMotion, THEME_OPTIONS, useTheme } from "../../lib/preferences";
import { getSessionToken } from "../../lib/session";
import { Badge, Button, Card, Field, Flash, PageHeader, Section, Tabs, TextInput, useFlash } from "../ui/Kit";

/**
 * Account settings, one page for every role.
 *
 * Two rules shaped this:
 *
 *  - It only exists behind a session. The route is wrapped in RequireAuth and
 *    the nav entry only renders inside the portal shell, so a signed-out
 *    visitor never sees it at all.
 *
 *  - Every control here changes something real. Appearance rewrites the theme
 *    tokens immediately; the notification switches gate what the dashboard
 *    actually surfaces; the privacy switches are enforced in the Convex
 *    queries that serve a candidate's profile to a recruiter, not just hidden
 *    in the UI; and the security actions go through the server. Nothing on
 *    this page is a switch that only remembers its own position.
 */

/* ---------------- small shared controls ---------------- */

function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-xl">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 mt-0.5 w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <div className="grid sm:grid-cols-3 gap-2.5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`text-left rounded-xl border px-3.5 py-3 transition-all duration-150 ${
              selected ? "border-primary bg-primary/8" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>{option.label}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{option.hint}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- page ---------------- */

const TABS = [
  { key: "appearance", label: "Appearance" },
  { key: "notifications", label: "Notifications" },
  { key: "privacy", label: "Privacy" },
  { key: "security", label: "Security" },
  { key: "account", label: "Account" },
];

const NOTIFICATION_SETTINGS = {
  student: [
    {
      key: "notifyApplicationUpdates",
      label: "Application updates",
      description: "A banner on your dashboard whenever a recruiter moves one of your applications along.",
    },
    {
      key: "notifyTestReminders",
      label: "Skill test reminders",
      description: "Upcoming and ready-to-take tests appear in What needs you next.",
    },
    {
      key: "notifyMentorship",
      label: "Mentorship",
      description: "Reminders about sessions you've booked with a mentor.",
    },
    {
      key: "notifyAnnouncements",
      label: "Campus notices",
      description: "Announcements your institution posts to the notice board.",
    },
  ],
  industry: [
    { key: "notifyApplicationUpdates", label: "New applicants", description: "A banner when someone applies to one of your postings." },
    { key: "notifyTestReminders", label: "Skill test activity", description: "When a candidate completes a test you're hosting." },
    { key: "notifyAnnouncements", label: "Partner announcements", description: "Notices from institutions you have an MOU with." },
  ],
  academician: [
    { key: "notifyMentorship", label: "Mentorship bookings", description: "When a student books or cancels one of your office-hours slots." },
    { key: "notifyApplicationUpdates", label: "Advisee progress", description: "When one of your advisees is shortlisted, interviewed or hired." },
    { key: "notifyAnnouncements", label: "Campus notices", description: "Announcements posted to your institution's notice board." },
  ],
  institution: [
    { key: "notifyApplicationUpdates", label: "Placement activity", description: "When a student on your roster is hired." },
    { key: "notifyTestReminders", label: "Assessment activity", description: "When cohort assessment results change materially." },
    { key: "notifyAnnouncements", label: "Partner announcements", description: "RSVPs and messages from recruiters attending your drives." },
  ],
};

export default function SettingsPage() {
  const router = useRouter();
  const navigate = useNav();
  const { user, updateProfile, changePassword, signOutEverywhere, deleteAccount, logout } = useAuth();
  const { theme, setTheme } = useTheme({ active: true });
  const [tab, setTab] = useState("appearance");
  const [flash, setFlash] = useFlash(3500);
  const [error, setError] = useState(null);
  const [reduceMotion, setReduceMotionState] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState(user?.recoveryPhone || "");
  const [deanName, setDeanName] = useState(user?.deanName || "");

  useEffect(() => {
    setReduceMotionState(getReduceMotion());
  }, []);

  useEffect(() => {
    setRecoveryPhone(user?.recoveryPhone || "");
  }, [user?.recoveryPhone]);

  useEffect(() => {
    setDeanName(user?.deanName || "");
  }, [user?.deanName]);

  async function handleSaveRecoveryPhone(e) {
    e?.preventDefault();
    await updateProfile({ recoveryPhone: recoveryPhone.trim() });
    setFlash("Recovery phone number saved.");
  }

  async function handleSaveDeanName(e) {
    e?.preventDefault();
    await updateProfile({ deanName: deanName.trim() });
    setFlash("Dean's full name saved.");
  }

  const isDemo = Boolean(user?.id?.startsWith("demo-"));
  const hasServerSession = Boolean(getSessionToken());
  const notificationRows = NOTIFICATION_SETTINGS[user?.role] || NOTIFICATION_SETTINGS.student;

  const orgName = useMemo(() => {
    if (user?.role === "industry") return user.companyName;
    if (user?.role === "institution") return user.instituteName || user.institution;
    return null;
  }, [user]);

  /* Notification and privacy switches default to on, so an account that
     predates this page behaves exactly as it did before. */
  const pref = (key) => user?.[key] !== false;

  function savePreference(key, value, message) {
    updateProfile({ [key]: value });
    setFlash(message);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError(null);
    if (pw.next.length < 8) return setError("Choose a new password of at least 8 characters.");
    if (pw.next !== pw.confirm) return setError("The two new passwords don't match.");

    setPwBusy(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setFlash("Password changed. Your other devices stay signed in — sign them out below if you'd rather not.");
    } catch (err) {
      setError(err.message);
    } finally {
      setPwBusy(false);
    }
  }

  async function handleSignOutEverywhere() {
    setError(null);
    try {
      const removed = await signOutEverywhere();
      setFlash(
        removed
          ? `Signed out of ${removed} other device${removed === 1 ? "" : "s"}. This one is still signed in.`
          : "There were no other devices signed in to this account."
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <DashboardLayout activePage="settings" title="Settings">
      <div className="animate-fade-slide space-y-5 max-w-3xl">
        <PageHeader
          eyebrow="Your account"
          title="Settings"
          subtitle="Appearance, notifications, privacy and security — everything that applies to your account rather than to one page."
        />

        <Flash message={flash} />
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>
        )}

        <Tabs tabs={TABS} value={tab} onChange={setTab} />

        {/* ---------------- Appearance ---------------- */}
        {tab === "appearance" && (
          <Card>
            <Section
              title="Appearance"
              description="Applies to your portal only. The public Skill Setu pages always render in their own light theme."
            >
              <ChoiceRow options={THEME_OPTIONS} value={theme} onChange={(v) => { setTheme(v); setFlash("Appearance updated."); }} />

              <div className="mt-5 pt-1">
                <Toggle
                  label="Reduce motion"
                  description="Turns off the slide-in and pulse animations. Useful on older machines and if animation makes you queasy."
                  checked={reduceMotion}
                  onChange={(v) => {
                    setReduceMotionState(v);
                    setReduceMotion(v);
                    setFlash(v ? "Animations turned off." : "Animations turned back on.");
                  }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
                Appearance is stored on this device, not on your account — the same login can be light on a shared campus
                terminal and dark on your own laptop.
              </p>
            </Section>
          </Card>
        )}

        {/* ---------------- Notifications ---------------- */}
        {tab === "notifications" && (
          <Card>
            <Section
              title="What you hear about"
              description="These control what Skill Setu surfaces to you in the product. Turning one off stops those items appearing on your dashboard."
            >
              <div>
                {notificationRows.map((row) => (
                  <Toggle
                    key={row.key}
                    label={row.label}
                    description={row.description}
                    checked={pref(row.key)}
                    onChange={(v) => savePreference(row.key, v, `${row.label}: ${v ? "on" : "off"}.`)}
                  />
                ))}
              </div>
            </Section>
          </Card>
        )}

        {/* ---------------- Privacy ---------------- */}
        {tab === "privacy" && (
          <div className="space-y-5">
            {user?.role === "student" && (
              <Card>
                <Section
                  title="Who can find you"
                  description="This is where your discoverability lives now — it used to sit on the dashboard, which is not where anyone looks for a privacy control."
                >
                  <Toggle
                    label="Open to opportunities"
                    description="Lets recruiters find you in the Talent Pool for roles you haven't applied to. Turn it off and you're only visible on postings you apply to yourself."
                    checked={user.openToOpportunities !== false}
                    onChange={(v) =>
                      savePreference(
                        "openToOpportunities",
                        v,
                        v ? "You're discoverable in the Talent Pool." : "You're hidden from Talent Pool searches."
                      )
                    }
                  />
                  <Toggle
                    label="Show my contact details"
                    description="Your email and phone number on your profile, for recruiters reviewing you. Enforced on the server, not just hidden in the page."
                    checked={pref("showContactToRecruiters")}
                    onChange={(v) => savePreference("showContactToRecruiters", v, v ? "Contact details shown." : "Contact details hidden.")}
                  />
                  <Toggle
                    label="Show my skill test scores"
                    description="Your assessed domain scores on your profile. With this off, recruiters see your skills and projects but not the numbers."
                    checked={pref("showScoresToRecruiters")}
                    onChange={(v) => savePreference("showScoresToRecruiters", v, v ? "Scores shown." : "Scores hidden.")}
                  />
                </Section>
              </Card>
            )}

            {user?.role !== "student" && (
              <Card>
                <Section title="Directory visibility" description="How your organisation appears to the rest of the platform.">
                  <Toggle
                    label="Listed in the partner directory"
                    description="Students and institutions can find your organisation when browsing partners. Your live postings stay visible either way."
                    checked={pref("openToOpportunities")}
                    onChange={(v) => savePreference("openToOpportunities", v, v ? "Listed in the directory." : "Hidden from the directory.")}
                  />
                </Section>
              </Card>
            )}

            <Card>
              <Section title="What Skill Setu stores" description="Plainly, so you don't have to guess.">
                <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li className="flex gap-2"><span className="text-primary">•</span>Your profile, and the results of any skill test you have sat.</li>
                  <li className="flex gap-2"><span className="text-primary">•</span>Applications you have made, and the stage each one is at.</li>
                  <li className="flex gap-2"><span className="text-primary">•</span>Your password, stored only as a bcrypt hash — it cannot be read back, by us or anyone else.</li>
                  <li className="flex gap-2"><span className="text-primary">•</span>Sign-in sessions, so you can be signed in on more than one device. You can end them below.</li>
                </ul>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Deleting your account removes all of it. See the Account tab.
                </p>
              </Section>
            </Card>
          </div>
        )}

        {/* ---------------- Security ---------------- */}
        {tab === "security" && (
          <div className="space-y-5">
            <Card>
              <Section title="Change your password" description="Your current password is required, so an unlocked browser can't be used to lock you out.">
                {isDemo || !hasServerSession ? (
                  <p className="text-sm text-muted-foreground">
                    You&apos;re exploring a demo persona, which has no password. Create a real account to use this.
                  </p>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-3.5">
                    <Field label="Current password">
                      <TextInput
                        type="password"
                        autoComplete="current-password"
                        value={pw.current}
                        onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                        required
                      />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="New password" hint="At least 8 characters.">
                        <TextInput
                          type="password"
                          autoComplete="new-password"
                          value={pw.next}
                          onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                          required
                        />
                      </Field>
                      <Field label="Confirm new password">
                        <TextInput
                          type="password"
                          autoComplete="new-password"
                          value={pw.confirm}
                          onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                          required
                        />
                      </Field>
                    </div>
                    <Button type="submit" disabled={pwBusy}>
                      {pwBusy ? "Updating…" : "Change password"}
                    </Button>
                  </form>
                )}
              </Section>
            </Card>

            <Card>
              <Section
                title="Signed-in devices"
                description="Skill Setu deliberately lets you stay signed in on several devices at once. If one of them isn't yours any more, end it here."
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={hasServerSession ? "green" : "muted"} dot>
                    {hasServerSession ? "This device is signed in" : "Local session only"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleSignOutEverywhere} disabled={!hasServerSession}>
                    Sign out of all other devices
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Resetting your password through the emailed link also ends every session on the account.
                </p>
              </Section>
            </Card>
          </div>
        )}

        {/* ---------------- Account ---------------- */}
        {tab === "account" && (
          <div className="space-y-5">
            <Card>
              <Section title="Your account" description="Identity fields are set at signup and verified — change them by contacting support.">
                <dl className="divide-y divide-border text-sm">
                  {[
                    ["Name", user?.name],
                    orgName ? [user?.role === "industry" ? "Company name" : "Institution name", orgName] : null,
                    user?.role === "institution" ? ["Dean's full name", user?.deanName || "Not configured"] : null,
                    ["Email", user?.email],
                    ["Recovery phone (WhatsApp)", user?.recoveryPhone || "Not configured"],
                    ["Account type", user?.role],
                    user?.institution && user?.role === "student" ? ["Institution", user.institution] : null,
                    user?.department ? ["Department", user.department] : null,
                    user?.createdAt ? ["Member since", new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })] : null,
                  ]
                    .filter(Boolean)
                    .map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-sm text-foreground text-right truncate">{value || "—"}</dd>
                      </div>
                    ))}
                </dl>

                {orgName && (
                  <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                    This is the name you sign in with, and the name shown on everything you publish. Change it on your{" "}
                    <button
                      type="button"
                      onClick={() => navigate(user.role === "industry" ? "company-profile" : "institution-profile")}
                      className="text-primary font-medium hover:underline"
                    >
                      {user.role === "industry" ? "company profile" : "institution profile"}
                    </button>
                    .
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      logout();
                      router.replace("/");
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </Section>
            </Card>

            <Card>
              <Section
                title="Account Recovery"
                description="Keep a backup contact so you never lose access to your profile, assessments, and applications."
              >
                <form onSubmit={handleSaveRecoveryPhone} className="space-y-3">
                  <Field
                    label="Recovery phone number (WhatsApp-enabled)"
                    hint="Optional but encouraged. Used to recover your account if you lose access to your registered email. Never shown to recruiters, peers, or students."
                  >
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                      <TextInput
                        type="tel"
                        value={recoveryPhone}
                        onChange={(e) => setRecoveryPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={recoveryPhone.trim() === (user?.recoveryPhone || "")}
                      >
                        Save number
                      </Button>
                    </div>
                  </Field>
                </form>
              </Section>
            </Card>

            {user?.role === "institution" && (
              <Card>
                <Section
                  title="Dean / Head of Institution"
                  description="Explicitly scoped institutional leadership field. Kept distinct from your administrator sign-in name so verified institutional records carry the correct authority."
                >
                  <form onSubmit={handleSaveDeanName} className="space-y-3">
                    <Field
                      label="Dean's full name"
                      hint="The full name and academic title of the Dean or Principal (e.g. 'Prof. Rajesh Nair, Dean of Academics')."
                    >
                      <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                        <TextInput
                          value={deanName}
                          onChange={(e) => setDeanName(e.target.value)}
                          placeholder="e.g. Prof. Rajesh Nair, Dean of Academics"
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={deanName.trim() === (user?.deanName || "")}
                        >
                          Save Dean name
                        </Button>
                      </div>
                    </Field>
                  </form>
                </Section>
              </Card>
            )}

            <Card className="border-red-200">
              <Section title="Delete this account" description="Permanent. Your profile, applications, results and bookings go with it.">
                {isDemo ? (
                  <p className="text-sm text-muted-foreground">Demo personas can&apos;t be deleted — sign out to leave demo mode.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Type <span className="font-semibold text-foreground">DELETE</span> to confirm. This cannot be undone, and
                      the same email can be used to register again afterwards.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <TextInput
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="DELETE"
                        aria-label="Type DELETE to confirm"
                        className="!w-40"
                      />
                      <Button
                        variant="danger"
                        onClick={handleDelete}
                        disabled={deleteConfirm !== "DELETE" || deleting}
                      >
                        {deleting ? "Deleting…" : "Delete my account"}
                      </Button>
                    </div>
                  </div>
                )}
              </Section>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
