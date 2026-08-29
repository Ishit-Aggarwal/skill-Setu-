"use client";

import React, { useState, useMemo } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, Cell, AreaChart, Area,
} from "recharts";

/* ============================================================
   AyushBridge — National AYUSH Academia–Industry Portal
   Ministry of Ayush · All India Institute of Ayurveda
   Smart India Hackathon · Team CODE BREAKERS
   ============================================================ */

/* ---------------- Themes Configuration ---------------- */

const THEMES = {
  light: {
    name: "light",
    bg: "#FAF7F2",
    bgCard: "#FFFFFF",
    bgCardSubtle: "#F9F6F0",
    bgSurface: "#F1EADE",
    bgSurfaceHover: "#E6DDCE",
    border: "#DFD6C6",
    borderSubtle: "#EDE4D6",
    ink: "#12211E",
    inkSoft: "#2D3E3A",
    muted: "#61706B",
    mutedLight: "#8B9B96",
    teal: "#1B4B43",
    tealSoft: "#E3EFE9",
    sage: "#4A7C59",
    sageSoft: "#DCEADE",
    terra: "#C97B4A",
    terraSoft: "#FBEEE3",
    blue: "#2A6F97",
    blueSoft: "#E0EFF7",
    purple: "#6B4C9A",
    purpleSoft: "#F0E8FA",
    amber: "#D97706",
    white: "#FFFFFF",
    navBg: "rgba(250, 247, 242, 0.92)",
    cardShadow: "0 1px 3px rgba(18,33,30,.04), 0 14px 34px -22px rgba(18,33,30,.25)",
    chartGrid: "#E6DDCE",
    chartTooltipBg: "#FFFFFF",
    chartTooltipBorder: "#DFD6C6",
  },
  dark: {
    name: "dark",
    bg: "#0B1210",
    bgCard: "#131F1C",
    bgCardSubtle: "#172622",
    bgSurface: "#1C2E29",
    bgSurfaceHover: "#243A34",
    border: "#263D36",
    borderSubtle: "#1C2E29",
    ink: "#F0F5F2",
    inkSoft: "#D2E0DA",
    muted: "#8FA89F",
    mutedLight: "#6B827A",
    teal: "#2DD4BF",
    tealSoft: "#133832",
    sage: "#4ADE80",
    sageSoft: "#143C28",
    terra: "#FB923C",
    terraSoft: "#3C2214",
    blue: "#38BDF8",
    blueSoft: "#123042",
    purple: "#C084FC",
    purpleSoft: "#2F1E42",
    amber: "#FBBF24",
    white: "#FFFFFF",
    navBg: "rgba(11, 18, 16, 0.92)",
    cardShadow: "0 4px 20px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.03)",
    chartGrid: "#1C2E29",
    chartTooltipBg: "#131F1C",
    chartTooltipBorder: "#263D36",
  },
};

/* ---------------- AYUSH Sectors & Plain-English Skills ---------------- */

const AYUSH_SECTORS = [
  { id: "all", label: "All AYUSH Sectors" },
  { id: "herbal_mfg", label: "Herbal Medicine & Manufacturing", badge: "Manufacturing" },
  { id: "wellness_yoga", label: "Yoga, Naturopathy & Wellness", badge: "Wellness" },
  { id: "clinical_research", label: "Clinical Trials & Research", badge: "Research" },
  { id: "quality_testing", label: "Quality Control & Lab Testing", badge: "QC Labs" },
  { id: "digital_ayush", label: "Digital Health & Tele-Ayush", badge: "Digital" },
  { id: "hospital_admin", label: "Hospital Care & Regulatory", badge: "Hospital" },
];

const SKILLS = [
  { id: "herbal_formulation", label: "Herbal Formulation & Manufacturing", short: "Herbal Formulation", domain: "herbal_mfg" },
  { id: "quality_testing", label: "Herb Quality Control & Lab Testing", short: "Herb Quality & QC", domain: "quality_testing" },
  { id: "wellness_therapy", label: "Therapeutic Body & Wellness Care", short: "Wellness Therapy", domain: "wellness_yoga" },
  { id: "clinical_doc", label: "Clinical Patient Documentation", short: "Patient Records", domain: "hospital_admin" },
  { id: "regulatory_gmp", label: "Ayush Industry Standards & Regulatory Rules", short: "Regulatory & GMP", domain: "hospital_admin" },
  { id: "clinical_research", label: "Clinical Research & Study Design", short: "Clinical Research", domain: "clinical_research" },
  { id: "health_data", label: "Health Data & Statistical Analysis", short: "Health Data", domain: "digital_ayush" },
  { id: "digital_telehealth", label: "Digital Health Records & Tele-Consultation", short: "Tele-Consultation", domain: "digital_ayush" },
  { id: "lifestyle_counsel", label: "Holistic Nutrition & Patient Counselling", short: "Patient Counselling", domain: "wellness_yoga" },
  { id: "yoga_therapy", label: "Yoga & Physical Wellness Therapy", short: "Yoga Protocols", domain: "wellness_yoga" },
];

const skillLabel = (id) => (SKILLS.find((s) => s.id === id) || {}).label || id;
const skillShort = (id) => (SKILLS.find((s) => s.id === id) || {}).short || id;

/* ---------------- Assessment Questions ---------------- */

const QUESTIONS = [
  {
    skill: "wellness_therapy",
    q: "How much practical experience do you have administering or assisting in structured therapeutic wellness treatments and body therapies?",
  },
  {
    skill: "herbal_formulation",
    q: "Have you worked in a laboratory or manufacturing facility preparing herbal powders, decoctions, oils, and natural syrups?",
  },
  {
    skill: "quality_testing",
    q: "How comfortable are you performing purity and safety tests on raw medicinal herbs to check for contaminants or adulteration?",
  },
  {
    skill: "clinical_doc",
    q: "How comfortable are you writing detailed patient case sheets, clinical histories, and discharge summaries?",
  },
  {
    skill: "regulatory_gmp",
    q: "How familiar are you with AYUSH manufacturing standards, Good Manufacturing Practices (GMP), and product licensing norms?",
  },
  {
    skill: "clinical_research",
    q: "Have you designed a clinical study protocol, prepared consent forms, or tracked patient trial outcome metrics?",
  },
  {
    skill: "health_data",
    q: "How comfortable are you analyzing patient health data and trial outcomes using spreadsheet tools, statistical software, or Python?",
  },
  {
    skill: "digital_telehealth",
    q: "How much experience do you have using electronic health records (EHR) and digital tele-consultation platforms like e-Sanjeevani?",
  },
  {
    skill: "lifestyle_counsel",
    q: "How confident are you guiding patients on customized diet plans, natural lifestyle changes, and daily health habits?",
  },
  {
    skill: "yoga_therapy",
    q: "Can you design step-by-step yoga therapy and physical wellness routines tailored for specific health conditions?",
  },
];

const OPTIONS = [
  { text: "No hands-on experience yet", value: 15 },
  { text: "Studied theory with basic classroom demonstrations", value: 42 },
  { text: "Assisted senior doctors / Lab instructors under supervision", value: 72 },
  { text: "Performed independently in clinical / lab / industry settings", value: 95 },
];

/* ---------------- AYUSH Industry Roles ---------------- */

const ROLES = [
  {
    id: "cra",
    title: "Clinical Research Associate (AYUSH Trials)",
    sector: "Clinical Research Organizations & Research Institutes",
    domain: "clinical_research",
    demand: "Very High",
    requires: { clinical_research: 75, clinical_doc: 70, health_data: 60, regulatory_gmp: 55 },
  },
  {
    id: "qa",
    title: "Herbal Product Quality & Safety Analyst",
    sector: "Herbal Medicine & Natural FMCG Manufacturing",
    domain: "quality_testing",
    demand: "High",
    requires: { quality_testing: 80, herbal_formulation: 65, regulatory_gmp: 70, health_data: 45 },
  },
  {
    id: "yoga_lead",
    title: "Yoga Therapist & Corporate Wellness Consultant",
    sector: "Wellness Centers, Resorts & Corporate Health",
    domain: "wellness_yoga",
    demand: "Growing",
    requires: { yoga_therapy: 80, lifestyle_counsel: 75, clinical_doc: 50 },
  },
  {
    id: "tele_lead",
    title: "Tele-AYUSH & Digital Health Coordinator",
    sector: "Public Health Organizations & Hospital Networks",
    domain: "digital_ayush",
    demand: "Very High",
    requires: { digital_telehealth: 75, health_data: 65, clinical_doc: 60, lifestyle_counsel: 50 },
  },
  {
    id: "therapist",
    title: "Therapeutic Wellness Consultant",
    sector: "Integrative Hospitals & Premium Wellness Resorts",
    domain: "wellness_yoga",
    demand: "Steady",
    requires: { wellness_therapy: 85, lifestyle_counsel: 70, clinical_doc: 50 },
  },
  {
    id: "reg_lead",
    title: "AYUSH Regulatory Affairs & Licensing Associate",
    sector: "Pharmaceutical Enterprises & Export Houses",
    domain: "hospital_admin",
    demand: "High",
    requires: { regulatory_gmp: 80, herbal_formulation: 60, clinical_doc: 55 },
  },
];

/* ---------------- Real-World AYUSH Opportunities ---------------- */

