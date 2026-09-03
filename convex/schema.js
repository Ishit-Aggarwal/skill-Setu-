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
    openToOpportunities: v.optional(v.boolean()),
    companyName: v.optional(v.string()),
    workEmailDomain: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    avatarDataUrl: v.optional(v.union(v.string(), v.null())),
    employeeId: v.optional(v.string()),
    // Industry/company profile (editable by the company itself).
    companyDomain: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    companyWebsite: v.optional(v.string()),
    hqLocation: v.optional(v.string()),
    companySize: v.optional(v.string()),
    contactPersonName: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    logoDataUrl: v.optional(v.union(v.string(), v.null())),
    verifiedCode: v.optional(v.union(v.string(), v.null())),
    // Set only after the signup OTP has been verified server-side.
    emailVerified: v.optional(v.boolean()),
    verifiedAt: v.optional(v.string()),
    createdAt: v.optional(v.string()),
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
  }).index("by_owner", ["ownerId"]),

  programRegistrations: defineTable({
    programId: v.string(),
    userId: v.string(),
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
    skillBadges: v.optional(v.any()),
    certifications: v.optional(v.array(v.any())),
    timeline: v.optional(v.array(v.any())),
    documents: v.optional(v.array(v.any())),
  }).index("by_student", ["studentId"]),

  collabResponses: defineTable({
    collabId: v.string(),
    response: v.string(),
  }).index("by_collab", ["collabId"]),
});
