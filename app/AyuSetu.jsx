"use client";

import React, { useState, useMemo } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, Cell,
} from "recharts";

/* ============================================================
   AyuSetu — Academia–Industry bridge for the AYUSH sector
   SIH26044 · Ministry of Ayush · All India Institute of Ayurveda
   Team CODE BREAKERS
   ============================================================ */

const T = {
  ink: "#12211E",
  teal: "#1B4B43",
  sage: "#4A7C59",
  sageSoft: "#8AAF95",
  paper: "#FAF7F2",
  paper2: "#F1EADE",
  line: "#DFD6C6",
  terra: "#C97B4A",
  terraSoft: "#EBCBB4",
  muted: "#61706B",
  white: "#FFFFFF",
};

const card = {
  background: T.white,
  border: `1px solid ${T.line}`,
  borderRadius: 16,
  boxShadow: "0 1px 2px rgba(18,33,30,.04), 0 14px 34px -22px rgba(18,33,30,.35)",
};

/* ---------------- domain data ---------------- */

const SKILLS = [
  { id: "panchakarma", label: "Panchakarma Practice", short: "Panchakarma" },
  { id: "formulation", label: "Herbal Formulation", short: "Formulation" },
  { id: "pharmacognosy", label: "Pharmacognosy & QC", short: "Pharmacognosy" },
  { id: "clinicaldoc", label: "Clinical Documentation", short: "Case records" },
  { id: "compliance", label: "AYUSH Regulatory Compliance", short: "Compliance" },
  { id: "research", label: "Research Methodology", short: "Research" },
  { id: "data", label: "Health Data & Analytics", short: "Data" },
  { id: "digital", label: "Digital Health / EHR", short: "Digital health" },
  { id: "counselling", label: "Patient Counselling", short: "Counselling" },
  { id: "yogatherapy", label: "Yoga Therapy Protocols", short: "Yoga therapy" },
];
const skillLabel = (id) => (SKILLS.find((s) => s.id === id) || {}).label || id;
const skillShort = (id) => (SKILLS.find((s) => s.id === id) || {}).short || id;

const OPTIONS = [
  { text: "Never done it", value: 15 },
  { text: "Studied it, little hands-on practice", value: 40 },
  { text: "Done it under supervision", value: 68 },
  { text: "Done it independently", value: 92 },
];

const QUESTIONS = [
  { skill: "panchakarma", q: "How often have you performed or assisted a complete Panchakarma procedure end to end?" },
  { skill: "formulation", q: "How much hands-on experience do you have preparing classical formulations — churna, kwatha, asava?" },
  { skill: "pharmacognosy", q: "Can you detect adulteration in a raw drug sample using organoleptic and microscopic methods?" },
  { skill: "clinicaldoc", q: "How comfortable are you writing a structured case sheet and discharge summary?" },
  { skill: "compliance", q: "How familiar are you with AYUSH GMP, Schedule T and CCRAS/NCISM norms?" },
  { skill: "research", q: "Have you designed a study protocol, calculated sample size, or drafted an informed-consent form?" },
  { skill: "data", q: "How comfortable are you analysing clinical or outcome data in Excel, SPSS or Python?" },
  { skill: "digital", q: "How much have you worked with EHR/HMIS systems or teleconsultation platforms such as e-Sanjeevani?" },
  { skill: "counselling", q: "How confident are you counselling a patient on diet, lifestyle and treatment adherence?" },
  { skill: "yogatherapy", q: "Can you build a graded yoga therapy protocol for a specific clinical condition?" },
];

const ROLES = [
  { id: "cra", title: "Clinical Research Associate", sector: "Ayush CRO / Research institute", demand: "High",
    requires: { research: 70, clinicaldoc: 70, data: 60, compliance: 55 } },
  { id: "qa", title: "Product Quality Analyst", sector: "Ayush manufacturing", demand: "High",
    requires: { pharmacognosy: 75, formulation: 65, compliance: 70, data: 45 } },
  { id: "yoga", title: "Yoga Therapist — Corporate Wellness", sector: "Wellness & preventive health", demand: "Growing",
    requires: { yogatherapy: 80, counselling: 70, clinicaldoc: 45 } },
  { id: "dh", title: "Ayush Digital Health Coordinator", sector: "Public health / digital health", demand: "Growing",
    requires: { digital: 75, data: 65, clinicaldoc: 60, counselling: 45 } },
  { id: "pk", title: "Panchakarma Consultant", sector: "Wellness hospitality", demand: "Steady",
    requires: { panchakarma: 85, counselling: 70, clinicaldoc: 50 } },
];

const OPPORTUNITIES = [
  { id: "o1", title: "Clinical Research Intern", org: "All India Institute of Ayurveda", loc: "New Delhi", type: "Internship",
    pay: "₹15,000 / month", closes: "12 Oct 2026", requires: { research: 65, clinicaldoc: 60, data: 55 },
    about: "Support ongoing multi-centre trials — protocol drafting, CRF maintenance and follow-up data entry." },
  { id: "o2", title: "Quality Control Analyst — Trainee", org: "Dabur Research Foundation", loc: "Ghaziabad", type: "Apprenticeship",
    pay: "₹18,000 / month", closes: "30 Sep 2026", requires: { pharmacognosy: 70, formulation: 60, compliance: 60 },
    about: "Raw-drug authentication, heavy-metal and microbial limit testing under AYUSH GMP." },
  { id: "o3", title: "Yoga Therapy Associate", org: "Kaivalyadhama Wellness", loc: "Pune", type: "Full-time",
    pay: "₹3.6 LPA", closes: "18 Oct 2026", requires: { yogatherapy: 75, counselling: 65 },
    about: "Design and deliver condition-specific yoga therapy programmes for corporate clients." },
  { id: "o4", title: "Ayush EHR Implementation Intern", org: "National Health Authority partner", loc: "Remote", type: "Internship",
    pay: "₹20,000 / month", closes: "05 Oct 2026", requires: { digital: 70, data: 60, clinicaldoc: 50 },
    about: "Help AYUSH colleges onboard to ABDM-compliant records and teleconsultation workflows." },
  { id: "o5", title: "Panchakarma Therapist", org: "Somatheeram Ayurveda Resort", loc: "Kerala", type: "Full-time",
    pay: "₹3.0 LPA", closes: "25 Sep 2026", requires: { panchakarma: 80, counselling: 65 },
    about: "Deliver classical Panchakarma protocols for international wellness guests." },
  { id: "o6", title: "Regulatory Affairs Trainee", org: "Himalaya Wellness", loc: "Bengaluru", type: "Internship",
    pay: "₹16,000 / month", closes: "08 Oct 2026", requires: { compliance: 70, formulation: 55, clinicaldoc: 50 },
    about: "Dossier preparation, label compliance and licence renewals for classical and proprietary medicines." },
];

