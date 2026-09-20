"use client";

/**
 * Local, browser-persisted data layer standing in for a real database.
 * Every "collection" is a JSON array in localStorage. The shape mirrors
 * what a Firestore/Convex collection would look like, so swapping in a real
 * backend later just means replacing the functions in this file.
 */

import { DEPARTMENTS, DEPARTMENT_CORE_SKILL } from "./domains";
import { SKILL_DOMAINS } from "./questionBank";
import { domainsFor } from "./taxonomy";
import { broadcastMutation } from "./sync";
import { checkEligibility, computeMatch, formatDate } from "./match";
import { hasFile } from "./files";
import { APPLICATION_LEAD_HOURS, TEST_LEAD_HOURS, addDaysIso, checkLeadTime, programmeStartMs, todayIso } from "./dates";
import { SAMPLE_RESUME_DATA_URL, SAMPLE_RESUME_FILENAME } from "./sampleResume";
import { sampleAttachment } from "./samplePdf";

const NS = "ayusetu:v6:";

/**
 * Demo mode is a sandbox, not a layer on top of the real portal.
 *
 * Every collection is stored under a second, separate prefix while a demo
 * persona is signed in, so the sample cohort, postings, tests, MOUs and
 * notices never appear to a real student, recruiter, faculty member or
 * institution — they see the portal empty until someone actually uploads
 * something — and nothing a real account creates leaks into the tour either.
 * The switch is a single localStorage flag set on entering demo mode and
 * cleared on any real sign-in or sign-out.
 */
const DEMO_MODE_KEY = "ayusetu:mode";
const DEMO_NS = "demo:";

export function isDemoMode() {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(DEMO_MODE_KEY) === "demo";
  } catch {
    return false;
  }
}

export function setDemoMode(on) {
  if (!isBrowser()) return;
  try {
    if (on) window.localStorage.setItem(DEMO_MODE_KEY, "demo");
    else window.localStorage.removeItem(DEMO_MODE_KEY);
  } catch {
    /* private browsing — falls back to the real namespace */
  }
}

/** The storage key for a collection or flag in whichever namespace is active. */
function nsKey(name) {
  return NS + (isDemoMode() ? DEMO_NS : "") + name;
}

/* Bumped whenever the sample catalogue changes shape. Rows are upserted by
   `seedId`, so bumping this refreshes the samples without touching anything a
   real account created. */
const SEED_VERSION_KEY = "seededV4";
const DEMO_VERSION_KEY = "demoSeededV7";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(collection) {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(nsKey(collection));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(collection, arr) {
  if (!isBrowser()) return;
  window.localStorage.setItem(nsKey(collection), JSON.stringify(arr));
}

function genId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function all(collection) {
  return read(collection);
}

export function insert(collection, doc) {
  const arr = read(collection);
  const record = { id: doc.id || genId(collection), ...doc };
  arr.push(record);
  write(collection, arr);
  broadcastMutation(collection, "INSERT", record);
  return record;
}

export function update(collection, id, patch) {
  const arr = read(collection);
  const idx = arr.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...patch };
  write(collection, arr);
  broadcastMutation(collection, "UPDATE", arr[idx]);
  return arr[idx];
}

export function remove(collection, id) {
  write(collection, read(collection).filter((d) => d.id !== id));
  broadcastMutation(collection, "REMOVE", { id });
}

export function saveAll(collection, arr) {
  write(collection, arr);
  broadcastMutation(collection, "BATCH", { count: arr.length });
}

export function findOne(collection, predicate) {
  return read(collection).find(predicate) || null;
}

export function findMany(collection, predicate) {
  return read(collection).filter(predicate);
}

/* ============================================================
   Seed data.

   The sample employers, institutions, postings and tests below
   are drawn from the AYUSH ecosystem end to end — the national
   institutes under the Ministry of AYUSH, ASU&H drug manufacturers
   (Dabur, Patanjali, Himalaya, Baidyanath, Emami/Zandu, Charak),
   classical Ayurveda houses (Arya Vaidya Sala, Vaidyaratnam,
   Kerala Ayurveda), the research councils (CCRAS, CCRYN, CCRUM)
   and the wellness, export and digital-health layer around them.
   Every clinical system gets a posting; every posting is a role
   an AYUSH graduate can actually be hired into.
   Seeded records use ownerId: "seed" so they never show up as
   "mine" for a fresh account.

   Postings carry real eligibility criteria (a minimum skill
   score and eligible departments), because "only show roles I'm
   eligible for" can only filter on criteria that exist. They
   deliberately do NOT carry an institution whitelist: a role
   should be open on merit, not on which campus someone is at.

   Pay is a number plus a mode ("monthly" | "total"), never a
   hand-typed string — see lib/money.js.
   ============================================================ */

export const DEMO_INSTITUTION = "All India Institute of Ayurveda (AIIA), New Delhi";

export const PEER_INSTITUTIONS = [
  "National Institute of Ayurveda (NIA), Jaipur",
  "National Institute of Siddha (NIS), Chennai",
  "Gujarat Ayurved University, Jamnagar",
  "Uttarakhand Ayurved University, Dehradun",
  "Morarji Desai National Institute of Yoga (MDNIY), New Delhi",
  "Institute of Teaching & Research in Ayurveda (ITRA), Jamnagar",
  "National Institute of Unani Medicine (NIUM), Bengaluru",
  "National Institute of Sowa-Rigpa (NISR), Leh",
];

const SEED_INTERNSHIPS = [
  { seedId: "seed-int-software", title: "Panchakarma Therapist Intern", company: "Kerala Ayurveda Ltd.", location: "Kochi", type: "Onsite", domain: "Panchakarma & Therapy Centres", ayushSystem: "ayurveda", duration: "6 months", stipendAmount: 18000, stipendMode: "monthly", tags: ["Panchakarma", "Abhyanga & Shirodhara", "Patient Counselling"], deadline: "2026-10-18", description: "Assist senior therapists through full Panchakarma cycles — Purvakarma, Pradhana karma and Paschat karma — at a NABH-accredited Ayurveda hospital.", minSkillScore: 55, eligibleDepartments: ["Ayurveda (BAMS)", "Panchakarma (PG Diploma)", "Panchakarma Therapy Assistant (Diploma)"], color: "#3C7C6B", hot: true },
  { seedId: "seed-int-data", title: "Ayurvedic Physician / Clinical Consultant Intern", company: "Arya Vaidya Sala, Kottakkal", location: "Kottakkal", type: "Onsite", domain: "Ayurveda", ayushSystem: "ayurveda", duration: "6 months", stipendAmount: 22000, stipendMode: "monthly", tags: ["Nadi Pariksha", "Prakriti Assessment", "Clinical Documentation"], deadline: "2026-10-25", description: "Rotate through Kayachikitsa and Panchakarma OPDs under senior vaidyas, maintaining case records to NAMASTE terminology standards.", minSkillScore: 60, eligibleDepartments: ["Ayurveda (BAMS)", "Ayurveda Postgraduate (MD/MS Ayu)"], color: "#3C8A6B", hot: true },
  { seedId: "seed-int-network", title: "GMP Compliance & Quality Control Intern (ASU&H Drugs)", company: "Dabur India Ltd.", location: "Sahibabad, Ghaziabad", type: "Onsite", domain: "ASU&H Drug Manufacturing & GMP", ayushSystem: "ayurveda", duration: "6 months", stipendAmount: 150000, stipendMode: "total", tags: ["GMP Compliance", "HPTLC", "Heavy Metal Testing"], deadline: "2026-11-08", description: "Support Schedule T GMP audits, batch-record review and in-process QC on classical and proprietary Ayurvedic production lines.", minSkillScore: 58, eligibleDepartments: ["Ayurvedic Pharmacy (B.Pharm Ayu)", "Rasashastra & Bhaishajya Kalpana", "Dravyaguna & Pharmacognosy"], color: "#3C5A8A", hot: false },
  { seedId: "seed-int-mech", title: "Herbal Formulation & Nutraceutical R&D Intern", company: "Himalaya Wellness Company", location: "Bengaluru", type: "Onsite", domain: "Herbal Formulation & Nutraceutical R&D", ayushSystem: "ayurveda", duration: "5 months", stipendAmount: 24000, stipendMode: "monthly", tags: ["Formulation", "Pharmacognosy", "Research Methodology"], deadline: "2026-11-05", description: "Work on pre-formulation studies, standardised-extract characterisation and stability protocols for new herbal SKUs.", minSkillScore: 58, eligibleDepartments: ["Ayurvedic Pharmacy (B.Pharm Ayu)", "Dravyaguna & Pharmacognosy", "Rasashastra & Bhaishajya Kalpana"], color: "#4A6B3C", hot: true },
  { seedId: "seed-int-site", title: "GACP Field Officer Intern (Medicinal Plant Cultivation)", company: "Patanjali Ayurved Ltd.", location: "Haridwar", type: "Onsite", domain: "Medicinal Plant Cultivation (GACP)", ayushSystem: "ayurveda", duration: "6 months", stipendAmount: 16000, stipendMode: "monthly", tags: ["GACP", "Medicinal Plant Cultivation", "Herbal Supply Chain"], deadline: "2026-11-15", description: "Audit contract farms for GACP compliance, log harvest and post-harvest handling, and trace raw-drug batches back to source.", minSkillScore: 50, eligibleDepartments: ["Medicinal Plant Sciences & Cultivation", "Dravyaguna & Pharmacognosy"], color: "#3C8A5A", hot: false },
  { seedId: "seed-int-energy", title: "Certified Yoga Instructor / Yoga Therapist Intern", company: "Central Council for Research in Yoga & Naturopathy (CCRYN)", location: "New Delhi", type: "Hybrid", domain: "Yoga & Naturopathy", ayushSystem: "yoga_naturopathy", duration: "4 months", stipendAmount: 15000, stipendMode: "monthly", tags: ["Yoga Therapy", "Yoga Certification Board", "Patient Counselling"], deadline: "2026-11-19", description: "Deliver supervised yoga-therapy protocols for lifestyle-disorder cohorts and record outcome measures for an ongoing CCRYN study.", minSkillScore: 52, eligibleDepartments: ["Naturopathy & Yogic Sciences (BNYS)", "Yoga Therapy (PG Diploma)", "Swasthavritta & Yoga (Preventive Health)"], color: "#6B7C3C", hot: false },
  { seedId: "seed-int-finance", title: "Regulatory Affairs Associate Intern – AYUSH Drug Licensing", company: "Charak Pharma", location: "Mumbai", type: "Hybrid", domain: "Regulatory Affairs & AYUSH Drug Licensing", ayushSystem: "ayurveda", duration: "3 months", stipendAmount: 20000, stipendMode: "monthly", tags: ["Regulatory Affairs", "Export Documentation", "AYUSH Premium Mark"], deadline: "2026-11-12", description: "Prepare state licensing dossiers under the Drugs & Cosmetics Act for ASU products and support AYUSH Premium Mark applications.", minSkillScore: 58, eligibleDepartments: ["Ayurvedic Pharmacy (B.Pharm Ayu)", "AYUSH Hospital Management & Public Health", "Rasashastra & Bhaishajya Kalpana"], color: "#3C4A8A", hot: false },
  { seedId: "seed-int-legal", title: "Unani Hakim (Clinical Intern)", company: "Hamdard Laboratories (India)", location: "New Delhi", type: "Onsite", domain: "Unani", ayushSystem: "unani", duration: "3 months", stipendAmount: 45000, stipendMode: "total", tags: ["Regimenal Therapy", "Hijama", "Clinical Documentation"], deadline: "2026-11-26", description: "Clinical posting in Moalajat and Ilaj-bit-Tadbeer OPDs at a Unani teaching hospital, with case-record maintenance.", minSkillScore: 55, eligibleDepartments: ["Unani (BUMS)"], color: "#3C6B8A", hot: false },
  { seedId: "seed-int-marketing", title: "AYUSH Export/Trade Documentation Associate Intern", company: "Sri Sri Tattva", location: "Remote", type: "Remote", domain: "AYUSH Export & Trade", ayushSystem: "ayurveda", duration: "3 months", stipendAmount: 18000, stipendMode: "monthly", tags: ["Export Documentation", "Regulatory Affairs", "Communication"], deadline: "2026-11-28", description: "Prepare export documentation, certificates of analysis and country-specific registration files for herbal products shipped to 30+ markets.", minSkillScore: 50, eligibleDepartments: [], color: "#8A5A3C", hot: false },
  { seedId: "seed-int-supply", title: "Raw Drug Authentication & Pharmacognosy Intern", company: "Baidyanath Group", location: "Kolkata", type: "Onsite", domain: "Pharmacognosy & Raw Drug Authentication", ayushSystem: "ayurveda", duration: "4 months", stipendAmount: 17000, stipendMode: "monthly", tags: ["Raw Drug Authentication", "Pharmacognosy", "HPTLC"], deadline: "2026-12-04", description: "Authenticate incoming crude drugs against Ayurvedic Pharmacopoeia of India monographs using macroscopy, microscopy and HPTLC fingerprints.", minSkillScore: 55, eligibleDepartments: ["Dravyaguna & Pharmacognosy", "Ayurvedic Pharmacy (B.Pharm Ayu)", "Medicinal Plant Sciences & Cultivation"], color: "#7E9638", hot: false },
  { seedId: "seed-int-hospitality", title: "AYUSH Wellness & Spa Therapist Intern", company: "Kerala Ayurveda Ltd.", location: "Kochi", type: "Onsite", domain: "AYUSH Wellness & Spa", ayushSystem: "ayurveda", duration: "3 months", stipendAmount: 42000, stipendMode: "total", tags: ["Spa Therapy", "Wellness Centre Operations", "Patient Counselling"], deadline: "2026-12-06", description: "Rotate through Abhyanga, Shirodhara and Swedana suites at a wellness resort, owning one guest-experience improvement project.", minSkillScore: 48, eligibleDepartments: ["Panchakarma Therapy Assistant (Diploma)", "Naturopathy & Yogic Sciences (BNYS)", "Panchakarma (PG Diploma)"], color: "#8A3C6B", hot: false },
  { seedId: "seed-int-design", title: "Naturopathy Consultant Intern", company: "Jindal Naturecure Institute", location: "Bengaluru", type: "Onsite", domain: "Yoga & Naturopathy", ayushSystem: "yoga_naturopathy", duration: "4 months", stipendAmount: 20000, stipendMode: "monthly", tags: ["Hydrotherapy", "Diet & Nutrition", "Yoga Therapy"], deadline: "2026-11-22", description: "Plan naturopathic diet, fasting and hydrotherapy regimens for in-patients under a senior naturopathy physician.", minSkillScore: 55, eligibleDepartments: ["Naturopathy & Yogic Sciences (BNYS)", "Swasthavritta & Yoga (Preventive Health)"], color: "#6B7C3C", hot: true },
  { seedId: "seed-int-editorial", title: "Pharmacopoeia Editorial & Standards Intern", company: "Pharmacopoeia Commission for Indian Medicine & Homoeopathy (PCIM&H)", location: "Ghaziabad", type: "Hybrid", domain: "AYUSH R&D & Standardisation", ayushSystem: "ayurveda", duration: "3 months", stipendAmount: 17000, stipendMode: "monthly", tags: ["Research Methodology", "Sanskrit", "Writing"], deadline: "2026-12-09", description: "Assist in drafting and proof-reading API/UPI monograph text and translating classical references for pharmacopoeial standards.", minSkillScore: 50, eligibleDepartments: ["Ayurveda Postgraduate (MD/MS Ayu)", "Dravyaguna & Pharmacognosy", "Ayurveda (BAMS)"], color: "#194B63", hot: false },
  { seedId: "seed-int-hospital", title: "AYUSH Hospital Administration Intern", company: "Vaidyaratnam Oushadhasala", location: "Thrissur", type: "Onsite", domain: "AYUSH Public Health & Administration", ayushSystem: "ayurveda", duration: "4 months", stipendAmount: 16000, stipendMode: "monthly", tags: ["Clinical Documentation", "Process Improvement", "Communication"], deadline: "2026-12-11", description: "Support patient-flow analysis, NABH (AYUSH hospital) documentation and IPD–pharmacy coordination at a classical Ayurveda hospital.", minSkillScore: 50, eligibleDepartments: ["AYUSH Hospital Management & Public Health", "Ayurveda (BAMS)", "Panchakarma Therapy Assistant (Diploma)"], color: "#2E93A5", hot: false },
  { seedId: "seed-int-biotech", title: "Pharmacovigilance Intern (ASU&H Drugs)", company: "Emami / Zandu Ayurvedic Pharmacy", location: "Mumbai", type: "Onsite", domain: "AYUSH Pharmacovigilance", ayushSystem: "ayurveda", duration: "6 months", stipendAmount: 22000, stipendMode: "monthly", tags: ["Pharmacovigilance", "Clinical Documentation", "Biostatistics"], deadline: "2026-12-18", description: "Log and assess adverse drug reactions under the Pharmacovigilance Programme for ASU&H drugs and prepare periodic safety summaries.", minSkillScore: 55, eligibleDepartments: ["Ayurvedic Pharmacy (B.Pharm Ayu)", "Ayurveda (BAMS)", "Rasashastra & Bhaishajya Kalpana"], color: "#506030", hot: false },
  { seedId: "seed-int-clinical", title: "Clinical Research Associate Intern – AYUSH Trials", company: "Central Council for Research in Ayurvedic Sciences (CCRAS)", location: "New Delhi", type: "Hybrid", domain: "AYUSH Clinical Research", ayushSystem: "ayurveda", duration: "6 months", stipendAmount: 25000, stipendMode: "monthly", tags: ["Good Clinical Practice", "Clinical Documentation", "Biostatistics"], deadline: "2026-10-05", description: "Support a multi-centre CCRAS trial — CRF design, CTRI registration paperwork, site monitoring and data cleaning.", minSkillScore: 58, eligibleDepartments: ["Ayurveda Postgraduate (MD/MS Ayu)", "Ayurveda (BAMS)", "AYUSH Hospital Management & Public Health"], color: "#6B3C8A", hot: true },
  { seedId: "seed-int-informatics", title: "Health-Tech Developer Intern – AYUSH Telemedicine Platform", company: "Jiva Ayurveda", location: "Remote", type: "Remote", domain: "AYUSH Telemedicine & Health-Tech", ayushSystem: "ayurveda", duration: "3 months", stipendAmount: 25000, stipendMode: "monthly", tags: ["Teleconsultation", "Digital Health Records", "NAMASTE"], deadline: "2026-12-15", description: "Build features for an eSanjeevani-AYUSH-style teleconsultation platform: ABDM-linked records, NAMASTE-coded diagnoses and follow-up reminders.", minSkillScore: 60, eligibleDepartments: [], color: "#3C5A8A", hot: false },
  { seedId: "seed-int-policy", title: "National AYUSH Mission Programme Intern", company: "National AYUSH Mission (NAM) — Ministry of AYUSH", location: "New Delhi", type: "Hybrid", domain: "AYUSH Public Health & Administration", ayushSystem: "ayurveda", duration: "3 months", stipendAmount: 19000, stipendMode: "monthly", tags: ["Public Health", "Research Methodology", "Presentations"], deadline: "2026-12-22", description: "Support state-level NAM proposal reviews and evidence briefs on AYUSH integration in Ayushman Arogya Mandirs.", minSkillScore: 52, eligibleDepartments: ["AYUSH Hospital Management & Public Health", "Swasthavritta & Yoga (Preventive Health)", "Homoeopathy (BHMS)"], color: "#2E93A5", hot: false },
  { seedId: "seed-int-agri", title: "Siddha Vaidya (Clinical Intern)", company: "SKM Siddha & Ayurveda Company", location: "Erode", type: "Onsite", domain: "Siddha", ayushSystem: "siddha", duration: "4 months", stipendAmount: 15000, stipendMode: "monthly", tags: ["Varma", "Clinical Documentation", "Diet & Nutrition"], deadline: "2026-12-02", description: "Clinical posting across Siddha OPD, Varma therapy and external therapies (Thokkanam) with full case documentation.", minSkillScore: 50, eligibleDepartments: ["Siddha (BSMS)"], color: "#8A4A3C", hot: false },
  { seedId: "seed-int-qa", title: "Homoeopathic Physician / Dispensary Intern", company: "Dr. Willmar Schwabe India", location: "Noida", type: "Onsite", domain: "Homoeopathy", ayushSystem: "homoeopathy", duration: "5 months", stipendAmount: 80000, stipendMode: "total", tags: ["Case Taking", "Repertory", "Patient Counselling"], deadline: "2026-10-28", description: "Take and repertorise cases at a company-run dispensary, dispense potencies and maintain follow-up records.", minSkillScore: 50, eligibleDepartments: ["Homoeopathy (BHMS)"], color: "#5A3C8A", hot: false },
];

