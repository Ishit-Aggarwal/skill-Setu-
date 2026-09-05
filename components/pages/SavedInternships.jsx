"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import ApplyConfirmModal from "../ApplyConfirmModal";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  applyToInternship,
  getAssessment,
  listApplicationsForStudent,
  listInternships,
  listSavedInternships,
  toggleSavedInternship,
} from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { canonicalDomain, domainColor } from "../../lib/domains";
import { checkEligibility, computeMatch, daysUntil, formatDate } from "../../lib/match";
import { formatStipend } from "../../lib/money";
import { Badge, Button, Card, EmptyState, Flash, PageHeader, ProgressBar, Select, StatGrid, useFlash } from "../ui/Kit";

/**
 * Bookmarked roles, on their own page.
 *
 * Saving a role is a promise that it will be easy to find again, which a
 * sub-tab three clicks into a browsing screen is not. This page also does the
 * one job the browsing list can't: it tells the student which of their saved
 * roles are about to close.
 */
export default function SavedInternships() {
  const { user } = useAuth();
  const navigate = useNav();
  const [internships, setInternships] = useState([]);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [appliedIds, setAppliedIds] = useState(() => new Set());
  const [assessment, setAssessment] = useState(null);
  const [sortBy, setSortBy] = useState("deadline");
  const [applyTarget, setApplyTarget] = useState(null);
  const [flash, setFlash] = useFlash();

  function refresh() {
    if (!user) return;
    setInternships(listInternships());
    setSavedIds(new Set(listSavedInternships(user.id).map((s) => s.internshipId)));
    setAppliedIds(new Set(listApplicationsForStudent(user.id).map((a) => a.internshipId)));
    setAssessment(getAssessment(user.id));
  }

  useEffect(() => {
    refresh();
    return subscribeToMutations(["internships", "savedInternships", "applications", "assessments"], refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saved = useMemo(() => {
    const rows = internships
      .filter((i) => savedIds.has(i.id))
      .map((i) => ({
        ...i,
        domain: canonicalDomain(i.domain),
        match: computeMatch(i, assessment),
        eligibility: checkEligibility(i, user, assessment),
        daysLeft: daysUntil(i.deadline),
      }));
    const sorters = {
      deadline: (a, b) => a.daysLeft - b.daysLeft,
      match: (a, b) => b.match - a.match,
      company: (a, b) => a.company.localeCompare(b.company),
    };
    return rows.sort(sorters[sortBy] || sorters.deadline);
  }, [internships, savedIds, assessment, user, sortBy]);

  const closingSoon = saved.filter((i) => i.status !== "Closed" && i.daysLeft >= 0 && i.daysLeft <= 7);
  const closed = saved.filter((i) => i.status === "Closed" || i.daysLeft < 0);

  function unsave(internship) {
    toggleSavedInternship(user.id, internship.id);
    refresh();
    setFlash(`Removed "${internship.title}" from your saved roles.`);
  }

  function confirmApply(note) {
    try {
      applyToInternship(applyTarget, user, null, note);
      setApplyTarget(null);
      refresh();
      setFlash("Application sent — track it under Applied Internships.");
    } catch (err) {
      setApplyTarget(null);
      setFlash(
        err.message === "RESUME_REQUIRED"
          ? "You need a resume on file before you can apply. Add one from your portfolio."
          : err.message
      );
    }
  }

  return (
    <DashboardLayout activePage="saved-internships" title="Saved Internships">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="My activity"
          title="Saved Internships"
          subtitle="Roles you bookmarked to come back to, with the ones about to close called out."
          actions={
            <Button size="sm" variant="outline" onClick={() => navigate("internship-listings")}>
              Browse all roles
            </Button>
          }
        />

        <Flash message={flash} />

        <StatGrid
          columns={3}
          stats={[
            { label: "Saved roles", value: String(saved.length), icon: "🔖", tone: "primary" },
            {
              label: "Closing this week",
              value: String(closingSoon.length),
              icon: "⏳",
              hint: closingSoon.length ? "Apply before the deadline passes" : "Nothing urgent",
            },
            { label: "Already closed", value: String(closed.length), icon: "🚪", hint: "Kept for reference" },
          ]}
        />

        {saved.length === 0 ? (
          <EmptyState
            icon="🔖"
            title="Nothing saved yet"
            action={
              <Button size="sm" onClick={() => navigate("internship-listings")}>
                Browse open roles
              </Button>
            }
          >
            Tap the bookmark on any role to keep it here. Saved roles are checked against your deadline reminders.
          </EmptyState>
        ) : (
          <>
            <div className="flex justify-end">
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto" aria-label="Sort saved roles">
                <option value="deadline">Closing soonest</option>
                <option value="match">Best match</option>
                <option value="company">Organisation A–Z</option>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {saved.map((intern) => {
                const isApplied = appliedIds.has(intern.id);
                const isClosed = intern.status === "Closed" || intern.daysLeft < 0;
                const blocked = !intern.eligibility.eligible;
                return (
                  <Card key={intern.id} hover className="flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: intern.color || domainColor(intern.domain) }}
                        >
                          {intern.company.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground leading-tight">{intern.title}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{intern.company}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => unsave(intern)}
                        className="p-1.5 rounded-lg text-primary hover:text-red-600 transition-colors flex-shrink-0"
                        aria-label={`Remove ${intern.title} from saved`}
                        title="Remove from saved"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <Badge tone="neutral">{intern.type}</Badge>
                      <Badge tone="neutral">{intern.domain}</Badge>
                      {isClosed ? (
                        <Badge tone="muted">Closed</Badge>
                      ) : intern.daysLeft <= 7 ? (
                        <Badge tone="red">{intern.daysLeft === 0 ? "Closes today" : `${intern.daysLeft}d left`}</Badge>
                      ) : null}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 mb-3">
                      <div className="truncate">📍 {intern.location} · ⏱ {intern.duration}</div>
                      <div className="truncate">💰 {formatStipend(intern)}</div>
                      <div>📅 Due {formatDate(intern.deadline)}</div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Skill match</span>
                        <span className="font-semibold text-primary">{intern.match}%</span>
                      </div>
                      <ProgressBar value={intern.match} tone="bg-primary" />
                    </div>

                    {blocked && !isClosed && (
                      <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-3 space-y-0.5">
                        <div className="font-semibold">Not eligible yet</div>
                        {intern.eligibility.reasons.map((reason) => (
                          <div key={reason}>{reason}</div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setApplyTarget(intern)}
                      disabled={isApplied || blocked || isClosed}
                      className={`mt-auto w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                        isApplied
                          ? "bg-primary/10 text-primary cursor-default"
                          : blocked || isClosed
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary hover:bg-accent text-white hover:shadow-md"
                      }`}
                    >
                      {isApplied ? "✓ Applied" : isClosed ? "No longer open" : blocked ? "Not eligible" : "Apply Now"}
                    </button>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {applyTarget && (
        <ApplyConfirmModal internship={applyTarget} user={user} onConfirm={confirmApply} onClose={() => setApplyTarget(null)} />
      )}
    </DashboardLayout>
  );
}
