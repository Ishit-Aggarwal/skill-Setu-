import { mutation } from "./_generated/server";

/**
 * Server-side seeding for a fresh Convex deployment. Mirrors the demo content
 * the browser store seeds locally — an all-industry cross-sector mix with
 * comprehensive depth across engineering, technology, management, sciences,
 * law, agriculture and healthcare — with no single field weighted above the rest.
 *
 * Run once with: npx convex run seed:seedDatabase
 */

const DEMO_INSTITUTION = "Apex University of Technology & Applied Sciences";

/* A balanced cross-sector sample: roughly two openings per cluster, none of
   them from a single dominant field. Stipends are stored as a number plus a
   mode so the UI can render "/month" or "total for the duration" itself. */
const SEED_INTERNSHIPS = [
  { title: "Software Development Intern", company: "Meridian Software Labs", location: "Bengaluru", type: "Hybrid", domain: "Information Technology & Software", duration: "6 months", stipendAmount: 35000, stipendMode: "monthly", tags: ["React", "Node.js", "SQL"], deadline: "2026-10-18", description: "Ship features end-to-end on a production web platform alongside a full engineering pod.", color: "#3C5A8A", hot: true },
  { title: "Data Science Intern", company: "Anvaya Analytics", location: "Hyderabad", type: "Remote", domain: "Data Science & AI", duration: "4 months", stipendAmount: 30000, stipendMode: "monthly", tags: ["Python", "Machine Learning", "Data Visualisation"], deadline: "2026-10-25", description: "Build forecasting models and dashboards for retail and logistics clients.", color: "#5A3C8A", hot: true },
  { title: "Network Engineering Intern", company: "Skylink Telecom Services", location: "Gurugram", type: "Onsite", domain: "Telecommunications & Networking", duration: "6 months", stipendAmount: 132000, stipendMode: "total", tags: ["Networking", "Linux", "Troubleshooting"], deadline: "2026-11-08", description: "Support core network monitoring, fault triage and capacity reporting for a regional backbone.", color: "#3C5A8A", hot: false },
  { title: "Mechanical Design Intern", company: "Shakti Motors Ltd.", location: "Pune", type: "Onsite", domain: "Manufacturing & Core Engineering", duration: "5 months", stipendAmount: 22000, stipendMode: "monthly", tags: ["AutoCAD", "SolidWorks", "GD&T"], deadline: "2026-11-05", description: "Support component tolerancing, prototype validation and design-for-manufacture reviews.", color: "#8A4A3C", hot: false },
  { title: "Site Engineering Intern", company: "Girija Infra Projects", location: "Ahmedabad", type: "Onsite", domain: "Civil & Infrastructure", duration: "6 months", stipendAmount: 19000, stipendMode: "monthly", tags: ["AutoCAD", "Quantity Surveying", "Site Supervision"], deadline: "2026-11-15", description: "Assist site engineers on quantity take-offs, quality checks and daily progress reporting.", color: "#7A6A3C", hot: false },
  { title: "Renewable Energy Analyst Intern", company: "Voltaire Grid Energy Pvt. Ltd.", location: "Jaipur", type: "Hybrid", domain: "Energy & Sustainability", duration: "4 months", stipendAmount: 21000, stipendMode: "monthly", tags: ["Excel", "Data Analysis", "Sustainability Reporting"], deadline: "2026-11-19", description: "Model generation data for a solar portfolio and prepare monthly performance reviews.", color: "#3C8A5A", hot: false },
  { title: "Financial Analyst Intern", company: "Meghdoot Capital Advisors", location: "Mumbai", type: "Hybrid", domain: "Banking, Finance & Insurance", duration: "3 months", stipendAmount: 28000, stipendMode: "monthly", tags: ["Financial Modelling", "Excel", "Risk Analysis"], deadline: "2026-11-12", description: "Build valuation models and credit assessments for mid-market corporate clients.", color: "#3C4A8A", hot: false },
  { title: "Legal Research Intern", company: "Lexis Partners LLP", location: "New Delhi", type: "Hybrid", domain: "Legal & Compliance", duration: "3 months", stipendAmount: 45000, stipendMode: "total", tags: ["Legal Research", "Drafting", "Documentation"], deadline: "2026-11-26", description: "Research case law and draft first-cut notes for the corporate advisory practice.", color: "#506030", hot: false },
  { title: "Digital Marketing Intern", company: "Prakash Consumer Brands", location: "Remote", type: "Remote", domain: "Marketing & Advertising", duration: "3 months", stipendAmount: 18000, stipendMode: "monthly", tags: ["SEO", "Content Strategy", "Market Research"], deadline: "2026-11-28", description: "Plan and measure digital campaigns across a portfolio of consumer brands.", color: "#8A703C", hot: false },
  { title: "Supply Chain Operations Intern", company: "Kaveri Logistics Network", location: "Chennai", type: "Onsite", domain: "Supply Chain & Logistics", duration: "4 months", stipendAmount: 20000, stipendMode: "monthly", tags: ["Supply Chain", "Excel", "Process Improvement"], deadline: "2026-12-04", description: "Work with the operations team to optimise warehousing and last-mile delivery workflows.", color: "#3C7C6B", hot: false },
  { title: "Guest Experience Intern", company: "Sanjeevani Hotels & Resorts", location: "Udaipur", type: "Onsite", domain: "Hospitality, Travel & Tourism", duration: "3 months", stipendAmount: 42000, stipendMode: "total", tags: ["Hospitality Management", "Communication", "Operations"], deadline: "2026-12-06", description: "Rotate through front office, F&B and guest relations, owning one service-improvement project.", color: "#8A3C6B", hot: false },
  { title: "Product Design Intern", company: "Indigo Studio", location: "Bengaluru", type: "Hybrid", domain: "Design & Creative", duration: "4 months", stipendAmount: 25000, stipendMode: "monthly", tags: ["Figma", "User Research", "Prototyping"], deadline: "2026-11-22", description: "Design and user-test flows for a consumer product used across India.", color: "#8A3C6B", hot: true },
  { title: "Editorial & Content Intern", company: "Northline Media Network", location: "Mumbai", type: "Hybrid", domain: "Media & Communications", duration: "3 months", stipendAmount: 17000, stipendMode: "monthly", tags: ["Writing", "Editorial", "Research Methodology"], deadline: "2026-12-09", description: "Research, write and fact-check long-form pieces for the business desk.", color: "#6B3C5A", hot: false },
  { title: "Hospital Administration Intern", company: "Arogya Multispecialty Hospital", location: "Jaipur", type: "Onsite", domain: "Healthcare & Hospital Administration", duration: "4 months", stipendAmount: 16000, stipendMode: "monthly", tags: ["Clinical Documentation", "Process Improvement", "Communication"], deadline: "2026-12-11", description: "Support patient-flow analysis, NABH documentation and departmental coordination.", color: "#2E93A5", hot: false },
  { title: "Biotech Research Intern", company: "Nucleus Biosciences", location: "Hyderabad", type: "Onsite", domain: "Pharmaceuticals & Biotechnology", duration: "6 months", stipendAmount: 24000, stipendMode: "monthly", tags: ["Research Methodology", "Quality Control", "Biostatistics"], deadline: "2026-12-18", description: "Assist on formulation stability studies and analytical method development.", color: "#3C6B8A", hot: false },
  { title: "Clinical Data Intern", company: "Council for Scientific Research", location: "New Delhi", type: "Hybrid", domain: "Research & Development", duration: "6 months", stipendAmount: 22000, stipendMode: "monthly", tags: ["Good Clinical Practice", "Clinical Documentation", "Biostatistics"], deadline: "2026-10-05", description: "Support a multi-centre study — CRF design, site monitoring and data cleaning.", color: "#6B3C8A", hot: true },
  { title: "Health Informatics Intern", company: "Gridline Digital Health Labs", location: "Remote", type: "Remote", domain: "Digital Health & Health Informatics", duration: "3 months", stipendAmount: 20000, stipendMode: "monthly", tags: ["Digital Health Records", "Teleconsultation", "Biostatistics"], deadline: "2026-12-15", description: "Map clinical terminology to interoperability standards and build reporting dashboards.", color: "#3C4A8A", hot: false },
  { title: "Public Policy Research Intern", company: "Centre for Development Policy", location: "New Delhi", type: "Hybrid", domain: "Government & Public Policy", duration: "3 months", stipendAmount: 19000, stipendMode: "monthly", tags: ["Public Health", "Research Methodology", "Presentations"], deadline: "2026-12-22", description: "Support evidence reviews and state-level briefs on health and skilling programmes.", color: "#4A5A6B", hot: false },
  { title: "Agri-Business Analyst Intern", company: "Harvest Valley Agritech", location: "Nashik", type: "Onsite", domain: "Agriculture & Agri-business", duration: "4 months", stipendAmount: 15000, stipendMode: "monthly", tags: ["Data Analysis", "Supply Chain", "Field Research"], deadline: "2026-12-02", description: "Analyse procurement and yield data across a farmer-producer network.", color: "#7E9638", hot: false },
  { title: "Quality Assurance Intern", company: "Precision Instruments India", location: "Coimbatore", type: "Onsite", domain: "Quality Control & Regulatory Affairs", duration: "5 months", stipendAmount: 80000, stipendMode: "total", tags: ["Quality Control", "Process Improvement", "Documentation"], deadline: "2026-10-28", description: "Run incoming-material inspection and maintain the calibration and non-conformance registers.", color: "#506030", hot: false },
];