const PROGRAMS = [
  { id: "p1", title: "AYUSH GMP & Schedule T Essentials", by: "Himalaya Wellness", weeks: 4, boosts: "compliance", mode: "Online + plant visit" },
  { id: "p2", title: "Clinical Data Analysis with Excel & Python", by: "AIIA Data Cell", weeks: 6, boosts: "data", mode: "Online" },
  { id: "p3", title: "Digital Health & e-Sanjeevani Operations", by: "National Health Authority", weeks: 3, boosts: "digital", mode: "Online" },
  { id: "p4", title: "Advanced Pharmacognosy Lab Techniques", by: "Dabur Research Foundation", weeks: 5, boosts: "pharmacognosy", mode: "On-site, Ghaziabad" },
  { id: "p5", title: "Therapeutic Yoga Protocol Design", by: "Kaivalyadhama", weeks: 4, boosts: "yogatherapy", mode: "Hybrid" },
  { id: "p6", title: "Good Clinical Practice & Protocol Writing", by: "CCRAS", weeks: 4, boosts: "research", mode: "Online" },
  { id: "p7", title: "Case Records & Discharge Summary Standards", by: "AIIA Clinical Faculty", weeks: 2, boosts: "clinicaldoc", mode: "Online" },
  { id: "p8", title: "Classical Formulation Practicum", by: "Kottakkal Arya Vaidya Sala", weeks: 6, boosts: "formulation", mode: "On-site, Kerala" },
  { id: "p9", title: "Counselling Skills for Ayush Practitioners", by: "AIIA", weeks: 2, boosts: "counselling", mode: "Online" },
  { id: "p10", title: "Panchakarma Advanced Practicum", by: "Somatheeram Academy", weeks: 8, boosts: "panchakarma", mode: "On-site, Kerala" },
];

const FACULTY_OPPS = [
  { id: "f1", kind: "FDP", title: "Research Methodology & Biostatistics for Ayush Faculty", by: "CCRAS", detail: "5 days · New Delhi · 40 seats", closes: "22 Sep 2026" },
  { id: "f2", kind: "Industrial training", title: "Two-week immersion in Ayush manufacturing", by: "Dabur Research Foundation", detail: "2 weeks · Ghaziabad · 12 seats", closes: "01 Oct 2026" },
  { id: "f3", kind: "Consultancy", title: "Stability testing advisory for proprietary formulations", by: "Patanjali Research Foundation", detail: "6 months · part-time · paid", closes: "15 Oct 2026" },
  { id: "f4", kind: "Collaborative research", title: "Multi-centre trial: Ayurveda in metabolic syndrome", by: "AIIA × IIT Delhi", detail: "24 months · co-PI slots open", closes: "30 Oct 2026" },
  { id: "f5", kind: "Guest lecture", title: "Industry guest series — regulatory pathways", by: "Himalaya Wellness", detail: "Rolling · honorarium", closes: "Rolling" },
];

const COHORT = SKILLS.map((s, i) => ({
  skill: s.short,
  cohort: [58, 61, 47, 66, 39, 44, 41, 35, 71, 54][i],
  industry: [80, 65, 75, 70, 70, 70, 65, 75, 70, 80][i],
}));

const FUNNEL = [
  { stage: "Registered", n: 1284 },
  { stage: "Assessed", n: 796 },
  { stage: "Applied", n: 512 },
  { stage: "Shortlisted", n: 214 },
  { stage: "Placed", n: 138 },
];

const DEMAND_TREND = [
  { m: "Mar", Compliance: 32, "Digital health": 21, Data: 27 },
  { m: "Apr", Compliance: 38, "Digital health": 29, Data: 31 },
  { m: "May", Compliance: 41, "Digital health": 37, Data: 34 },
  { m: "Jun", Compliance: 47, "Digital health": 48, Data: 39 },
  { m: "Jul", Compliance: 52, "Digital health": 59, Data: 44 },
  { m: "Aug", Compliance: 58, "Digital health": 71, Data: 49 },
];

const APPLICANTS = [
  { name: "Ishit Aggarwal", college: "AIIA, New Delhi", role: "Clinical Research Intern", match: 88, status: "Shortlisted" },
  { name: "Manvi Rawat", college: "NIA, Jaipur", role: "Regulatory Affairs Trainee", match: 81, status: "Applied" },
  { name: "Naitik Sharma", college: "AIIA, New Delhi", role: "Quality Control Analyst", match: 76, status: "Applied" },
  { name: "Shreya Paul", college: "Govt. Ayurveda College, Kolkata", role: "Clinical Research Intern", match: 72, status: "Shortlisted" },
  { name: "Viyona Menon", college: "Amrita School of Ayurveda", role: "Panchakarma Therapist", match: 91, status: "Selected" },
  { name: "Shaurya Dwivedi", college: "BHU, Varanasi", role: "Ayush EHR Implementation", match: 69, status: "Applied" },
];

const SAMPLE_PROFILE = {
  panchakarma: 40, formulation: 68, pharmacognosy: 40, clinicaldoc: 68, compliance: 40,
  research: 68, data: 68, digital: 40, counselling: 92, yogatherapy: 15,
};

/* ---------------- matching engine ---------------- */

function scoreAgainst(profile, requires) {
  const keys = Object.keys(requires);
  if (!keys.length) return { pct: 0, gaps: [], met: [] };
  let sum = 0;
  const gaps = [], met = [];
  keys.forEach((k) => {
    const have = profile[k] ?? 0;
    const need = requires[k];
    sum += Math.min(have / need, 1);
    (have >= need ? met : gaps).push({ skill: k, have, need, short: need - have });
  });
  gaps.sort((a, b) => b.short - a.short);
  return { pct: Math.round((sum / keys.length) * 100), gaps, met };
}

/* ---------------- small UI atoms ---------------- */

const Eyebrow = ({ children }) => (
  <div style={{ fontFamily: "var(--ui)", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: T.sage, fontWeight: 600 }}>
    {children}
  </div>
);

const Chip = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: { bg: T.paper2, fg: T.teal, bd: T.line },
    gap: { bg: "#FBEEE3", fg: "#9A5327", bd: T.terraSoft },
    good: { bg: "#E7F0E9", fg: T.teal, bd: "#C6DCCC" },
  }[tone];
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 12.5,
      background: tones.bg, color: tones.fg, border: `1px solid ${tones.bd}`, fontWeight: 500 }}>
      {children}
    </span>
  );
};

