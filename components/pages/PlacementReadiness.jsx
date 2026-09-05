"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  getAssessment,
  getPortfolio,
  getResume,
  listApplicationsForStudent,
  listCredentialsForStudent,
  listInternships,
} from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { profileStrength } from "../../lib/profile";
import { scoresFor } from "../../lib/taxonomy";
import { checkEligibility } from "../../lib/match";
import { Badge, Button, Card, PageHeader, ProgressBar, ProgressRing, Section, StatGrid } from "../ui/Kit";

/**
 * "Am I ready to apply?", answered with the reasons.
 *
 * The dashboard already showed a completion percentage, but a bare number
 * tells a student nothing they can act on. This page is the same score with
 * every missing piece named, ordered by how much each one unlocks — and, at
 * the bottom, the concrete consequence: how many live roles they currently
 * clear the bar for, and what is keeping them out of the rest.
 */

const BAND = [
  { min: 85, label: "Application-ready", tone: "green", note: "Your profile stands up on its own. Focus on applying." },
  { min: 60, label: "Nearly there", tone: "amber", note: "A couple of gaps are costing you eligibility on live roles." },
  { min: 0, label: "Needs work", tone: "red", note: "Recruiters screen on the pieces below before they read anything else." },
];

export default function PlacementReadiness() {
  const { user } = useAuth();
  const navigate = useNav();
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  useEffect(
    () =>
      subscribeToMutations(["portfolios", "assessments", "applications", "credentials", "assessmentAttempts"], () =>
        setVersion((v) => v + 1)
      ),
    []
  );

  const context = useMemo(() => {
    if (!ready || !user) return null;
    return {
      assessment: getAssessment(user.id),
      portfolio: getPortfolio(user.id),
      applications: listApplicationsForStudent(user.id),
      credentials: listCredentialsForStudent(user.id),
      resume: getResume(user.id),
    };
  }, [user, ready, version]);

  const strength = useMemo(() => (context ? profileStrength(context) : { percent: 0, items: [], missing: [] }), [context]);

  const competency = useMemo(
    () => (context ? scoresFor(user, context.assessment) : null),
    [user, context]
  );

  /* The point of the score: what it actually unlocks today. */
  const eligibility = useMemo(() => {
    if (!ready || !context) return { open: [], blocked: [], reasons: new Map() };
    const open = [];
    const blocked = [];
    const reasons = new Map();
    listInternships()
      .filter((i) => i.status !== "Closed")
      .forEach((posting) => {
        const verdict = checkEligibility(posting, user, context.assessment);
        if (verdict.eligible) open.push(posting);
        else {
          blocked.push(posting);
          verdict.reasons.forEach((reason) => {
            // Group by the shape of the reason, not the exact numbers in it.
            const key = reason.startsWith("Requires a skill score") ? "A minimum skill score" : "A specific department";
            reasons.set(key, (reasons.get(key) || 0) + 1);
          });
        }
      });
    return { open, blocked, reasons };
  }, [user, context, ready, version]);

  if (!context) return null;

  const band = BAND.find((b) => strength.percent >= b.min) || BAND[BAND.length - 1];
  const done = strength.items.filter((i) => i.done);

  return (
    <DashboardLayout activePage="placement-readiness" title="Placement Readiness">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="My profile"
          title="Placement Readiness"
          subtitle="What a recruiter sees before they read anything else — and exactly what is missing."
        />

        <Card>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing
              value={strength.percent}
              size={112}
              stroke={10}
              tone={band.tone}
              sublabel="Profile strength"
            />
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <Badge tone={band.tone === "green" ? "green" : band.tone === "amber" ? "amber" : "red"} dot>
                {band.label}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{band.note}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {done.length} of {strength.items.length} steps complete · {eligibility.open.length} live role
                {eligibility.open.length === 1 ? "" : "s"} you can apply to right now.
              </p>
            </div>
          </div>
        </Card>

        <StatGrid
          columns={4}
          stats={[
            {
              label: "Resume",
              value: context.resume ? "On file" : "Missing",
              icon: "📄",
              tone: context.resume ? "green" : "red",
              hint: context.resume ? context.resume.fileName : "Required to apply to anything",
            },
            {
              label: "Skill areas assessed",
              value: competency ? `${competency.assessed}/${competency.total}` : "0",
              icon: "🎯",
              hint: competency?.overall != null ? `Overall ${competency.overall}` : "No test taken yet",
            },
            {
              label: "Certificates",
              value: String((context.portfolio?.certifications?.length || 0) + (context.credentials?.length || 0)),
              icon: "🏅",
            },
            { label: "Applications sent", value: String(context.applications.length), icon: "📤" },
          ]}
        />

        {/* The checklist, incomplete items first — the completed half is the
            part nobody needs to read. */}
        <Section
          title="Your checklist"
          description="Ordered by how much each one is worth. Every item links to the page where you can do it."
        >
          <div className="space-y-2">
            {[...strength.missing, ...done].map((item) => (
              <Card
                key={item.key}
                padded={false}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 ${item.done ? "opacity-70" : ""}`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    item.done ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {item.done ? "✓" : item.weight}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{item.detail}</div>
                </div>
                {!item.done && (
                  <Button size="sm" variant="outline" onClick={() => navigate(item.action)}>
                    Do this
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </Section>

        {competency && competency.rows.some((r) => r.score == null) && (
          <Section
            title="Skill areas you haven't been assessed on"
            description={`Your rubric is "${competency.taxonomy.label}". An unassessed area reads as a blank on your profile.`}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {competency.rows.map((row) => (
                <div key={row.skill} className="rounded-xl border border-border px-3.5 py-2.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-foreground truncate">{row.skill}</span>
                    <span className={row.score == null ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {row.score == null ? "Not assessed" : row.score}
                    </span>
                  </div>
                  <ProgressBar value={row.score ?? 0} />
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-3" onClick={() => navigate("skill-assessment")}>
              Browse skill tests
            </Button>
          </Section>
        )}

        <Section title="What your profile unlocks" description="Measured against every role currently open on the platform.">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <div className="text-3xl font-bold text-foreground">{eligibility.open.length}</div>
              <div className="text-sm text-muted-foreground mt-1">roles you are eligible for today</div>
              <Button size="sm" className="mt-3" onClick={() => navigate("internship-listings")}>
                See them
              </Button>
            </Card>
            <Card>
              <div className="text-3xl font-bold text-foreground">{eligibility.blocked.length}</div>
              <div className="text-sm text-muted-foreground mt-1">out of reach for now</div>
              {eligibility.reasons.size > 0 && (
                <ul className="mt-3 space-y-1">
                  {[...eligibility.reasons.entries()].map(([reason, count]) => (
                    <li key={reason} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary">•</span>
                      {reason} — {count} role{count === 1 ? "" : "s"}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}
