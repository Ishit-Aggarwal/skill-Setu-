"use client";

/**
 * Local, browser-persisted data layer standing in for a real database.
 * Every "collection" is a JSON array in localStorage. The shape mirrors
 * what a Firestore collection would look like, so swapping in a real
 * backend later just means replacing the functions in this file.
 */

const NS = "ayusetu:v3:";

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
  return record;
}

export function update(collection, id, patch) {
  const arr = read(collection);
  const idx = arr.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...patch };
  write(collection, arr);
  return arr[idx];
}

export function remove(collection, id) {
  write(collection, read(collection).filter((d) => d.id !== id));
}

export function findOne(collection, predicate) {
  return read(collection).find(predicate) || null;
}

export function findMany(collection, predicate) {
  return read(collection).filter(predicate);
}

/* ============================================================
   Seed data — realistic, cross-industry demo content so the
   platform isn't empty on first load. Seeded records use
   ownerId: "seed" so they never show up as "mine" for a fresh
   account, but still appear in student-facing listings.
   ============================================================ */

const SEED_INTERNSHIPS = [
  { title: "Software Development Intern", company: "Infosys", location: "Bengaluru", type: "Hybrid", domain: "IT", duration: "3 months", stipend: "₹15,000/mo", tags: ["JavaScript", "React", "Git"], deadline: "2026-09-12", description: "Build and ship features on a production web application alongside a full engineering pod.", color: "#3C6B8A", hot: true },
  { title: "Data Analyst Intern", company: "Tata Consultancy Services", location: "Pune", type: "Onsite", domain: "IT", duration: "6 months", stipend: "₹18,000/mo", tags: ["SQL", "Excel", "Python"], deadline: "2026-09-20", description: "Turn raw operational data into dashboards and insights for enterprise clients.", color: "#6B7C3C", hot: false },
  { title: "Mechanical Design Intern", company: "Tata Motors", location: "Pune", type: "Onsite", domain: "Manufacturing", duration: "4 months", stipend: "₹10,000/mo", tags: ["AutoCAD", "SolidWorks", "GD&T"], deadline: "2026-09-28", description: "Support the design team on component tolerancing and prototype validation.", color: "#8A4A3C", hot: false },
  { title: "Financial Analyst Intern", company: "ICICI Bank", location: "Mumbai", type: "Hybrid", domain: "Finance", duration: "3 months", stipend: "₹14,000/mo", tags: ["Financial Modelling", "Excel", "Risk Analysis"], deadline: "2026-09-30", description: "Assist in building valuation models and credit risk assessments for corporate clients.", color: "#5A3C8A", hot: true },
  { title: "Digital Marketing Intern", company: "Hindustan Unilever", location: "Remote", type: "Remote", domain: "Marketing", duration: "2 months", stipend: "₹8,000/mo", tags: ["SEO", "Content Strategy", "Analytics"], deadline: "2026-10-05", description: "Plan and measure digital campaigns across a portfolio of consumer brands.", color: "#8A703C", hot: false },
  { title: "UI/UX Design Intern", company: "Zoho Corporation", location: "Chennai", type: "Hybrid", domain: "Design", duration: "3 months", stipend: "₹12,000/mo", tags: ["Figma", "User Research", "Prototyping"], deadline: "2026-10-10", description: "Design and user-test flows for a SaaS product used by millions.", color: "#3C8A6B", hot: true },
  { title: "Operations Intern", company: "Flipkart", location: "Bengaluru", type: "Onsite", domain: "Operations", duration: "3 months", stipend: "₹13,000/mo", tags: ["Supply Chain", "Excel", "Process Improvement"], deadline: "2026-10-15", description: "Work with the logistics team to optimise last-mile delivery workflows.", color: "#6B3C8A", hot: false },
  { title: "Business Development Intern", company: "Reliance Industries", location: "Delhi", type: "Hybrid", domain: "Consulting", duration: "2 months", stipend: "₹10,000/mo", tags: ["Market Research", "Communication", "Presentations"], deadline: "2026-10-20", description: "Research new market opportunities and support partnership pitches.", color: "#3C5A8A", hot: false },
];