const SEED_PROGRAMS = [
  { seedId: "seed-prog-genai", title: "Research Methodology & Biostatistics for AYUSH Faculty", organiser: "Central Council for Research in Ayurvedic Sciences (CCRAS)", startDate: "2026-10-06", endDate: "2026-10-10", seats: 40, mode: "Hybrid" },
  { seedId: "seed-prog-bi", title: "Evidence-Based Ayurveda: Designing & Registering Clinical Trials (CTRI)", organiser: "All India Institute of Ayurveda (AIIA), New Delhi", startDate: "2026-10-20", endDate: "2026-10-24", seats: 30, mode: "Online", meetingUrl: "https://meet.example.edu/ctri-faculty-2026" },
  { seedId: "seed-prog-cloud", title: "AYUSH Telemedicine, Ayush Grid & ABDM Integration for Educators", organiser: "National Institute of Ayurveda (NIA), Jaipur", startDate: "2026-11-03", endDate: "2026-11-07", seats: 50, mode: "Online", meetingUrl: "https://meet.example.edu/ayush-grid-2026" },
  { seedId: "seed-prog-robotics", title: "HPTLC Fingerprinting & ASU Drug Standardisation (API/UPI/SPI)", organiser: "Institute of Teaching & Research in Ayurveda (ITRA), Jamnagar", startDate: "2026-11-17", endDate: "2026-11-21", seats: 35, mode: "Hybrid" },
  { seedId: "seed-prog-law", title: "Schedule T GMP, AYUSH Drug Licensing & the AYUSH Premium Mark", organiser: "Pharmacopoeia Commission for Indian Medicine & Homoeopathy (PCIM&H)", startDate: "2026-11-24", endDate: "2026-11-28", seats: 45, mode: "Online", meetingUrl: "https://meet.example.edu/gmp-licensing-2026" },
  { seedId: "seed-prog-obe", title: "Outcome-Based Education & NCISM Curriculum Readiness", organiser: "National Institute of Unani Medicine (NIUM), Bengaluru", startDate: "2026-12-01", endDate: "2026-12-03", seats: 60, mode: "Online", meetingUrl: "https://meet.example.edu/ncism-obe-2026" },
  { seedId: "seed-prog-clinical", title: "Yoga Therapy Protocols for Lifestyle Disorders — Faculty Programme", organiser: "Morarji Desai National Institute of Yoga (MDNIY), New Delhi", startDate: "2026-12-15", endDate: "2026-12-17", seats: 55, mode: "Hybrid" },
];

export const SEED_COLLABS = [
  { id: "collab_1", title: "Standardised Ashwagandha Extract for Stress & Sleep — Multi-Centre RCT", initiator: "Himalaya Wellness Company", type: "Industry", status: "Pending Review", deadline: "Oct 10", expertise: ["AYUSH Clinical Trials & Good Clinical Practice", "Dravyaguna & Medicinal Plant Pharmacology"], funded: true },
  { id: "collab_2", title: "Yoga & Pathya-Apathya Protocol for Type 2 Diabetes — Multi-Centre Outcome Study", initiator: "National Institute of Ayurveda (NIA), Jaipur", type: "Academic", status: "Active", deadline: "Ongoing", expertise: ["AYUSH Clinical Trials & Good Clinical Practice", "Yoga Therapy & Lifestyle Medicine"], funded: true },
  { id: "collab_3", title: "Heavy-Metal Safety Profiling of Classical Rasaushadhis (Bhasmas)", initiator: "Baidyanath Group", type: "Industry", status: "Pending Review", deadline: "Oct 18", expertise: ["Rasashastra & Bhaishajya Kalpana (ASU Formulation)", "Pharmacognosy, HPTLC & Raw Drug Standardisation"], funded: true },
  { id: "collab_4", title: "Low-Cost Panchakarma Equipment for Rural AYUSH Wellness Centres", initiator: "Gujarat Ayurved University, Jamnagar", type: "Academic", status: "Active", deadline: "Dec 2026", expertise: ["Panchakarma & Clinical Ayurveda", "Public Health & AYUSH Epidemiology"], funded: false },
  { id: "collab_5", title: "Varma Therapy Outcomes in Musculoskeletal Pain — Siddha Clinical Study", initiator: "National Institute of Siddha (NIS), Chennai", type: "Academic", status: "Pending Review", deadline: "Nov 14", expertise: ["Siddha Gunapadam & Varma Therapy", "AYUSH Clinical Trials & Good Clinical Practice"], funded: true },
  { id: "collab_6", title: "NAMASTE Terminology Mapping for eSanjeevani-AYUSH Records", initiator: "Ayush Grid Cell, Ministry of AYUSH", type: "Govt", status: "Active", deadline: "Ongoing", expertise: ["AYUSH Digital Health & Telemedicine", "Public Health & AYUSH Epidemiology"], funded: true },
  { id: "collab_7", title: "AYUSH Integration in Ayushman Arogya Mandirs — District Outcome Evaluation", initiator: "National AYUSH Mission (NAM)", type: "Govt", status: "Pending Review", deadline: "Nov 30", expertise: ["Public Health & AYUSH Epidemiology", "Naturopathy & Dietetics"], funded: true },
];

/** The sample collaboration calls — part of the demo tour only. */
export function sampleCollabs() {
  return isDemoMode() ? SEED_COLLABS : [];
}

export const TEST_WEIGHT = { Online: 1, Offline: 1.5 };

function futureDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
}

function pastDate(daysAgo) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

function hoursAgoDateTime(hours) {
  // Built from local date/time parts (not toISOString, which is UTC) because
  // getScheduledTimestamp() reconstructs the Date from these as local time.
  const d = new Date(Date.now() - hours * 3600000);
  const pad = (n) => String(n).padStart(2, "0");
  const scheduledAt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const scheduledTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { scheduledAt, scheduledTime };
}

function seedSkillTests() {
  return [
    {
      title: "General Quantitative Aptitude Screening",
      domain: "Quantitative Aptitude",
      ayushSystem: "ayurveda",
      hostName: "Dabur India Ltd.",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(4),
      scheduledTime: "10:30",
      description: "The standard placement-style quantitative assessment: arithmetic, percentages, ratios, dosage and dispensary calculations.",
      prerequisites: "Class 10/12 level arithmetic, algebra, and basic data interpretation.",
      certification: "Dabur Quantitative Aptitude Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No calculators, phones, or external notes are allowed.",
      ],
    },
    {
      title: "AYUSH Digital Health & Telemedicine Readiness",
      domain: "AYUSH Digital Health & Telemedicine",
      ayushSystem: "ayurveda",
      hostName: "Jiva Ayurveda",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(8),
      scheduledTime: "16:00",
      description: "eSanjeevani-AYUSH teleconsultation practice, Ayush Grid, ABDM/ABHA-linked records, NAMASTE terminology coding and interoperability basics.",
      prerequisites: "Familiarity with any AYUSH OPD workflow and basic computer use.",
      certification: "Jiva AYUSH Telemedicine Readiness Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No second device, notes or AI assistants may be used during the assessment.",
      ],
    },
    {
      title: "Logical Reasoning & Clinical Problem Decomposition",
      domain: "Logical Reasoning",
      ayushSystem: "ayurveda",
      hostName: "Patanjali Ayurved Ltd.",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      ...hoursAgoDateTime(2),
      description: "Placement screening on syllogisms, series completion, pattern identification, and deduction.",
      prerequisites: "General logical reasoning and problem decomposition skills.",
      certification: "Patanjali Logical Aptitude Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No notes, phones, or external references are allowed.",
      ],
    },
    {
      title: "Health Data Analysis & Statistical Interpretation Challenge",
      domain: "Data Analysis & Interpretation",
      ayushSystem: "ayurveda",
      hostName: "Central Council for Research in Ayurvedic Sciences (CCRAS)",
      mode: "Online",
      duration: "15 mins",
      price: 99,
      scheduledAt: futureDate(6),
      scheduledTime: "14:00",
      description: "Practical interpretation of OPD, trial and pharmacovigilance data: distributions, statistical metrics, trend identification, and chart reading.",
      prerequisites: "Foundations of descriptive statistics and chart reading.",
      certification: "CCRAS Health Data Interpretation Certificate",
      rules: [
        "Ensure a stable internet connection before joining.",
        "Keep your camera on for the full duration.",
        "Switching browser tabs during the test may flag your attempt for review.",
      ],
    },
    {
      title: "Critical Thinking & Root Cause Analysis for AYUSH Practice",
      domain: "Problem Solving & Critical Thinking",
      ayushSystem: "ayurveda",
      hostName: "Himalaya Wellness Company",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(3),
      scheduledTime: "09:00",
      description: "Clinical and manufacturing scenario resolution: adverse-event escalation, cognitive biases, five-whys analysis, and structured decision making.",
      prerequisites: "Problem-solving and analytical reasoning mindset.",
      certification: "Himalaya Systems Thinking Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "External reference materials are not permitted.",
      ],
    },
    {
      title: "AYUSH Research Methodology & Clinical Documentation Quiz",
      domain: "AYUSH Research & Clinical Documentation",
      ayushSystem: "ayurveda",
      hostName: "Central Council for Research in Ayurvedic Sciences (CCRAS)",
      mode: "Online",
      duration: "15 mins",
      price: 199,
      scheduledAt: futureDate(7),
      scheduledTime: "11:00",
      description: "CTRI registration, informed consent, control groups, case record forms, citation of classical and journal sources, and research ethics.",
      prerequisites: "An introductory research methodology course or a completed UG dissertation.",
      certification: "CCRAS Research Readiness Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No AI assistants or search engines may be used during the quiz.",
      ],
    },
    {
      title: "ASU&H Clinical Fundamentals Screening",
      domain: "ASU&H Clinical Fundamentals",
      ayushSystem: "ayurveda",
      hostName: "Arya Vaidya Sala, Kottakkal",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(5),
      scheduledTime: "11:30",
      description: "Tridosha and Mukkutram theory, classical texts, Unani humoral theory, homoeopathic principles and clinical reasoning across the ASU&H systems.",
      prerequisites: "First-professional BAMS, BHMS, BUMS, BSMS or BNYS coursework.",
      certification: "Arya Vaidya Sala Clinical Readiness Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No notes, phones, or external references are allowed.",
      ],
    },
    {
      title: "Herbal Drug Quality, GMP & Pharmacognosy Assessment",
      domain: "Herbal Drug Quality, GMP & Pharmacognosy",
      ayushSystem: "ayurveda",
      hostName: "Baidyanath Group",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(9),
      scheduledTime: "15:00",
      description: "Schedule T GMP, Ayurvedic Pharmacopoeia of India monographs, HPTLC fingerprinting, heavy-metal limits and Rasashastra preparations.",
      prerequisites: "Any Dravyaguna, Rasashastra, B.Pharm (Ayu) or pharmacognosy coursework.",
      certification: "Baidyanath Herbal Drug Quality Badge",
      rules: [
        "Ensure a stable internet connection before joining.",
        "Keep your camera on for the full duration.",
        "Pharmacopoeia volumes and reference charts are not permitted during the assessment.",
      ],
    },
    {
      title: "AYUSH Practice Management, Ethics & Regulation Round",
      domain: "AYUSH Practice Management & Ethics",
      ayushSystem: "ayurveda",
      hostName: "Dabur India Ltd.",
      mode: "Offline",
      duration: "60 mins",
      price: 0,
      scheduledAt: futureDate(10),
      reportingTime: "09:30 AM (session starts 10:00 AM sharp)",
      venue: "Dabur Research Foundation, Sahibabad, Ghaziabad",
      description: "In-person case study deliberation on NCISM/NCH regulation, patient confidentiality, the AYUSH Premium Mark and National AYUSH Mission scenarios, plus a collaborative team challenge.",
      prerequisites: "Final-year standing in any AYUSH programme.",
      certification: "Dabur AYUSH Professional Practice Certificate",
      documentsRequired: ["College ID / Govt Photo ID", "Printed resume (2 copies)", "Registration confirmation printout"],
      rules: [
        "Report at least 30 minutes before the session start time.",
        "Formal professional attire is expected.",
        "Electronic devices must be switched off during the evaluation rounds.",
      ],
    },
  ].map((t, i) => ({ ...t, seedId: `seed-test-${i + 1}` }));
}

/**
 * Seeds the sample catalogue, idempotently.
 *
 * This used to be a one-shot flag guarding three `write()` calls, each of
 * which REPLACED a whole collection. That is fine exactly once: bump the seed
 * and a recruiter's own live postings are wiped along with the old samples,
 * because their rows live in the same collection. So the seed now upserts by a
 * stable `seedId` instead — new sample rows appear, changed ones are refreshed,
 * and anything a real account created is never touched.
 *
 * Only ever runs inside the demo namespace. A real account's portal starts
 * empty and stays that way until real people post, register and apply.
 */
export function ensureSeeded() {
  if (!isBrowser()) return;
  if (!isDemoMode()) {
    purgeLegacySamples();
    return;
  }
  if (window.localStorage.getItem(nsKey(SEED_VERSION_KEY))) return;

  /* Sample rows from before seedIds existed. They carry ownerId "seed", so
     they are unambiguously ours to remove — without this, the old catalogue
     and the new one both show and the listing doubles. */
  ["internships", "programs", "skillTests"].forEach((collection) => {
    write(collection, read(collection).filter((row) => row.ownerId !== "seed" || row.seedId));
  });

  upsertSeedRows("internships", SEED_INTERNSHIPS, () => ({
    ownerId: "seed",
    status: "Open",
    postedAt: new Date().toISOString(),
    views: 0,
    uniqueViews: 0,
  }));
  upsertSeedRows("programs", SEED_PROGRAMS, (p) => ({
    ownerId: "seed",
    enrolled: Math.floor(p.seats * (0.2 + Math.random() * 0.6)),
    status: "Open",
  }));
  upsertSeedRows("skillTests", seedSkillTests(), () => ({
    ownerId: "seed",
    status: "Open",
    postedAt: new Date().toISOString(),
  }));

  window.localStorage.setItem(nsKey(SEED_VERSION_KEY), "1");
  // Retire the flags of earlier seed generations so a browser that has been
  // through several releases doesn't keep re-running them.
  ["seeded", "seededV2", "seededV3"].forEach((key) => window.localStorage.removeItem(nsKey(key)));
}

/**
 * Removes sample data that earlier releases seeded into the REAL namespace.
 *
 * Before demo mode had its own namespace, the sample catalogue and the demo
 * cohort were written alongside a real account's rows in the same browser, so
 * a genuine student saw twenty sample postings and a recruiter saw a cohort of
 * sixty students they never imported. Runs once per browser: every collection
 * is filtered down to rows nobody in the sample data owns, and rows a real
 * account created are left exactly where they are.
 */
const LEGACY_SAMPLES_PURGED_KEY = "samplesPurgedV1";
const LEGACY_DEMO_INSTITUTIONS = new Set([
  "All India Institute of Ayurveda (AIIA), New Delhi",
  "Apex University of Technology & Applied Sciences",
]);

function isSampleRow(row) {
  if (!row || typeof row !== "object") return false;
  const startsDemo = (v) => typeof v === "string" && v.startsWith("demo-");
  if (row.ownerId === "seed" || row.seedId) return true;
  if ([row.id, row.ownerId, row.studentId, row.userId, row.facultyId, row.issuerId, row.companyOwnerId, row.internshipId].some(startsDemo)) return true;
  // Institution-level rows (profile, admins, MOUs, drives, notices, history)
  // carry no demo id, only the demo institution's name.
  if (LEGACY_DEMO_INSTITUTIONS.has(row.instituteName)) return true;
  if (typeof row.collabId === "string" && row.collabId.startsWith("collab_")) return true;
  return false;
}

function purgeLegacySamples() {
  if (!isBrowser()) return;
  try {
    if (window.localStorage.getItem(NS + LEGACY_SAMPLES_PURGED_KEY)) return;
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(NS) && !key.startsWith(NS + DEMO_NS)) keys.push(key);
    }
    keys.forEach((key) => {
      let rows;
      try {
        rows = JSON.parse(window.localStorage.getItem(key) || "null");
      } catch {
        return;
      }
      if (!Array.isArray(rows)) return;
      const kept = rows.filter((row) => !isSampleRow(row));
      if (kept.length !== rows.length) window.localStorage.setItem(key, JSON.stringify(kept));
    });
    ["seeded", "seededV2", "demoSeeded", "demoSeededV2", "demoSeededV3", "demoSeededV4", "demoSeededV5"].forEach((key) =>
      window.localStorage.removeItem(NS + key)
    );
    window.localStorage.setItem(NS + LEGACY_SAMPLES_PURGED_KEY, "1");
  } catch {
    // ignore — a purge that cannot run simply runs on the next load
  }
}

/**
 * Replaces placeholder attachments left in browsers by earlier releases.
 *
 * Sample notices used to be seeded with `{ url: "#" }`. A download control
 * pointed at that saves the current HTML page under a `.pdf` name — the file
 * appears in Downloads and then refuses to open. Re-running the demo seed to
 * fix them would duplicate every other sample row, so this repairs the
 * attachments in place instead, once.
 */
const ATTACHMENT_REPAIR_KEY = "attachmentsRepairedV1";

function repairPlaceholderAttachments() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(nsKey(ATTACHMENT_REPAIR_KEY))) return;
  window.localStorage.setItem(nsKey(ATTACHMENT_REPAIR_KEY), "1");

  const rows = read("announcements");
  let changed = false;
  rows.forEach((row) => {
    const a = row.attachment;
    if (!a || hasFile(a)) return;
    Object.assign(a, sampleAttachment(a.name || "Document.pdf", row.title || "Notice", [row.body || ""]));
    changed = true;
  });
  if (changed) write("announcements", rows);
}