const OPPORTUNITIES = [
  {
    id: "o1",
    title: "Clinical Research Intern — Traditional Medicine Trials",
    org: "All India Institute of Ayurveda (AIIA)",
    loc: "New Delhi",
    domain: "clinical_research",
    type: "Internship",
    pay: "₹18,000 / month",
    closes: "15 Oct 2026",
    requires: { clinical_research: 70, clinical_doc: 65, health_data: 55 },
    about: "Assist in multi-center clinical trials for chronic lifestyle disorders — protocol documentation, electronic case sheets, and patient monitoring.",
  },
  {
    id: "o2",
    title: "Quality Control Lab Analyst Trainee",
    org: "Dabur Research Foundation",
    loc: "Ghaziabad",
    domain: "quality_testing",
    type: "Apprenticeship",
    pay: "₹22,000 / month",
    closes: "22 Oct 2026",
    requires: { quality_testing: 75, herbal_formulation: 60, regulatory_gmp: 60 },
    about: "Conduct chemical purity testing, heavy metal screening, and shelf-life stability tests on botanical raw materials under industry standards.",
  },
  {
    id: "o3",
    title: "Corporate Wellness & Yoga Therapy Associate",
    org: "Kaivalyadhama Health & Yoga Institute",
    loc: "Pune",
    domain: "wellness_yoga",
    type: "Full-time",
    pay: "₹4.8 LPA",
    closes: "18 Oct 2026",
    requires: { yoga_therapy: 75, lifestyle_counsel: 70 },
    about: "Create and lead guided physical wellness, breathwork, and stress-reduction routines for corporate executives and wellness clients.",
  },
  {
    id: "o4",
    title: "Tele-AYUSH & Digital Health Implementation Intern",
    org: "National Health Authority / Ministry of Ayush Partner",
    loc: "Remote / New Delhi",
    domain: "digital_ayush",
    type: "Internship",
    pay: "₹24,000 / month",
    closes: "10 Oct 2026",
    requires: { digital_telehealth: 75, health_data: 60, clinical_doc: 50 },
    about: "Help AYUSH hospitals and colleges integrate electronic health records, tele-consultation workflows, and digital patient registries.",
  },
  {
    id: "o5",
    title: "Herbal Medicine Formulation & Extraction Trainee",
    org: "Patanjali Research Institute",
    loc: "Haridwar",
    domain: "herbal_mfg",
    type: "Internship",
    pay: "₹20,000 / month",
    closes: "30 Oct 2026",
    requires: { herbal_formulation: 75, quality_testing: 60, regulatory_gmp: 50 },
    about: "Work with modern botanical extraction units, spray-drying equipment, and standardized herbal syrup and tablet production lines.",
  },
  {
    id: "o6",
    title: "AYUSH Regulatory Compliance & Export Trainee",
    org: "Himalaya Wellness Company",
    loc: "Bengaluru",
    domain: "hospital_admin",
    type: "Internship",
    pay: "₹20,000 / month",
    closes: "25 Oct 2026",
    requires: { regulatory_gmp: 75, herbal_formulation: 55, clinical_doc: 50 },
    about: "Prepare regulatory licensing dossiers, label verification, and safety documentation for herbal wellness products across domestic and international markets.",
  },
  {
    id: "o7",
    title: "Therapeutic Wellness & Patient Care Associate",
    org: "Somatheeram Holistic Health Resort",
    loc: "Kerala",
    domain: "wellness_yoga",
    type: "Full-time",
    pay: "₹4.2 LPA",
    closes: "28 Sep 2026",
    requires: { wellness_therapy: 80, lifestyle_counsel: 65, clinical_doc: 50 },
    about: "Deliver tailored therapeutic body therapies, herbal steam regimens, and wellness care for domestic and international wellness guests.",
  },
  {
    id: "o8",
    title: "Natural Drug Standardization & Trial Associate",
    org: "Central Council for Research in Ayurvedic Sciences (CCRAS)",
    loc: "New Delhi",
    domain: "clinical_research",
    type: "Fellowship",
    pay: "₹28,000 / month",
    closes: "05 Nov 2026",
    requires: { clinical_research: 75, quality_testing: 65, health_data: 60 },
    about: "Support government-funded clinical trials — research methodology, patient follow-up data collection, and safety reporting.",
  },
  {
    id: "o9",
    title: "Herbal Medicine Production Trainee",
    org: "Kottakkal Arya Vaidya Sala",
    loc: "Kerala",
    domain: "herbal_mfg",
    type: "Apprenticeship",
    pay: "₹18,000 / month",
    closes: "12 Oct 2026",
    requires: { herbal_formulation: 75, quality_testing: 60 },
    about: "Hands-on apprenticeship in classical batch production, herb grading, decoction boiling, and quality inspection.",
  },
  {
    id: "o10",
    title: "Homoeopathic Clinical Case & Data Intern",
    org: "National Institute of Homoeopathy (NIH)",
    loc: "Kolkata",
    domain: "hospital_admin",
    type: "Internship",
    pay: "₹18,000 / month",
    closes: "20 Oct 2026",
    requires: { clinical_doc: 75, lifestyle_counsel: 65, health_data: 50 },
    about: "Manage outpatient case histories, repertorization records, and digital documentation in high-volume teaching hospitals.",
  },
  {
    id: "o11",
    title: "Botanical Sourcing & Organic Certification Intern",
    org: "Organic India Labs",
    loc: "Lucknow",
    domain: "quality_testing",
    type: "Internship",
    pay: "₹19,000 / month",
    closes: "16 Oct 2026",
    requires: { quality_testing: 70, regulatory_gmp: 60, health_data: 50 },
    about: "Inspect sustainable herb supply chains, verify organic farmer certifications, and track moisture and pesticide levels.",
  },
  {
    id: "o12",
    title: "Holistic Diet & Lifestyle Wellness Counsellor",
    org: "National Institute of Naturopathy (NIN)",
    loc: "Pune",
    domain: "wellness_yoga",
    type: "Internship",
    pay: "₹17,000 / month",
    closes: "24 Oct 2026",
    requires: { lifestyle_counsel: 80, wellness_therapy: 60, clinical_doc: 50 },
    about: "Conduct structured dietary counselling, nutritional therapy plans, and therapeutic fasting supervision for patients.",
  },
];

/* ---------------- AYUSH Industry Learning Programs ---------------- */

const PROGRAMS = [
  { id: "p1", title: "AYUSH Industry Standards & GMP Quality Norms", by: "Himalaya Wellness Academy", weeks: 4, boosts: "regulatory_gmp", mode: "Online + Plant Tour" },
  { id: "p2", title: "Health Data Analysis with Spreadsheets & Python", by: "AIIA Data Cell", weeks: 6, boosts: "health_data", mode: "Online Labs" },
  { id: "p3", title: "Tele-AYUSH & Digital Health Operations", by: "National Health Authority", weeks: 3, boosts: "digital_telehealth", mode: "Online Sandbox" },
  { id: "p4", title: "Modern Botanical Lab Testing & Quality Control", by: "Dabur Research Foundation", weeks: 5, boosts: "quality_testing", mode: "On-site Lab, Ghaziabad" },
  { id: "p5", title: "Condition-Specific Yoga Therapy Protocol Design", by: "Kaivalyadhama Institute", weeks: 4, boosts: "yoga_therapy", mode: "Hybrid" },
  { id: "p6", title: "Clinical Trial Protocol Design & GCP Standards", by: "CCRAS / ICMR", weeks: 4, boosts: "clinical_research", mode: "Online Certified" },
  { id: "p7", title: "Clinical Case Documentation & Discharge Standards", by: "AIIA Clinical Faculty", weeks: 2, boosts: "clinical_doc", mode: "Online" },
  { id: "p8", title: "Standardized Herbal Extraction & Formulation Practicum", by: "Kottakkal Arya Vaidya Sala", weeks: 6, boosts: "herbal_formulation", mode: "On-site, Kerala" },
  { id: "p9", title: "Holistic Dietary Counselling & Patient Communication", by: "AIIA Faculty", weeks: 2, boosts: "lifestyle_counsel", mode: "Online" },
  { id: "p10", title: "Advanced Therapeutic Body Care & Wellness Practice", by: "Somatheeram Academy", weeks: 8, boosts: "wellness_therapy", mode: "On-site, Kerala" },
];

/* ---------------- Faculty Opportunities in AYUSH ---------------- */

const FACULTY_OPPS = [
  { id: "f1", kind: "Faculty Training (FDP)", title: "Clinical Research Methodology & Health Data for AYUSH Faculty", by: "CCRAS / Ministry of Ayush", detail: "5 days · New Delhi · 40 seats", closes: "22 Oct 2026" },
  { id: "f2", kind: "Industry Immersion", title: "Two-Week Immersion in Modern Herbal Formulation & Quality Testing", by: "Dabur Research Foundation", detail: "2 weeks · Ghaziabad · 15 seats", closes: "10 Oct 2026" },
  { id: "f3", kind: "Consultancy", title: "Product Stability Testing & Safety Advisory for Natural Formulations", by: "Patanjali Research Institute", detail: "6 months · Part-time retainer · Paid", closes: "18 Oct 2026" },
  { id: "f4", kind: "Collaborative Grant", title: "Multi-Center Study: Traditional Wellness Protocols in Lifestyle Health", by: "AIIA × IIT Delhi Joint Lab", detail: "24 months · ₹35L grant · Co-PI slots open", closes: "30 Oct 2026" },
  { id: "f5", kind: "Guest Lecture", title: "Industry Expert Series: Global Regulatory Pathways for Herbal Products", by: "Himalaya Wellness", detail: "Rolling series · Honorarium", closes: "Rolling" },
];

/* ---------------- Institutional Analytics Data ---------------- */

const COHORT = SKILLS.map((s, i) => ({
  skill: s.short,
  cohort: [60, 48, 62, 68, 42, 45, 40, 36, 72, 58][i],
  industry: [75, 78, 80, 70, 75, 70, 65, 75, 70, 80][i],
}));

const FUNNEL = [
  { stage: "Registered", n: 1420 },
  { stage: "Assessed", n: 960 },
  { stage: "Applied", n: 620 },
  { stage: "Shortlisted", n: 280 },
  { stage: "Placed", n: 184 },
];

const DEMAND_TREND = [
  { m: "Apr", "Regulatory Compliance": 32, "Digital Health": 22, "Health Data": 28 },
  { m: "May", "Regulatory Compliance": 38, "Digital Health": 30, "Health Data": 32 },
  { m: "Jun", "Regulatory Compliance": 43, "Digital Health": 39, "Health Data": 36 },
  { m: "Jul", "Regulatory Compliance": 49, "Digital Health": 51, "Health Data": 42 },
  { m: "Aug", "Regulatory Compliance": 56, "Digital Health": 63, "Health Data": 48 },
  { m: "Sep", "Regulatory Compliance": 64, "Digital Health": 76, "Health Data": 54 },
];

const APPLICANTS = [
  { name: "Ishit Aggarwal", college: "All India Institute of Ayurveda, New Delhi", role: "Clinical Research Intern", stream: "Ayurveda", match: 89, status: "Selected" },
  { name: "Manvi Rawat", college: "National Institute of Ayurveda, Jaipur", role: "Regulatory Compliance Trainee", stream: "Ayurveda", match: 82, status: "Shortlisted" },
  { name: "Naitik Sharma", college: "AIIA, New Delhi", role: "Quality Control Lab Trainee", stream: "Ayurveda", match: 78, status: "Applied" },
  { name: "Shreya Paul", college: "National Institute of Homoeopathy, Kolkata", role: "Clinical Research Intern", stream: "Homoeopathy", match: 74, status: "Shortlisted" },
  { name: "Viyona Menon", college: "Amrita School of Ayurveda", role: "Therapeutic Wellness Consultant", stream: "Ayurveda", match: 92, status: "Selected" },
  { name: "Shaurya Dwivedi", college: "BHU Faculty of Ayurveda, Varanasi", role: "Tele-AYUSH Implementation", stream: "Ayurveda", match: 71, status: "Applied" },
  { name: "Devika Pillai", college: "Govt Yoga & Naturopathy College, Chennai", role: "Corporate Wellness Associate", stream: "Yoga & Naturopathy", match: 88, status: "Selected" },
];

const SAMPLE_PROFILE = {
  wellness_therapy: 45,
  herbal_formulation: 68,
  quality_testing: 45,
  clinical_doc: 70,
  regulatory_gmp: 40,
  clinical_research: 70,
  health_data: 65,
  digital_telehealth: 45,
  lifestyle_counsel: 90,
  yoga_therapy: 25,
};

/* ---------------- Matching Engine (with Certification Boosts) ---------------- */

function scoreAgainst(profile, requires, certs = []) {
  const keys = Object.keys(requires);
  if (!keys.length) return { pct: 0, gaps: [], met: [] };
  let sum = 0;
  const gaps = [], met = [];
  
  // Calculate certification bonus per skill
  const certBonus = {};
  if (Array.isArray(certs)) {
    certs.forEach((c) => {
      if (c.boostSkill && c.verified) {
        certBonus[c.boostSkill] = (certBonus[c.boostSkill] || 0) + (c.boostAmount || 8);
      }
    });
  }

  keys.forEach((k) => {
    const rawHave = profile ? (profile[k] ?? 20) : 20;
    const have = Math.min(100, rawHave + (certBonus[k] || 0));
    const need = requires[k];
    sum += Math.min(have / need, 1);
    if (have >= need) {
      met.push({ skill: k, have, need, short: 0 });
    } else {
      gaps.push({ skill: k, have, need, short: need - have });
    }
  });
  gaps.sort((a, b) => b.short - a.short);
  return { pct: Math.round((sum / keys.length) * 100), gaps, met };
}

