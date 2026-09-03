"use client";

/**
 * Local, browser-persisted data layer standing in for a real database.
 * Every "collection" is a JSON array in localStorage. The shape mirrors
 * what a Firestore collection would look like, so swapping in a real
 * backend later just means replacing the functions in this file.
 */

const NS = "ayusetu:v4:";

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

export const TEST_WEIGHT = { Online: 1, Offline: 1.5 };

function futureDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);
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
      title: "Quantitative Aptitude Test",
      domain: "Quantitative Aptitude",
      hostName: "Tata Consultancy Services",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      ...hoursAgoDateTime(2),
      description: "A standard placement-style quantitative aptitude screening test.",
      prerequisites: "Basic Class 10 level arithmetic, percentages, and averages.",
      certification: "TCS Quantitative Readiness Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No calculators, phones, or external notes are allowed.",
      ],
    },
    {
      title: "Logical Reasoning Assessment",
      domain: "Logical Reasoning",
      hostName: "Infosys",
      mode: "Online",
      duration: "15 mins",
      price: 0,
      scheduledAt: futureDate(6),
      scheduledTime: "14:00",
      description: "Evaluate pattern recognition and structured problem-solving.",
      prerequisites: "No prior preparation required — this measures raw reasoning ability.",
      certification: "Infosys Logical Reasoning Badge",
      rules: [
        "Ensure a stable internet connection before joining.",
        "Keep your camera on for the full duration.",
        "Switching browser tabs during the test may flag your attempt for review.",
      ],
    },
    {
      title: "Verbal Ability Test",
      domain: "Verbal Ability",
      hostName: "IIT Delhi Placement Cell",
      mode: "Online",
      duration: "10 mins",
      price: 99,
      scheduledAt: futureDate(3),
      scheduledTime: "09:00",
      description: "Grammar, vocabulary, and comprehension screening used for shortlisting.",
      prerequisites: "Comfortable reading and writing in English at a graduate level.",
      certification: "IIT Delhi Verbal Proficiency Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "Use of translation tools or dictionaries is not permitted.",
      ],
    },
    {
      title: "Programming Fundamentals Quiz",
      domain: "Programming Fundamentals",
      hostName: "Zoho Corporation",
      mode: "Online",
      duration: "15 mins",
      price: 199,
      scheduledAt: futureDate(7),
      scheduledTime: "11:00",
      description: "Core CS fundamentals: data structures, complexity, and web basics.",
      prerequisites: "An introductory course in programming or data structures.",
      certification: "Zoho Programming Fundamentals Certificate",
      rules: [
        "Join the test room at least 10 minutes before the scheduled time.",
        "Keep your camera on for the full duration.",
        "No IDEs, compilers, or AI assistants may be used during the quiz.",
      ],
    },
    {
      title: "Business & Communication Assessment",
      domain: "Business & Communication",
      hostName: "ICICI Bank",
      mode: "Offline",
      duration: "60 mins",
      price: 499,
      scheduledAt: futureDate(10),
      reportingTime: "09:30 AM (session starts 10:00 AM sharp)",
      venue: "ICICI Learning Centre, Bandra Kurla Complex, Mumbai",
      description: "In-person case study and group discussion round for shortlisted candidates.",
      prerequisites: "Familiarity with basic business case-study frameworks (SWOT, 4Ps) is helpful.",
      certification: "ICICI Business Communication Certificate",
      documentsRequired: ["Government-issued photo ID", "Printed resume (2 copies)", "Printout of the registration confirmation"],
      rules: [
        "Report at least 30 minutes before the session start time.",
        "Formal business attire is expected.",
        "Electronic devices must be switched off and submitted at the entrance.",
      ],
    },
  ];
}

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
  return all("internships").sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
}

export function listInternshipsByOwner(ownerId) {
  return findMany("internships", (i) => i.ownerId === ownerId);
}

