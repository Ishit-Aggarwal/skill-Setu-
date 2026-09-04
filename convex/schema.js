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
    avatar: v.optional(v.string()),
    avatarDataUrl: v.optional(v.union(v.string(), v.null())),
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
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  internships: defineTable({
    id: v.optional(v.string()),
    title: v.string(),
    company: v.string(),
    location: v.string(),
    type: v.string(), // "Hybrid" | "Remote" | "Onsite"
    domain: v.string(),
    duration: v.string(),
    stipend: v.string(),
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
    eligibleInstitutions: v.optional(v.array(v.string())),
    recruiterId: v.optional(v.union(v.string(), v.null())),
    recruiterName: v.optional(v.union(v.string(), v.null())),
    manualStatus: v.optional(v.boolean()),
    closedReason: v.optional(v.union(v.string(), v.null())),
    ownerId: v.string(),
    status: v.string(), // "Open" | "Closed"
    postedAt: v.string(),
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
    // Recruiter-only fields — never surfaced to the candidate.
    interviewMode: v.optional(v.string()), // "Physical" | "Online"
    interviewAt: v.optional(v.string()),
    recruiterNotes: v.optional(v.string()),
    // Post-hire tracking: the pipeline doesn't end at "Hired".
    offerStage: v.optional(v.string()),
    offerUpdatedAt: v.optional(v.string()),
    offerAmount: v.optional(v.string()),
    offerNotes: v.optional(v.string()),
    joiningDate: v.optional(v.string()),
  })
    .index("by_internship", ["internshipId"])
    .index("by_student", ["studentId"]),

  programs: defineTable({
    id: v.optional(v.string()),
    title: v.string(),
    organiser: v.string(),
    dates: v.string(),
    seats: v.number(),
    enrolled: v.number(),
    mode: v.string(),
    ownerId: v.string(),
    status: v.string(),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
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
  }).index("by_owner", ["ownerId"]),

  skillTestRegistrations: defineTable({
    testId: v.string(),
    userId: v.string(),
    paymentStatus: v.optional(v.string()),
    missedRecorded: v.optional(v.boolean()),
    attended: v.optional(v.boolean()),
    registeredAt: v.string(),
    slot: v.optional(v.string()),
    paid: v.optional(v.boolean()),
  })
    .index("by_test", ["testId"])
    .index("by_user", ["userId"]),

  assessmentAttempts: defineTable({
    studentId: v.string(),
    testId: v.string(),
    domain: v.string(),
    score: v.number(),
    weight: v.number(),
    missed: v.boolean(),
    completedAt: v.string(),
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

  portfolios: defineTable({
    studentId: v.string(),
    bio: v.optional(v.string()),
    headline: v.optional(v.string()),
    location: v.optional(v.string()),
    links: v.optional(v.any()),
    skillBadges: v.optional(v.any()),
    certifications: v.optional(v.array(v.any())),
    projects: v.optional(v.array(v.any())),
    education: v.optional(v.array(v.any())),
    achievements: v.optional(v.array(v.any())),
    timeline: v.optional(v.array(v.any())),
    documents: v.optional(v.array(v.any())),
  }).index("by_student", ["studentId"]),

  collabResponses: defineTable({
    collabId: v.string(),
    response: v.string(),
  }).index("by_collab", ["collabId"]),

  activityLog: defineTable({
    id: v.optional(v.string()),
    scope: v.string(),
    actor: v.string(),
    action: v.string(),
    detail: v.optional(v.string()),
    at: v.string(),
  }).index("by_scope", ["scope"]),

  advisees: defineTable({
    id: v.optional(v.string()),
    facultyId: v.string(),
    studentId: v.string(),
    since: v.string(),
  })
    .index("by_faculty", ["facultyId"])
    .index("by_student", ["studentId"]),

  announcements: defineTable({
    id: v.optional(v.string()),
    instituteName: v.string(),
    title: v.string(),
    body: v.string(),
    target: v.optional(v.string()),
    department: v.optional(v.string()),
    author: v.optional(v.string()),
    postedAt: v.string(),
  }).index("by_institute", ["instituteName"]),

  collabFiles: defineTable({
    id: v.optional(v.string()),
    collabId: v.string(),
    name: v.string(),
    size: v.optional(v.string()),
    url: v.optional(v.string()),
    uploadedBy: v.optional(v.string()),
    uploadedAt: v.string(),
  }).index("by_collab", ["collabId"]),

  collabInterests: defineTable({
    id: v.optional(v.string()),
    listingId: v.string(),
    userId: v.string(),
    name: v.optional(v.string()),
    institution: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.string(),
    at: v.string(),
  })
    .index("by_listing", ["listingId"])
    .index("by_user", ["userId"]),

  collabListings: defineTable({
    id: v.optional(v.string()),
    ownerId: v.string(),
    ownerName: v.string(),
    title: v.string(),
    domain: v.optional(v.string()),
    departments: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    status: v.string(),
    createdAt: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),

  collabMessages: defineTable({
    id: v.optional(v.string()),
    collabId: v.string(),
    author: v.string(),
    body: v.string(),
    at: v.string(),
  }).index("by_collab", ["collabId"]),

  collabMilestones: defineTable({
    id: v.optional(v.string()),
    collabId: v.string(),
    title: v.string(),
    due: v.optional(v.string()),
    done: v.boolean(),
    createdAt: v.string(),
    completedAt: v.optional(v.union(v.string(), v.null())),
  }).index("by_collab", ["collabId"]),

  companyReviews: defineTable({
    id: v.optional(v.string()),
    company: v.string(),
    authorName: v.optional(v.string()),
    role: v.optional(v.string()),
    rating: v.number(),
    pros: v.optional(v.string()),
    cons: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_company", ["company"]),

  driveEligibility: defineTable({
    id: v.optional(v.string()),
    driveId: v.string(),
    studentId: v.string(),
    taggedAt: v.string(),
  })
    .index("by_drive", ["driveId"])
    .index("by_student", ["studentId"]),

  driveInvites: defineTable({
    id: v.optional(v.string()),
    driveId: v.string(),
    company: v.string(),
    contactEmail: v.optional(v.string()),
    roleOffered: v.optional(v.string()),
    stipend: v.optional(v.string()),
    rsvp: v.string(),
    invitedAt: v.string(),
    rsvpAt: v.optional(v.string()),
  }).index("by_drive", ["driveId"]),

  drives: defineTable({
    id: v.optional(v.string()),
    instituteName: v.string(),
    title: v.string(),
    date: v.string(),
    venue: v.optional(v.string()),
    status: v.string(),
    eligibleBatches: v.optional(v.array(v.string())),
    createdAt: v.string(),
  }).index("by_institute", ["instituteName"]),

  institutionAdmins: defineTable({
    id: v.optional(v.string()),
    instituteName: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    designation: v.optional(v.string()),
    status: v.string(),
    addedAt: v.string(),
  })
    .index("by_institute", ["instituteName"])
    .index("by_email", ["email"]),

  institutionProfiles: defineTable({
    id: v.optional(v.string()),
    instituteName: v.string(),
    code: v.optional(v.string()),
    instituteType: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    naacGrade: v.optional(v.string()),
    nirfRank: v.optional(v.string()),
    departments: v.optional(v.array(v.string())),
    placementPolicy: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
  }).index("by_name", ["instituteName"]),

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
    .index("by_student", ["studentId"]),

  mous: defineTable({
    id: v.optional(v.string()),
    instituteName: v.string(),
    partnerName: v.string(),
    partnerType: v.optional(v.string()),
    signedOn: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    status: v.optional(v.string()),
    scopes: v.optional(v.array(v.string())),
    contactPerson: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    timeline: v.optional(v.array(v.any())),
    createdAt: v.string(),
  }).index("by_institute", ["instituteName"]),

  notifyBatches: defineTable({
    id: v.optional(v.string()),
    instituteName: v.string(),
    recipients: v.number(),
    message: v.string(),
    from: v.string(),
    sentAt: v.string(),
  }).index("by_institute", ["instituteName"]),

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
  }).index("by_faculty", ["facultyId"]),

  placementHistory: defineTable({
    id: v.optional(v.string()),
    instituteName: v.string(),
    batch: v.union(v.string(), v.number()),
    department: v.string(),
    students: v.number(),
    placed: v.number(),
    medianStipend: v.optional(v.number()),
    topRecruiter: v.optional(v.string()),
  }).index("by_institute", ["instituteName"]),

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
  })
    .index("by_owner", ["companyOwnerId"])
    .index("by_email", ["email"]),

  researchOutputs: defineTable({
    id: v.optional(v.string()),
    facultyId: v.string(),
    title: v.string(),
    type: v.string(),
    journalOrConference: v.optional(v.string()),
    year: v.optional(v.string()),
    doi: v.optional(v.string()),
    url: v.optional(v.string()),
    collaborators: v.optional(v.array(v.string())),
    addedAt: v.string(),
  }).index("by_faculty", ["facultyId"]),

  studentNotifications: defineTable({
    id: v.optional(v.string()),
    studentId: v.string(),
    batchId: v.optional(v.string()),
    message: v.string(),
    from: v.string(),
    sentAt: v.string(),
    read: v.boolean(),
    readAt: v.optional(v.string()),
  }).index("by_student", ["studentId"]),

  savedSearches: defineTable({
    id: v.optional(v.string()),
    ownerId: v.string(),
    name: v.string(),
    filters: v.any(),
    savedAt: v.string(),
  }).index("by_owner", ["ownerId"]),

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
  })
    .index("by_student", ["studentId"])
    .index("by_issuer", ["issuerId"]),

  savedInternships: defineTable({
    id: v.optional(v.string()),
    studentId: v.string(),
    internshipId: v.string(),
    savedAt: v.string(),
  }).index("by_student", ["studentId"]),
});
