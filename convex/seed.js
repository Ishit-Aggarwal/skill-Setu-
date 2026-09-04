import { mutation } from "./_generated/server";

/**
 * Server-side seeding for a fresh Convex deployment. Mirrors the demo content
 * the browser store seeds locally — an all-industry cross-sector mix with
 * comprehensive depth across engineering, technology, management, sciences,
 * and traditional disciplines.
 *
 * Run once with: npx convex run seed:seedDatabase
 */

const DEMO_INSTITUTION = "Apex University of Technology & Applied Sciences";

const SEED_INTERNSHIPS = [
  { title: "Ayurvedic Formulation Intern", company: "Himadri Ayurveda Pharmaceuticals Ltd.", location: "Haridwar", type: "Onsite", domain: "Ayush Pharmaceuticals & Nutraceuticals", duration: "6 months", stipend: "₹18,000/mo", tags: ["Dravyaguna", "GMP Compliance", "Quality Control"], deadline: "2026-10-12", description: "Work with the formulation team on classical and proprietary Ayurvedic preparations, from raw-material intake through batch release.", color: "#3C6B8A", hot: true },
  { title: "Panchakarma Therapist Trainee", company: "Kaveri Ayurvedic Wellness Group", location: "Palakkad", type: "Onsite", domain: "Panchakarma & Wellness Therapy", duration: "4 months", stipend: "₹15,000/mo", tags: ["Panchakarma Protocols", "Patient Counselling", "Diet & Nutrition"], deadline: "2026-10-20", description: "Assist senior therapists across Snehana, Swedana and Basti procedures in a 60-bed Panchakarma facility.", color: "#8A4A3C", hot: true },
  { title: "Clinical Research Associate Intern", company: "Council for Ayurvedic Sciences Research", location: "New Delhi", type: "Hybrid", domain: "Ayush Clinical Research", duration: "6 months", stipend: "₹22,000/mo", tags: ["Good Clinical Practice", "Clinical Documentation", "Biostatistics"], deadline: "2026-10-05", description: "Support a multi-centre trial on Ayurvedic management of metabolic syndrome — CRF design, site monitoring and data cleaning.", color: "#6B3C8A", hot: true },
  { title: "Yoga Therapist Intern", company: "Prakriti Yoga & Naturopathy Institute", location: "Bengaluru", type: "Onsite", domain: "Yoga & Naturopathy", duration: "3 months", stipend: "₹12,000/mo", tags: ["Yoga Therapy", "Patient Counselling", "Diet & Nutrition"], deadline: "2026-11-02", description: "Deliver therapeutic yoga modules for lifestyle-disorder patients under supervision, and track outcome measures.", color: "#3C8A6B", hot: false },
  { title: "Quality Control Intern — Herbal Raw Material", company: "Vanaushadhi Botanicals Pvt. Ltd.", location: "Nagpur", type: "Onsite", domain: "Quality Control & Regulatory Affairs", duration: "5 months", stipend: "₹16,000/mo", tags: ["HPTLC", "Quality Control", "Pharmacognosy"], deadline: "2026-10-28", description: "Run identity, purity and assay testing on incoming botanicals and maintain the reference herbarium.", color: "#6B7C3C", hot: false },
  { title: "Wellness Programme Coordinator Intern", company: "Sanjeevani Wellness Retreats", location: "Rishikesh", type: "Onsite", domain: "Wellness Tourism & Spa Management", duration: "3 months", stipend: "₹14,000/mo", tags: ["Spa Operations", "Patient Counselling", "Hospitality Management"], deadline: "2026-11-10", description: "Design and run guest wellness itineraries combining Ayurveda consultations, yoga and therapeutic diets.", color: "#8A3C6B", hot: false },
  { title: "Unani Pharmacy Intern", company: "Hakeem Unani Laboratories", location: "Hyderabad", type: "Onsite", domain: "Unani Medicine", duration: "4 months", stipend: "₹13,000/mo", tags: ["Unani Pharmacopoeia", "GMP Compliance", "Inventory Management"], deadline: "2026-11-18", description: "Assist in preparation of classical Unani dosage forms and maintain batch manufacturing records.", color: "#3C5A8A", hot: false },
  { title: "Homeopathic Clinical Intern", company: "Arogya Homeopathic Clinics", location: "Mumbai", type: "Hybrid", domain: "Homeopathy", duration: "6 months", stipend: "₹12,000/mo", tags: ["Case Taking", "Patient Counselling", "Clinical Documentation"], deadline: "2026-11-25", description: "Take and repertorise chronic cases across a five-clinic network, with weekly supervision.", color: "#5A3C8A", hot: false },
  { title: "Siddha Research Intern", company: "Agasthiyar Siddha Research Foundation", location: "Chennai", type: "Onsite", domain: "Siddha Medicine", duration: "5 months", stipend: "₹15,000/mo", tags: ["Siddha Formulations", "Research Methodology", "Clinical Documentation"], deadline: "2026-12-01", description: "Support literature review and standardisation work on classical Siddha formulations.", color: "#8A703C", hot: false },
  { title: "Ayush Public Health Intern", company: "State Ayush Mission Cell, Madhya Pradesh", location: "Bhopal", type: "Hybrid", domain: "Ayush Public Health & Administration", duration: "4 months", stipend: "₹17,000/mo", tags: ["Public Health", "Epidemiology", "Clinical Documentation"], deadline: "2026-12-08", description: "Assist the state cell with Ayush health-and-wellness-centre monitoring and programme reporting.", color: "#4A6B3C", hot: false },
  { title: "Ayush Informatics Intern", company: "AyushGrid Digital Health Labs", location: "Remote", type: "Remote", domain: "Digital Health & Health Informatics", duration: "3 months", stipend: "₹20,000/mo", tags: ["Digital Health Records", "Teleconsultation", "Biostatistics"], deadline: "2026-12-15", description: "Map clinical terminology to NAMASTE codes and help build teleconsultation reporting dashboards.", color: "#3C4A8A", hot: true },
  { title: "Ayush Diagnostics Lab Intern", company: "Nirmal Ayush Diagnostics", location: "Pune", type: "Onsite", domain: "Ayush Diagnostics & Lab Sciences", duration: "4 months", stipend: "₹14,000/mo", tags: ["Quality Control", "Clinical Documentation", "Pharmacognosy"], deadline: "2026-12-20", description: "Run routine diagnostics supporting Ayush hospitals, including Prakriti-linked biomarker studies.", color: "#3C7C6B", hot: false },

  /* Cross-sector openings — the platform is not limited to one field. */
  { title: "Software Development Intern", company: "Meridian Software Labs", location: "Bengaluru", type: "Hybrid", domain: "Information Technology & Software", duration: "6 months", stipend: "₹35,000/mo", tags: ["React", "Node.js", "SQL"], deadline: "2026-10-18", description: "Ship features end-to-end on a production web platform alongside a full engineering pod.", color: "#3C5A8A", hot: true },
  { title: "Data Science Intern", company: "Anvaya Analytics", location: "Hyderabad", type: "Remote", domain: "Data Science & AI", duration: "4 months", stipend: "₹30,000/mo", tags: ["Python", "Machine Learning", "Data Visualisation"], deadline: "2026-10-25", description: "Build forecasting models and dashboards for retail and healthcare clients.", color: "#5A3C8A", hot: true },
  { title: "Mechanical Design Intern", company: "Shakti Motors Ltd.", location: "Pune", type: "Onsite", domain: "Manufacturing & Core Engineering", duration: "5 months", stipend: "₹22,000/mo", tags: ["AutoCAD", "SolidWorks", "GD&T"], deadline: "2026-11-05", description: "Support component tolerancing, prototype validation and design-for-manufacture reviews.", color: "#8A4A3C", hot: false },
  { title: "Financial Analyst Intern", company: "Meghdoot Capital Advisors", location: "Mumbai", type: "Hybrid", domain: "Banking, Finance & Insurance", duration: "3 months", stipend: "₹28,000/mo", tags: ["Financial Modelling", "Excel", "Risk Analysis"], deadline: "2026-11-12", description: "Build valuation models and credit assessments for mid-market corporate clients.", color: "#3C4A8A", hot: false },
  { title: "Product Design Intern", company: "Indigo Studio", location: "Bengaluru", type: "Hybrid", domain: "Design & Creative", duration: "4 months", stipend: "₹25,000/mo", tags: ["Figma", "User Research", "Prototyping"], deadline: "2026-11-22", description: "Design and user-test flows for a consumer product used across India.", color: "#8A3C6B", hot: false },
  { title: "Digital Marketing Intern", company: "Prakash Consumer Brands", location: "Remote", type: "Remote", domain: "Marketing & Advertising", duration: "3 months", stipend: "₹18,000/mo", tags: ["SEO", "Content Strategy", "Market Research"], deadline: "2026-11-28", description: "Plan and measure digital campaigns across a portfolio of consumer brands.", color: "#8A703C", hot: false },
  { title: "Supply Chain Operations Intern", company: "Kaveri Logistics Network", location: "Chennai", type: "Onsite", domain: "Supply Chain & Logistics", duration: "4 months", stipend: "₹20,000/mo", tags: ["Supply Chain", "Excel", "Process Improvement"], deadline: "2026-12-04", description: "Work with the operations team to optimise warehousing and last-mile delivery workflows.", color: "#3C7C6B", hot: false },
  { title: "Hospital Administration Intern", company: "Arogya Multispecialty Hospital", location: "Jaipur", type: "Onsite", domain: "Healthcare & Hospital Administration", duration: "4 months", stipend: "₹16,000/mo", tags: ["Clinical Documentation", "Process Improvement", "Communication"], deadline: "2026-12-11", description: "Support patient-flow analysis, NABH documentation and departmental coordination.", color: "#2E93A5", hot: false },
  { title: "Biotech Research Intern", company: "Nucleus Biosciences", location: "Hyderabad", type: "Onsite", domain: "Pharmaceuticals & Biotechnology", duration: "6 months", stipend: "₹24,000/mo", tags: ["Research Methodology", "Quality Control", "Biostatistics"], deadline: "2026-12-18", description: "Assist on formulation stability studies and analytical method development.", color: "#3C6B8A", hot: false },
  { title: "Public Policy Research Intern", company: "Centre for Development Policy", location: "New Delhi", type: "Hybrid", domain: "Government & Public Policy", duration: "3 months", stipend: "₹19,000/mo", tags: ["Public Health", "Research Methodology", "Presentations"], deadline: "2026-12-22", description: "Support evidence reviews and state-level briefs on health and skilling programmes.", color: "#4A5A6B", hot: false },
];