/** Inserts or refreshes each seed row, matched on its stable `seedId`. */
function upsertSeedRows(collection, rows, extraFor) {
  const existing = read(collection);
  const bySeedId = new Map(existing.filter((r) => r.seedId).map((r) => [r.seedId, r]));

  rows.forEach((row) => {
    const current = bySeedId.get(row.seedId);
    if (current) {
      Object.assign(current, row);
    } else {
      existing.push({ id: genId("seed"), ...row, ...extraFor(row) });
    }
  });
  write(collection, existing);
}

function insertLocal(doc, extra) {
  return { id: genId("seed"), ...doc, ...extra };
}

/* ============================================================
   Internships
   ============================================================ */

/**
 * Every posting this device knows about.
 *
 * Reading also kicks off a pull from the shared database, throttled so a page
 * that lists postings a dozen times per render doesn't make a dozen requests.
 * The pull broadcasts a mutation when it actually changes something, and every
 * screen here already subscribes to that — so a posting published on another
 * device appears without any of them being made async.
 */
export function listInternships() {
  ensureSeeded();
  autoCloseExpiredPostings();
  pullRemotePostings();
  return all("internships").sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

const REMOTE_PULL_INTERVAL_MS = 20000;
let lastRemotePullAt = 0;

function pullRemotePostings({ force = false } = {}) {
  if (!isBrowser()) return;
  const now = Date.now();
  if (!force && now - lastRemotePullAt < REMOTE_PULL_INTERVAL_MS) return;
  lastRemotePullAt = now;
  mirrorToServer((m) => m.syncRemotePostings());
}

/** Forces an immediate pull — used when a screen is opened or refreshed by hand. */
export function refreshPostingsFromServer() {
  pullRemotePostings({ force: true });
}

export function listInternshipsByOwner(ownerId) {
  autoCloseExpiredPostings();
  pullRemotePostings();
  return findMany("internships", (i) => i.ownerId === ownerId);
}

/**
 * A posting past its deadline stops accepting applications on its own, but a
 * recruiter can still reopen it manually. `manualStatus` records a deliberate
 * pause/reopen so the sweep never overrides an explicit decision.
 */
export function autoCloseExpiredPostings() {
  if (!isBrowser()) return;
  const today = new Date().toISOString().slice(0, 10);
  read("internships").forEach((i) => {
    if (i.manualStatus) return;
    if (i.status === "Open" && i.deadline && i.deadline < today) {
      update("internships", i.id, { status: "Closed", closedReason: "Deadline passed" });
    }
  });
}

/**
 * Total views count once per browser session; unique views count once per
 * browser, ever — so a recruiter can tell repeat interest from reach.
 */
export function recordInternshipView(internshipId) {
  if (typeof window === "undefined") return;
  const internship = findOne("internships", (i) => i.id === internshipId);
  if (!internship) return;

  const sessionKey = "ayusetu:viewed-internships";
  const everKey = "ayusetu:viewed-internships-ever";
  const patch = {};

  const seenThisSession = new Set(JSON.parse(window.sessionStorage.getItem(sessionKey) || "[]"));
  if (!seenThisSession.has(internshipId)) {
    seenThisSession.add(internshipId);
    window.sessionStorage.setItem(sessionKey, JSON.stringify([...seenThisSession]));
    patch.views = (internship.views || 0) + 1;
  }

  const seenEver = new Set(JSON.parse(window.localStorage.getItem(everKey) || "[]"));
  if (!seenEver.has(internshipId)) {
    seenEver.add(internshipId);
    window.localStorage.setItem(everKey, JSON.stringify([...seenEver]));
    patch.uniqueViews = (internship.uniqueViews || 0) + 1;
  }

  if (Object.keys(patch).length) update("internships", internshipId, patch);
}

/**
 * Publishes a posting.
 *
 * The local write is what the recruiter sees immediately. The mirror to the
 * shared database is what makes a student on a different device see it at all
 * — without it a posting lives and dies in one browser profile, which is
 * exactly the bug this pairing fixes. The import is dynamic to keep
 * lib/postings.js (which reads from here) out of a static import cycle, and
 * the mirror is deliberately not awaited: publishing must not fail because the
 * network did.
 */
/**
 * Publishing a posting.
 *
 * The deadline has to be at least two days out. A role that closes tomorrow is
 * only open to whoever happens to be looking at the listings tonight, which is
 * the opposite of what a deadline is for.
 */
export function createInternship(ownerId, company, data) {
  const leadError = checkLeadTime(data?.deadline, "23:59", APPLICATION_LEAD_HOURS, "An application deadline");
  if (leadError) throw new Error(leadError);
  const record = insert("internships", {
    ...data,
    ownerId,
    company,
    status: "Open",
    postedAt: new Date().toISOString(),
    views: 0,
    uniqueViews: 0,
    color: data.color || randomColor(),
  });
  mirrorToServer((m) => m.mirrorPosting(record));
  return record;
}

/** Best-effort push to the shared database; never blocks or throws. */
function mirrorToServer(run) {
  if (!isBrowser()) return;
  import("./postings")
    .then(run)
    .catch(() => {
      /* offline, or no session — the next successful write re-syncs */
    });
}

/** Local edit plus a mirror, for anything a recruiter changes on a posting. */
export function patchInternship(internshipId, patch) {
  const updated = update("internships", internshipId, patch);
  if (updated) mirrorToServer((m) => m.mirrorPostingPatch(internshipId, patch));
  return updated;
}

/** Clone a posting for a recurring role — a fresh draft, no inherited stats. */
export function cloneInternship(internshipId) {
  const source = findOne("internships", (i) => i.id === internshipId);
  if (!source) return null;
  const { id, seedId, views, uniqueViews, postedAt, status, manualStatus, closedReason, ...rest } = source;
  const record = insert("internships", {
    ...rest,
    title: `${source.title} (Copy)`,
    deadline: futureDate(30),
    status: "Open",
    postedAt: new Date().toISOString(),
    views: 0,
    uniqueViews: 0,
  });
  mirrorToServer((m) => m.mirrorPosting(record));
  return record;
}

export function setPostingStatus(internshipId, status) {
  return patchInternship(internshipId, { status, manualStatus: true, closedReason: null });
}

export const PIPELINE_STAGES = ["Applied", "Shortlisted", "Interview", "Hired"];
export const TERMINAL_STAGES = ["Rejected", "Withdrawn"];
export const ALL_APPLICATION_STATUSES = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

export function listApplications() {
  return all("applications");
}

export function listApplicationsForStudent(studentId) {
  return findMany("applications", (a) => a.studentId === studentId);
}

export function listApplicationsForOwner(ownerId) {
  const myInternshipIds = new Set(listInternshipsByOwner(ownerId).map((i) => i.id));
  return findMany("applications", (a) => myInternshipIds.has(a.internshipId));
}

export function listApplicationsForCompany(companyName) {
  if (!companyName) return [];
  return findMany("applications", (a) => a.company === companyName);
}

/**
 * Records an application.
 *
 * The match percentage and the eligibility decision are computed HERE, from
 * the student's stored assessment and the posting's own criteria — they are
 * never taken from the caller. The screens that display a match do so from the
 * same function, so what a student sees and what is written to their
 * application cannot disagree, and a figure edited on the way in is ignored
 * rather than trusted.
 *
 * The `match` parameter is accepted only so existing call sites keep compiling;
 * it is deliberately unused.
 */
export function applyToInternship(internship, student, _ignoredMatch, note) {
  const existing = findOne(
    "applications",
    (a) => a.internshipId === internship.id && a.studentId === student.id
  );
  if (existing) return existing;

  const assessment = getAssessment(student.id);
  const eligibility = checkEligibility(internship, student, assessment);
  if (!eligibility.eligible) {
    throw new Error(`You do not meet the criteria for this posting. ${eligibility.reasons.join(" ")}`);
  }

  /* A resume is required, and it is checked here rather than only in the
     dialog — the dialog can be bypassed, this cannot. The document is copied
     onto the application at submission, so a recruiter opening it months later
     sees the version that was actually sent, not whatever the student has
     uploaded since. */
  const resume = getResume(student.id);
  if (!resume) {
    throw new Error("RESUME_REQUIRED");
  }

  const appliedAt = new Date().toISOString();
  return insert("applications", {
    internshipId: internship.id,
    internshipTitle: internship.title,
    company: internship.company,
    studentId: student.id,
    studentName: student.name,
    studentInstitution: student.institution || student.instituteName || "",
    studentCourse: student.course || "",
    studentYear: student.year || "",
    studentDepartment: student.department || "",
    note: note || "",
    resumeFileName: resume.fileName || "Resume.pdf",
    resumeDataUrl: resume.dataUrl || null,
    match: computeMatch(internship, assessment),
    status: "Applied",
    appliedAt,
    statusHistory: [{ status: "Applied", at: appliedAt }],
  });
}

/**
 * The student's current resume, or null.
 *
 * "Has a resume" means a document of type Resume that actually carries a file.
 * A row with a filename but no data behind it — which is what the old sample
 * profile held — is not a resume; it is a broken link waiting to happen.
 */
export function getResume(studentId) {
  const docs = getPortfolio(studentId)?.documents || [];
  const resumes = docs.filter((d) => d.type === "Resume" && hasFile(d));
  if (!resumes.length) return null;
  return resumes.sort((a, b) => String(b.uploadedAt || "").localeCompare(String(a.uploadedAt || "")))[0];
}

export function hasResume(studentId) {
  return Boolean(getResume(studentId));
}

export const createApplication = applyToInternship;

/**
 * `extra` carries stage-specific fields the recruiter supplied — today that is
 * `rejectionReason`, so a rejected candidate is told *why* rather than just
 * watching their application go quiet.
 */
export function updateApplicationStatus(id, status, extra = {}) {
  const existing = findOne("applications", (a) => a.id === id);
  const now = new Date().toISOString();
  const statusHistory = [...(existing?.statusHistory || []), { status, at: now, ...(extra.rejectionReason ? { note: extra.rejectionReason } : {}) }];
  const patch = { status, statusHistory, ...extra };
  if (status === "Rejected") patch.rejectedAt = now;
  // Restoring a candidate must clear the previous rejection, or the old reason
  // keeps rendering on a card that is back in the live pipeline.
  if (status !== "Rejected" && existing?.rejectionReason) {
    patch.rejectionReason = null;
    patch.rejectedAt = null;
  }
  const updated = update("applications", id, patch);
  if (existing?.studentId) {
    const role = existing.internshipTitle || "Internship";
    const company = existing.company || "Company";
    const message =
      status === "Rejected"
        ? `Your application for "${role}" at ${company} was not taken forward.${extra.rejectionReason ? ` Reason: ${extra.rejectionReason}` : ""}`
        : `Your application for "${role}" at ${company} was moved to ${status}.`;
    notifyStudent(existing.studentId, message, company);
  }
  return updated;
}

/**
 * Recruiter-only fields on an application record — interview mode, private
 * notes, offer/joining tracking. These live on the APPLICATION (owned by the
 * hiring company), never on the student's own user/portfolio record, so a
 * company can never edit a candidate's actual profile data.
 */
export function updateApplicationRecruiterFields(id, patch) {
  return update("applications", id, patch);
}

export const OFFER_STAGES = ["Not sent", "Offer sent", "Offer accepted", "Offer declined", "Joined"];

export function setOfferStage(applicationId, offerStage, extra = {}) {
  const now = new Date().toISOString();
  const current = findOne("applications", (a) => a.id === applicationId);
  // offerSentAt is stamped once, when the offer first leaves the building, and
  // then left alone — it is the "Offered" date, not the last-touched date.
  const offerSentAt = current?.offerSentAt || (offerStage !== "Not sent" ? now : undefined);
  return update("applications", applicationId, { offerStage, offerSentAt, offerUpdatedAt: now, ...extra });
}

/* ============================================================
   Industry team accounts
   ============================================================ */

export function listRecruiters(companyOwnerId) {
  return findMany("recruiters", (r) => r.companyOwnerId === companyOwnerId);
}

export function addRecruiter(companyOwnerId, data) {
  return insert("recruiters", { companyOwnerId, addedAt: new Date().toISOString(), ...data });
}

export function updateRecruiter(id, patch) {
  return update("recruiters", id, patch);
}

export function removeRecruiter(id) {
  remove("recruiters", id);
}

export function assignPostingToRecruiter(internshipId, recruiterId, recruiterName) {
  return update("internships", internshipId, { recruiterId, recruiterName });
}

/* ============================================================
   Company reviews (from past interns and hires)
   ============================================================ */

export function listCompanyReviews(companyName) {
  return findMany("companyReviews", (r) => r.company === companyName);
}

export function addCompanyReview(companyName, review) {
  return insert("companyReviews", { company: companyName, createdAt: new Date().toISOString(), ...review });
}

export function companyRating(companyName) {
  const reviews = listCompanyReviews(companyName);
  if (!reviews.length) return null;
  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  return { average: Math.round(avg * 10) / 10, count: reviews.length };
}

/* ============================================================
   Skill tests, registrations & assessment results
   ============================================================ */

export function listSkillTests() {
  ensureSeeded();
  pullRemoteSkillTests();
  return all("skillTests");
}

export function listSkillTestsByOwner(ownerId) {
  pullRemoteSkillTests();
  return findMany("skillTests", (t) => t.ownerId === ownerId);
}

let lastTestPullAt = 0;

/* Same throttled pull as postings: tests published on another device arrive
   on the next read and broadcast a mutation when anything changed. */
function pullRemoteSkillTests({ force = false } = {}) {
  if (!isBrowser()) return;
  const now = Date.now();
  if (!force && now - lastTestPullAt < REMOTE_PULL_INTERVAL_MS) return;
  lastTestPullAt = now;
  mirrorTests((m) => m.syncRemoteSkillTests());
}

export function refreshSkillTestsFromServer() {
  pullRemoteSkillTests({ force: true });
}

/** Best-effort push of a test edit to the shared database; never blocks or throws. */
function mirrorTests(run) {
  if (!isBrowser()) return;
  import("./skillTestSync")
    .then(run)
    .catch(() => {
      /* offline, or no session — the next successful write re-syncs */
    });
}

export function getSkillTest(testId) {
  return findOne("skillTests", (t) => t.id === testId);
}

/**
 * Publishing a test.
 *
 * A date and a time are mandatory — an undated test showed on a student's card
 * as "Flexible", which is not a thing anyone can turn up to — and the sitting
 * has to be at least three days out, so a registered candidate always gets
 * real notice rather than finding out the morning of.
 */
export function createSkillTest(ownerId, hostName, data) {
  const leadError = checkLeadTime(data?.scheduledAt, data?.scheduledTime, TEST_LEAD_HOURS, "A skill test");
  if (leadError) throw new Error(leadError);
  return insert("skillTests", { ...data, ownerId, hostName, status: "Open", postedAt: new Date().toISOString() });
}

/** A host's own edit to a test they published — local first, then mirrored. */
export function patchSkillTest(testId, patch) {
  const updated = update("skillTests", testId, patch);
  if (updated) mirrorTests((m) => m.mirrorSkillTestPatch(testId, patch));
  return updated;
}

export function getScheduledTimestamp(test) {
  if (!test?.scheduledAt) return null;
  const time = test.scheduledTime || "00:00";
  const ts = new Date(`${test.scheduledAt}T${time}`).getTime();
  return Number.isNaN(ts) ? null : ts;
}

/** Minutes a test runs for, read off its free-text duration ("60 mins"). */
export function testDurationMinutes(test) {
  const m = /(\d+)/.exec(String(test?.duration || ""));
  const minutes = m ? Number(m[1]) : 15;
  return Math.max(5, Math.min(600, minutes));
}

/** When the sitting is over — scheduled start plus the test's own length. */
export function getTestEndTimestamp(test) {
  const start = getScheduledTimestamp(test);
  if (start == null) return null;
  return start + testDurationMinutes(test) * 60000;
}

/** Certificates are a record of a completed test, so they wait for one. */
export function hasTestEnded(test) {
  const end = getTestEndTimestamp(test);
  return end != null && Date.now() >= end;
}

const MEETING_LINK_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * Recruiters must publish the meeting link at least 24 hours before the test
 * starts, so registered students always get a full day's notice.
 */
export function setSkillTestMeetingLink(testId, meetingLink) {
  const test = findOne("skillTests", (t) => t.id === testId);
  if (!test) throw new Error("Test not found.");
  if (test.mode !== "Online") throw new Error("Only online tests have a meeting link.");
  const scheduled = getScheduledTimestamp(test);
  if (scheduled && scheduled - Date.now() < MEETING_LINK_LEAD_TIME_MS) {
    throw new Error("The meeting link must be set at least 24 hours before the test's scheduled start time.");
  }
  return patchSkillTest(testId, { meetingLink });
}

export function startSkillTest(testId) {
  const test = findOne("skillTests", (t) => t.id === testId);
  if (!test) throw new Error("Test not found.");
  if (test.mode === "Online" && !test.meetingLink?.trim()) {
    throw new Error("A valid meeting link is required before starting an online test.");
  }
  return patchSkillTest(testId, { startedAt: new Date().toISOString(), status: "In Progress" });
}

export function rescheduleSkillTest(testId, { scheduledAt, scheduledTime, reportingTime }) {
  const test = findOne("skillTests", (t) => t.id === testId);
  if (!test) throw new Error("Test not found.");

  if (test.mode === "Offline") {
    const scheduled = getScheduledTimestamp(test);
    if (scheduled && scheduled - Date.now() < 24 * 60 * 60 * 1000) {
      throw new Error("Cannot reschedule on-site tests within 24 hours of scheduled start time.");
    }
  }

  // The new date has to give the same notice a new test would.
  const leadError = checkLeadTime(scheduledAt, scheduledTime || reportingTime, TEST_LEAD_HOURS, "A rescheduled test");
  if (leadError) throw new Error(leadError);

  const patch = {
    scheduledAt,
    ...(scheduledTime ? { scheduledTime } : {}),
    ...(reportingTime ? { reportingTime } : {}),
  };
  const updated = patchSkillTest(testId, patch);

  const registrations = findMany("skillTestRegistrations", (r) => r.testId === testId);
  registrations.forEach((r) => {
    notifyStudent(
      r.userId,
      `Schedule update: "${test.title}" has been rescheduled to ${formatDate(scheduledAt)} at ${scheduledTime || reportingTime || "scheduled time"}.`,
      test.hostName || "Test Host",
      { testId }
    );
  });

  return updated;
}

export function getRegistration(testId, userId) {
  return findOne("skillTestRegistrations", (r) => r.testId === testId && r.userId === userId);
}

export function isRegisteredForSkillTest(testId, userId) {
  return !!getRegistration(testId, userId);
}

export function listRegistrationsForStudent(userId) {
  return findMany("skillTestRegistrations", (r) => r.userId === userId);
}

export function registerForSkillTest(testId, userId, info) {
  const existing = getRegistration(testId, userId);
  if (existing) return existing;
  return insert("skillTestRegistrations", {
    testId,
    userId,
    ...info,
    paymentStatus: info?.paid ? "paid" : "not_required",
    missedRecorded: false,
    attended: false,
    registeredAt: new Date().toISOString(),
  });
}

export function getAttemptForTest(studentId, testId) {
  return findOne("assessmentAttempts", (a) => a.studentId === studentId && a.testId === testId);
}

export function getAssessment(studentId) {
  return findOne("assessments", (a) => a.studentId === studentId);
}

export function getAttemptsForStudent(studentId) {
  pullRemoteCredentials();
  return findMany("assessmentAttempts", (a) => a.studentId === studentId);
}

function recalculateAssessment(studentId) {
  const attempts = getAttemptsForStudent(studentId);
  const byDomain = {};
  attempts.forEach((a) => {
    const w = a.weight || 1;
    if (!byDomain[a.domain]) byDomain[a.domain] = { sum: 0, weight: 0 };
    byDomain[a.domain].sum += a.score * w;
    byDomain[a.domain].weight += w;
  });
  const domainScores = {};
  Object.entries(byDomain).forEach(([d, { sum, weight }]) => {
    domainScores[d] = Math.round(sum / weight);
  });
  const values = Object.values(domainScores);
  const overallScore = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const strongTags = Object.entries(domainScores).filter(([, v]) => v >= 70).map(([k]) => k);

  const existing = getAssessment(studentId);
  const record = { domainScores, overallScore, strongTags, updatedAt: new Date().toISOString() };
  if (existing) return update("assessments", existing.id, record);
  return insert("assessments", { studentId, ...record });
}

function awardCertificationIfEarned(studentId, testId, scorePct) {
  const test = getSkillTest(testId);
  if (!test?.certification || scorePct < 50) return;
  const portfolio = getPortfolio(studentId) || {};
  const certs = portfolio.certifications || [];
  const already = certs.some((c) => c.name === test.certification && c.issuer === test.hostName);
  if (already) return;
  savePortfolio(studentId, {
    certifications: [...certs, { name: test.certification, issuer: test.hostName, year: String(new Date().getFullYear()), score: `${scorePct}%` }],
  });
}

/**
 * Writes an attempt into this device's cache.
 *
 * IMPORTANT: this is a mirror, not a marker. The score always comes from
 * somewhere that actually computed it — the server grader for an online paper,
 * the host for an in-person one, or zero for a test that was missed. Nothing in
 * the UI may invent a number and pass it here; that is exactly what the old
 * "Mark as Completed" button did, awarding a flat 85% to every student on every
 * test regardless of what they knew.
 */
export function recordAssessmentResult(studentId, testId, domain, scorePct, weight = 1, missed = false, extra = {}) {
  const score = Math.max(0, Math.min(100, Math.round(scorePct)));
  const existingAttempt = getAttemptForTest(studentId, testId);
  const record = { score, weight, missed, ...extra, completedAt: new Date().toISOString() };

  if (existingAttempt) {
    update("assessmentAttempts", existingAttempt.id, record);
  } else {
    insert("assessmentAttempts", { studentId, testId, domain, ...record });
  }
  recalculateAssessment(studentId);
  if (!missed) awardCertificationIfEarned(studentId, testId, score);

  const reg = getRegistration(testId, studentId);
  if (reg) update("skillTestRegistrations", reg.id, { missedRecorded: true });
  return getAttemptForTest(studentId, testId);
}

/**
 * Mirrors a server-graded online attempt, keeping the marking alongside it.
 *
 * `timeTakenMs` and `startedAt` are recorded here rather than derived later:
 * an attempt log that can show the score but not how long the candidate spent
 * is missing the half of the story that explains it.
 */
export function recordGradedAttempt(studentId, test, result) {
  return recordAssessmentResult(studentId, test.id, test.domain, result.score, result.weight || TEST_WEIGHT.Online, false, {
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    breakdown: result.breakdown,
    startedAt: result.startedAt || null,
    timeTakenMs: result.timeTakenMs ?? null,
    autoSubmitted: Boolean(result.autoSubmitted),
    autoSubmitReason: result.autoSubmitReason || null,
    disqualified: Boolean(result.disqualified),
    certificateStatus: result.certificate?.status || null,
    credentialId: result.certificate?.credential?.id || null,
    gradedBy: "server",
  });
}

/** Mirrors a mark the host entered for an in-person test. */
export function recordHostEnteredScore(studentId, test, score, issuerId) {
  return recordAssessmentResult(studentId, test.id, test.domain, score, TEST_WEIGHT.Offline, false, {
    gradedBy: `host:${issuerId || "host"}`,
  });
}

/**
 * A student confirming they turned up to an in-person test.
 *
 * Attendance is all this records. It used to also award 85%, which meant a
 * student could give themselves a strong score on any domain by registering for
 * an offline test and clicking a button. The mark now comes from the host,
 * through recordHostEnteredScore.
 */
export function confirmOfflineAttendance(studentId, testId) {
  const reg = getRegistration(testId, studentId);
  if (reg) update("skillTestRegistrations", reg.id, { attended: true, attendedAt: new Date().toISOString() });
  return reg;
}

/**
 * For any registration whose scheduled time is more than a day in the
 * past with no recorded attempt, records a 0-score attempt so it counts
 * against the student's skill profile — mirrors a real missed exam.
 */
export function checkAndRecordMissedTests(studentId) {
  const regs = listRegistrationsForStudent(studentId);
  const now = Date.now();
  regs.forEach((reg) => {
    if (reg.missedRecorded) return;
    // Turning up to an in-person test and waiting for the host to publish the
    // mark is not the same as missing it.
    if (reg.attended) return;
    const test = getSkillTest(reg.testId);
    if (!test) return;
    const scheduled = getScheduledTimestamp(test);
    if (!scheduled) return;
    const gracePassed = now > scheduled + 24 * 60 * 60 * 1000;
    if (!gracePassed) return;
    if (getAttemptForTest(studentId, reg.testId)) return;
    recordAssessmentResult(studentId, reg.testId, test.domain, 0, TEST_WEIGHT[test.mode] || 1, true);
  });
}

/* ============================================================
   Portfolio
   ============================================================ */

export function getPortfolio(studentId) {
  return findOne("portfolios", (p) => p.studentId === studentId);
}

export function savePortfolio(studentId, patch) {
  const existing = getPortfolio(studentId);
  if (existing) return update("portfolios", existing.id, patch);
  return insert("portfolios", { studentId, ...patch });
}

/* ============================================================
   Issued credentials

   A certificate a company, institution or faculty member issues TO a student —
   distinct from `portfolios.certifications`, which the student writes about
   themselves, and from `programRegistrations.certificateNo`, which only covers
   faculty attending an FDP. These are the verifiable ones: the student cannot
   create or edit them, only the issuer can, and each renders as a printable
   certificate at /certificate/<id>.
   ============================================================ */

export const CREDENTIAL_KINDS = ["Skill Test", "Internship", "Training", "Merit", "Participation"];

function credentialSequence(issuerId) {
  return findMany("credentials", (c) => c.issuerId === issuerId).length + 1;
}

/** Short, human-readable code printed on the certificate for verification. */
function verifyCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function issueCredential(issuer, student, data = {}) {
  const issuerName = issuer?.companyName || issuer?.instituteName || issuer?.institution || issuer?.name || "Skill Setu Partner";
  const slug = issuerName.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "SETU";
  const seq = credentialSequence(issuer?.id);
  const record = insert("credentials", {
    studentId: student.id,
    studentName: student.name || "Student",
    studentEmail: student.email || "",
    title: data.title || "Certificate of Achievement",
    issuer: issuerName,
    issuerId: issuer?.id,
    issuerRole: issuer?.role || "industry",
    kind: CREDENTIAL_KINDS.includes(data.kind) ? data.kind : "Participation",
    testId: data.testId || null,
    score: data.score || null,
    grade: data.grade || null,
    remarks: data.remarks || "",
    certificateNo: `SETU/${new Date().getFullYear()}/${slug}/${String(seq).padStart(4, "0")}`,
    verifyCode: verifyCode(),
    issuedAt: new Date().toISOString(),
    revokedAt: null,
  });
  notifyStudent(
    student.id,
    `${issuerName} issued you a certificate: "${record.title}". Open your portfolio to view or download it.`,
    issuerName,
    { credentialId: record.id }
  );
  return record;
}

export function issueCredentialsBulk(issuer, students, data = {}) {
  return students.map((s) => issueCredential(issuer, s, typeof data === "function" ? data(s) : data));
}

let lastCredentialPullAt = 0;

/* Certificates issued on the server (automatic ones) arrive on the next read. */
function pullRemoteCredentials() {
  if (!isBrowser()) return;
  const now = Date.now();
  if (now - lastCredentialPullAt < REMOTE_PULL_INTERVAL_MS) return;
  lastCredentialPullAt = now;
  mirrorTests((m) => m.syncRemoteCredentials());
}

export function listCredentialsForStudent(studentId, { includeRevoked = false } = {}) {
  pullRemoteCredentials();
  return findMany("credentials", (c) => c.studentId === studentId && (includeRevoked || !c.revokedAt)).sort(
    (a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)
  );
}

export function listCredentialsByIssuer(issuerId) {
  return findMany("credentials", (c) => c.issuerId === issuerId).sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
}

export function getCredential(id) {
  return findOne("credentials", (c) => c.id === id);
}

export function hasCredentialForTest(studentId, testId) {
  return !!findOne("credentials", (c) => c.studentId === studentId && c.testId === testId && !c.revokedAt);
}

export function revokeCredential(id) {
  return update("credentials", id, { revokedAt: new Date().toISOString() });
}

/* ============================================================
   Saved / bookmarked postings
   ============================================================ */

export function listSavedInternships(studentId) {
  return findMany("savedInternships", (s) => s.studentId === studentId);
}

export function isInternshipSaved(studentId, internshipId) {
  return !!findOne("savedInternships", (s) => s.studentId === studentId && s.internshipId === internshipId);
}

/** Returns the new saved state so callers can update a button without re-reading. */
export function toggleSavedInternship(studentId, internshipId) {
  const existing = findOne("savedInternships", (s) => s.studentId === studentId && s.internshipId === internshipId);
  if (existing) {
    remove("savedInternships", existing.id);
    return false;
  }
  insert("savedInternships", { studentId, internshipId, savedAt: new Date().toISOString() });
  return true;
}

/* ---------- Saved mentorship slots ----------
   The mentorship counterpart of a bookmarked posting: a student marks a slot
   they want without committing to it, so "Saved Mentorships" is a real list
   rather than a filtered view of what they already booked. */

export function listSavedMentorships(studentId) {
  return findMany("savedMentorships", (s) => s.studentId === studentId);
}

export function isMentorshipSaved(studentId, slotId) {
  return !!findOne("savedMentorships", (s) => s.studentId === studentId && s.slotId === slotId);
}

export function toggleSavedMentorship(studentId, slot) {
  const slotId = typeof slot === "string" ? slot : slot?.id;
  const existing = findOne("savedMentorships", (s) => s.studentId === studentId && s.slotId === slotId);
  if (existing) {
    remove("savedMentorships", existing.id);
    return false;
  }
  insert("savedMentorships", {
    studentId,
    slotId,
    facultyId: typeof slot === "object" ? slot?.facultyId || null : null,
    // A snapshot, so a saved slot still renders something useful if the mentor
    // withdraws it before the student comes back to it.
    snapshot: typeof slot === "object" ? { title: slot?.title, slot: slot?.slot, mode: slot?.mode, mentorName: slot?.mentorName } : null,
    savedAt: new Date().toISOString(),
  });
  return true;
}

/* ============================================================
   Programs (FDPs)
   ============================================================ */

export function listPrograms() {
  ensureSeeded();
  runProgrammeLinkEscalation();
  return all("programs");
}

export function getProgram(programId) {
  return findOne("programs", (p) => p.id === programId);
}

export function createProgram(ownerId, organiser, data) {
  return insert("programs", { ...data, ownerId, organiser, enrolled: 0, status: "Open", createdAt: new Date().toISOString() });
}

export function updateProgram(programId, patch) {
  return update("programs", programId, patch);
}

export function cancelProgram(programId, reason) {
  const programme = getProgram(programId);
  const updated = update("programs", programId, {
    status: "Cancelled",
    cancelledReason: reason || "Cancelled by the host.",
  });
  if (programme) notifyProgrammeRegistrants(programme, reason);
  return updated;
}

/** Tells everyone holding a place that the programme is off, and releases them. */
function notifyProgrammeRegistrants(programme, reason) {
  listProgramRegistrations(programme.id).forEach((reg) => {
    if (reg.userId) {
      insert("studentNotifications", {
        studentId: reg.userId,
        message: `"${programme.title}" has been cancelled${reason ? ` — ${reason}` : ""}. You have been removed from the programme; no action is needed.`,
        from: programme.organiser || "Programme host",
        sentAt: new Date().toISOString(),
        read: false,
      });
    }
    update("programRegistrations", reg.id, { status: "Cancelled" });
  });
}

/* ---------- Online programmes with no joining link ----------

   An online session with no link is not a session. Rather than letting one sit
   there until the day it silently fails, the deadline enforces itself:

     • With a day to go and no link, the start date moves back one day and the
       host is told to add one.
     • Three consecutive pushes with still no link cancels the programme, and
       everyone enrolled is told they have been removed.

   `linkPushCount` and `lastPushedAt` live on the record, so the escalation is
   replayable and cannot double-count if two tabs run it in the same day. */

const LINK_GRACE_DAYS = 1;
export const MAX_LINK_PUSHES = 3;

export function runProgrammeLinkEscalation() {
  if (!isBrowser()) return;
  const today = todayIso();

  read("programs").forEach((programme) => {
    if (programme.mode !== "Online") return;
    if (programme.status === "Cancelled" || programme.status === "Completed") return;
    if (programme.meetingUrl && programme.meetingUrl.trim()) return;
    if (!programme.startDate) return;
    // One push per day at most, however many times this runs.
    if (programme.lastPushedAt === today) return;

    const start = programmeStartMs(programme);
    if (start == null) return;
    const dueAt = start - LINK_GRACE_DAYS * 86400000;
    if (Date.now() < dueAt) return;

    const pushes = (programme.linkPushCount || 0) + 1;

    if (pushes > MAX_LINK_PUSHES) {
      cancelProgram(
        programme.id,
        `no joining link was added after ${MAX_LINK_PUSHES} postponements`
      );
      return;
    }

    update("programs", programme.id, {
      startDate: addDaysIso(programme.startDate, 1),
      endDate: programme.endDate ? addDaysIso(programme.endDate, 1) : programme.endDate,
      linkPushCount: pushes,
      lastPushedAt: today,
    });

    insert("studentNotifications", {
      studentId: programme.ownerId,
      message:
        pushes === MAX_LINK_PUSHES
          ? `"${programme.title}" has been pushed back a day for the ${pushes}rd time — it has no joining link. Add one now, or it will be cancelled automatically and every registrant released.`
          : `"${programme.title}" starts tomorrow and still has no joining link, so it has been pushed back by a day (${pushes} of ${MAX_LINK_PUSHES}). Add the link to stop this happening again.`,
      from: "Skill Setu scheduling",
      sentAt: new Date().toISOString(),
      read: false,
    });

    listProgramRegistrations(programme.id).forEach((reg) => {
      if (!reg.userId) return;
      insert("studentNotifications", {
        studentId: reg.userId,
        message: `"${programme.title}" has moved back by one day while the host confirms the joining link. Your place is unchanged.`,
        from: programme.organiser || "Programme host",
        sentAt: new Date().toISOString(),
        read: false,
      });
    });
  });
}

/** Adding the link clears the escalation — the programme is viable again. */
export function setProgramMeetingUrl(programId, meetingUrl) {
  const url = String(meetingUrl || "").trim();
  if (url && !/^https?:\/\//i.test(url)) {
    throw new Error("The meeting link must start with http:// or https://");
  }
  return update("programs", programId, { meetingUrl: url, linkPushCount: 0, lastPushedAt: null });
}

export function listProgramRegistrations(programId) {
  return findMany("programRegistrations", (r) => r.programId === programId);
}

export function listProgramRegistrationsForUser(userId) {
  return findMany("programRegistrations", (r) => r.userId === userId);
}

export function getProgramRegistration(registrationId) {
  return findOne("programRegistrations", (r) => r.id === registrationId);
}

/**
 * Registration is seat-aware: once a program fills, further sign-ups land on a
 * waitlist instead of silently over-booking, and cancelling a confirmed seat
 * promotes the first waitlisted attendee.
 */
export function registerForProgram(programId, userId, info = {}) {
  const program = getProgram(programId);
  if (!program) return null;
  const already = findOne("programRegistrations", (r) => r.programId === programId && r.userId === userId);
  if (already) return already;

  const confirmed = listProgramRegistrations(programId).filter((r) => r.status === "Confirmed").length;
  const status = confirmed < (program.seats || 0) ? "Confirmed" : "Waitlisted";
  const record = insert("programRegistrations", {
    programId,
    userId,
    name: info.name || "",
    email: info.email || "",
    institution: info.institution || "",
    designation: info.designation || "",
    status,
    registeredAt: new Date().toISOString(),
  });
  syncProgramEnrolment(programId);
  return record;
}

export function cancelProgramRegistration(registrationId) {
  const reg = findOne("programRegistrations", (r) => r.id === registrationId);
  if (!reg) return;
  remove("programRegistrations", registrationId);
  const waitlisted = listProgramRegistrations(reg.programId)
    .filter((r) => r.status === "Waitlisted")
    .sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt))[0];
  if (waitlisted) update("programRegistrations", waitlisted.id, { status: "Confirmed", promotedAt: new Date().toISOString() });
  syncProgramEnrolment(reg.programId);
}

