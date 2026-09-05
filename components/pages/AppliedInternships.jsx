"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import {
  ALL_APPLICATION_STATUSES,
  PIPELINE_STAGES,
  listApplicationsForStudent,
  listInternships,
  updateApplicationStatus,
} from "../../lib/store";
import { subscribeToMutations } from "../../lib/sync";
import { formatDate, formatDateTime, relativeTime } from "../../lib/match";
import { formatStipend } from "../../lib/money";
import { hasFile, openStoredFile } from "../../lib/files";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterPills,
  Flash,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatGrid,
  useFlash,
} from "../ui/Kit";

/**
 * Everything the student has applied to, as a page of its own.
 *
 * This used to be a sub-tab. Which meant the single most-asked question a
 * candidate has — "where has my application got to?" — was two clicks deep
 * behind a browsing screen, and the only trace of it in the sidebar was a
 * small "1 applied" counter on the listings page.
 */

const STAGE_TONE = {
  Applied: "muted",
  Shortlisted: "blue",
  Interview: "amber",
  Hired: "green",
  Rejected: "red",
  Withdrawn: "muted",
};

const FILTERS = ["All", "Live", ...PIPELINE_STAGES, "Rejected"];

function isLive(application) {
  return !["Rejected", "Withdrawn"].includes(application.status);
}

