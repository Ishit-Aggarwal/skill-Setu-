"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import DashboardLayout from "../DashboardLayout";
import TestCard from "../skilltests/TestCard";
import FileDrop from "../ui/FileDrop";
import { useAuth } from "../../lib/auth";
import { api } from "../../convex/_generated/api";
import { authHeaders } from "../../lib/session";
import { backendErrorMessage, backendMutation } from "../../lib/convexBrowser";
import { useSessionQuery } from "../../lib/useSessionQuery";
import { getAttemptsForStudent, getPortfolio, getRegistration, getSkillTest, listInternships, listSkillTests, savePortfolio } from "../../lib/store";
import { RESUME } from "../../lib/settings";
import { subscribeToMutations } from "../../lib/sync";
import { CAREER_TRACKS, overallReadiness, sameTitle } from "../../lib/resumeAnalysis";
import { testStartMs, upcomingSortMs } from "../../lib/testWindow";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, ProgressBar, Section, Select, Skeleton, useFlash } from "../ui/Kit";

/**
 * Resume Coach: upload a resume (or use the portfolio), and see what it
 * claims against what tests have verified, the next tests to take, a study
 * plan fitted before them, and fixes for the resume itself.
 *
 * Resumes are personal data: the student consents before anything is read,
 * only they can see the analysis, they can delete it all, and it is deleted
 * automatically after RESUME.RETENTION_DAYS.
 */

const STAGES = ["Reading your resume…", "Comparing with your test results…", "Choosing your next tests…", "Building your study plan…"];

