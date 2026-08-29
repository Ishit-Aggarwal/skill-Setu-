"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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

/* ---------------- Real-World AYUSH Opportunities (Standardized to LPA & Enriched) ---------------- */

const OPPORTUNITIES = [
  {
    id: "o1",
    title: "Clinical Research Intern — Traditional Medicine Trials Cell",
    org: "All India Institute of Ayurveda (AIIA)",
    loc: "New Delhi",
    domain: "clinical_research",
    type: "Internship",
    pay: "₹2.16 LPA",
    workMode: "On-site",
    physicalInterview: "Yes (Clinical Simulation Round)",
    interviewRounds: "2 Rounds: Written Technical Test + Faculty PI Panel",
    closes: "15 Oct 2026",
    requires: { clinical_research: 70, clinical_doc: 65, health_data: 55 },
    about: "Assist principal investigators in multi-center clinical trials for chronic lifestyle disorders — electronic case report forms (eCRF), patient consent protocols, and trial safety monitoring.",
    responsibilities: [
      "Screen and enroll patients according to AYUSH clinical trial inclusion criteria",
      "Document case sheets, adverse event logs, and vitals in electronic health databases",
      "Coordinate trial medication dispensing and patient follow-up appointments",
      "Assist in preparing monthly Good Clinical Practice (GCP) trial audit dossiers",
    ],
    qualifications: "Final-year BAMS / MD (Ayurveda) / B.Pharm (Ayurveda) / M.Sc Clinical Research",
    preferredSkills: "GCP Compliance, Patient Case Sheet Documentation, Spreadsheet Data Management",
    dayInLife: "Morning rounds in research OPD, trial data entry and verification in afternoon, weekly review meeting with senior investigators.",
  },
  {
    id: "o2",
    title: "Quality Control Trainee — Herbal Manufacturing Sector",
    org: "Dabur Research Foundation",
    loc: "Ghaziabad, Uttar Pradesh",
    domain: "quality_testing",
    type: "Apprenticeship",
    pay: "₹2.40 LPA",
    workMode: "On-site",
    physicalInterview: "Yes (Lab Practical Round)",
    interviewRounds: "3 Rounds: Online Screening + Wet Lab Practical + Technical Panel",
    closes: "22 Oct 2026",
    requires: { quality_testing: 75, herbal_formulation: 60, regulatory_gmp: 60 },
    about: "Conduct chemical purity testing, heavy metal screening, microbial limit assays, and shelf-life stability tests on botanical raw materials under Ayurvedic Pharmacopoeia of India (API) standards.",
    responsibilities: [
      "Perform botanical authentication and chromatographic identification on incoming raw herbs",
      "Conduct heavy metal, moisture content, and total ash tests using standard lab apparatus",
      "Prepare volumetric reagents and maintain calibrated laboratory equipment logbooks",
      "Document batch analysis certificates (COA) for manufactured herbal batches",
    ],
    qualifications: "B.Pharm (Ayurveda) / BAMS / B.Sc Chemistry / M.Sc Botany",
    preferredSkills: "HPLC/HPTLC Operation, Pharmacopoeial Assays, AYUSH GMP Record Keeping",
    dayInLife: "Sample intake and grinding in morning, running physicochemical assays in wet lab, documenting test certificates.",
  },
  {
    id: "o3",
    title: "Corporate Wellness & Yoga Therapy Associate — Preventive Health Sector",
    org: "Kaivalyadhama Health & Yoga Institute",
    loc: "Pune, Maharashtra",
    domain: "wellness_yoga",
    type: "Full-time (PG Level)",
    pay: "₹4.80 LPA",
    workMode: "Hybrid",
    physicalInterview: "No (Virtual Only)",
    interviewRounds: "2 Rounds: Yoga Protocol Practical Demo + HR Interview",
    closes: "18 Oct 2026",
    requires: { yoga_therapy: 75, lifestyle_counsel: 70 },
    about: "Create and lead guided physical wellness, breathwork, and stress-reduction routines for corporate executives and wellness clients.",
    responsibilities: [
      "Design personalized yoga therapy sequences for posture, back care, and chronic stress",
      "Deliver interactive corporate wellness webinars and guided meditation sessions",
      "Assess client flexibility and breath parameters to track health improvements",
      "Collaborate with corporate HR teams to deliver quarterly wellness workshops",
    ],
    qualifications: "BNYS / B.Sc Yoga / PG Diploma in Yoga Therapy / BAMS",
    preferredSkills: "Condition-Specific Asana Sequencing, Pranayama Protocols, Client Counseling",
    dayInLife: "Leading morning executive wellness sessions, customized protocol design for individual clients, afternoon wellness progress reporting.",
  },
  {
    id: "o4",
    title: "Tele-AYUSH & Digital Health Implementation Intern — Health Informatics Cell",
    org: "National Health Authority / Ministry of Ayush Partner",
    loc: "Remote / New Delhi HQ",
    domain: "digital_ayush",
    type: "Internship",
    pay: "₹2.40 LPA",
    workMode: "Remote",
    physicalInterview: "No (Virtual Only)",
    interviewRounds: "2 Rounds: Digital Health Assignment + Technical Interview",
    closes: "10 Oct 2026",
    requires: { digital_telehealth: 75, health_data: 60, clinical_doc: 50 },
    about: "Help AYUSH hospitals and colleges integrate electronic health records, tele-consultation workflows on e-Sanjeevani, and digital patient registries.",
    responsibilities: [
      "Onboard AYUSH physicians onto electronic prescription and video consultation tools",
      "Standardize traditional disease codes using NAMASTE portal terminology",
      "Analyze weekly tele-consultation volume and patient satisfaction metrics",
      "Conduct virtual training sessions for hospital administrative staff",
    ],
    qualifications: "BAMS / BHMS / BNYS / B.Tech Health Informatics / B.Sc IT",
    preferredSkills: "e-Sanjeevani Platform, Traditional Medicine Terminology, Digital Case Systems",
    dayInLife: "Resolving hospital telemedicine queries, auditing clinical record completeness, analyzing weekly telehealth usage trends.",
  },
  {
    id: "o5",
    title: "Herbal Formulation & Extraction Trainee — Classical Medicine Plant",
    org: "Patanjali Research Institute",
    loc: "Haridwar, Uttarakhand",
    domain: "herbal_mfg",
    type: "Internship",
    pay: "₹1.92 LPA",
    workMode: "On-site",
    physicalInterview: "Yes",
    interviewRounds: "2 Rounds: Technical Interview + Plant Tour Walkthrough",
    closes: "30 Oct 2026",
    requires: { herbal_formulation: 75, quality_testing: 60, regulatory_gmp: 50 },
    about: "Work with modern botanical extraction units, spray-drying equipment, and standardized herbal syrup and tablet production lines.",
    responsibilities: [
      "Monitor temperature, pressure, and solvent ratios during botanical extraction cycles",
      "Assist in optimizing decoction concentrations and spray-drying powder yields",
      "Maintain batch manufacturing records (BMR) in compliance with AYUSH GMP",
      "Inspect tablet compression parameters and syrup viscosity checks",
    ],
    qualifications: "BAMS / B.Pharm (Ayurveda) / M.Sc Industrial Pharmacy",
    preferredSkills: "Pilot Plant Extraction, Tablet Compression, Classical Herbal Preparations",
    dayInLife: "Monitoring pilot extraction tanks, checking yield metrics, assisting production supervisors on the formulation line.",
  },
  {
    id: "o6",
    title: "Regulatory Affairs & Compliance Trainee — Licensing Division",
    org: "Himalaya Wellness Company",
    loc: "Bengaluru, Karnataka",
    domain: "hospital_admin",
    type: "Internship",
    pay: "₹2.16 LPA",
    workMode: "Hybrid",
    physicalInterview: "No (Virtual Only)",
    interviewRounds: "2 Rounds: Regulatory Case Study + Department Head Interview",
    closes: "25 Oct 2026",
    requires: { regulatory_gmp: 75, herbal_formulation: 55, clinical_doc: 50 },
    about: "Prepare regulatory licensing dossiers, label verification, and safety documentation for herbal wellness products across domestic and international markets.",
    responsibilities: [
      "Review packaging artwork and label claims against AYUSH advertising regulations",
      "Compile stability test data and certificate of analysis (COA) for export dossiers",
      "Track state licensing authority notifications and product renewal schedules",
      "Assist in safety summary drafting for botanical dietary supplements",
    ],
    qualifications: "BAMS / B.Pharm (Ayurveda) / PG Diploma in Regulatory Affairs",
    preferredSkills: "AYUSH GMP Guidelines, Export Documentation, Product Labeling Review",
    dayInLife: "Reviewing ingredient safety dossiers, filing state licensing forms, checking overseas packaging compliance.",
  },
  {
    id: "o7",
    title: "Senior Therapeutic Wellness Consultant — Integrative Clinical Care",
    org: "Somatheeram Holistic Health Resort",
    loc: "Kovalam, Kerala",
    domain: "wellness_yoga",
    type: "Full-time (PG Level)",
    pay: "₹5.40 LPA",
    workMode: "On-site",
    physicalInterview: "Final Round Only",
    interviewRounds: "2 Rounds: Video Screening + On-site Practical Assessment",
    closes: "28 Sep 2026",
    requires: { wellness_therapy: 80, lifestyle_counsel: 65, clinical_doc: 50 },
    about: "Deliver tailored therapeutic body therapies, herbal steam regimens, and wellness care for domestic and international wellness guests.",
    responsibilities: [
      "Conduct preliminary wellness intake consultations and constitution assessments",
      "Administer classical therapeutic body therapies and herbal steam procedures",
      "Counsel international guests on seasonal diet regimens and lifestyle balance",
      "Maintain detailed patient therapy logs and daily health observation records",
    ],
    qualifications: "MD (Ayurveda) / BNYS / Senior BAMS with Clinical Experience",
    preferredSkills: "Therapeutic Body Care, Patient Consultation, Herbal Steam Protocols",
    dayInLife: "Morning guest wellness consultations, administering therapy protocols, evening patient wellness review.",
  },
  {
    id: "o8",
    title: "PG Clinical Trial & Standardization Fellow — Drug Research Division",
    org: "Central Council for Research in Ayurvedic Sciences (CCRAS)",
    loc: "New Delhi",
    domain: "clinical_research",
    type: "Fellowship (PG Level)",
    pay: "₹5.04 LPA",
    workMode: "On-site",
    physicalInterview: "Yes",
    interviewRounds: "2 Rounds: Written Research Aptitude Test + Council Panel Interview",
    closes: "05 Nov 2026",
    requires: { clinical_research: 75, quality_testing: 65, health_data: 60 },
    about: "Support government-funded clinical trials — research methodology, patient follow-up data collection, and safety reporting.",
    responsibilities: [
      "Coordinate patient recruitment and trial consent across participating hospital sites",
      "Standardize botanical raw drug monographs using physicochemical parameters",
      "Analyze clinical trial datasets using statistical software packages",
      "Draft research manuscript sections for submission to peer-reviewed journals",
    ],
    qualifications: "MD (Ayurveda) / M.Pharm (Ayurveda) / M.Sc Bio-analytical Sciences",
    preferredSkills: "Clinical Trial Protocols, Botanical Drug Monographs, Statistical Analysis",
    dayInLife: "Collecting clinical trial case forms, statistical data aggregation, drafting research progress reports.",
  },
  {
    id: "o9",
    title: "Classical Formulation & Production Trainee — Batch Manufacturing Unit",
    org: "Kottakkal Arya Vaidya Sala",
    loc: "Kottakkal, Kerala",
    domain: "herbal_mfg",
    type: "Apprenticeship",
    pay: "₹1.80 LPA",
    workMode: "On-site",
    physicalInterview: "Yes",
    interviewRounds: "2 Rounds: Technical Interview + Factory Floor Practical",
    closes: "12 Oct 2026",
    requires: { herbal_formulation: 75, quality_testing: 60 },
    about: "Hands-on apprenticeship in classical batch production, herb grading, decoction boiling, and quality inspection.",
    responsibilities: [
      "Grade incoming raw herbs based on botanical aroma, color, and texture",
      "Supervise classical decoction boiling cycles and reduction ratios",
      "Operate automated bottle filling, capping, and labeling machinery",
      "Document temperature charts and in-process quality control checkpoints",
    ],
    qualifications: "BAMS / B.Pharm (Ayurveda)",
    preferredSkills: "Classical Decoction Boiling, Herb Grading, GMP Documentation",
    dayInLife: "Supervising decoction boiling cycles, inspecting medicinal herb lots, recording batch manufacturing logs.",
  },
  {
    id: "o10",
    title: "Homoeopathic Case Documentation Intern — High-Volume Clinical OPD",
    org: "National Institute of Homoeopathy (NIH)",
    loc: "Kolkata, West Bengal",
    domain: "hospital_admin",
    type: "Internship",
    pay: "₹1.80 LPA",
    workMode: "On-site",
    physicalInterview: "Yes",
    interviewRounds: "2 Rounds: Case Analysis + Senior Faculty Interview",
    closes: "20 Oct 2026",
    requires: { clinical_doc: 75, lifestyle_counsel: 65, health_data: 50 },
    about: "Manage outpatient case histories, repertorization records, and digital documentation in high-volume teaching hospitals.",
    responsibilities: [
      "Record complete patient case histories including constitutional traits and modalities",
      "Utilize computer repertorization software to generate differential remedy rubrics",
      "Maintain outpatient electronic case records and follow-up outcome logs",
      "Assist senior doctors in clinical case conferences and case presentations",
    ],
    qualifications: "BHMS (Final Year / Intern) / MD (Homoeopathy)",
    preferredSkills: "Repertorization Software, Clinical Case History Taking, Discharge Documentation",
    dayInLife: "Recording OPD patient intake, updating repertory analysis charts, attending clinical faculty case discussions.",
  },
  {
    id: "o11",
    title: "Botanical Sourcing & Organic Supply Intern — Agricultural Supply Division",
    org: "Organic India Labs",
    loc: "Lucknow, Uttar Pradesh",
    domain: "quality_testing",
    type: "Internship",
    pay: "₹1.92 LPA",
    workMode: "Hybrid",
    physicalInterview: "No (Virtual Only)",
    interviewRounds: "2 Rounds: Agricultural Supply Case + HR Interview",
    closes: "16 Oct 2026",
    requires: { quality_testing: 70, regulatory_gmp: 60, health_data: 50 },
    about: "Inspect sustainable herb supply chains, verify organic farmer certifications, and track moisture and pesticide levels.",
    responsibilities: [
      "Audit organic farmer cooperative harvest logs and geo-tagged cultivation records",
      "Test raw herb lots for pesticide residues and moisture content in lab",
      "Verify compliance with National Programme for Organic Production (NPOP) rules",
      "Maintain digital traceability logs for all purchased raw botanical lots",
    ],
    qualifications: "B.Sc Agriculture / BAMS / B.Pharm / M.Sc Botany",
    preferredSkills: "Organic Certification Standards, Supply Chain Traceability, Herb Moisture Testing",
    dayInLife: "Auditing farmer cooperative harvest logs, testing lab pesticide levels, verifying NPOP organic standards.",
  },
  {
    id: "o12",
    title: "Lifestyle & Nutrition Wellness Counsellor — Natural Therapeutics OPD",
    org: "National Institute of Naturopathy (NIN)",
    loc: "Pune, Maharashtra",
    domain: "wellness_yoga",
    type: "Internship",
    pay: "₹1.80 LPA",
    workMode: "On-site",
    physicalInterview: "Yes",
    interviewRounds: "2 Rounds: Diet Case Consultation + Faculty Panel",
    closes: "24 Oct 2026",
    requires: { lifestyle_counsel: 80, wellness_therapy: 60, clinical_doc: 50 },
    about: "Conduct structured dietary counselling, nutritional therapy plans, and therapeutic fasting supervision for patients.",
    responsibilities: [
      "Formulate individualized raw diet, juice therapy, and fasting regimens",
      "Monitor patient vitals, hydration, and detoxification markers during fasting therapy",
      "Deliver daily patient health education talks on natural lifestyle principles",
      "Document dietary response charts and patient discharge lifestyle guides",
    ],
    qualifications: "BNYS / M.Sc Clinical Nutrition / BAMS",
    preferredSkills: "Nutritional Therapy Planning, Patient Diet Counseling, Therapeutic Fasting Supervision",
    dayInLife: "OPD patient dietary consultations, designing fasting therapy schedules, conducting group lifestyle workshops.",
  },
  {
    id: "o13",
    title: "Public Health & Policy Immersion Intern — National AYUSH Mission Cell",
    org: "Ministry of Ayush / Central Mission Directorate",
    loc: "New Delhi (Hybrid)",
    domain: "digital_ayush",
    type: "Govt. Internship (Certificate-Based)",
    pay: "Certificate & Academic Credit (₹0 LPA)",
    workMode: "Hybrid",
    physicalInterview: "No (Virtual Only)",
    interviewRounds: "1 Round: Application Statement & Screening",
    closes: "14 Oct 2026",
    requires: { digital_telehealth: 60, health_data: 55, clinical_doc: 50 },
    about: "Official 8-week public health policy immersion under the National AYUSH Mission. Assist in documenting regional community wellness programs, traditional medicine outreach data, and inter-ministerial health reports.",
    responsibilities: [
      "Collate quarterly health metrics from regional AYUSH Health & Wellness Centers",
      "Draft policy summary briefs on public awareness programs and traditional health campaigns",
      "Coordinate administrative dossiers for state mission directorate meetings",
      "Verify electronic field survey submissions from participating community health workers",
    ],
    qualifications: "Enrolled UG/PG AYUSH Student (BAMS / BHMS / BNYS / BUMS / BSMS) with College NOC",
    preferredSkills: "Public Health Reporting, Survey Data Collation, Official Correspondence Drafting",
    dayInLife: "Aggregating regional AYUSH center logs, compiling health outreach summary charts, attending weekly mission review meetings.",
  },
];

