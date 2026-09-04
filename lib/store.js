"use client";

/**
 * Local, browser-persisted data layer standing in for a real database.
 * Every "collection" is a JSON array in localStorage. The shape mirrors
 * what a Firestore/Convex collection would look like, so swapping in a real
 * backend later just means replacing the functions in this file.
 */

import { DEPARTMENTS, DEPARTMENT_CORE_SKILL } from "./domains";
import { SKILL_DOMAINS } from "./questionBank";
import { broadcastMutation } from "./sync";

const NS = "ayusetu:v6:";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(collection) {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(NS + collection);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(collection, arr) {
  if (!isBrowser()) return;
  window.localStorage.setItem(NS + collection, JSON.stringify(arr));
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

   SIH26044 is a Ministry of Ayush problem statement, so every
   sample employer, institution, posting and test below sits in
   the AYUSH ecosystem — Ayurveda, Yoga & Naturopathy, Unani,
   Siddha and Homeopathy — rather than a generic cross-industry
   mix. Seeded records use ownerId: "seed" so they never show up
   as "mine" for a fresh account.
   ============================================================ */

export const DEMO_INSTITUTION = "Apex University of Technology & Applied Sciences";

export const PEER_INSTITUTIONS = [
  "Indian Institute of Technology, Delhi",
  "National Institute of Technology, Trichy",
  "Sardar Institute of Technology, Pune",
  "Nalanda School of Management, Bengaluru",
  "Coastal University of Science & Design, Kochi",
  "Birla Institute of Technology & Science, Pilani",
  "All India Institute of Integrated Medical & Ayush Sciences, New Delhi",
  "Institute of Ayurvedic Teaching & Research, Jamnagar",
];

const SEED_INTERNSHIPS = [
  { title: "Software Development Intern", company: "Meridian Software Labs", location: "Bengaluru", type: "Hybrid", domain: "Information Technology & Software", duration: "6 months", stipend: "₹35,000/mo", tags: ["React", "Node.js", "SQL"], deadline: "2026-10-18", description: "Ship features end-to-end on a production web platform alongside a full engineering pod.", color: "#3C5A8A", hot: true },
  { title: "Data Science Intern", company: "Anvaya Analytics", location: "Hyderabad", type: "Remote", domain: "Data Science & AI", duration: "4 months", stipend: "₹30,000/mo", tags: ["Python", "Machine Learning", "Data Visualisation"], deadline: "2026-10-25", description: "Build forecasting models and dashboards for retail and healthcare clients.", color: "#5A3C8A", hot: true },
  { title: "Product Design Intern", company: "Indigo Studio", location: "Bengaluru", type: "Hybrid", domain: "Design & Creative", duration: "4 months", stipend: "₹25,000/mo", tags: ["Figma", "User Research", "Prototyping"], deadline: "2026-11-22", description: "Design and user-test flows for a consumer product used across India.", color: "#8A3C6B", hot: true },
  { title: "Mechanical Design Intern", company: "Shakti Motors Ltd.", location: "Pune", type: "Onsite", domain: "Manufacturing & Core Engineering", duration: "5 months", stipend: "₹22,000/mo", tags: ["AutoCAD", "SolidWorks", "GD&T"], deadline: "2026-11-05", description: "Support component tolerancing, prototype validation and design-for-manufacture reviews.", color: "#8A4A3C", hot: true },
  { title: "Financial Analyst Intern", company: "Meghdoot Capital Advisors", location: "Mumbai", type: "Hybrid", domain: "Banking, Finance & Insurance", duration: "3 months", stipend: "₹28,000/mo", tags: ["Financial Modelling", "Excel", "Risk Analysis"], deadline: "2026-11-12", description: "Build valuation models and credit assessments for mid-market corporate clients.", color: "#3C4A8A", hot: false },
  { title: "Biotech Research Intern", company: "Nucleus Biosciences", location: "Hyderabad", type: "Onsite", domain: "Pharmaceuticals & Biotechnology", duration: "6 months", stipend: "₹24,000/mo", tags: ["Research Methodology", "Quality Control", "Biostatistics"], deadline: "2026-12-18", description: "Assist on formulation stability studies and analytical method development.", color: "#3C6B8A", hot: false },
  { title: "Ayurvedic Formulation Intern", company: "Himadri Ayurveda Pharmaceuticals Ltd.", location: "Haridwar", type: "Onsite", domain: "Ayush Pharmaceuticals & Nutraceuticals", duration: "6 months", stipend: "₹18,000/mo", tags: ["Dravyaguna", "GMP Compliance", "Quality Control"], deadline: "2026-10-12", description: "Work with the formulation team on classical and proprietary Ayurvedic preparations, from raw-material intake through batch release.", color: "#3C6B8A", hot: false },
  { title: "Clinical Research Associate Intern", company: "Council for Ayurvedic Sciences Research", location: "New Delhi", type: "Hybrid", domain: "Ayush Clinical Research", duration: "6 months", stipend: "₹22,000/mo", tags: ["Good Clinical Practice", "Clinical Documentation", "Biostatistics"], deadline: "2026-10-05", description: "Support a multi-centre trial on Ayurvedic management of metabolic syndrome — CRF design, site monitoring and data cleaning.", color: "#6B3C8A", hot: false },
  { title: "Digital Marketing Intern", company: "Prakash Consumer Brands", location: "Remote", type: "Remote", domain: "Marketing & Advertising", duration: "3 months", stipend: "₹18,000/mo", tags: ["SEO", "Content Strategy", "Market Research"], deadline: "2026-11-28", description: "Plan and measure digital campaigns across a portfolio of consumer brands.", color: "#8A703C", hot: false },
  { title: "Supply Chain Operations Intern", company: "Kaveri Logistics Network", location: "Chennai", type: "Onsite", domain: "Supply Chain & Logistics", duration: "4 months", stipend: "₹20,000/mo", tags: ["Supply Chain", "Excel", "Process Improvement"], deadline: "2026-12-04", description: "Work with the operations team to optimise warehousing and last-mile delivery workflows.", color: "#3C7C6B", hot: false },
  { title: "Hospital Administration Intern", company: "Arogya Multispecialty Hospital", location: "Jaipur", type: "Onsite", domain: "Healthcare & Hospital Administration", duration: "4 months", stipend: "₹16,000/mo", tags: ["Clinical Documentation", "Process Improvement", "Communication"], deadline: "2026-12-11", description: "Support patient-flow analysis, NABH documentation and departmental coordination.", color: "#2E93A5", hot: false },
  { title: "Digital Health Informatics Intern", company: "AyushGrid Digital Health Labs", location: "Remote", type: "Remote", domain: "Digital Health & Health Informatics", duration: "3 months", stipend: "₹20,000/mo", tags: ["Digital Health Records", "Teleconsultation", "Biostatistics"], deadline: "2026-12-15", description: "Map clinical terminology to NAMASTE codes and help build teleconsultation reporting dashboards.", color: "#3C4A8A", hot: false },
];

const SEED_PROGRAMS = [
  { title: "Applied Generative AI & Deep Learning Systems", organiser: "Indian Institute of Technology, Delhi", dates: "Oct 6–10, 2026", seats: 40, mode: "Hybrid" },
  { title: "Data Analytics & Business Intelligence for Faculty", organiser: "Nalanda School of Management, Bengaluru", dates: "Oct 20–24, 2026", seats: 30, mode: "Online" },
  { title: "Advanced Cloud Architecture & DevOps Practices", organiser: "Birla Institute of Technology & Science, Pilani", dates: "Nov 3–7, 2026", seats: 50, mode: "Online" },
  { title: "Precision Manufacturing, Robotics & Automation", organiser: "Sardar Institute of Technology, Pune", dates: "Nov 17–21, 2026", seats: 35, mode: "Hybrid" },
  { title: "Biotechnology Innovation & Clinical Research Protocols", organiser: "Coastal University of Science & Design, Kochi", dates: "Nov 24–28, 2026", seats: 45, mode: "Online" },
  { title: "Outcome-Based Education & NBA Accreditation Readiness", organiser: "National Institute of Technology, Trichy", dates: "Dec 1–3, 2026", seats: 60, mode: "Online" },
  { title: "Integrative Health Systems & Pharmacological Research", organiser: "All India Institute of Integrated Medical & Ayush Sciences, New Delhi", dates: "Dec 15–17, 2026", seats: 55, mode: "Hybrid" },
];

export const SEED_COLLABS = [
  { id: "collab_1", title: "Autonomous Edge IoT Devices for Environmental Telemetry", initiator: "Meridian Software Labs", type: "Industry", status: "Pending Review", deadline: "Oct 10", expertise: ["Machine Learning & Data Science", "Materials & Manufacturing Processes"], funded: true },
  { id: "collab_2", title: "Predictive Analytics for Multi-Sector Supply Chain Optimization", initiator: "Indian Institute of Technology, Delhi", type: "Academic", status: "Active", deadline: "Ongoing", expertise: ["Machine Learning & Data Science", "Economics & Public Policy"], funded: true },
  { id: "collab_3", title: "Biocompatible Polymer Synthesis for Targeted Drug Delivery", initiator: "Nucleus Biosciences", type: "Industry", status: "Pending Review", deadline: "Oct 18", expertise: ["Biotechnology & Molecular Biology", "Materials & Manufacturing Processes"], funded: true },
  { id: "collab_4", title: "Low-Cost Assistive Devices for Rural Rehabilitation", initiator: "Sardar Institute of Technology, Pune", type: "Academic", status: "Active", deadline: "Dec 2026", expertise: ["Materials & Manufacturing Processes", "Human-Centred Design & UI/UX"], funded: false },
  { id: "collab_5", title: "High-Throughput Analytical Profiling of Bioactive Matrices", initiator: "All India Institute of Integrated Medical & Ayush Sciences, New Delhi", type: "Academic", status: "Pending Review", deadline: "Nov 14", expertise: ["Phytochemistry & Standardisation", "Ayurvedic Pharmacology (Dravyaguna)"], funded: true },
  { id: "collab_6", title: "Digital Public Health Informatics & Terminology Standardisation", initiator: "AyushGrid Digital Health Labs", type: "Govt", status: "Active", deadline: "Ongoing", expertise: ["Public Health & Epidemiology", "Machine Learning & Data Science"], funded: true },
  { id: "collab_7", title: "Skilling Outcomes & Employment Mobility in District Economies", initiator: "Centre for Development Policy", type: "Govt", status: "Pending Review", deadline: "Nov 30", expertise: ["Economics & Public Policy", "Public Health & Epidemiology"], funded: true },
];

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
      hostName: "Meridian Software Labs",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(4),
      scheduledTime: "10:30",
      description: "The standard placement-style quantitative assessment: arithmetic, percentages, ratios, and speed math.",
      prerequisites: "Class 10/12 level arithmetic, algebra, and basic data interpretation.",
      certification: "Meridian Quantitative Aptitude Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No calculators, phones, or external notes are allowed.",
      ],
    },
    {
      title: "Core Programming & Digital Fundamentals",
      domain: "Programming & Digital Fundamentals",
      hostName: "Anvaya Analytics",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(8),
      scheduledTime: "16:00",
      description: "Core computing fundamentals: data structures, relational databases, web architecture, and algorithmic complexity.",
      prerequisites: "Introductory programming coursework in any modern language (Python, C++, Java, JavaScript).",
      certification: "Anvaya Software & Digital Proficiency Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No IDEs, compilers, or AI assistants may be used during the assessment.",
      ],
    },
    {
      title: "Logical Reasoning & Algorithmic Problem Solving",
      domain: "Logical Reasoning",
      hostName: "Apex Global Technologies & Innovations",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      ...hoursAgoDateTime(2),
      description: "Placement screening on syllogisms, series completion, pattern identification, and deduction.",
      prerequisites: "General logical reasoning and problem decomposition skills.",
      certification: "Apex Logical Aptitude Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No notes, phones, or external references are allowed.",
      ],
    },
    {
      title: "Data Analysis & Statistical Interpretation Challenge",
      domain: "Data Analysis & Interpretation",
      hostName: "Meghdoot Capital Advisors",
      mode: "Online",
      duration: "15 mins",
      price: 99,
      scheduledAt: futureDate(6),
      scheduledTime: "14:00",
      description: "Practical data interpretation: distributions, statistical metrics, trend identification, and chart analytics.",
      prerequisites: "Foundations of descriptive statistics and chart reading.",
      certification: "Meghdoot Data Interpretation Proficiency Certificate",
      rules: [
        "Ensure a stable internet connection before joining.",
        "Keep your camera on for the full duration.",
        "Switching browser tabs during the test may flag your attempt for review.",
      ],
    },
    {
      title: "Critical Thinking & Root Cause Analysis",
      domain: "Problem Solving & Critical Thinking",
      hostName: "Shakti Motors Ltd.",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(3),
      scheduledTime: "09:00",
      description: "Engineering and business scenario resolution: cognitive biases, five-whys analysis, and structured decision making.",
      prerequisites: "Problem-solving and analytical reasoning mindset.",
      certification: "Shakti Systems Thinking Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "External reference materials are not permitted.",
      ],
    },
    {
      title: "Research Methodology & Documentation Quiz",
      domain: "Research & Documentation",
      hostName: "Nucleus Biosciences",
      mode: "Online",
      duration: "15 mins",
      price: 199,
      scheduledAt: futureDate(7),
      scheduledTime: "11:00",
      description: "Formal research principles, peer review mechanisms, hypothesis formulation, citation standards, and ethics.",
      prerequisites: "An introductory research methodology or technical writing course.",
      certification: "Nucleus Research Readiness Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No AI assistants or search engines may be used during the quiz.",
      ],
    },
    {
      title: "Corporate Dynamics & Workplace Leadership Round",
      domain: "Business & Professional Dynamics",
      hostName: "Apex Global Technologies & Innovations",
      mode: "Offline",
      duration: "60 mins",
      price: 0,
      scheduledAt: futureDate(10),
      reportingTime: "09:30 AM (session starts 10:00 AM sharp)",
      venue: "Apex Innovation Campus, Tech Auditorium 1, Bengaluru",
      description: "In-person case study deliberation, stakeholder communication, and collaborative team challenge.",
      prerequisites: "Final-year standing across Engineering, Management, or Sciences.",
      certification: "Apex Professional Dynamics Certificate",
      documentsRequired: ["College ID / Govt Photo ID", "Printed resume (2 copies)", "Registration confirmation printout"],
      rules: [
        "Report at least 30 minutes before the session start time.",
        "Formal professional attire is expected.",
        "Electronic devices must be switched off during the evaluation rounds.",
      ],
    },
  ];
}