export default function AppliedInternships() {
  const { user } = useAuth();
  const navigate = useNav();
  const [applications, setApplications] = useState([]);
  const [postings, setPostings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [detail, setDetail] = useState(null);
  const [flash, setFlash] = useFlash();

  function refresh() {
    if (!user) return;
    setApplications(listApplicationsForStudent(user.id));
    setPostings(listInternships());
  }

  useEffect(() => {
    refresh();
    return subscribeToMutations(["applications", "internships"], refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const postingById = useMemo(() => new Map(postings.map((p) => [p.id, p])), [postings]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = applications.filter((a) => {
      const matchesSearch =
        !q || a.internshipTitle?.toLowerCase().includes(q) || a.company?.toLowerCase().includes(q);
      const matchesStage =
        filter === "All" || (filter === "Live" ? isLive(a) : a.status === filter);
      return matchesSearch && matchesStage;
    });
    const sorters = {
      recent: (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt),
      oldest: (a, b) => new Date(a.appliedAt) - new Date(b.appliedAt),
      stage: (a, b) => ALL_APPLICATION_STATUSES.indexOf(b.status) - ALL_APPLICATION_STATUSES.indexOf(a.status),
      match: (a, b) => (b.match || 0) - (a.match || 0),
    };
    return [...filtered].sort(sorters[sortBy] || sorters.recent);
  }, [applications, filter, search, sortBy]);

  const live = applications.filter(isLive);
  const shortlisted = applications.filter((a) => ["Shortlisted", "Interview", "Hired"].includes(a.status));

  function withdraw(application) {
    if (!window.confirm(`Withdraw your application to "${application.internshipTitle}"? This cannot be undone.`)) return;
    updateApplicationStatus(application.id, "Withdrawn");
    setDetail(null);
    refresh();
    setFlash(`Withdrawn from "${application.internshipTitle}".`);
  }

  return (
    <DashboardLayout activePage="applied-internships" title="Applied Internships">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="My activity"
          title="Applied Internships"
          subtitle="Every role you have applied to, and exactly where each one has reached."
          actions={
            <Button size="sm" variant="outline" onClick={() => navigate("internship-listings")}>
              Browse more roles
            </Button>
          }
        />

        <Flash message={flash} />

        <StatGrid
          columns={4}
          stats={[
            { label: "Applications", value: String(applications.length), icon: "📤", tone: "primary" },
            { label: "Live", value: String(live.length), icon: "🟢", hint: `${applications.length - live.length} closed` },
            {
              label: "Shortlisted or beyond",
              value: String(shortlisted.length),
              icon: "⭐",
              hint: applications.length ? `${Math.round((shortlisted.length / applications.length) * 100)}% of applications` : "—",
            },
            { label: "Offers", value: String(applications.filter((a) => a.status === "Hired").length), icon: "🎉" },
          ]}
        />

        <Card className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by role or organisation…" className="flex-1 min-w-[14rem]" />
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto" aria-label="Sort applications">
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest first</option>
              <option value="stage">Furthest along</option>
              <option value="match">Best match</option>
            </Select>
          </div>
          <FilterPills label="Stage:" options={FILTERS} value={filter} onChange={setFilter} />
        </Card>

        {rows.length === 0 ? (
          <EmptyState
            icon="📤"
            title={applications.length ? "Nothing matches these filters" : "You haven't applied to anything yet"}
            action={
              !applications.length && (
                <Button size="sm" onClick={() => navigate("internship-listings")}>
                  Find roles you're eligible for
                </Button>
              )
            }
          >
            {applications.length
              ? "Try clearing the stage filter or the search box."
              : "Your profile only works once it is in front of someone. Applications you send appear here with their status."}
          </EmptyState>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map((application) => {
              const posting = postingById.get(application.internshipId);
              const stageIndex = PIPELINE_STAGES.indexOf(application.status);
              return (
                <Card key={application.id} hover className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground leading-tight">{application.internshipTitle}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{application.company}</div>
                    </div>
                    <Badge tone={STAGE_TONE[application.status] || "neutral"} dot>
                      {application.status}
                    </Badge>
                  </div>

                  {/* The pipeline as a row of pips, so "where am I" needs no
                      reading — a rejected application shows the stage it
                      reached rather than an empty track. */}
                  {application.status !== "Withdrawn" && (
                    <div className="flex items-center gap-1 mb-3">
                      {PIPELINE_STAGES.map((stage, i) => {
                        const reached = application.status === "Rejected" ? i <= Math.max(stageIndex, 0) : i <= stageIndex;
                        return (
                          <div key={stage} className="flex-1" title={stage}>
                            <div
                              className={`h-1.5 rounded-full ${
                                reached ? (application.status === "Rejected" ? "bg-red-400" : "bg-primary") : "bg-muted"
                              }`}
                            />
                            <div className="text-[9px] text-muted-foreground mt-1 truncate">{stage}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    <div>📅 Applied {formatDate(application.appliedAt)} · {relativeTime(application.appliedAt)}</div>
                    {posting && <div>💰 {formatStipend(posting)} · ⏱ {posting.duration}</div>}
                    {application.match != null && <div>🎯 {application.match}% skill match at the time you applied</div>}
                    {application.interviewAt && (
                      <div className="text-amber-700 font-medium">
                        🎙 Interview {formatDateTime(application.interviewAt)}{application.interviewMode ? ` · ${application.interviewMode}` : ""}
                      </div>
                    )}
                  </div>

                  {application.rejectionReason && (
                    <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2 mb-3">
                      <span className="font-semibold">Not taken forward:</span> {application.rejectionReason}
                    </div>
                  )}

                  {application.feedback?.summary && (
                    <div className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2 mb-3">
                      <span className="font-semibold">Feedback from the reviewer:</span> {application.feedback.summary}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDetail(application)}>
                      View details
                    </Button>
                    {hasFile(application) === false && !application.resumeDataUrl ? null : (
                      <button
                        onClick={() => openStoredFile({ dataUrl: application.resumeDataUrl, fileName: application.resumeFileName })}
                        className="text-xs text-primary hover:underline"
                      >
                        Resume sent
                      </button>
                    )}
                    {isLive(application) && (
                      <button onClick={() => withdraw(application)} className="ml-auto text-xs text-muted-foreground hover:text-red-600">
                        Withdraw
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {detail && (
        <Modal
          title={detail.internshipTitle}
          description={`${detail.company} · applied ${formatDate(detail.appliedAt)}`}
          onClose={() => setDetail(null)}
          size="lg"
          footer={
            isLive(detail) ? (
              <Button variant="danger" className="w-full" onClick={() => withdraw(detail)}>
                Withdraw this application
              </Button>
            ) : null
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STAGE_TONE[detail.status] || "neutral"} dot>{detail.status}</Badge>
              {detail.match != null && <Badge tone="primary">{detail.match}% match</Badge>}
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Progress</div>
              {(detail.statusHistory || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <div className="space-y-2 border-l-2 border-primary/30 ml-2 pl-4 py-1">
                  {[...(detail.statusHistory || [])].reverse().map((entry, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                      <div className="text-xs font-semibold text-foreground">{entry.status}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDateTime(entry.at)}
                        {entry.note ? ` — ${entry.note}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detail.note && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your note to the recruiter</div>
                <p className="text-sm text-foreground bg-secondary/50 rounded-xl px-3.5 py-2.5 leading-relaxed">{detail.note}</p>
              </div>
            )}

            {detail.feedback && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2.5">
                <div className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Reviewer Feedback</div>
                {detail.feedback.rating && (
                  <div className="text-xs font-medium text-blue-800">
                    Evaluation: {"⭐".repeat(detail.feedback.rating)} ({detail.feedback.rating} / 5)
                  </div>
                )}
                {detail.feedback.strengths?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-blue-900 mb-1">Key Strengths:</div>
                    <div className="flex flex-wrap gap-1">
                      {detail.feedback.strengths.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detail.feedback.improvements?.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-blue-900 mb-1">Areas for Growth:</div>
                    <div className="flex flex-wrap gap-1">
                      {detail.feedback.improvements.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detail.feedback.summary && (
                  <p className="text-xs text-blue-950 mt-1.5 italic bg-card/60 p-2.5 rounded-lg border border-blue-100 leading-relaxed">
                    “{detail.feedback.summary}”
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resume sent with this application</div>
              {detail.resumeDataUrl ? (
                <button
                  onClick={() => openStoredFile({ dataUrl: detail.resumeDataUrl, fileName: detail.resumeFileName })}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  {detail.resumeFileName || "Open resume"}
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This application predates resume attachments — the recruiter sees whatever is on your profile now.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