const SEED_PROGRAMS = [
  { title: "Applied Generative AI & Deep Learning Systems", organiser: "Indian Institute of Technology, Delhi", startDate: "2026-10-06", endDate: "2026-10-10", seats: 40, enrolled: 18, mode: "Hybrid" },
  { title: "Data Analytics & Business Intelligence for Faculty", organiser: "Nalanda School of Management, Bengaluru", startDate: "2026-10-20", endDate: "2026-10-24", seats: 30, enrolled: 22, mode: "Online" },
  { title: "GMP & Quality Systems for Manufacturing", organiser: "Sardar Institute of Technology, Pune", startDate: "2026-11-03", endDate: "2026-11-07", seats: 50, enrolled: 27, mode: "Online" },
  { title: "Precision Manufacturing, Robotics & Automation", organiser: "National Institute of Technology, Trichy", startDate: "2026-11-17", endDate: "2026-11-21", seats: 35, enrolled: 12, mode: "Hybrid" },
  { title: "Applied Machine Learning for Educators", organiser: "Sardar Institute of Technology, Pune", startDate: "2026-11-24", endDate: "2026-11-28", seats: 45, enrolled: 20, mode: "Online" },
  { title: "Outcome-Based Education & NBA Accreditation Readiness", organiser: "Nalanda School of Management, Bengaluru", startDate: "2026-12-01", endDate: "2026-12-03", seats: 60, enrolled: 31, mode: "Online" },
  { title: "Health Informatics: EHR & Interoperability Standards", organiser: "Coastal University of Science & Design, Kochi", startDate: "2026-12-15", endDate: "2026-12-17", seats: 55, enrolled: 24, mode: "Hybrid" },
];