export function setProgramRegistrationStatus(registrationId, status) {
  const reg = update("programRegistrations", registrationId, { status });
  if (reg) syncProgramEnrolment(reg.programId);
  return reg;
}

function syncProgramEnrolment(programId) {
  const confirmed = listProgramRegistrations(programId).filter((r) => r.status === "Confirmed").length;
  update("programs", programId, { enrolled: confirmed });
}

export function markProgramAttendance(registrationId, attended) {
  return update("programRegistrations", registrationId, { attended });
}

/** Issues a certificate number to every attendee who was marked present. */
export function issueProgramCertificates(programId) {
  const program = getProgram(programId);
  if (!program) return 0;
  let issued = 0;
  listProgramRegistrations(programId).forEach((r) => {
    if (!r.attended || r.certificateNo) return;
    update("programRegistrations", r.id, {
      certificateNo: `FDP/${new Date().getFullYear()}/${String(programId).slice(-4).toUpperCase()}/${String(issued + 1).padStart(3, "0")}`,
      certificateIssuedAt: new Date().toISOString(),
    });
    issued += 1;
  });
  if (issued) update("programs", programId, { certificatesIssuedAt: new Date().toISOString(), status: "Completed" });
  return issued;
}

export function submitProgramFeedback(programId, userId, feedback) {
  const existing = findOne("programFeedback", (f) => f.programId === programId && f.userId === userId);
  if (existing) return update("programFeedback", existing.id, feedback);
  return insert("programFeedback", { programId, userId, submittedAt: new Date().toISOString(), ...feedback });
}

export function listProgramFeedback(programId) {
  return findMany("programFeedback", (f) => f.programId === programId);
}

/* ============================================================
   Research collaborations
   ============================================================ */

