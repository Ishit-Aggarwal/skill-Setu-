/**
 * Resume Coach — the pure parts: the response schema the model must fill,
 * and everything the server checks before a single word reaches the student.
 *
 *   - a recommended test that is not in the catalogue the model was given is
 *     dropped (it cannot invent a test);
 *   - a domain outside SKILL_DOMAINS is dropped; numbers are clamped 0–100;
 *   - a "reference" that looks like a URL is stripped (named texts only);
 *   - every evidence quote is checked against the resume's own text and
 *     marked `unverifiedEvidence` when it cannot be found;
 *   - the "unverified claim" status is decided here, by code: the resume
 *     claims a domain strongly (signal ≥ 60) where the student's verified test
 *     score is below 40 or missing — the academia–industry trust gap;
 *   - phone numbers, emails, addresses and Aadhaar-like numbers are removed
 *     before anything is stored.
 *
 * No "use client", no I/O: the API route, Convex and the tests share it.
 */

export const SKILL_CATEGORIES = ["clinical", "pharma", "research", "yoga-wellness", "digital", "soft"];
export const READINESS_STATUSES = ["strong", "developing", "gap", "unverified-claim"];

export const CAREER_TRACKS = [
  "Clinical Research Associate (AYUSH)",
  "QC/QA Analyst: ASU&H Pharma",
  "Panchakarma Therapist",
  "Yoga Instructor/Therapist",
  "AYUSH Pharmacovigilance Associate",
  "AYUSH Digital Health Associate",
  "Ayurvedic Medical Officer (Kayachikitsa)",
  "Herbal Drug Regulatory Affairs Executive",
  "Wellness Centre Coordinator (AYUSH)",
];

const S = (type, extra = {}) => ({ type, ...extra });
const STR = S("STRING");
const NUM = S("NUMBER");
const arr = (items) => S("ARRAY", { items });
const obj = (properties, required = Object.keys(properties)) => S("OBJECT", { properties, required });

/** The Gemini response schema (Section 8.4), plus a transcript used to check evidence. */
export const RESUME_SCHEMA = obj({
  transcript: STR,
  profile: obj({ name: STR, course: STR, year: STR, institution: STR, ayushSystem: STR, summary: STR }),
  extracted: obj({
    education: arr(obj({ degree: STR, institution: STR, year: STR, evidence: STR })),
    skills: arr(obj({ name: STR, category: S("STRING", { enum: SKILL_CATEGORIES }), evidence: STR })),
    projects: arr(obj({ title: STR, summary: STR, evidence: STR })),
    experience: arr(obj({ role: STR, org: STR, duration: STR, evidence: STR })),
    certifications: arr(obj({ name: STR, issuer: STR, year: STR, evidence: STR })),
  }),
  domainReadiness: arr(obj({ domain: STR, resumeSignal: NUM, why: STR })),
  strengths: arr(obj({ point: STR, evidence: STR })),
  gaps: arr(obj({ point: STR, why: STR, forTarget: S("BOOLEAN") })),
  nextTests: arr(obj({ testId: STR, priority: NUM, why: STR, prepareTopics: arr(STR), readinessNow: NUM })),
  generalTestAreas: arr(obj({ domain: STR, why: STR })),
  studyPlan: obj({
    weeks: NUM,
    topics: arr(obj({ id: STR, title: STR, subtopics: arr(STR), whyItMatters: STR, forTestId: STR, estHours: NUM, references: arr(STR) })),
    schedule: arr(obj({ week: NUM, topicIds: arr(STR), goal: STR })),
  }),
  resumeFixes: arr(obj({ issue: STR, suggestion: STR, example: STR })),
  targetMatch: obj({ targetTitle: STR, matchPercent: NUM, matched: arr(STR), missing: arr(STR) }, ["targetTitle", "matchPercent", "matched", "missing"]),
  warnings: arr(STR),
});

/* ---------------- small helpers ---------------- */

export function clamp100(n) {
  const x = Math.round(Number(n));
  return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 0;
}