const SEED_PROGRAMS = [
  { title: "Evidence-Based Ayurveda: Research Methodology for Faculty", organiser: "All India Institute of Integrated Ayush, New Delhi", dates: "Oct 6–10, 2026", seats: 40, enrolled: 18, mode: "Hybrid" },
  { title: "Advances in Panchakarma Standardisation", organiser: "Institute of Ayurvedic Teaching & Research, Jamnagar", dates: "Oct 20–24, 2026", seats: 30, enrolled: 22, mode: "Onsite" },
  { title: "GMP & Quality Systems for Pharmaceutical Manufacturing", organiser: "Deccan College of Unani Medicine, Hyderabad", dates: "Nov 3–7, 2026", seats: 50, enrolled: 27, mode: "Online" },
  { title: "Yoga Therapy in Non-Communicable Disease Management", organiser: "Government Yoga & Naturopathy Medical College, Chennai", dates: "Nov 17–21, 2026", seats: 35, enrolled: 12, mode: "Hybrid" },
  { title: "Applied Machine Learning for Educators", organiser: "Sardar Institute of Technology, Pune", dates: "Nov 24–28, 2026", seats: 45, enrolled: 20, mode: "Online" },
  { title: "Outcome-Based Education & NBA Accreditation Readiness", organiser: "Nalanda School of Management, Bengaluru", dates: "Dec 1–3, 2026", seats: 60, enrolled: 31, mode: "Online" },
  { title: "Health Informatics: EHR & NAMASTE Coding Standards", organiser: "Coastal University of Science & Design, Kochi", dates: "Dec 15–17, 2026", seats: 55, enrolled: 24, mode: "Hybrid" },
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
    title: "Ayurveda & Panchakarma Screening",
    domain: "Ayurveda & Panchakarma",
    hostName: "Himadri Ayurveda Pharmaceuticals Ltd.",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-10-02",
    scheduledTime: "10:00",
    description: "A placement-style screening on doshas, classical texts and basic clinical reasoning.",
    prerequisites: "First-year BAMS syllabus — Padartha Vigyan and Samhita basics.",
    certification: "Himadri Ayurveda Readiness Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No notes, phones, or external references are allowed.",
    ],
  },
  {
    title: "Panchakarma Practice Assessment",
    domain: "Ayurveda & Panchakarma",
    hostName: "Kaveri Ayurvedic Wellness Group",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-10-09",
    scheduledTime: "14:00",
    description: "Procedure sequencing, indications, contraindications and post-therapy regimen.",
    prerequisites: "Completed Panchakarma clinical postings.",
    certification: "Kaveri Panchakarma Practice Badge",
    rules: [
      "Ensure a stable internet connection before joining.",
      "Keep your camera on for the full duration.",
      "Switching browser tabs during the test may flag your attempt for review.",
    ],
  },
  {
    title: "Ayush Pharmacology & Dravyaguna Test",
    domain: "Ayurveda & Panchakarma",
    hostName: "Vanaushadhi Botanicals Pvt. Ltd.",
    mode: "Online",
    duration: "15 mins",
    price: 99,
    scheduledAt: "2026-10-14",
    scheduledTime: "09:00",
    description: "Rasa–Guna–Virya–Vipaka reasoning, Rasashastra basics and raw-material quality parameters.",
    prerequisites: "Dravyaguna and Rasashastra coursework.",
    certification: "Vanaushadhi Dravyaguna Proficiency Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "Reference books and pharmacopoeias are not permitted.",
    ],
  },
  {
    title: "Clinical Research & GCP Quiz",
    domain: "Research & Documentation",
    hostName: "Council for Ayurvedic Sciences Research",
    mode: "Online",
    duration: "15 mins",
    price: 199,
    scheduledAt: "2026-10-21",
    scheduledTime: "11:00",
    description: "Trial design, consent, ethics review and basic biostatistics for Ayush research roles.",
    prerequisites: "An introductory research-methodology course.",
    certification: "CASR Clinical Research Fundamentals Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No AI assistants or search engines may be used during the quiz.",
    ],
  },
  {
    title: "Patient Communication & Counselling Round",
    domain: "Business & Professional Dynamics",
    hostName: "Sanjeevani Wellness Retreats",
    mode: "Offline",
    duration: "60 mins",
    price: 499,
    scheduledAt: "2026-10-28",
    reportingTime: "09:30 AM (session starts 10:00 AM sharp)",
    venue: "Sanjeevani Learning Centre, Tapovan, Rishikesh",
    description: "In-person consultation role-play and group discussion for shortlisted candidates.",
    prerequisites: "Comfortable conducting a patient consultation in Hindi or English.",
    certification: "Sanjeevani Patient Communication Certificate",
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