export function ensureSeeded() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(NS + "seeded")) return;

  write(
    "internships",
    SEED_INTERNSHIPS.map((i) => insertLocal(i, { ownerId: "seed", status: "Open", postedAt: new Date().toISOString(), views: 0, uniqueViews: 0 }))
  );
  write(
    "programs",
    SEED_PROGRAMS.map((p) => insertLocal(p, { ownerId: "seed", enrolled: Math.floor(p.seats * (0.2 + Math.random() * 0.6)), status: "Open" }))
  );
  write(
    "skillTests",
    seedSkillTests().map((t) => insertLocal(t, { ownerId: "seed", status: "Open", postedAt: new Date().toISOString() }))
  );
  window.localStorage.setItem(NS + "seeded", "1");
}

function insertLocal(doc, extra) {
  return { id: genId("seed"), ...doc, ...extra };
}

/* ============================================================
   Internships
   ============================================================ */

export function listInternships() {
  ensureSeeded();
  autoCloseExpiredPostings();
  return all("internships").sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

export function listInternshipsByOwner(ownerId) {
  autoCloseExpiredPostings();
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

export function createInternship(ownerId, company, data) {
  return insert("internships", {
    ...data,
    ownerId,
    company,
    status: "Open",
    postedAt: new Date().toISOString(),
    views: 0,
    uniqueViews: 0,
    color: data.color || randomColor(),
  });
}

/** Clone a posting for a recurring role — a fresh draft, no inherited stats. */
export function cloneInternship(internshipId) {
  const source = findOne("internships", (i) => i.id === internshipId);
  if (!source) return null;
  const { id, views, uniqueViews, postedAt, status, manualStatus, closedReason, ...rest } = source;
  return insert("internships", {
    ...rest,
    title: `${source.title} (Copy)`,
    deadline: futureDate(30),
    status: "Open",
    postedAt: new Date().toISOString(),
    views: 0,
    uniqueViews: 0,
  });
}

export function setPostingStatus(internshipId, status) {
  return update("internships", internshipId, { status, manualStatus: true, closedReason: null });
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

export function applyToInternship(internship, student, match, note) {
  const existing = findOne(
    "applications",
    (a) => a.internshipId === internship.id && a.studentId === student.id
  );
  if (existing) return existing;
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
    note: note || "",
    match: match ?? 65,
    status: "Applied",
    appliedAt,
    statusHistory: [{ status: "Applied", at: appliedAt }],
  });
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
  return update("applications", applicationId, { offerStage, offerUpdatedAt: new Date().toISOString(), ...extra });
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
  return all("skillTests");
}

export function listSkillTestsByOwner(ownerId) {
  return findMany("skillTests", (t) => t.ownerId === ownerId);
}

export function getSkillTest(testId) {
  return findOne("skillTests", (t) => t.id === testId);
}

export function createSkillTest(ownerId, hostName, data) {
  return insert("skillTests", { ...data, ownerId, hostName, status: "Open", postedAt: new Date().toISOString() });
}

export function getScheduledTimestamp(test) {
  if (!test?.scheduledAt) return null;
  const time = test.scheduledTime || "00:00";
  const ts = new Date(`${test.scheduledAt}T${time}`).getTime();
  return Number.isNaN(ts) ? null : ts;
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
  return update("skillTests", testId, { meetingLink });
}

export function startSkillTest(testId) {
  return update("skillTests", testId, { startedAt: new Date().toISOString(), status: "In Progress" });
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

export function recordAssessmentResult(studentId, testId, domain, scorePct, weight = 1, missed = false) {
  const existingAttempt = getAttemptForTest(studentId, testId);
  if (existingAttempt) {
    update("assessmentAttempts", existingAttempt.id, { score: scorePct, weight, missed, completedAt: new Date().toISOString() });
  } else {
    insert("assessmentAttempts", { studentId, testId, domain, score: scorePct, weight, missed, completedAt: new Date().toISOString() });
  }
  recalculateAssessment(studentId);
  if (!missed) awardCertificationIfEarned(studentId, testId, scorePct);

  const reg = getRegistration(testId, studentId);
  if (reg) update("skillTestRegistrations", reg.id, { missedRecorded: true });
}

export function selfReportOfflineAttendance(studentId, testId, domain) {
  recordAssessmentResult(studentId, testId, domain, 85, TEST_WEIGHT.Offline, false);
  const reg = getRegistration(testId, studentId);
  if (reg) update("skillTestRegistrations", reg.id, { attended: true, missedRecorded: true });
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

export function listCredentialsForStudent(studentId, { includeRevoked = false } = {}) {
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

/* ============================================================
   Programs (FDPs)
   ============================================================ */

export function listPrograms() {
  ensureSeeded();
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

export function cancelProgram(programId) {
  return update("programs", programId, { status: "Cancelled" });
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

export function listCollabMilestones(collabId) {
  return findMany("collabMilestones", (m) => m.collabId === collabId).sort((a, b) => (a.due || "").localeCompare(b.due || ""));
}

export function addCollabMilestone(collabId, data) {
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
  `Diya Nair,diya.nair@example.edu,BNYS/2024/008,Yoga & Naturopathy (BNYS),2024,2nd Year,BNYS,+91 98765 43211\n`;

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

export function listDrives(instituteName) {
  return findMany("drives", (d) => d.instituteName === instituteName).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export function getDrive(id) {
  return findOne("drives", (d) => d.id === id);
}

export function createDrive(instituteName, data) {
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

export function listUsersByRole(role) {
  return findMany("users", (u) => u.role === role);
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
  Panchakarma: "MD (Panchakarma)",
  "Dravyaguna (Ayurvedic Pharmacology)": "MD (Dravyaguna)",
  "Rasashastra & Bhaishajya Kalpana": "MD (Rasashastra)",
  "Kayachikitsa (Internal Medicine)": "MD (Kayachikitsa)",
  "Yoga & Naturopathy (BNYS)": "BNYS",
  "Homeopathy (BHMS)": "BHMS",
  "Unani Medicine (BUMS)": "BUMS",
  "Siddha Medicine (BSMS)": "BSMS",
  "Ayush Pharmacy (B.Pharm Ayurveda)": "B.Pharm (Ayurveda)",
  "Computer Science & Engineering": "B.Tech CSE",
  "Electronics & Communication": "B.Tech ECE",
  "Mechanical Engineering": "B.Tech Mechanical",
  "Civil Engineering": "B.Tech Civil",
  "Management Studies (MBA)": "MBA",
  "Commerce & Economics": "B.Com (Hons)",
  "Life Sciences & Biotechnology": "M.Sc Biotechnology",
  "Design & Applied Arts": "B.Des",
  "Pharmacy (B.Pharm)": "B.Pharm",
  "Nursing & Allied Health": "B.Sc Nursing",
};

/**
 * The departments the demo institution actually runs — a mix of Ayush and
 * general faculties, which is the realistic case for a multi-disciplinary
 * institute and makes the cross-department analytics worth looking at.
 */
const DEMO_DEPARTMENTS = [
  "Computer Science & Engineering",
  "Mechanical Engineering",
  "Management Studies (MBA)",
  "Design & Applied Arts",
  "Life Sciences & Biotechnology",
  "Electronics & Communication",
  "Commerce & Economics",
  "Ayurveda (BAMS)",
  "Ayush Pharmacy (B.Pharm Ayurveda)",
  "Civil Engineering",
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
    // balanced across cross-cutting employability skills.
    const domainScores = {};
    SKILL_DOMAINS.forEach((domain) => {
      let base = 52 + rng() * 28;
      if (domain === core) base += 18;
      if (domain === "Programming & Digital Fundamentals" && !department.includes("Computer") && !department.includes("Electronics")) base -= 8;
      domainScores[domain] = Math.max(35, Math.min(97, Math.round(base)));
    });
    students.push({
      id: `demo-cohort-${i + 1}`,
      email: `${first}.${last}${i + 1}`.toLowerCase() + "@apex-univ.edu.in",
      name: `${first} ${last}`,
      department,
      batch: String(batch),
      year: YEAR_BY_BATCH[batch],
      course: COURSE_BY_DEPT[department] || "Degree",
      rollNo: `${(COURSE_BY_DEPT[department] || "APX").replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase()}/${batch}/${String(i + 1).padStart(3, "0")}`,
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

export function ensureDemoData() {
  if (!isBrowser()) return;
  ensureSeeded();
  if (window.localStorage.getItem(NS + "demoSeededV3")) return;

  // Clean old demo data so browser immediately loads V3
  try {
    const existingUsers = all("users").filter((u) => !u.id.startsWith("demo-"));
    saveAll("users", existingUsers);
    const existingApps = all("applications").filter((a) => !a.internshipId?.startsWith("demo-") && !a.studentId?.startsWith("demo-"));
    saveAll("applications", existingApps);
    const existingInternships = all("internships").filter((i) => i.ownerId !== "demo-industry");
    saveAll("internships", existingInternships);
    const nonDemoAnnouncements = all("announcements").filter((a) => a.instituteName !== DEMO_INSTITUTION);
    saveAll("announcements", nonDemoAnnouncements);
    write("skillTests", seedSkillTests().map((t) => insertLocal(t, { ownerId: "seed", status: "Open", postedAt: new Date().toISOString() })));
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
    instituteType: "Multidisciplinary Technological University",
    about:
      "A premier multidisciplinary technological institution offering leading undergraduate and postgraduate programmes in Computer Science, Data Science, Core Engineering, Applied Sciences, and Management, alongside an integrative healthcare sciences faculty. Facilities include state-of-the-art innovation labs, computing clusters, and industry incubation cells.",
    addressLine: "Innovation Valley, Outer Ring Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    website: "https://apex-tech.edu.in",
    established: "1988",
    accreditations: [
      { body: "NAAC", grade: "A++", validTill: "2029-12-31", document: null, status: "Verified" },
      { body: "AICTE", grade: "Approved", validTill: "2028-06-30", document: null, status: "Verified" },
      { body: "NBA", grade: "Tier-1 Accredited", validTill: "2027-06-30", document: null, status: "Verified" },
      { body: "NIRF", grade: "Ranked Top 50", validTill: "2026-12-31", document: null, status: "Verified" },
    ],
    departments: DEMO_DEPARTMENTS.map((d, i) => ({
      name: d,
      hod: `Prof. ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
      seats: 30 + ((i * 7) % 50),
    })),
    placementCell: {
      officer: "Dr. Arvind Sundaram",
      designation: "Head of Training & Placement",
      email: "tpo@apex-tech.edu.in",
      phone: "+91 80 4123 5500",
    },
  });

  addInstitutionAdmin(DEMO_INSTITUTION, { name: "Dr. Arvind Sundaram", email: "tpo@apex-tech.edu.in", role: "Admin", designation: "Head of Training & Placement" });
  addInstitutionAdmin(DEMO_INSTITUTION, { name: "Pooja Sharma", email: "placement.exec@apex-tech.edu.in", role: "Admin", designation: "Placement Executive" });
  addInstitutionAdmin(DEMO_INSTITUTION, { name: "Prof. Rajesh Nair", email: "dean.academics@apex-tech.edu.in", role: "Viewer", designation: "Dean, Academics" });

  logActivity(DEMO_INSTITUTION, "Dr. Arvind Sundaram", "Updated institution profile", "Accreditation & NIRF section");
  logActivity(DEMO_INSTITUTION, "Pooja Sharma", "Imported student cohort", "60 records synced with campus ERP");
  logActivity(DEMO_INSTITUTION, "Pooja Sharma", "Created placement drive", "National Campus Hiring Drive 2026");

  // Official institution documents
  addInstitutionDoc(DEMO_INSTITUTION, {
    title: "Apex University Institutional Information Brochure 2026",
    category: "Brochure & Prospectus",
    fileName: "Apex_University_Information_Brochure_2026.pdf",
    fileSize: "2.8 MB",
    dataUrl: "#",
    uploadedBy: "Dr. Arvind Sundaram",
  });
  addInstitutionDoc(DEMO_INSTITUTION, {
    title: "NIRF National Institutional Ranking Framework Report 2025",
    category: "NIRF & Accreditations",
    fileName: "Apex_Univ_NIRF_2025_Submission.pdf",
    fileSize: "1.4 MB",
    dataUrl: "#",
    uploadedBy: "Dr. Arvind Sundaram",
  });
  addInstitutionDoc(DEMO_INSTITUTION, {
    title: "University Training & Placement Operations Policy",
    category: "Placement Policy",
    fileName: "Apex_Placement_Policy_and_Guidelines_v3.pdf",
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
    SKILL_DOMAINS.forEach((d) => { scores[d] = Math.round(50 + rng() * 40); });
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
    department: "Computer Science & Engineering",
    course: "B.Tech CSE",
    batch: "2023",
    year: "4th Year",
    rollNo: "23CSE042",
    openToOpportunities: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });

  // Recorded scores across the 8 universal domains
  recordAssessmentResult(student.id, "demo-test-1", "Programming & Digital Fundamentals", 92);
  recordAssessmentResult(student.id, "demo-test-2", "Problem Solving & Critical Thinking", 86);
  recordAssessmentResult(student.id, "demo-test-3", "Data Analysis & Interpretation", 85);
  recordAssessmentResult(student.id, "demo-test-4", "Quantitative Aptitude", 84);
  recordAssessmentResult(student.id, "demo-test-5", "Logical Reasoning", 88);
  recordAssessmentResult(student.id, "demo-test-6", "Verbal Communication", 82);
  recordAssessmentResult(student.id, "demo-test-7", "Business & Professional Dynamics", 78);
  recordAssessmentResult(student.id, "demo-test-8", "Research & Documentation", 74);

  savePortfolio(student.id, {
    bio: "Final-year Computer Science & Engineering undergraduate focused on scalable full-stack architecture, distributed cloud systems, and applied AI. Built and deployed production microservices and open-source developer tooling.",
    skillBadges: {
      "Engineering & Development": [
        { name: "Full-Stack Development (React/Node.js)", level: "Advanced" },
        { name: "Distributed Systems & Cloud (AWS)", level: "Proficient" },
        { name: "Data Structures & Algorithms", level: "Advanced" },
      ],
      "Data & Machine Learning": [
        { name: "Python / Data Science", level: "Advanced" },
        { name: "SQL & Relational Databases", level: "Proficient" },
      ],
      "Professional & Workflow": [
        { name: "Agile Project Delivery & Git", level: "Proficient" },
        { name: "System Architecture & Documentation", level: "Proficient" },
      ],
    },
    certifications: [
      { name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", year: "2025", score: "Pass" },
      { name: "Advanced Data Structures & Algorithms", issuer: "NPTEL", year: "2024", score: "Elite Gold" },
    ],
    timeline: [
      { year: "2023", title: "Admitted — B.Tech Computer Science & Engineering", org: DEMO_INSTITUTION, type: "Education" },
      { year: "2025", title: "Software Engineering Intern", org: "Apex Global Technologies", type: "Internship" },
    ],
    documents: [
      { name: "Aarav_Sharma_Resume_2026.pdf", type: "Resume", fileName: "Aarav_Sharma_Resume_2026.pdf", dataUrl: "#", uploadedAt: pastDate(14) }
    ],
  });

  /* ---------- Industry ---------- */
  const industry = insert("users", {
    id: "demo-industry",
    email: "demo.industry@setu.dev",
    passwordHash: null,
    role: "industry",
    name: "Rakesh Menon",
    companyName: "Apex Global Technologies & Innovations",
    companyDomain: "Enterprise Software & Cloud Platforms",
    companyDescription:
      "A premier engineering enterprise delivering high-performance cloud architectures, enterprise analytics, intelligent automation, and scalable cross-sector software platforms across global markets.",
    companyWebsite: "https://apextechnologies.example.in",
    hqLocation: "Bengaluru, Karnataka",
    companySize: "501-1000",
    whyWorkWithUs:
      "Interns gain production codebase ownership from week two, work directly with staff engineers on distributed cloud architectures, and participate in cross-functional product design sprints.",
    workEmailDomain: "@apextechnologies.in",
    verifiedCode: "APEX-IND-2026",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });

  addRecruiter(industry.id, { name: "Rakesh Menon", email: "rakesh.menon@apextechnologies.in", title: "Head of Talent Acquisition", accessLevel: "Owner", notesVisible: true });
  addRecruiter(industry.id, { name: "Priya Kulkarni", email: "priya.k@apextechnologies.in", title: "Lead Campus Recruiter", accessLevel: "Recruiter", notesVisible: true });
  addRecruiter(industry.id, { name: "Sneha Bose", email: "sneha.bose@apextechnologies.in", title: "Engineering Recruiting Lead", accessLevel: "Recruiter", notesVisible: true });
  addRecruiter(industry.id, { name: "Imtiaz Khan", email: "imtiaz.khan@apextechnologies.in", title: "Data & AI Hiring Partner", accessLevel: "Recruiter", notesVisible: false });

  const posting = createInternship(industry.id, industry.companyName, {
    title: "Software Development Engineer Intern (Full Stack)",
    location: "Bengaluru",
    type: "Hybrid",
    domain: "Information Technology & Software",
    duration: "6 months",
    stipend: "₹35,000/mo",
    tags: ["React", "Node.js", "TypeScript", "PostgreSQL"],
    deadline: futureDate(40),
    description: "Design and implement full-stack features across our core microservices platform, building high-throughput user interfaces and robust REST/GraphQL APIs.",
    minSkillScore: 60,
    eligibleDepartments: ["Computer Science & Engineering", "Electronics & Communication"],
    eligibleInstitutions: [],
  });
  update("internships", posting.id, { views: 248, uniqueViews: 182, recruiterName: "Sneha Bose" });

  const posting2 = createInternship(industry.id, industry.companyName, {
    title: "Data Analytics & Applied AI Intern",
    location: "Pune",
    type: "Hybrid",
    domain: "Data Science & Artificial Intelligence",
    duration: "6 months",
    stipend: "₹32,000/mo",
    tags: ["Python", "SQL", "Machine Learning", "Data Visualization"],
    deadline: futureDate(25),
    description: "Analyze large-scale operational telemetry, build automated anomaly-detection pipelines, and train predictive models for enterprise resource forecasting.",
    minSkillScore: 55,
    eligibleDepartments: ["Computer Science & Engineering", "Life Sciences & Biotechnology", "Electronics & Communication", "Management Studies (MBA)"],
    eligibleInstitutions: [],
  });
  update("internships", posting2.id, { views: 194, uniqueViews: 137, recruiterName: "Imtiaz Khan" });

  const posting3 = createInternship(industry.id, industry.companyName, {
    title: "Biotechnology & R&D Research Intern",
    location: "Hyderabad",
    type: "Onsite",
    domain: "Biotechnology & Life Sciences",
    duration: "4 months",
    stipend: "₹25,000/mo",
    tags: ["Bioinformatics", "Data Analysis", "Research Protocols", "Assay Testing"],
    deadline: futureDate(30),
    description: "Collaborate with cross-disciplinary researchers on biomolecular data analysis, lab assay validation, and structured scientific documentation.",
    minSkillScore: 50,
    eligibleDepartments: ["Life Sciences & Biotechnology", "Ayush Pharmacy (B.Pharm Ayurveda)", "Ayurveda (BAMS)"],
    eligibleInstitutions: [],
  });
  update("internships", posting3.id, { views: 118, uniqueViews: 84, recruiterName: "Priya Kulkarni" });

  const demoApplicants = [
    { studentId: student.id, studentName: student.name, studentInstitution: student.institution, studentCourse: student.course, match: 94, status: "Shortlisted", daysAgo: 4, posting },
    { studentName: "Kabir Reddy", studentInstitution: "Indian Institute of Technology (IIT) Delhi", studentCourse: "B.Tech Computer Science", match: 96, status: "Interview", daysAgo: 8, posting },
    { studentName: "Sara Iyer", studentInstitution: "BITS Pilani", studentCourse: "B.Tech Computer Science", match: 91, status: "Interview", daysAgo: 6, posting },
    { studentName: "Rohan Bhat", studentInstitution: DEMO_INSTITUTION, studentCourse: "B.Tech CSE", match: 95, status: "Hired", daysAgo: 22, posting, offerStage: "Joined", joiningDate: pastDate(3) },
    { studentName: "Nithya Menon", studentInstitution: "National Institute of Technology (NIT) Trichy", studentCourse: "B.Tech ECE", match: 88, status: "Interview", daysAgo: 7, posting: posting2 },
    { studentName: "Farhan Ansari", studentInstitution: "Delhi Technological University (DTU)", studentCourse: "B.Tech Software Engineering", match: 86, status: "Shortlisted", daysAgo: 3, posting: posting2 },
    { studentName: "Kavya Pillai", studentInstitution: DEMO_INSTITUTION, studentCourse: "Life Sciences & Biotechnology", match: 89, status: "Hired", daysAgo: 16, posting: posting3, offerStage: "Offer accepted", joiningDate: futureDate(18) },
    { studentName: "Aditya Rao", studentInstitution: "Sardar Institute of Technology, Pune", studentCourse: "B.Tech CSE", match: 92, status: "Shortlisted", daysAgo: 5, posting },
    { studentName: "Zoya Ansari", studentInstitution: DEMO_INSTITUTION, studentCourse: "B.Tech CSE", match: 87, status: "Applied", daysAgo: 2, posting },
    { studentName: "Harsh Saxena", studentInstitution: "Coastal University of Science & Technology, Kochi", studentCourse: "B.Tech Mechanical", match: 78, status: "Applied", daysAgo: 2, posting: posting2 },
    { studentName: "Ritika Joshi", studentInstitution: DEMO_INSTITUTION, studentCourse: "B.Tech CSE", match: 97, status: "Hired", daysAgo: 26, posting, offerStage: "Joined", joiningDate: pastDate(8) },
    { studentName: "Aryan Mehta", studentInstitution: "Nalanda Institute of Management Studies", studentCourse: "MBA (Analytics)", match: 83, status: "Interview", daysAgo: 9, posting: posting2 },
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

  addCompanyReview(industry.companyName, { author: "Former engineering intern, 2025", role: "Software Engineer Intern", rating: 5, body: "Direct production exposure from month one, robust code reviews, and excellent mentorship on microservices architecture." });
  addCompanyReview(industry.companyName, { author: "Former analytics intern, 2025", role: "Data Science Intern", rating: 5, body: "Real-world telemetry pipelines and genuine model deployment experience with dedicated team guidance." });
  addCompanyReview(industry.companyName, { author: "Former research intern, 2026", role: "R&D Research Intern", rating: 4, body: "Great cross-disciplinary collaboration between biology and computational sciences." });

  /* ---------- Academician ---------- */
  const academician = insert("users", {
    id: "demo-academician",
    email: "demo.academician@setu.dev",
    passwordHash: null,
    role: "academician",
    name: "Dr. Shalini Kulkarni",
    institution: DEMO_INSTITUTION,
    department: "Life Sciences & Biotechnology",
    designation: "Associate Professor",
    experienceYears: "14",
    subjectsTaught: ["Bioinformatics", "Data-Driven Research Methodology", "Applied Phytochemistry"],
    researchInterests: ["Computational Biology & Standardisation", "Natural Product Genomics", "Translational Research Protocols"],
    orcid: "0000-0002-1825-0097",
    scholarUrl: "https://scholar.google.com/citations?user=demo",
    linkedIn: "https://linkedin.com/in/demo-faculty",
    phone: "+91 80 4123 5582",
    verifiedCode: "APEX-FAC-2026",
    emailVerified: true,
    createdAt: new Date().toISOString(),
  });

  const hostedProgram = createProgram(academician.id, academician.institution, {
    title: "Hands-on Workshop: High-Throughput Bio-Data Analytics & Standardisation",
    dates: "Dec 8–12, 2026",
    seats: 25,
    mode: "Onsite",
    description: "A five-day practical workshop covering analytical fingerprinting, computational protocols, and reproducible data workflows.",
    venue: "Central Research & Computing Facility, Apex University",
  });

  [
    { name: "Dr. Anil Trivedi", email: "anil.trivedi@iitd.example.in", institution: "IIT Delhi", designation: "Assistant Professor" },
    { name: "Dr. Vandana Bose", email: "vandana.bose@bitspilani.example.in", institution: "BITS Pilani", designation: "Associate Professor" },
    { name: "Dr. S. Karthik", email: "karthik@nitt.example.in", institution: "NIT Trichy", designation: "Professor" },
    { name: "Dr. Nusrat Jahan", email: "nusrat@dtu.example.in", institution: "Delhi Technological University (DTU)", designation: "Assistant Professor" },
  ].forEach((p, i) =>
    registerForProgram(hostedProgram.id, `demo-fdp-attendee-${i + 1}`, p)
  );

  createCollabListing(academician.id, academician.name, {
    title: "Cross-Disciplinary Analytical Protocols & Computational Modeling",
    description:
      "Seeking co-investigators to build reproducible analytical profiles and computational benchmarks for multi-institutional research data.",
    expertise: ["Computational Biology & Standardisation", "Analytical Chemistry"],
    funded: true,
    fundingSource: "Institutional research grant",
    collaboratorsNeeded: 3,
    deadline: futureDate(35),
    institution: DEMO_INSTITUTION,
  });

  const openListing = listCollabListingsByOwner(academician.id)[0];
  if (openListing) {
    expressCollabInterest(openListing.id, { id: "demo-peer-1", name: "Dr. Anil Trivedi", institution: "IIT Delhi" }, "We have computing clusters and can contribute two PG scholars.");
    expressCollabInterest(openListing.id, { id: "demo-peer-2", name: "Apex BioLabs Pvt. Ltd.", institution: "Apex BioLabs Pvt. Ltd." }, "Happy to co-fund assay materials and validate validation runs.");
  }

  setCollabResponse("collab_2", "Accepted");
  postCollabMessage("collab_2", "Dr. Shalini Kulkarni", "Sharing the draft outcome-measure sheet — please review section 3 before Friday.");
  postCollabMessage("collab_2", "Dr. Anil Trivedi", "Reviewed. Suggest we add a 12-week follow-up window to match the multi-centre protocol.");
  addCollabMilestone("collab_2", { title: "Finalise outcome-measure instrument", due: futureDate(12), owner: "Dr. Shalini Kulkarni" });
  addCollabMilestone("collab_2", { title: "Ethics committee submission", due: futureDate(30), owner: "Dr. Anil Trivedi" });
  addCollabMilestone("collab_2", { title: "Pilot data collection (n=40)", due: futureDate(75), owner: "Joint" });
  const firstMilestone = listCollabMilestones("collab_2")[0];
  if (firstMilestone) toggleCollabMilestone(firstMilestone.id);

  addResearchOutput(academician.id, { type: "Journal Paper", title: "Comparative Analytical Profiling of Natural Compounds using High-Resolution Chromatography", venue: "Journal of Natural Science & Technology", year: "2025", collabId: "collab_2" });
  addResearchOutput(academician.id, { type: "Journal Paper", title: "Computational standardization frameworks for multidisciplinary research: a scoping review", venue: "Applied Sciences Review", year: "2024", collabId: "collab_2" });
  addResearchOutput(academician.id, { type: "Patent", title: "A stabilized formulation and extraction protocol for standardized bioactive matrices", venue: "Indian Patent Office (filed)", year: "2025" });

  // Advisees: the demo faculty mentors their own department's students.
  const deptStudents = cohort.filter((s) => s.department === academician.department).slice(0, 8);
  [student, ...deptStudents].forEach((s) => addAdvisee(academician.id, s.id));
  if (deptStudents[0]) saveMentorNote(academician.id, deptStudents[0].id, { note: "Strong computational and lab discipline. Excellent aptitude for data-driven analytics roles.", flag: "Promising" });
  saveMentorNote(academician.id, student.id, { note: "Exceptional full-stack and systems engineering profile. Well suited for tier-1 tech roles.", flag: "Promising" });

  addOfficeHourSlot(academician.id, { slot: `${futureDate(2)}T15:00`, durationMins: 30, capacity: 2, mode: "In person", location: "Life Sciences Block, Room 302" });
  addOfficeHourSlot(academician.id, { slot: `${futureDate(4)}T11:00`, durationMins: 30, capacity: 3, mode: "Online", location: "Video call" });
  addOfficeHourSlot(academician.id, { slot: `${futureDate(9)}T16:30`, durationMins: 45, capacity: 2, mode: "In person", location: "Life Sciences Block, Room 302" });
  const firstSlot = listOfficeHours(academician.id)[0];
  if (firstSlot && deptStudents[0]) {
    bookOfficeHourSlot(firstSlot, { id: deptStudents[0].id, name: deptStudents[0].name }, "Guidance on capstone research project");
  }

  /* ---------- Institution: MOUs, drives, notices, history ---------- */
  [
    { partner: "Meridian Software Labs", scope: ["Internships", "Placements", "Guest Lectures"], signedDate: pastDate(260), expiryDate: futureDate(470), contactName: "Sneha Bose", contactEmail: "campus@meridianlabs.example.in", contactPhone: "+91 80500 22114", notes: "Six-month engineering internships plus an annual national hackathon on campus." },
    { partner: "Apex Global Technologies & Innovations", scope: ["Internships", "Placements", "Joint Research"], signedDate: pastDate(380), expiryDate: futureDate(350), contactName: "Rakesh Menon", contactEmail: "rakesh.menon@apextechnologies.example.in", contactPhone: "+91 80 4123 5501", notes: "Annual intake of 20 software and data engineering interns." },
    { partner: "Shakti Motors & Engineering Ltd.", scope: ["Internships", "Industrial Visits", "Faculty Development"], signedDate: pastDate(520), expiryDate: futureDate(210), contactName: "Vikram Deshmukh", contactEmail: "hr.campus@shaktimotors.example.in", contactPhone: "+91 20600 33447", notes: "Mechanical and electronics intake; hosts the annual industrial plant visit." },
    { partner: "Meghdoot Capital Advisors", scope: ["Placements", "Guest Lectures"], signedDate: pastDate(340), expiryDate: futureDate(75), contactName: "Anjali Verma", contactEmail: "talent@meghdootcap.example.in", contactPhone: "+91 22700 55118", notes: "MBA and analytics placements — annual recruitment schedule confirmed." },
    { partner: "Indigo Design Studio", scope: ["Internships", "Placements"], signedDate: pastDate(180), expiryDate: futureDate(550), contactName: "Alan Mathew", contactEmail: "careers@indigostudio.example.in", contactPhone: "+91 94470 55221", notes: "Product design and UI/UX internship rotations." },
    { partner: "Council for Scientific Research", scope: ["Joint Research", "Faculty Development"], signedDate: pastDate(700), expiryDate: futureDate(60), contactName: "Dr. P. Raghavan", contactEmail: "raghavan@csir.example.in", contactPhone: "+91 11 2345 6789", notes: "Annual research fellowships for PG scholars." },
  ].forEach((m) => {
    const created = createMou(DEMO_INSTITUTION, m);
    addMouTimelineEvent(created.id, "MOU signed");
    if (mouStatus(created) === "Renewal due") addMouTimelineEvent(created.id, "Renewal reminder sent");
  });

  const drive = createDrive(DEMO_INSTITUTION, {
    title: "National Campus Hiring Drive 2026",
    date: futureDate(26),
    venue: "Main Convocation Hall & Tech Auditorium, Apex Campus",
    eligibleBatches: ["2023", "2024"],
    description: "Consolidated campus placement drive across Engineering, Management, Data Sciences, and Applied Arts recruiters.",
  });
  [
    { company: "Apex Global Technologies & Innovations", contact: "Rakesh Menon", roles: "Software Development Intern, Data Analyst Intern", rsvp: "Confirmed", expectedRoles: 25 },
    { company: "Meridian Software Labs", contact: "Sneha Bose", roles: "Software Engineer Intern, Cloud QA Intern", rsvp: "Confirmed", expectedRoles: 18 },
    { company: "Shakti Motors & Engineering Ltd.", contact: "Vikram Deshmukh", roles: "Systems & Mechanical Design Intern", rsvp: "Confirmed", expectedRoles: 12 },
    { company: "Meghdoot Capital Advisors", contact: "Anjali Verma", roles: "Financial & Business Analyst Intern", rsvp: "Confirmed", expectedRoles: 8 },
    { company: "Indigo Design Studio", contact: "Alan Mathew", roles: "Product & UI/UX Design Intern", rsvp: "Invited", expectedRoles: 5 },
  ].forEach((i) => {
    const invite = inviteCompanyToDrive(drive.id, { company: i.company, contact: i.contact, roles: i.roles, expectedRoles: i.expectedRoles });
    if (i.rsvp !== "Invited") setDriveInviteRsvp(invite.id, i.rsvp);
  });
  tagStudentsForDrive(drive.id, cohort.filter((s) => s.batch === "2023").map((s) => s.id).slice(0, 14));

  createDrive(DEMO_INSTITUTION, {
    title: "Software & Cloud Engineering Hiring Days",
    date: futureDate(58),
    venue: "Innovation Hub, Computing Labs A & B",
    eligibleBatches: ["2023"],
    description: "Focused recruitment drive for Full-Stack, Cloud Infrastructure, and AI/ML engineers.",
  });

  createDrive(DEMO_INSTITUTION, {
    title: "Core Engineering & Analytics Hiring Week",
    date: futureDate(72),
    venue: "Auditorium 2, Apex University",
    eligibleBatches: ["2023", "2024"],
    description: "Mechanical, electronics, analytics, and business management interviews.",
  });

  [
    {
      title: "National Campus Placement Drive 2026 Registration Open",
      body: "All 2023 and 2024 batch students across Computer Science, Core Engineering, Management, and Applied Sciences must complete portal registration by 20 November. Please review the attached schedule and guidelines.",
      audience: "All students",
      pinned: true,
      attachment: { name: "National_Campus_Hiring_Schedule_2026.pdf", size: "480 KB", url: "#" },
    },
    {
      title: "Full-Stack Cloud & Distributed Systems Workshop",
      body: "The School of Computer Engineering is hosting a 3-day intensive hands-on session on microservices architecture and cloud deployment. View attached syllabus.",
      audience: "Pre-final year",
      pinned: false,
      attachment: { name: "Cloud_Systems_Workshop_Syllabus.pdf", size: "320 KB", url: "#" },
    },
    {
      title: "Apex Research Fellowship & Innovation Grant Submissions",
      body: "Faculty and student collaborative project applications are now open for institutional innovation grants. Proposal guidelines attached.",
      audience: "All students",
      pinned: false,
      attachment: { name: "Innovation_Grant_Guidelines_2026.pdf", size: "620 KB", url: "#" },
    },
    {
      title: "Technical Mock Interview Clinics — Every Wednesday",
      body: "The Training & Placement Cell runs walk-in mock interviews from 2–5 PM in Room 204. All pre-final and final year students welcome.",
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
    { batch: 2021, department: "Computer Science & Engineering", students: 84, placed: 72, medianStipend: 32000, topRecruiter: "Meridian Software Labs" },
    { batch: 2021, department: "Electronics & Communication", students: 62, placed: 48, medianStipend: 24000, topRecruiter: "Apex Global Technologies & Innovations" },
    { batch: 2022, department: "Computer Science & Engineering", students: 88, placed: 78, medianStipend: 35000, topRecruiter: "Meridian Software Labs" },
    { batch: 2022, department: "Mechanical Engineering", students: 58, placed: 42, medianStipend: 22000, topRecruiter: "Shakti Motors & Engineering Ltd." },
    { batch: 2023, department: "Computer Science & Engineering", students: 92, placed: 84, medianStipend: 38000, topRecruiter: "Apex Global Technologies & Innovations" },
    { batch: 2023, department: "Management Studies (MBA)", students: 46, placed: 40, medianStipend: 28000, topRecruiter: "Meghdoot Capital Advisors" },
    { batch: 2024, department: "Computer Science & Engineering", students: 96, placed: 88, medianStipend: 40000, topRecruiter: "Apex Global Technologies & Innovations" },
    { batch: 2024, department: "Design & Applied Arts", students: 28, placed: 24, medianStipend: 25000, topRecruiter: "Indigo Design Studio" },
    { batch: 2025, department: "Computer Science & Engineering", students: 98, placed: 91, medianStipend: 42000, topRecruiter: "Apex Global Technologies & Innovations" },
    { batch: 2025, department: "Life Sciences & Biotechnology", students: 34, placed: 28, medianStipend: 22000, topRecruiter: "Council for Scientific Research" },
  ].forEach((r) => upsertPlacementHistory(DEMO_INSTITUTION, r));

  window.localStorage.setItem(NS + "demoSeededV3", "1");
}

export function getDemoUser(role) {
  ensureDemoData();
  return findOne("users", (u) => u.id === `demo-${role}`);
}

function randomColor() {
  const palette = ["#6B7C3C", "#8A4A3C", "#3C5A8A", "#5A3C8A", "#8A703C", "#3C6B8A", "#3C8A6B", "#6B3C8A"];
  return palette[Math.floor(Math.random() * palette.length)];
}