/* ============================================================
   MAIN AYUSHBRIDGE COMPONENT
   ============================================================ */

export default function AyushBridge() {
  const [themeMode, setThemeMode] = useState("dark"); // 'dark' | 'light'
  const [role, setRole] = useState(null); // null = landing, 'student' | 'academician' | 'industry' | 'institution'
  const [tab, setTab] = useState("overview");
  const [activeSector, setActiveSector] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Authentication State (Google OAuth Simulation)
  const [user, setUser] = useState({
    name: "Ishit Aggarwal",
    email: "ishit.aggarwal@aiia.gov.in",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    institution: "All India Institute of Ayurveda (AIIA), New Delhi",
    year: "4th Professional Year (BAMS)",
    bio: "AYUSH student researcher passionate about evidence-based botanical drug development, clinical trial protocol design, and modernizing traditional health data workflows.",
    specializations: ["Clinical Research", "Herbal Formulation", "Herb Quality Testing", "Digital Tele-AYUSH"],
    links: {
      linkedin: "https://linkedin.com/in/ishit-aggarwal-ayush",
      researchGate: "https://researchgate.net/profile/Ishit-Aggarwal",
      website: "https://ishit-ayush.dev",
    },
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [isAddExpOpen, setIsAddExpOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);

  // Student Certifications & Credentials State
  const [certifications, setCertifications] = useState([
    {
      id: "c1",
      title: "Good Clinical Practice (GCP) in Traditional Medicine Trials",
      issuer: "Central Council for Research in Ayurvedic Sciences (CCRAS)",
      issueDate: "July 2026",
      credentialUrl: "https://ccras.nic.in/verify/AY-GCP-8842",
      verified: true,
      boostSkill: "clinical_research",
      boostAmount: 15,
      docName: "CCRAS_GCP_Certificate.pdf",
    },
    {
      id: "c2",
      title: "AYUSH Industry Standards & GMP Quality Norms",
      issuer: "Himalaya Wellness Academy",
      issueDate: "May 2026",
      credentialUrl: "https://himalayawellness.in/verify/HW-GMP-1092",
      verified: true,
      boostSkill: "regulatory_gmp",
      boostAmount: 12,
      docName: "Himalaya_GMP_Norms.pdf",
    },
    {
      id: "c3",
      title: "Condition-Specific Yoga Therapy Protocol Design",
      issuer: "Kaivalyadhama Health & Yoga Institute",
      issueDate: "March 2026",
      credentialUrl: "https://kdham.com/cert/YOGA-TH-541",
      verified: true,
      boostSkill: "yoga_therapy",
      boostAmount: 10,
      docName: "Yoga_Therapy_Cert.pdf",
    },
  ]);

  // Student Experience History State
  const [experiences, setExperiences] = useState([
    {
      id: "e1",
      role: "Clinical Trainee — Panchakarma & OPD",
      org: "All India Institute of Ayurveda Hospital, New Delhi",
      period: "Jan 2026 – Present (6 mos)",
      description: "Documented 140+ outpatient clinical case sheets, supervised therapeutic oil treatments, and tracked outcome markers.",
    },
    {
      id: "e2",
      role: "Botanical Quality Control Lab Intern",
      org: "Dabur Research Foundation, Ghaziabad",
      period: "Oct 2025 – Dec 2025 (3 mos)",
      description: "Assisted in purity testing of raw medicinal herbs, chromatographic identification, and microbial limit testing.",
    },
  ]);

  // Assessment state
  const [answers, setAnswers] = useState({});
  const [profile, setProfile] = useState(null);
  const [qIdx, setQIdx] = useState(0);

  // Application & Recruiter states
  const [apps, setApps] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [openOpp, setOpenOpp] = useState(null);
  const [posted, setPosted] = useState([]);
  const [form, setForm] = useState({
    title: "",
    org: "Himalaya Wellness Company",
    domain: "herbal_mfg",
    type: "Internship",
    loc: "Bengaluru",
    pay: "₹20,000 / month",
    skills: [],
  });

  const T = THEMES[themeMode];

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  const rankedRoles = useMemo(() => {
    if (!profile) return ROLES.map((r) => ({ ...r, pct: 75, gaps: [], met: [] }));
    return ROLES.map((r) => ({ ...r, ...scoreAgainst(profile, r.requires, certifications) })).sort((a, b) => b.pct - a.pct);
  }, [profile, certifications]);

  const filteredOpps = useMemo(() => {
    let list = [...OPPORTUNITIES, ...posted];
    if (activeSector !== "all") {
      list = list.filter((o) => o.domain === activeSector);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) =>
        o.title.toLowerCase().includes(q) ||
        o.org.toLowerCase().includes(q) ||
        o.loc.toLowerCase().includes(q) ||
        o.about.toLowerCase().includes(q)
      );
    }
    if (!profile) {
      return list.map((o) => ({ ...o, pct: null, gaps: [] }));
    }
    return list.map((o) => ({ ...o, ...scoreAgainst(profile, o.requires, certifications) })).sort((a, b) => (b.pct || 0) - (a.pct || 0));
  }, [profile, posted, activeSector, searchQuery, certifications]);

  const topGaps = useMemo(() => {
    if (!profile) return [];
    const counts = {};
    OPPORTUNITIES.forEach((o) => {
      Object.entries(o.requires).forEach(([k, need]) => {
        const short = need - (profile[k] ?? 20);
        if (short > 0) counts[k] = Math.max(counts[k] || 0, short);
      });
    });
    return Object.entries(counts).map(([skill, short]) => ({ skill, short })).sort((a, b) => b.short - a.short);
  }, [profile]);

  const radarData = profile
    ? SKILLS.map((s) => ({
        skill: s.short,
        you: profile[s.id] ?? 20,
        benchmark: COHORT.find((c) => c.skill === s.short)?.industry || 75,
      }))
    : [];

  function submitAnswer(v) {
    const next = { ...answers, [qIdx]: v };
    setAnswers(next);
    if (qIdx < QUESTIONS.length - 1) {
      setQIdx(qIdx + 1);
    } else {
      const p = {};
      QUESTIONS.forEach((q, i) => {
        p[q.skill] = next[i] ?? 20;
      });
      setProfile(p);
      setTab("overview");
      showToast("Assessment complete! Profile scores & readiness updated.");
    }
  }

  const applied = (id) => apps.some((a) => a.oppId === id);
  const apply = (id) => {
    setApps((a) => [...a, { oppId: id, status: "Applied", on: "Today" }]);
    showToast("Application submitted successfully!");
  };

  /* ---------------- UI Atoms ---------------- */

  const Eyebrow = ({ children, color }) => (
    <div style={{
      fontFamily: "var(--ui)",
      fontSize: 11,
      letterSpacing: ".15em",
      textTransform: "uppercase",
      color: color || T.sage,
      fontWeight: 650,
      marginBottom: 4,
    }}>
      {children}
    </div>
  );

  const Chip = ({ children, tone = "neutral", style }) => {
    const tones = {
      neutral: { bg: T.bgSurface, fg: T.inkSoft, bd: T.border },
      gap: { bg: T.terraSoft, fg: T.terra, bd: T.terra },
      good: { bg: T.sageSoft, fg: T.sage, bd: T.sage },
      accent: { bg: T.tealSoft, fg: T.teal, bd: T.teal },
    }[tone] || { bg: T.bgSurface, fg: T.inkSoft, bd: T.border };

    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        background: tones.bg,
        color: tones.fg,
        border: `1px solid ${tones.bd}40`,
        fontWeight: 550,
        whiteSpace: "nowrap",
        ...style,
      }}>
        {children}
      </span>
    );
  };

  const Btn = ({ children, onClick, variant = "primary", small, disabled, style }) => {
    const styles = {
      primary: { background: T.teal, color: themeMode === "dark" ? "#07120E" : "#FFFFFF", border: `1px solid ${T.teal}` },
      accent: { background: T.terra, color: themeMode === "dark" ? "#120803" : "#FFFFFF", border: `1px solid ${T.terra}` },
      ghost: { background: "transparent", color: T.ink, border: `1px solid ${T.border}` },
    }[variant];

    return (
      <button
        className="ay-btn"
        onClick={onClick}
        disabled={disabled}
        style={{
          ...styles,
          padding: small ? "7px 14px" : "11px 22px",
          borderRadius: 10,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "var(--ui)",
          fontSize: small ? 13 : 14.5,
          fontWeight: 600,
          opacity: disabled ? 0.45 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          ...style,
        }}
      >
        {children}
      </button>
    );
  };

  const Card = ({ children, style, className = "" }) => (
    <div
      className={`ay-card ${className}`}
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        boxShadow: T.cardShadow,
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );

  const H = ({ children, size = 26, style }) => (
    <h2 style={{
      fontFamily: "var(--display)",
      fontWeight: 600,
      fontSize: size,
      color: T.ink,
      margin: 0,
      letterSpacing: "-.015em",
      ...style,
    }}>
      {children}
    </h2>
  );

  const Muted = ({ children, style }) => (
    <p style={{
      fontFamily: "var(--ui)",
      color: T.muted,
      fontSize: 14,
      lineHeight: 1.6,
      margin: 0,
      ...style,
    }}>
      {children}
    </p>
  );

  const KPI = ({ label, value, sub, icon }) => (
    <Card style={{ padding: 18, flex: "1 1 170px", minWidth: 150 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontFamily: "var(--display)", fontSize: 30, fontWeight: 700, color: T.teal, letterSpacing: "-.02em" }}>
          {value}
        </div>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: "var(--ui)", fontSize: 13.5, color: T.ink, marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </Card>
  );

  const ReadinessMeter = ({ pct, gaps, compact }) => (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--ui)", fontSize: 12.5, color: T.muted }}>Role readiness</span>
        <span style={{
          fontFamily: "var(--display)",
          fontSize: compact ? 22 : 30,
          fontWeight: 700,
          color: pct >= 80 ? T.sage : pct >= 60 ? T.teal : T.terra,
          letterSpacing: "-.02em",
        }}>
          {pct}%
        </span>
      </div>
      <div style={{ position: "relative", height: 8, background: T.bgSurface, borderRadius: 999, overflow: "hidden" }}>
        <div
          className="ay-fill"
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            borderRadius: 999,
            background: pct >= 80
              ? `linear-gradient(90deg, ${T.teal}, ${T.sage})`
              : `linear-gradient(90deg, ${T.terra}, ${T.teal})`,
          }}
        />
      </div>
      <div style={{ position: "relative", height: 14 }}>
        <div style={{ position: "absolute", left: "80%", top: 0, transform: "translateX(-50%)", textAlign: "center" }}>
          <div style={{ width: 1, height: 5, background: T.muted, margin: "0 auto" }} />
          <div style={{ fontFamily: "var(--ui)", fontSize: 9.5, color: T.muted, whiteSpace: "nowrap" }}>hiring bar</div>
        </div>
      </div>
      {gaps && gaps.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, marginBottom: 6 }}>Key skills to close</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {gaps.slice(0, 3).map((g) => (
              <Chip key={g.skill} tone="gap">
                {skillShort(g.skill)} · +{g.short}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const ThemeToggle = () => (
    <button
      onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
      className="ay-theme-btn"
      title={`Switch to ${themeMode === "light" ? "Dark" : "Light"} mode`}
      style={{
        background: T.bgSurface,
        border: `1px solid ${T.border}`,
        borderRadius: 999,
        padding: "6px 12px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: T.ink,
        fontFamily: "var(--ui)",
        fontSize: 12.5,
        fontWeight: 550,
      }}
    >
      {themeMode === "light" ? (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.terra} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span>Dark</span>
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span>Light</span>
        </>
      )}
    </button>
  );

  const Logo = ({ small }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: small ? 30 : 36,
        height: small ? 30 : 36,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${T.teal}, ${T.sage})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 2px 10px ${T.teal}40`,
      }}>
        <svg width={small ? 16 : 20} height={small ? 16 : 20} viewBox="0 0 24 24" fill="none">
          <path d="M3 17c4 0 5-10 9-10s5 10 9 10" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="2.2" fill={T.terra} />
        </svg>
      </div>
      <div>
        <div style={{
          fontFamily: "var(--display)",
          fontSize: small ? 19 : 22,
          fontWeight: 700,
          color: T.ink,
          letterSpacing: "-.02em",
          lineHeight: 1,
        }}>
          AyushBridge
        </div>
        {!small && (
          <div style={{ fontFamily: "var(--ui)", fontSize: 11, color: T.muted, marginTop: 2, fontWeight: 500 }}>
            National AYUSH Academia · Industry Portal
          </div>
        )}
      </div>
    </div>
  );

  /* --- User Profile / Google Sign-In Header Widget --- */
  const UserAuthWidget = () => (
    user ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => { setRole("student"); setTab("portfolio"); }}
          style={{
            background: T.bgSurface,
            border: `1px solid ${T.border}`,
            borderRadius: 999,
            padding: "4px 12px 4px 6px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            color: T.ink,
            fontFamily: "var(--ui)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <img
            src={user.avatar}
            alt={user.name}
            style={{ width: 26, height: 26, borderRadius: 999, objectFit: "cover" }}
          />
          <span>{user.name.split(" ")[0]}</span>
        </button>
        <button
          onClick={() => {
            setUser(null);
            showToast("Signed out of Google account");
          }}
          title="Sign Out"
          style={{
            background: "none",
            border: "none",
            color: T.muted,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "var(--ui)",
            padding: "4px 6px",
          }}
        >
          Sign Out
        </button>
      </div>
    ) : (
      <button
        onClick={() => setIsAuthModalOpen(true)}
        className="ay-google-btn"
        style={{
          background: T.bgSurface,
          border: `1px solid ${T.border}`,
          borderRadius: 999,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          color: T.ink,
          fontFamily: "var(--ui)",
          fontSize: 13,
          fontWeight: 600,
          transition: "all .15s ease",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Sign In with Google</span>
      </button>
    )
  );

  /* ============================================================
     1. LANDING PAGE VIEW
     ============================================================ */

  if (!role) {
    const sampleRole = ROLES[0];
    const sample = scoreAgainst(SAMPLE_PROFILE, sampleRole.requires, certifications);

    return (
      <Shell T={T}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 22px" }}>
          
          <header style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 0",
            borderBottom: `1px solid ${T.borderSubtle}`,
          }}>
            <Logo />
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ThemeToggle />
              <UserAuthWidget />
            </div>
          </header>

          <section className="ay-hero" style={{
            display: "flex",
            gap: 48,
            alignItems: "center",
            padding: "48px 0 60px",
          }}>
            <div style={{ flex: "1 1 540px", minWidth: 300 }}>
              <Eyebrow>Ayurveda · Yoga · Unani · Siddha · Homoeopathy</Eyebrow>

              <h1 style={{
                fontFamily: "var(--display)",
                fontSize: "clamp(34px, 5vw, 56px)",
                lineHeight: 1.08,
                letterSpacing: "-.03em",
                color: T.ink,
                margin: "14px 0 0",
                fontWeight: 700,
              }}>
                Connecting AYUSH students & faculty with<br />
                <span style={{ color: T.sage }}>leading herbal & healthcare industries.</span>
              </h1>

              <Muted style={{ fontSize: 16.5, marginTop: 18, maxWidth: 540 }}>
                AyushBridge measures your hands-on competencies in herbal formulation, quality testing, wellness protocols, and clinical research — directly matching you to verified internships, industry R&D grants, and placement pipelines across India.
              </Muted>

              <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
                <Btn onClick={() => { setRole("student"); setTab("assessment"); }}>
                  Take AYUSH Skill Assessment →
                </Btn>
                <Btn variant="ghost" onClick={() => { setRole("student"); setProfile(SAMPLE_PROFILE); setTab("overview"); }}>
                  Open Sample Student Profile
                </Btn>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 32, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, fontWeight: 550 }}>Active Partners:</span>
                {["Dabur Research", "Himalaya Wellness", "Patanjali Labs", "AIIA New Delhi", "CCRAS", "Kottakkal", "Organic India"].map((c) => (
                  <span key={c} style={{
                    fontSize: 12,
                    fontFamily: "var(--ui)",
                    color: T.muted,
                    background: T.bgSurface,
                    padding: "3px 9px",
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ flex: "1 1 360px", minWidth: 290 }}>
              <Card style={{ padding: 26, background: T.bgCardSubtle }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Eyebrow>Live Match Preview</Eyebrow>
                  <Chip tone="good">Verified Criteria</Chip>
                </div>
                <H size={20} style={{ marginTop: 8 }}>{sampleRole.title}</H>
                <Muted style={{ fontSize: 13, marginTop: 3, marginBottom: 20 }}>{sampleRole.sector}</Muted>
                
                <ReadinessMeter pct={sample.pct} gaps={sample.gaps} />

                <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                  <Muted style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    Evaluated from concrete practical questions against verified job criteria listed by top herbal and clinical employers.
                  </Muted>
                </div>
              </Card>
            </div>
          </section>

          <section style={{ paddingBottom: 75 }}>
            <Eyebrow>Choose a role to enter the portal</Eyebrow>
            <H size={26} style={{ marginTop: 4, marginBottom: 18 }}>Role-Based Portals</H>

            <div className="ay-grid4" style={{ display: "grid", gap: 16 }}>
              {[
                { id: "student", t: "Student & Intern", d: "Assess your skills, find matched internships, enroll in certified programs, and build your verified portfolio.", icon: "🎓" },
                { id: "academician", t: "Faculty & Researcher", d: "Access industry training sabbaticals, joint R&D grants, corporate advisory, and student mentorship.", icon: "🔬" },
                { id: "industry", t: "Herbal Industry & Recruiter", d: "Post openings, discover ranked candidates with verified skills, and sponsor skill modules.", icon: "🌿" },
                { id: "institution", t: "AYUSH College & Dean", d: "Track campus skill gaps, placement pipelines, and curriculum-industry alignment metrics.", icon: "📊" },
              ].map((r) => (
                <button
                  key={r.id}
                  className="ay-persona"
                  onClick={() => { setRole(r.id); setTab("overview"); }}
                  style={{
                    background: T.bgCard,
                    border: `1px solid ${T.border}`,
                    borderRadius: 16,
                    padding: 22,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all .18s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, color: T.ink }}>
                    {r.t}
                  </div>
                  <Muted style={{ fontSize: 13, marginTop: 8, flexGrow: 1 }}>{r.d}</Muted>
                  <div style={{
                    fontFamily: "var(--ui)",
                    fontSize: 13.5,
                    color: T.terra,
                    marginTop: 14,
                    fontWeight: 650,
                  }}>
                    Enter Portal →
                  </div>
                </button>
              ))}
            </div>
          </section>

          <Footer T={T} />
        </div>
      </Shell>
    );
  }

  /* ============================================================
     2. AUTHENTICATED APP WORKSPACE SHELL
     ============================================================ */

  const TABS = {
    student: [
      ["overview", "Overview & Readiness"],
      ["assessment", "Skill Assessment"],
      ["opportunities", "AYUSH Internships & Jobs"],
      ["programs", "Industry Learning Programs"],
      ["applications", "My Applications"],
      ["portfolio", "Profile & Portfolio"],
    ],
    academician: [
      ["overview", "Faculty Dashboard"],
      ["faculty", "R&D & Industry Immersion"],
      ["mentorship", "Mentorship & Live Problem Statements"],
    ],
    industry: [
      ["overview", "Recruiter Workspace"],
      ["post", "Post an Opening"],
      ["applicants", "Ranked AYUSH Candidates"],
    ],
    institution: [
      ["overview", "Campus Dashboard"],
      ["cohort", "Cohort Skill Gaps"],
      ["placement", "Placement Pipeline"],
    ],
  }[role];

  return (
    <Shell T={T}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: T.teal,
          color: themeMode === "dark" ? "#07120E" : "#FFFFFF",
          padding: "12px 20px",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          fontFamily: "var(--ui)",
          fontSize: 14,
          fontWeight: 600,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 8,
          animation: "fadeIn .2s ease",
        }}>
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Sticky Navigation Header */}
      <div style={{
        borderBottom: `1px solid ${T.border}`,
        background: T.navBg,
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 22px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 0",
            gap: 16,
            flexWrap: "wrap",
          }}>
            <button
              onClick={() => setRole(null)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <Logo small />
            </button>

            {/* Persona Switcher */}
            <div style={{
              display: "flex",
              gap: 4,
              background: T.bgSurface,
              padding: 4,
              borderRadius: 999,
              border: `1px solid ${T.border}`,
            }}>
              {[
                ["student", "Student"],
                ["academician", "Academician"],
                ["industry", "Industry"],
                ["institution", "Institution"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => { setRole(id); setTab("overview"); }}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontFamily: "var(--ui)",
                    fontSize: 13,
                    fontWeight: role === id ? 650 : 500,
                    background: role === id ? T.teal : "transparent",
                    color: role === id ? (themeMode === "dark" ? "#07120E" : "#FFFFFF") : T.muted,
                    transition: "all .15s ease",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ThemeToggle />
              <UserAuthWidget />
              <Btn small variant="ghost" onClick={() => setRole(null)}>Exit to Home</Btn>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 2 }}>
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 0 12px",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--ui)",
                  fontSize: 14,
                  fontWeight: tab === id ? 650 : 500,
                  color: tab === id ? T.ink : T.muted,
                  borderBottom: `2px solid ${tab === id ? T.terra : "transparent"}`,
                  marginBottom: -1,
                  transition: "all .15s ease",
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 22px 80px" }}>

        {/* ================= STUDENT ================= */}

        {role === "student" && tab === "overview" && (
          !profile ? (
            <Card style={{ maxWidth: 620, padding: 30 }}>
              <Eyebrow>Assessment Required</Eyebrow>
              <H size={24} style={{ marginTop: 6 }}>No skill profile measured yet</H>
              <Muted style={{ marginTop: 8, marginBottom: 20 }}>
                The 10-question assessment measures your hands-on competencies in herbal formulation, quality testing, patient care, and clinical research. Match scores and gap-closing programs will be calculated instantly.
              </Muted>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={() => setTab("assessment")}>Start 10-Question Assessment →</Btn>
                <Btn variant="ghost" onClick={() => { setProfile(SAMPLE_PROFILE); showToast("Sample profile loaded!"); }}>Load Sample AYUSH Profile</Btn>
              </div>
            </Card>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <H size={30}>Your AYUSH Skill Profile & Readiness</H>
                  <Muted style={{ marginTop: 4, marginBottom: 22 }}>
                    Measured across industry standards · Boosted by {certifications.filter((c) => c.verified).length} verified credentials
                  </Muted>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small variant="ghost" onClick={() => setTab("portfolio")}>Edit Profile & Credentials</Btn>
                  <Btn small variant="ghost" onClick={() => setTab("assessment")}>Retake Assessment</Btn>
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
                <KPI value={`${rankedRoles[0]?.pct || 88}%`} label="Top Role Readiness" sub={rankedRoles[0]?.title} icon="🎯" />
                <KPI value={filteredOpps.filter((o) => (o.pct || 0) >= 75).length} label="Qualifying Postings" sub="Match score >= 75%" icon="🌿" />
                <KPI value={certifications.length} label="Uploaded Credentials" sub={`${certifications.filter((c) => c.verified).length} verified`} icon="📜" />
                <KPI value={apps.length} label="Active Applications" sub="Under review" icon="📨" />
              </div>

              <div className="ay-2col" style={{ display: "grid", gap: 16 }}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Eyebrow>Skill Radar vs Industry Standard</Eyebrow>
                    <Chip tone="accent">AYUSH Benchmarks</Chip>
                  </div>
                  <div style={{ height: 340, marginTop: 12 }}>
                    <ResponsiveContainer>
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke={T.border} />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Industry Standard" dataKey="benchmark" stroke={T.terra} fill={T.terra} fillOpacity={0.12} strokeDasharray="4 3" />
                        <Radar name="Your Score" dataKey="you" stroke={T.sage} fill={T.sage} fillOpacity={0.35} />
                        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                        <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <Eyebrow>Best Matched Career Paths</Eyebrow>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
                    {rankedRoles.slice(0, 3).map((r) => (
                      <div key={r.id} style={{ paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 600, color: T.ink }}>
                              {r.title}
                            </div>
                            <Muted style={{ fontSize: 12.5, marginTop: 2 }}>{r.sector} · Demand: {r.demand}</Muted>
                          </div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <ReadinessMeter pct={r.pct} gaps={r.gaps} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div style={{ marginTop: 28 }}>
                <H size={22}>Close Your Top Skill Gaps</H>
                <Muted style={{ marginTop: 4, marginBottom: 16 }}>
                  Directly sponsored by AYUSH manufacturing and clinical partners to boost your hiring chances.
                </Muted>

                <div className="ay-grid3" style={{ display: "grid", gap: 14 }}>
                  {topGaps.slice(0, 3).map((g) => {
                    const prog = PROGRAMS.find((p) => p.boosts === g.skill) || PROGRAMS[0];
                    return (
                      <Card key={g.skill} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <Chip tone="gap">{skillShort(g.skill)} · {g.short} pts gap</Chip>
                        <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>
                          {prog.title}
                        </div>
                        <Muted style={{ fontSize: 13 }}>{prog.by} · {prog.weeks} weeks · {prog.mode}</Muted>
                        <div style={{ marginTop: "auto", paddingTop: 8 }}>
                          <Btn
                            small
                            variant={enrolled.includes(prog.id) ? "ghost" : "accent"}
                            disabled={enrolled.includes(prog.id)}
                            onClick={() => {
                              setEnrolled((e) => [...e, prog.id]);
                              showToast(`Enrolled in ${prog.title}`);
                            }}
                          >
                            {enrolled.includes(prog.id) ? "Enrolled ✓" : "Enroll Now"}
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

        {/* --- ASSESSMENT TAB --- */}
        {role === "student" && tab === "assessment" && (
          profile && Object.keys(answers).length === QUESTIONS.length ? (
            <Card style={{ maxWidth: 640, padding: 30 }}>
              <Eyebrow>Assessment Complete</Eyebrow>
              <H size={24} style={{ marginTop: 8 }}>Your AYUSH profile is updated</H>
              <Muted style={{ marginTop: 8, lineHeight: 1.6 }}>
                Matches, skill gap analyses, and program recommendations across the portal are now calibrated against your latest scores.
              </Muted>
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <Btn onClick={() => setTab("overview")}>View My Profile & Matches →</Btn>
                <Btn variant="ghost" onClick={() => { setAnswers({}); setQIdx(0); setProfile(null); }}>
                  Retake Assessment
                </Btn>
              </div>
            </Card>
          ) : (
            <div style={{ maxWidth: 720 }}>
              <Eyebrow>
                AYUSH Skill Assessment · Question {qIdx + 1} of {QUESTIONS.length}
              </Eyebrow>

              <div style={{ height: 5, background: T.bgSurface, borderRadius: 999, margin: "12px 0 24px", overflow: "hidden" }}>
                <div style={{
                  width: `${((qIdx + 1) / QUESTIONS.length) * 100}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${T.teal}, ${T.sage})`,
                  transition: "width .3s ease",
                }} />
              </div>

              <Card style={{ padding: 28 }}>
                <Chip tone="accent">{skillLabel(QUESTIONS[qIdx].skill)}</Chip>
                <H size={22} style={{ marginTop: 14, lineHeight: 1.35 }}>
                  {QUESTIONS[qIdx].q}
                </H>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
                  {OPTIONS.map((o) => {
                    const isSelected = answers[qIdx] === o.value;
                    return (
                      <button
                        key={o.value}
                        className="ay-opt"
                        onClick={() => submitAnswer(o.value)}
                        style={{
                          textAlign: "left",
                          padding: "14px 18px",
                          borderRadius: 12,
                          border: `1px solid ${isSelected ? T.teal : T.border}`,
                          background: isSelected ? T.tealSoft : T.bgSurface,
                          cursor: "pointer",
                          fontFamily: "var(--ui)",
                          fontSize: 14.5,
                          color: T.ink,
                          transition: "all .14s ease",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: isSelected ? 600 : 450 }}>{o.text}</span>
                        <span style={{ color: isSelected ? T.teal : T.muted, fontSize: 12, fontWeight: 550 }}>
                          {isSelected ? "Selected ✓" : `+${o.value} pts`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {qIdx > 0 && (
                <div style={{ marginTop: 14 }}>
                  <Btn small variant="ghost" onClick={() => setQIdx(qIdx - 1)}>← Previous Question</Btn>
                </div>
              )}
            </div>
          )
        )}

        {/* --- OPPORTUNITIES TAB --- */}
        {role === "student" && tab === "opportunities" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
              <div>
                <H size={28}>AYUSH Internships, Apprenticeships & Jobs</H>
                <Muted style={{ marginTop: 4, marginBottom: 18 }}>
                  {profile
                    ? "Ranked by how closely your measured competencies meet employer requirements."
                    : "Complete the assessment to see your exact percentage readiness against each posting."}
                </Muted>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search herbal labs, hospitals, roles..."
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: T.bgCard,
                  color: T.ink,
                  fontFamily: "var(--ui)",
                  fontSize: 13.5,
                  minWidth: 260,
                  outline: "none",
                }}
              />
            </div>

            {/* Sector Filter Bar */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14, marginBottom: 12 }}>
              {AYUSH_SECTORS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSector(s.id)}
                  style={{
                    padding: "7px 15px",
                    borderRadius: 999,
                    border: `1px solid ${activeSector === s.id ? T.teal : T.border}`,
                    background: activeSector === s.id ? T.teal : T.bgSurface,
                    color: activeSector === s.id ? (themeMode === "dark" ? "#07120E" : "#FFFFFF") : T.muted,
                    fontFamily: "var(--ui)",
                    fontSize: 13,
                    fontWeight: 550,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all .15s ease",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Opportunities List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredOpps.map((o) => (
                <Card key={o.id} style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 400px", minWidth: 270 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Chip tone="accent">{o.type}</Chip>
                      <Chip>{o.loc}</Chip>
                      <span style={{ fontSize: 12, color: T.muted, fontWeight: 550 }}>Closes {o.closes}</span>
                    </div>

                    <div style={{ fontFamily: "var(--display)", fontSize: 19.5, fontWeight: 600, color: T.ink, marginTop: 10 }}>
                      {o.title}
                    </div>
                    <Muted style={{ fontSize: 13.5, marginTop: 3, fontWeight: 550, color: T.teal }}>
                      {o.org} · {o.pay}
                    </Muted>

                    <Muted style={{ fontSize: 13.5, marginTop: 8 }}>{o.about}</Muted>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                      {Object.entries(o.requires).map(([k, need]) => {
                        const have = profile ? profile[k] ?? 20 : null;
                        return (
                          <Chip key={k} tone={have === null ? "neutral" : have >= need ? "good" : "gap"}>
                            {skillShort(k)}: {need}+
                          </Chip>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ flex: "0 0 220px", minWidth: 200 }}>
                    {o.pct !== null ? (
                      <ReadinessMeter pct={o.pct} gaps={o.gaps} compact />
                    ) : (
                      <div style={{ padding: 10, background: T.bgSurface, borderRadius: 10, fontSize: 12, color: T.muted }}>
                        Take assessment to see match %
                      </div>
                    )}

                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      <Btn
                        small
                        disabled={applied(o.id)}
                        onClick={() => apply(o.id)}
                        variant={applied(o.id) ? "ghost" : "primary"}
                      >
                        {applied(o.id) ? "Applied ✓" : "Apply Now"}
                      </Btn>
                      <Btn small variant="ghost" onClick={() => setOpenOpp(openOpp === o.id ? null : o.id)}>
                        {openOpp === o.id ? "Hide" : "Breakdown"}
                      </Btn>
                    </div>

                    {openOpp === o.id && (
                      <div style={{
                        marginTop: 12,
                        padding: 12,
                        background: T.bgSurface,
                        borderRadius: 10,
                        fontFamily: "var(--ui)",
                        fontSize: 12.5,
                        color: T.muted,
                        lineHeight: 1.6,
                      }}>
                        <div style={{ fontWeight: 600, color: T.ink, marginBottom: 4 }}>Skill Breakdown:</div>
                        {profile && Object.entries(o.requires).map(([k, need]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{skillShort(k)}</span>
                            <span style={{ color: (profile[k] ?? 20) >= need ? T.sage : T.terra, fontWeight: 600 }}>
                              {profile[k] ?? 20} / {need}
                            </span>
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

        {/* --- PROGRAMS TAB --- */}
        {role === "student" && tab === "programs" && (
          <>
            <H size={28}>Industry Certified Learning Programs</H>
            <Muted style={{ marginTop: 4, marginBottom: 20 }}>
              Published directly by AYUSH manufacturers and research councils. Completing one raises the verified skill on your profile.
            </Muted>

            <div className="ay-grid3" style={{ display: "grid", gap: 14 }}>
              {PROGRAMS.map((p) => (
                <Card key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Chip tone="accent">Boosts {skillShort(p.boosts)}</Chip>
                  <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>
                    {p.title}
                  </div>
                  <Muted style={{ fontSize: 13 }}>{p.by} · {p.weeks} weeks · {p.mode}</Muted>
                  <div style={{ marginTop: "auto", paddingTop: 10 }}>
                    <Btn
                      small
                      variant={enrolled.includes(p.id) ? "ghost" : "accent"}
                      disabled={enrolled.includes(p.id)}
                      onClick={() => {
                        setEnrolled((e) => [...e, p.id]);
                        showToast(`Enrolled in ${p.title}`);
                      }}
                    >
                      {enrolled.includes(p.id) ? "Enrolled ✓" : "Enroll Free"}
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* --- APPLICATIONS TAB --- */}
        {role === "student" && tab === "applications" && (
          apps.length === 0 ? (
            <Card style={{ maxWidth: 560, padding: 30 }}>
              <H size={22}>No Applications Sent Yet</H>
              <Muted style={{ marginTop: 8, marginBottom: 20 }}>
                Explore openings across herbal manufacturing, clinical research, wellness resorts, and tele-AYUSH.
              </Muted>
              <Btn onClick={() => setTab("opportunities")}>Browse AYUSH Opportunities →</Btn>
            </Card>
          ) : (
            <>
              <H size={28}>My Applications</H>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {apps.map((a) => {
                  const o = [...OPPORTUNITIES, ...posted].find((x) => x.id === a.oppId) || OPPORTUNITIES[0];
                  const stages = ["Applied", "Shortlisted", "Selected"];
                  const at = stages.indexOf(a.status);
                  return (
                    <Card key={a.oppId} style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 600, color: T.ink }}>
                          {o.title}
                        </div>
                        <Muted style={{ fontSize: 13, marginTop: 2 }}>{o.org} · Applied on {a.on}</Muted>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {stages.map((s, i) => (
                          <React.Fragment key={s}>
                            {i > 0 && <div style={{ width: 24, height: 1, background: i <= at ? T.sage : T.border }} />}
                            <Chip tone={i <= at ? "good" : "neutral"}>{s}</Chip>
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

        {/* --- PROFILE & PORTFOLIO TAB --- */}
        {role === "student" && tab === "portfolio" && (
          <>
            {/* Student Header Card */}
            <Card style={{ marginBottom: 20, padding: 26 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                  <img
                    src={user ? user.avatar : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"}
                    alt="Student Avatar"
                    style={{ width: 72, height: 72, borderRadius: 999, objectFit: "cover", border: `2px solid ${T.teal}` }}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <H size={24}>{user ? user.name : "Guest Student"}</H>
                      <Chip tone="good">Verified AYUSH Profile ✓</Chip>
                    </div>
                    <Muted style={{ fontSize: 13.5, marginTop: 2 }}>
                      {user?.institution || "All India Institute of Ayurveda"} · {user?.year || "4th Professional Year"}
                    </Muted>
                    <Muted style={{ fontSize: 13, marginTop: 1, color: T.teal }}>
                      {user?.email || "student@aiia.gov.in"}
                    </Muted>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn
                    small
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      showToast("Digital Portfolio share link copied to clipboard! 📋");
                    }}
                  >
                    Share Profile Link 🔗
                  </Btn>
                  <Btn
                    small
                    variant="ghost"
                    onClick={() => window.print()}
                  >
                    Download Resume PDF 📥
                  </Btn>
                  <Btn small onClick={() => setIsEditProfileOpen(true)}>Edit Profile</Btn>
                </div>
              </div>

              {/* Bio */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>
                  About & Research Focus
                </div>
                <p style={{ fontFamily: "var(--ui)", fontSize: 14, color: T.ink, lineHeight: 1.6, margin: 0 }}>
                  {user?.bio || "AYUSH student researcher passionate about botanical drug discovery and clinical health systems."}
                </p>
              </div>

              {/* Specialization Tags & Links */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, fontWeight: 550 }}>Specializations:</span>
                  {(user?.specializations || ["Clinical Research", "Herbal Formulation"]).map((sp) => (
                    <Chip key={sp} tone="accent">{sp}</Chip>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {user?.links?.linkedin && (
                    <a href={user.links.linkedin} target="_blank" rel="noreferrer" style={{ color: T.teal, fontSize: 13, textDecoration: "none", fontWeight: 550 }}>
                      LinkedIn ↗
                    </a>
                  )}
                  {user?.links?.researchGate && (
                    <a href={user.links.researchGate} target="_blank" rel="noreferrer" style={{ color: T.teal, fontSize: 13, textDecoration: "none", fontWeight: 550 }}>
                      ResearchGate ↗
                    </a>
                  )}
                </div>
              </div>
            </Card>

            <div className="ay-2col" style={{ display: "grid", gap: 16 }}>
              
              {/* Left Column: Verified Skills Matrix */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Eyebrow>Verified AYUSH Skills Matrix</Eyebrow>
                    <Chip tone="good">Automated Scoring</Chip>
                  </div>
                  {!profile ? (
                    <div style={{ marginTop: 12 }}>
                      <Muted>Complete the 10-question assessment to calibrate verified competency scores.</Muted>
                      <div style={{ marginTop: 12 }}>
                        <Btn small onClick={() => setTab("assessment")}>Take Skill Assessment</Btn>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                      {SKILLS.map((s) => {
                        const bonus = certifications.filter((c) => c.boostSkill === s.id && c.verified).reduce((sum, c) => sum + (c.boostAmount || 8), 0);
                        const rawScore = profile[s.id] ?? 20;
                        const finalScore = Math.min(100, rawScore + bonus);
                        return (
                          <div key={s.id}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--ui)", fontSize: 13, color: T.ink, marginBottom: 4 }}>
                              <span style={{ fontWeight: 550 }}>{s.label}</span>
                              <span style={{ color: bonus > 0 ? T.sage : T.muted, fontWeight: bonus > 0 ? 650 : 500 }}>
                                {finalScore} / 100 {bonus > 0 && `(+${bonus} cert boost)`}
                              </span>
                            </div>
                            <div style={{ height: 6, background: T.bgSurface, borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ width: `${finalScore}%`, height: "100%", background: T.sage, borderRadius: 999 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Clinical & Internship History */}
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Eyebrow>Clinical Rotations & Internship Experience</Eyebrow>
                    <Btn small variant="ghost" onClick={() => { setEditingExp(null); setIsAddExpOpen(true); }}>+ Add Experience</Btn>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                    {experiences.map((exp) => (
                      <div key={exp.id} style={{ paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 15, fontWeight: 600, color: T.ink }}>
                              {exp.role}
                            </div>
                            <Muted style={{ fontSize: 13, color: T.teal, marginTop: 1 }}>{exp.org}</Muted>
                            <Muted style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{exp.period}</Muted>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => { setEditingExp(exp); setIsAddExpOpen(true); }}
                              style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setExperiences(experiences.filter((x) => x.id !== exp.id));
                                showToast("Experience removed");
                              }}
                              style={{ background: "none", border: "none", color: T.terra, cursor: "pointer", fontSize: 12 }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.inkSoft, marginTop: 6, lineHeight: 1.5, margin: "6px 0 0" }}>
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Column: Certifications & Verified Credentials */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Eyebrow>Certifications & Credentials</Eyebrow>
                    <Btn small onClick={() => { setEditingCert(null); setIsAddCertOpen(true); }}>+ Add Certification</Btn>
                  </div>
                  <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>
                    Verified certificates directly boost your matched skill proficiency and role readiness.
                  </Muted>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {certifications.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: T.bgSurface,
                          border: `1px solid ${T.border}`,
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 14.5, fontWeight: 650, color: T.ink }}>
                              {c.title}
                            </div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, color: T.teal, marginTop: 2, fontWeight: 550 }}>
                              {c.issuer}
                            </div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                              Issued {c.issueDate} {c.docName && `· ${c.docName}`}
                            </div>
                          </div>
                          <Chip tone={c.verified ? "good" : "neutral"}>
                            {c.verified ? "Verified ✓" : "Pending"}
                          </Chip>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}30` }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {c.boostSkill && (
                              <span style={{ fontSize: 11.5, fontFamily: "var(--ui)", color: T.sage, fontWeight: 600 }}>
                                +{c.boostAmount || 10} pts in {skillShort(c.boostSkill)}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {c.credentialUrl && (
                              <a href={c.credentialUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.teal, textDecoration: "none", fontWeight: 550 }}>
                                Verify ↗
                              </a>
                            )}
                            <button
                              onClick={() => { setEditingCert(c); setIsAddCertOpen(true); }}
                              style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setCertifications(certifications.filter((x) => x.id !== c.id));
                                showToast("Certification deleted");
                              }}
                              style={{ background: "none", border: "none", color: T.terra, cursor: "pointer", fontSize: 12 }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Document Storage */}
                <Card>
                  <Eyebrow>Digital Credential Vault</Eyebrow>
                  <Muted style={{ fontSize: 13.5, marginTop: 8 }}>
                    Signed university transcripts, thesis preprints, and hospital rotation logbooks stored securely.
                  </Muted>
                  <div style={{ marginTop: 14 }}>
                    <Btn small variant="ghost">Upload New PDF Document 📄</Btn>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* ================= ACADEMICIAN ================= */}

        {role === "academician" && tab === "overview" && (
          <>
            <H size={30}>Faculty Workspace</H>
            <Muted style={{ marginTop: 4, marginBottom: 22 }}>
              Dr. A. Nair · Department of Clinical Studies · All India Institute of Ayurveda
            </Muted>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <KPI value="38" label="Students Mentored" sub="This academic session" icon="👥" />
              <KPI value="₹35L" label="Active Industry Grants" sub="AIIA × Partner Labs" icon="💰" />
              <KPI value="4" label="Faculty Programs Done" sub="Of 5 registered" icon="📜" />
              <KPI value="3" label="Live Industry Projects" sub="1 awaiting review" icon="🌿" />
            </div>

            <div className="ay-2col" style={{ display: "grid", gap: 16, marginTop: 22 }}>
              <Card>
                <Eyebrow>Cohort Average vs Industry Expectation</Eyebrow>
                <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                  Student cohort averages against employer standards. Highlights syllabus adjustment areas.
                </Muted>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={[...COHORT].sort((a, b) => (a.cohort - a.industry) - (b.cohort - b.industry)).slice(0, 6)} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid horizontal={false} stroke={T.border} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <YAxis type="category" dataKey="skill" width={110} tick={{ fontSize: 10.5, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                      <Bar dataKey="cohort" name="Cohort Average" fill={T.sage} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="industry" name="Industry Standard" fill={T.terra} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <Eyebrow>Closing Soon for Faculty</Eyebrow>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                  {FACULTY_OPPS.slice(0, 4).map((f) => (
                    <div key={f.id} style={{ paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                      <Chip tone="accent">{f.kind}</Chip>
                      <div style={{ fontFamily: "var(--display)", fontSize: 16, fontWeight: 600, color: T.ink, marginTop: 6 }}>
                        {f.title}
                      </div>
                      <Muted style={{ fontSize: 12.5, marginTop: 2 }}>{f.by} · {f.detail}</Muted>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {role === "academician" && tab === "faculty" && (
          <>
            <H size={28}>Faculty Opportunities & Industry Immersion</H>
            <Muted style={{ marginTop: 4, marginBottom: 20 }}>
              Faculty development programs, industrial training, consultancy retainers, and collaborative research grants in one place.
            </Muted>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FACULTY_OPPS.map((f) => (
                <Card key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ flex: "1 1 360px" }}>
                    <Chip tone="accent">{f.kind}</Chip>
                    <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, color: T.ink, marginTop: 8 }}>
                      {f.title}
                    </div>
                    <Muted style={{ fontSize: 13.5, marginTop: 3 }}>{f.by} · {f.detail}</Muted>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Muted style={{ fontSize: 12.5, marginBottom: 8 }}>Closes {f.closes}</Muted>
                    <Btn small>Express Interest</Btn>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {role === "academician" && tab === "mentorship" && (
          <>
            <H size={28}>Mentorship & Live Problem Statements</H>
            <Muted style={{ marginTop: 4, marginBottom: 20 }}>
              Requests from students and problem statements published by AYUSH industry partners.
            </Muted>

            <div className="ay-2col" style={{ display: "grid", gap: 16 }}>
              <Card>
                <Eyebrow>Mentorship Requests</Eyebrow>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    ["Naitik Sharma", "Guidance on Quality Control lab testing internship application"],
                    ["Shreya Paul", "Research methodology and trial protocol design"],
                    ["Viyona Menon", "Therapeutic wellness documentation review"],
                  ].map(([n, d]) => (
                    <div key={n} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontFamily: "var(--ui)", fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{n}</div>
                        <Muted style={{ fontSize: 12.5, marginTop: 1 }}>{d}</Muted>
                      </div>
                      <Btn small variant="ghost">Accept</Btn>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <Eyebrow>Live AYUSH Industry Problem Statements</Eyebrow>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    ["Shelf-Life Prediction for Natural Herbal Syrups", "Dabur Research Foundation"],
                    ["Standardizing Digital Case Sheets across AYUSH Streams", "National Health Authority"],
                    ["Outcome Measurements in Corporate Yoga Therapy", "Kaivalyadhama Health Institute"],
                  ].map(([t, by]) => (
                    <div key={t} style={{ paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontFamily: "var(--ui)", fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{t}</div>
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
            <H size={30}>Himalaya Wellness & AYUSH Industry Hub</H>
            <Muted style={{ marginTop: 4, marginBottom: 22 }}>Verified Industry Partner Workspace</Muted>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <KPI value={5 + posted.length} label="Active Postings" icon="📌" />
              <KPI value="74" label="Total Candidates" sub="+18 this week" icon="👥" />
              <KPI value="14" label="Shortlisted" sub="Match >= 80%" icon="⭐" />
              <KPI value="86%" label="Median Match Score" icon="📊" />
            </div>

            <Card style={{ marginTop: 22 }}>
              <Eyebrow>AYUSH Skill Demand Trajectory (Last 6 Months)</Eyebrow>
              <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                Platform postings requiring each skill area.
              </Muted>
              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={DEMAND_TREND}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <YAxis tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                    <Line type="monotone" dataKey="Regulatory Compliance" stroke={T.sage} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Digital Health" stroke={T.terra} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Health Data" stroke={T.teal} strokeWidth={2.5} dot={false} strokeDasharray="5 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}

        {role === "industry" && tab === "post" && (
          <div style={{ maxWidth: 660 }}>
            <H size={28}>Publish AYUSH Opportunity</H>
            <Muted style={{ marginTop: 4, marginBottom: 20 }}>
              Specify the required skills and target proficiency thresholds. Candidates are ranked objectively on measured capability.
            </Muted>

            <Card>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                  Role Title
                </div>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Natural Product Quality Control Trainee"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.bgSurface,
                    color: T.ink,
                    fontFamily: "var(--ui)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                    AYUSH Sector
                  </div>
                  <select
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${T.border}`,
                      background: T.bgSurface,
                      color: T.ink,
                      fontFamily: "var(--ui)",
                      fontSize: 13.5,
                      outline: "none",
                    }}
                  >
                    {AYUSH_SECTORS.filter((s) => s.id !== "all").map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                    Opportunity Type
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["Internship", "Apprenticeship", "Full-time"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setForm({ ...form, type: t })}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: `1px solid ${form.type === t ? T.teal : T.border}`,
                          background: form.type === t ? T.teal : T.bgSurface,
                          color: form.type === t ? (themeMode === "dark" ? "#07120E" : "#FFFFFF") : T.muted,
                          fontSize: 12.5,
                          fontWeight: 550,
                          cursor: "pointer",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, fontWeight: 600, marginBottom: 8 }}>
                  Required Skills (Pick up to 4)
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SKILLS.map((s) => {
                    const on = form.skills.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setForm({
                            ...form,
                            skills: on
                              ? form.skills.filter((x) => x !== s.id)
                              : form.skills.length < 4
                              ? [...form.skills, s.id]
                              : form.skills,
                          });
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          border: `1px solid ${on ? T.sage : T.border}`,
                          background: on ? T.sageSoft : T.bgSurface,
                          color: on ? T.sage : T.muted,
                          fontSize: 12.5,
                          fontWeight: 550,
                          cursor: "pointer",
                        }}
                      >
                        {s.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Btn
                disabled={!form.title.trim() || form.skills.length === 0}
                onClick={() => {
                  const req = {};
                  form.skills.forEach((s) => { req[s] = 65; });
                  setPosted((p) => [
                    ...p,
                    {
                      id: "n" + (p.length + 1),
                      title: form.title,
                      org: "Himalaya Wellness Company",
                      loc: "Bengaluru",
                      domain: form.domain,
                      type: form.type,
                      pay: "₹18,000 / month",
                      closes: "31 Oct 2026",
                      requires: req,
                      about: "Published directly via AyushBridge Recruiter Workspace.",
                    },
                  ]);
                  setForm({ ...form, title: "", skills: [] });
                  showToast("Opportunity published to Student board!");
                }}
              >
                Publish Opening →
              </Btn>

              {posted.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                  <Eyebrow>Published this session</Eyebrow>
                  {posted.map((p) => (
                    <div key={p.id} style={{ marginTop: 8, fontFamily: "var(--ui)", fontSize: 13.5, color: T.ink }}>
                      ✨ {p.title} · {p.type} — Visible to students on Opportunity Board
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {role === "industry" && tab === "applicants" && (
          <>
            <H size={28}>Ranked AYUSH Applicants</H>
            <Muted style={{ marginTop: 4, marginBottom: 20 }}>
              Ranked by verified hands-on competency scores. Portfolios and project summaries open upon application.
            </Muted>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ui)", fontSize: 13.5, minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: T.bgSurface }}>
                      {["Candidate", "College & Stream", "Applied For", "Readiness Match", "Status"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "13px 18px", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, fontWeight: 650 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...APPLICANTS].sort((a, b) => b.match - a.match).map((a) => (
                      <tr key={a.name} style={{ borderTop: `1px solid ${T.border}` }}>
                        <td style={{ padding: "14px 18px", color: T.ink, fontWeight: 600 }}>{a.name}</td>
                        <td style={{ padding: "14px 18px", color: T.muted }}>{a.college}</td>
                        <td style={{ padding: "14px 18px", color: T.inkSoft }}>{a.role}</td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 50, height: 6, background: T.bgSurface, borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ width: `${a.match}%`, height: "100%", background: a.match >= 80 ? T.sage : T.terra }} />
                            </div>
                            <span style={{ color: a.match >= 80 ? T.sage : T.terra, fontWeight: 650 }}>{a.match}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <Chip tone={a.status === "Selected" ? "good" : "neutral"}>{a.status}</Chip>
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
            <Muted style={{ marginTop: 4, marginBottom: 22 }}>
              Institutional Analytics & Placement Dashboard · Academic Year 2026–27
            </Muted>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <KPI value="1,420" label="Students on Platform" sub="Across 5 AYUSH streams" icon="🏛️" />
              <KPI value="67.6%" label="Assessment Completion" sub="Target: 85% by Nov" icon="📈" />
              <KPI value="44%" label="Internship Participation" sub="Up +16% YoY" icon="🌿" />
              <KPI value="79%" label="Median Match Index" sub="To live industry roles" icon="🎯" />
            </div>

            <div className="ay-2col" style={{ display: "grid", gap: 16, marginTop: 22 }}>
              <Card>
                <Eyebrow>Placement Funnel</Eyebrow>
                <div style={{ height: 280, marginTop: 10 }}>
                  <ResponsiveContainer>
                    <BarChart data={FUNNEL} layout="vertical" margin={{ left: 8, right: 26 }}>
                      <CartesianGrid horizontal={false} stroke={T.border} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <YAxis type="category" dataKey="stage" width={86} tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                      <Bar dataKey="n" name="Students" radius={[0, 4, 4, 0]}>
                        {FUNNEL.map((_, i) => (
                          <Cell key={i} fill={[T.sageSoft, T.sage, T.teal, T.blue, T.terra][i % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <Eyebrow>Emerging AYUSH Skill Demand</Eyebrow>
                <Muted style={{ fontSize: 13, marginTop: 4 }}>
                  Skill areas seeing rapid posting volume increase from employers.
                </Muted>
                <div style={{ height: 250, marginTop: 12 }}>
                  <ResponsiveContainer>
                    <AreaChart data={DEMAND_TREND}>
                      <CartesianGrid stroke={T.border} vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <YAxis tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                      <Area type="monotone" dataKey="Regulatory Compliance" stroke={T.sage} fill={T.sageSoft} />
                      <Area type="monotone" dataKey="Digital Health" stroke={T.teal} fill={T.tealSoft} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        )}

        {role === "institution" && tab === "cohort" && (
          <>
            <H size={28}>Cohort Skill Gaps</H>
            <Muted style={{ marginTop: 4, marginBottom: 20 }}>
              Average measured score per skill against the level employers ask for. The distance between the bars indicates curriculum update opportunities.
            </Muted>

            <Card>
              <div style={{ height: 380 }}>
                <ResponsiveContainer>
                  <BarChart data={COHORT} margin={{ left: 0, right: 10, bottom: 30 }}>
                    <CartesianGrid vertical={false} stroke={T.border} />
                    <XAxis
                      dataKey="skill"
                      angle={-22}
                      textAnchor="end"
                      interval={0}
                      height={60}
                      tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                    <Bar dataKey="cohort" name="Cohort Average" fill={T.sage} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="industry" name="Industry Standard" fill={T.terra} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="ay-grid3" style={{ display: "grid", gap: 14, marginTop: 18 }}>
              {[...COHORT].sort((a, b) => (a.industry - a.cohort) - (b.industry - b.cohort)).slice(0, 3).map((c) => (
                <Card key={c.skill}>
                  <Chip tone="gap">{c.industry - c.cohort} Point Gap</Chip>
                  <div style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 600, color: T.ink, marginTop: 10 }}>
                    {c.skill}
                  </div>
                  <Muted style={{ fontSize: 13, marginTop: 6 }}>
                    Recommended action: Integrate partner industry training programs as credited electives in the next semester.
                  </Muted>
                </Card>
              ))}
            </div>
          </>
        )}

        {role === "institution" && tab === "placement" && (
          <>
            <H size={28}>Placement Telemetry</H>
            <Muted style={{ marginTop: 4, marginBottom: 20 }}>
              Live candidate pipeline across all partner AYUSH organizations.
            </Muted>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
              <KPI value="184" label="Placed" sub="30% of assessed students" icon="🎉" />
              <KPI value="₹4.2 LPA" label="Median Package" icon="💵" />
              <KPI value="24" label="Recruiting Partners" sub="6 joined this session" icon="🤝" />
              <KPI value="21 Days" label="Median Time to Offer" icon="⚡" />
            </div>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ui)", fontSize: 13.5, minWidth: 680 }}>
                  <thead>
                    <tr style={{ background: T.bgSurface }}>
                      {["Student", "Stream", "Opportunity", "Readiness Match", "Status"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "13px 18px", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, fontWeight: 650 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {APPLICANTS.map((r) => (
                      <tr key={r.name} style={{ borderTop: `1px solid ${T.border}` }}>
                        <td style={{ padding: "14px 18px", color: T.ink, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: "14px 18px", color: T.muted }}>{r.stream}</td>
                        <td style={{ padding: "14px 18px", color: T.inkSoft }}>{r.role}</td>
                        <td style={{ padding: "14px 18px", color: r.match >= 80 ? T.sage : T.terra, fontWeight: 650 }}>
                          {r.match}%
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <Chip tone={r.status === "Selected" ? "good" : "neutral"}>{r.status}</Chip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        <Footer T={T} />
      </main>

      {/* ============================================================
          MODALS: AUTH, PROFILE EDIT, CERTIFICATIONS, EXPERIENCES
          ============================================================ */}

      {/* 1. Google Auth Modal */}
      {isAuthModalOpen && (
        <ModalOverlay onClose={() => setIsAuthModalOpen(false)} T={T}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ display: "inline-flex", padding: 12, background: T.bgSurface, borderRadius: 999, marginBottom: 14 }}>
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <H size={22}>Sign in to AyushBridge</H>
            <Muted style={{ fontSize: 13.5, marginTop: 6, marginBottom: 24 }}>
              Sign in with your Google account to sync your verified AYUSH credentials, assessment results, and job applications.
            </Muted>

            <button
              onClick={() => {
                setUser({
                  name: "Ishit Aggarwal",
                  email: "ishit.aggarwal@aiia.gov.in",
                  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
                  institution: "All India Institute of Ayurveda (AIIA), New Delhi",
                  year: "4th Professional Year (BAMS)",
                  bio: "AYUSH student researcher passionate about evidence-based botanical drug development, clinical trial protocol design, and modernizing traditional health data workflows.",
                  specializations: ["Clinical Research", "Herbal Formulation", "Herb Quality Testing", "Digital Tele-AYUSH"],
                  links: {
                    linkedin: "https://linkedin.com/in/ishit-aggarwal-ayush",
                    researchGate: "https://researchgate.net/profile/Ishit-Aggarwal",
                    website: "https://ishit-ayush.dev",
                  },
                });
                setIsAuthModalOpen(false);
                showToast("Signed in as Ishit Aggarwal via Google OAuth ✓");
              }}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.bgSurface,
                color: T.ink,
                fontFamily: "var(--ui)",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"
                alt="Avatar"
                style={{ width: 24, height: 24, borderRadius: 999 }}
              />
              <span>Continue as Ishit Aggarwal (ishit.aggarwal@aiia.gov.in)</span>
            </button>

            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => {
                  setUser({
                    name: "Dr. Ananya Sharma",
                    email: "ananya.sharma@gmail.com",
                    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
                    institution: "National Institute of Ayurveda, Jaipur",
                    year: "Post-Graduate Scholar (MD)",
                    bio: "Focusing on herbal standardized extraction techniques and clinical GCP trial outcomes.",
                    specializations: ["Herbal Formulation", "Regulatory & GMP", "Clinical Research"],
                    links: { linkedin: "https://linkedin.com", researchGate: "", website: "" },
                  });
                  setIsAuthModalOpen(false);
                  showToast("Signed in as Dr. Ananya Sharma via Google OAuth ✓");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: T.muted,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "var(--ui)",
                }}
              >
                Sign in with another Google account
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* 2. Edit Profile Modal */}
      {isEditProfileOpen && (
        <ModalOverlay onClose={() => setIsEditProfileOpen(false)} T={T}>
          <H size={22}>Edit Student Profile</H>
          <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>
            Update your academic details, bio, and professional links.
          </Muted>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Full Name</div>
              <input
                type="text"
                value={user?.name || ""}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
              />
            </div>

            <div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Institution / College Name</div>
              <input
                type="text"
                value={user?.institution || ""}
                onChange={(e) => setUser({ ...user, institution: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Year of Study</div>
                <input
                  type="text"
                  value={user?.year || ""}
                  onChange={(e) => setUser({ ...user, year: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
                />
              </div>
              <div>
                <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Email</div>
                <input
                  type="email"
                  value={user?.email || ""}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Short Bio & Research Interests</div>
              <textarea
                rows={3}
                value={user?.bio || ""}
                onChange={(e) => setUser({ ...user, bio: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5, resize: "vertical" }}
              />
            </div>

            <div>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>LinkedIn Profile URL</div>
              <input
                type="text"
                value={user?.links?.linkedin || ""}
                onChange={(e) => setUser({ ...user, links: { ...user.links, linkedin: e.target.value } })}
                placeholder="https://linkedin.com/in/..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <Btn small variant="ghost" onClick={() => setIsEditProfileOpen(false)}>Cancel</Btn>
              <Btn small onClick={() => { setIsEditProfileOpen(false); showToast("Profile updated successfully!"); }}>Save Changes</Btn>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* 3. Add / Edit Certification Modal */}
      {isAddCertOpen && (
        <CertificationModal
          T={T}
          cert={editingCert}
          onClose={() => setIsAddCertOpen(false)}
          onSave={(newCert) => {
            if (editingCert) {
              setCertifications(certifications.map((c) => c.id === editingCert.id ? newCert : c));
              showToast("Certification updated!");
            } else {
              setCertifications([...certifications, { ...newCert, id: "c" + Date.now(), verified: true }]);
              showToast("New certification added & verified! Skill scores boosted.");
            }
            setIsAddCertOpen(false);
          }}
        />
      )}

      {/* 4. Add / Edit Experience Modal */}
      {isAddExpOpen && (
        <ExperienceModal
          T={T}
          exp={editingExp}
          onClose={() => setIsAddExpOpen(false)}
          onSave={(newExp) => {
            if (editingExp) {
              setExperiences(experiences.map((e) => e.id === editingExp.id ? newExp : e));
              showToast("Experience updated!");
            } else {
              setExperiences([...experiences, { ...newExp, id: "e" + Date.now() }]);
              showToast("Clinical experience added to profile!");
            }
            setIsAddExpOpen(false);
          }}
        />
      )}
    </Shell>
  );
}

/* ---------------- Modal Subcomponents ---------------- */

function ModalOverlay({ children, onClose, T }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20,
    }}>
      <div style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        width: "100%",
        maxWidth: 540,
        maxHeight: "90vh",
        overflowY: "auto",
        padding: 26,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      }}>
        {children}
      </div>
    </div>
  );
}

function CertificationModal({ T, cert, onClose, onSave }) {
  const [title, setTitle] = useState(cert?.title || "");
  const [issuer, setIssuer] = useState(cert?.issuer || "");
  const [issueDate, setIssueDate] = useState(cert?.issueDate || "August 2026");
  const [credentialUrl, setCredentialUrl] = useState(cert?.credentialUrl || "");
  const [boostSkill, setBoostSkill] = useState(cert?.boostSkill || "clinical_research");
  const [docName, setDocName] = useState(cert?.docName || "Certificate_Verified.pdf");

  return (
    <ModalOverlay onClose={onClose} T={T}>
      <H size={22}>{cert ? "Edit Certification" : "Add AYUSH Certification"}</H>
      <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>
        Verified certifications tie directly into your role-readiness matching score.
      </Muted>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Certification Name</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Good Clinical Practice (GCP) in Traditional Medicine"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
          />
        </div>

        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Issuing Organization / Institute</div>
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="e.g. CCRAS / All India Institute of Ayurveda / Dabur"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Date of Issue</div>
            <input
              type="text"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              placeholder="e.g. July 2026"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
            />
          </div>

          <div>
            <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Boosted AYUSH Skill</div>
            <select
              value={boostSkill}
              onChange={(e) => setBoostSkill(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
            >
              {SKILLS.map((s) => (
                <option key={s.id} value={s.id}>{s.short}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Credential URL or Verification Link</div>
          <input
            type="text"
            value={credentialUrl}
            onChange={(e) => setCredentialUrl(e.target.value)}
            placeholder="https://..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
          />
        </div>

        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Upload Certificate Document (PDF/PNG)</div>
          <input
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="e.g. My_AYUSH_Certificate.pdf"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <Btn small variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            small
            disabled={!title.trim() || !issuer.trim()}
            onClick={() => onSave({ title, issuer, issueDate, credentialUrl, boostSkill, boostAmount: 12, docName })}
          >
            Save Certification
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ExperienceModal({ T, exp, onClose, onSave }) {
  const [role, setRoleTitle] = useState(exp?.role || "");
  const [org, setOrg] = useState(exp?.org || "");
  const [period, setPeriod] = useState(exp?.period || "");
  const [description, setDescription] = useState(exp?.description || "");

  return (
    <ModalOverlay onClose={onClose} T={T}>
      <H size={22}>{exp ? "Edit Experience" : "Add Clinical / Lab Experience"}</H>
      <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>
        Add your hospital clinical rotations, pharmacy apprenticeships, or research internships.
      </Muted>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Role / Position Title</div>
          <input
            type="text"
            value={role}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="e.g. Clinical Trainee — Hospital OPD"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
          />
        </div>

        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Hospital / Organization</div>
          <input
            type="text"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="e.g. AIIA Hospital, New Delhi"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
          />
        </div>

        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Duration / Period</div>
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="e.g. Jan 2026 – Present (6 mos)"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5 }}
          />
        </div>

        <div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 5 }}>Key Responsibilities & Case Work</div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe clinical case documentation, patient care procedures, or laboratory tests performed..."
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5, resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <Btn small variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            small
            disabled={!role.trim() || !org.trim()}
            onClick={() => onSave({ role, org, period, description })}
          >
            Save Experience
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ============================================================
   GLOBAL SHELL & FOOTER
   ============================================================ */

function Shell({ children, T }) {
  return (
    <div style={{
      background: T.bg,
      minHeight: "100vh",
      color: T.ink,
      transition: "background .25s ease, color .25s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
        :root {
          --display: 'Fraunces', 'Iowan Old Style', Georgia, serif;
          --ui: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .ay-btn { transition: transform .12s ease, filter .12s ease, box-shadow .12s ease; }
        .ay-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .ay-btn:active:not(:disabled) { transform: translateY(0); }
        .ay-persona:hover { transform: translateY(-3px); box-shadow: 0 16px 36px -18px rgba(0,0,0,.45); border-color: ${T.teal}80 !important; }
        .ay-card:hover { border-color: ${T.border} !important; }
        .ay-opt:hover { border-color: ${T.teal} !important; background: ${T.bgSurfaceHover} !important; }
        .ay-theme-btn { transition: all .15s ease; }
        .ay-theme-btn:hover { border-color: ${T.teal} !important; }
        .ay-google-btn:hover { border-color: ${T.teal} !important; background: ${T.bgSurfaceHover} !important; }
        .ay-fill { transition: width .6s cubic-bezier(.22,1,.36,1); }
        .ay-grid4 { grid-template-columns: repeat(4, 1fr); }
        .ay-grid3 { grid-template-columns: repeat(3, 1fr); }
        .ay-2col  { grid-template-columns: 1.15fr 1fr; }
        @media (max-width: 980px) {
          .ay-grid4 { grid-template-columns: repeat(2, 1fr); }
          .ay-grid3 { grid-template-columns: repeat(2, 1fr); }
          .ay-2col  { grid-template-columns: 1fr; }
          .ay-hero  { flex-wrap: wrap; gap: 32px !important; }
        }
        @media (max-width: 640px) {
          .ay-grid4, .ay-grid3 { grid-template-columns: 1fr; }
        }
        @media print {
          nav, header, button, .ay-theme-btn, .ay-google-btn { display: none !important; }
          body, main { background: #fff !important; color: #000 !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

function Footer({ T }) {
  return (
    <footer style={{
      borderTop: `1px solid ${T.border}`,
      marginTop: 60,
      paddingTop: 24,
      paddingBottom: 32,
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
      fontFamily: "var(--ui)",
      fontSize: 12.5,
      color: T.muted,
    }}>
      <div>
        <strong style={{ color: T.ink }}>AyushBridge</strong> · National AYUSH Academia-Industry Portal · Ministry of Ayush, All India Institute of Ayurveda
      </div>
      <div>
        Ayurveda · Yoga · Unani · Siddha · Homoeopathy · Team CODE BREAKERS · SIH Platform
      </div>
    </footer>
  );
}