/* ---------------- AYUSH Industry Learning Programs ---------------- */

const PROGRAMS = [
  {
    id: "p1",
    title: "AYUSH Industry Standards & GMP Quality Norms",
    by: "Himalaya Wellness Academy",
    weeks: 4,
    price: 0,
    boosts: "regulatory_gmp",
    mode: "Online + Plant Tour",
    prerequisites: "Basic Ayurvedic Pharmacy or final-year BAMS/B.Pharm enrollment",
    skillsGained: ["Regulatory & GMP", "Quality Testing", "Plant Audit"],
    desc: "Master Ayurvedic Pharmacopoeia compliance, batch manufacturing records (BMR), and state licensing norms.",
  },
  {
    id: "p2",
    title: "Health Data Analysis with Spreadsheets & Python",
    by: "AIIA Data Cell",
    weeks: 6,
    price: 999,
    boosts: "health_data",
    mode: "Online Labs",
    prerequisites: "Basic computer literacy and interest in health trial data",
    skillsGained: ["Health Data", "Clinical Documentation", "Biostatistics"],
    desc: "Hands-on analysis of AYUSH patient records, clinical trial statistics, and public health metrics.",
  },
  {
    id: "p3",
    title: "Tele-AYUSH & Digital Health Operations",
    by: "National Health Authority",
    weeks: 3,
    price: 0,
    boosts: "digital_telehealth",
    mode: "Online Sandbox",
    prerequisites: "Introductory clinical OPD experience",
    skillsGained: ["Digital Tele-AYUSH", "EHR Case Systems", "NAMASTE Coding"],
    desc: "Integrate e-Sanjeevani workflows, standardized EHR case sheets, and virtual OPD protocols.",
  },
  {
    id: "p4",
    title: "Modern Botanical Lab Testing & Quality Control",
    by: "Dabur Research Foundation",
    weeks: 5,
    price: 1499,
    boosts: "quality_testing",
    mode: "On-site Lab, Ghaziabad",
    prerequisites: "B.Pharm (Ayurveda) / B.Sc Chemistry / BAMS",
    skillsGained: ["Quality Testing", "Herbal Formulation", "HPLC Assays"],
    desc: "Practical training in chromatographic authentication, pesticide screening, and microbial limit assays.",
  },
  {
    id: "p5",
    title: "Condition-Specific Yoga Therapy Protocol Design",
    by: "Kaivalyadhama Institute",
    weeks: 4,
    price: 499,
    boosts: "yoga_therapy",
    mode: "Hybrid",
    prerequisites: "Basic Yoga Asana foundations / BNYS / B.Sc Yoga",
    skillsGained: ["Yoga Therapy", "Lifestyle Counseling", "Stress Management"],
    desc: "Design structured therapeutic yoga sequences for metabolic, respiratory, and postural health conditions.",
  },
  {
    id: "p6",
    title: "Clinical Trial Protocol Design & GCP Standards",
    by: "CCRAS / ICMR",
    weeks: 4,
    price: 0,
    boosts: "clinical_research",
    mode: "Online Certified",
    prerequisites: "Enrolled UG/PG AYUSH Student or Researcher",
    skillsGained: ["Clinical Research", "GCP Compliance", "eCRF Documentation"],
    desc: "Comprehensive grounding in ICH-GCP guidelines, clinical protocol drafting, and patient safety tracking.",
  },
  {
    id: "p7",
    title: "Clinical Case Documentation & Discharge Standards",
    by: "AIIA Clinical Faculty",
    weeks: 2,
    price: 0,
    boosts: "clinical_doc",
    mode: "Online",
    prerequisites: "Final-year AYUSH student or Intern",
    skillsGained: ["Clinical Documentation", "Discharge Summaries", "Case History Taking"],
    desc: "Standardize OPD case taking, differential diagnosis charting, and clinical progress summaries.",
  },
  {
    id: "p8",
    title: "Standardized Herbal Extraction & Formulation Practicum",
    by: "Kottakkal Arya Vaidya Sala",
    weeks: 6,
    price: 2499,
    boosts: "herbal_formulation",
    mode: "On-site, Kerala",
    prerequisites: "BAMS / B.Pharm (Ayurveda) / M.Sc Botany",
    skillsGained: ["Herbal Formulation", "Quality Testing", "Decoction Boiling"],
    desc: "Pilot plant experience in decoction extraction, spray-drying, and standardized botanical dosage forms.",
  },
  {
    id: "p9",
    title: "Holistic Dietary Counselling & Patient Communication",
    by: "National Institute of Naturopathy",
    weeks: 2,
    price: 499,
    boosts: "lifestyle_counsel",
    mode: "Online",
    prerequisites: "AYUSH student or wellness practitioner",
    skillsGained: ["Lifestyle Counseling", "Nutritional Therapy", "Patient Counseling"],
    desc: "Clinical guidelines for constitutional diet planning, therapeutic fasting supervision, and lifestyle counselling.",
  },
  {
    id: "p10",
    title: "Advanced Therapeutic Body Care & Wellness Practice",
    by: "Somatheeram Academy",
    weeks: 8,
    price: 1999,
    boosts: "wellness_therapy",
    mode: "On-site, Kerala",
    prerequisites: "BAMS / BNYS student or graduate",
    skillsGained: ["Therapeutic Body Care", "Herbal Steam Protocols", "Constitution Assessment"],
    desc: "Clinical mastery of classical therapeutic body therapies, herbal steam applications, and wellness monitoring.",
  },
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

/* Institutional Department Readiness & Placement Rate */
const INSTITUTION_DEPT_METRICS = [
  { dept: "Dravyaguna (Pharmacology)", assessed: 92, placedPct: 88, avgScore: 78 },
  { dept: "Kayachikitsa (Clinical Medicine)", assessed: 140, placedPct: 94, avgScore: 84 },
  { dept: "Rasashastra (Formulations)", assessed: 85, placedPct: 82, avgScore: 75 },
  { dept: "Swasthavritta (Public Health)", assessed: 110, placedPct: 89, avgScore: 81 },
  { dept: "Panchakarma (Therapies)", assessed: 125, placedPct: 96, avgScore: 89 },
  { dept: "Samhita & Siddhanta", assessed: 70, placedPct: 76, avgScore: 72 },
];

/* Academic Semester Cohort Skill Acquisition Trend */
const SEMESTER_PROGRESSION = [
  { term: "1st Prof Year", "Foundational Science": 58, "Lab & Assays": 32, "Clinical Rotations": 24 },
  { term: "2nd Prof Year", "Foundational Science": 72, "Lab & Assays": 54, "Clinical Rotations": 42 },
  { term: "3rd Prof Year", "Foundational Science": 84, "Lab & Assays": 76, "Clinical Rotations": 68 },
  { term: "4th Prof Year", "Foundational Science": 91, "Lab & Assays": 88, "Clinical Rotations": 86 },
  { term: "Internship Year", "Foundational Science": 95, "Lab & Assays": 93, "Clinical Rotations": 94 },
];

/* Industry Hiring Market Demand Trajectory across AYUSH Sectors by Time Window */
const INDUSTRY_DEMAND_TREND_BY_RANGE = {
  "1M": [
    { m: "Week 1", "Herbal Mfg & QC": 76, "Clinical Trials": 70, "Wellness & Resorts": 66, "Tele-AYUSH": 68 },
    { m: "Week 2", "Herbal Mfg & QC": 79, "Clinical Trials": 72, "Wellness & Resorts": 68, "Tele-AYUSH": 70 },
    { m: "Week 3", "Herbal Mfg & QC": 81, "Clinical Trials": 75, "Wellness & Resorts": 70, "Tele-AYUSH": 73 },
    { m: "Week 4", "Herbal Mfg & QC": 84, "Clinical Trials": 78, "Wellness & Resorts": 71, "Tele-AYUSH": 75 },
  ],
  "3M": [
    { m: "Jul", "Herbal Mfg & QC": 63, "Clinical Trials": 52, "Wellness & Resorts": 54, "Tele-AYUSH": 49 },
    { m: "Aug", "Herbal Mfg & QC": 72, "Clinical Trials": 64, "Wellness & Resorts": 62, "Tele-AYUSH": 61 },
    { m: "Sep", "Herbal Mfg & QC": 84, "Clinical Trials": 78, "Wellness & Resorts": 71, "Tele-AYUSH": 75 },
  ],
  "6M": [
    { m: "Apr", "Herbal Mfg & QC": 42, "Clinical Trials": 28, "Wellness & Resorts": 35, "Tele-AYUSH": 22 },
    { m: "May", "Herbal Mfg & QC": 48, "Clinical Trials": 34, "Wellness & Resorts": 40, "Tele-AYUSH": 29 },
    { m: "Jun", "Herbal Mfg & QC": 55, "Clinical Trials": 41, "Wellness & Resorts": 47, "Tele-AYUSH": 38 },
    { m: "Jul", "Herbal Mfg & QC": 63, "Clinical Trials": 52, "Wellness & Resorts": 54, "Tele-AYUSH": 49 },
    { m: "Aug", "Herbal Mfg & QC": 72, "Clinical Trials": 64, "Wellness & Resorts": 62, "Tele-AYUSH": 61 },
    { m: "Sep", "Herbal Mfg & QC": 84, "Clinical Trials": 78, "Wellness & Resorts": 71, "Tele-AYUSH": 75 },
  ],
  "1Y": [
    { m: "Oct '25", "Herbal Mfg & QC": 28, "Clinical Trials": 18, "Wellness & Resorts": 24, "Tele-AYUSH": 12 },
    { m: "Dec '25", "Herbal Mfg & QC": 35, "Clinical Trials": 22, "Wellness & Resorts": 30, "Tele-AYUSH": 16 },
    { m: "Feb '26", "Herbal Mfg & QC": 40, "Clinical Trials": 26, "Wellness & Resorts": 32, "Tele-AYUSH": 20 },
    { m: "Apr '26", "Herbal Mfg & QC": 46, "Clinical Trials": 32, "Wellness & Resorts": 38, "Tele-AYUSH": 27 },
    { m: "Jun '26", "Herbal Mfg & QC": 58, "Clinical Trials": 46, "Wellness & Resorts": 50, "Tele-AYUSH": 42 },
    { m: "Aug '26", "Herbal Mfg & QC": 74, "Clinical Trials": 66, "Wellness & Resorts": 64, "Tele-AYUSH": 63 },
    { m: "Sep '26", "Herbal Mfg & QC": 84, "Clinical Trials": 78, "Wellness & Resorts": 71, "Tele-AYUSH": 75 },
  ],
};

const APPLICANTS = [
  { studentId: "AYB-2026-0142", name: "Ishit Aggarwal", college: "All India Institute of Ayurveda, New Delhi", role: "Clinical Research Intern", stream: "Ayurveda", match: 89, status: "Selected" },
  { studentId: "AYB-2026-0218", name: "Manvi Rawat", college: "National Institute of Ayurveda, Jaipur", role: "Regulatory Compliance Trainee", stream: "Ayurveda", match: 82, status: "Shortlisted" },
  { studentId: "AYB-2026-0304", name: "Naitik Sharma", college: "AIIA, New Delhi", role: "Quality Control Lab Trainee", stream: "Ayurveda", match: 78, status: "Applied" },
  { studentId: "AYB-2026-0419", name: "Shreya Paul", college: "National Institute of Homoeopathy, Kolkata", role: "Clinical Research Intern", stream: "Homoeopathy", match: 74, status: "Shortlisted" },
  { studentId: "AYB-2026-0520", name: "Viyona Menon", college: "Amrita School of Ayurveda", role: "Therapeutic Wellness Consultant", stream: "Ayurveda", match: 92, status: "Selected" },
  { studentId: "AYB-2026-0633", name: "Shaurya Dwivedi", college: "BHU Faculty of Ayurveda, Varanasi", role: "Tele-AYUSH Implementation", stream: "Ayurveda", match: 71, status: "Applied" },
  { studentId: "AYB-2026-0785", name: "Devika Pillai", college: "Govt Yoga & Naturopathy College, Chennai", role: "Corporate Wellness Associate", stream: "Yoga & Naturopathy", match: 88, status: "Selected" },
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

/* ---------------- Verified Multi-Role Persona Profiles ---------------- */

const ROLE_ACCOUNTS = {
  student: {
    studentId: "AYB-2026-0142",
    role: "student",
    roleLabel: "Student & Intern",
    name: "Ishit Aggarwal",
    email: "ishit.aggarwal@aiia.gov.in",
    avatar: null, // null = blank avatar with initials
    institution: "All India Institute of Ayurveda (AIIA), New Delhi",
    year: "4th Professional Year (BAMS)",
    bio: "AYUSH student researcher passionate about evidence-based botanical drug development, clinical trial protocol design, and modernizing traditional health data workflows.",
    specializations: ["Clinical Research", "Herbal Formulation", "Herb Quality Testing", "Digital Tele-AYUSH"],
    links: {
      linkedin: "https://linkedin.com/in/ishit-aggarwal-ayush",
      researchGate: "https://researchgate.net/profile/Ishit-Aggarwal",
      website: "https://ishit-ayush.dev",
    },
  },
  academician: {
    studentId: "AYF-2026-0048",
    role: "academician",
    roleLabel: "Faculty & Researcher",
    name: "Prof. Dr. Rajesh K. Vaidya",
    email: "rajesh.vaidya@aiia.gov.in",
    avatar: null,
    institution: "All India Institute of Ayurveda (AIIA), New Delhi",
    year: "Professor & Head, Dept. of Dravyaguna",
    bio: "Principal Investigator for national AYUSH botanical standardization trials and mentor for industry-sponsored R&D sabbaticals.",
    specializations: ["Pharmacognosy & Extraction", "Standardization & Phytochemistry", "Clinical GCP"],
    links: {
      linkedin: "https://linkedin.com/in/rajesh-vaidya-ayush",
      researchGate: "https://researchgate.net/profile/Rajesh-Vaidya",
      website: "https://aiia.gov.in/faculty/r-vaidya",
    },
  },
  industry: {
    studentId: "AYI-2026-0019",
    role: "industry",
    roleLabel: "Industry Recruiter & R&D Lead",
    name: "Dr. Vikramaditya Sen",
    email: "v.sen@dabur.com",
    avatar: null,
    institution: "Dabur Research Foundation",
    year: "Head of Traditional Healthcare R&D",
    bio: "Leading industrial formulations, GMP quality compliance, and academia-industry recruitment pipelines across AYUSH colleges in India.",
    specializations: ["Herbal Extraction", "Regulatory & GMP", "Talent Acquisition"],
    links: {
      linkedin: "https://linkedin.com/in/vikramaditya-sen-ayush",
      researchGate: "https://researchgate.net/profile/Vikramaditya-Sen",
      website: "https://dabur.com/research",
    },
  },
  institution: {
    studentId: "AYD-2026-0005",
    role: "institution",
    roleLabel: "AYUSH College Dean",
    name: "Dr. Meenakshi Sundaram",
    email: "dean.ayush@nia.edu.in",
    avatar: null,
    institution: "National Institute of Ayurveda (NIA), Jaipur",
    year: "Dean of Academic & Clinical Affairs",
    bio: "Overseeing student placement telemetry, institutional skill curriculum alignment, and clinical hospital rotations.",
    specializations: ["Curriculum Accreditation", "Clinical Telemetry", "Institutional Governance"],
    links: {
      linkedin: "https://linkedin.com/in/meenakshi-sundaram-ayush",
      researchGate: "https://researchgate.net/profile/Meenakshi-Sundaram",
      website: "https://nia.nic.in/dean",
    },
  },
};

/* ============================================================
   MAIN AYUSHBRIDGE COMPONENT
   ============================================================ */

export default function AyushBridge() {
  const [themeMode, setThemeMode] = useState("dark"); // 'dark' | 'light'
  const [role, setRole] = useState(null); // null = landing, 'student' | 'academician' | 'industry' | 'institution'
  const [tab, setTab] = useState("overview");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [activeSector, setActiveSector] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  function changeTab(t) {
    if (t === tab) return;
    setIsTabLoading(true);
    setTab(t);
    setTimeout(() => setIsTabLoading(false), 160);
  }

  // Hidden File Input References
  const photoInputRef = useRef(null);
  const vaultInputRef = useRef(null);

  // Authentication State with Stored Role on Account
  const [user, setUser] = useState(ROLE_ACCOUNTS.student);
  const [authModalRole, setAuthModalRole] = useState("student");
  const [applicantSearch, setApplicantSearch] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddCertOpen, setIsAddCertOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [isAddExpOpen, setIsAddExpOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [expressedFacultyInterest, setExpressedFacultyInterest] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedulingMentorship, setSchedulingMentorship] = useState(null);
  const [demandRange, setDemandRange] = useState("6M");
  const [viewingVaultDoc, setViewingVaultDoc] = useState(null);

  // Digital Credential Vault Documents State
  const [vaultDocs, setVaultDocs] = useState([
    { id: "d1", name: "BAMS_University_Marksheet.pdf", type: "Academic Transcript", size: "1.8 MB", date: "Aug 2026" },
    { id: "d2", name: "Hospital_Clinical_Logbook_AIIA.pdf", type: "Clinical Logbook", size: "3.4 MB", date: "Jul 2026" },
    { id: "d3", name: "CCRAS_Research_Protocol_Draft.pdf", type: "Research Preprint", size: "840 KB", date: "May 2026" },
  ]);

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

  // Student Sent Mentorship Requests State
  const [studentMentorships, setStudentMentorships] = useState([
    { id: "sm1", faculty: "Dr. A. Nair", dept: "Dept. of Clinical Studies, AIIA", topic: "Guidance on clinical research trial protocol design", status: "Accepted", on: "2 days ago" },
    { id: "sm2", faculty: "Dr. V. K. Joshi", dept: "Herbal Drug Standardization, CCRAS", topic: "Quality Control lab testing internship preparation", status: "Pending", on: "Yesterday" },
  ]);

  // Faculty Incoming Mentorship Requests State
  const [facultyRequests, setFacultyRequests] = useState([
    { id: "fm1", student: "Naitik Sharma", college: "AIIA, New Delhi", topic: "Guidance on Quality Control lab testing internship application", status: "Pending", on: "Today" },
    { id: "fm2", student: "Shreya Paul", college: "National Institute of Homoeopathy, Kolkata", topic: "Research methodology and trial protocol design", status: "Pending", on: "Yesterday" },
    { id: "fm3", student: "Viyona Menon", college: "Amrita School of Ayurveda", topic: "Therapeutic wellness clinical documentation review", status: "Accepted", on: "3 days ago" },
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

  // Bookmarks / Saved Opportunities State
  const [savedJobs, setSavedJobs] = useState(["o1", "o3"]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Notifications State & Dropdown
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: "n1", icon: "🎓", title: "Mentorship Accepted", desc: "Dr. A. Nair accepted your Clinical Research protocol guidance request.", time: "2h ago", unread: true },
    { id: "n2", icon: "⭐", title: "Application Shortlisted!", desc: "Himalaya Wellness shortlisted your profile for Regulatory Compliance Trainee.", time: "1d ago", unread: true },
    { id: "n3", icon: "🌿", title: "New Matching Internship", desc: "CCRAS Trial Associate posted with 89% match to your verified skills.", time: "2d ago", unread: false },
    { id: "n4", icon: "📜", title: "Credential Verified", desc: "CCRAS GCP Certificate verified: +15% boost added to Clinical Research.", time: "3d ago", unread: false },
  ]);

  // Sector Filter Dragging Refs
  const sectorScrollRef = useRef(null);
  const isDraggingSector = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Deadline Urgency Helper
  function getDeadlineUrgency(closesStr) {
    if (!closesStr) return { text: "Open", isUrgent: false };
    if (closesStr.includes("28 Sep")) return { text: "⏳ Closes in 2 days", isUrgent: true };
    if (closesStr.includes("05 Oct") || closesStr.includes("10 Oct")) return { text: "⏳ Closes in 6 days", isUrgent: true };
    if (closesStr.includes("12 Oct") || closesStr.includes("15 Oct")) return { text: "⏳ Closes in 9 days", isUrgent: false };
    if (closesStr.includes("16 Oct") || closesStr.includes("18 Oct") || closesStr.includes("20 Oct")) return { text: "⏳ Closes in 12 days", isUrgent: false };
    if (closesStr.includes("22 Oct") || closesStr.includes("24 Oct") || closesStr.includes("25 Oct")) return { text: "⏳ Closes in 16 days", isUrgent: false };
    if (closesStr.includes("30 Oct") || closesStr.includes("05 Nov")) return { text: "⏳ Closes in 22 days", isUrgent: false };
    return { text: `⏳ Closes ${closesStr}`, isUrgent: false };
  }

  const [form, setForm] = useState({
    title: "",
    org: "Himalaya Wellness Company",
    domain: "herbal_mfg",
    type: "Internship",
    loc: "Bengaluru, Karnataka",
    pay: "₹2.40 LPA",
    workMode: "On-site",
    physicalInterview: "Yes",
    interviewRounds: "2 Rounds",
    skills: [],
  });

  const T = THEMES[themeMode];

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }

  // Handle Photo Upload via file input
  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image file size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setUser((prev) => ({ ...prev, avatar: uploadEvent.target?.result }));
        showToast("Profile photo updated successfully! 📷");
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle Document Upload into Credential Vault
  function handleVaultUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      const newDoc = {
        id: "d" + Date.now(),
        name: file.name,
        type: file.type.includes("pdf") ? "PDF Document" : "Certificate File",
        size: sizeStr,
        date: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      };
      setVaultDocs((prev) => [newDoc, ...prev]);
      showToast(`Uploaded "${file.name}" to Digital Vault! 📄`);
    }
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
    if (showSavedOnly) {
      list = list.filter((o) => savedJobs.includes(o.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((o) =>
        o.title.toLowerCase().includes(q) ||
        o.org.toLowerCase().includes(q) ||
        o.loc.toLowerCase().includes(q) ||
        o.about.toLowerCase().includes(q) ||
        (o.qualifications && o.qualifications.toLowerCase().includes(q)) ||
        (o.preferredSkills && o.preferredSkills.toLowerCase().includes(q)) ||
        Object.keys(o.requires || {}).some((k) => skillLabel(k).toLowerCase().includes(q))
      );
    }
    if (!profile) {
      return list.map((o) => ({ ...o, pct: null, gaps: [] }));
    }
    return list.map((o) => ({ ...o, ...scoreAgainst(profile, o.requires, certifications) })).sort((a, b) => (b.pct || 0) - (a.pct || 0));
  }, [profile, posted, activeSector, searchQuery, certifications, showSavedOnly, savedJobs]);

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

  const filteredApplicants = useMemo(() => {
    if (!applicantSearch.trim()) return [...APPLICANTS].sort((a, b) => b.match - a.match);
    const q = applicantSearch.toLowerCase().trim();
    return [...APPLICANTS]
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.studentId && a.studentId.toLowerCase().includes(q)) ||
          a.college.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          a.stream.toLowerCase().includes(q) ||
          a.status.toLowerCase().includes(q)
      )
      .sort((a, b) => b.match - a.match);
  }, [applicantSearch]);

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
      if (!user) {
        setIsAuthModalOpen(true);
        showToast("Assessment complete! Sign in with Google to permanently link & verify your scores.");
      } else {
        showToast("Assessment complete! Verified skill scores & readiness updated.");
      }
      changeTab("overview");
    }
  }

  const applied = (id) => apps.some((a) => a.oppId === id);
  const apply = (id) => {
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in with Google to submit internship applications.");
      return;
    }
    if (applied(id)) return;
    setApps((a) => [...a, { oppId: id, status: "Applied", on: "Today" }]);
    showToast("Application submitted successfully!");
  };

  const enroll = (p) => {
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in with Google to enroll in certified learning programs.");
      return;
    }
    if (enrolled.includes(p.id)) return;
    setEnrolled((e) => [...e, p.id]);
    showToast(`Enrolled in ${p.title}!`);
  };

  const expressFacultyInterest = (f) => {
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in to register faculty interest in research opportunities.");
      return;
    }
    if (expressedFacultyInterest.includes(f.id)) return;
    setExpressedFacultyInterest((prev) => [...prev, f.id]);
    showToast(`Interest registered for "${f.title}"!`);
  };

  const requestMentorship = (facultyName, topic) => {
    if (!user) {
      setIsAuthModalOpen(true);
      showToast("Please sign in with Google to request mentorship from AYUSH faculty.");
      return;
    }
    const newReq = {
      id: "sm" + Date.now(),
      faculty: facultyName || "Dr. S. K. Sharma",
      dept: "Dept. of Dravyaguna & Research, AIIA",
      topic: topic || "AYUSH clinical trial protocol drafting and review",
      status: "Pending",
      on: "Just now",
    };
    setStudentMentorships((prev) => [newReq, ...prev]);
    showToast(`Mentorship request sent to ${facultyName || "Dr. S. K. Sharma"}!`);
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
      primary: {
        background: T.teal,
        color: themeMode === "dark" ? "#07120E" : "#FFFFFF",
        border: `1px solid ${T.teal}`,
        boxShadow: themeMode === "dark" ? "0 2px 10px rgba(45, 212, 191, 0.22)" : "0 2px 8px rgba(18, 160, 130, 0.20)",
      },
      accent: {
        background: T.terra,
        color: themeMode === "dark" ? "#120803" : "#FFFFFF",
        border: `1px solid ${T.terra}`,
        boxShadow: "0 2px 8px rgba(224, 112, 80, 0.20)",
      },
      ghost: {
        background: "transparent",
        color: T.ink,
        border: `1px solid ${T.border}`,
        boxShadow: "none",
      },
    }[variant];

    return (
      <button
        className="ay-btn"
        onClick={onClick}
        disabled={disabled}
        style={{
          ...styles,
          padding: small ? "7px 14px" : "11px 22px",
          minHeight: small ? 34 : 44,
          boxSizing: "border-box",
          borderRadius: 10,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "var(--ui)",
          fontSize: small ? 13 : 14.5,
          fontWeight: 600,
          lineHeight: 1.2,
          opacity: disabled ? 0.45 : 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          transition: "all .16s ease",
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

  const SkeletonCard = () => (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 110, height: 22, borderRadius: 999, background: T.bgSurfaceHover, opacity: 0.8 }} />
        <div style={{ width: 80, height: 22, borderRadius: 999, background: T.bgSurfaceHover, opacity: 0.8 }} />
      </div>
      <div style={{ width: "55%", height: 26, borderRadius: 8, background: T.bgSurfaceHover, opacity: 0.8 }} />
      <div style={{ width: "35%", height: 16, borderRadius: 6, background: T.bgSurfaceHover, opacity: 0.6 }} />
      <div style={{ width: "90%", height: 14, borderRadius: 6, background: T.bgSurfaceHover, opacity: 0.5 }} />
      <div style={{ width: "75%", height: 14, borderRadius: 6, background: T.bgSurfaceHover, opacity: 0.5 }} />
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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.muted, fontWeight: 550 }}>Role Readiness Index</span>
        <span style={{
          fontFamily: "var(--display)",
          fontSize: compact ? 22 : 32,
          fontWeight: 700,
          color: pct >= 80 ? T.sage : pct >= 60 ? T.teal : T.terra,
          letterSpacing: "-.02em",
        }}>
          {pct}%
        </span>
      </div>

      {/* Designed Progress Bar with Depth & Luminous Gradient */}
      <div style={{
        position: "relative",
        height: 10,
        background: themeMode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        borderRadius: 999,
        overflow: "hidden",
        boxShadow: "inset 0 1.5px 3px rgba(0,0,0,0.22)",
        border: `1px solid ${T.borderSubtle || T.border}`,
      }}>
        <div
          className="ay-fill"
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            borderRadius: 999,
            background: pct >= 80
              ? `linear-gradient(90deg, ${T.teal} 0%, #10B981 60%, ${T.sage} 100%)`
              : pct >= 60
              ? `linear-gradient(90deg, ${T.terra} 0%, ${T.teal} 100%)`
              : `linear-gradient(90deg, #EF4444 0%, ${T.terra} 100%)`,
            boxShadow: pct >= 80 ? "0 0 12px rgba(16, 185, 129, 0.45)" : "none",
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>

      {/* Benchmark Tick Mark */}
      <div style={{ position: "relative", height: 16, marginTop: 4 }}>
        <div style={{ position: "absolute", left: "80%", top: 0, transform: "translateX(-50%)", textAlign: "center" }}>
          <div style={{ width: 1.5, height: 6, background: T.muted, margin: "0 auto", borderRadius: 1 }} />
          <div style={{ fontFamily: "var(--ui)", fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: "nowrap", marginTop: 1 }}>
            80% benchmark
          </div>
        </div>
      </div>

      {gaps && gaps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, fontWeight: 550, marginBottom: 7 }}>
            Key competencies to bridge:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {gaps.slice(0, 3).map((g) => (
              <span
                key={g.skill}
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: T.terra,
                  background: T.terraSoft,
                  border: `1px solid ${T.terra}35`,
                  padding: "3px 9px",
                  borderRadius: 6,
                }}
              >
                {skillShort(g.skill)} · +{g.short} pts
              </span>
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

  /* --- User Profile Avatar Component (Initials or Uploaded Photo) --- */
  const UserAvatar = ({ size = 32, userObj }) => {
    const u = userObj || user;
    const initials = u?.name
      ? u.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
      : "AY";

    if (u?.avatar) {
      return (
        <img
          src={u.avatar}
          alt={u.name}
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            objectFit: "cover",
            border: `1.5px solid ${T.teal}`,
          }}
        />
      );
    }

    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: `linear-gradient(135deg, ${T.teal}, ${T.sage})`,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--ui)",
        fontSize: size * 0.4,
        fontWeight: 700,
        letterSpacing: "0.02em",
        border: `1.5px solid ${T.teal}`,
        flexShrink: 0,
      }}>
        {initials}
      </div>
    );
  };

  /* --- User Profile / Google Sign-In Header Widget --- */
  const UserAuthWidget = () => (
    user ? (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => {
            const destRole = user.role || "student";
            setRole(destRole);
            setTab("overview");
          }}
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
          <UserAvatar size={26} />
          <span>{user.name.split(" ")[0]}</span>
          <span style={{
            fontSize: 10.5,
            padding: "2px 7px",
            borderRadius: 999,
            background: T.tealSoft,
            color: T.teal,
            fontWeight: 700,
            textTransform: "capitalize",
          }}>
            {user.role === "academician" ? "Faculty" : user.role || "Student"}
          </span>
        </button>

        <button
          onClick={() => {
            setAuthModalRole(user.role || "student");
            setIsAuthModalOpen(true);
          }}
          title="Switch Account Role"
          style={{
            background: "none",
            border: `1px solid ${T.border}`,
            color: T.muted,
            cursor: "pointer",
            fontSize: 11.5,
            fontFamily: "var(--ui)",
            padding: "4px 8px",
            borderRadius: 6,
            fontWeight: 550,
          }}
        >
          Switch Role
        </button>

        <button
          onClick={() => {
            setUser(null);
            setRole(null);
            showToast("Signed out of Google account");
          }}
          title="Sign Out"
          style={{
            background: "none",
            border: "none",
            color: T.terra,
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
        onClick={() => {
          setAuthModalRole("student");
          setIsAuthModalOpen(true);
        }}
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

  /* --- Global Toast Notification Banner Atom --- */
  const ToastBanner = ({ msg, onClose }) => {
    if (!msg) return null;
    return (
      <div
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          background: T.bgCard,
          border: `1.5px solid ${T.teal}`,
          color: T.ink,
          padding: "12px 18px",
          borderRadius: 12,
          boxShadow: "0 14px 36px -6px rgba(0,0,0,0.45)",
          fontFamily: "var(--ui)",
          fontSize: 13.5,
          fontWeight: 600,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          gap: 10,
          animation: "fadeIn .18s ease",
          backdropFilter: "blur(10px)",
          maxWidth: 440,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: T.tealSoft,
            color: T.teal,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          ✓
        </div>
        <span style={{ lineHeight: 1.4, flex: 1 }}>{msg}</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: T.muted,
            cursor: "pointer",
            padding: "0 0 0 6px",
            fontSize: 14,
          }}
        >
          ✕
        </button>
      </div>
    );
  };

  /* ============================================================
     1. LANDING PAGE VIEW
     ============================================================ */

  if (!role) {
    const sampleRole = ROLES[0];
    const sample = scoreAgainst(SAMPLE_PROFILE, sampleRole.requires, certifications);

    return (
      <Shell T={T}>
        <ToastBanner msg={toastMessage} onClose={() => setToastMessage(null)} />
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
                fontSize: "clamp(34px, 5vw, 54px)",
                lineHeight: 1.1,
                letterSpacing: "-.025em",
                color: T.ink,
                margin: "14px 0 0",
                fontWeight: 700,
              }}>
                Connecting AYUSH students and faculty with<br />
                <span style={{ color: T.sage }}>leading herbal and healthcare industries.</span>
              </h1>

              <Muted style={{ fontSize: 16.5, marginTop: 18, maxWidth: 540, lineHeight: 1.65 }}>
                AyushBridge measures your hands-on competencies in herbal formulation, quality testing, wellness protocols, and clinical research — directly matching you to verified internships, industry R&D grants, and placement pipelines across India.
              </Muted>

              <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap", alignItems: "center" }}>
                <Btn onClick={() => { setRole("student"); setTab("assessment"); }}>
                  Take AYUSH Skill Assessment →
                </Btn>
                <Btn variant="ghost" onClick={() => { setRole("student"); setProfile(SAMPLE_PROFILE); setTab("overview"); }}>
                  Open Sample Student Profile
                </Btn>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 32, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, fontWeight: 600 }}>Active Partners:</span>
                {["Dabur Research", "Himalaya Wellness", "Patanjali Labs", "AIIA New Delhi", "CCRAS", "Kottakkal", "Organic India"].map((c) => (
                  <span key={c} style={{
                    fontSize: 11.5,
                    fontFamily: "var(--ui)",
                    fontWeight: 500,
                    color: T.inkSoft,
                    background: T.bgSurface,
                    padding: "3px 9px",
                    borderRadius: 6,
                    border: `1px solid ${T.borderSubtle || T.border}`,
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ flex: "1 1 370px", minWidth: 290 }}>
              <div
                style={{
                  padding: 26,
                  background: themeMode === "dark"
                    ? "linear-gradient(155deg, rgba(16, 36, 30, 0.85) 0%, rgba(10, 22, 18, 0.95) 100%)"
                    : "linear-gradient(155deg, #FFFFFF 0%, #FAF7F2 100%)",
                  border: `1.5px solid ${themeMode === "dark" ? "rgba(45, 212, 191, 0.28)" : "rgba(18, 33, 30, 0.10)"}`,
                  borderRadius: 20,
                  boxShadow: themeMode === "dark"
                    ? "0 24px 48px -12px rgba(0,0,0,0.75), 0 0 35px -8px rgba(45, 212, 191, 0.14)"
                    : "0 20px 40px -12px rgba(18, 33, 30, 0.08), 0 2px 6px rgba(18, 33, 30, 0.04)",
                  backdropFilter: "blur(12px)",
                  position: "relative",
                }}
              >
                {/* Top Meta Bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    fontFamily: "var(--ui)",
                    fontWeight: 650,
                    color: T.teal,
                    background: T.tealSoft,
                    padding: "3px 10px",
                    borderRadius: 999,
                    border: `1px solid ${T.teal}40`,
                    letterSpacing: "0.02em",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.teal, display: "inline-block", boxShadow: `0 0 6px ${T.teal}` }} />
                    Live Match Engine
                  </span>

                  <span style={{
                    fontSize: 11.5,
                    fontFamily: "var(--ui)",
                    color: T.sage,
                    background: T.sageSoft,
                    padding: "3px 9px",
                    borderRadius: 6,
                    fontWeight: 650,
                    border: `1px solid ${T.sage}35`,
                  }}>
                    ✓ Verified Criteria
                  </span>
                </div>

                <h3 style={{ fontFamily: "var(--display)", fontSize: 21, fontWeight: 600, color: T.ink, margin: "4px 0 0", lineHeight: 1.3 }}>
                  {sampleRole.title}
                </h3>
                <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.teal, fontWeight: 550, marginTop: 4, marginBottom: 20 }}>
                  {sampleRole.sector}
                </div>

                <ReadinessMeter pct={sample.pct} gaps={sample.gaps} />

                <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${T.borderSubtle || T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🎯</span>
                  <p style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.5 }}>
                    Benchmarked from 10 concrete assessment items against live criteria set by accredited AYUSH employers.
                  </p>
                </div>
              </div>
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
                  onClick={() => {
                    const account = ROLE_ACCOUNTS[r.id] || ROLE_ACCOUNTS.student;
                    setUser(account);
                    setRole(r.id);
                    setTab("overview");
                    showToast(`Logged into ${r.t} Workspace (${account.name}) ✓`);
                  }}
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
      {/* Hidden Global File Inputs for Photo and Vault Uploads */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={vaultInputRef}
        onChange={handleVaultUpload}
        accept=".pdf,.doc,.docx,.png,.jpg"
        style={{ display: "none" }}
      />

      {/* Toast Notification Banner */}
      <ToastBanner msg={toastMessage} onClose={() => setToastMessage(null)} />

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

            {/* Active Verified Role Banner */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: T.bgSurface,
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontSize: 15 }}>
                {role === "student" ? "🎓" : role === "academician" ? "🔬" : role === "industry" ? "🌿" : "📊"}
              </span>
              <span style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700, color: T.ink }}>
                {role === "student"
                  ? "Student Workspace"
                  : role === "academician"
                  ? "Faculty & Research Portal"
                  : role === "industry"
                  ? "Industry & Recruiter Hub"
                  : "Institutional Dean Telemetry"}
              </span>
              <span style={{
                fontSize: 11,
                fontFamily: "var(--ui)",
                color: T.teal,
                fontWeight: 650,
                background: T.tealSoft,
                padding: "2px 8px",
                borderRadius: 999,
                border: `1px solid ${T.teal}35`,
              }}>
                Verified ✓
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Notification Bell Widget with Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  title="Notifications & Alerts"
                  style={{
                    background: T.bgSurface,
                    border: `1px solid ${T.border}`,
                    color: T.ink,
                    borderRadius: 10,
                    width: 38,
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                    fontSize: 16,
                  }}
                >
                  <span>🔔</span>
                  {notifications.filter((n) => n.unread).length > 0 && (
                    <span style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      background: T.terra,
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 750,
                      width: 17,
                      height: 17,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${T.bgCard}`,
                    }}>
                      {notifications.filter((n) => n.unread).length}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div style={{
                    position: "absolute",
                    top: 46,
                    right: 0,
                    width: 320,
                    background: T.bgCard,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    boxShadow: "0 14px 40px rgba(0,0,0,0.22)",
                    zIndex: 50,
                    padding: "14px 16px",
                    animation: "fadeIn .15s ease",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                      <span style={{ fontFamily: "var(--display)", fontSize: 15, fontWeight: 650, color: T.ink }}>
                        Notifications ({notifications.filter((n) => n.unread).length} new)
                      </span>
                      <button
                        onClick={() => {
                          setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                          showToast("All notifications marked as read ✓");
                        }}
                        style={{ background: "none", border: "none", color: T.teal, fontSize: 11.5, cursor: "pointer", fontWeight: 600, padding: 0 }}
                      >
                        Mark all read
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, unread: false } : x));
                            setIsNotifOpen(false);
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            background: n.unread ? T.tealSoft : T.bgSurface,
                            border: `1px solid ${n.unread ? T.teal : T.border}`,
                            cursor: "pointer",
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{n.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: n.unread ? 650 : 550, color: T.ink }}>
                              {n.title}
                            </div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>
                              {n.desc}
                            </div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 11, color: T.teal, marginTop: 4, fontWeight: 500 }}>
                              {n.time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <ThemeToggle />
              <UserAuthWidget />
              <Btn small variant="ghost" onClick={() => setRole(null)}>Exit to Home</Btn>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 2 }}>
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
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
        {isTabLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <>

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
                <Btn onClick={() => changeTab("assessment")}>Start 10-Question Assessment →</Btn>
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
                  <Btn small variant="ghost" onClick={() => changeTab("portfolio")}>Edit Profile & Credentials</Btn>
                  <Btn small variant="ghost" onClick={() => changeTab("assessment")}>Retake Assessment</Btn>
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
                <Btn onClick={() => changeTab("overview")}>View My Profile & Matches →</Btn>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <H size={28}>AYUSH Internships, Apprenticeships & Jobs</H>
                <Muted style={{ marginTop: 4, marginBottom: 18 }}>
                  {profile
                    ? "Ranked by how closely your measured competencies meet employer requirements."
                    : "Complete the assessment to see your exact percentage readiness against each posting."}
                </Muted>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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

                <button
                  onClick={() => setShowSavedOnly(!showSavedOnly)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 10,
                    border: `1px solid ${showSavedOnly ? T.teal : T.border}`,
                    background: showSavedOnly ? T.tealSoft : T.bgCard,
                    color: showSavedOnly ? T.teal : T.muted,
                    fontSize: 13,
                    fontWeight: 650,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all .15s ease",
                  }}
                >
                  <span>{showSavedOnly ? "🔖" : "📑"}</span>
                  <span>Saved ({savedJobs.length})</span>
                </button>
              </div>
            </div>

            {/* Swipeable / Draggable Sector Filter Bar with Hidden Scrollbar */}
            <div
              ref={sectorScrollRef}
              className="ay-no-scroll"
              onMouseDown={(e) => {
                isDraggingSector.current = true;
                startXRef.current = e.pageX - sectorScrollRef.current.offsetLeft;
                scrollLeftRef.current = sectorScrollRef.current.scrollLeft;
              }}
              onMouseLeave={() => { isDraggingSector.current = false; }}
              onMouseUp={() => { isDraggingSector.current = false; }}
              onMouseMove={(e) => {
                if (!isDraggingSector.current) return;
                e.preventDefault();
                const x = e.pageX - sectorScrollRef.current.offsetLeft;
                const walk = (x - startXRef.current) * 1.5;
                sectorScrollRef.current.scrollLeft = scrollLeftRef.current - walk;
              }}
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 14,
                marginBottom: 12,
                cursor: "grab",
                userSelect: "none",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
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

            {/* Opportunities List or Consistent Clean Empty State */}
            {filteredOpps.length === 0 ? (
              <Card style={{ padding: 36, textAlign: "center", maxWidth: 580, margin: "20px auto" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <H size={22}>No Opportunities Found</H>
                <Muted style={{ marginTop: 6, marginBottom: 20 }}>
                  {showSavedOnly
                    ? "You haven't bookmarked any opportunities yet. Click the bookmark icon on any job card to save it for quick review."
                    : `No postings match your current filter (${searchQuery || "selected sector"}). Try searching different terms.`}
                </Muted>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Btn
                    small
                    variant="primary"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveSector("all");
                      setShowSavedOnly(false);
                    }}
                  >
                    Reset Filters & Show All Opportunities
                  </Btn>
                </div>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredOpps.map((o) => (
                  <Card key={o.id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "space-between" }}>
                      <div style={{ flex: "1 1 500px", minWidth: 280 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <Chip tone="accent">{o.type}</Chip>
                          <Chip>{o.workMode || "On-site"}</Chip>
                          <Chip>{o.loc}</Chip>
                          <span style={{
                            fontSize: 12,
                            color: getDeadlineUrgency(o.closes).isUrgent ? T.terra : T.muted,
                            fontWeight: getDeadlineUrgency(o.closes).isUrgent ? 700 : 550,
                            background: getDeadlineUrgency(o.closes).isUrgent ? T.terraSoft : "transparent",
                            padding: getDeadlineUrgency(o.closes).isUrgent ? "2px 8px" : 0,
                            borderRadius: 6,
                          }}>
                            {getDeadlineUrgency(o.closes).text}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
                          <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 600, color: T.ink }}>
                            {o.title}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (savedJobs.includes(o.id)) {
                                setSavedJobs((prev) => prev.filter((id) => id !== o.id));
                                showToast(`Removed from saved bookmarks`);
                              } else {
                                setSavedJobs((prev) => [...prev, o.id]);
                                showToast(`Saved "${o.title}" to bookmarks 🔖`);
                              }
                            }}
                            style={{
                              background: savedJobs.includes(o.id) ? T.tealSoft : "transparent",
                              border: `1px solid ${savedJobs.includes(o.id) ? T.teal : T.border}`,
                              color: savedJobs.includes(o.id) ? T.teal : T.muted,
                              borderRadius: 8,
                              padding: "4px 9px",
                              fontSize: 12,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                            title={savedJobs.includes(o.id) ? "Remove from bookmarks" : "Save for later"}
                          >
                            <span>{savedJobs.includes(o.id) ? "🔖" : "📑"}</span>
                            <span>{savedJobs.includes(o.id) ? "Saved" : "Save"}</span>
                          </button>
                        </div>
                        <div style={{ fontFamily: "var(--ui)", fontSize: 14, marginTop: 3, fontWeight: 600, color: T.teal }}>
                          {o.org} · <span style={{ color: T.terra, fontWeight: 700 }}>{o.pay}</span>
                        </div>

                        <Muted style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{o.about}</Muted>

                        {/* Required Skills Chips */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                          {Object.entries(o.requires).map(([k, need]) => {
                            const certBonus = certifications.filter((c) => c.boostSkill === k && c.verified).reduce((sum, c) => sum + (c.boostAmount || 8), 0);
                            const rawHave = profile ? (profile[k] ?? 20) : null;
                            const finalHave = rawHave !== null ? Math.min(100, rawHave + certBonus) : null;
                            return (
                              <Chip key={k} tone={finalHave === null ? "neutral" : finalHave >= need ? "good" : "gap"}>
                                {skillShort(k)}: {need}%
                              </Chip>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ flex: "0 0 240px", minWidth: 220 }}>
                        {o.pct !== null ? (
                          <ReadinessMeter pct={o.pct} gaps={o.gaps} compact />
                        ) : (
                          <div style={{ padding: 12, background: T.bgSurface, borderRadius: 10, fontSize: 12.5, color: T.muted, textAlign: "center" }}>
                            Take 10-Q Assessment to see candidate match %
                          </div>
                        )}

                        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                          <Btn
                            small
                            disabled={applied(o.id)}
                            onClick={() => apply(o.id)}
                            variant={applied(o.id) ? "ghost" : "primary"}
                            style={{ flex: 1, justifyContent: "center" }}
                          >
                            {applied(o.id) ? "Applied ✓" : !user ? "Sign in to Apply" : "Apply Now"}
                          </Btn>
                          <Btn
                            small
                            variant="ghost"
                            onClick={() => setOpenOpp(openOpp === o.id ? null : o.id)}
                          >
                            {openOpp === o.id ? "Hide Details" : "View Breakdown"}
                          </Btn>
                        </div>
                      </div>
                    </div>

                  {/* Expanded Detailed Breakdown Section */}
                  {openOpp === o.id && (
                    <div style={{
                      marginTop: 8,
                      padding: 18,
                      background: T.bgSurface,
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                      fontFamily: "var(--ui)",
                      fontSize: 13.5,
                      color: T.ink,
                      lineHeight: 1.6,
                      animation: "fadeIn .2s ease",
                    }}>
                      <div className="ay-2col" style={{ display: "grid", gap: 20 }}>
                        {/* Left: Skill Breakdown & Assessment Mapping */}
                        <div>
                          <div style={{ fontWeight: 650, color: T.teal, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>📊</span> Candidate Skill Breakdown vs Hiring Thresholds
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                            {Object.entries(o.requires).map(([k, need]) => {
                              const certBonus = certifications.filter((c) => c.boostSkill === k && c.verified).reduce((sum, c) => sum + (c.boostAmount || 8), 0);
                              const rawScore = profile ? (profile[k] ?? 20) : 20;
                              const userScore = Math.min(100, rawScore + certBonus);
                              const isMet = userScore >= need;
                              return (
                                <div key={k} style={{ background: T.bgCard, padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}` }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{skillLabel(k)}</span>
                                    <span style={{
                                      fontSize: 12,
                                      fontWeight: 650,
                                      color: isMet ? T.sage : T.terra,
                                    }}>
                                      {userScore}% / {need}% required {isMet ? "✓ Met" : `(${need - userScore}% gap)`}
                                    </span>
                                  </div>
                                  <div style={{ height: 6, background: T.bgSurface, borderRadius: 999, overflow: "hidden" }}>
                                    <div style={{
                                      width: `${userScore}%`,
                                      height: "100%",
                                      background: isMet ? T.sage : T.terra,
                                      borderRadius: 999,
                                    }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {!profile && (
                            <div style={{ marginTop: 12, padding: "8px 12px", background: T.tealSoft, borderRadius: 8, fontSize: 12, color: T.ink }}>
                              💡 <strong>Note:</strong> Complete the 10-Question Skill Assessment to calibrate your live assessment percentages against this role.
                            </div>
                          )}
                        </div>

                        {/* Right: Role Details, Logistics & Interview Flow */}
                        <div>
                          <div style={{ fontWeight: 650, color: T.teal, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>📋</span> Role Scope & Interview Logistics
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                            <div>
                              <strong style={{ color: T.ink }}>Required Qualifications:</strong>
                              <div style={{ color: T.muted }}>{o.qualifications || "BAMS / BHMS / BNYS / B.Pharm Ayurveda"}</div>
                            </div>

                            <div>
                              <strong style={{ color: T.ink }}>Key Preferred Skills:</strong>
                              <div style={{ color: T.muted }}>{o.preferredSkills || "GCP, Case Documentation, Pharmacopoeial Assays"}</div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4, background: T.bgCard, padding: 10, borderRadius: 8, border: `1px solid ${T.border}` }}>
                              <div>
                                <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 600 }}>Physical Interview</div>
                                <div style={{ fontWeight: 600, color: T.ink, marginTop: 2 }}>{o.physicalInterview || "No (Virtual)"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 600 }}>Interview Rounds</div>
                                <div style={{ fontWeight: 600, color: T.ink, marginTop: 2 }}>{o.interviewRounds || "2 Rounds"}</div>
                              </div>
                            </div>

                            {o.responsibilities && (
                              <div style={{ marginTop: 6 }}>
                                <strong style={{ color: T.ink }}>Primary Responsibilities:</strong>
                                <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: T.muted, fontSize: 12.5 }}>
                                  {o.responsibilities.map((r, idx) => (
                                    <li key={idx} style={{ marginBottom: 2 }}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
            )}
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
                <Card key={p.id} style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Chip tone="accent">Boosts {skillShort(p.boosts)}</Chip>
                      <span style={{
                        fontFamily: "var(--ui)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: p.price === 0 ? T.sage : T.terra,
                        background: p.price === 0 ? T.sageSoft : T.terraSoft,
                        padding: "3px 8px",
                        borderRadius: 6,
                      }}>
                        {p.price === 0 ? "Free" : `₹${p.price.toLocaleString("en-IN")}`}
                      </span>
                    </div>

                    <div style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.3, marginTop: 4 }}>
                      {p.title}
                    </div>
                    <Muted style={{ fontSize: 12.5, marginTop: 4, fontWeight: 550, color: T.teal }}>
                      {p.by} · {p.weeks} weeks · {p.mode}
                    </Muted>

                    <Muted style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                      {p.desc}
                    </Muted>

                    {/* Prerequisites */}
                    <div style={{ marginTop: 12, fontSize: 12.5, color: T.muted }}>
                      <strong style={{ color: T.ink }}>Prerequisite:</strong> {p.prerequisites}
                    </div>

                    {/* Skills Gained */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: T.ink, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        Skills Gained:
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {p.skillsGained.map((sg) => (
                          <span
                            key={sg}
                            style={{
                              background: T.bgSurface,
                              border: `1px solid ${T.border}`,
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              color: T.ink,
                              fontWeight: 500,
                            }}
                          >
                            ✓ {sg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                    <Btn
                      small
                      variant={enrolled.includes(p.id) ? "ghost" : "accent"}
                      disabled={enrolled.includes(p.id)}
                      onClick={() => enroll(p)}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      {enrolled.includes(p.id)
                        ? "Enrolled ✓"
                        : !user
                        ? "Sign in to Enroll"
                        : p.price === 0
                        ? "Enroll Free"
                        : `Enroll — ₹${p.price.toLocaleString("en-IN")}`}
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* --- APPLICATIONS TAB --- */}
        {role === "student" && tab === "applications" && (
          !user ? (
            <Card style={{ maxWidth: 640, padding: 36, textAlign: "center", margin: "20px auto" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <H size={24}>Sign in to View Applications & Mentorship</H>
              <Muted style={{ marginTop: 8, marginBottom: 24, lineHeight: 1.6 }}>
                Sign in with your Google account to submit applications, track review stages, and manage your mentorship sessions with AYUSH faculty.
              </Muted>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Btn onClick={() => setIsAuthModalOpen(true)}>
                  Sign in with Google →
                </Btn>
              </div>
            </Card>
          ) : (
            <div>
              <H size={28}>My Applications & Mentorship</H>
              <Muted style={{ marginTop: 4, marginBottom: 20 }}>
                Track the progress of your AYUSH industry internship applications and faculty mentorship requests.
              </Muted>

              {apps.length === 0 ? (
                <Card style={{ maxWidth: 580, padding: 30, marginBottom: 24 }}>
                  <H size={22}>No Applications Yet</H>
                  <Muted style={{ marginTop: 8, marginBottom: 20 }}>
                    Explore verified opportunities across herbal manufacturing, clinical research, wellness, and tele-AYUSH.
                  </Muted>
                  <Btn onClick={() => changeTab("opportunities")}>Browse Opportunities</Btn>
                </Card>
              ) : (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 12 }}>
                    Submitted Applications ({apps.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                            <Muted style={{ fontSize: 13, marginTop: 2 }}>{o.org} · {o.pay} · Applied on {a.on}</Muted>
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
                </div>
              )}

              {/* Student's Sent Mentorship Requests Section */}
              <Card style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <Eyebrow>Faculty Mentorship Tracking</Eyebrow>
                    <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, color: T.ink, marginTop: 4 }}>
                      My Mentorship Requests
                    </div>
                  </div>
                  <Btn small variant="ghost" onClick={() => requestMentorship("Dr. S. K. Sharma (AIIA)", "Clinical trial protocol drafting")}>
                    + Request Faculty Mentorship
                  </Btn>
                </div>
                <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>
                  Track the status of your research and clinical mentorship requests sent to senior AYUSH faculty.
                </Muted>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {studentMentorships.length === 0 ? (
                    <Muted style={{ fontStyle: "italic" }}>No active mentorship requests. Explore faculty profiles to request guidance.</Muted>
                  ) : (
                    studentMentorships.map((sm) => (
                      <div
                        key={sm.id}
                        style={{
                          background: T.bgSurface,
                          border: `1px solid ${T.border}`,
                          borderRadius: 12,
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: "var(--ui)", fontSize: 14.5, fontWeight: 650, color: T.ink }}>
                              {sm.faculty}
                            </span>
                            <span style={{ fontSize: 12, color: T.muted }}>· {sm.dept}</span>
                          </div>
                          <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.inkSoft, marginTop: 3 }}>
                            Topic: {sm.topic}
                          </div>
                          <div style={{ fontFamily: "var(--ui)", fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                            Sent {sm.on}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Chip tone={sm.status === "Accepted" ? "good" : sm.status === "Pending" ? "accent" : "gap"}>
                            {sm.status === "Accepted" ? "Accepted ✓" : sm.status}
                          </Chip>
                          {sm.status === "Pending" && (
                            <Btn
                              small
                              variant="ghost"
                              onClick={() => {
                                setStudentMentorships((prev) => prev.filter((x) => x.id !== sm.id));
                                showToast("Mentorship request cancelled");
                              }}
                              style={{ color: T.terra }}
                            >
                              Cancel Request
                            </Btn>
                          )}
                          {sm.status === "Accepted" && (
                            <Btn
                              small
                              variant="primary"
                              onClick={() => {
                                setSchedulingMentorship(sm);
                                setIsScheduleModalOpen(true);
                              }}
                            >
                              Schedule Session 📅
                            </Btn>
                          )}
                          {sm.status.startsWith("Scheduled") && (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <a
                                href="https://meet.google.com/ayush-mentorship-demo"
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  textDecoration: "none",
                                  fontFamily: "var(--ui)",
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: themeMode === "dark" ? "#07120E" : "#FFFFFF",
                                  background: T.teal,
                                  padding: "6px 12px",
                                  borderRadius: 8,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                🎥 Join Meet
                              </a>
                              <Btn
                                small
                                variant="ghost"
                                onClick={() => {
                                  setSchedulingMentorship(sm);
                                  setIsScheduleModalOpen(true);
                                }}
                              >
                                Reschedule
                              </Btn>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )
        )}

        {/* --- PROFILE & PORTFOLIO TAB --- */}
        {role === "student" && tab === "portfolio" && (
          !user ? (
            <Card style={{ maxWidth: 640, padding: 36, textAlign: "center", margin: "20px auto" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <H size={24}>Sign in to View Your Digital Portfolio</H>
              <Muted style={{ marginTop: 8, marginBottom: 24, lineHeight: 1.6 }}>
                Your verified AYUSH skill matrix, institutional credentials, uploaded certificates, and digital resume are securely synchronized with your Google account.
              </Muted>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Btn onClick={() => setIsAuthModalOpen(true)}>
                  Sign in with Google to Access Profile →
                </Btn>
              </div>
            </Card>
          ) : (
            <>
              {/* Student Header Card with Upload Photo Feature */}
            <Card style={{ marginBottom: 20, padding: 26 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <UserAvatar size={74} />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      title="Upload custom photo"
                      style={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        background: T.teal,
                        color: themeMode === "dark" ? "#07120E" : "#FFFFFF",
                        border: `2px solid ${T.bgCard}`,
                        borderRadius: 999,
                        width: 26,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      📷
                    </button>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <H size={24}>{user ? user.name : "Guest Student"}</H>
                      <Chip tone="good">Verified AYUSH Profile ✓</Chip>
                      <span
                        style={{
                          background: T.bgSurface,
                          border: `1px solid ${T.border}`,
                          color: T.teal,
                          padding: "3px 9px",
                          borderRadius: 7,
                          fontSize: 12,
                          fontFamily: "var(--ui)",
                          fontWeight: 700,
                          letterSpacing: "0.03em",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>🆔</span>
                        <span>{user?.studentId || "AYB-2026-0142"}</span>
                      </span>
                    </div>
                    <Muted style={{ fontSize: 13.5, marginTop: 2 }}>
                      {user?.institution || "All India Institute of Ayurveda"} · {user?.year || "4th Professional Year"}
                    </Muted>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: T.teal, fontWeight: 550 }}>
                        {user?.email || "student@aiia.gov.in"}
                      </span>
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        style={{
                          background: "none",
                          border: "none",
                          color: T.muted,
                          fontSize: 12,
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0,
                        }}
                      >
                        Upload photo
                      </button>
                      {user?.avatar && (
                        <button
                          onClick={() => {
                            setUser((prev) => ({ ...prev, avatar: null }));
                            showToast("Reset to placeholder avatar");
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: T.terra,
                            fontSize: 12,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
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
              
              {/* Left Column: Verified Skills Matrix & Experience */}
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
                        <Btn small onClick={() => changeTab("assessment")}>Take Skill Assessment</Btn>
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

              {/* Right Column: Certifications & Real Document Vault */}
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

                {/* Digital Credential Vault with Functional File Upload */}
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Eyebrow>Digital Credential Vault</Eyebrow>
                    <Btn small variant="ghost" onClick={() => vaultInputRef.current?.click()}>
                      + Upload Document
                    </Btn>
                  </div>
                  <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>
                    Store signed university transcripts, thesis preprints, and hospital rotation logbooks securely.
                  </Muted>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {vaultDocs.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          background: T.bgSurface,
                          border: `1px solid ${T.border}`,
                          borderRadius: 10,
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>📄</span>
                          <div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 13.5, fontWeight: 600, color: T.ink }}>
                              {doc.name}
                            </div>
                            <div style={{ fontFamily: "var(--ui)", fontSize: 11.5, color: T.muted, marginTop: 1 }}>
                              {doc.type} · {doc.size} · Uploaded {doc.date}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setViewingVaultDoc(doc)}
                            style={{
                              background: "none",
                              border: "none",
                              color: T.teal,
                              cursor: "pointer",
                              fontSize: 12.5,
                              fontWeight: 650,
                              textDecoration: "underline",
                              padding: "2px 4px",
                            }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVaultDocs((prev) => prev.filter((x) => x.id !== doc.id));
                              showToast(`Removed "${doc.name}" from vault`);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: T.terra,
                              cursor: "pointer",
                              fontSize: 12,
                              padding: "2px 4px",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
          )
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
                    <Btn
                      small
                      variant={expressedFacultyInterest.includes(f.id) ? "ghost" : "primary"}
                      disabled={expressedFacultyInterest.includes(f.id)}
                      onClick={() => expressFacultyInterest(f)}
                    >
                      {expressedFacultyInterest.includes(f.id)
                        ? "Interest Registered ✓"
                        : !user
                        ? "Sign in to Express Interest"
                        : "Express Interest"}
                    </Btn>
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
              Review incoming student mentorship requests and collaborative problem statements published by AYUSH industry partners.
            </Muted>

            <div className="ay-2col" style={{ display: "grid", gap: 16 }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Eyebrow>Student Mentorship Requests</Eyebrow>
                  <Chip tone="accent">{facultyRequests.filter((r) => r.status === "Pending").length} Pending</Chip>
                </div>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                  {facultyRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: T.bgSurface,
                        border: `1px solid ${T.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: "1 1 240px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "var(--ui)", fontSize: 14.5, color: T.ink, fontWeight: 650 }}>{req.student}</span>
                          <span style={{ fontSize: 11.5, color: T.muted }}>· {req.college}</span>
                        </div>
                        <Muted style={{ fontSize: 12.5, marginTop: 2 }}>{req.topic}</Muted>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Received {req.on}</div>
                      </div>

                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {req.status === "Pending" ? (
                          <>
                            <Btn
                              small
                              variant="primary"
                              onClick={() => {
                                setFacultyRequests((prev) => prev.map((x) => x.id === req.id ? { ...x, status: "Accepted" } : x));
                                showToast(`Accepted mentorship request from ${req.student}! ✓`);
                              }}
                            >
                              Accept
                            </Btn>
                            <Btn
                              small
                              variant="ghost"
                              onClick={() => {
                                setFacultyRequests((prev) => prev.map((x) => x.id === req.id ? { ...x, status: "Declined" } : x));
                                showToast(`Declined request from ${req.student}`);
                              }}
                              style={{ color: T.terra }}
                            >
                              Decline
                            </Btn>
                          </>
                        ) : req.status === "Accepted" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <Chip tone="good">Connected ✓</Chip>
                            <a
                              href={`mailto:${req.student.toLowerCase().replace(/\s+/g, ".")}@aiia.gov.in?subject=AYUSH Mentorship Guidance: ${encodeURIComponent(req.topic)}`}
                              style={{
                                textDecoration: "none",
                                fontFamily: "var(--ui)",
                                fontSize: 12,
                                fontWeight: 600,
                                color: T.teal,
                                background: T.tealSoft,
                                padding: "4px 9px",
                                borderRadius: 7,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                              title="Reach out via institutional email"
                            >
                              ✉️ {req.student.toLowerCase().replace(/\s+/g, ".")}@aiia.gov.in
                            </a>
                          </div>
                        ) : (
                          <Chip tone="gap">Declined</Chip>
                        )}
                      </div>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <div>
                  <Eyebrow>AYUSH Sector Talent Demand Trajectory ({demandRange === "1M" ? "Last 4 Weeks" : demandRange === "3M" ? "Last 3 Months" : demandRange === "6M" ? "Last 6 Months" : "Last 12 Months"})</Eyebrow>
                  <Muted style={{ fontSize: 13, marginTop: 4 }}>
                    Active enterprise job postings and trainee requisitions across key AYUSH domains.
                  </Muted>
                </div>

                {/* Time Range Filter Buttons */}
                <div style={{ display: "inline-flex", background: T.bgSurface, padding: 3, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  {["1M", "3M", "6M", "1Y"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setDemandRange(r)}
                      style={{
                        background: demandRange === r ? (themeMode === "dark" ? T.tealSoft : "#FFFFFF") : "transparent",
                        color: demandRange === r ? T.teal : T.muted,
                        border: demandRange === r ? `1px solid ${T.teal}` : "1px solid transparent",
                        borderRadius: 7,
                        padding: "4px 10px",
                        fontFamily: "var(--ui)",
                        fontSize: 12,
                        fontWeight: demandRange === r ? 700 : 500,
                        cursor: "pointer",
                        transition: "all .15s ease",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={INDUSTRY_DEMAND_TREND_BY_RANGE[demandRange] || INDUSTRY_DEMAND_TREND_BY_RANGE["6M"]}>
                    <CartesianGrid stroke={T.border} vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <YAxis tick={{ fontSize: 12, fill: T.muted, fontFamily: "var(--ui)" }} />
                    <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--ui)" }} />
                    <Line type="monotone" dataKey="Herbal Mfg & QC" stroke={T.sage} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Clinical Trials" stroke={T.terra} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Wellness & Resorts" stroke={T.teal} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Tele-AYUSH" stroke="#2563EB" strokeWidth={2} strokeDasharray="4 4" dot={false} />
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
              Specify required skills, LPA compensation, and target proficiency thresholds. Candidates are ranked objectively on measured capability.
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
                    Salary (in LPA)
                  </div>
                  <input
                    value={form.pay}
                    onChange={(e) => setForm({ ...form, pay: e.target.value })}
                    placeholder="e.g. ₹2.40 LPA"
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
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                    Work Mode
                  </div>
                  <select
                    value={form.workMode}
                    onChange={(e) => setForm({ ...form, workMode: e.target.value })}
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
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                <div>
                  <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                    Physical Interview Required
                  </div>
                  <select
                    value={form.physicalInterview}
                    onChange={(e) => setForm({ ...form, physicalInterview: e.target.value })}
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
                    <option value="Yes">Yes</option>
                    <option value="No (Virtual Only)">No (Virtual Only)</option>
                    <option value="Final Round Only">Final Round Only</option>
                  </select>
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
                      loc: form.loc || "Bengaluru, Karnataka",
                      domain: form.domain,
                      type: form.type,
                      pay: form.pay.includes("LPA") ? form.pay : `${form.pay} LPA`,
                      workMode: form.workMode,
                      physicalInterview: form.physicalInterview,
                      interviewRounds: "2 Rounds: Technical + HR",
                      closes: "31 Oct 2026",
                      requires: req,
                      about: "Published directly via AyushBridge Recruiter Workspace.",
                      qualifications: "BAMS / B.Pharm Ayurveda / Relevant Degree",
                      preferredSkills: "AYUSH GMP, Product Formulation, Standard Lab Testing",
                      dayInLife: "Supervising laboratory and production activities, analyzing product quality logs.",
                    },
                  ]);
                  setForm({ ...form, title: "", skills: [] });
                  showToast("Opportunity published to Student board in LPA format!");
                }}
              >
                Publish Opening →
              </Btn>

              {posted.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                  <Eyebrow>Published this session</Eyebrow>
                  {posted.map((p) => (
                    <div key={p.id} style={{ marginTop: 8, fontFamily: "var(--ui)", fontSize: 13.5, color: T.ink }}>
                      ✨ {p.title} · {p.pay} — Visible to students on Opportunity Board
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
            <Muted style={{ marginTop: 4, marginBottom: 18 }}>
              Ranked by verified hands-on competency scores. Portfolios and project summaries open upon application.
            </Muted>

            {/* Candidate Search Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div style={{ position: "relative", width: "100%", maxWidth: 440 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 14 }}>
                  🔍
                </span>
                <input
                  type="text"
                  value={applicantSearch}
                  onChange={(e) => setApplicantSearch(e.target.value)}
                  placeholder="Search by candidate name, student ID, stream, or role..."
                  style={{
                    width: "100%",
                    padding: "9px 14px 9px 36px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.bgSurface,
                    color: T.ink,
                    fontFamily: "var(--ui)",
                    fontSize: 13.5,
                    outline: "none",
                  }}
                />
                {applicantSearch && (
                  <button
                    onClick={() => setApplicantSearch("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: T.muted,
                      cursor: "pointer",
                      fontSize: 13,
                      padding: 4,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--ui)" }}>
                Showing <strong style={{ color: T.ink }}>{filteredApplicants.length}</strong> of {APPLICANTS.length} verified candidates
              </span>
            </div>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ui)", fontSize: 13.5, minWidth: 740 }}>
                  <thead>
                    <tr style={{ background: T.bgSurface }}>
                      {["Candidate", "Student ID", "College & Stream", "Applied For", "Readiness Match", "Status"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "13px 18px", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted, fontWeight: 650 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "32px 18px", textAlign: "center", color: T.muted, fontStyle: "italic" }}>
                          No candidates found matching "{applicantSearch}". Try clearing or broadening your search.
                        </td>
                      </tr>
                    ) : (
                      filteredApplicants.map((a) => (
                        <tr key={a.name} style={{ borderTop: `1px solid ${T.border}` }}>
                          <td style={{ padding: "14px 18px", color: T.ink, fontWeight: 600 }}>{a.name}</td>
                          <td style={{ padding: "14px 18px" }}>
                            <span
                              style={{
                                fontFamily: "var(--ui)",
                                fontSize: 12,
                                fontWeight: 650,
                                color: T.teal,
                                background: T.bgSurface,
                                border: `1px solid ${T.border}`,
                                padding: "3px 8px",
                                borderRadius: 6,
                                letterSpacing: "0.02em",
                              }}
                            >
                              {a.studentId}
                            </span>
                          </td>
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
                      ))
                    )}
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
                <Eyebrow>Department Readiness & Placement Rate</Eyebrow>
                <Muted style={{ fontSize: 13, marginTop: 4 }}>
                  Placement rate (%) vs average competency score across AIIA teaching departments.
                </Muted>
                <div style={{ height: 260, marginTop: 12 }}>
                  <ResponsiveContainer>
                    <BarChart data={INSTITUTION_DEPT_METRICS} layout="vertical" margin={{ left: 10, right: 16 }}>
                      <CartesianGrid horizontal={false} stroke={T.border} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <YAxis type="category" dataKey="dept" width={120} tick={{ fontSize: 10, fill: T.muted, fontFamily: "var(--ui)" }} />
                      <Tooltip contentStyle={{ backgroundColor: T.chartTooltipBg, borderRadius: 10, border: `1px solid ${T.chartTooltipBorder}`, fontFamily: "var(--ui)", fontSize: 12, color: T.ink }} />
                      <Legend wrapperStyle={{ fontSize: 11.5, fontFamily: "var(--ui)" }} />
                      <Bar dataKey="placedPct" name="Placement %" fill={T.sage} radius={[0, 4, 4, 0]} />
                      <Bar dataKey="avgScore" name="Avg Competency" fill={T.teal} radius={[0, 4, 4, 0]} />
                    </BarChart>
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
              <KPI value="₹4.20 LPA" label="Median Package" icon="💵" />
              <KPI value="24" label="Recruiting Partners" sub="6 joined this session" icon="🤝" />
              <KPI value="21 Days" label="Median Time to Offer" icon="⚡" />
            </div>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--ui)", fontSize: 13.5, minWidth: 740 }}>
                  <thead>
                    <tr style={{ background: T.bgSurface }}>
                      {["Student", "Student ID", "Stream", "Opportunity", "Readiness Match", "Status"].map((h) => (
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
                        <td style={{ padding: "14px 18px" }}>
                          <span
                            style={{
                              fontFamily: "var(--ui)",
                              fontSize: 12,
                              fontWeight: 650,
                              color: T.teal,
                              background: T.bgSurface,
                              border: `1px solid ${T.border}`,
                              padding: "3px 8px",
                              borderRadius: 6,
                              letterSpacing: "0.02em",
                            }}
                          >
                            {r.studentId}
                          </span>
                        </td>
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
          </>
        )}

        <Footer T={T} />
      </main>

      {/* ============================================================
          MODALS: AUTH, PROFILE EDIT, CERTIFICATIONS, EXPERIENCES
          ============================================================ */}

      {/* 1. Google Auth & Role Selection Modal */}
      {isAuthModalOpen && (
        <ModalOverlay onClose={() => setIsAuthModalOpen(false)} T={T}>
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ display: "inline-flex", padding: 12, background: T.bgSurface, borderRadius: 999, marginBottom: 12 }}>
              <svg width="28" height="28" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <H size={22}>Sign Up / Sign In with Google</H>
            <Muted style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>
              Select your designated role to activate your verified account and access your dedicated dashboard.
            </Muted>

            {/* Step 1: Role Selection at Signup */}
            <div style={{ textAlign: "left", marginBottom: 18 }}>
              <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                Step 1: Select Your Account Role *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { id: "student", label: "Student / Intern", icon: "🎓", sub: "Take assessments & apply" },
                  { id: "academician", label: "Faculty / Researcher", icon: "🔬", sub: "R&D grants & sabbaticals" },
                  { id: "industry", label: "Industry / Recruiter", icon: "🌿", sub: "Hire talent & post roles" },
                  { id: "institution", label: "Institution / Dean", icon: "📊", sub: "Placement & skill analytics" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAuthModalRole(r.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: `1.5px solid ${authModalRole === r.id ? T.teal : T.border}`,
                      background: authModalRole === r.id ? T.tealSoft : T.bgSurface,
                      cursor: "pointer",
                      transition: "all .15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{r.icon}</span>
                      <span style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700, color: authModalRole === r.id ? T.teal : T.ink }}>
                        {r.label}
                      </span>
                    </div>
                    <span style={{ fontFamily: "var(--ui)", fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.3 }}>
                      {r.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: One-Click Google OAuth */}
            <div style={{ textAlign: "left", marginBottom: 6 }}>
              <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                Step 2: Sign in with Google Account
              </label>
              <button
                type="button"
                onClick={() => {
                  const account = ROLE_ACCOUNTS[authModalRole] || ROLE_ACCOUNTS.student;
                  setUser(account);
                  setRole(authModalRole);
                  setTab("overview");
                  setIsAuthModalOpen(false);
                  showToast(`Signed up & logged in as ${account.name} (${account.roleLabel}) via Google OAuth ✓`);
                }}
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: `1.5px solid ${T.teal}`,
                  background: T.teal,
                  color: themeMode === "dark" ? "#07120E" : "#FFFFFF",
                  fontFamily: "var(--ui)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 4px 14px rgba(18, 160, 130, 0.25)",
                }}
              >
                <span>Continue as {ROLE_ACCOUNTS[authModalRole]?.name.split(" ")[0]} ({ROLE_ACCOUNTS[authModalRole]?.roleLabel})</span>
                <span>→</span>
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
          key={editingCert ? `cert-${editingCert.id}` : "new-cert"}
          T={T}
          cert={editingCert}
          onClose={() => {
            setIsAddCertOpen(false);
            setEditingCert(null);
          }}
          onSave={(newCert) => {
            if (editingCert) {
              setCertifications((prev) =>
                prev.map((c) => (c.id === editingCert.id ? { ...c, ...newCert } : c))
              );
              showToast("Certification updated successfully! ✓");
            } else {
              setCertifications((prev) => [
                { ...newCert, id: "c" + Date.now(), verified: true },
                ...prev,
              ]);
              showToast("New certification added & verified! Skill scores boosted. ✓");
            }
            setIsAddCertOpen(false);
            setEditingCert(null);
          }}
        />
      )}

      {/* 4. Add / Edit Experience Modal */}
      {isAddExpOpen && (
        <ExperienceModal
          key={editingExp ? `exp-${editingExp.id}` : "new-exp"}
          T={T}
          exp={editingExp}
          onClose={() => {
            setIsAddExpOpen(false);
            setEditingExp(null);
          }}
          onSave={(newExp) => {
            if (editingExp) {
              setExperiences((prev) =>
                prev.map((e) => (e.id === editingExp.id ? { ...e, ...newExp } : e))
              );
              showToast("Experience updated successfully! ✓");
            } else {
              setExperiences((prev) => [
                { ...newExp, id: "e" + Date.now() },
                ...prev,
              ]);
              showToast("Clinical experience added to profile! ✓");
            }
            setIsAddExpOpen(false);
            setEditingExp(null);
          }}
        />
      )}

      {/* 5. Schedule Mentorship Session Modal */}
      {isScheduleModalOpen && schedulingMentorship && (
        <ScheduleSessionModal
          key={schedulingMentorship.id}
          T={T}
          mentorship={schedulingMentorship}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSchedulingMentorship(null);
          }}
          onSchedule={({ date, mode, notes }) => {
            setStudentMentorships((prev) =>
              prev.map((sm) =>
                sm.id === schedulingMentorship.id
                  ? { ...sm, status: `Scheduled: ${date}`, topic: notes || sm.topic }
                  : sm
              )
            );
            setIsScheduleModalOpen(false);
            setSchedulingMentorship(null);
            showToast(`Mentorship session confirmed with ${schedulingMentorship.faculty}! 📅 Calendar invite sent to ${user?.email || "your email"}.`);
          }}
        />
      )}

      {/* 6. Digital Credential Vault Document Viewer Modal */}
      {viewingVaultDoc && (
        <DocumentViewerModal
          T={T}
          doc={viewingVaultDoc}
          onClose={() => setViewingVaultDoc(null)}
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
  const [docName, setDocName] = useState(cert?.docName || "");
  const certFileInputRef = useRef(null);

  useEffect(() => {
    if (cert) {
      setTitle(cert.title || "");
      setIssuer(cert.issuer || "");
      setIssueDate(cert.issueDate || "August 2026");
      setCredentialUrl(cert.credentialUrl || "");
      setBoostSkill(cert.boostSkill || "clinical_research");
      setDocName(cert.docName || "");
    }
  }, [cert]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocName(file.name);
    }
  };

  return (
    <ModalOverlay onClose={onClose} T={T}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 600, color: T.ink, margin: 0 }}>
            {cert ? "Edit Certification" : "Add AYUSH Certification"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: "0 4px" }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 18, lineHeight: 1.5 }}>
          Verified certifications tie directly into your role-readiness matching score and verified skill badges.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Certificate Title */}
          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Certification Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Good Clinical Practice (GCP) in Traditional Medicine Trials"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 9,
                border: `1px solid ${T.border}`,
                background: T.bgSurface,
                color: T.ink,
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          {/* Issuer */}
          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Issuing Organization / Institute *
            </label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="e.g. CCRAS / All India Institute of Ayurveda / Dabur / Himalaya"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 9,
                border: `1px solid ${T.border}`,
                background: T.bgSurface,
                color: T.ink,
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Date of Issue */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
                Date of Issue
              </label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                placeholder="e.g. July 2026"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: `1px solid ${T.border}`,
                  background: T.bgSurface,
                  color: T.ink,
                  fontFamily: "var(--ui)",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />
            </div>

            {/* Boosted Skill */}
            <div>
              <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
                Boosted Skill Domain
              </label>
              <select
                value={boostSkill}
                onChange={(e) => setBoostSkill(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: `1px solid ${T.border}`,
                  background: T.bgSurface,
                  color: T.ink,
                  fontFamily: "var(--ui)",
                  fontSize: 13.5,
                  outline: "none",
                }}
              >
                {SKILLS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.short} (+12 pts)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Verification Link */}
          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Verification URL or Digital Certificate Link (Optional)
            </label>
            <input
              type="text"
              value={credentialUrl}
              onChange={(e) => setCredentialUrl(e.target.value)}
              placeholder="https://ccras.nic.in/verify/AY-GCP-8842"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 9,
                border: `1px solid ${T.border}`,
                background: T.bgSurface,
                color: T.ink,
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          {/* File Upload Attachment */}
          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Attach Certificate Document (PDF / Image)
            </label>
            <input
              type="file"
              ref={certFileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. CCRAS_GCP_Certificate.pdf"
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: `1px solid ${T.border}`,
                  background: T.bgSurface,
                  color: T.ink,
                  fontFamily: "var(--ui)",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => certFileInputRef.current?.click()}
                style={{
                  background: T.tealSoft,
                  border: `1px solid ${T.teal}`,
                  color: T.teal,
                  borderRadius: 9,
                  padding: "9px 14px",
                  fontFamily: "var(--ui)",
                  fontSize: 13,
                  fontWeight: 650,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                📁 Browse File
              </button>
            </div>
            {docName && (
              <span style={{ fontSize: 12, color: T.sage, marginTop: 4, display: "block" }}>
                ✓ Selected file: {docName}
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.muted,
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!title.trim() || !issuer.trim()}
              onClick={() => onSave({
                title,
                issuer,
                issueDate,
                credentialUrl,
                boostSkill,
                boostAmount: 12,
                docName: docName || "Certificate_Verified.pdf",
              })}
              style={{
                background: (!title.trim() || !issuer.trim()) ? T.border : T.teal,
                border: "none",
                color: (!title.trim() || !issuer.trim()) ? T.muted : (T.isDark ? "#07120E" : "#FFFFFF"),
                borderRadius: 8,
                padding: "8px 18px",
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: (!title.trim() || !issuer.trim()) ? "not-allowed" : "pointer",
              }}
            >
              Save Certification
            </button>
          </div>
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

  useEffect(() => {
    if (exp) {
      setRoleTitle(exp.role || "");
      setOrg(exp.org || "");
      setPeriod(exp.period || "");
      setDescription(exp.description || "");
    }
  }, [exp]);

  return (
    <ModalOverlay onClose={onClose} T={T}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 600, color: T.ink, margin: 0 }}>
            {exp ? "Edit Experience" : "Add Clinical / Lab Experience"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: "0 4px" }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 18, lineHeight: 1.5 }}>
          Add your hospital clinical rotations, pharmacy apprenticeships, or research internships.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Role / Position Title *
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Clinical Trainee — Hospital OPD"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Hospital / Organization *
            </label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="e.g. AIIA Hospital, New Delhi"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Duration / Period
            </label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. Jan 2026 – Present (6 mos)"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5, outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
              Key Responsibilities & Case Work
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe clinical case documentation, patient care procedures, or laboratory tests performed..."
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13.5, resize: "vertical", outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.muted,
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!role.trim() || !org.trim()}
              onClick={() => onSave({ role, org, period, description })}
              style={{
                background: (!role.trim() || !org.trim()) ? T.border : T.teal,
                border: "none",
                color: (!role.trim() || !org.trim()) ? T.muted : (T.isDark ? "#07120E" : "#FFFFFF"),
                borderRadius: 8,
                padding: "8px 18px",
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: (!role.trim() || !org.trim()) ? "not-allowed" : "pointer",
              }}
            >
              Save Experience
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ScheduleSessionModal({ T, mentorship, onClose, onSchedule }) {
  const [date, setDate] = useState("Tomorrow, 3:30 PM");
  const [mode, setMode] = useState("Virtual (Google Meet)");
  const [notes, setNotes] = useState(mentorship?.topic || "");

  const slots = [
    "Tomorrow, 3:30 PM",
    "Thursday, 11:00 AM",
    "Friday, 4:00 PM",
    "Monday, 2:00 PM",
  ];

  return (
    <ModalOverlay onClose={onClose} T={T}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 600, color: T.ink, margin: 0 }}>
            Schedule Mentorship Session
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: "0 4px" }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 18, lineHeight: 1.5 }}>
          Confirm a dedicated 1-on-1 mentorship session with <strong style={{ color: T.ink }}>{mentorship?.faculty}</strong> ({mentorship?.dept}).
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 6 }}>
              Select Available Time Slot
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDate(s)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${date === s ? T.teal : T.border}`,
                    background: date === s ? T.tealSoft : T.bgSurface,
                    color: date === s ? T.teal : T.ink,
                    fontFamily: "var(--ui)",
                    fontSize: 12.5,
                    fontWeight: date === s ? 650 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>📅</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 6 }}>
              Session Meeting Mode
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              {["Virtual (Google Meet)", "In-Person (Faculty Cabin, AIIA)"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${mode === m ? T.teal : T.border}`,
                    background: mode === m ? T.tealSoft : T.bgSurface,
                    color: mode === m ? T.teal : T.ink,
                    fontFamily: "var(--ui)",
                    fontSize: 12,
                    fontWeight: mode === m ? 650 : 500,
                    cursor: "pointer",
                  }}
                >
                  {m.startsWith("Virtual") ? "🎥" : "🏛️"} {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 6 }}>
              Discussion Topic & Key Questions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Seeking review of clinical study methodology and case sheet variables..."
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 9,
                border: `1px solid ${T.border}`,
                background: T.bgSurface,
                color: T.ink,
                fontFamily: "var(--ui)",
                fontSize: 13,
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                color: T.muted,
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSchedule({ date, mode, notes })}
              style={{
                background: T.teal,
                border: "none",
                color: T.isDark ? "#07120E" : "#FFFFFF",
                borderRadius: 8,
                padding: "8px 18px",
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Confirm & Send Calendar Invite 📅
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

function DocumentViewerModal({ T, doc, onClose }) {
  if (!doc) return null;

  return (
    <ModalOverlay onClose={onClose} T={T}>
      <div style={{ maxWidth: 620 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: T.tealSoft,
              color: T.teal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}>
              📄
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, color: T.ink, margin: 0, lineHeight: 1.3 }}>
                {doc.name}
              </h2>
              <div style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.muted, marginTop: 2 }}>
                {doc.type} · {doc.size} · Uploaded {doc.date}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: "0 4px" }}
          >
            ✕
          </button>
        </div>

        {/* Verification Banner */}
        <div style={{
          background: T.bgSurface,
          border: `1px solid ${T.sage}`,
          borderRadius: 10,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}>
          <span style={{ color: T.sage, fontSize: 14 }}>🔒</span>
          <span style={{ fontFamily: "var(--ui)", fontSize: 12, color: T.inkSoft, fontWeight: 550 }}>
            Digitally Signed & Encrypted in AyushBridge Credential Vault (SHA-256 Verified)
          </span>
        </div>

        {/* Document Simulation Preview Container */}
        <div style={{
          background: T.isDark ? "#0D1814" : "#F8FAFB",
          border: `1.5px dashed ${T.border}`,
          borderRadius: 12,
          padding: 22,
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏛️</span>
                <span style={{ fontFamily: "var(--display)", fontSize: 13.5, fontWeight: 700, color: T.ink }}>
                  All India Institute of Ayurveda · Academic Registry
                </span>
              </div>
              <span style={{ fontFamily: "var(--ui)", fontSize: 11, color: T.muted, background: T.bgSurface, padding: "2px 6px", borderRadius: 4 }}>
                AYUSH-REG-2026
              </span>
            </div>

            <div style={{ fontFamily: "var(--ui)", fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 650, color: T.ink, marginBottom: 4 }}>
                Document Title: {doc.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")}
              </div>
              <div><strong>Holder:</strong> Ishit Aggarwal (Student ID: AYB-2026-0142)</div>
              <div><strong>Classification:</strong> {doc.type}</div>
              <div><strong>Verification Status:</strong> Validated by Institutional Registrar & Examination Board</div>
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.muted }}>
              <span>🔏 Cryptographic Hash:</span>
              <code style={{ fontSize: 11, color: T.teal }}>8f7a94b2...3c29e1</code>
            </div>
            <div style={{ fontFamily: "var(--ui)", fontSize: 11.5, fontWeight: 700, color: T.sage }}>
              ✓ VERIFIED AUTHENTIC
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 18, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
          <button
            type="button"
            onClick={() => {
              const dummyContent = `AyushBridge Credential Vault\n========================================\nDocument: ${doc.name}\nType: ${doc.type}\nFile Size: ${doc.size}\nIssue Date: ${doc.date}\nStudent ID: AYB-2026-0142\nHolder: Ishit Aggarwal\nInstitution: All India Institute of Ayurveda (AIIA)\nStatus: Cryptographically Verified & Sealed\nHash: 8f7a94b2e84196cc3248df9a3c29e1f5`;
              const blob = new Blob([dummyContent], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = doc.name;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              background: T.bgSurface,
              border: `1px solid ${T.border}`,
              color: T.ink,
              borderRadius: 8,
              padding: "8px 14px",
              fontFamily: "var(--ui)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📥</span>
            <span>Download Copy</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.teal,
              border: "none",
              color: T.isDark ? "#07120E" : "#FFFFFF",
              borderRadius: 8,
              padding: "8px 20px",
              fontFamily: "var(--ui)",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close Preview
          </button>
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
        @keyframes pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 0.35; }
        }
        .ay-btn { transition: transform .12s ease, filter .12s ease, box-shadow .12s ease; }
        .ay-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .ay-btn:active:not(:disabled) { transform: translateY(0); }
        .ay-persona:hover { transform: translateY(-3px); box-shadow: 0 16px 36px -18px rgba(0,0,0,.45); border-color: ${T.teal}80 !important; }
        .ay-card { transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease; }
        .ay-card:hover { border-color: ${T.teal}40 !important; }
        .ay-opt:hover { border-color: ${T.teal} !important; background: ${T.bgSurfaceHover} !important; }
        .ay-theme-btn { transition: all .15s ease; }
        .ay-theme-btn:hover { border-color: ${T.teal} !important; }
        .ay-google-btn:hover { border-color: ${T.teal} !important; background: ${T.bgSurfaceHover} !important; }
        .ay-no-scroll::-webkit-scrollbar { display: none; }
        .ay-no-scroll { scrollbar-width: none; -ms-overflow-style: none; }
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