export function getCollabResponse(collabId) {
  const r = findOne("collabResponses", (c) => c.collabId === collabId);
  return r ? r.response : null;
}

export function setCollabResponse(collabId, response) {
  const existing = findOne("collabResponses", (c) => c.collabId === collabId);
  if (existing) return update("collabResponses", existing.id, { response });
  return insert("collabResponses", { collabId, response });
}

export function listCollabListings() {
  return all("collabListings");
}

export function listCollabListingsByOwner(ownerId) {
  return findMany("collabListings", (c) => c.ownerId === ownerId);
}

export function createCollabListing(ownerId, ownerName, data) {
  return insert("collabListings", {
    ownerId,
    ownerName,
    status: "Open",
    createdAt: new Date().toISOString(),
    ...data,
  });
}

export function updateCollabListing(id, patch) {
  return update("collabListings", id, patch);
}

export function listCollabInterests(listingId) {
  return findMany("collabInterests", (i) => i.listingId === listingId);
}

export function expressCollabInterest(listingId, user, message) {
  const existing = findOne("collabInterests", (i) => i.listingId === listingId && i.userId === user.id);
  if (existing) return existing;
  return insert("collabInterests", {
    listingId,
    userId: user.id,
    name: user.name,
    institution: user.institution || user.instituteName || user.companyName || "",
    message: message || "",
    status: "Interested",
    at: new Date().toISOString(),
  });
}

export function setCollabInterestStatus(interestId, status) {
  return update("collabInterests", interestId, { status });
}

export function listCollabMessages(collabId) {
  return findMany("collabMessages", (m) => m.collabId === collabId).sort((a, b) => new Date(a.at) - new Date(b.at));
}

export function postCollabMessage(collabId, author, body) {
  return insert("collabMessages", { collabId, author, body, at: new Date().toISOString() });
}

/**
 * Milestones for one collaboration, deduplicated by title.
 *
 * The demo seed re-ran whenever its version key was bumped, and each run
 * inserted the sample milestones again with that day's due date — so the
 * faculty dashboard showed "Finalise outcome-measure instrument" four times,
 * due on two different days. Rows written before this are still in people's
 * browsers, so the duplicates are collapsed on read as well as prevented on
 * write; the earliest-created copy wins, since that is the one anything else
 * (a completed tick, say) is attached to.
 */
export function listCollabMilestones(collabId) {
  const seen = new Set();
  return findMany("collabMilestones", (m) => m.collabId === collabId)
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    .filter((m) => {
      const key = (m.title || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""));
}

export function addCollabMilestone(collabId, data) {
  const title = (data?.title || "").trim();
  const existing = title
    ? findOne("collabMilestones", (m) => m.collabId === collabId && (m.title || "").trim().toLowerCase() === title.toLowerCase())
    : null;
  if (existing) return existing;
  return insert("collabMilestones", { collabId, done: false, createdAt: new Date().toISOString(), ...data });
}

export function toggleCollabMilestone(id) {
  const m = findOne("collabMilestones", (x) => x.id === id);
  if (!m) return null;
  return update("collabMilestones", id, { done: !m.done, completedAt: !m.done ? new Date().toISOString() : null });
}

export function listCollabFiles(collabId) {
  return findMany("collabFiles", (f) => f.collabId === collabId);
}

export function addCollabFile(collabId, file) {
  return insert("collabFiles", { collabId, uploadedAt: new Date().toISOString(), ...file });
}

export function removeCollabFile(id) {
  remove("collabFiles", id);
}

export function listResearchOutputs(facultyId) {
  return findMany("researchOutputs", (o) => o.facultyId === facultyId);
}

export function addResearchOutput(facultyId, data) {
  return insert("researchOutputs", { facultyId, addedAt: new Date().toISOString(), ...data });
}

export function updateResearchOutput(id, patch) {
  return update("researchOutputs", id, { ...patch, updatedAt: new Date().toISOString() });
}

export function removeResearchOutput(id) {
  remove("researchOutputs", id);
}

/* ============================================================
   Academician — advisees, notes, mentorship slots
   ============================================================ */

export function listAdvisees(facultyId) {
  return findMany("advisees", (a) => a.facultyId === facultyId);
}

export function isAdvisee(facultyId, studentId) {
  return !!findOne("advisees", (a) => a.facultyId === facultyId && a.studentId === studentId);
}

export function addAdvisee(facultyId, studentId) {
  if (isAdvisee(facultyId, studentId)) return null;
  return insert("advisees", { facultyId, studentId, since: new Date().toISOString() });
}

export function removeAdvisee(facultyId, studentId) {
  const rec = findOne("advisees", (a) => a.facultyId === facultyId && a.studentId === studentId);
  if (rec) remove("advisees", rec.id);
}

export function getMentorNote(facultyId, studentId) {
  return findOne("mentorNotes", (n) => n.facultyId === facultyId && n.studentId === studentId);
}

export function saveMentorNote(facultyId, studentId, patch) {
  const existing = getMentorNote(facultyId, studentId);
  if (existing) return update("mentorNotes", existing.id, { ...patch, updatedAt: new Date().toISOString() });
  return insert("mentorNotes", { facultyId, studentId, ...patch, updatedAt: new Date().toISOString() });
}

/**
 * A faculty member recommending a live posting to one of their students: the
 * recommendation is logged against the private mentor note AND delivered to
 * that student's portal inbox, so it is visible to the person it is about.
 */
export function recommendPostingToStudent(faculty, studentId, internship) {
  const existing = getMentorNote(faculty.id, studentId);
  const recommendations = existing?.recommendations || [];
  if (recommendations.some((r) => r.internshipId === internship.id)) return existing;
  const saved = saveMentorNote(faculty.id, studentId, {
    recommendations: [
      ...recommendations,
      { internshipId: internship.id, title: internship.title, company: internship.company, at: new Date().toISOString() },
    ],
  });
  insert("studentNotifications", {
    studentId,
    message: `${faculty.name} recommended you apply to "${internship.title}" at ${internship.company}.`,
    from: faculty.name,
    sentAt: new Date().toISOString(),
    read: false,
  });
  return saved;
}

export function listMentorNotes(facultyId) {
  return findMany("mentorNotes", (n) => n.facultyId === facultyId);
}

/**
 * A student asking a faculty member to mentor them.
 *
 * Deliberately a message rather than a state machine: the mentor's own
 * "Assign to me" control is what actually creates the relationship, and
 * inventing a parallel pending-requests queue would give the same fact two
 * places to disagree. This just makes sure the ask reaches them.
 */
export function requestMentorship(student, faculty, message) {
  const existing = findOne(
    "mentorshipRequests",
    (r) => r.studentId === student.id && r.facultyId === faculty.id && r.status === "Pending"
  );
  if (existing) return existing;

  const record = insert("mentorshipRequests", {
    studentId: student.id,
    studentName: student.name,
    studentDepartment: student.department || "",
    studentInstitution: student.institution || "",
    facultyId: faculty.id,
    facultyName: faculty.name,
    message: (message || "").trim(),
    status: "Pending",
    requestedAt: new Date().toISOString(),
  });

  insert("studentNotifications", {
    studentId: faculty.id,
    message: `${student.name}${student.department ? ` (${student.department})` : ""} has asked you to mentor them.${
      message ? ` "${message.trim()}"` : ""
    }`,
    from: student.name,
    sentAt: new Date().toISOString(),
    read: false,
  });

  return record;
}

export function listMentorshipRequestsForFaculty(facultyId) {
  return findMany("mentorshipRequests", (r) => r.facultyId === facultyId);
}

export function listMentorshipRequestsForStudent(studentId) {
  return findMany("mentorshipRequests", (r) => r.studentId === studentId);
}

export function setMentorshipRequestStatus(requestId, status) {
  const record = update("mentorshipRequests", requestId, { status, respondedAt: new Date().toISOString() });
  if (record?.studentId) {
    insert("studentNotifications", {
      studentId: record.studentId,
      message:
        status === "Accepted"
          ? `${record.facultyName} accepted your mentorship request — you are now one of their mentees.`
          : `${record.facultyName} isn't able to take on a new mentee right now.`,
      from: record.facultyName || "Your institution",
      sentAt: new Date().toISOString(),
      read: false,
    });
  }
  return record;
}

export function listOfficeHours(facultyId) {
  return findMany("officeHours", (s) => s.facultyId === facultyId).sort((a, b) => (a.slot || "").localeCompare(b.slot || ""));
}

export function addOfficeHourSlot(facultyId, data) {
  return insert("officeHours", { facultyId, createdAt: new Date().toISOString(), ...data });
}

export function removeOfficeHourSlot(id) {
  remove("officeHours", id);
  findMany("mentorBookings", (b) => b.slotId === id).forEach((b) => remove("mentorBookings", b.id));
}

export function listMentorBookings(facultyId) {
  return findMany("mentorBookings", (b) => b.facultyId === facultyId);
}

export function listBookingsForSlot(slotId) {
  return findMany("mentorBookings", (b) => b.slotId === slotId);
}

export function bookOfficeHourSlot(slot, student, topic) {
  const already = findOne("mentorBookings", (b) => b.slotId === slot.id && b.studentId === student.id);
  if (already) return already;
  const taken = listBookingsForSlot(slot.id).length;
  if (taken >= (slot.capacity || 1)) throw new Error("That slot is already full.");
  return insert("mentorBookings", {
    slotId: slot.id,
    facultyId: slot.facultyId,
    studentId: student.id,
    studentName: student.name,
    topic: topic || "",
    status: "Booked",
    bookedAt: new Date().toISOString(),
  });
}

export function setBookingStatus(bookingId, status) {
  return update("mentorBookings", bookingId, { status });
}

/* ============================================================
   Institution — profile, roster, admins, MOUs, drives, notices
   ============================================================ */

export function getInstitutionProfile(instituteName) {
  return findOne("institutionProfiles", (p) => p.instituteName === instituteName);
}

export function saveInstitutionProfile(instituteName, patch) {
  const existing = getInstitutionProfile(instituteName);
  if (existing) return update("institutionProfiles", existing.id, patch);
  return insert("institutionProfiles", { instituteName, ...patch });
}

export function listInstitutionStudents(instituteName) {
  return findMany("users", (u) => u.role === "student" && u.institution === instituteName);
}

/** Placement state derived from a student's own applications. */
export function placementStatusFor(studentId) {
  const apps = listApplicationsForStudent(studentId);
  if (apps.some((a) => a.status === "Hired")) return "Placed";
  if (apps.some((a) => a.status === "Interview" || a.status === "Shortlisted")) return "In Process";
  const live = apps.filter((a) => !TERMINAL_STAGES.includes(a.status));
  if (live.length) return "Applied";
  if (apps.length) return "Rejected"; // applied, but every application was rejected
  return "Unplaced";
}

export function createStudentRecord(instituteName, data) {
  const email = (data.email || "").trim().toLowerCase();
  if (email && findOne("users", (u) => (u.email || "").toLowerCase() === email)) return null;
  return insert("users", {
    role: "student",
    institution: instituteName,
    passwordHash: null,
    invited: true,
    emailVerified: false,
    createdAt: new Date().toISOString(),
    ...data,
    email,
  });
}

export const BULK_STUDENT_COLUMNS = ["name", "email", "rollNo", "department", "batch", "year", "course", "phone"];

export const BULK_STUDENT_TEMPLATE =
  `${BULK_STUDENT_COLUMNS.join(",")}\n` +
  `Aarav Sharma,aarav.sharma@example.edu,BAMS/2023/017,Ayurveda (BAMS),2023,3rd Year,BAMS,+91 98765 43210\n` +
  `Diya Nair,diya.nair@example.edu,BNYS/2024/008,Naturopathy & Yogic Sciences (BNYS),2024,2nd Year,BNYS,+91 98765 43211\n`;

/** Very small CSV reader — good enough for a template-driven upload. */
export function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cells = split(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    return row;
  });
  return { headers, rows };
}

export function bulkInviteStudents(instituteName, rows) {
  const result = { created: 0, skipped: 0, errors: [] };
  rows.forEach((row, i) => {
    if (!row.name || !row.email) {
      result.errors.push(`Row ${i + 2}: name and email are required.`);
      result.skipped += 1;
      return;
    }
    const created = createStudentRecord(instituteName, {
      name: row.name,
      email: row.email,
      rollNo: row.rollno || row.rollNo || "",
      department: row.department || "",
      batch: row.batch || "",
      year: row.year || "",
      course: row.course || "",
      phone: row.phone || "",
    });
    if (created) result.created += 1;
    else {
      result.skipped += 1;
      result.errors.push(`Row ${i + 2}: an account already exists for ${row.email}.`);
    }
  });
  return result;
}