function str(v, max = 400) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?91[\s-]?)?(?:\(?0?\d{2,4}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,6}\b/g;
const AADHAAR = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
const PINCODE_ADDRESS = /\b(?:house|flat|h\.?\s?no\.?|plot|street|st\.|road|rd\.|lane|nagar|sector|colony|pin(?:code)?)\b[^\n,;]{0,60}/gi;

/** Removes emails, phone numbers, Aadhaar-like numbers and street-address fragments. */
export function scrubContact(text) {
  return String(text ?? "")
    .replace(EMAIL, "[removed]")
    .replace(AADHAAR, "[removed]")
    .replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 10 ? "[removed]" : m))
    .replace(PINCODE_ADDRESS, "[removed]");
}

function scrubDeep(value) {
  if (typeof value === "string") return scrubContact(value);
  if (Array.isArray(value)) return value.map(scrubDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubDeep(v)]));
  return value;
}

function tokens(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Whether an evidence quote appears in the resume text: normalised
 * whitespace, case-insensitive, with at least 60 % of its words present in
 * order-insensitive overlap (a model paraphrasing slightly still passes; an
 * invented line does not).
 */
export function evidenceMatches(evidence, resumeText, threshold = 0.6) {
  const want = tokens(evidence);
  if (!want.length) return false;
  const hay = String(resumeText ?? "").toLowerCase().replace(/\s+/g, " ");
  if (hay.includes(String(evidence).toLowerCase().replace(/\s+/g, " ").trim())) return true;
  const have = new Set(tokens(resumeText));
  const hit = want.filter((w) => have.has(w)).length;
  return hit / want.length >= threshold;
}

const URLISH = /(https?:\/\/|www\.|\.(com|org|in|gov|net|edu)\b)/i;

/** Named texts only — "Charaka Samhita, Sutrasthana ch. 1" — never a link. */
export function cleanReferences(list) {
  return (Array.isArray(list) ? list : []).map((r) => str(r, 160)).filter((r) => r && !URLISH.test(r)).slice(0, 6);
}

/**
 * The status of one domain, decided by code:
 *   unverified-claim — the resume claims it (signal ≥ 60), tests don't back it (verified < 40 or none)
 *   strong           — verified ≥ 70
 *   developing       — verified 40–69
 *   gap              — anything else
 */
export function domainStatus(resumeSignal, verifiedScore) {
  const verified = verifiedScore == null ? null : Number(verifiedScore);
  if (resumeSignal >= 60 && (verified == null || verified < 40)) return "unverified-claim";
  if (verified != null && verified >= 70) return "strong";
  if (verified != null && verified >= 40) return "developing";
  return "gap";
}

/* ---------------- the validator ---------------- */

/**
 * Checks and shapes the model's answer.
 *   catalogue    — [{ testId, title, domain, ... }] the student can actually take
 *   skillDomains — the platform's domain list
 *   resumeText   — text the evidence must appear in (extracted, else the model's transcript)
 *   verified     — { [domain]: score } from the student's graded tests
 *   hasTarget    — whether a target was chosen
 * Returns { result, dropped: { tests, domains, references } }.
 */
export function validateResumeResult(raw, { catalogue = [], skillDomains = [], resumeText = "", verified = {}, hasTarget = false } = {}) {
  const catalogueIds = new Set(catalogue.map((t) => t.testId));
  const domains = new Set(skillDomains);
  const text = resumeText || str(raw?.transcript, 60000);
  const dropped = { tests: [], domains: [], references: 0 };
  const withEvidence = (item) => {
    const evidence = str(item?.evidence, 300);
    return { evidence, unverifiedEvidence: !evidenceMatches(evidence, text) };
  };

  const ex = raw?.extracted || {};
  const extracted = {
    education: (ex.education || []).slice(0, 12).map((e) => ({ degree: str(e.degree, 120), institution: str(e.institution, 160), year: str(e.year, 20), ...withEvidence(e) })).filter((e) => e.degree),
    skills: (ex.skills || []).slice(0, 40).map((s) => ({ name: str(s.name, 80), category: SKILL_CATEGORIES.includes(s.category) ? s.category : "soft", level: "claimed", ...withEvidence(s) })).filter((s) => s.name),
    projects: (ex.projects || []).slice(0, 15).map((p) => ({ title: str(p.title, 150), summary: str(p.summary, 400), ...withEvidence(p) })).filter((p) => p.title),
    experience: (ex.experience || []).slice(0, 15).map((e) => ({ role: str(e.role, 120), org: str(e.org, 160), duration: str(e.duration, 60), ...withEvidence(e) })).filter((e) => e.role || e.org),
    certifications: (ex.certifications || []).slice(0, 20).map((c) => ({ name: str(c.name, 150), issuer: str(c.issuer, 120), year: str(c.year, 20), ...withEvidence(c) })).filter((c) => c.name),
  };

  const seenDomains = new Set();
  const domainReadiness = [];
  for (const d of raw?.domainReadiness || []) {
    const domain = str(d?.domain, 120);
    if (!domains.has(domain)) {
      dropped.domains.push(domain);
      continue;
    }
    if (seenDomains.has(domain)) continue;
    seenDomains.add(domain);
    const resumeSignal = clamp100(d.resumeSignal);
    const verifiedScore = verified[domain] == null ? null : clamp100(verified[domain]);
    domainReadiness.push({ domain, resumeSignal, verifiedScore, status: domainStatus(resumeSignal, verifiedScore), why: str(d.why, 300) });
  }
  // Every domain the student has a verified score in is shown, even if the model skipped it.
  for (const [domain, score] of Object.entries(verified)) {
    if (!domains.has(domain) || seenDomains.has(domain)) continue;
    domainReadiness.push({ domain, resumeSignal: 0, verifiedScore: clamp100(score), status: domainStatus(0, score), why: "Verified by your test results; your resume doesn't mention it." });
  }

  const nextTests = [];
  for (const t of raw?.nextTests || []) {
    const testId = str(t?.testId, 120);
    if (!catalogueIds.has(testId)) {
      dropped.tests.push(testId);
      continue;
    }
    if (nextTests.some((n) => n.testId === testId)) continue;
    nextTests.push({
      testId,
      priority: Math.max(1, Math.min(3, Math.round(Number(t.priority) || nextTests.length + 1))),
      why: str(t.why, 400),
      prepareTopics: (t.prepareTopics || []).map((p) => str(p, 120)).filter(Boolean).slice(0, 6),
      readinessNow: clamp100(t.readinessNow),
    });
    if (nextTests.length >= 3) break;
  }
  nextTests.sort((a, b) => a.priority - b.priority);

  const planTopics = (raw?.studyPlan?.topics || []).slice(0, 20).map((t, i) => {
    const refs = Array.isArray(t.references) ? t.references : [];
    const references = cleanReferences(refs);
    dropped.references += refs.length - references.length;
    return {
      id: str(t.id, 40) || `topic-${i + 1}`,
      title: str(t.title, 150),
      subtopics: (t.subtopics || []).map((s) => str(s, 120)).filter(Boolean).slice(0, 8),
      whyItMatters: str(t.whyItMatters, 300),
      forTestId: catalogueIds.has(str(t.forTestId, 120)) ? str(t.forTestId, 120) : null,
      estHours: Math.max(1, Math.min(40, Math.round(Number(t.estHours) || 2))),
      references,
    };
  }).filter((t) => t.title);
  const topicIds = new Set(planTopics.map((t) => t.id));
  const weeks = Math.max(1, Math.min(8, Math.round(Number(raw?.studyPlan?.weeks) || 4)));
  const schedule = (raw?.studyPlan?.schedule || [])
    .map((s) => ({ week: Math.max(1, Math.min(weeks, Math.round(Number(s.week) || 1))), topicIds: (s.topicIds || []).map((x) => str(x, 40)).filter((x) => topicIds.has(x)), goal: str(s.goal, 200) }))
    .filter((s) => s.topicIds.length)
    .sort((a, b) => a.week - b.week);

  const tm = raw?.targetMatch;
  const targetMatch =
    hasTarget && tm && str(tm.targetTitle)
      ? { targetTitle: str(tm.targetTitle, 150), matchPercent: clamp100(tm.matchPercent), matched: (tm.matched || []).map((m) => str(m, 100)).filter(Boolean).slice(0, 15), missing: (tm.missing || []).map((m) => str(m, 100)).filter(Boolean).slice(0, 15) }
      : null;

  const result = scrubDeep({
    profile: {
      name: str(raw?.profile?.name, 120),
      course: str(raw?.profile?.course, 120),
      year: str(raw?.profile?.year, 40),
      institution: str(raw?.profile?.institution, 160),
      ayushSystem: str(raw?.profile?.ayushSystem, 60),
      summary: str(raw?.profile?.summary, 500).split(" ").slice(0, 60).join(" "),
    },
    extracted,
    domainReadiness,
    strengths: (raw?.strengths || []).slice(0, 8).map((s) => ({ point: str(s.point, 200), ...withEvidence(s) })).filter((s) => s.point),
    gaps: (raw?.gaps || []).slice(0, 8).map((g) => ({ point: str(g.point, 200), why: str(g.why, 300), forTarget: Boolean(g.forTarget) })).filter((g) => g.point),
    nextTests,
    generalTestAreas: (raw?.generalTestAreas || []).filter((g) => domains.has(str(g?.domain, 120))).slice(0, 4).map((g) => ({ domain: str(g.domain, 120), why: str(g.why, 300) })),
    studyPlan: { weeks, topics: planTopics, schedule },
    resumeFixes: (raw?.resumeFixes || []).slice(0, 10).map((f) => ({ issue: str(f.issue, 200), suggestion: str(f.suggestion, 300), example: str(f.example, 300) })).filter((f) => f.issue),
    targetMatch,
    warnings: (raw?.warnings || []).map((w) => str(w, 300)).filter(Boolean).slice(0, 6),
  });
  return { result, dropped };
}

/** The headline "overall readiness" for the history trend: the mean verified score across the analysis's domains. */
export function overallReadiness(result) {
  const scores = (result?.domainReadiness || []).map((d) => d.verifiedScore).filter((n) => n != null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

/**
 * The same input from the student's Skill Setu portfolio, for a student with
 * no resume file (and as the fallback when a file can't be read).
 */
export function portfolioToText(user, portfolio) {
  const p = portfolio || {};
  const lines = [
    user?.name || "",
    [user?.course, user?.year, user?.institution || user?.instituteName].filter(Boolean).join(" · "),
    p.headline || user?.headline || "",
    p.bio || user?.bio || "",
  ];
  if ((p.education || []).length) lines.push("EDUCATION", ...(p.education || []).map((e) => `${e.degree} — ${e.institution || ""} ${e.endYear || e.startYear || ""}`));
  const skills = Object.entries(p.skillBadges || {}).flatMap(([cat, list]) => (list || []).map((s) => `${s.name}${cat ? ` (${cat})` : ""}`));
  if (skills.length) lines.push("SKILLS", skills.join(", "));
  if ((p.projects || []).length) lines.push("PROJECTS", ...(p.projects || []).map((x) => `${x.title}: ${x.description || x.summary || ""}`));
  if ((p.timeline || []).length) lines.push("EXPERIENCE", ...(p.timeline || []).map((x) => `${x.title} — ${x.org || ""} ${x.year || ""} ${x.detail || ""}`));
  if ((p.certifications || []).length) lines.push("CERTIFICATIONS", ...(p.certifications || []).map((c) => `${c.name} — ${c.issuer || ""} ${c.year || ""}`));
  return lines.filter((l) => String(l).trim()).join("\n");
}

/** Normalised title for duplicate detection when adding extracted items to the portfolio. */
export function sameTitle(a, b) {
  const n = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return Boolean(n(a)) && n(a) === n(b);
}
