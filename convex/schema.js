import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    id: v.optional(v.string()),
    email: v.string(),
    passwordHash: v.optional(v.union(v.string(), v.null())),
    role: v.string(), // "student" | "industry" | "academician" | "institution"
    name: v.optional(v.string()),
    institution: v.optional(v.string()),
    instituteName: v.optional(v.string()),
    instituteId: v.optional(v.string()),
    department: v.optional(v.string()),
    /* One of the five canonical slugs in lib/ayush.js. Accounts created
       before the field existed carry needsRetagging until they pick one. */
    ayushSystem: v.optional(v.string()),
    needsRetagging: v.optional(v.boolean()),
    course: v.optional(v.string()),
    year: v.optional(v.string()),
    batch: v.optional(v.string()),
    rollNo: v.optional(v.string()),
    invited: v.optional(v.boolean()),
    openToOpportunities: v.optional(v.boolean()),
    // Academician profile — research interests are what Research Collabs
    // matches listings against, so they live on the account itself.
    designation: v.optional(v.string()),
    experienceYears: v.optional(v.string()),
    bio: v.optional(v.string()),
    subjectsTaught: v.optional(v.array(v.string())),
    researchInterests: v.optional(v.array(v.string())),
    orcid: v.optional(v.string()),
    scholarUrl: v.optional(v.string()),
    companyName: v.optional(v.string()),
    workEmailDomain: v.optional(v.string()),
    phone: v.optional(v.string()),
    /* Optional recovery number, offered on every role's account settings. Used
       only to get someone back into their account when the registered email is
       gone; never shown to recruiters or students. */
    recoveryPhone: v.optional(v.string()),
    /* Institution accounts only, and deliberately its own field: the Dean's
       name is not the same person as the signing-in admin, and reusing one
       "name" box for both is how the wrong name ends up on published records. */
    deanName: v.optional(v.string()),
    avatar: v.optional(v.string()),
    avatarDataUrl: v.optional(v.union(v.string(), v.null())),
    /* Profile images live in file storage; the URL is resolved when the
       reference is written so every reader of the account gets it for free. */
    avatarStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
    bannerStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    bannerUrl: v.optional(v.union(v.string(), v.null())),
    bannerDataUrl: v.optional(v.union(v.string(), v.null())),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    logoUrl: v.optional(v.union(v.string(), v.null())),
    /* Students an institution invited from its roster: no password yet, and
       institutionId links them to the account that invited them. */
    institutionId: v.optional(v.string()),
    invitedAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    employeeId: v.optional(v.string()),
    // Industry/company profile (editable by the company itself).
    companyDomain: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    whyWorkWithUs: v.optional(v.string()),
    companyWebsite: v.optional(v.string()),
    hqLocation: v.optional(v.string()),
    companySize: v.optional(v.string()),
    contactPersonName: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    logoDataUrl: v.optional(v.union(v.string(), v.null())),
    gallery: v.optional(v.array(v.any())),
    verifiedCode: v.optional(v.union(v.string(), v.null())),
    // Set only after the signup OTP has been verified server-side.
    emailVerified: v.optional(v.boolean()),
    verifiedAt: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    // Extended profile fields, editable from the profile modal.
    headline: v.optional(v.string()),
    location: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    cgpa: v.optional(v.string()),
    graduationYear: v.optional(v.string()),
    github: v.optional(v.string()),
    website: v.optional(v.string()),
    // Password recovery. The nonce is single-use: resetting clears it, so a
    // reset link cannot be replayed after the password has changed.
    resetNonce: v.optional(v.union(v.string(), v.null())),
    resetRequestedAt: v.optional(v.union(v.string(), v.null())),
    resetExpiresAt: v.optional(v.union(v.number(), v.null())),
    // Free-text interests the person typed themselves. Students and faculty
    // both have one; nothing about the list is preset or field-specific.
    interests: v.optional(v.array(v.string())),
    // Account-level preferences from the Settings tab.
    notifyApplicationUpdates: v.optional(v.boolean()),
    notifyTestReminders: v.optional(v.boolean()),
    notifyMentorship: v.optional(v.boolean()),
    notifyAnnouncements: v.optional(v.boolean()),
    showContactToRecruiters: v.optional(v.boolean()),
    showScoresToRecruiters: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_institution", ["institutionId"]),

  /**
   * Server-owned sign-in sessions.
   *
   * Every privileged mutation resolves its caller from one of these rows
   * rather than trusting an id the browser supplied, so "delete this account"
   * or "change this role" cannot be aimed at somebody else by editing a
   * request body. Tokens are random, opaque, and expire.
   */
  sessions: defineTable({
    token: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  internships: defineTable({
    id: v.optional(v.string()),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    type: v.string(), // "Hybrid" | "Remote" | "Onsite"
    domain: v.string(),
    duration: v.string(),
    /* Pay is a number plus a mode, not a hand-typed string: the recruiter
       enters 18000 and picks "per month" or "total for the duration", and the
       unit label is rendered by the UI. `stipend` is kept for postings written
       before that change so they still display. */
    stipendAmount: v.optional(v.union(v.number(), v.null())),
    stipendMode: v.optional(v.string()), // "monthly" | "total"
    stipend: v.optional(v.string()),
    tags: v.array(v.string()),
    deadline: v.string(),
    description: v.string(),
    color: v.optional(v.string()),
    hot: v.optional(v.boolean()),
    views: v.optional(v.number()),
    uniqueViews: v.optional(v.number()),
    // Minimum qualifications, so applications arrive pre-filtered.
    minSkillScore: v.optional(v.union(v.number(), v.null())),
    eligibleDepartments: v.optional(v.array(v.string())),
    /* Retired: postings are no longer restricted to a named list of
       institutions. Kept in the schema only so rows written before the field
       was removed still validate; nothing reads it. */
    eligibleInstitutions: v.optional(v.array(v.string())),
    ayushSystem: v.optional(v.string()),
    needsRetagging: v.optional(v.boolean()),
    recruiterId: v.optional(v.union(v.string(), v.null())),
    recruiterName: v.optional(v.union(v.string(), v.null())),
    manualStatus: v.optional(v.boolean()),
    closedReason: v.optional(v.union(v.string(), v.null())),
    ownerId: v.string(),
    status: v.string(), // "Open" | "Closed"
    postedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  applications: defineTable({
    id: v.optional(v.string()),
    internshipId: v.string(),
    internshipTitle: v.string(),
    company: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    studentInstitution: v.optional(v.string()),
    studentCourse: v.optional(v.string()),
    studentYear: v.optional(v.string()),
    note: v.optional(v.string()),
    match: v.number(),
    status: v.string(), // "Applied" | "Shortlisted" | "Interview" | "Hired" | "Rejected"
    appliedAt: v.string(),
    statusHistory: v.optional(v.array(v.any())),
    /* The resume the candidate attached when they applied. An application with
       no resume behind it is not a real application, so this is captured at
       submission rather than looked up later. */
    resumeFileName: v.optional(v.string()),
    resumeDataUrl: v.optional(v.union(v.string(), v.null())),
    resumeStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    resumeMimeType: v.optional(v.union(v.string(), v.null())),
    resumeUrl: v.optional(v.union(v.string(), v.null())),
    studentDepartment: v.optional(v.string()),
    /* Where the match figure came from: recomputed here when the student has a
       server-side assessment, otherwise carried over from the device that
       applied and marked as such. */
    matchSource: v.optional(v.string()),
    rejectedAt: v.optional(v.union(v.string(), v.null())),
    offerSentAt: v.optional(v.union(v.string(), v.null())),
    updatedAt: v.optional(v.string()),
    /* Structured feedback the reviewer leaves — visible to the candidate,
       unlike recruiterNotes. */
    feedback: v.optional(v.any()),
    // Recruiter-only fields — never surfaced to the candidate.
    interviewMode: v.optional(v.string()), // "Physical" | "Online"
    interviewAt: v.optional(v.string()),
    recruiterNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.union(v.string(), v.null())),
    // Post-hire tracking: the pipeline doesn't end at "Hired".
    offerStage: v.optional(v.string()),
    offerUpdatedAt: v.optional(v.string()),
    offerAmount: v.optional(v.string()),
    offerNotes: v.optional(v.string()),
    joiningDate: v.optional(v.string()),
  })
    .index("by_internship", ["internshipId"])
    .index("by_student", ["studentId"])
    .index("by_client_id", ["id"]),

  programs: defineTable({
    id: v.optional(v.string()),
    title: v.string(),
    organiser: v.string(),
    /* Dates are structured. `dates` was a free-text box someone typed
       "Dec 8-12, 2026" into, which could not be sorted, validated or drawn on
       a calendar; it survives only as a display fallback for older rows. */
    startDate: v.optional(v.string()), // YYYY-MM-DD
    endDate: v.optional(v.string()), // YYYY-MM-DD
    startTime: v.optional(v.string()), // HH:mm
    dates: v.optional(v.string()),
    seats: v.number(),
    enrolled: v.number(),
    mode: v.string(),
    ownerId: v.string(),
    status: v.string(),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
    /* Online programmes need a joining link. If it is still missing a day
       before the start, the session is pushed back a day and the host is
       reminded; three pushes with no link cancels it. */
    meetingUrl: v.optional(v.string()),
    linkPushCount: v.optional(v.number()),
    lastPushedAt: v.optional(v.string()),
    cancelledReason: v.optional(v.string()),
    createdAt: v.optional(v.string()),
    certificatesIssuedAt: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),

  programRegistrations: defineTable({
    id: v.optional(v.string()),
    programId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    institution: v.optional(v.string()),
    designation: v.optional(v.string()),
    status: v.optional(v.string()),
    attended: v.optional(v.boolean()),
    certificateNo: v.optional(v.string()),
    certificateIssuedAt: v.optional(v.string()),
    promotedAt: v.optional(v.string()),
    registeredAt: v.string(),
  })
    .index("by_program", ["programId"])
    .index("by_user", ["userId"]),

  skillTests: defineTable({
    id: v.optional(v.string()),
    title: v.string(),
    domain: v.string(),
    ayushSystem: v.optional(v.string()),
    needsRetagging: v.optional(v.boolean()),
    hostName: v.string(),
    mode: v.string(), // "Online" | "Offline"
    duration: v.string(),
    price: v.number(),
    scheduledAt: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    reportingTime: v.optional(v.string()),
    venue: v.optional(v.string()),
    description: v.string(),
    prerequisites: v.optional(v.string()),
    certification: v.optional(v.string()),
    rules: v.optional(v.array(v.string())),
    documentsRequired: v.optional(v.array(v.string())),
    meetingLink: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    ownerId: v.string(),
    status: v.string(),
    postedAt: v.string(),
    /* The paper itself lives in skillTestQuestions (server-only answer keys);
       the row carries only what a candidate may see about it. */
    questionCount: v.optional(v.number()),
    paperType: v.optional(v.union(v.string(), v.null())), // "single" | "multiple" | "mixed"
    /* Secure exam room. `proctored` turns recording + monitoring on for an
       online test; `autoDisqualifyAfter` (null = off) marks an attempt
       disqualified without waiting for the host once that many violations
       have been logged. */
    proctored: v.optional(v.boolean()),
    autoDisqualifyAfter: v.optional(v.union(v.number(), v.null())),
    /* Certificates: issue automatically on grading, optionally gated on a
       minimum percentage. */
    issueCertificate: v.optional(v.boolean()),
    minCertificateScore: v.optional(v.union(v.number(), v.null())),
    /* Points off per violation in the exam room (0 = off); never above the
       paper's total. Tests published before this carry no value and use the
       default in lib/settings.js. */
    violationPenalty: v.optional(v.union(v.number(), v.null())),
    /* On-device face monitoring (no face / extra faces / looking away). */
    faceMonitoring: v.optional(v.boolean()),
    /* Sample papers candidates may download, as storage references. */
    samplePapers: v.optional(v.array(v.any())),
    updatedAt: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),

  /**
   * The questions behind a host-authored test. This table is the only place
   * `isCorrect` and `explanation` are stored, and only the host's own
   * queries or a GRADED attempt's review ever return them.
   */
  skillTestQuestions: defineTable({
    id: v.string(),
    testId: v.string(),
    ownerId: v.string(),
    order: v.number(),
    text: v.string(),
    type: v.string(), // "single" | "multiple"
    options: v.array(v.object({ id: v.string(), text: v.string(), isCorrect: v.boolean() })),
    explanation: v.optional(v.string()),
    source: v.string(), // "ai_generated" | "manual"
    ayushSystem: v.optional(v.string()),
    topic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    recheckHistory: v.optional(v.array(v.any())),
  })
    .index("by_test", ["testId"])
    .index("by_client_id", ["id"]),

  /**
   * One row per sitting of a proctored online test — the state machine in
   * lib/examState.js. Answers are saved progressively so a crash loses
   * nothing; the score is written only by the server's grader.
   */
  examAttempts: defineTable({
    id: v.string(),
    testId: v.string(),
    studentId: v.string(),
    ownerId: v.string(),
    state: v.string(),
    transitions: v.array(v.object({ state: v.string(), at: v.string(), reason: v.optional(v.string()) })),
    startedAt: v.optional(v.string()),
    deadlineAt: v.optional(v.number()),
    pausedAt: v.optional(v.union(v.number(), v.null())),
    pausedMs: v.optional(v.number()),
    endedAt: v.optional(v.string()),
    answers: v.optional(v.any()),
    questionIds: v.optional(v.array(v.string())),
    paperSource: v.optional(v.string()), // "authored" | "bank"
    domain: v.optional(v.string()),
    testTitle: v.optional(v.string()),
    durationMins: v.optional(v.number()),
    mode: v.optional(v.string()),
    violationCount: v.optional(v.number()),
    violationsByType: v.optional(v.any()),
    autoSubmitReason: v.optional(v.union(v.string(), v.null())),
    disqualified: v.optional(v.boolean()),
    disqualifiedAt: v.optional(v.union(v.string(), v.null())),
    disqualifyOverriddenAt: v.optional(v.union(v.string(), v.null())),
    score: v.optional(v.number()),
    correctCount: v.optional(v.number()),
    totalQuestions: v.optional(v.number()),
    /* Violation penalties: points off the marked paper, from the count this
       server kept. `failed` = penalties used up the paper or the camera was
       switched off; such an attempt scores 0 and gets no certificate. */
    rawPoints: v.optional(v.number()),
    penaltyPoints: v.optional(v.number()),
    penaltyPerViolation: v.optional(v.number()),
    failed: v.optional(v.boolean()),
    failedReason: v.optional(v.union(v.string(), v.null())),
    gradedAt: v.optional(v.string()),
    certificateStatus: v.optional(v.union(v.string(), v.null())), // "issued" | "below_minimum" | "not_enabled"
    credentialId: v.optional(v.union(v.string(), v.null())),
    recordingDeletedAt: v.optional(v.union(v.string(), v.null())),
    consented: v.optional(v.boolean()),
    clientInfo: v.optional(v.any()),
  })
    .index("by_client_id", ["id"])
    .index("by_student_test", ["studentId", "testId"])
    .index("by_test", ["testId"])
    .index("by_student", ["studentId"])
    .index("by_owner", ["ownerId"]),

  /* Kept permanently — the retention sweep never touches consent. */
  examConsents: defineTable({
    attemptId: v.string(),
    testId: v.string(),
    studentId: v.string(),
    agreed: v.boolean(),
    at: v.string(),
    noticeText: v.string(),
  })
    .index("by_attempt", ["attemptId"])
    .index("by_student", ["studentId"]),

  /* Violations, audio flags, disconnects and upload failures. Deleted by the
     retention sweep together with the recording. */
  examEvents: defineTable({
    attemptId: v.string(),
    testId: v.string(),
    studentId: v.string(),
    type: v.string(),
    at: v.string(),
    atMs: v.number(), // milliseconds since the attempt started
    durationMs: v.optional(v.union(v.number(), v.null())),
    detail: v.optional(v.string()),
  }).index("by_attempt", ["attemptId"]),

  /* Recording chunks in Convex file storage, in order. */
  examRecordingChunks: defineTable({
    attemptId: v.string(),
    seq: v.number(),
    storageId: v.id("_storage"),
    startedAtMs: v.number(),
    endedAtMs: v.number(),
    bytes: v.number(),
    mimeType: v.string(),
  }).index("by_attempt", ["attemptId", "seq"]),

  /* A host's reusable certificate branding (Section 4.1). One row per host. */
  certificateSettings: defineTable({
    ownerId: v.string(),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    signatureStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    institutionName: v.string(),
    professorName: v.string(),
    professorTitle: v.string(),
    programName: v.optional(v.string()),
    title: v.optional(v.string()),
    design: v.optional(v.any()),
    savedAt: v.string(),
  }).index("by_owner", ["ownerId"]),

  /* A complete one-off branding set for a single test (Section 4.3). */
  certificateOverrides: defineTable({
    testId: v.string(),
    ownerId: v.string(),
    logoStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    signatureStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    institutionName: v.string(),
    professorName: v.string(),
    professorTitle: v.string(),
    programName: v.optional(v.string()),
    title: v.optional(v.string()),
    design: v.optional(v.any()),
    savedAt: v.string(),
  }).index("by_test", ["testId"]),


  /* ============================================================
     Mirrored collections.

     Everything below used to live only in the creating browser's
     localStorage. Each table now carries the client's own record id
     (`id`, indexed as by_client_id so a retried mirror upserts rather
     than duplicates), an `updatedAt` stamp for the merge rule in
     lib/mergeRows.js, and an index on the field that names its owner.

     Tables whose rows are free-form profile bags (an institution's
     profile, a drive, an MOU, a notice) are declared with a permissive
     document validator: the browser writes whatever the form holds, and
     the mutation, not the schema, is what forces the owner id and strips
     anything a client may not set. The security-relevant fields are
     still validated in the mutation's own argument validators.
     ============================================================ */

  skillTestRegistrations: defineTable({
    id: v.optional(v.string()),
    testId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    institution: v.optional(v.string()),
    course: v.optional(v.string()),
    year: v.optional(v.string()),
    phone: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    missedRecorded: v.optional(v.boolean()),
    attended: v.optional(v.boolean()),
    attendedAt: v.optional(v.union(v.string(), v.null())),
    score: v.optional(v.union(v.number(), v.null())),
    registeredAt: v.string(),
    slot: v.optional(v.union(v.string(), v.null())),
    paid: v.optional(v.boolean()),
    updatedAt: v.optional(v.string()),
  })
    .index("by_test", ["testId"])
    .index("by_user", ["userId"])
    .index("by_client_id", ["id"]),

  assessmentAttempts: defineTable({
    studentId: v.string(),
    testId: v.string(),
    domain: v.string(),
    score: v.number(),
    weight: v.number(),
    missed: v.boolean(),
    completedAt: v.string(),
    // Server-computed marking, so a score can always be explained.
    correctCount: v.optional(v.number()),
    totalQuestions: v.optional(v.number()),
    breakdown: v.optional(v.array(v.any())),
    gradedBy: v.optional(v.string()), // "server" for real graded attempts
  })
    .index("by_student", ["studentId"])
    .index("by_student_test", ["studentId", "testId"]),

  assessments: defineTable({
    studentId: v.string(),
    domainScores: v.any(),
    overallScore: v.number(),
    strongTags: v.array(v.string()),
    updatedAt: v.string(),
  }).index("by_student", ["studentId"]),

  /* Documents, banner and photo are storage references
     ({ storageId, fileName, mimeType, bytes }); the query resolves `url`. */
  portfolios: defineTable(v.any()).index("by_student", ["studentId"]).index("by_client_id", ["id"]),

  collabResponses: defineTable({
    id: v.optional(v.string()),
    collabId: v.string(),
    ownerId: v.optional(v.string()),
    response: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_collab", ["collabId"])
    .index("by_owner", ["ownerId"])
    .index("by_client_id", ["id"]),

  activityLog: defineTable({
    id: v.optional(v.string()),
    scope: v.string(),
    institutionId: v.optional(v.string()),
    needsOwner: v.optional(v.boolean()),
    actor: v.string(),
    action: v.string(),
    detail: v.optional(v.string()),
    at: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_scope", ["scope"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  advisees: defineTable({
    id: v.optional(v.string()),
    facultyId: v.string(),
    studentId: v.string(),
    since: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_faculty", ["facultyId"])
    .index("by_student", ["studentId"])
    .index("by_client_id", ["id"]),

  announcements: defineTable(v.any())
    .index("by_institute", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  collabFiles: defineTable({
    id: v.optional(v.string()),
    collabId: v.string(),
    name: v.string(),
    size: v.optional(v.union(v.string(), v.number())),
    storageId: v.optional(v.union(v.id("_storage"), v.null())),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    bytes: v.optional(v.number()),
    uploadedBy: v.optional(v.string()),
    uploadedById: v.optional(v.string()),
    uploadedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_collab", ["collabId"])
    .index("by_client_id", ["id"]),

  collabInterests: defineTable({
    id: v.optional(v.string()),
    listingId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    institution: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.string(),
    at: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_listing", ["listingId"])
    .index("by_user", ["userId"])
    .index("by_client_id", ["id"]),

  collabListings: defineTable(v.any())
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_client_id", ["id"]),

  collabMessages: defineTable({
    id: v.optional(v.string()),
    collabId: v.string(),
    author: v.string(),
    authorId: v.optional(v.string()),
    body: v.string(),
    at: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_collab", ["collabId"])
    .index("by_client_id", ["id"]),

  collabMilestones: defineTable({
    id: v.optional(v.string()),
    collabId: v.string(),
    title: v.string(),
    due: v.optional(v.string()),
    owner: v.optional(v.string()),
    done: v.boolean(),
    createdAt: v.string(),
    completedAt: v.optional(v.union(v.string(), v.null())),
    updatedAt: v.optional(v.string()),
  })
    .index("by_collab", ["collabId"])
    .index("by_client_id", ["id"]),

  /* Reviews are public and keyed by company name; `authorId` says which
     side of the demo wall a review belongs to. */
  companyReviews: defineTable({
    id: v.optional(v.string()),
    company: v.string(),
    authorId: v.optional(v.string()),
    author: v.optional(v.string()),
    authorName: v.optional(v.string()),
    role: v.optional(v.string()),
    rating: v.number(),
    body: v.optional(v.string()),
    pros: v.optional(v.string()),
    cons: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_company", ["company"])
    .index("by_author", ["authorId"])
    .index("by_client_id", ["id"]),

  driveEligibility: defineTable({
    id: v.optional(v.string()),
    driveId: v.string(),
    studentId: v.string(),
    taggedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_drive", ["driveId"])
    .index("by_student", ["studentId"])
    .index("by_client_id", ["id"]),

  driveInvites: defineTable(v.any())
    .index("by_drive", ["driveId"])
    .index("by_client_id", ["id"]),

  drives: defineTable(v.any())
    .index("by_institute", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  institutionAdmins: defineTable(v.any())
    .index("by_institute", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  institutionDocs: defineTable(v.any())
    .index("by_institute", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  institutionProfiles: defineTable(v.any())
    .index("by_name", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  mentorBookings: defineTable({
    id: v.optional(v.string()),
    slotId: v.string(),
    facultyId: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    topic: v.optional(v.string()),
    status: v.string(),
    bookedAt: v.string(),
  })
    .index("by_slot", ["slotId"])
    .index("by_faculty", ["facultyId"])
    .index("by_student", ["studentId"]),

  mentorNotes: defineTable({
    id: v.optional(v.string()),
    facultyId: v.string(),
    studentId: v.string(),
    note: v.optional(v.string()),
    flag: v.optional(v.string()),
    recommendations: v.optional(v.array(v.any())),
    updatedAt: v.string(),
  })
    .index("by_faculty", ["facultyId"])
    .index("by_student", ["studentId"])
    .index("by_client_id", ["id"]),

  mentorshipRequests: defineTable({
    id: v.optional(v.string()),
    studentId: v.string(),
    studentName: v.optional(v.string()),
    studentDepartment: v.optional(v.string()),
    studentInstitution: v.optional(v.string()),
    facultyId: v.string(),
    facultyName: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.string(), // "Pending" | "Accepted" | "Declined"
    requestedAt: v.string(),
    respondedAt: v.optional(v.union(v.string(), v.null())),
    updatedAt: v.optional(v.string()),
  })
    .index("by_student", ["studentId"])
    .index("by_faculty", ["facultyId"])
    .index("by_client_id", ["id"]),

  mous: defineTable(v.any())
    .index("by_institute", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  notifyBatches: defineTable({
    id: v.optional(v.string()),
    instituteName: v.optional(v.string()),
    institutionId: v.optional(v.string()),
    needsOwner: v.optional(v.boolean()),
    recipients: v.number(),
    message: v.string(),
    from: v.string(),
    sentAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_institute", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  officeHours: defineTable({
    id: v.optional(v.string()),
    facultyId: v.string(),
    slot: v.optional(v.string()),
    day: v.optional(v.string()),
    time: v.optional(v.string()),
    mode: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    capacity: v.optional(v.number()),
    createdAt: v.string(),
    // Calendar blocks need a label and a length to be drawn.
    title: v.optional(v.string()),
    durationMins: v.optional(v.number()),
    notes: v.optional(v.string()),
    audience: v.optional(v.string()),
    /* Online slots with no joining link get pushed back a day at a time and
       cancelled on the third push. Both counters live on the slot so the
       escalation can be replayed from the record itself. */
    linkPushCount: v.optional(v.number()),
    lastPushedAt: v.optional(v.string()),
    cancelledReason: v.optional(v.string()),
  }).index("by_faculty", ["facultyId"]),

  placementHistory: defineTable(v.any())
    .index("by_institute", ["instituteName"])
    .index("by_institution", ["institutionId"])
    .index("by_client_id", ["id"]),

  programFeedback: defineTable({
    id: v.optional(v.string()),
    programId: v.string(),
    userId: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
    submittedAt: v.string(),
  })
    .index("by_program", ["programId"])
    .index("by_user", ["userId"]),

  recruiters: defineTable({
    id: v.optional(v.string()),
    companyOwnerId: v.string(),
    name: v.string(),
    email: v.string(),
    title: v.optional(v.string()),
    accessLevel: v.string(),
    notesVisible: v.optional(v.boolean()),
    addedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_owner", ["companyOwnerId"])
    .index("by_email", ["email"])
    .index("by_client_id", ["id"]),

  /* `file` is a storage reference for an uploaded PDF; `url` a link. */
  researchOutputs: defineTable(v.any())
    .index("by_faculty", ["facultyId"])
    .index("by_client_id", ["id"]),

  studentNotifications: defineTable({
    id: v.optional(v.string()),
    studentId: v.string(), // the recipient — faculty receive rows here too
    batchId: v.optional(v.union(v.string(), v.null())),
    testId: v.optional(v.union(v.string(), v.null())),
    credentialId: v.optional(v.union(v.string(), v.null())),
    slotId: v.optional(v.union(v.string(), v.null())),
    senderId: v.optional(v.string()),
    message: v.string(),
    from: v.string(),
    sentAt: v.string(),
    read: v.boolean(),
    readAt: v.optional(v.union(v.string(), v.null())),
    updatedAt: v.optional(v.string()),
  })
    .index("by_student", ["studentId"])
    .index("by_client_id", ["id"]),

  savedSearches: defineTable({
    id: v.optional(v.string()),
    ownerId: v.string(),
    name: v.string(),
    filters: v.any(),
    savedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_client_id", ["id"]),

  // Certificates a company / institution / faculty member issues to a student.
  // Only the issuer writes these; the student's own portfolio certifications
  // are a separate, self-declared list.
  credentials: defineTable({
    id: v.optional(v.string()),
    studentId: v.string(),
    studentName: v.string(),
    studentEmail: v.optional(v.string()),
    title: v.string(),
    issuer: v.string(),
    issuerId: v.optional(v.string()),
    issuerRole: v.optional(v.string()),
    kind: v.string(),
    testId: v.optional(v.union(v.string(), v.null())),
    score: v.optional(v.union(v.string(), v.null())),
    grade: v.optional(v.union(v.string(), v.null())),
    remarks: v.optional(v.string()),
    certificateNo: v.string(),
    verifyCode: v.optional(v.string()),
    issuedAt: v.string(),
    revokedAt: v.optional(v.union(v.string(), v.null())),
    updatedAt: v.optional(v.string()),
    /* Automatic certificates freeze everything the PDF is drawn from at issue
       time, so a later branding change can never alter an issued record. */
    attemptId: v.optional(v.union(v.string(), v.null())),
    testTitle: v.optional(v.string()),
    scorePercent: v.optional(v.union(v.number(), v.null())),
    snapshot: v.optional(v.any()),
    pdfStorageId: v.optional(v.union(v.id("_storage"), v.null())),
  })
    .index("by_student", ["studentId"])
    .index("by_issuer", ["issuerId"])
    .index("by_client_id", ["id"])
    .index("by_verify_code", ["verifyCode"]),

  savedInternships: defineTable({
    id: v.optional(v.string()),
    studentId: v.string(),
    internshipId: v.string(),
    savedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_student", ["studentId"])
    .index("by_client_id", ["id"]),

  /* Office-hour slots a student has bookmarked but not booked — the mentorship
     equivalent of savedInternships, so "Saved Mentorships" has something real
     behind it rather than being a filtered view of bookings. */
  savedMentorships: defineTable({
    id: v.optional(v.string()),
    studentId: v.string(),
    slotId: v.string(),
    facultyId: v.optional(v.union(v.string(), v.null())),
    snapshot: v.optional(v.any()),
    savedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_student", ["studentId"])
    .index("by_client_id", ["id"]),
});