const SEED_PROGRAMS = [
  { title: "Advanced Data Science & Machine Learning", organiser: "IIT Delhi", dates: "Sep 15–19, 2026", seats: 30, mode: "Hybrid" },
  { title: "Modern Manufacturing & Industry 4.0", organiser: "NIT Tiruchirappalli", dates: "Oct 5–9, 2026", seats: 40, mode: "Online" },
  { title: "Financial Modelling & Valuation Techniques", organiser: "IIM Ahmedabad", dates: "Oct 20–24, 2026", seats: 25, mode: "Onsite" },
  { title: "Digital Marketing & Growth Analytics", organiser: "BITS Pilani", dates: "Nov 3–5, 2026", seats: 50, mode: "Online" },
];

export const SEED_COLLABS = [
  { id: "collab_1", title: "Multi-site Study on Renewable Energy Adoption in SMEs", initiator: "Tata Power", type: "Industry", status: "Pending Review", deadline: "Sep 10" },
  { id: "collab_2", title: "Machine Learning for Predictive Maintenance", initiator: "NIT Tiruchirappalli", type: "Academic", status: "Active", deadline: "Ongoing" },
  { id: "collab_3", title: "AI-based Resume Screening Tool Development", initiator: "Zoho Research", type: "Industry", status: "Pending Review", deadline: "Sep 18" },
  { id: "collab_4", title: "Documentation of MSME Digital Transformation Practices", initiator: "Ministry of MSME", type: "Govt", status: "Active", deadline: "Dec 2026" },
];

const SEED_SKILL_TESTS = [
  { title: "Quantitative Aptitude Test", domain: "Quantitative Aptitude", hostName: "Tata Consultancy Services", mode: "Online", duration: "15 mins", description: "A standard placement-style quantitative aptitude screening test." },
  { title: "Logical Reasoning Assessment", domain: "Logical Reasoning", hostName: "Infosys", mode: "Online", duration: "15 mins", description: "Evaluate pattern recognition and structured problem-solving." },
  { title: "Verbal Ability Test", domain: "Verbal Ability", hostName: "IIT Delhi Placement Cell", mode: "Online", duration: "10 mins", description: "Grammar, vocabulary, and comprehension screening used for shortlisting." },
  { title: "Programming Fundamentals Quiz", domain: "Programming Fundamentals", hostName: "Zoho Corporation", mode: "Online", duration: "15 mins", description: "Core CS fundamentals: data structures, complexity, and web basics." },
  { title: "Business & Communication Assessment", domain: "Business & Communication", hostName: "ICICI Bank", mode: "Offline", duration: "60 mins", scheduledAt: "2026-09-25", venue: "ICICI Learning Centre, Mumbai", description: "In-person case study and group discussion round for shortlisted candidates." },
];