const SEED_SKILL_TESTS = [
  {
    title: "General Aptitude Screening",
    domain: "Quantitative Aptitude",
    hostName: "Meridian Software Labs",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-09-30",
    scheduledTime: "10:30",
    description: "The standard placement-style aptitude screen used across sectors.",
    prerequisites: "Class 10 level arithmetic, percentages and averages.",
    certification: "Meridian Aptitude Readiness Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No calculators, phones, or external notes are allowed.",
    ],
  },
  {
    title: "Programming Fundamentals Quiz",
    domain: "Programming & Digital Fundamentals",
    hostName: "Anvaya Analytics",
    mode: "Online",
    duration: "15 mins",
    price: 199,
    scheduledAt: "2026-10-07",
    scheduledTime: "16:00",
    description: "Core CS fundamentals: data structures, complexity, databases and web basics.",
    prerequisites: "An introductory course in programming or data structures.",
    certification: "Anvaya Programming Fundamentals Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No IDEs, compilers, or AI assistants may be used during the quiz.",
    ],
  },
  {
    title: "Health & Life Sciences Screening",
    domain: "Health & Life Sciences",
    hostName: "Arogya Multispecialty Hospital",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-10-02",
    scheduledTime: "10:00",
    description: "Human physiology, laboratory practice, epidemiology basics and clinical reasoning.",
    prerequisites: "First-year biology or health-sciences coursework.",
    certification: "Arogya Health Sciences Readiness Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No notes, phones, or external references are allowed.",
    ],
  },
  {
    title: "Design & Visual Thinking Assessment",
    domain: "Design & Visual Thinking",
    hostName: "Indigo Studio",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-10-09",
    scheduledTime: "14:00",
    description: "Layout, hierarchy, accessibility and the research practices behind a usable interface.",
    prerequisites: "Any foundation design or visual communication coursework.",
    certification: "Indigo Design Fundamentals Badge",
    rules: [
      "Ensure a stable internet connection before joining.",
      "Keep your camera on for the full duration.",
      "Switching browser tabs during the test may flag your attempt for review.",
    ],
  },
  {
    title: "Applied Data Analysis Test",
    domain: "Data Analysis & Interpretation",
    hostName: "Anvaya Analytics",
    mode: "Online",
    duration: "15 mins",
    price: 99,
    scheduledAt: "2026-10-14",
    scheduledTime: "09:00",
    description: "Descriptive statistics, chart reading, data cleaning judgement and interpretation.",
    prerequisites: "Comfort with spreadsheets and introductory statistics.",
    certification: "Anvaya Data Analysis Proficiency Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "Reference books are not permitted.",
    ],
  },
  {
    title: "Research Methodology & Documentation Quiz",
    domain: "Research & Documentation",
    hostName: "Council for Scientific Research",
    mode: "Online",
    duration: "15 mins",
    price: 199,
    scheduledAt: "2026-10-21",
    scheduledTime: "11:00",
    description: "Study design, consent, ethics review, citation practice and basic statistics.",
    prerequisites: "An introductory research-methodology course.",
    certification: "CSR Research Fundamentals Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No AI assistants or search engines may be used during the quiz.",
    ],
  },
  {
    title: "Client Communication & Group Discussion Round",
    domain: "Business & Professional Dynamics",
    hostName: "Meghdoot Capital Advisors",
    mode: "Offline",
    duration: "60 mins",
    price: 499,
    scheduledAt: "2026-10-28",
    reportingTime: "09:30 AM (session starts 10:00 AM sharp)",
    venue: "Meghdoot Learning Centre, Lower Parel, Mumbai",
    description: "In-person client role-play and group discussion for shortlisted candidates.",
    prerequisites: "Comfortable presenting in Hindi or English.",
    certification: "Meghdoot Professional Communication Certificate",
    documentsRequired: ["Government-issued photo ID", "Printed resume (2 copies)", "Printout of the registration confirmation"],
    rules: [
      "Report at least 30 minutes before the session start time.",
      "Formal professional attire is expected.",
      "Electronic devices must be switched off and submitted at the entrance.",
    ],
  },
];