const Btn = ({ children, onClick, variant = "primary", small, disabled }) => {
  const styles = {
    primary: { background: T.teal, color: "#fff", border: `1px solid ${T.teal}` },
    accent: { background: T.terra, color: "#fff", border: `1px solid ${T.terra}` },
    ghost: { background: "transparent", color: T.teal, border: `1px solid ${T.line}` },
  }[variant];
  return (
    <button className="ay-btn" onClick={onClick} disabled={disabled}
      style={{ ...styles, padding: small ? "7px 13px" : "11px 20px", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--ui)", fontSize: small ? 13 : 14.5, fontWeight: 560, opacity: disabled ? .45 : 1 }}>
      {children}
    </button>
  );
};

const Card = ({ children, style }) => <div style={{ ...card, padding: 22, ...style }}>{children}</div>;

const H = ({ children, size = 26, style }) => (
  <h2 style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: size, color: T.ink, margin: 0, letterSpacing: "-.015em", ...style }}>
    {children}
  </h2>
);

const Muted = ({ children, style }) => (
  <p style={{ fontFamily: "var(--ui)", color: T.muted, fontSize: 14.5, lineHeight: 1.6, margin: 0, ...style }}>{children}</p>
);

const KPI = ({ label, value, sub }) => (
  <Card style={{ padding: 18, flex: "1 1 170px", minWidth: 150 }}>
    <div style={{ fontFamily: "var(--display)", fontSize: 30, fontWeight: 600, color: T.teal, letterSpacing: "-.02em" }}>{value}</div>
    <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, marginTop: 4, fontWeight: 550 }}>{label}</div>
    {sub && <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>}
  </Card>
);

/* --- signature element: the readiness meter --- */
const ReadinessMeter = ({ pct, gaps, compact }) => (
  <div>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontFamily: "var(--ui)", fontSize: 12.5, color: T.muted }}>Role readiness</span>
      <span style={{ fontFamily: "var(--display)", fontSize: compact ? 22 : 30, fontWeight: 600, color: pct >= 80 ? T.sage : T.terra, letterSpacing: "-.02em" }}>
        {pct}%
      </span>
    </div>
    <div style={{ position: "relative", height: 10, background: T.paper2, borderRadius: 999, overflow: "hidden" }}>
      <div className="ay-fill" style={{ width: `${pct}%`, height: "100%", borderRadius: 999,
        background: `linear-gradient(90deg, ${T.sage}, ${T.teal})` }} />
    </div>
    <div style={{ position: "relative", height: 14 }}>
      <div style={{ position: "absolute", left: "80%", top: 0, transform: "translateX(-50%)", textAlign: "center" }}>
        <div style={{ width: 1, height: 6, background: T.muted, margin: "0 auto" }} />
        <div style={{ fontFamily: "var(--ui)", fontSize: 10, color: T.muted, whiteSpace: "nowrap" }}>hiring bar</div>
      </div>
    </div>
    {gaps && gaps.length > 0 && (
      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, color: T.muted, marginBottom: 7 }}>Close these to qualify</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {gaps.slice(0, 4).map((g) => (
            <Chip key={g.skill} tone="gap">{skillShort(g.skill)} · +{g.short}</Chip>
          ))}
        </div>
      </div>
    )}
  </div>
);

/* ============================================================ */