/** One view per browser per posting per session — a page refresh shouldn't recount. */
export function recordInternshipView(internshipId) {
  if (typeof window === "undefined") return;
  const key = "ayusetu:viewed-internships";
  const seen = new Set(JSON.parse(window.sessionStorage.getItem(key) || "[]"));
  if (seen.has(internshipId)) return;
  seen.add(internshipId);
  window.sessionStorage.setItem(key, JSON.stringify([...seen]));
  const internship = findOne("internships", (i) => i.id === internshipId);
  if (internship) update("internships", internshipId, { views: (internship.views || 0) + 1 });
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

export function updateApplicationStatus(id, status) {
  const existing = findOne("applications", (a) => a.id === id);
  const statusHistory = [...(existing?.statusHistory || []), { status, at: new Date().toISOString() }];
  return update("applications", id, { status, statusHistory });
}

/**
 * Recruiter-only fields on an application record — interview mode and private
 * notes. These live on the APPLICATION (owned by the hiring company), never on
 * the student's own user/portfolio record, so a company can never edit a
 * candidate's actual profile data — only its own notes about that candidate.
 */
export function updateApplicationRecruiterFields(id, patch) {
  return update("applications", id, patch);
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
 * starts, so registered students always get a full day's notice. Throws
 * rather than silently clamping, so the caller can surface the real reason.
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

/* ============================================================
   Demo Mode — one populated, read-and-click-around account per
   role, so a visitor can explore every page without signing up.
   ============================================================ */

export function ensureDemoData() {
  if (!isBrowser()) return;
  ensureSeeded();
  if (window.localStorage.getItem(NS + "demoSeeded")) return;

  const student = insert("users", {
    id: "demo-student",
    email: "demo.student@setu.dev",
    passwordHash: null,
    role: "student",
    name: "Demo Student",
    institution: "IIT Delhi",
    course: "B.Tech Computer Science",
    year: "4th Year",
    createdAt: new Date().toISOString(),
  });

  recordAssessmentResult(student.id, "demo-test-1", "Quantitative Aptitude", 80);
  recordAssessmentResult(student.id, "demo-test-2", "Logical Reasoning", 70);
  recordAssessmentResult(student.id, "demo-test-3", "Verbal Ability", 90);
  recordAssessmentResult(student.id, "demo-test-4", "Programming Fundamentals", 65);
  recordAssessmentResult(student.id, "demo-test-5", "Business & Communication", 75);

  savePortfolio(student.id, {
    bio: "Aspiring software engineer interested in backend systems and applied ML.",
    skillBadges: {
      "Technical Skills": [
        { name: "Python", level: "Advanced" },
        { name: "React", level: "Proficient" },
      ],
      "Research & Analytical": [{ name: "Data Structures & Algorithms", level: "Proficient" }],
      "Soft Skills": [{ name: "Team Leadership", level: "Advanced" }],
    },
    certifications: [{ name: "AWS Cloud Practitioner", issuer: "Amazon Web Services", year: "2025", score: "Pass" }],
    timeline: [
      { year: "2023", title: "Admitted — B.Tech CSE", org: "IIT Delhi", type: "Education" },
      { year: "2025", title: "Summer Intern", org: "Infosys", type: "Internship" },
    ],
    documents: [],
  });

  const industry = insert("users", {
    id: "demo-industry",
    email: "demo.industry@setu.dev",
    passwordHash: null,
    role: "industry",
    name: "Demo Recruiter",
    companyName: "Setu Technologies Pvt. Ltd.",
    workEmailDomain: "@setutech.com",
    createdAt: new Date().toISOString(),
  });

  const posting = createInternship(industry.id, industry.companyName, {
    title: "Full-Stack Engineering Intern",
    location: "Bengaluru",
    type: "Hybrid",
    domain: "IT",
    duration: "6 months",
    stipend: "₹20,000/mo",
    tags: ["React", "Node.js", "PostgreSQL"],
    deadline: futureDate(45),
    description: "Build product features end-to-end with the core engineering team.",
  });

  const demoApplicants = [
    { studentName: student.name, studentInstitution: student.institution, studentCourse: student.course, match: 82, status: "Shortlisted", studentId: student.id, daysAgo: 6 },
    { studentName: "Kabir Mehta", studentInstitution: "NIT Tiruchirappalli", studentCourse: "B.Tech ECE", match: 76, status: "Applied", daysAgo: 3 },
    { studentName: "Sara Iyer", studentInstitution: "BITS Pilani", studentCourse: "M.Sc Economics", match: 88, status: "Interview", daysAgo: 10 },
    { studentName: "Rohan Das", studentInstitution: "VIT Vellore", studentCourse: "B.Tech IT", match: 95, status: "Hired", daysAgo: 18 },
  ];
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
  demoApplicants.forEach((a) => {
    insert("applications", {
      internshipId: posting.id,
      internshipTitle: posting.title,
      company: posting.company,
      studentId: a.studentId || `demo-applicant-${a.studentName.replace(/\s+/g, "-").toLowerCase()}`,
      studentName: a.studentName,
      studentInstitution: a.studentInstitution,
      studentCourse: a.studentCourse,
      match: a.match,
      status: a.status,
      appliedAt: new Date(Date.now() - a.daysAgo * 86400000).toISOString(),
      statusHistory: buildDemoHistory(a.status, a.daysAgo),
    });
  });

  const academician = insert("users", {
    id: "demo-academician",
    email: "demo.academician@setu.dev",
    passwordHash: null,
    role: "academician",
    name: "Dr. Demo Faculty",
    institution: "NIT Tiruchirappalli",
    department: "Computer Science & Engineering",
    createdAt: new Date().toISOString(),
  });

  createProgram(academician.id, academician.institution, {
    title: "Cloud Computing & DevOps Bootcamp",
    dates: "Dec 1–5, 2026",
    seats: 35,
    mode: "Online",
  });

  insert("users", {
    id: "demo-institution",
    email: "demo.institution@setu.dev",
    passwordHash: null,
    role: "institution",
    name: "Demo Placement Cell",
    instituteName: "IIT Delhi",
    instituteId: "AISHE-U-0001",
    createdAt: new Date().toISOString(),
  });

  window.localStorage.setItem(NS + "demoSeeded", "1");
}

export function getDemoUser(role) {
  ensureDemoData();
  return findOne("users", (u) => u.id === `demo-${role}`);
}

function randomColor() {
  const palette = ["#6B7C3C", "#8A4A3C", "#3C5A8A", "#5A3C8A", "#8A703C", "#3C6B8A", "#3C8A6B", "#6B3C8A"];
  return palette[Math.floor(Math.random() * palette.length)];
}
