"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import ApplyConfirmModal from "../ApplyConfirmModal";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { Badge, Button, Card, EmptyState, Field, FilterPills, Flash, Modal, PageHeader, ProgressBar, SearchInput, Select, StatGrid, TextArea, TextInput, useFlash } from "../ui/Kit";
import { ALL_DOMAINS, DEPARTMENTS, DOMAIN_GROUPS, SECTOR_CLUSTERS, canonicalDomain, domainColor } from "../../lib/domains";
import { subscribeToMutations } from "../../lib/sync";
import {
  applyToInternship,
  cloneInternship,
  createInternship,
  getAssessment,
  getPortfolio,
  listApplicationsForOwner,
  listApplicationsForStudent,
  listInternships,
  listInternshipsByOwner,
  listRecruiters,
  recordInternshipView,
  setPostingStatus,
  listSavedInternships,
  toggleSavedInternship,
  update,
  PIPELINE_STAGES,
  TERMINAL_STAGES,
} from "../../lib/store";
import { checkEligibility, computeMatch, computeSkillGap, daysUntil, formatDate } from "../../lib/match";

const typeFilters = ["All", "Remote", "Hybrid", "Onsite"];
const STAGE_ORDER = PIPELINE_STAGES;

/* ---------- Listing filter vocabulary ----------
   Stipend and duration are stored as the human strings an employer typed
   ("₹35,000/mo", "6 months"), so filtering parses them rather than assuming a
   numeric column exists. Anything unparseable is kept rather than dropped —
   a filter should never silently hide a posting because its stipend was
   written as "Negotiable". */

/* Minimum thresholds rather than closed ranges: a candidate filtering for
   "₹35,000+" expects a ₹35,000 role to appear, which an exclusive upper bound
   on the band below would have hidden. */
const STIPEND_BANDS = [
  { key: "any", label: "Any stipend", test: () => true },
  { key: "gte15", label: "₹15,000+", test: (v) => v != null && v >= 15000 },
  { key: "gte25", label: "₹25,000+", test: (v) => v != null && v >= 25000 },
  { key: "gte35", label: "₹35,000+", test: (v) => v != null && v >= 35000 },
];

const DURATION_BANDS = [
  { key: "any", label: "Any duration", test: () => true },
  { key: "lte3", label: "Up to 3 months", test: (m) => m != null && m <= 3 },
  { key: "4-6", label: "4 – 6 months", test: (m) => m != null && m > 3 && m <= 6 },
  { key: "gt6", label: "More than 6 months", test: (m) => m != null && m > 6 },
];

const POSTED_WINDOWS = [
  { key: "any", label: "Any time", days: null },
  { key: "1", label: "Last 24 hours", days: 1 },
  { key: "7", label: "Last week", days: 7 },
  { key: "30", label: "Last month", days: 30 },
];

function parseStipend(value) {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : null;
}

function parseDurationMonths(value) {
  const text = String(value || "").toLowerCase();
  const n = parseFloat(text);
  if (Number.isNaN(n)) return null;
  if (text.includes("week")) return n / 4.345;
  if (text.includes("year")) return n * 12;
  return n;
}

function bandOf(bands, key) {
  return bands.find((b) => b.key === key) || bands[0];
}

const typeTone = {
  Remote: "green",
  Hybrid: "blue",
  Onsite: "amber",
};

/**
 * Sector picker.
 *
 * Was a single flat row of every sector in use — around two dozen pills, of
 * which eleven were AYUSH sub-sectors, so the densest control on the page also
 * implied AYUSH was the platform's main subject. Now five equal clusters that
 * expand on demand, each showing how many live roles sit inside it, plus a
 * type-ahead for going straight to a sub-sector without opening its cluster.
 */