export const seedDatabase = mutation({
  handler: async (ctx) => {
    const existingInternships = await ctx.db.query("internships").first();
    if (!existingInternships) {
      for (const item of SEED_INTERNSHIPS) {
        await ctx.db.insert("internships", {
          ...item,
          ownerId: "seed",
          status: "Open",
          postedAt: new Date().toISOString(),
          views: 0,
          uniqueViews: 0,
        });
      }
    }

    const existingPrograms = await ctx.db.query("programs").first();
    if (!existingPrograms) {
      for (const p of SEED_PROGRAMS) {
        await ctx.db.insert("programs", { ...p, ownerId: "seed", status: "Open" });
      }
    }

    const existingTests = await ctx.db.query("skillTests").first();
    if (!existingTests) {
      for (const t of SEED_SKILL_TESTS) {
        await ctx.db.insert("skillTests", {
          ...t,
          ownerId: "seed",
          status: "Open",
          postedAt: new Date().toISOString(),
        });
      }
    }

    const demoStudent = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo.student@setu.dev"))
      .first();

    if (!demoStudent) {
      await ctx.db.insert("users", {
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

      await ctx.db.insert("assessments", {
        studentId: "demo-student",
        domainScores: {
          "Quantitative Aptitude": 84,
          "Logical Reasoning": 88,
          "Verbal Communication": 82,
          "Programming & Digital Fundamentals": 92,
          "Problem Solving & Critical Thinking": 86,
          "Business & Professional Dynamics": 78,
          "Data Analysis & Interpretation": 85,
          "Research & Documentation": 74,
        },
        overallScore: 84,
        strongTags: ["Programming & Digital Fundamentals", "Problem Solving & Critical Thinking", "Logical Reasoning"],
        updatedAt: new Date().toISOString(),
      });

      await ctx.db.insert("portfolios", {
        studentId: "demo-student",
        bio: "Final-year Computer Science & Engineering undergraduate focused on scalable full-stack architecture, distributed cloud systems, and applied AI.",
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
        documents: [],
      });
    }

    const demoIndustry = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo.industry@setu.dev"))
      .first();

    if (!demoIndustry) {
      await ctx.db.insert("users", {
        id: "demo-industry",
        email: "demo.industry@setu.dev",
        passwordHash: null,
        role: "industry",
        name: "Rakesh Menon",
        companyName: "Apex Global Technologies & Innovations",
        companyDomain: "Enterprise Software & Cloud Platforms",
        companyDescription:
          "A premier engineering enterprise delivering high-performance cloud architectures, enterprise analytics, intelligent automation, and scalable cross-sector software platforms across global markets.",
        hqLocation: "Bengaluru, Karnataka",
        companySize: "501-1000",
        whyWorkWithUs:
          "Interns gain production codebase ownership from week two, work directly with staff engineers on distributed cloud architectures, and participate in cross-functional product design sprints.",
        workEmailDomain: "@apextechnologies.in",
        verifiedCode: "APEX-IND-2026",
        emailVerified: true,
        createdAt: new Date().toISOString(),
      });
    }

    const demoAcademician = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo.academician@setu.dev"))
      .first();

    if (!demoAcademician) {
      await ctx.db.insert("users", {
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
        researchInterests: [
          "Computational Biology & Standardisation",
          "Natural Product Genomics",
          "Translational Research Protocols",
        ],
        orcid: "0000-0002-1825-0097",
        verifiedCode: "APEX-FAC-2026",
        emailVerified: true,
        createdAt: new Date().toISOString(),
      });
    }

    const demoInstitution = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo.institution@setu.dev"))
      .first();

    if (!demoInstitution) {
      await ctx.db.insert("users", {
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
    }

    return { success: true, message: "Cross-industry national demo data seeded successfully." };
  },
});