export default function AyuSetu() {
  const [role, setRole] = useState(null);          // null = landing
  const [tab, setTab] = useState("overview");
  const [answers, setAnswers] = useState({});      // qIndex -> value
  const [profile, setProfile] = useState(null);
  const [qIdx, setQIdx] = useState(0);
  const [apps, setApps] = useState([]);            // {oppId, status}
  const [enrolled, setEnrolled] = useState([]);
  const [openOpp, setOpenOpp] = useState(null);
  const [posted, setPosted] = useState([]);
  const [form, setForm] = useState({ title: "", org: "Himalaya Wellness", type: "Internship", skills: [] });

  const rankedRoles = useMemo(() => {
    if (!profile) return [];
    return ROLES.map((r) => ({ ...r, ...scoreAgainst(profile, r.requires) })).sort((a, b) => b.pct - a.pct);
  }, [profile]);

  const rankedOpps = useMemo(() => {
    const list = [...OPPORTUNITIES, ...posted];
    if (!profile) return list.map((o) => ({ ...o, pct: null, gaps: [] }));
    return list.map((o) => ({ ...o, ...scoreAgainst(profile, o.requires) })).sort((a, b) => b.pct - a.pct);
  }, [profile, posted]);

  const topGaps = useMemo(() => {
    if (!profile) return [];
    const counts = {};
    OPPORTUNITIES.forEach((o) => {
      Object.entries(o.requires).forEach(([k, need]) => {
        const short = need - (profile[k] ?? 0);
        if (short > 0) counts[k] = Math.max(counts[k] || 0, short);
      });
    });
    return Object.entries(counts).map(([skill, short]) => ({ skill, short })).sort((a, b) => b.short - a.short);
  }, [profile]);

  const radarData = profile
    ? SKILLS.map((s) => ({ skill: s.short, you: profile[s.id], benchmark: COHORT.find((c) => c.skill === s.short).industry }))
    : [];

  function submitAnswer(v) {
    const next = { ...answers, [qIdx]: v };
    setAnswers(next);
    if (qIdx < QUESTIONS.length - 1) setQIdx(qIdx + 1);
    else {
      const p = {};
      QUESTIONS.forEach((q, i) => { p[q.skill] = next[i] ?? 15; });
      setProfile(p);
      setTab("overview");
    }
  }

  const applied = (id) => apps.some((a) => a.oppId === id);
  const apply = (id) => setApps((a) => [...a, { oppId: id, status: "Applied", on: "29 Aug 2026" }]);

  /* ---------------- landing ---------------- */
  if (!role) {
    const sampleRole = ROLES[0];
    const sample = scoreAgainst(SAMPLE_PROFILE, sampleRole.requires);
    return (
      <Shell>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 22px" }}>
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 0" }}>
            <Logo />
            <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, color: T.muted, textAlign: "right" }}>
              Ministry of Ayush · AIIA<br />Problem statement SIH26044
            </div>
          </header>

          <section className="ay-hero" style={{ display: "flex", gap: 54, alignItems: "center", padding: "44px 0 60px" }}>
            <div style={{ flex: "1 1 520px", minWidth: 300 }}>
              <Eyebrow>Academia · Industry · Institutions</Eyebrow>
              <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(36px, 5.2vw, 60px)", lineHeight: 1.04,
                letterSpacing: "-.03em", color: T.ink, margin: "16px 0 0", fontWeight: 600 }}>
                The AYUSH sector is hiring for skills<br />
                <span style={{ color: T.sage }}>nobody is measuring.</span>
              </h1>
              <Muted style={{ fontSize: 17, marginTop: 20, maxWidth: 520 }}>
                AyuSetu measures what a student can actually do, names the exact gap between that and what
                employers ask for, and routes them to the internship, programme or job that closes it.
                Faculty, industry and institutions work off the same numbers.
              </Muted>
              <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
                <Btn onClick={() => { setRole("student"); setTab("assessment"); }}>Take the skill assessment</Btn>
                <Btn variant="ghost" onClick={() => { setRole("student"); setProfile(SAMPLE_PROFILE); setTab("overview"); }}>
                  Open a sample student profile
                </Btn>
              </div>
            </div>

            <div style={{ flex: "1 1 340px", minWidth: 290 }}>
              <Card style={{ padding: 24 }}>
                <Eyebrow>Live example</Eyebrow>
                <H size={20} style={{ marginTop: 8 }}>{sampleRole.title}</H>
                <Muted style={{ fontSize: 13, marginTop: 3, marginBottom: 20 }}>{sampleRole.sector}</Muted>
                <ReadinessMeter pct={sample.pct} gaps={sample.gaps} />
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
                  <Muted style={{ fontSize: 12.5 }}>
                    Scored from a 10-question assessment against the skills five AYUSH employers
                    actually listed in their postings. No résumé keywords involved.
                  </Muted>
                </div>
              </Card>
            </div>
          </section>

          <section style={{ paddingBottom: 70 }}>
            <Eyebrow>Choose a role to explore the platform</Eyebrow>
            <div className="ay-grid4" style={{ display: "grid", gap: 14, marginTop: 16 }}>
              {[
                { id: "student", t: "Student", d: "Assess, find your gaps, apply, build a verified portfolio." },
                { id: "academician", t: "Academician", d: "FDPs, industrial training, consultancy and joint research." },
                { id: "industry", t: "Industry", d: "Post openings, see ranked candidates, run your pipeline." },
                { id: "institution", t: "Institution", d: "Cohort skill gaps, participation and placement analytics." },
              ].map((r) => (
                <button key={r.id} className="ay-persona" onClick={() => { setRole(r.id); setTab("overview"); }}
                  style={{ ...card, padding: 20, textAlign: "left", cursor: "pointer", background: T.white }}>
                  <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, color: T.ink }}>{r.t}</div>
                  <Muted style={{ fontSize: 13.5, marginTop: 7 }}>{r.d}</Muted>
                  <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.terra, marginTop: 14, fontWeight: 560 }}>Enter →</div>
                </button>
              ))}
            </div>
          </section>
          <Footer />
        </div>
      </Shell>
    );
  }

  /* ---------------- app shell ---------------- */
  const TABS = {
    student: [["overview", "Overview"], ["assessment", "Skill assessment"], ["opportunities", "Opportunities"], ["programs", "Learning programs"], ["applications", "My applications"], ["portfolio", "Portfolio"]],
    academician: [["overview", "Overview"], ["faculty", "Faculty opportunities"], ["mentorship", "Mentorship & projects"]],
    industry: [["overview", "Overview"], ["post", "Post an opening"], ["applicants", "Applicants"]],
    institution: [["overview", "Dashboard"], ["cohort", "Cohort skills"], ["placement", "Placement"]],
  }[role];

  return (
    <Shell>
      <div style={{ borderBottom: `1px solid ${T.line}`, background: "rgba(250,247,242,.9)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", gap: 16, flexWrap: "wrap" }}>
            <button onClick={() => setRole(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <Logo small />
            </button>
            <div style={{ display: "flex", gap: 4, background: T.paper2, padding: 4, borderRadius: 999, border: `1px solid ${T.line}` }}>
              {[["student", "Student"], ["academician", "Academician"], ["industry", "Industry"], ["institution", "Institution"]].map(([id, label]) => (
                <button key={id} onClick={() => { setRole(id); setTab("overview"); }}
                  style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 13px", fontFamily: "var(--ui)", fontSize: 13, fontWeight: 550,
                    background: role === id ? T.teal : "transparent", color: role === id ? "#fff" : T.muted }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <nav style={{ display: "flex", gap: 22, overflowX: "auto" }}>
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 12px", whiteSpace: "nowrap",
                  fontFamily: "var(--ui)", fontSize: 14, fontWeight: tab === id ? 600 : 450, color: tab === id ? T.ink : T.muted,
                  borderBottom: `2px solid ${tab === id ? T.terra : "transparent"}`, marginBottom: -1 }}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 22px 70px" }}>

        {/* ================= STUDENT ================= */}
        {role === "student" && tab === "overview" && (
          !profile ? (
            <EmptyState
              title="No skill profile yet"
              body="The assessment takes about two minutes. Everything else on the platform — matches, gaps, recommended programmes — is generated from it."
              action={<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={() => setTab("assessment")}>Start assessment</Btn>
                <Btn variant="ghost" onClick={() => setProfile(SAMPLE_PROFILE)}>Use sample profile</Btn>
              </div>}
            />
          ) : (
            <>
              <H size={30}>Your skill profile</H>
              <Muted style={{ marginTop: 6, marginBottom: 22 }}>
                Measured on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · compared against the skill levels AYUSH employers ask for.
              </Muted>

              <div className="ay-2col" style={{ display: "grid", gap: 16 }}>
                <Card>
                  <Eyebrow>Skill profile vs industry benchmark</Eyebrow>
                  <div style={{ height: 330, marginTop: 10 }}>
                    <ResponsiveContainer>
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke={T.line} />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Industry benchmark" dataKey="benchmark" stroke={T.terra} fill={T.terra} fillOpacity={0.1} strokeDasharray="4 3" />
                        <Radar name="You" dataKey="you" stroke={T.sage} fill={T.sage} fillOpacity={0.34} />
                        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "var(--ui)", fontSize: 12 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <Eyebrow>Best-matched roles</Eyebrow>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
                    {rankedRoles.slice(0, 3).map((r) => (
                      <div key={r.id} style={{ paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 600, color: T.ink }}>{r.title}</div>
                            <Muted style={{ fontSize: 12.5, marginTop: 2 }}>{r.sector} · demand: {r.demand}</Muted>
                          </div>
                        </div>
                        <div style={{ marginTop: 12 }}><ReadinessMeter pct={r.pct} gaps={r.gaps} compact /></div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div style={{ marginTop: 26 }}>
                <H size={22}>Close your top gaps</H>
                <Muted style={{ marginTop: 5, marginBottom: 14 }}>Programmes published by industry partners, ranked by how much they move your matches.</Muted>
                <div className="ay-grid3" style={{ display: "grid", gap: 14 }}>
                  {topGaps.slice(0, 3).map((g) => {
                    const prog = PROGRAMS.find((p) => p.boosts === g.skill);
                    if (!prog) return null;
                    return (
                      <Card key={g.skill} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Chip tone="gap">{skillShort(g.skill)} · {g.short} points short</Chip>
                        <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{prog.title}</div>
                        <Muted style={{ fontSize: 13 }}>{prog.by} · {prog.weeks} weeks · {prog.mode}</Muted>
                        <div style={{ marginTop: "auto", paddingTop: 8 }}>
                          <Btn small variant={enrolled.includes(prog.id) ? "ghost" : "accent"} disabled={enrolled.includes(prog.id)}
                            onClick={() => setEnrolled((e) => [...e, prog.id])}>
                            {enrolled.includes(prog.id) ? "Enrolled" : "Enrol"}
                          </Btn>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )
        )}

        {role === "student" && tab === "assessment" && (
          profile && Object.keys(answers).length === QUESTIONS.length ? (
            <Card style={{ maxWidth: 620 }}>
              <Eyebrow>Assessment complete</Eyebrow>
              <H size={24} style={{ marginTop: 8 }}>Your profile is live</H>
              <Muted style={{ marginTop: 8 }}>Matches, gaps and programme recommendations across the platform now use these scores.</Muted>
              <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                <Btn onClick={() => setTab("overview")}>See my profile</Btn>
                <Btn variant="ghost" onClick={() => { setAnswers({}); setQIdx(0); setProfile(null); }}>Retake</Btn>
              </div>
            </Card>
          ) : (
            <div style={{ maxWidth: 700 }}>
              <Eyebrow>Skill assessment · question {qIdx + 1} of {QUESTIONS.length}</Eyebrow>
              <div style={{ height: 4, background: T.paper2, borderRadius: 999, margin: "14px 0 26px", overflow: "hidden" }}>
                <div style={{ width: `${(qIdx / QUESTIONS.length) * 100}%`, height: "100%", background: T.sage, transition: "width .35s ease" }} />
              </div>
              <Card style={{ padding: 28 }}>
                <Chip>{skillLabel(QUESTIONS[qIdx].skill)}</Chip>
                <H size={24} style={{ marginTop: 14, lineHeight: 1.28 }}>{QUESTIONS[qIdx].q}</H>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
                  {OPTIONS.map((o) => (
                    <button key={o.value} className="ay-opt" onClick={() => submitAnswer(o.value)}
                      style={{ textAlign: "left", padding: "14px 16px", borderRadius: 11, border: `1px solid ${T.line}`,
                        background: T.white, cursor: "pointer", fontFamily: "var(--ui)", fontSize: 15, color: T.ink }}>
                      {o.text}
                    </button>
                  ))}
                </div>
              </Card>
              {qIdx > 0 && <div style={{ marginTop: 14 }}><Btn small variant="ghost" onClick={() => setQIdx(qIdx - 1)}>Back</Btn></div>}
            </div>
          )
        )}

        {role === "student" && tab === "opportunities" && (
          <>
            <H size={28}>Internships, apprenticeships and jobs</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>
              {profile ? "Ranked by how closely your measured skills meet what each employer listed." : "Take the assessment to see your match score against each posting."}
            </Muted>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rankedOpps.map((o) => (
                <Card key={o.id} style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 380px", minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Chip>{o.type}</Chip><Chip>{o.loc}</Chip>
                    </div>
                    <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 600, color: T.ink, marginTop: 10 }}>{o.title}</div>
                    <Muted style={{ fontSize: 13.5, marginTop: 3 }}>{o.org} · {o.pay} · closes {o.closes}</Muted>
                    <Muted style={{ fontSize: 13.5, marginTop: 10 }}>{o.about}</Muted>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
                      {Object.entries(o.requires).map(([k, need]) => {
                        const have = profile ? profile[k] ?? 0 : null;
                        return <Chip key={k} tone={have === null ? "neutral" : have >= need ? "good" : "gap"}>{skillShort(k)} · {need}+</Chip>;
                      })}
                    </div>
                  </div>
                  <div style={{ flex: "0 0 220px", minWidth: 200 }}>
                    {o.pct !== null && <ReadinessMeter pct={o.pct} gaps={o.gaps} compact />}
                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      <Btn small disabled={applied(o.id)} onClick={() => apply(o.id)}>{applied(o.id) ? "Applied" : "Apply"}</Btn>
                      <Btn small variant="ghost" onClick={() => setOpenOpp(openOpp === o.id ? null : o.id)}>
                        {openOpp === o.id ? "Hide" : "Why this rank"}
                      </Btn>
                    </div>
                    {openOpp === o.id && (
                      <div style={{ marginTop: 12, padding: 12, background: T.paper2, borderRadius: 10, fontFamily: "var(--ui)", fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
                        Each required skill is scored as your level ÷ the level asked for, capped at 1, then averaged.
                        {profile && Object.entries(o.requires).map(([k, need]) => (
                          <div key={k} style={{ marginTop: 6, color: T.ink }}>
                            {skillShort(k)}: {profile[k]} / {need}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {role === "student" && tab === "programs" && (
          <>
            <H size={28}>Industry learning programmes</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>Published by employers. Completing one raises the matching skill on your profile.</Muted>
            <div className="ay-grid3" style={{ display: "grid", gap: 14 }}>
              {PROGRAMS.map((p) => (
                <Card key={p.id} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <Chip>{skillShort(p.boosts)}</Chip>
                  <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{p.title}</div>
                  <Muted style={{ fontSize: 13 }}>{p.by} · {p.weeks} weeks · {p.mode}</Muted>
                  <div style={{ marginTop: "auto", paddingTop: 10 }}>
                    <Btn small variant={enrolled.includes(p.id) ? "ghost" : "accent"} disabled={enrolled.includes(p.id)}
                      onClick={() => setEnrolled((e) => [...e, p.id])}>
                      {enrolled.includes(p.id) ? "Enrolled" : "Enrol"}
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {role === "student" && tab === "applications" && (
          apps.length === 0 ? (
            <EmptyState title="Nothing applied to yet"
              body="Applications you send show up here with their live status — applied, shortlisted, selected."
              action={<Btn onClick={() => setTab("opportunities")}>Browse opportunities</Btn>} />
          ) : (
            <>
              <H size={28}>My applications</H>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {apps.map((a) => {
                  const o = [...OPPORTUNITIES, ...posted].find((x) => x.id === a.oppId);
                  const stages = ["Applied", "Shortlisted", "Selected"];
                  const at = stages.indexOf(a.status);
                  return (
                    <Card key={a.oppId} style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ flex: "1 1 300px" }}>
                        <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 600, color: T.ink }}>{o.title}</div>
                        <Muted style={{ fontSize: 13, marginTop: 2 }}>{o.org} · applied {a.on}</Muted>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {stages.map((s, i) => (
                          <React.Fragment key={s}>
                            {i > 0 && <div style={{ width: 26, height: 1, background: i <= at ? T.sage : T.line }} />}
                            <div style={{ fontFamily: "var(--ui)", fontSize: 12, padding: "5px 11px", borderRadius: 999,
                              background: i <= at ? "#E7F0E9" : T.paper2, color: i <= at ? T.teal : T.muted,
                              border: `1px solid ${i <= at ? "#C6DCCC" : T.line}` }}>{s}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )
        )}

        {role === "student" && tab === "portfolio" && (
          <>
            <H size={28}>Digital portfolio</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>
              Built automatically from verified assessments, completed programmes and institution-approved records. Shareable as a single link with recruiters.
            </Muted>
            <div className="ay-2col" style={{ display: "grid", gap: 16 }}>
              <Card>
                <Eyebrow>Verified skills</Eyebrow>
                {!profile ? <Muted style={{ marginTop: 12 }}>Complete the assessment to populate this.</Muted> : (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
                    {SKILLS.map((s) => (
                      <div key={s.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--ui)", fontSize: 13, color: T.ink, marginBottom: 4 }}>
                          <span>{s.label}</span><span style={{ color: T.muted }}>{profile[s.id]}</span>
                        </div>
                        <div style={{ height: 6, background: T.paper2, borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: `${profile[s.id]}%`, height: "100%", background: T.sage, borderRadius: 999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card>
                  <Eyebrow>Credentials</Eyebrow>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { t: "BAMS — 3rd professional year", by: "All India Institute of Ayurveda", v: true },
                      { t: "Clinical rotation: Panchakarma OPD (120 hrs)", by: "AIIA Hospital", v: true },
                      { t: "Skill assessment — AyuSetu", by: "Platform-verified", v: !!profile },
                      ...enrolled.map((id) => {
                        const p = PROGRAMS.find((x) => x.id === id);
                        return { t: p.title, by: p.by + " · in progress", v: false };
                      }),
                    ].map((c, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontFamily: "var(--ui)", fontSize: 14, color: T.ink, fontWeight: 500 }}>{c.t}</div>
                          <Muted style={{ fontSize: 12.5, marginTop: 1 }}>{c.by}</Muted>
                        </div>
                        <Chip tone={c.v ? "good" : "neutral"}>{c.v ? "Verified" : "Pending"}</Chip>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <Eyebrow>Documents</Eyebrow>
                  <Muted style={{ fontSize: 13.5, marginTop: 10 }}>
                    Résumé, certificates and project reports are stored against your record and released to a recruiter
                    only when you apply. The institution admin signs off on anything marked verified.
                  </Muted>
                  <div style={{ marginTop: 14 }}><Btn small variant="ghost">Upload a document</Btn></div>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* ================= ACADEMICIAN ================= */}
        {role === "academician" && tab === "overview" && (
          <>
            <H size={30}>Faculty workspace</H>
            <Muted style={{ marginTop: 6, marginBottom: 22 }}>Dr. A. Nair · Department of Kayachikitsa · All India Institute of Ayurveda</Muted>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <KPI value="34" label="Students mentored" sub="This academic year" />
              <KPI value="3" label="Live industry projects" sub="1 awaiting sign-off" />
              <KPI value="2" label="FDPs completed" sub="Of 4 registered" />
              <KPI value="₹4.2L" label="Consultancy value" sub="Sanctioned, FY 26" />
            </div>
            <div className="ay-2col" style={{ display: "grid", gap: 16, marginTop: 22 }}>
              <Card>
                <Eyebrow>Where your students are weakest</Eyebrow>
                <Muted style={{ fontSize: 13, marginTop: 6, marginBottom: 10 }}>Average cohort score against the level industry asks for. This is your curriculum argument.</Muted>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={[...COHORT].sort((a, b) => (a.cohort - a.industry) - (b.cohort - b.industry)).slice(0, 6)} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid horizontal={false} stroke={T.line} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <YAxis type="category" dataKey="skill" width={92} tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "var(--ui)", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                      <Bar dataKey="cohort" name="Cohort average" fill={T.sage} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="industry" name="Industry expects" fill={T.terraSoft} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <Eyebrow>Closing soon for faculty</Eyebrow>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                  {FACULTY_OPPS.slice(0, 4).map((f) => (
                    <div key={f.id} style={{ paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
                      <Chip>{f.kind}</Chip>
                      <div style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 600, color: T.ink, marginTop: 8, lineHeight: 1.35 }}>{f.title}</div>
                      <Muted style={{ fontSize: 12.5, marginTop: 3 }}>{f.by} · {f.detail} · closes {f.closes}</Muted>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {role === "academician" && tab === "faculty" && (
          <>
            <H size={28}>Faculty opportunities</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>Industry internships, FDPs, industrial training, consultancy and collaborative research — in one place instead of scattered circulars.</Muted>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FACULTY_OPPS.map((f) => (
                <Card key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ flex: "1 1 340px" }}>
                    <Chip>{f.kind}</Chip>
                    <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, color: T.ink, marginTop: 9 }}>{f.title}</div>
                    <Muted style={{ fontSize: 13.5, marginTop: 3 }}>{f.by} · {f.detail}</Muted>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Muted style={{ fontSize: 12.5, marginBottom: 8 }}>Closes {f.closes}</Muted>
                    <Btn small>Express interest</Btn>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {role === "academician" && tab === "mentorship" && (
          <>
            <H size={28}>Mentorship & live projects</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>Requests from students and problem statements published by industry partners.</Muted>
            <div className="ay-2col" style={{ display: "grid", gap: 16 }}>
              <Card>
                <Eyebrow>Mentorship requests</Eyebrow>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 13 }}>
                  {[
                    ["Naitik Sharma", "Wants guidance on a QC internship application"],
                    ["Shreya Paul", "Research methodology — dissertation protocol"],
                    ["Viyona Menon", "Panchakarma case documentation review"],
                  ].map(([n, d]) => (
                    <div key={n} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
                      <div>
                        <div style={{ fontFamily: "var(--ui)", fontSize: 14.5, color: T.ink, fontWeight: 550 }}>{n}</div>
                        <Muted style={{ fontSize: 12.5, marginTop: 1 }}>{d}</Muted>
                      </div>
                      <Btn small variant="ghost">Accept</Btn>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <Eyebrow>Live industry problem statements</Eyebrow>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 13 }}>
                  {[
                    ["Shelf-life prediction for polyherbal syrups", "Dabur Research Foundation"],
                    ["Standardising OPD case sheets across AYUSH streams", "National Health Authority"],
                    ["Yoga therapy outcome measures for corporate cohorts", "Kaivalyadhama"],
                  ].map(([t, by]) => (
                    <div key={t} style={{ paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
                      <div style={{ fontFamily: "var(--ui)", fontSize: 14.5, color: T.ink, fontWeight: 550, lineHeight: 1.4 }}>{t}</div>
                      <Muted style={{ fontSize: 12.5, marginTop: 2 }}>{by}</Muted>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ================= INDUSTRY ================= */}
        {role === "industry" && tab === "overview" && (
          <>
            <H size={30}>Himalaya Wellness</H>
            <Muted style={{ marginTop: 6, marginBottom: 22 }}>Recruiter workspace · verified industry partner</Muted>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <KPI value={4 + posted.length} label="Open postings" />
              <KPI value="62" label="Applicants" sub="+14 this week" />
              <KPI value="11" label="Shortlisted" />
              <KPI value="83%" label="Median match score" sub="Across shortlist" />
            </div>
            <Card style={{ marginTop: 22 }}>
              <Eyebrow>Skill demand you are competing for</Eyebrow>
              <Muted style={{ fontSize: 13, marginTop: 6, marginBottom: 10 }}>Postings across the platform requiring each skill, last six months.</Muted>
              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={DEMAND_TREND}>
                    <CartesianGrid stroke={T.line} vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <YAxis tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "var(--ui)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                    <Line type="monotone" dataKey="Compliance" stroke={T.sage} strokeWidth={2.4} dot={false} />
                    <Line type="monotone" dataKey="Digital health" stroke={T.terra} strokeWidth={2.4} dot={false} />
                    <Line type="monotone" dataKey="Data" stroke={T.teal} strokeWidth={2.4} dot={false} strokeDasharray="5 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}

        {role === "industry" && tab === "post" && (
          <div style={{ maxWidth: 640 }}>
            <H size={28}>Post an opening</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>Name the skills and the level you need. Candidates are ranked against those levels, not against keywords in a résumé.</Muted>
            <Card>
              <Field label="Title">
                <input className="ay-in" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Regulatory Affairs Trainee" />
              </Field>
              <Field label="Type">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Internship", "Apprenticeship", "Full-time"].map((t) => (
                    <button key={t} onClick={() => setForm({ ...form, type: t })} className="ay-pill"
                      style={{ border: `1px solid ${form.type === t ? T.teal : T.line}`, background: form.type === t ? T.teal : T.white,
                        color: form.type === t ? "#fff" : T.muted }}>{t}</button>
                  ))}
                </div>
              </Field>
              <Field label="Required skills — pick up to four">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SKILLS.map((s) => {
                    const on = form.skills.includes(s.id);
                    return (
                      <button key={s.id} className="ay-pill"
                        onClick={() => setForm({ ...form, skills: on ? form.skills.filter((x) => x !== s.id) : form.skills.length < 4 ? [...form.skills, s.id] : form.skills })}
                        style={{ border: `1px solid ${on ? T.sage : T.line}`, background: on ? "#E7F0E9" : T.white, color: on ? T.teal : T.muted }}>
                        {s.short}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div style={{ marginTop: 20 }}>
                <Btn disabled={!form.title || form.skills.length === 0}
                  onClick={() => {
                    const req = {}; form.skills.forEach((s) => { req[s] = 65; });
                    setPosted((p) => [...p, { id: "n" + p.length, title: form.title, org: "Himalaya Wellness", loc: "Bengaluru",
                      type: form.type, pay: "₹16,000 / month", closes: "31 Oct 2026", requires: req,
                      about: "Posted from the recruiter workspace." }]);
                    setForm({ title: "", org: "Himalaya Wellness", type: "Internship", skills: [] });
                  }}>
                  Publish opening
                </Btn>
              </div>
              {posted.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
                  <Eyebrow>Published just now</Eyebrow>
                  {posted.map((p) => (
                    <div key={p.id} style={{ marginTop: 10, fontFamily: "var(--ui)", fontSize: 14, color: T.ink }}>
                      {p.title} · {p.type} — visible to students under Opportunities
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {role === "industry" && tab === "applicants" && (
          <>
            <H size={28}>Applicants</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>Ranked by measured skill match. Portfolios and documents open only after the student applies.</Muted>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ui)", fontSize: 14, minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: T.paper2 }}>
                      {["Candidate", "Institution", "Applied for", "Match", "Status"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "13px 18px", fontSize: 12, letterSpacing: ".06em",
                          textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...APPLICANTS].sort((a, b) => b.match - a.match).map((a) => (
                      <tr key={a.name} style={{ borderTop: `1px solid ${T.line}` }}>
                        <td style={{ padding: "14px 18px", color: T.ink, fontWeight: 550 }}>{a.name}</td>
                        <td style={{ padding: "14px 18px", color: T.muted }}>{a.college}</td>
                        <td style={{ padding: "14px 18px", color: T.muted }}>{a.role}</td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <div style={{ width: 58, height: 6, background: T.paper2, borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ width: `${a.match}%`, height: "100%", background: a.match >= 80 ? T.sage : T.terra }} />
                            </div>
                            <span style={{ color: T.ink }}>{a.match}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <Chip tone={a.status === "Selected" ? "good" : a.status === "Shortlisted" ? "neutral" : "neutral"}>{a.status}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ================= INSTITUTION ================= */}
        {role === "institution" && tab === "overview" && (
          <>
            <H size={30}>All India Institute of Ayurveda</H>
            <Muted style={{ marginTop: 6, marginBottom: 22 }}>Institution dashboard · academic year 2026–27</Muted>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <KPI value="1,284" label="Students on platform" sub="Across 4 AYUSH streams" />
              <KPI value="62%" label="Assessment completion" sub="Target 85% by Nov" />
              <KPI value="41%" label="Internship participation" sub="Up from 28% last year" />
              <KPI value="78%" label="Placement readiness" sub="Median match to a live role" />
            </div>
            <div className="ay-2col" style={{ display: "grid", gap: 16, marginTop: 22 }}>
              <Card>
                <Eyebrow>Placement funnel</Eyebrow>
                <div style={{ height: 290, marginTop: 10 }}>
                  <ResponsiveContainer>
                    <BarChart data={FUNNEL} layout="vertical" margin={{ left: 8, right: 30 }}>
                      <CartesianGrid horizontal={false} stroke={T.line} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <YAxis type="category" dataKey="stage" width={92} tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "var(--ui)", fontSize: 12 }} />
                      <Bar dataKey="n" name="Students" radius={[0, 5, 5, 0]}>
                        {FUNNEL.map((_, i) => <Cell key={i} fill={[T.sageSoft, T.sage, "#3E6B4E", T.teal, T.terra][i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <Eyebrow>Skill demand trend</Eyebrow>
                <Muted style={{ fontSize: 13, marginTop: 6 }}>What employers on the platform are asking for. Drives curriculum and FDP planning.</Muted>
                <div style={{ height: 258, marginTop: 6 }}>
                  <ResponsiveContainer>
                    <LineChart data={DEMAND_TREND}>
                      <CartesianGrid stroke={T.line} vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <YAxis tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "var(--ui)", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                      <Line type="monotone" dataKey="Compliance" stroke={T.sage} strokeWidth={2.4} dot={false} />
                      <Line type="monotone" dataKey="Digital health" stroke={T.terra} strokeWidth={2.4} dot={false} />
                      <Line type="monotone" dataKey="Data" stroke={T.teal} strokeWidth={2.4} dot={false} strokeDasharray="5 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        )}

        {role === "institution" && tab === "cohort" && (
          <>
            <H size={28}>Cohort skill gap</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>Average measured score per skill against the level employers ask for. The distance between the two bars is the curriculum gap.</Muted>
            <Card>
              <div style={{ height: 420 }}>
                <ResponsiveContainer>
                  <BarChart data={COHORT} margin={{ left: 0, right: 10, bottom: 40 }}>
                    <CartesianGrid vertical={false} stroke={T.line} />
                    <XAxis dataKey="skill" angle={-32} textAnchor="end" interval={0} height={70}
                      tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "var(--ui)", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                    <Bar dataKey="cohort" name="Cohort average" fill={T.sage} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="industry" name="Industry expects" fill={T.terraSoft} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <div className="ay-grid3" style={{ display: "grid", gap: 14, marginTop: 16 }}>
              {[...COHORT].sort((a, b) => (a.cohort - a.industry) - (b.cohort - b.industry)).slice(0, 3).map((c) => (
                <Card key={c.skill}>
                  <Chip tone="gap">{c.industry - c.cohort} point gap</Chip>
                  <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, color: T.ink, marginTop: 10 }}>{c.skill}</div>
                  <Muted style={{ fontSize: 13, marginTop: 6 }}>
                    Recommended action: run the partner programme on this skill as a credited elective next semester.
                  </Muted>
                </Card>
              ))}
            </div>
          </>
        )}

        {role === "institution" && tab === "placement" && (
          <>
            <H size={28}>Placement</H>
            <Muted style={{ marginTop: 6, marginBottom: 20 }}>Live pipeline across all recruiting partners.</Muted>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
              <KPI value="138" label="Placed" sub="27% of assessed students" />
              <KPI value="₹3.4L" label="Median package" />
              <KPI value="18" label="Recruiting partners" sub="6 joined this quarter" />
              <KPI value="24 days" label="Median time to offer" />
            </div>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ui)", fontSize: 14, minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: T.paper2 }}>
                      {["Student", "Stream", "Opportunity", "Match", "Stage"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "13px 18px", fontSize: 12, letterSpacing: ".06em",
                          textTransform: "uppercase", color: T.muted, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Viyona Menon", "Ayurveda", "Panchakarma Therapist", 91, "Selected"],
                      ["Ishit Aggarwal", "Ayurveda", "Clinical Research Intern", 88, "Shortlisted"],
                      ["Manvi Rawat", "Ayurveda", "Regulatory Affairs Trainee", 81, "Applied"],
                      ["Naitik Sharma", "Ayurveda", "QC Analyst Trainee", 76, "Applied"],
                      ["Shreya Paul", "Homoeopathy", "Clinical Research Intern", 72, "Shortlisted"],
                      ["Shaurya Dwivedi", "Yoga & Naturopathy", "Ayush EHR Intern", 69, "Applied"],
                    ].map((r) => (
                      <tr key={r[0]} style={{ borderTop: `1px solid ${T.line}` }}>
                        <td style={{ padding: "14px 18px", color: T.ink, fontWeight: 550 }}>{r[0]}</td>
                        <td style={{ padding: "14px 18px", color: T.muted }}>{r[1]}</td>
                        <td style={{ padding: "14px 18px", color: T.muted }}>{r[2]}</td>
                        <td style={{ padding: "14px 18px", color: T.ink }}>{r[3]}%</td>
                        <td style={{ padding: "14px 18px" }}><Chip tone={r[4] === "Selected" ? "good" : "neutral"}>{r[4]}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        <Footer />
      </main>
    </Shell>
  );
}

/* ---------------- layout bits ---------------- */

function Shell({ children }) {
  return (
    <div style={{ background: T.paper, minHeight: "100vh", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        :root {
          --display: 'Fraunces', 'Iowan Old Style', Georgia, serif;
          --ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .ay-btn { transition: transform .12s ease, filter .12s ease; }
        .ay-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .ay-btn:active:not(:disabled) { transform: translateY(0); }
        .ay-persona { transition: transform .16s ease, box-shadow .16s ease; }
        .ay-persona:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -22px rgba(18,33,30,.45); }
        .ay-opt { transition: border-color .14s ease, background .14s ease; }
        .ay-opt:hover { border-color: ${T.sage} !important; background: #F4F8F4 !important; }
        .ay-fill { transition: width .6s cubic-bezier(.22,1,.36,1); }
        .ay-in { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1px solid ${T.line};
                 font-family: var(--ui); font-size: 14.5px; color: ${T.ink}; background: #fff; outline: none; }
        .ay-in:focus { border-color: ${T.sage}; box-shadow: 0 0 0 3px rgba(74,124,89,.15); }
        .ay-pill { padding: 7px 13px; border-radius: 999px; cursor: pointer; font-family: var(--ui); font-size: 13px; font-weight: 500; }
        button:focus-visible, a:focus-visible { outline: 2px solid ${T.terra}; outline-offset: 2px; }
        .ay-grid4 { grid-template-columns: repeat(4, 1fr); }
        .ay-grid3 { grid-template-columns: repeat(3, 1fr); }
        .ay-2col  { grid-template-columns: 1.15fr 1fr; }
        @media (max-width: 980px) {
          .ay-grid4 { grid-template-columns: repeat(2, 1fr); }
          .ay-grid3 { grid-template-columns: repeat(2, 1fr); }
          .ay-2col  { grid-template-columns: 1fr; }
          .ay-hero  { flex-wrap: wrap; gap: 32px !important; }
        }
        @media (max-width: 620px) {
          .ay-grid4, .ay-grid3 { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

function Logo({ small }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: small ? 28 : 34, height: small ? 28 : 34, borderRadius: 9, background: T.teal,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width={small ? 15 : 18} height={small ? 15 : 18} viewBox="0 0 24 24" fill="none">
          <path d="M3 17c4 0 5-10 9-10s5 10 9 10" stroke={T.paper} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="1.8" fill={T.terra} />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: "var(--display)", fontSize: small ? 18 : 21, fontWeight: 600, color: T.ink, letterSpacing: "-.02em", lineHeight: 1 }}>
          AyuSetu
        </div>
        {!small && <div style={{ fontFamily: "var(--ui)", fontSize: 11, color: T.muted, marginTop: 2 }}>Academia · Industry bridge</div>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, fontWeight: 550, marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <Card style={{ maxWidth: 560, padding: 30 }}>
      <H size={23}>{title}</H>
      <Muted style={{ marginTop: 10, marginBottom: 20 }}>{body}</Muted>
      {action}
    </Card>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${T.line}`, marginTop: 50, paddingTop: 22, paddingBottom: 30,
      display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      fontFamily: "var(--ui)", fontSize: 12.5, color: T.muted }}>
      <div>AyuSetu · prototype for SIH26044 · Ministry of Ayush, All India Institute of Ayurveda</div>
      <div>Team CODE BREAKERS · role-based access · demo data</div>
    </footer>
  );
}