function SectorFilter({ clusters, value, onChange, query, onQuery }) {
  const [openCluster, setOpenCluster] = useState(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? clusters.flatMap((c) => c.items.filter((i) => i.domain.toLowerCase().includes(q)))
    : [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">Sector:</span>
        <button
          onClick={() => { onChange("All"); setOpenCluster(null); }}
          aria-pressed={value === "All"}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            value === "All" ? "bg-primary text-white border-transparent shadow-sm" : "bg-card border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          All sectors
        </button>

        {clusters.map((cluster) => {
          const holdsValue = cluster.items.some((i) => i.domain === value);
          const expanded = openCluster === cluster.id;
          return (
            <button
              key={cluster.id}
              onClick={() => setOpenCluster(expanded ? null : cluster.id)}
              aria-expanded={expanded}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                holdsValue
                  ? "bg-primary/10 border-primary text-primary"
                  : expanded
                  ? "bg-secondary border-primary/40 text-foreground"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {cluster.label}
              <span className="text-[10px] opacity-70">{cluster.count}</span>
              <span aria-hidden="true" className="text-[9px]">{expanded ? "▲" : "▼"}</span>
            </button>
          );
        })}

        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Find a sector…"
          aria-label="Search sectors"
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground placeholder:text-muted-foreground w-36 focus:outline-none focus:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>

      {q && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {matches.length === 0 ? (
            <span className="text-xs text-muted-foreground">No sector matches “{query}”.</span>
          ) : (
            matches.map((item) => (
              <button
                key={item.domain}
                onClick={() => { onChange(item.domain); onQuery(""); setOpenCluster(null); }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  value === item.domain ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {item.domain} <span className="opacity-60">{item.count}</span>
              </button>
            ))
          )}
        </div>
      )}

      {!q && openCluster && (
        <div className="flex flex-wrap gap-1.5 pl-1 pt-1 border-l-2 border-primary/30 ml-1">
          {clusters
            .find((c) => c.id === openCluster)
            .items.map((item) => (
              <button
                key={item.domain}
                onClick={() => onChange(value === item.domain ? "All" : item.domain)}
                aria-pressed={value === item.domain}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  value === item.domain ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {item.domain} <span className="opacity-60">{item.count}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function StudentView({ user }) {
  const navigate = useNav();
  const [internships, setInternships] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("All");
  const [type, setType] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [location, setLocation] = useState("All");
  const [stipendBand, setStipendBand] = useState("any");
  const [durationBand, setDurationBand] = useState("any");
  const [postedWithin, setPostedWithin] = useState("any");
  const [sectorQuery, setSectorQuery] = useState("");
  // Bookmarks are persisted, not component state — a saved role has to survive
  // a reload and show up on the dashboard, otherwise the star does nothing.
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [applyTarget, setApplyTarget] = useState(null);
  const [recentNewIds, setRecentNewIds] = useState(() => new Set());
  const [flash, setFlash] = useFlash(8000);

  function refresh() {
    setInternships(listInternships());
    setAssessment(getAssessment(user.id));
    setPortfolio(getPortfolio(user.id));
    setAppliedIds(new Set(listApplicationsForStudent(user.id).map((a) => a.internshipId)));
    setSavedIds(new Set(listSavedInternships(user.id).map((s) => s.internshipId)));
  }

  function handleToggleSave(internship) {
    const nowSaved = toggleSavedInternship(user.id, internship.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(internship.id);
      else next.delete(internship.id);
      return next;
    });
    setFlash(nowSaved ? `Saved "${internship.title}" — it's on your dashboard.` : `Removed "${internship.title}" from saved roles.`);
  }

  useEffect(() => { refresh(); }, [user]);

  useEffect(() => {
    const unsub = subscribeToMutations(["internships", "applications"], (event) => {
      refresh();
      if (event.collection === "internships" && event.action === "INSERT" && event.payload?.id) {
        const id = event.payload.id;
        setRecentNewIds((prev) => new Set([...prev, id]));
        setFlash(`A new role matching your skills was just posted by ${event.payload.company || "an organisation"}: "${event.payload.title}"`);
        setTimeout(() => {
          setRecentNewIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 10000);
      }
    });
    return unsub;
  }, [user]);

  const enriched = useMemo(
    () =>
      internships
        .filter((i) => i.status !== "Closed")
        .map((i) => ({
          ...i,
          // Legacy records carry pre-taxonomy sector names; resolving here means
          // one sector can never appear as two separate filter pills.
          domain: canonicalDomain(i.domain),
          match: computeMatch(i, assessment),
          eligibility: checkEligibility(i, user, assessment),
        })),
    [internships, assessment, user]
  );

  const eligibleCount = useMemo(() => enriched.filter((i) => i.eligibility.eligible).length, [enriched]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const stipend = bandOf(STIPEND_BANDS, stipendBand);
    const duration = bandOf(DURATION_BANDS, durationBand);
    const window = POSTED_WINDOWS.find((w) => w.key === postedWithin) || POSTED_WINDOWS[0];
    const cutoff = window.days ? Date.now() - window.days * 86400000 : null;

    return enriched
      .filter((i) => {
        const matchesSearch =
          !q || i.title.toLowerCase().includes(q) || i.company.toLowerCase().includes(q) || (i.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesDomain = domain === "All" || i.domain === domain;
        const matchesType = type === "All" || i.type === type;
        const matchesLocation = location === "All" || i.location === location;
        const matchesStipend = stipend.test(parseStipend(i.stipend));
        const matchesDuration = duration.test(parseDurationMonths(i.duration));
        const matchesPosted = !cutoff || (i.postedAt ? new Date(i.postedAt).getTime() >= cutoff : true);
        const matchesEligibility = !eligibleOnly || i.eligibility.eligible;
        return (
          matchesSearch && matchesDomain && matchesType && matchesLocation &&
          matchesStipend && matchesDuration && matchesPosted && matchesEligibility
        );
      })
      .sort((a, b) => {
        const aNew = recentNewIds.has(a.id);
        const bNew = recentNewIds.has(b.id);
        if (aNew && !bNew) return -1;
        if (!aNew && bNew) return 1;
        if (sortBy === "newest") return new Date(b.postedAt || 0) - new Date(a.postedAt || 0);
        if (sortBy === "deadline") return new Date(a.deadline) - new Date(b.deadline);
        return b.match - a.match;
      });
  }, [enriched, search, domain, type, location, stipendBand, durationBand, postedWithin, sortBy, eligibleOnly, recentNewIds]);

  /** Live role counts per cluster and per sector, so a filter never offers a
      choice that would return nothing. Clusters with no live roles are hidden. */
  const sectorClusters = useMemo(() => {
    const counts = {};
    enriched.forEach((i) => { counts[i.domain] = (counts[i.domain] || 0) + 1; });
    return SECTOR_CLUSTERS.map((cluster) => {
      const items = cluster.items.filter((d) => counts[d]).map((d) => ({ domain: d, count: counts[d] }));
      return { ...cluster, items, count: items.reduce((n, i) => n + i.count, 0) };
    }).filter((cluster) => cluster.count > 0);
  }, [enriched]);

  const locations = useMemo(
    () => ["All", ...[...new Set(enriched.map((i) => i.location).filter(Boolean))].sort()],
    [enriched]
  );

  /** Every non-default filter, as removable chips — otherwise the only way to
      see what is currently narrowing the list is to scan each control. */
  const activeFilters = useMemo(() => {
    const chips = [];
    if (domain !== "All") chips.push({ key: "domain", label: domain, clear: () => setDomain("All") });
    if (type !== "All") chips.push({ key: "type", label: type, clear: () => setType("All") });
    if (location !== "All") chips.push({ key: "location", label: location, clear: () => setLocation("All") });
    if (stipendBand !== "any") chips.push({ key: "stipend", label: bandOf(STIPEND_BANDS, stipendBand).label, clear: () => setStipendBand("any") });
    if (durationBand !== "any") chips.push({ key: "duration", label: bandOf(DURATION_BANDS, durationBand).label, clear: () => setDurationBand("any") });
    if (postedWithin !== "any") chips.push({ key: "posted", label: POSTED_WINDOWS.find((w) => w.key === postedWithin).label, clear: () => setPostedWithin("any") });
    if (eligibleOnly) chips.push({ key: "eligible", label: "Eligible roles only", clear: () => setEligibleOnly(false) });
    if (search.trim()) chips.push({ key: "search", label: `“${search.trim()}”`, clear: () => setSearch("") });
    return chips;
  }, [domain, type, location, stipendBand, durationBand, postedWithin, eligibleOnly, search]);

  function clearAllFilters() {
    setDomain("All");
    setType("All");
    setLocation("All");
    setStipendBand("any");
    setDurationBand("any");
    setPostedWithin("any");
    setEligibleOnly(false);
    setSearch("");
    setSectorQuery("");
  }

  // Views feed the recruiter's performance panel — recorded once per posting
  // per browser session, not on every re-render.
  useEffect(() => {
    filtered.forEach((i) => recordInternshipView(i.id));
  }, [filtered]);

  function confirmApply(note) {
    // Eligibility is re-decided inside the store from the posting's own
    // criteria, so an ineligible application is refused here rather than
    // relying on the button having been hidden.
    try {
      applyToInternship(applyTarget, user, null, note);
      setAppliedIds((prev) => new Set([...prev, applyTarget.id]));
      setApplyTarget(null);
    } catch (err) {
      setApplyTarget(null);
      setFlash(err.message);
    }
  }

  return (
    <div className="animate-fade-slide space-y-5">
      <PageHeader
        eyebrow="Explore Opportunities"
        title="Internship & Job Listings"
        subtitle={`${filtered.length} live ${filtered.length === 1 ? "opportunity" : "opportunities"} matched to your skill profile`}
      />

      <Flash message={flash} />

      <Card className="space-y-3.5">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search roles, organisations, skills…" className="flex-1 min-w-[12rem]" />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto" aria-label="Sort roles by">
            <option value="match">Best Match</option>
            <option value="newest">Newest first</option>
            <option value="deadline">Deadline soonest</option>
          </Select>
        </div>

        <SectorFilter
          clusters={sectorClusters}
          value={domain}
          onChange={setDomain}
          query={sectorQuery}
          onQuery={setSectorQuery}
        />

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <FilterPills label="Type:" options={typeFilters} value={type} onChange={setType} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Filter by location" className="text-xs">
            {locations.map((l) => <option key={l} value={l}>{l === "All" ? "Any location" : l}</option>)}
          </Select>
          <Select value={stipendBand} onChange={(e) => setStipendBand(e.target.value)} aria-label="Filter by stipend" className="text-xs">
            {STIPEND_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </Select>
          <Select value={durationBand} onChange={(e) => setDurationBand(e.target.value)} aria-label="Filter by duration" className="text-xs">
            {DURATION_BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </Select>
          <Select value={postedWithin} onChange={(e) => setPostedWithin(e.target.value)} aria-label="Filter by when posted" className="text-xs">
            {POSTED_WINDOWS.map((w) => <option key={w.key} value={w.key}>{w.key === "any" ? "Posted any time" : `Posted: ${w.label.toLowerCase()}`}</option>)}
          </Select>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground font-medium mr-0.5">Active:</span>
            {activeFilters.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.clear}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {chip.label}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Remove filter</span>
              </button>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded">
              Clear all
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-3">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            Only show roles I&apos;m eligible for
            <span className="text-muted-foreground/70">
              ({eligibleCount} of {enriched.length} open roles)
            </span>
          </label>
          {appliedIds.size > 0 && <span className="text-xs text-primary font-medium pt-3">{appliedIds.size} applied</span>}
        </div>
      </Card>

      {filtered.length === 0 ? (
        eligibleOnly ? (
          <EmptyState
            icon="🎯"
            title="No roles match your current profile yet"
            action={<Button size="sm" onClick={() => navigate("student-dashboard")}>See what to improve</Button>}
          >
            Every open role asks for something you haven&apos;t met yet — a minimum skill score, a department, or a partner
            institution. Your skill-gap nudges show which areas move the most roles into reach, or switch the filter off to
            browse everything.
          </EmptyState>
        ) : (
          <EmptyState icon="🔍" title="No results found">Try adjusting your filters or search terms.</EmptyState>
        )
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((intern) => {
            const isApplied = appliedIds.has(intern.id);
            const isSaved = savedIds.has(intern.id);
            const gap = computeSkillGap(intern, portfolio);
            const blocked = !intern.eligibility.eligible;
            return (
              <Card key={intern.id} hover className="flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: intern.color || domainColor(intern.domain) }}>
                      {intern.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground leading-tight">{intern.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{intern.company}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSave(intern)}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                    aria-label={isSaved ? "Unsave" : "Save"}
                    title={isSaved ? "Remove from saved roles" : "Save for later — shows on your dashboard"}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {recentNewIds.has(intern.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                      </span>
                      NEW
                    </span>
                  )}
                  <Badge tone={typeTone[intern.type] || "neutral"}>{intern.type}</Badge>
                  <Badge tone="neutral">{intern.domain}</Badge>
                  {intern.hot && <Badge tone="amber">🔥 Hot</Badge>}
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {(intern.tags || []).slice(0, 2).map((tag) => <Badge key={tag} tone="primary">{tag}</Badge>)}
                  {(intern.tags || []).length > 2 && <span className="text-[10px] text-muted-foreground">+{intern.tags.length - 2}</span>}
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground mb-3">
                  <div className="truncate">📍 {intern.location}</div>
                  <div>⏱ {intern.duration}</div>
                  <div>💰 {intern.stipend}</div>
                  <div>📅 Due {formatDate(intern.deadline)}</div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Skill match</span>
                    <span className="font-semibold text-primary">{intern.match}%</span>
                  </div>
                  <ProgressBar value={intern.match} tone="bg-primary" />
                  {gap.missing.length > 0 && <div className="text-[10px] text-amber-600 mt-1.5">You're missing: {gap.missing.join(", ")}</div>}
                </div>

                {/* Eligibility is stated on every card, not just the blocked
                    ones — "why can't I apply" and "can I apply" are the same
                    question, and a silent card answers neither. */}
                {blocked ? (
                  <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-3 space-y-0.5">
                    <div className="font-semibold">✕ Not eligible yet</div>
                    {intern.eligibility.reasons.map((reason) => (
                      <div key={reason}>{reason}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 mb-3">
                    ✓ You&apos;re eligible for this role
                  </div>
                )}

                <button
                  onClick={() => setApplyTarget(intern)}
                  disabled={isApplied || blocked}
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isApplied
                      ? "bg-primary/10 text-primary cursor-default"
                      : blocked
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary hover:bg-accent text-white hover:shadow-md hover:scale-[1.02]"
                  }`}
                >
                  {isApplied ? "✓ Applied" : blocked ? "Not eligible" : "Apply Now"}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {applyTarget && (
        <ApplyConfirmModal internship={applyTarget} user={user} onConfirm={confirmApply} onClose={() => setApplyTarget(null)} />
      )}
    </div>
  );
}

const EMPTY_POSTING = {
  title: "",
  location: "",
  type: "Hybrid",
  domain: ALL_DOMAINS[0],
  duration: "",
  stipend: "",
  tags: "",
  deadline: "",
  description: "",
  minSkillScore: "",
  eligibleDepartments: [],
  eligibleInstitutions: "",
};

function IndustryView({ user }) {
  const [postings, setPostings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [flash, setFlash] = useFlash();

  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("deadline");

  function refresh() {
    setPostings(listInternshipsByOwner(user.id));
    setApplications(listApplicationsForOwner(user.id));
    setRecruiters(listRecruiters(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  useEffect(() => {
    const unsub = subscribeToMutations(["internships", "applications"], () => {
      refresh();
    });
    return unsub;
  }, [user]);

  function appsFor(internshipId) {
    return applications.filter((a) => a.internshipId === internshipId);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = postings.filter((p) => {
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesDomain = domainFilter === "All" || p.domain === domainFilter;
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesDomain && matchesStatus;
    });
    const sorters = {
      deadline: (a, b) => daysUntil(a.deadline) - daysUntil(b.deadline),
      applicants: (a, b) => appsFor(b.id).length - appsFor(a.id).length,
      views: (a, b) => (b.views || 0) - (a.views || 0),
      newest: (a, b) => new Date(b.postedAt) - new Date(a.postedAt),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...rows].sort(sorters[sortBy] || sorters.deadline);
  }, [postings, applications, search, domainFilter, statusFilter, sortBy]);

  function handleSubmit(data) {
    const payload = {
      title: data.title,
      location: data.location || "Remote",
      type: data.type,
      domain: data.domain,
      duration: data.duration || "3 months",
      stipend: data.stipend || "Unpaid",
      tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
      deadline: data.deadline || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      description: data.description,
      minSkillScore: data.minSkillScore ? Number(data.minSkillScore) : null,
      eligibleDepartments: data.eligibleDepartments,
      eligibleInstitutions: data.eligibleInstitutions.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (editing) {
      update("internships", editing.id, payload);
      setFlash("Posting updated.");
    } else {
      createInternship(user.id, user.companyName || user.name, payload);
      setFlash("Posting published.");
    }
    setShowModal(false);
    setEditing(null);
    refresh();
  }

  const domainsInUse = ["All", ...[...new Set(postings.map((p) => p.domain))].sort()];
  const openCount = postings.filter((p) => p.status === "Open").length;
  const totalViews = postings.reduce((s, p) => s + (p.views || 0), 0);
  const totalUnique = postings.reduce((s, p) => s + (p.uniqueViews || 0), 0);

  return (
    <div className="animate-fade-slide space-y-5">
      <PageHeader
        title="Your Postings"
        subtitle={`${postings.length} opportunit${postings.length === 1 ? "y" : "ies"} posted · ${openCount} currently open`}
        actions={<Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>Post new opportunity</Button>}
      />

      <Flash message={flash} />

      <StatGrid
        stats={[
          { label: "Open postings", value: String(openCount), icon: "📋", hint: `${postings.length - openCount} closed` },
          { label: "Total views", value: String(totalViews), icon: "👁", hint: `${totalUnique} unique visitor${totalUnique === 1 ? "" : "s"}` },
          { label: "Applicants", value: String(applications.length), icon: "📥" },
          {
            label: "View → apply rate",
            value: totalUnique ? `${Math.round((applications.length / totalUnique) * 100)}%` : "—",
            icon: "📈",
            hint: "Applications per unique viewer",
          },
        ]}
      />

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search your postings…" className="flex-1 min-w-[200px]" />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
            <option value="deadline">Sort: Deadline soonest</option>
            <option value="applicants">Sort: Most applicants</option>
            <option value="views">Sort: Most viewed</option>
            <option value="newest">Sort: Recently posted</option>
            <option value="title">Sort: Title</option>
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Sector">
            <Select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
              {domainsInUse.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {["All", "Open", "Closed"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title={postings.length ? "No postings match these filters" : "No postings yet"}
          action={!postings.length && <Button size="sm" onClick={() => setShowModal(true)}>Post your first opening</Button>}
        >
          {postings.length ? "Try clearing a filter." : "Post an internship or job opening to start receiving applicants."}
        </EmptyState>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const apps = appsFor(p.id);
            const inPipeline = apps.filter((a) => !TERMINAL_STAGES.includes(a.status));
            const rejectedCount = apps.filter((a) => a.status === "Rejected").length;
            const days = daysUntil(p.deadline);
            const funnel = STAGE_ORDER.map((stage, i) => ({
              stage,
              count: inPipeline.filter((a) => STAGE_ORDER.indexOf(a.status) >= i).length,
            }));
            const applyRate = p.uniqueViews ? Math.round((apps.length / p.uniqueViews) * 100) : null;
            return (
              <Card key={p.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{p.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.location} · {p.type} · {p.duration}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge tone={p.status === "Open" ? "green" : "muted"}>{p.status}</Badge>
                    {p.status === "Closed" && p.closedReason && <span className="text-[9px] text-muted-foreground">{p.closedReason}</span>}
                    {p.status === "Open" && days >= 0 && days <= 10 && <Badge tone="red">{days}d left</Badge>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{p.domain}</span>
                  {(p.tags || []).slice(0, 2).map((t) => <span key={t} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{t}</span>)}
                </div>

                {(p.minSkillScore || (p.eligibleDepartments || []).length > 0) && (
                  <div className="text-[10px] text-muted-foreground mb-3">
                    🎯 {p.minSkillScore ? `Min. score ${p.minSkillScore}` : ""}
                    {p.minSkillScore && (p.eligibleDepartments || []).length ? " · " : ""}
                    {(p.eligibleDepartments || []).length ? `${p.eligibleDepartments.length} eligible department${p.eligibleDepartments.length === 1 ? "" : "s"}` : ""}
                  </div>
                )}

                <div className="mb-3">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Applicant funnel</div>
                  {apps.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No applicants yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {funnel.map((f) => (
                        <div key={f.stage} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0">{f.stage}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${(f.count / (funnel[0].count || 1)) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-foreground w-4 text-right flex-shrink-0">{f.count}</span>
                        </div>
                      ))}
                      {rejectedCount > 0 && (
                        <p className="text-[9px] text-muted-foreground pt-1">
                          {rejectedCount} rejected, not in live funnel
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground mb-1">
                  👁 {p.views || 0} view{p.views === 1 ? "" : "s"} · {p.uniqueViews || 0} unique
                  {applyRate != null && ` · ${applyRate}% applied`}
                </div>
                <div className="text-[10px] text-muted-foreground mb-4">
                  📅 Due {formatDate(p.deadline)}{p.recruiterName ? ` · owned by ${p.recruiterName}` : " · unassigned"}
                </div>

                <div className="mt-auto grid grid-cols-3 gap-1.5">
                  <button onClick={() => { setEditing(p); setShowModal(true); }} className="text-[11px] font-medium py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    Edit
                  </button>
                  <button
                    onClick={() => { cloneInternship(p.id); refresh(); setFlash(`Duplicated "${p.title}" as a new draft.`); }}
                    className="text-[11px] font-medium py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => { setPostingStatus(p.id, p.status === "Open" ? "Closed" : "Open"); refresh(); setFlash(p.status === "Open" ? "Posting paused." : "Posting reopened."); }}
                    className="text-[11px] font-medium py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    {p.status === "Open" ? "Pause" : "Reopen"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <PostingModal
          posting={editing}
          recruiters={recruiters}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function PostingModal({ posting, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    posting
      ? {
          ...EMPTY_POSTING,
          ...posting,
          tags: (posting.tags || []).join(", "),
          minSkillScore: posting.minSkillScore ? String(posting.minSkillScore) : "",
          eligibleDepartments: posting.eligibleDepartments || [],
          eligibleInstitutions: (posting.eligibleInstitutions || []).join(", "),
        }
      : EMPTY_POSTING
  );
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      title={posting ? "Edit posting" : "Post a new opportunity"}
      description="Minimum qualifications filter applications before they reach you."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
        <Field label="Role title"><TextInput required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Software Development Engineer Intern" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Work type">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {["Remote", "Hybrid", "Onsite"].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Sector">
            <Select value={form.domain} onChange={(e) => set("domain", e.target.value)}>
              {DOMAIN_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((d) => <option key={d}>{d}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Location"><TextInput value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Pune / Remote" /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stipend / CTC"><TextInput value={form.stipend} onChange={(e) => set("stipend", e.target.value)} placeholder="₹18,000/mo" /></Field>
          <Field label="Duration"><TextInput value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="6 months" /></Field>
        </div>

        <Field label="Application deadline" hint="The posting closes itself once this date passes; you can reopen it manually.">
          <TextInput type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
        </Field>

        <Field label="Required skills" hint="Comma separated — these drive the skill-match score students see.">
          <TextInput value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="React, Financial Modelling, Quality Control" />
        </Field>

        <div className="border-t border-border pt-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Minimum qualifications</div>

          <Field label="Minimum skill score" hint="Students below this can't apply. Leave blank for no floor." className="mb-3">
            <TextInput type="number" min="0" max="100" value={form.minSkillScore} onChange={(e) => set("minSkillScore", e.target.value)} placeholder="60" />
          </Field>

          <Field label="Eligible departments" hint="Leave empty to accept every department." className="mb-3">
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    set("eligibleDepartments", form.eligibleDepartments.includes(d) ? form.eligibleDepartments.filter((x) => x !== d) : [...form.eligibleDepartments, d])
                  }
                  className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
                    form.eligibleDepartments.includes(d) ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Eligible institutions" hint="Comma separated. Leave empty to open the role to every institution.">
            <TextInput value={form.eligibleInstitutions} onChange={(e) => set("eligibleInstitutions", e.target.value)} placeholder="Apex University of Technology & Applied Sciences" />
          </Field>
        </div>

        <Field label="Description">
          <TextArea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What the intern will actually work on." />
        </Field>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">{posting ? "Save changes" : "Publish posting"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function InternshipListings() {
  const { user } = useAuth();
  const title = user.role === "industry" ? "Manage Postings" : "Internship & Job Listings";

  return (
    <DashboardLayout activePage="internship-listings" title={title}>
      {user.role === "industry" ? <IndustryView user={user} /> : <StudentView user={user} />}
    </DashboardLayout>
  );
}
