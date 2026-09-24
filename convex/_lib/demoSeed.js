import { buildCertificateSnapshot } from "../../lib/credentials";
import { validateResumeResult } from "../../lib/resumeAnalysis";
import { SKILL_DOMAINS } from "../../lib/questionBank";
import { CERTIFICATES, RESUME } from "../../lib/settings";
import { DEMO_RESUME_TARGET, DEMO_RESUME_TEXT, DEMO_VERIFIED_SCORES, RASA_PANCHAKA_QUESTIONS, demoResumeRaw, questionRows } from "../../lib/demoFeatures";
import { certificateNumber, notifyCertificate, uniqueVerifyCode } from "./certificates";

/**
 * The demo tour's shared rows for the features that are read live from the
 * server — communities, the community window test, Resume Coach and an issued
 * certificate. Everything is owned by a demo persona (so demo.reset clears it
 * and real accounts never see it) and has a fixed id, so running this again
 * changes nothing: it writes only when the Dravyaguna community is missing.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const INSTITUTION = "All India Institute of Ayurveda (AIIA), New Delhi";
const PROFESSOR = { id: "demo-academician", name: "Dr. Shalini Kulkarni" };
const STUDENT = { id: "demo-student", name: "Aarav Sharma", course: "BAMS", year: "4th Year", rollNo: "23BAMS042", institution: INSTITUTION };

export const DEMO_IDS = {
  dravyaguna: "community_demo_dravyaguna",
  pharmacovigilance: "community_demo_pv_cell",
  panchakarma: "community_demo_panchakarma_pg",
  rasaTest: "skillTests_demo_rasa_unit",
  unit3Test: "skillTests_demo_dravyaguna_u3",
  pastTest: "skillTests_demo_clinical_screening",
  certificate: "cred_demo_clinical_screening",
  analysis: "resume_demo_aarav",
};

function inviteCode(seed) {
  // Fixed per community so the owner sees the same code after every re-seed.
  const alphabet = CERTIFICATES.VERIFY_ALPHABET;
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + (i + 1) * 7919;
  }
  return out;
}

function istMs(daysFromToday, hour, minute = 0) {
  const now = new Date(Date.now() + 5.5 * HOUR);
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday, hour, minute);
  return base - 5.5 * HOUR;
}

function community(id, fields, now) {
  return {
    id,
    ownerRole: "academician",
    ownerName: PROFESSOR.name,
    ownerId: PROFESSOR.id,
    institutionId: "demo-institution",
    institutionName: INSTITUTION,
    slug: id.replace(/^community_demo_/, "").replace(/_/g, "-"),
    ayushSystem: "ayurveda",
    subject: null,
    courseLevel: null,
    coverImage: null,
    sameInstitutionOnly: false,
    memberCap: null,
    allowComments: true,
    rules: "Be respectful. Share sources for anything clinical. No patient identifiers.",
    inviteCode: inviteCode(id),
    inviteCodeExpiresAt: null,
    inviteCodeMaxUses: null,
    inviteCodeUses: 0,
    pendingCount: 0,
    requestDigestAt: null,
    archivedAt: null,
    createdAt: now - 20 * DAY,
    updatedAt: now,
    ...fields,
    nameKey: fields.name.toLowerCase(),
  };
}

async function member(ctx, communityId, userId, userName, fields, now) {
  await ctx.db.insert("communityMembers", {
    communityId,
    userId,
    userName,
    role: "member",
    status: "active",
    requestNote: null,
    invitedBy: null,
    joinedAt: now - 10 * DAY,
    statusChangedAt: now - 10 * DAY,
    statusChangedBy: userId,
    banReason: null,
    notificationsMuted: false,
    lastSeenAt: null,
    ...fields,
  });
}

function test(id, fields, at) {
  return {
    id,
    ayushSystem: "ayurveda",
    domain: "Herbal Drug Quality, GMP & Pharmacognosy",
    hostName: INSTITUTION,
    ownerId: PROFESSOR.id,
    mode: "Online",
    price: 0,
    status: "Open",
    postedAt: at,
    updatedAt: at,
    issueCertificate: true,
    minCertificateScore: 50,
    proctored: true,
    meetingMode: "none",
    meetingLink: null,
    paperType: "single",
    needsRetagging: false,
    ...fields,
  };
}

async function studentRow(ctx) {
  const row = await ctx.db
    .query("users")
    .withIndex("by_client_id", (q) => q.eq("id", STUDENT.id))
    .first();
  return { ...STUDENT, ...(row || {}), rollNo: row?.rollNo || STUDENT.rollNo };
}

export async function ensureDemoFeatures(ctx) {
  const exists = await ctx.db
    .query("communities")
    .withIndex("by_client_id", (q) => q.eq("id", DEMO_IDS.dravyaguna))
    .first();
  if (exists) return { seeded: false };

  const now = Date.now();
  const at = new Date(now).toISOString();

  /* ---------- tests ---------- */
  const rasaTest = test(
    DEMO_IDS.rasaTest,
    {
      title: "Rasa Panchaka Unit Test",
      description: "Unit 3 of Dravyaguna Vigyan: Rasa, Guna, Virya, Vipaka and Prabhava. Take it any time in the window; you get the full 30 minutes whenever you start.",
      certification: "Rasa Panchaka Unit Test",
      scheduleType: "window",
      windowOpensAtMs: now - HOUR,
      windowClosesAtMs: now + 5 * DAY,
      scheduledAtMs: now - HOUR,
      duration: "30 mins",
      durationMinutes: 30,
      shuffle: true,
      poolSize: 20,
      questionCount: RASA_PANCHAKA_QUESTIONS.length,
      audience: "community",
      communityId: DEMO_IDS.dravyaguna,
      communityName: "Dravyaguna Vigyan: BAMS 2nd Prof (2025 batch)",
    },
    at
  );
  const unit3Start = istMs(7, 10);
  const unit3Test = test(
    DEMO_IDS.unit3Test,
    {
      title: "Dravyaguna Vigyan: Unit 3 Assessment",
      description: "A fixed sitting for the whole batch next week. Proctored, online.",
      certification: "Dravyaguna Vigyan: Unit 3 Assessment",
      scheduleType: "fixed",
      scheduledAtMs: unit3Start,
      scheduledAt: new Date(unit3Start + 5.5 * HOUR).toISOString().slice(0, 10),
      scheduledTime: "10:00",
      duration: "1 hr 15 mins",
      durationMinutes: 75,
      shuffle: true,
      poolSize: null,
      questionCount: 10,
      audience: "public",
      communityId: null,
    },
    at
  );
  const pastStart = istMs(-12, 10);
  const pastTest = test(
    DEMO_IDS.pastTest,
    {
      title: "ASU&H Clinical Fundamentals Screening",
      description: "Last fortnight's screening for the clinical postings.",
      certification: "ASU&H Clinical Fundamentals Screening",
      domain: "ASU&H Clinical Fundamentals",
      scheduleType: "fixed",
      scheduledAtMs: pastStart,
      duration: "45 mins",
      durationMinutes: 45,
      questionCount: 10,
      audience: "public",
      communityId: null,
    },
    at
  );
  for (const t of [rasaTest, unit3Test, pastTest]) {
    await ctx.db.insert("skillTests", t);
    const list = t.id === DEMO_IDS.rasaTest ? RASA_PANCHAKA_QUESTIONS : RASA_PANCHAKA_QUESTIONS.slice(t.id === DEMO_IDS.unit3Test ? 10 : 0, t.id === DEMO_IDS.unit3Test ? 20 : 10);
    for (const q of questionRows(t.id, PROFESSOR.id, list, at)) await ctx.db.insert("skillTestQuestions", q);
  }
  /* ---------- communities ---------- */
  const dravyaguna = community(
    DEMO_IDS.dravyaguna,
    {
      name: "Dravyaguna Vigyan: BAMS 2nd Prof (2025 batch)",
      description: "Notes, lectures and unit tests for the 2025 batch's Dravyaguna Vigyan course.",
      subject: "Dravyaguna Vigyan",
      courseLevel: "BAMS",
      visibility: "open",
      memberCount: 4,
    },
    now
  );
  const pv = community(
    DEMO_IDS.pharmacovigilance,
    {
      name: "AIIA Pharmacovigilance Cell",
      description: "The institute's ASU&H pharmacovigilance cell: ADR reporting drives, case reviews and training for AIIA students.",
      subject: "Pharmacovigilance",
      ownerId: "demo-institution",
      ownerRole: "institution",
      ownerName: INSTITUTION,
      visibility: "closed",
      sameInstitutionOnly: true,
      memberCount: 3,
      pendingCount: 1,
    },
    now
  );
  const panchakarma = community(
    DEMO_IDS.panchakarma,
    {
      name: "Panchakarma Clinical Postings: PG",
      description: "Rotation schedules and case discussions for PG scholars posted to the Panchakarma unit.",
      subject: "Panchakarma",
      courseLevel: "MD/MS (Ayu)",
      visibility: "invite",
      memberCount: 2,
    },
    now
  );
  for (const c of [dravyaguna, pv, panchakarma]) {
    await ctx.db.insert("communities", c);
    await member(ctx, c.id, c.ownerId, c.ownerName, { role: "owner", joinedAt: c.createdAt, statusChangedAt: c.createdAt, lastSeenAt: now }, now);
    await ctx.db.insert("communityAudit", { communityId: c.id, actorId: c.ownerId, actorName: c.ownerName, action: "created", targetId: null, detail: null, at: c.createdAt });
  }

  // Dravyaguna: the demo student and two classmates.
  await member(ctx, dravyaguna.id, STUDENT.id, STUDENT.name, {}, now);
  await member(ctx, dravyaguna.id, "demo-cohort-1", "Isha Patel", {}, now);
  await member(ctx, dravyaguna.id, "demo-cohort-2", "Rahul Nair", {}, now);

  // Pharmacovigilance cell: two members, one banned, and the demo student's request waiting.
  await member(ctx, pv.id, "demo-cohort-3", "Sneha Iyer", {}, now);
  await member(ctx, pv.id, "demo-cohort-4", "Karan Mehta", {}, now);
  await member(ctx, pv.id, "demo-cohort-5", "Vikram Rao", { status: "banned", banReason: "Repeated spam comments", statusChangedAt: now - 2 * DAY, statusChangedBy: "demo-institution" }, now);
  await member(ctx, pv.id, STUDENT.id, STUDENT.name, { status: "pending", joinedAt: null, requestNote: "I audited ADR reports for the cell last year and would like to join the next drive.", statusChangedAt: now - 6 * HOUR }, now);
  await ctx.db.insert("communityAudit", { communityId: pv.id, actorId: "demo-institution", actorName: INSTITUTION, action: "banned", targetId: "demo-cohort-5", detail: "Repeated spam comments", at: now - 2 * DAY });

  // Panchakarma PG: invite-only; the demo student has an invitation waiting.
  await member(ctx, panchakarma.id, "demo-cohort-6", "Dr. Meera Joshi", {}, now);
  await member(ctx, panchakarma.id, STUDENT.id, STUDENT.name, { status: "invited", invitedBy: PROFESSOR.id, joinedAt: null, statusChangedAt: now - 3 * HOUR, statusChangedBy: PROFESSOR.id }, now);
  await ctx.db.insert("studentNotifications", {
    id: "studentNotifications_demo_invite_pk",
    studentId: STUDENT.id,
    senderId: PROFESSOR.id,
    kind: "community_invite",
    link: `/communities/${panchakarma.id}`,
    communityId: panchakarma.id,
    postId: null,
    testId: null,
    message: `${PROFESSOR.name} invited you to join "${panchakarma.name}".`,
    from: PROFESSOR.name,
    sentAt: new Date(now - 3 * HOUR).toISOString(),
    read: false,
    updatedAt: at,
  });

  /* ---------- Dravyaguna posts ---------- */
  const posts = [
    {
      id: "communityPosts_demo_announce",
      type: "announcement",
      title: "Unit 3 test on Rasa Panchaka next week",
      body: "The Rasa Panchaka Unit Test is open now for five days in the Tests tab: 30 minutes, proctored, and each of you gets 20 of the 30 questions in your own order. The full Unit 3 assessment is next week. Revise Charaka Sutrasthana 26 first.",
      pinned: true,
      pinnedAt: now - 2 * DAY,
      pinOrder: 1,
      createdAt: now - 2 * DAY,
    },
    {
      id: "communityPosts_demo_material",
      type: "material",
      title: "Unit 3 notes, lecture slides and syllabus",
      body: "Notes for Rasa Panchaka, Tuesday's lecture slides and the unit syllabus. Read the notes before the test.",
      attachments: [
        { fileId: "demo-file-notes", storageId: null, publicPath: "/demo/Dravyaguna-Unit3-Notes.docx", fileName: "Dravyaguna-Unit3-Notes.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: 2400 },
        { fileId: "demo-file-slides", storageId: null, publicPath: "/demo/Rasa-Panchaka-Lecture.pptx", fileName: "Rasa-Panchaka-Lecture.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", bytes: 4200 },
        { fileId: "demo-file-syllabus", storageId: null, publicPath: "/demo/Dravyaguna-Unit3-Syllabus.pdf", fileName: "Dravyaguna-Unit3-Syllabus.pdf", mimeType: "application/pdf", bytes: 1800 },
      ],
      createdAt: now - 36 * HOUR,
    },
    {
      id: "communityPosts_demo_link",
      type: "link",
      title: "Ayurvedic Pharmacopoeia of India",
      body: "The official monographs we use for Rasa, Guna, Virya and Vipaka of each drug.",
      links: [{ url: "https://www.pcimh.gov.in", title: "PCIM&H: Ayurvedic Pharmacopoeia of India" }],
      createdAt: now - 30 * HOUR,
    },
    {
      id: "communityPosts_demo_test",
      type: "test",
      title: "📝 Rasa Panchaka Unit Test is open",
      body: "Open for 5 days · 30 minutes · proctored · 20 of 30 questions, shuffled.",
      testId: DEMO_IDS.rasaTest,
      createdAt: now - HOUR,
    },
  ];
  for (const p of posts) {
    await ctx.db.insert("communityPosts", {
      communityId: dravyaguna.id,
      authorId: PROFESSOR.id,
      authorName: PROFESSOR.name,
      attachments: [],
      links: [],
      testId: null,
      pinned: false,
      pinnedAt: null,
      pinOrder: null,
      editedAt: null,
      deletedAt: null,
      ...p,
    });
  }
  await ctx.db.insert("communityComments", { id: "communityComments_demo_1", postId: "communityPosts_demo_announce", communityId: dravyaguna.id, authorId: "demo-cohort-1", authorName: "Isha Patel", body: "Will Prabhava examples from the notes be in the test?", deletedAt: null, deletedBy: null, createdAt: now - 40 * HOUR });
  await ctx.db.insert("communityComments", { id: "communityComments_demo_2", postId: "communityPosts_demo_announce", communityId: dravyaguna.id, authorId: PROFESSOR.id, authorName: PROFESSOR.name, body: "Yes: Danti and Chitraka especially.", deletedAt: null, deletedBy: null, createdAt: now - 38 * HOUR });

  /* ---------- the issued certificate ---------- */
  const student = await studentRow(ctx);
  const certificateNo = await certificateNumber(ctx, PROFESSOR.id, INSTITUTION);
  const verifyCode = await uniqueVerifyCode(ctx);
  const issuedAt = new Date(pastStart + 2 * HOUR).toISOString();
  const snapshot = buildCertificateSnapshot({
    branding: { title: "Certificate of Achievement", professorName: PROFESSOR.name, professorTitle: "Professor, Dravyaguna & Pharmacognosy", design: { tagline: "for successfully completing", seal: true } },
    brandingSource: "default",
    issuerName: INSTITUTION,
    student,
    test: pastTest,
    score: 84,
    correctCount: 8,
    totalQuestions: 10,
    testDate: new Date(pastStart).toISOString(),
    durationMinutes: 45,
    ayushSystemLabel: "Ayurveda",
    certificateNo,
    verifyCode,
    issuedAt,
  });
  const credential = {
    id: DEMO_IDS.certificate,
    studentId: STUDENT.id,
    studentName: snapshot.studentName,
    studentEmail: student.email || "",
    title: pastTest.certification,
    issuer: INSTITUTION,
    issuerId: PROFESSOR.id,
    issuerRole: "academician",
    kind: "Skill Test",
    testId: pastTest.id,
    testTitle: pastTest.title,
    score: "84%",
    scorePercent: 84,
    grade: snapshot.grade,
    remarks: "",
    certificateNo,
    verifyCode,
    issuedAt,
    revokedAt: null,
    updatedAt: at,
    snapshot,
    showOnProfile: true,
    featured: true,
  };
  await ctx.db.insert("credentials", credential);
  await notifyCertificate(ctx, credential, "certificate_issued");

  /* ---------- Resume Coach ---------- */
  const catalogue = [rasaTest, unit3Test].map((t) => ({ testId: t.id, title: t.title }));
  const { result } = validateResumeResult(demoResumeRaw({ rasaTestId: rasaTest.id, unit3TestId: unit3Test.id }), {
    catalogue,
    skillDomains: SKILL_DOMAINS,
    resumeText: DEMO_RESUME_TEXT,
    verified: DEMO_VERIFIED_SCORES,
    hasTarget: true,
  });
  await ctx.db.insert("resumeAnalyses", {
    id: DEMO_IDS.analysis,
    studentId: STUDENT.id,
    resumeStorageId: null,
    resumeFileName: "Aarav-Sharma-Resume.pdf",
    source: "upload",
    target: DEMO_RESUME_TARGET,
    result,
    model: "precomputed-demo",
    consentAt: now - DAY,
    createdAt: now - DAY,
    expiresAt: now - DAY + RESUME.RETENTION_DAYS * DAY,
  });

  return { seeded: true };
}