export function ensureSeeded() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(NS + "seeded")) return;

  write(
    "internships",
    SEED_INTERNSHIPS.map((i) => insertLocal(i, { ownerId: "seed", status: "Open", postedAt: new Date().toISOString() }))
  );
  write(
    "programs",
    SEED_PROGRAMS.map((p) => insertLocal(p, { ownerId: "seed", enrolled: Math.floor(p.seats * (0.2 + Math.random() * 0.6)), status: "Open" }))
  );
  write(
    "skillTests",
    SEED_SKILL_TESTS.map((t) => insertLocal(t, { ownerId: "seed", status: "Open", postedAt: new Date().toISOString() }))
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
  return all("internships").sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

export function listInternshipsByOwner(ownerId) {
  return findMany("internships", (i) => i.ownerId === ownerId);
}

export function createInternship(ownerId, company, data) {
  return insert("internships", {
    ...data,
    ownerId,
    company,
    status: "Open",
    postedAt: new Date().toISOString(),
    color: data.color || randomColor(),
  });
}

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

export function applyToInternship(internship, student, match) {
  const existing = findOne(
    "applications",
    (a) => a.internshipId === internship.id && a.studentId === student.id
  );
  if (existing) return existing;
  return insert("applications", {
    internshipId: internship.id,
    internshipTitle: internship.title,
    company: internship.company,
    studentId: student.id,
    studentName: student.name,
    studentInstitution: student.institution || student.instituteName || "",
    studentCourse: student.course || "",
    match: match ?? 65,
    status: "Applied",
    appliedAt: new Date().toISOString(),
  });
}

export function updateApplicationStatus(id, status) {
  return update("applications", id, { status });
}

/* ============================================================
   Skill tests & assessment results
   ============================================================ */

export function listSkillTests() {
  ensureSeeded();
  return all("skillTests");
}

export function listSkillTestsByOwner(ownerId) {
  return findMany("skillTests", (t) => t.ownerId === ownerId);
}

export function createSkillTest(ownerId, hostName, data) {
  return insert("skillTests", { ...data, ownerId, hostName, status: "Open", postedAt: new Date().toISOString() });
}

export function getAssessment(studentId) {
  return findOne("assessments", (a) => a.studentId === studentId);
}

export function getAttemptsForStudent(studentId) {
  return findMany("assessmentAttempts", (a) => a.studentId === studentId);
}

export function recordAssessmentResult(studentId, testId, domain, scorePct) {
  insert("assessmentAttempts", { studentId, testId, domain, score: scorePct, completedAt: new Date().toISOString() });

  const existing = getAssessment(studentId);
  const domainScores = { ...(existing?.domainScores || {}) };
  domainScores[domain] = scorePct;
  const values = Object.values(domainScores);
  const overallScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const strongTags = Object.entries(domainScores).filter(([, v]) => v >= 70).map(([k]) => k);
  const record = { domainScores, overallScore, strongTags, updatedAt: new Date().toISOString() };

  if (existing) return update("assessments", existing.id, record);
  return insert("assessments", { studentId, ...record });
}

export function registerForSkillTest(testId, userId) {
  const already = findOne("skillTestRegistrations", (r) => r.testId === testId && r.userId === userId);
  if (already) return already;
  return insert("skillTestRegistrations", { testId, userId, registeredAt: new Date().toISOString() });
}

export function isRegisteredForSkillTest(testId, userId) {
  return !!findOne("skillTestRegistrations", (r) => r.testId === testId && r.userId === userId);
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
   Programs (FDPs) & research collaborations
   ============================================================ */

export function listPrograms() {
  ensureSeeded();
  return all("programs");
}

export function createProgram(ownerId, organiser, data) {
  return insert("programs", { ...data, ownerId, organiser, enrolled: 0, status: "Open" });
}

export function registerForProgram(programId, userId) {
  const program = findOne("programs", (p) => p.id === programId);
  if (!program) return null;
  const already = findOne(
    "programRegistrations",
    (r) => r.programId === programId && r.userId === userId
  );
  if (already) return program;
  insert("programRegistrations", { programId, userId, registeredAt: new Date().toISOString() });
  return update("programs", programId, { enrolled: (program.enrolled || 0) + 1 });
}

export function getCollabResponse(collabId) {
  const r = findOne("collabResponses", (c) => c.collabId === collabId);
  return r ? r.response : null;
}

export function setCollabResponse(collabId, response) {
  const existing = findOne("collabResponses", (c) => c.collabId === collabId);
  if (existing) return update("collabResponses", existing.id, { response });
  return insert("collabResponses", { collabId, response });
}

export function listUsersByRole(role) {
  return findMany("users", (u) => u.role === role);
}

function randomColor() {
  const palette = ["#6B7C3C", "#8A4A3C", "#3C5A8A", "#5A3C8A", "#8A703C", "#3C6B8A", "#3C8A6B", "#6B3C8A"];
  return palette[Math.floor(Math.random() * palette.length)];
}