export function toCsv(rows, columns) {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(c.value(r))).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadFile(filename, contents, mime = "text/csv;charset=utf-8") {
  if (!isBrowser()) return;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function listInstitutionAdmins(instituteName) {
  return findMany("institutionAdmins", (a) => a.instituteName === instituteName);
}

export function addInstitutionAdmin(instituteName, data) {
  return insert("institutionAdmins", { instituteName, addedAt: new Date().toISOString(), status: "Active", ...data });
}

export function updateInstitutionAdmin(id, patch) {
  return update("institutionAdmins", id, patch);
}

export function removeInstitutionAdmin(id) {
  remove("institutionAdmins", id);
}

export function logActivity(scope, actor, action, detail = "") {
  return insert("activityLog", { scope, actor, action, detail, at: new Date().toISOString() });
}

export function listActivity(scope, limit = 40) {
  return findMany("activityLog", (a) => a.scope === scope)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

export const MOU_SCOPES = ["Internships", "Placements", "Joint Research", "Faculty Development", "Guest Lectures", "Industrial Visits"];

export function listMous(instituteName) {
  return findMany("mous", (m) => m.instituteName === instituteName);
}

export function createMou(instituteName, data) {
  return insert("mous", {
    instituteName,
    createdAt: new Date().toISOString(),
    timeline: [{ label: "Created", at: new Date().toISOString() }],
    ...data,
  });
}

export function updateMou(id, patch) {
  return update("mous", id, patch);
}

export function addMouTimelineEvent(id, label) {
  const mou = findOne("mous", (m) => m.id === id);
  if (!mou) return null;
  return update("mous", id, { timeline: [...(mou.timeline || []), { label, at: new Date().toISOString() }] });
}

export function deleteMou(id) {
  remove("mous", id);
}

export function mouStatus(mou) {
  if (!mou.expiryDate) return "Active";
  const days = Math.ceil((new Date(mou.expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return "Expired";
  if (days <= 90) return "Renewal due";
  return "Active";
}

export function listAnnouncements(instituteName) {
  repairPlaceholderAttachments();
  return findMany("announcements", (a) => !instituteName || a.instituteName === instituteName)
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
}

export function createAnnouncement(instituteName, data) {
  return insert("announcements", { instituteName, postedAt: new Date().toISOString(), ...data });
}

export function updateAnnouncement(id, patch) {
  return update("announcements", id, patch);
}

export function deleteAnnouncement(id) {
  remove("announcements", id);
}

export function listInstitutionDocs(instituteName) {
  return findMany("institutionDocs", (d) => !instituteName || d.instituteName === instituteName)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export function addInstitutionDoc(instituteName, data) {
  return insert("institutionDocs", { instituteName, uploadedAt: new Date().toISOString(), ...data });
}

export function removeInstitutionDoc(id) {
  remove("institutionDocs", id);
}

/**
 * Drives for one institution, de-duplicated at the query.
 *
 * Two rows with the same title on the same date are the same drive — that is
 * how the duplicate cards appeared, and de-duplicating here means a stale row
 * left over from an older seed can never surface as a second card even if the
 * cleanup misses it. The row carrying more detail wins.
 */
export function listDrives(instituteName) {
  const rows = findMany("drives", (d) => d.instituteName === instituteName);
  const byKey = new Map();
  rows.forEach((drive) => {
    const key = `${(drive.title || "").trim().toLowerCase()}|${drive.date || ""}`;
    const existing = byKey.get(key);
    const detail = (d) => Object.values(d).filter((v) => v != null && v !== "").length;
    if (!existing || detail(drive) > detail(existing)) byKey.set(key, drive);
  });
  return [...byKey.values()].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export function getDrive(id) {
  return findOne("drives", (d) => d.id === id);
}

export function createDrive(instituteName, data) {
  // Same institution, same title, same date is the same drive — return the
  // existing row rather than creating a second card for it.
  const duplicate = findOne(
    "drives",
    (d) =>
      d.instituteName === instituteName &&
      (d.title || "").trim().toLowerCase() === (data.title || "").trim().toLowerCase() &&
      d.date === data.date
  );
  if (duplicate) return update("drives", duplicate.id, data) || duplicate;
  return insert("drives", { instituteName, status: "Scheduled", createdAt: new Date().toISOString(), ...data });
}

export function updateDrive(id, patch) {
  return update("drives", id, patch);
}

export function deleteDrive(id) {
  remove("drives", id);
  findMany("driveInvites", (i) => i.driveId === id).forEach((i) => remove("driveInvites", i.id));
  findMany("driveEligibility", (e) => e.driveId === id).forEach((e) => remove("driveEligibility", e.id));
}

export function listDriveInvites(driveId) {
  return findMany("driveInvites", (i) => i.driveId === driveId);
}

export function inviteCompanyToDrive(driveId, data) {
  const existing = findOne("driveInvites", (i) => i.driveId === driveId && i.company === data.company);
  if (existing) return existing;
  return insert("driveInvites", { driveId, rsvp: "Invited", invitedAt: new Date().toISOString(), ...data });
}

export function setDriveInviteRsvp(inviteId, rsvp, extra = {}) {
  return update("driveInvites", inviteId, { rsvp, rsvpAt: new Date().toISOString(), ...extra });
}

export function removeDriveInvite(inviteId) {
  remove("driveInvites", inviteId);
}

export function listDriveEligibility(driveId) {
  return findMany("driveEligibility", (e) => e.driveId === driveId);
}

export function tagStudentsForDrive(driveId, studentIds) {
  const existing = new Set(listDriveEligibility(driveId).map((e) => e.studentId));
  let added = 0;
  studentIds.forEach((studentId) => {
    if (existing.has(studentId)) return;
    insert("driveEligibility", { driveId, studentId, taggedAt: new Date().toISOString() });
    added += 1;
  });
  return added;
}

export function untagStudentFromDrive(driveId, studentId) {
  const rec = findOne("driveEligibility", (e) => e.driveId === driveId && e.studentId === studentId);
  if (rec) remove("driveEligibility", rec.id);
}

/**
 * One student's inbox row. Everything that needs to reach a single student —
 * an application stage change, an issued certificate, a mentor recommendation —
 * goes through here so there is exactly one write path into the inbox.
 */
export function notifyStudent(studentId, message, from, meta = {}) {
  if (!studentId) return null;
  return insert("studentNotifications", {
    studentId,
    message,
    from,
    ...meta,
    sentAt: meta.sentAt || new Date().toISOString(),
    read: false,
  });
}

/** Notifications queued for a group of students (bulk notify from the roster). */
export function notifyStudents(instituteName, studentIds, message, from) {
  const batch = insert("notifyBatches", {
    instituteName,
    recipients: studentIds.length,
    message,
    from,
    sentAt: new Date().toISOString(),
  });
  studentIds.forEach((studentId) => notifyStudent(studentId, message, from, { batchId: batch.id, sentAt: batch.sentAt }));
  return batch;
}

export function listNotifyBatches(instituteName) {
  return findMany("notifyBatches", (b) => b.instituteName === instituteName).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

export function listStudentNotifications(studentId) {
  return findMany("studentNotifications", (n) => n.studentId === studentId).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

/* ============================================================
   Multi-year placement history (accreditation reporting)
   ============================================================ */

export function listPlacementHistory(instituteName) {
  return findMany("placementHistory", (h) => h.instituteName === instituteName).sort((a, b) => Number(a.batch) - Number(b.batch));
}

export function upsertPlacementHistory(instituteName, record) {
  const existing = findOne(
    "placementHistory",
    (h) => h.instituteName === instituteName && String(h.batch) === String(record.batch) && h.department === record.department
  );
  if (existing) return update("placementHistory", existing.id, record);
  return insert("placementHistory", { instituteName, ...record });
}

export function updatePlacementHistory(id, patch) {
  return update("placementHistory", id, patch);
}

export function removePlacementHistory(id) {
  remove("placementHistory", id);
}

/* ============================================================
   Cohort analytics helpers, shared by the institution and
   academician dashboards so both read from one definition.
   ============================================================ */

/** Average skill-domain score per department for one institution. */
export function cohortSkillMatrix(instituteName, { department, batch } = {}) {
  const students = listInstitutionStudents(instituteName).filter(
    (s) => (!department || s.department === department) && (!batch || String(s.batch) === String(batch))
  );
  const byDept = {};
  students.forEach((s) => {
    const dept = s.department || "Unassigned";
    const assessment = getAssessment(s.id);
    if (!byDept[dept]) byDept[dept] = { department: dept, students: 0, assessed: 0, scores: {} };
    byDept[dept].students += 1;
    if (!assessment) return;
    byDept[dept].assessed += 1;
    SKILL_DOMAINS.forEach((domain) => {
      const value = assessment.domainScores?.[domain];
      if (value == null) return;
      if (!byDept[dept].scores[domain]) byDept[dept].scores[domain] = { sum: 0, count: 0 };
      byDept[dept].scores[domain].sum += value;
      byDept[dept].scores[domain].count += 1;
    });
  });
  return Object.values(byDept)
    .map((row) => ({
      department: row.department,
      students: row.students,
      assessed: row.assessed,
      averages: Object.fromEntries(
        Object.entries(row.scores).map(([domain, { sum, count }]) => [domain, Math.round(sum / count)])
      ),
    }))
    .sort((a, b) => b.students - a.students);
}

/** Semester-over-semester movement, derived from dated assessment attempts. */
export function skillTrendByTerm(studentIds) {
  const ids = new Set(studentIds);
  const attempts = findMany("assessmentAttempts", (a) => ids.has(a.studentId));
  const buckets = {};
  attempts.forEach((a) => {
    const d = new Date(a.completedAt);
    if (Number.isNaN(d.getTime())) return;
    const term = `${d.getFullYear()}-${d.getMonth() < 6 ? "H1" : "H2"}`;
    if (!buckets[term]) buckets[term] = { term, sum: 0, count: 0 };
    buckets[term].sum += a.score;
    buckets[term].count += 1;
  });
  return Object.values(buckets)
    .map((b) => ({ term: b.term, average: Math.round(b.sum / b.count), attempts: b.count }))
    .sort((a, b) => a.term.localeCompare(b.term));
}

/** What live postings are asking for, ranked. */
export function industrySkillDemand(limit = 12) {
  const counts = {};
  listInternships()
    .filter((i) => i.status !== "Closed")
    .forEach((i) => (i.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  return Object.entries(counts)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Everyone with a given role, de-duplicated.
 *
 * The same person can end up with more than one row: an institution bulk-invites
 * them (a placeholder with no password), and then they register themselves and
 * the server profile is cached alongside it. Left alone, that person appeared
 * twice in Talent Pool, twice in a roster, and twice in every count derived from
 * those lists. De-duplication happens here, at the query, so every caller gets
 * one row per person without each of them having to remember to.
 *
 * When two rows describe the same email, the registered account wins over the
 * invited placeholder, and the more complete record wins over the emptier one.
 */
function completenessOf(user) {
  let score = 0;
  if (user.passwordHash || user.emailVerified) score += 100; // a real account
  if (!user.invited) score += 50;
  score += Object.values(user).filter((v) => v != null && v !== "").length;
  return score;
}

export function listUsersByRole(role) {
  const rows = findMany("users", (u) => u.role === role);
  const byKey = new Map();
  rows.forEach((user) => {
    const key = (user.email || "").trim().toLowerCase() || `id:${user.id}`;
    const existing = byKey.get(key);
    if (!existing || completenessOf(user) > completenessOf(existing)) byKey.set(key, user);
  });
  return [...byKey.values()];
}

/* ============================================================
   Demo Mode — one populated, read-and-click-around account per
   role, so a visitor can explore every page without signing up.
   ============================================================ */

const FIRST_NAMES = [
  "Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Ishita", "Kabir", "Meera", "Rohan", "Sanya",
  "Aditya", "Nithya", "Rehan", "Kavya", "Yash", "Tara", "Imran", "Pooja", "Karthik", "Aisha",
  "Devansh", "Riya", "Farhan", "Lakshmi", "Nikhil", "Shreya", "Zoya", "Harsh", "Anjali", "Vikram",
  "Neha", "Sameer", "Divya", "Rahul", "Pallavi", "Aman", "Sneha", "Manav", "Ritika", "Varun",
];

const LAST_NAMES = [
  "Sharma", "Nair", "Iyer", "Reddy", "Patel", "Menon", "Deshmukh", "Bhat", "Chatterjee", "Kulkarni",
  "Rao", "Joshi", "Pillai", "Verma", "Ansari", "Mishra", "Gowda", "Saxena", "Trivedi", "Bose",
];

const BATCHES = [2023, 2024, 2025, 2026];

const COURSE_BY_DEPT = {
  "Ayurveda (BAMS)": "BAMS",
  "Homoeopathy (BHMS)": "BHMS",
  "Unani (BUMS)": "BUMS",
  "Siddha (BSMS)": "BSMS",
  "Naturopathy & Yogic Sciences (BNYS)": "BNYS",
  "Sowa-Rigpa (BSRMS)": "BSRMS",
  "Ayurveda Postgraduate (MD/MS Ayu)": "MD (Ayu)",
  "Panchakarma (PG Diploma)": "PG Diploma in Panchakarma",
  "Yoga Therapy (PG Diploma)": "PG Diploma in Yoga Therapy",
  "Ayurvedic Pharmacy (B.Pharm Ayu)": "B.Pharm (Ayurveda)",
  "Dravyaguna & Pharmacognosy": "MD (Ayu) Dravyaguna",
  "Rasashastra & Bhaishajya Kalpana": "MD (Ayu) Rasashastra",
  "Swasthavritta & Yoga (Preventive Health)": "MD (Ayu) Swasthavritta",
  "Panchakarma Therapy Assistant (Diploma)": "Diploma in Panchakarma Therapy",
  "AYUSH Hospital Management & Public Health": "MHA (AYUSH)",
  "Medicinal Plant Sciences & Cultivation": "M.Sc Medicinal Plants",
};

/**
 * The departments the demo institution actually runs — the undergraduate
 * BAMS programme, the MD/MS specialities, the PG diploma and therapy-assistant
 * streams, the pharmacy and drug-science departments and hospital management
 * side by side, which is the realistic shape of an apex Ayurveda institute
 * and makes the cross-department analytics worth looking at. Ten departments,
 * one entry each, spread across all three assessment rubrics.
 */
const DEMO_DEPARTMENTS = [
  "Ayurveda (BAMS)",
  "Ayurveda Postgraduate (MD/MS Ayu)",
  "Panchakarma (PG Diploma)",
  "Dravyaguna & Pharmacognosy",
  "Rasashastra & Bhaishajya Kalpana",
  "Swasthavritta & Yoga (Preventive Health)",
  "Ayurvedic Pharmacy (B.Pharm Ayu)",
  "Panchakarma Therapy Assistant (Diploma)",
  "AYUSH Hospital Management & Public Health",
  "Medicinal Plant Sciences & Cultivation",
];

const YEAR_BY_BATCH = { 2023: "4th Year", 2024: "3rd Year", 2025: "2nd Year", 2026: "1st Year" };

/** Deterministic PRNG so the demo cohort is identical on every device. */
function makeRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildDemoCohort() {
  const rng = makeRng(20260904);
  const students = [];
  for (let i = 0; i < 60; i += 1) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    // The extra offset per wrap keeps names unique once i exceeds FIRST_NAMES,
    // instead of repeating the same first+last pair.
    const last = LAST_NAMES[(i * 7 + Math.floor(i / FIRST_NAMES.length) * 3) % LAST_NAMES.length];
    const department = DEMO_DEPARTMENTS[i % DEMO_DEPARTMENTS.length];
    const batch = BATCHES[Math.floor(rng() * BATCHES.length)];
    const core = DEPARTMENT_CORE_SKILL[department];
    // Everyone scores highest in their own department's core subject and
    // balanced across cross-cutting employability skills. Only the domains in
    // that department's rubric are scored — a B.Pharm (Ayu) student carrying a
    // Panchakarma score (or a BAMS student an HPTLC one) is what made the
    // roster and talent-pool views look fabricated.
    const domainScores = {};
    domainsFor({ department }).forEach((domain) => {
      let base = 52 + rng() * 28;
      if (domain === core) base += 18;
      if (domain === "AYUSH Digital Health & Telemedicine" && !department.includes("Hospital Management") && !department.includes("Postgraduate")) base -= 8;
      domainScores[domain] = Math.max(35, Math.min(97, Math.round(base)));
    });
    students.push({
      id: `demo-cohort-${i + 1}`,
      email: `${first}.${last}${i + 1}`.toLowerCase() + "@aiia.example.in",
      name: `${first} ${last}`,
      department,
      batch: String(batch),
      year: YEAR_BY_BATCH[batch],
      course: COURSE_BY_DEPT[department] || "Degree",
      rollNo: `${(COURSE_BY_DEPT[department] || "AYU").replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase()}/${batch}/${String(i + 1).padStart(3, "0")}`,
      phone: `+91 9${String(800000000 + Math.floor(rng() * 99999999)).slice(0, 9)}`,
      domainScores,
      openToOpportunities: rng() > 0.15,
    });
  }
  return students;
}

function seedAssessment(studentId, domainScores) {
  const values = Object.values(domainScores);
  insert("assessments", {
    studentId,
    domainScores,
    overallScore: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    strongTags: Object.entries(domainScores).filter(([, v]) => v >= 70).map(([k]) => k),
    updatedAt: new Date().toISOString(),
  });
  // A couple of dated attempts per student so semester-over-semester trend
  // views have something real to compute from.
  Object.entries(domainScores).slice(0, 4).forEach(([domain, score], idx) => {
    insert("assessmentAttempts", {
      studentId,
      testId: `demo-seed-${domain}`,
      domain,
      score: Math.max(20, score - (idx < 2 ? 9 : 0)),
      weight: 1,
      missed: false,
      completedAt: new Date(Date.now() - (idx < 2 ? 210 : 40) * 86400000).toISOString(),
    });
  });
}

const STAGE_ORDER = ["Applied", "Shortlisted", "Interview", "Hired"];

function buildDemoHistory(finalStatus, daysAgo) {
  const idx = Math.max(STAGE_ORDER.indexOf(finalStatus), 0);
  const appliedAtMs = Date.now() - daysAgo * 86400000;
  const spanMs = daysAgo * 86400000 * 0.8;
  return STAGE_ORDER.slice(0, idx + 1).map((status, i) => ({
    status,
    at: new Date(appliedAtMs + (idx === 0 ? 0 : (i / idx) * spanMs)).toISOString(),
  }));
}

/**
 * Every collection the demo seed writes into.
 *
 * This list is the fix for duplicated hiring drives, office-hours slots and
 * MOUs. Re-seeding used to clear only four collections — users, applications,
 * internships and announcements — so each time the seed version was bumped,
 * everything else the previous seed had written stayed behind and the new run
 * appended a second copy. "National Campus Hiring Drive 2026" therefore
 * appeared twice, with identical dates and stats, and so did every slot and
 * partnership. Anything the seed creates must be listed here.
 */
const DEMO_SEEDED_COLLECTIONS = [
  "drives",
  "driveInvites",
  "driveEligibility",
  "mous",
  "announcements",
  "notifyBatches",
  "studentNotifications",
  "institutionAdmins",
  "institutionProfiles",
  "institutionDocs",
  "placementHistory",
  "activityLog",
  "officeHours",
  "mentorBookings",
  "mentorNotes",
  "advisees",
  "collabListings",
  "collabInterests",
  "collabMessages",
  "collabMilestones",
  "collabFiles",
  "collabResponses",
  "researchOutputs",
  "programRegistrations",
  "programFeedback",
  "recruiters",
  "companyReviews",
  "credentials",
  "savedInternships",
  "savedSearches",
  "assessments",
  "assessmentAttempts",
  "skillTestRegistrations",
];

export function ensureDemoData() {
  if (!isBrowser() || !isDemoMode()) return;
  ensureSeeded();
  if (window.localStorage.getItem(nsKey(DEMO_VERSION_KEY))) return;

  /* Wipe everything the seed owns before writing it again — but ONLY what the
     seed owns. Clearing whole collections would take a real signed-in user's
     own results and applications with it, since their rows live in the same
     browser store. So rows are removed by ownership: anything belonging to a
     demo persona, to the demo institution, or to a previously seeded cohort
     student. Everything else is left exactly where it is. */
  try {
    const demoUserIds = new Set(
      all("users")
        .filter((u) => u.id?.startsWith("demo-") || u.institution === DEMO_INSTITUTION || u.instituteName === DEMO_INSTITUTION)
        .map((u) => u.id)
    );
    const isDemoOwned = (row) =>
      demoUserIds.has(row.studentId) ||
      demoUserIds.has(row.userId) ||
      demoUserIds.has(row.facultyId) ||
      demoUserIds.has(row.ownerId) ||
      demoUserIds.has(row.issuerId) ||
      demoUserIds.has(row.companyOwnerId) ||
      row.instituteName === DEMO_INSTITUTION ||
      String(row.ownerId || "").startsWith("demo-") ||
      String(row.id || "").startsWith("demo-");

    saveAll("users", all("users").filter((u) => !demoUserIds.has(u.id)));
    saveAll(
      "applications",
      all("applications").filter((a) => !demoUserIds.has(a.studentId) && !String(a.internshipId || "").startsWith("demo-"))
    );
    saveAll("internships", all("internships").filter((i) => i.ownerId !== "demo-industry"));
    DEMO_SEEDED_COLLECTIONS.forEach((collection) => {
      saveAll(collection, all(collection).filter((row) => !isDemoOwned(row)));
    });

    // Seed-owned catalogues are wholly replaced — every row in them carries
    // ownerId "seed", so nothing of a real user's is in there to lose.
    write("programs", SEED_PROGRAMS.map((p) => insertLocal(p, { ownerId: "seed", enrolled: Math.floor(p.seats * 0.5), status: "Open" })));
    write("skillTests", seedSkillTests().map((t) => insertLocal(t, { ownerId: "seed", status: "Open", postedAt: new Date().toISOString() })));

    // Older versions of the seed flag; clearing them keeps a browser that has
    // been through several releases from carrying orphaned rows forever.
    ["demoSeeded", "demoSeededV2", "demoSeededV3", "demoSeededV4", "demoSeededV5"].forEach((key) => window.localStorage.removeItem(nsKey(key)));
  } catch {
    // ignore
  }

  const rng = makeRng(76543);

  /* ---------- Institution ---------- */
  insert("users", {
    id: "demo-institution",
    email: "demo.institution@setu.dev",
    passwordHash: null,
    role: "institution",
    name: "Dr. Arvind Sundaram",
    instituteName: DEMO_INSTITUTION,
    instituteId: "AISHE-U-0842",
    verifiedCode: "APEX-INST-2026",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });

  saveInstitutionProfile(DEMO_INSTITUTION, {
    instituteType: "National Institute under Ministry of AYUSH",
    about:
      "An apex autonomous institute under the Ministry of AYUSH offering BAMS, MD/MS (Ayurveda) in fourteen specialities, PG diplomas in Panchakarma and Yoga therapy, and allied pharmacy and hospital-management streams, alongside a 200-bed NABH-accredited Ayurveda referral hospital. Facilities include a Schedule T-compliant teaching pharmacy, Panchakarma and Kshara-Sutra units, a pharmacognosy and drug-testing laboratory, a medicinal-plant garden and an eSanjeevani-AYUSH telemedicine hub.",
    addressLine: "Gautampuri, Mathura Road, Sarita Vihar",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110076",
    website: "https://aiia.example.in",
    established: "2016",
    accreditations: [
      { body: "NCISM", grade: "Permitted — BAMS & MD/MS (Ayu)", validTill: "2029-12-31", document: null, status: "Verified" },
      { body: "NAAC", grade: "A++", validTill: "2028-06-30", document: null, status: "Verified" },
      { body: "NABH (AYUSH)", grade: "Accredited Ayurveda Hospital", validTill: "2027-06-30", document: null, status: "Verified" },
      { body: "NIRF", grade: "Ranked Top 10 (Universities)", validTill: "2026-12-31", document: null, status: "Verified" },
    ],
    departments: DEMO_DEPARTMENTS.map((d, i) => ({
      name: d,
      hod: `Prof. ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
      seats: 30 + ((i * 7) % 50),
    })),
    placementCell: {
      officer: "Dr. Arvind Sundaram",
      designation: "Head, Training, Placement & Industry Liaison",
      email: "placement@aiia.example.in",
      phone: "+91 11 2930 0800",
    },
  });

  addInstitutionAdmin(DEMO_INSTITUTION, { name: "Dr. Arvind Sundaram", email: "placement@aiia.example.in", role: "Admin", designation: "Head, Training, Placement & Industry Liaison" });
  addInstitutionAdmin(DEMO_INSTITUTION, { name: "Pooja Sharma", email: "placement.exec@aiia.example.in", role: "Admin", designation: "Placement Executive" });
  addInstitutionAdmin(DEMO_INSTITUTION, { name: "Prof. Rajesh Nair", email: "dean.academics@aiia.example.in", role: "Viewer", designation: "Dean, Academics" });

  logActivity(DEMO_INSTITUTION, "Dr. Arvind Sundaram", "Updated institution profile", "NCISM permission & NABH section");
  logActivity(DEMO_INSTITUTION, "Pooja Sharma", "Imported student cohort", "60 records synced with the institute ERP");
  logActivity(DEMO_INSTITUTION, "Pooja Sharma", "Created placement drive", "National AYUSH Campus Hiring Drive 2026");

  // Official institution documents
  addInstitutionDoc(DEMO_INSTITUTION, {
    title: "AIIA Institutional Information Brochure 2026",
    category: "Brochure & Prospectus",
    fileName: "AIIA_Information_Brochure_2026.pdf",
    fileSize: "2.8 MB",
    dataUrl: "#",
    uploadedBy: "Dr. Arvind Sundaram",
  });
  addInstitutionDoc(DEMO_INSTITUTION, {
    title: "NCISM Minimum Standards Compliance & NABH Hospital Report 2025",
    category: "NIRF & Accreditations",
    fileName: "AIIA_NCISM_NABH_Compliance_2025.pdf",
    fileSize: "1.4 MB",
    dataUrl: "#",
    uploadedBy: "Dr. Arvind Sundaram",
  });
  addInstitutionDoc(DEMO_INSTITUTION, {
    title: "Internship, Training & Placement Operations Policy",
    category: "Placement Policy",
    fileName: "AIIA_Placement_Policy_and_Guidelines_v3.pdf",
    fileSize: "740 KB",
    dataUrl: "#",
    uploadedBy: "Pooja Sharma",
  });

  /* ---------- Student cohort ---------- */
  const cohort = buildDemoCohort();
  cohort.forEach((s) => {
    const { domainScores, ...profile } = s;
    insert("users", {
      ...profile,
      role: "student",
      passwordHash: null,
      institution: DEMO_INSTITUTION,
      emailVerified: true,
      createdAt: new Date().toISOString(),
    });
    seedAssessment(s.id, domainScores);
  });

  // A few students at peer institutions so the Talent Pool and platform-wide
  // views aren't a single-college echo chamber.
  PEER_INSTITUTIONS.forEach((inst, idx) => {
    const first = FIRST_NAMES[(idx * 5 + 3) % FIRST_NAMES.length];
    const last = LAST_NAMES[(idx * 11 + 2) % LAST_NAMES.length];
    const department = DEPARTMENTS[(idx * 3) % DEPARTMENTS.length];
    const id = `demo-peer-${idx + 1}`;
    insert("users", {
      id,
      email: `${first}.${last}`.toLowerCase() + `${idx}@peer.edu.in`,
      role: "student",
      passwordHash: null,
      name: `${first} ${last}`,
      institution: inst,
      department,
      course: COURSE_BY_DEPT[department] || "Degree",
      batch: "2024",
      year: "3rd Year",
      openToOpportunities: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
    });
    const scores = {};
    domainsFor({ department }).forEach((d) => { scores[d] = Math.round(50 + rng() * 40); });
    seedAssessment(id, scores);
  });

  /* ---------- Demo student persona ---------- */
  const student = insert("users", {
    id: "demo-student",
    email: "demo.student@setu.dev",
    passwordHash: null,
    role: "student",
    name: "Aarav Sharma",
    institution: DEMO_INSTITUTION,
    department: "Ayurveda (BAMS)",
    course: "BAMS",
    batch: "2023",
    year: "4th Year",
    rollNo: "23BAMS042",
    openToOpportunities: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });

  // Recorded scores across the eight domains of this student's stream rubric
  // (Ayurveda (BAMS) → the ASU&H clinical practice taxonomy).
  //
  // Attempts are back-dated weakest-first over the last few months rather than
  // all stamped with today: the score-trend chart plots one point per attempt,
  // so identical timestamps collapsed the x-axis into the same date repeated
  // eight times and made a rising average impossible to read.
  const demoAttempts = [
    ["demo-test-1", "ASU&H Clinical Fundamentals", 92],
    ["demo-test-2", "Problem Solving & Critical Thinking", 86],
    ["demo-test-3", "AYUSH Digital Health & Telemedicine", 85],
    ["demo-test-4", "Quantitative Aptitude", 84],
    ["demo-test-5", "Logical Reasoning", 88],
    ["demo-test-6", "Verbal Communication", 82],
    ["demo-test-7", "AYUSH Practice Management & Ethics", 78],
    ["demo-test-8", "AYUSH Research & Clinical Documentation", 74],
  ];
  const attemptOrder = [...demoAttempts].sort((a, b) => a[2] - b[2]).map(([testId]) => testId);
  demoAttempts.forEach(([testId, domain, score]) => {
    recordAssessmentResult(student.id, testId, domain, score);
    const attempt = getAttemptForTest(student.id, testId);
    if (!attempt) return;
    const daysAgo = 168 - attemptOrder.indexOf(testId) * 21;
    update("assessmentAttempts", attempt.id, { completedAt: new Date(Date.now() - daysAgo * 86400000).toISOString() });
  });

  savePortfolio(student.id, {
    bio: "Final-year BAMS intern focused on Kayachikitsa and Panchakarma, with hands-on rotations in a NABH-accredited Ayurveda hospital, a CTRI-registered clinical study and an eSanjeevani-AYUSH teleconsultation hub.",
    skillBadges: {
      "Clinical & Diagnostic Skills": [
        { name: "Nadi Pariksha & Prakriti Assessment", level: "Advanced" },
        { name: "Panchakarma (Vamana, Virechana, Basti)", level: "Proficient" },
        { name: "Case Taking & NAMASTE-coded Documentation", level: "Advanced" },
      ],
      "Research & Documentation": [
        { name: "Good Clinical Practice (ICH-GCP) & CTRI", level: "Advanced" },
        { name: "Biostatistics & Research Methodology", level: "Proficient" },
      ],
      "Digital Health & Practice": [
        { name: "eSanjeevani-AYUSH Teleconsultation", level: "Proficient" },
        { name: "Patient Counselling & Pathya-Apathya Planning", level: "Proficient" },
      ],
    },
    certifications: [
      { name: "Yoga Certification Board — Yoga Protocol Instructor (Level 1)", issuer: "Ministry of AYUSH / YCB", year: "2025", score: "Pass" },
      { name: "Good Clinical Practice for AYUSH Trials", issuer: "CCRAS", year: "2024", score: "Distinction" },
    ],
    timeline: [
      { year: "2023", title: "Admitted — BAMS (Bachelor of Ayurvedic Medicine & Surgery)", org: DEMO_INSTITUTION, type: "Education" },
      { year: "2025", title: "Clinical Research Intern — Ayurveda Trials", org: "Dabur Research Foundation", type: "Internship" },
    ],
    documents: [
      {
        id: "demo-doc-resume",
        name: SAMPLE_RESUME_FILENAME,
        type: "Resume",
        fileName: SAMPLE_RESUME_FILENAME,
        // A real PDF, not "#". See lib/sampleResume.js for why that matters.
        dataUrl: SAMPLE_RESUME_DATA_URL,
        size: 2009,
        uploadedAt: pastDate(14),
      },
    ],
  });

  /* ---------- Industry ---------- */
  const industry = insert("users", {
    id: "demo-industry",
    email: "demo.industry@setu.dev",
    passwordHash: null,
    role: "industry",
    name: "Rakesh Menon",
    companyName: "Dabur India Ltd.",
    companyDomain: "ASU&H Drug Manufacturing & GMP",
    companyDescription:
      "India's largest Ayurvedic and natural healthcare company, manufacturing classical and proprietary Ayurvedic medicines, health supplements and personal-care products under Schedule T GMP, with a dedicated research foundation running clinical and pharmacological studies.",
    companyWebsite: "https://dabur.example.in",
    hqLocation: "Ghaziabad, Uttar Pradesh",
    companySize: "5000+",
    whyWorkWithUs:
      "Interns rotate through GMP production lines, the pharmacognosy and QC laboratories and the Dabur Research Foundation's clinical-trial unit, working with senior vaidyas, pharmacognosists and regulatory specialists from week two.",
    workEmailDomain: "@dabur.example.in",
    verifiedCode: "APEX-IND-2026",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });

  addRecruiter(industry.id, { name: "Rakesh Menon", email: "rakesh.menon@dabur.example.in", title: "Head of Talent Acquisition", accessLevel: "Owner", notesVisible: true });
  addRecruiter(industry.id, { name: "Priya Kulkarni", email: "priya.k@dabur.example.in", title: "Lead Campus Recruiter — AYUSH Colleges", accessLevel: "Recruiter", notesVisible: true });
  addRecruiter(industry.id, { name: "Sneha Bose", email: "sneha.bose@dabur.example.in", title: "Quality & Manufacturing Recruiting Lead", accessLevel: "Recruiter", notesVisible: true });
  addRecruiter(industry.id, { name: "Imtiaz Khan", email: "imtiaz.khan@dabur.example.in", title: "Clinical Research Hiring Partner", accessLevel: "Recruiter", notesVisible: false });

  const posting = createInternship(industry.id, industry.companyName, {
    title: "Clinical Research Associate Intern – Ayurveda Trials (Dabur Research Foundation)",
    location: "Ghaziabad",
    type: "Hybrid",
    domain: "AYUSH Clinical Research",
    duration: "6 months",
    stipendAmount: 30000,
    stipendMode: "monthly",
    tags: ["Good Clinical Practice", "Clinical Documentation", "Biostatistics", "CTRI"],
    deadline: futureDate(40),
    description: "Support investigator-initiated and sponsored trials on classical Ayurvedic formulations — protocol drafting, CTRI registration, CRF design, site monitoring and adverse-event reporting under the Pharmacovigilance Programme for ASU&H drugs.",
    minSkillScore: 60,
    eligibleDepartments: ["Ayurveda (BAMS)", "Ayurveda Postgraduate (MD/MS Ayu)"],
  });
  update("internships", posting.id, { views: 248, uniqueViews: 182, recruiterName: "Imtiaz Khan" });

  const posting2 = createInternship(industry.id, industry.companyName, {
    title: "GMP Compliance & Quality Control Intern (ASU&H Drugs)",
    location: "Sahibabad, Ghaziabad",
    type: "Onsite",
    domain: "ASU&H Drug Manufacturing & GMP",
    duration: "6 months",
    stipendAmount: 26000,
    stipendMode: "monthly",
    tags: ["GMP Compliance", "HPTLC", "Heavy Metal Testing", "Quality Control"],
    deadline: futureDate(25),
    description: "Audit Schedule T compliance on classical (Chyawanprash, Asava-Arishta) and proprietary lines, review batch manufacturing records and run HPTLC, heavy-metal and microbial-load release tests.",
    minSkillScore: 55,
    eligibleDepartments: ["Ayurvedic Pharmacy (B.Pharm Ayu)", "Rasashastra & Bhaishajya Kalpana", "Dravyaguna & Pharmacognosy", "Medicinal Plant Sciences & Cultivation"],
  });
  update("internships", posting2.id, { views: 194, uniqueViews: 137, recruiterName: "Sneha Bose" });

  const posting3 = createInternship(industry.id, industry.companyName, {
    title: "Pharmacognosy & Raw Drug Authentication Intern",
    location: "Ghaziabad",
    type: "Onsite",
    domain: "Pharmacognosy & Raw Drug Authentication",
    duration: "4 months",
    stipendAmount: 150000,
    stipendMode: "total",
    tags: ["Raw Drug Authentication", "Pharmacognosy", "HPTLC", "GACP"],
    deadline: futureDate(30),
    description: "Authenticate incoming crude drugs against Ayurvedic Pharmacopoeia of India monographs, build HPTLC reference fingerprints and trace GACP-sourced lots through the supply chain.",
    minSkillScore: 50,
    eligibleDepartments: ["Dravyaguna & Pharmacognosy", "Ayurvedic Pharmacy (B.Pharm Ayu)", "Medicinal Plant Sciences & Cultivation"],
  });
  update("internships", posting3.id, { views: 118, uniqueViews: 84, recruiterName: "Priya Kulkarni" });

  const demoApplicants = [
    { studentId: student.id, studentName: student.name, studentInstitution: student.institution, studentCourse: student.course, match: 94, status: "Shortlisted", daysAgo: 4, posting },
    { studentName: "Kabir Reddy", studentInstitution: "National Institute of Ayurveda (NIA), Jaipur", studentCourse: "BAMS", match: 96, status: "Interview", daysAgo: 8, posting },
    { studentName: "Sara Iyer", studentInstitution: "Institute of Teaching & Research in Ayurveda (ITRA), Jamnagar", studentCourse: "MD (Ayu) Kayachikitsa", match: 91, status: "Interview", daysAgo: 6, posting },
    { studentName: "Rohan Bhat", studentInstitution: DEMO_INSTITUTION, studentCourse: "BAMS", match: 95, status: "Hired", daysAgo: 22, posting, offerStage: "Joined", joiningDate: pastDate(3), offerAmount: "₹30,000/mo", offerSentDaysAgo: 12, offerUpdatedDaysAgo: 3 },
    { studentName: "Nithya Menon", studentInstitution: "Gujarat Ayurved University, Jamnagar", studentCourse: "B.Pharm (Ayurveda)", match: 88, status: "Interview", daysAgo: 7, posting: posting2 },
    { studentName: "Farhan Ansari", studentInstitution: "National Institute of Unani Medicine (NIUM), Bengaluru", studentCourse: "MD (Unani) Ilmul Advia", match: 86, status: "Shortlisted", daysAgo: 3, posting: posting2 },
    { studentName: "Kavya Pillai", studentInstitution: DEMO_INSTITUTION, studentCourse: "MD (Ayu) Dravyaguna", match: 89, status: "Hired", daysAgo: 16, posting: posting3, offerStage: "Offer accepted", joiningDate: futureDate(18), offerAmount: "₹25,000/mo", offerSentDaysAgo: 9, offerUpdatedDaysAgo: 5 },
    { studentName: "Aditya Rao", studentInstitution: "Uttarakhand Ayurved University, Dehradun", studentCourse: "BAMS", match: 92, status: "Shortlisted", daysAgo: 5, posting },
    { studentName: "Zoya Ansari", studentInstitution: DEMO_INSTITUTION, studentCourse: "BAMS", match: 87, status: "Applied", daysAgo: 2, posting },
    { studentName: "Harsh Saxena", studentInstitution: "National Institute of Siddha (NIS), Chennai", studentCourse: "MD (Siddha) Gunapadam", match: 78, status: "Applied", daysAgo: 2, posting: posting2 },
    { studentName: "Ritika Joshi", studentInstitution: DEMO_INSTITUTION, studentCourse: "BAMS", match: 97, status: "Hired", daysAgo: 26, posting, offerStage: "Joined", joiningDate: pastDate(8), offerAmount: "₹32,000/mo", offerSentDaysAgo: 17, offerUpdatedDaysAgo: 8 },
    { studentName: "Aryan Mehta", studentInstitution: "National Institute of Homoeopathy (NIH), Kolkata", studentCourse: "MD (Hom) Pharmacy", match: 83, status: "Interview", daysAgo: 9, posting: posting2 },
  ];

  demoApplicants.forEach((a) => {
    insert("applications", {
      internshipId: a.posting.id,
      internshipTitle: a.posting.title,
      company: a.posting.company,
      studentId: a.studentId || `demo-applicant-${a.studentName.replace(/\s+/g, "-").toLowerCase()}`,
      studentName: a.studentName,
      studentInstitution: a.studentInstitution,
      studentCourse: a.studentCourse,
      match: a.match,
      status: a.status,
      appliedAt: new Date(Date.now() - a.daysAgo * 86400000).toISOString(),
      statusHistory: buildDemoHistory(a.status, a.daysAgo),
      offerStage: a.offerStage || (a.status === "Hired" ? "Offer sent" : undefined),
      joiningDate: a.joiningDate,
      // Offer columns are only meaningful with real timestamps behind them —
      // seeded hires carry the date the offer went out and the date its
      // status last moved, so "Offered" and "Updated" are never a column of
      // permanent em-dashes.
      offerAmount: a.offerAmount,
      offerSentAt: a.offerSentDaysAgo != null ? new Date(Date.now() - a.offerSentDaysAgo * 86400000).toISOString() : undefined,
      offerUpdatedAt: a.offerUpdatedDaysAgo != null ? new Date(Date.now() - a.offerUpdatedDaysAgo * 86400000).toISOString() : undefined,
    });
  });

  // Applications from the wider cohort so institution/academician analytics
  // have a believable funnel rather than a handful of rows.
  const openPostings = all("internships").filter((i) => i.ownerId === "seed");
  cohort.slice(0, 48).forEach((s, idx) => {
    const target = openPostings[idx % openPostings.length];
    if (!target) return;
    const roll = rng();
    const status = roll > 0.7 ? "Hired" : roll > 0.5 ? "Interview" : roll > 0.28 ? "Shortlisted" : "Applied";
    const daysAgo = 5 + Math.floor(rng() * 40);
    insert("applications", {
      internshipId: target.id,
      internshipTitle: target.title,
      company: target.company,
      studentId: s.id,
      studentName: s.name,
      studentInstitution: DEMO_INSTITUTION,
      studentCourse: s.course,
      studentYear: s.year,
      match: 55 + Math.floor(rng() * 42),
      status,
      appliedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      statusHistory: buildDemoHistory(status, daysAgo),
      offerStage: status === "Hired" ? "Offer accepted" : undefined,
    });
  });

  addCompanyReview(industry.companyName, { author: "Former clinical research intern, 2025", role: "Clinical Research Associate Intern – Ayurveda Trials", rating: 5, body: "Real CTRI-registered trials from month one, rigorous GCP training, and excellent mentorship from the Research Foundation's vaidyas." });
  addCompanyReview(industry.companyName, { author: "Former QC intern, 2025", role: "GMP Compliance & Quality Control Intern", rating: 5, body: "Hands-on HPTLC and heavy-metal release testing on live batches, with a Schedule T audit walkthrough every fortnight." });
  addCompanyReview(industry.companyName, { author: "Former pharmacognosy intern, 2026", role: "Raw Drug Authentication Intern", rating: 4, body: "Great exposure to API monographs and GACP-sourced supply chains; the herbarium and reference-fingerprint library are exceptional." });

  /* ---------- Academician ---------- */
  const academician = insert("users", {
    id: "demo-academician",
    email: "demo.academician@setu.dev",
    passwordHash: null,
    role: "academician",
    name: "Dr. Shalini Kulkarni",
    institution: DEMO_INSTITUTION,
    department: "Dravyaguna & Pharmacognosy",
    designation: "Associate Professor",
    experienceYears: "14",
    subjectsTaught: ["Dravyaguna Vijnana", "Pharmacognosy & Raw Drug Standardisation", "Research Methodology for Ayurveda"],
    researchInterests: ["HPTLC Standardisation of Classical Formulations", "Medicinal Plant Pharmacology", "AYUSH Pharmacovigilance"],
    orcid: "0000-0002-1825-0097",
    scholarUrl: "https://scholar.google.com/citations?user=demo",
    linkedIn: "https://linkedin.com/in/demo-faculty",
    phone: "+91 11 2930 0882",
    verifiedCode: "APEX-FAC-2026",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });

  const hostedProgram = createProgram(academician.id, academician.institution, {
    title: "Hands-on Workshop: HPTLC Fingerprinting & Raw Drug Standardisation",
    dates: "Dec 8–12, 2026",
    seats: 25,
    mode: "Onsite",
    description: "A five-day practical workshop covering API monograph-based authentication, HPTLC fingerprinting, heavy-metal and microbial-load testing, and reproducible documentation for ASU drug quality.",
    venue: "Pharmacognosy & Drug Testing Laboratory, AIIA",
  });

  [
    { name: "Dr. Anil Trivedi", email: "anil.trivedi@nia.example.in", institution: "National Institute of Ayurveda (NIA), Jaipur", designation: "Assistant Professor" },
    { name: "Dr. Vandana Bose", email: "vandana.bose@itra.example.in", institution: "Institute of Teaching & Research in Ayurveda (ITRA), Jamnagar", designation: "Associate Professor" },
    { name: "Dr. S. Karthik", email: "karthik@nis.example.in", institution: "National Institute of Siddha (NIS), Chennai", designation: "Professor" },
    { name: "Dr. Nusrat Jahan", email: "nusrat@nium.example.in", institution: "National Institute of Unani Medicine (NIUM), Bengaluru", designation: "Assistant Professor" },
  ].forEach((p, i) =>
    registerForProgram(hostedProgram.id, `demo-fdp-attendee-${i + 1}`, p)
  );

  createCollabListing(academician.id, academician.name, {
    title: "HPTLC Reference Fingerprint Library for Ayurvedic Pharmacopoeia Single Drugs",
    description:
      "Seeking co-investigators to build reproducible HPTLC fingerprints and heavy-metal baselines for the first 50 API single-drug monographs, using authenticated GACP-sourced samples from multiple agro-climatic zones.",
    expertise: ["Pharmacognosy, HPTLC & Raw Drug Standardisation", "Dravyaguna & Medicinal Plant Pharmacology"],
    funded: true,
    fundingSource: "Ministry of AYUSH — Intramural research grant",
    collaboratorsNeeded: 3,
    deadline: futureDate(35),
    institution: DEMO_INSTITUTION,
  });

  const openListing = listCollabListingsByOwner(academician.id)[0];
  if (openListing) {
    expressCollabInterest(openListing.id, { id: "demo-peer-1", name: "Dr. Anil Trivedi", institution: "National Institute of Ayurveda (NIA), Jaipur" }, "We have an HPTLC unit and a medicinal-plant garden, and can contribute two PG scholars.");
    expressCollabInterest(openListing.id, { id: "demo-peer-2", name: "Dabur Research Foundation", institution: "Dabur Research Foundation" }, "Happy to co-fund reference standards and validate fingerprints against our in-house library.");
  }

  setCollabResponse("collab_2", "Accepted");
  postCollabMessage("collab_2", "Dr. Shalini Kulkarni", "Sharing the draft outcome-measure sheet (HbA1c, fasting glucose, Prakriti-wise sub-groups) — please review section 3 before Friday.");
  postCollabMessage("collab_2", "Dr. Anil Trivedi", "Reviewed. Suggest we add a 12-week follow-up window to match the multi-centre CCRAS protocol.");
  addCollabMilestone("collab_2", { title: "Finalise outcome-measure instrument", due: futureDate(12), owner: "Dr. Shalini Kulkarni" });
  addCollabMilestone("collab_2", { title: "Institutional Ethics Committee submission & CTRI registration", due: futureDate(30), owner: "Dr. Anil Trivedi" });
  addCollabMilestone("collab_2", { title: "Pilot data collection (n=40)", due: futureDate(75), owner: "Joint" });
  const firstMilestone = listCollabMilestones("collab_2")[0];
  if (firstMilestone) toggleCollabMilestone(firstMilestone.id);

  addResearchOutput(academician.id, {
    type: "Journal Paper",
    title: "HPTLC fingerprinting and heavy-metal profiling of market samples of Ashwagandha churna",
    venue: "Journal of Ayurveda and Integrative Medicine",
    year: "2025",
    url: "https://doi.org/10.0000/jaim.2025.0117",
    collabId: "collab_2",
  });
  addResearchOutput(academician.id, {
    type: "Journal Paper",
    title: "Standardisation frameworks for classical Ayurvedic formulations: a scoping review of API and WHO guidance",
    venue: "AYU — International Quarterly Journal of Research in Ayurveda",
    year: "2024",
    url: "https://doi.org/10.0000/ayu.2024.0442",
    collabId: "collab_2",
  });
  addResearchOutput(academician.id, {
    type: "Patent",
    title: "A rapid field kit for authentication of Guduchi (Tinospora cordifolia) stem against common adulterants",
    venue: "Indian Patent Office (filed)",
    year: "2025",
  });

  // Advisees: the demo faculty mentors their own department's students.
  const deptStudents = cohort.filter((s) => s.department === academician.department).slice(0, 8);
  [student, ...deptStudents].forEach((s) => addAdvisee(academician.id, s.id));
  if (deptStudents[0]) saveMentorNote(academician.id, deptStudents[0].id, { note: "Strong pharmacognosy bench discipline and clean HPTLC technique. Excellent aptitude for QC and raw-drug authentication roles.", flag: "Promising" });
  saveMentorNote(academician.id, student.id, { note: "Exceptional clinical and research-documentation profile. Well suited for CCRAS or industry clinical-research roles.", flag: "Promising" });

  addOfficeHourSlot(academician.id, { title: "Dissertation & career guidance", slot: `${futureDate(2)}T15:00`, durationMins: 30, capacity: 2, mode: "In person", location: "Dravyaguna Block, Room 302", notes: "Bring a one-page summary of where you are stuck." });
  addOfficeHourSlot(academician.id, { title: "Open office hours", slot: `${futureDate(4)}T11:00`, durationMins: 30, capacity: 3, mode: "Online", meetingUrl: "https://meet.example.edu/aiia-office-hours", location: "" });
  addOfficeHourSlot(academician.id, { title: "Placement readiness review", slot: `${futureDate(9)}T16:30`, durationMins: 45, capacity: 2, mode: "In person", location: "Dravyaguna Block, Room 302" });
  const firstSlot = listOfficeHours(academician.id)[0];
  if (firstSlot && deptStudents[0]) {
    bookOfficeHourSlot(firstSlot, { id: deptStudents[0].id, name: deptStudents[0].name }, "Guidance on PG dissertation (HPTLC standardisation)");
  }

  /* ---------- Institution: MOUs, drives, notices, history ---------- */
  [
    { partner: "Arya Vaidya Sala, Kottakkal", scope: ["Internships", "Placements", "Guest Lectures"], signedDate: pastDate(260), expiryDate: futureDate(470), contactName: "Sneha Bose", contactEmail: "campus@aryavaidyasala.example.in", contactPhone: "+91 483 274 2216", notes: "Six-month clinical internships in Kayachikitsa and Panchakarma plus an annual classical-formulation workshop on campus." },
    { partner: "Dabur India Ltd.", scope: ["Internships", "Placements", "Joint Research"], signedDate: pastDate(380), expiryDate: futureDate(350), contactName: "Rakesh Menon", contactEmail: "rakesh.menon@dabur.example.in", contactPhone: "+91 120 396 2100", notes: "Annual intake of 20 clinical-research, QC and pharmacognosy interns via the Dabur Research Foundation." },
    { partner: "Himalaya Wellness Company", scope: ["Internships", "Industrial Visits", "Faculty Development"], signedDate: pastDate(520), expiryDate: futureDate(210), contactName: "Vikram Deshmukh", contactEmail: "hr.campus@himalaya.example.in", contactPhone: "+91 80 2371 4444", notes: "Formulation R&D and pharmacognosy intake; hosts the annual GMP plant visit at Makali." },
    { partner: "Central Council for Research in Ayurvedic Sciences (CCRAS)", scope: ["Placements", "Guest Lectures"], signedDate: pastDate(340), expiryDate: futureDate(75), contactName: "Anjali Verma", contactEmail: "talent@ccras.example.in", contactPhone: "+91 11 2873 1102", notes: "Senior Research Fellow and CRA placements — annual recruitment schedule confirmed." },
    { partner: "Kerala Ayurveda Ltd.", scope: ["Internships", "Placements"], signedDate: pastDate(180), expiryDate: futureDate(550), contactName: "Alan Mathew", contactEmail: "careers@keralaayurveda.example.in", contactPhone: "+91 484 247 6301", notes: "Panchakarma therapist and wellness-centre internship rotations." },
    { partner: "Central Council for Research in Yoga & Naturopathy (CCRYN)", scope: ["Joint Research", "Faculty Development"], signedDate: pastDate(700), expiryDate: futureDate(60), contactName: "Dr. P. Raghavan", contactEmail: "raghavan@ccryn.example.in", contactPhone: "+91 11 2372 1472", notes: "Annual research fellowships for Swasthavritta & Yoga PG scholars." },
  ].forEach((m) => {
    const created = createMou(DEMO_INSTITUTION, m);
    addMouTimelineEvent(created.id, "MOU signed");
    if (mouStatus(created) === "Renewal due") addMouTimelineEvent(created.id, "Renewal reminder sent");
  });

  const drive = createDrive(DEMO_INSTITUTION, {
    title: "National AYUSH Campus Hiring Drive 2026",
    date: futureDate(26),
    venue: "Convocation Hall & Panchakarma Block Auditorium, AIIA Campus",
    eligibleBatches: ["2023", "2024"],
    description:
      "Consolidated campus placement drive across ASU&H drug manufacturers, classical Ayurveda hospitals, research councils and wellness chains. Pre-placement talks run in the morning; clinical viva, written tests and interviews run in parallel tracks through the afternoon.",
    eligibilityCriteria: "2023 and 2024 batches, internship posting completed or in progress, minimum 60% aggregate",
    eligibleDepartments: ["Ayurveda (BAMS)", "Ayurveda Postgraduate (MD/MS Ayu)", "Panchakarma (PG Diploma)", "Dravyaguna & Pharmacognosy", "Ayurvedic Pharmacy (B.Pharm Ayu)"],
    minSkillScore: 60,
    registrationDeadline: futureDate(12),
    capacity: 220,
    coordinatorName: "Pooja Sharma",
    coordinatorEmail: "placement.exec@aiia.example.in",
    coordinatorPhone: "+91 11 2930 0800",
    tags: ["Clinical Ayurveda", "Panchakarma", "GMP & QC", "Clinical Research", "Wellness"],
  });
  [
    { company: "Dabur India Ltd.", contact: "Rakesh Menon", roles: "Clinical Research Associate Intern, GMP & QC Intern", rsvp: "Confirmed", expectedRoles: 25 },
    { company: "Arya Vaidya Sala, Kottakkal", contact: "Sneha Bose", roles: "Ayurvedic Physician Intern, Panchakarma Therapist Intern", rsvp: "Confirmed", expectedRoles: 18 },
    { company: "Himalaya Wellness Company", contact: "Vikram Deshmukh", roles: "Herbal Formulation & Nutraceutical R&D Intern", rsvp: "Confirmed", expectedRoles: 12 },
    { company: "Central Council for Research in Ayurvedic Sciences (CCRAS)", contact: "Anjali Verma", roles: "Senior Research Fellow (Ayurveda), Clinical Research Associate", rsvp: "Confirmed", expectedRoles: 8 },
    { company: "Kerala Ayurveda Ltd.", contact: "Alan Mathew", roles: "AYUSH Wellness & Spa Therapist Intern", rsvp: "Invited", expectedRoles: 5 },
  ].forEach((i) => {
    const invite = inviteCompanyToDrive(drive.id, { company: i.company, contact: i.contact, roles: i.roles, expectedRoles: i.expectedRoles });
    if (i.rsvp !== "Invited") setDriveInviteRsvp(invite.id, i.rsvp);
  });
  tagStudentsForDrive(drive.id, cohort.filter((s) => s.batch === "2023").map((s) => s.id).slice(0, 14));

  createDrive(DEMO_INSTITUTION, {
    title: "ASU&H Pharma, GMP & Quality Hiring Days",
    date: futureDate(58),
    venue: "Pharmacognosy & Drug Testing Laboratory, Labs A & B",
    eligibleBatches: ["2023"],
    description:
      "Focused recruitment for GMP compliance, QC/QA, pharmacognosy and regulatory-affairs roles at ASU&H drug manufacturers. Bench-based HPTLC and raw-drug identification rounds on campus equipment, followed by technical and behavioural interviews.",
    eligibilityCriteria: "2023 batch Dravyaguna, Rasashastra and B.Pharm (Ayu); practical bench round on the day",
    eligibleDepartments: ["Dravyaguna & Pharmacognosy", "Rasashastra & Bhaishajya Kalpana", "Ayurvedic Pharmacy (B.Pharm Ayu)"],
    minSkillScore: 65,
    registrationDeadline: futureDate(44),
    capacity: 90,
    coordinatorName: "Dr. Arvind Sundaram",
    coordinatorEmail: "placement@aiia.example.in",
    coordinatorPhone: "+91 11 2930 0800",
    tags: ["GMP & QC", "Pharmacognosy", "Regulatory Affairs"],
  });

  createDrive(DEMO_INSTITUTION, {
    title: "Clinical, Wellness & Public Health Hiring Week",
    date: futureDate(72),
    venue: "Auditorium 2, AIIA",
    eligibleBatches: ["2023", "2024"],
    description:
      "A week of interviews across Ayurvedic physician, Panchakarma therapist, wellness-centre, telemedicine and AYUSH hospital-administration roles, with one employer per day and a shared clinical-fundamentals round on the opening morning.",
    eligibilityCriteria: "Open to all clinical, therapy and hospital-management departments, 2023–2024 batches",
    eligibleDepartments: ["Ayurveda (BAMS)", "Panchakarma (PG Diploma)", "Swasthavritta & Yoga (Preventive Health)", "Panchakarma Therapy Assistant (Diploma)", "AYUSH Hospital Management & Public Health"],
    minSkillScore: 55,
    registrationDeadline: futureDate(58),
    capacity: 150,
    coordinatorName: "Prof. Rajesh Nair",
    coordinatorEmail: "dean.academics@aiia.example.in",
    coordinatorPhone: "+91 11 2930 0812",
    tags: ["Clinical Ayurveda", "Panchakarma", "Wellness", "Telemedicine", "Public Health"],
  });

  [
    {
      title: "National AYUSH Campus Placement Drive 2026 Registration Open",
      body: "All 2023 and 2024 batch students across BAMS, MD/MS (Ayu), PG Diploma, Dravyaguna and B.Pharm (Ayu) streams must complete portal registration by 20 November. Please review the attached schedule and guidelines.",
      audience: "All students",
      pinned: true,
      attachment: sampleAttachment("National_AYUSH_Campus_Hiring_Schedule_2026.pdf", "National AYUSH Campus Hiring Schedule 2026", [
        "Registration window: 1 - 20 November 2026",
        "Eligible batches: 2023 and 2024, all AYUSH streams",
        "Pre-placement talks by Dabur, Arya Vaidya Sala, Himalaya and CCRAS begin the first week of December.",
        "Bring a printed resume, NCISM provisional registration (where applicable) and photo ID to every on-campus round.",
      ]),
    },
    {
      title: "HPTLC Fingerprinting & ASU Drug Standardisation Workshop",
      body: "The Department of Dravyaguna is hosting a 3-day intensive hands-on session on API monograph-based authentication, HPTLC fingerprinting and heavy-metal testing. View attached syllabus.",
      audience: "Pre-final year",
      pinned: false,
      attachment: sampleAttachment("HPTLC_Standardisation_Workshop_Syllabus.pdf", "HPTLC Fingerprinting and ASU Drug Standardisation - Syllabus", [
        "Day 1: API monographs, macroscopy and microscopy of crude drugs",
        "Day 2: HPTLC plate development, fingerprint documentation and Rf comparison",
        "Day 3: Heavy-metal and microbial-load limit tests and a capstone batch release",
        "Prerequisites: second-professional Dravyaguna or B.Pharm (Ayu) coursework.",
      ]),
    },
    {
      title: "AIIA Intramural Research Fellowship & Innovation Grant Submissions",
      body: "Faculty and student collaborative project applications are now open for institutional research grants under the Ministry of AYUSH intramural scheme. Proposal guidelines attached.",
      audience: "All students",
      pinned: false,
      attachment: sampleAttachment("Intramural_Grant_Guidelines_2026.pdf", "Intramural Research Grant Guidelines 2026", [
        "Grant size: up to Rs 5,00,000 per project",
        "Teams must pair at least one faculty member with two students.",
        "Clinical proposals must include an IEC approval plan and CTRI registration timeline.",
        "Submissions close 15 December 2026.",
      ]),
    },
    {
      title: "Clinical Viva & Mock Interview Clinics — Every Wednesday",
      body: "The Training & Placement Cell runs walk-in clinical viva and mock interviews from 2–5 PM in Room 204. All pre-final and final year students welcome.",
      audience: "Final year",
      pinned: false,
    },
  ].forEach((a) => {
    const created = createAnnouncement(DEMO_INSTITUTION, { ...a, author: "Dr. Arvind Sundaram" });
    const recipients = a.audience === "All students" ? [student.id, ...cohort.map((s) => s.id)] : [student.id];
    notifyStudents(DEMO_INSTITUTION, recipients, `${a.title} — ${a.body}`, "Dr. Arvind Sundaram");
    update("announcements", created.id, { recipients: recipients.length });
  });

  // The demo student's mentor has already recommended a role to them
  recommendPostingToStudent(academician, student.id, posting);

  [
    { batch: 2021, department: "Ayurveda (BAMS)", students: 84, placed: 72, medianStipend: 22000, topRecruiter: "Arya Vaidya Sala, Kottakkal" },
    { batch: 2021, department: "Dravyaguna & Pharmacognosy", students: 62, placed: 48, medianStipend: 24000, topRecruiter: "Dabur India Ltd." },
    { batch: 2022, department: "Ayurveda (BAMS)", students: 88, placed: 78, medianStipend: 24000, topRecruiter: "Arya Vaidya Sala, Kottakkal" },
    { batch: 2022, department: "Panchakarma (PG Diploma)", students: 58, placed: 42, medianStipend: 20000, topRecruiter: "Kerala Ayurveda Ltd." },
    { batch: 2023, department: "Ayurveda (BAMS)", students: 92, placed: 84, medianStipend: 26000, topRecruiter: "Dabur India Ltd." },
    { batch: 2023, department: "AYUSH Hospital Management & Public Health", students: 46, placed: 40, medianStipend: 25000, topRecruiter: "Central Council for Research in Ayurvedic Sciences (CCRAS)" },
    { batch: 2024, department: "Ayurveda (BAMS)", students: 96, placed: 88, medianStipend: 28000, topRecruiter: "Dabur India Ltd." },
    { batch: 2024, department: "Swasthavritta & Yoga (Preventive Health)", students: 28, placed: 24, medianStipend: 22000, topRecruiter: "Central Council for Research in Yoga & Naturopathy (CCRYN)" },
    { batch: 2025, department: "Ayurveda (BAMS)", students: 98, placed: 91, medianStipend: 30000, topRecruiter: "Dabur India Ltd." },
    { batch: 2025, department: "Ayurvedic Pharmacy (B.Pharm Ayu)", students: 34, placed: 28, medianStipend: 24000, topRecruiter: "Himalaya Wellness Company" },
  ].forEach((r) => upsertPlacementHistory(DEMO_INSTITUTION, r));

  window.localStorage.setItem(nsKey(DEMO_VERSION_KEY), "1");
}

/** Entering demo mode switches this browser onto the sandbox namespace first. */
export function getDemoUser(role) {
  setDemoMode(true);
  ensureDemoData();
  return findOne("users", (u) => u.id === `demo-${role}`);
}

function randomColor() {
  const palette = ["#6B7C3C", "#8A4A3C", "#3C5A8A", "#5A3C8A", "#8A703C", "#3C6B8A", "#3C8A6B", "#6B3C8A"];
  return palette[Math.floor(Math.random() * palette.length)];
}