function formatDate(ms) {
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* ---------------- the input ---------------- */

function AnalyseForm({ user, onDone, compact = false }) {
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState("upload");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [targetKind, setTargetKind] = useState("none");
  const [track, setTrack] = useState(CAREER_TRACKS[0]);
  const [posting, setPosting] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [offerPortfolio, setOfferPortfolio] = useState(false);
  const postings = useMemo(() => listInternships().filter((i) => i.status !== "Closed"), []);

  useEffect(() => {
    if (!busy) return undefined;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 6000);
    return () => clearInterval(t);
  }, [busy]);

  async function run(forceMode) {
    const useMode = forceMode || mode;
    setError(null);
    setOfferPortfolio(false);
    if (!consent) return setError("Tick the consent box first.");
    if (useMode === "upload" && !files.length) return setError("Upload your resume, or choose \"Use my Skill Setu portfolio\".");
    setBusy(true);
    try {
      const target = targetKind === "track" ? { kind: "track", title: track } : targetKind === "posting" && posting ? { kind: "posting", internshipId: posting } : null;
      const res = await fetch("/api/ai/resume-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ source: useMode, resume: useMode === "upload" ? files[0] : null, portfolio: useMode === "portfolio" ? getPortfolio(user.id) : undefined, target, consentAt: Date.now() }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.success) {
        setError(data.error || "The analysis couldn't be completed. Please try again.");
        if (data.canUsePortfolio) setOfferPortfolio(true);
        return;
      }
      onDone(data);
    } catch {
      setError("Couldn't reach the server. Your upload is kept — try again.");
      setOfferPortfolio(useMode === "upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      {!compact && <p className="text-sm text-foreground">Upload your resume to see what it claims against what your tests have verified — and get your next tests and a study plan.</p>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What to analyse">
        {[
          ["upload", "📄 Upload a resume"],
          ["portfolio", "🗂️ Use my Skill Setu portfolio"],
        ].map(([key, label]) => (
          <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => setMode(key)} className={`text-xs px-3 py-2 rounded-full border font-medium ${mode === key ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === "upload" && <FileDrop purpose="resume" maxFiles={1} onChange={setFiles} onBusyChange={setUploading} label="Drop your resume here" hint="PDF, Word (DOCX), ODT, TXT or a photo of a printed resume · up to 5 MB" />}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="What are you aiming for? (optional)">
          <Select value={targetKind} onChange={(e) => setTargetKind(e.target.value)}>
            <option value="none">No specific target</option>
            <option value="track">A career track</option>
            <option value="posting">A specific internship</option>
          </Select>
        </Field>
        {targetKind === "track" && (
          <Field label="Career track">
            <Select value={track} onChange={(e) => setTrack(e.target.value)}>
              {CAREER_TRACKS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        )}
        {targetKind === "posting" && (
          <Field label="Internship">
            <Select value={posting} onChange={(e) => setPosting(e.target.value)}>
              <option value="">Choose a posting…</option>
              {postings.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.company}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <label className="flex items-start gap-2 text-xs text-foreground rounded-xl border border-border bg-secondary/40 p-3">
        <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          <span className="font-semibold">Your data, your control (DPDP Act 2023).</span> {RESUME.CONSENT_NOTICE}
        </span>
      </label>
      {busy && (
        <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground" role="status" aria-live="polite">
          <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
          {STAGES[stage]}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 space-y-2">
          <div>⚠️ {error}</div>
          {offerPortfolio && (
            <Button size="sm" variant="outline" onClick={() => { setMode("portfolio"); run("portfolio"); }}>
              Use my portfolio instead
            </Button>
          )}
        </div>
      )}
      <Button onClick={() => run()} disabled={busy || uploading || !consent}>
        {busy ? "Analysing…" : "Analyse"}
      </Button>
    </Card>
  );
}

/* ---------------- the results ---------------- */

/** A radar axis label short enough to stay inside a phone-width chart; the tooltip keeps the full name. */
function shortDomain(domain, max) {
  const s = domain.replace("AYUSH ", "").split(",")[0].trim();
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s;
}

function ReadinessRadar({ rows }) {
  // On a phone the labels get shorter and the web smaller, so nothing is cut off.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 480);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const data = rows.map((d) => ({ domain: shortDomain(d.domain, narrow ? 11 : 18), full: d.domain, resume: d.resumeSignal, verified: d.verifiedScore ?? 0 }));
  if (data.length < 3) return null;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius={narrow ? "52%" : "70%"}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="domain" tick={{ fontSize: narrow ? 9 : 10, fill: "var(--muted-foreground)" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Resume says" dataKey="resume" stroke="#A8743A" fill="#A8743A" fillOpacity={0.25} strokeDasharray="4 3" />
        <Radar name="Tests verified" dataKey="verified" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip
          labelFormatter={(label, payload) => payload?.[0]?.payload?.full || label}
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

const STATUS_TONE = { strong: "green", developing: "amber", gap: "red", "unverified-claim": "purple" };
const STATUS_LABEL = { strong: "Strong", developing: "Developing", gap: "Gap", "unverified-claim": "Claimed, not verified" };

function ExtractedDetails({ analysis, user, onFlash }) {
  const ex = analysis.result.extracted;
  const groups = [
    ["education", "Education", (e) => `${e.degree}${e.institution ? ` — ${e.institution}` : ""}${e.year ? ` (${e.year})` : ""}`],
    ["skills", "Skills", (s) => `${s.name} · ${s.category}`],
    ["projects", "Projects", (p) => `${p.title}${p.summary ? ` — ${p.summary}` : ""}`],
    ["experience", "Experience", (e) => `${e.role}${e.org ? ` at ${e.org}` : ""}${e.duration ? ` (${e.duration})` : ""}`],
    ["certifications", "Certifications", (c) => `${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.year ? ` (${c.year})` : ""}`],
  ];
  const [picked, setPicked] = useState(new Set());
  const key = (g, i) => `${g}:${i}`;
  const toggle = (k) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });

  /** Nothing reaches the portfolio without the student ticking it; duplicates are skipped. */
  function addSelected() {
    const portfolio = getPortfolio(user.id) || {};
    const patch = {};
    const skipped = [];
    let added = 0;
    const id = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    for (const k of picked) {
      const [g, i] = k.split(":");
      const item = ex[g][Number(i)];
      if (g === "education") {
        const list = patch.education || [...(portfolio.education || [])];
        if (list.some((e) => sameTitle(e.degree, item.degree))) skipped.push(item.degree);
        else (list.push({ id: id("edu"), degree: item.degree, institution: item.institution, endYear: item.year, pursuing: false, fromResume: true }), (added += 1));
        patch.education = list;
      } else if (g === "skills") {
        const badges = patch.skillBadges || { ...(portfolio.skillBadges || {}) };
        const all = Object.values(badges).flat();
        if (all.some((s) => sameTitle(s.name, item.name))) skipped.push(item.name);
        else {
          badges["From my resume"] = [...(badges["From my resume"] || []), { name: item.name, level: "Claimed" }];
          added += 1;
        }
        patch.skillBadges = badges;
      } else if (g === "projects") {
        const list = patch.projects || [...(portfolio.projects || [])];
        if (list.some((p) => sameTitle(p.title, item.title))) skipped.push(item.title);
        else (list.push({ id: id("proj"), title: item.title, description: item.summary, fromResume: true }), (added += 1));
        patch.projects = list;
      } else if (g === "experience") {
        const list = patch.timeline || [...(portfolio.timeline || [])];
        if (list.some((t) => sameTitle(t.title, item.role) && sameTitle(t.org, item.org))) skipped.push(item.role);
        else (list.push({ id: id("tl"), title: item.role, org: item.org, year: item.duration, type: "Internship", detail: "" }), (added += 1));
        patch.timeline = list;
      } else if (g === "certifications") {
        const list = patch.certifications || [...(portfolio.certifications || [])];
        if (list.some((c) => sameTitle(c.name, item.name))) skipped.push(item.name);
        else (list.push({ id: id("cert"), name: item.name, issuer: item.issuer, year: item.year }), (added += 1));
        patch.certifications = list;
      }
    }
    if (Object.keys(patch).length) savePortfolio(user.id, patch);
    setPicked(new Set());
    onFlash(`${added} added to your portfolio${skipped.length ? ` · ${skipped.length} already there (${skipped.slice(0, 3).join(", ")})` : ""}.`);
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">Extracted from your resume</summary>
      <div className="mt-3 space-y-4">
        {groups.map(([g, label, fmt]) =>
          ex[g]?.length ? (
            <div key={g}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>
              <ul className="space-y-1.5">
                {ex[g].map((item, i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs rounded-lg border border-border px-2.5 py-2 ${item.unverifiedEvidence ? "opacity-60" : ""}`}>
                    <input type="checkbox" className="mt-0.5 no-print" checked={picked.has(key(g, i))} onChange={() => toggle(key(g, i))} aria-label={`Add ${fmt(item)} to my portfolio`} />
                    <span className="flex-1">
                      <span className="text-foreground">{fmt(item)}</span>
                      {item.evidence && <span className="block text-[11px] text-muted-foreground italic">“{item.evidence}”</span>}
                      {item.unverifiedEvidence && <span className="block text-[11px] text-amber-700">Couldn't find this in your resume</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}
        <Button size="sm" className="no-print" disabled={!picked.size} onClick={addSelected}>
          Add {picked.size || ""} selected to my portfolio
        </Button>
      </div>
    </details>
  );
}

function Results({ analysis, history, user, onFlash, onDeleted }) {
  const r = analysis.result;
  const [done, setDone] = useState(analysis.done || {});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [, setTestsVersion] = useState(0);
  useEffect(() => setDone(analysis.done || {}), [analysis.id, analysis.done]);
  useEffect(() => {
    listSkillTests();
    setAttempts(getAttemptsForStudent(user.id));
    // The recommended tests may arrive from the server after the first paint.
    return subscribeToMutations(["skillTests", "skillTestRegistrations", "assessmentAttempts"], () => {
      setTestsVersion((n) => n + 1);
      setAttempts(getAttemptsForStudent(user.id));
    });
  }, [user.id]);

  const claims = r.domainReadiness.filter((d) => d.status === "unverified-claim");
  const topics = r.studyPlan?.topics || [];
  const doneCount = topics.filter((t) => done[t.id]).length;
  const tests = r.nextTests.map((n) => ({ ...n, test: getSkillTest(n.testId) }));
  const firstDated = tests
    .filter((t) => t.test && testStartMs(t.test))
    .sort((a, b) => upcomingSortMs(a.test) - upcomingSortMs(b.test))[0];

  async function tick(topicId, value) {
    setDone((d) => ({ ...d, [topicId]: value ? Date.now() : undefined }));
    try {
      await backendMutation(api.resume.setTopicDone, { analysisId: analysis.id, topicId, done: value });
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  async function deleteAll() {
    try {
      await backendMutation(api.resume.deleteAll, {});
      setConfirmDelete(false);
      onDeleted();
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  const trend = history.map((h) => ({ at: h.createdAt, score: overallReadiness(h.result) })).filter((h) => h.score != null).reverse();

  return (
    <div className="space-y-6 resume-results">
      <Card className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-foreground">{r.profile.name || user.name}</div>
          <div className="text-xs text-muted-foreground">{[r.profile.course, r.profile.year, r.profile.institution].filter(Boolean).join(" · ")}</div>
          {r.profile.summary && <p className="text-sm text-foreground mt-2">{r.profile.summary}</p>}
          <p className="text-[11px] text-muted-foreground mt-2">
            Analysed {formatDate(analysis.createdAt)} from {analysis.resumeFileName || "your portfolio"} · deleted automatically on {formatDate(analysis.expiresAt)}
          </p>
          {r.warnings?.length > 0 && (
            <ul className="mt-2 text-[11px] text-amber-700 space-y-0.5">
              {r.warnings.map((w, i) => (
                <li key={i}>⚠️ {w}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2 no-print">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </Card>

      <Section title="Claimed vs verified" description="What your resume claims, against what your proctored tests have verified.">
        <Card>
          <ReadinessRadar rows={r.domainReadiness} />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {r.domainReadiness.map((d) => (
              <Badge key={d.domain} tone={STATUS_TONE[d.status]} title={d.why}>
                {d.domain}: {STATUS_LABEL[d.status]}
              </Badge>
            ))}
          </div>
          {claims.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {claims.map((d) => {
                const fit = tests.find((t) => t.test?.domain === d.domain);
                return (
                  <li key={d.domain} className="text-xs rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-purple-900">
                    Your resume lists <strong>{d.domain}</strong>, but you haven't passed a test in it yet{d.verifiedScore != null ? ` (verified ${d.verifiedScore}%)` : ""}.
                    {fit ? ` Take "${fit.test.title}" to verify it.` : " Take a test in it to verify it."}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Section>

      <Section title="Your next tests" description="Chosen only from tests you can actually take.">
        {tests.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((t) => (
              <div key={t.testId} className="space-y-2">
                <Card className="text-xs space-y-1 !p-3">
                  <div className="font-semibold text-foreground">Priority {t.priority} · readiness now {t.readinessNow}%</div>
                  <div className="text-muted-foreground">{t.why}</div>
                  {t.prepareTopics.length > 0 && <div className="text-foreground">Prepare first: {t.prepareTopics.join(", ")}</div>}
                </Card>
                {t.test ? (
                  <TestCard test={t.test} user={user} registration={getRegistration(t.test.id, user.id)} attempt={attempts.find((a) => a.testId === t.test.id)} onRefresh={() => setAttempts(getAttemptsForStudent(user.id))} />
                ) : (
                  <Card className="text-xs text-muted-foreground">This test is loading — open Skill Tests to register.</Card>
                )}
              </div>
            ))}
          </div>
        ) : r.generalTestAreas?.length ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {r.generalTestAreas.map((g) => (
              <Card key={g.domain} className="text-xs space-y-1">
                <div className="font-semibold text-foreground">{g.domain}</div>
                <div className="text-muted-foreground">{g.why}</div>
                <Link href="/skill-assessment" className="text-primary hover:underline">
                  Browse tests in {g.domain} →
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon="📝" title="No open test fits right now">New tests appear in Skill Tests; re-analyse later.</EmptyState>
        )}
      </Section>

      {topics.length > 0 && (
        <Section title="Study plan" description={`${r.studyPlan.weeks} week${r.studyPlan.weeks === 1 ? "" : "s"} · ${doneCount} of ${topics.length} topics done`}>
          <div className="space-y-3">
            <ProgressBar value={doneCount} max={topics.length} tone="bg-primary" />
            {firstDated && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground">
                📅 Fits before "{firstDated.test.title}" on {new Date(upcomingSortMs(firstDated.test)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.
              </div>
            )}
            {(r.studyPlan.schedule?.length ? r.studyPlan.schedule : [{ week: 1, topicIds: topics.map((t) => t.id), goal: "" }]).map((week) => (
              <div key={week.week} className="space-y-2">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Week {week.week}
                  {week.goal ? ` · ${week.goal}` : ""}
                </div>
                {week.topicIds.map((id) => {
                  const t = topics.find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <Card key={id} className={`!p-3 text-xs ${done[id] ? "opacity-70" : ""}`}>
                      <label className="flex items-start gap-2">
                        <input type="checkbox" className="mt-0.5" checked={Boolean(done[id])} onChange={(e) => tick(id, e.target.checked)} />
                        <span className="flex-1 space-y-1">
                          <span className={`block text-sm font-medium ${done[id] ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                          {t.subtopics.length > 0 && <span className="block text-muted-foreground">{t.subtopics.join(" · ")}</span>}
                          {t.whyItMatters && <span className="block text-foreground">{t.whyItMatters}</span>}
                          <span className="block text-muted-foreground">
                            ~{t.estHours} h{t.references.length ? ` · 📚 ${t.references.join("; ")}` : ""}
                          </span>
                        </span>
                      </label>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.resumeFixes?.length > 0 && (
        <Section title="Resume fixes">
          <Card className="space-y-3">
            {r.resumeFixes.map((f, i) => (
              <div key={i} className="text-xs">
                <div className="font-medium text-foreground">☐ {f.issue}</div>
                <div className="text-muted-foreground">{f.suggestion}</div>
                {f.example && <div className="mt-1 rounded-lg bg-secondary/60 px-2.5 py-1.5 text-foreground">{f.example}</div>}
              </div>
            ))}
          </Card>
        </Section>
      )}

      {r.targetMatch && (
        <Section title={`Match: ${r.targetMatch.targetTitle}`}>
          <Card className="space-y-2 text-xs">
            <div className="text-2xl font-bold text-foreground">{r.targetMatch.matchPercent}%</div>
            <ProgressBar value={r.targetMatch.matchPercent} />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="font-semibold text-emerald-700 mb-1">You have</div>
                {r.targetMatch.matched.map((m) => (
                  <div key={m}>✓ {m}</div>
                ))}
              </div>
              <div>
                <div className="font-semibold text-red-600 mb-1">Missing</div>
                {r.targetMatch.missing.map((m) => (
                  <div key={m}>✕ {m}</div>
                ))}
              </div>
            </div>
            {analysis.target?.internshipId && (
              <Link href="/internships" className="text-primary hover:underline">
                View the posting →
              </Link>
            )}
          </Card>
        </Section>
      )}

      {r.strengths?.length > 0 && (
        <Section title="Strengths">
          <Card className="space-y-1 text-xs">
            {r.strengths.map((s, i) => (
              <div key={i} className={s.unverifiedEvidence ? "opacity-60" : ""}>
                ✓ {s.point} {s.evidence && <span className="italic text-muted-foreground">“{s.evidence}”</span>}
              </div>
            ))}
          </Card>
        </Section>
      )}

      <Card>
        <ExtractedDetails analysis={analysis} user={user} onFlash={onFlash} />
      </Card>

      {trend.length > 1 && (
        <Section title="History">
          <Card className="text-xs text-foreground">
            Overall readiness {trend[0].score} → {trend[trend.length - 1].score} since {formatDate(trend[0].at)}
          </Card>
        </Section>
      )}

      {confirmDelete && (
        <Modal title="Delete your resume analyses?" description="Your resume file and every analysis are deleted now. This can't be undone." onClose={() => setConfirmDelete(false)} size="sm">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
            <Button variant="danger" className="flex-1" onClick={deleteAll}>
              Delete everything
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ResumeCoach() {
  const { user } = useAuth();
  const [flash, setFlash] = useFlash(4000);
  const [selected, setSelected] = useState(null);
  const [redo, setRedo] = useState(false);
  const { data, loading, error } = useSessionQuery(api.resume.mine, {});
  const history = data || [];
  const analysis = history.find((h) => h.id === selected) || history[0];

  return (
    <DashboardLayout activePage="resume-coach" title="Resume Coach">
      <style>{`@media print { aside, header, nav, .no-print { display: none !important; } main { padding: 0 !important; } }`}</style>
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="My profile"
          title="Resume Coach"
          subtitle="What your resume claims, what your tests verify, the next tests to take and a plan to prepare for them."
          actions={
            analysis && !redo ? (
              <Button className="no-print" onClick={() => setRedo(true)}>
                Re-analyse
              </Button>
            ) : null
          }
        />
        <Flash message={flash} tone={String(flash || "").startsWith("⚠️") ? "red" : "green"} />
        {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
        {loading && <Skeleton className="h-48" />}
        {!loading && (!analysis || redo) && (
          <AnalyseForm
            user={user}
            compact={Boolean(analysis)}
            onDone={(out) => {
              setRedo(false);
              setSelected(out.id);
              setFlash(out.dropped?.tests ? "Analysis ready. A recommendation that wasn't a real test was removed." : "Analysis ready.");
            }}
          />
        )}
        {redo && (
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground no-print" onClick={() => setRedo(false)}>
            ← Back to my last analysis
          </button>
        )}
        {analysis && !redo && (
          <>
            {history.length > 1 && (
              <div className="flex flex-wrap gap-1.5 no-print" aria-label="Earlier analyses">
                {history.map((h) => (
                  <button key={h.id} type="button" onClick={() => setSelected(h.id)} className={`text-[11px] px-2.5 py-1 rounded-full border ${h.id === analysis.id ? "bg-primary text-white border-transparent" : "border-border text-muted-foreground"}`}>
                    {formatDate(h.createdAt)}
                    {overallReadiness(h.result) != null ? ` · ${overallReadiness(h.result)}` : ""}
                  </button>
                ))}
              </div>
            )}
            <Results analysis={analysis} history={history} user={user} onFlash={setFlash} onDeleted={() => { setSelected(null); setFlash("Deleted. Nothing of your resume is kept."); }} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
