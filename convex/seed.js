import { mutation } from "./_generated/server";

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
  { title: "Advanced Data Science & Machine Learning", organiser: "IIT Delhi", dates: "Sep 15–19, 2026", seats: 30, enrolled: 18, mode: "Hybrid" },
  { title: "Modern Manufacturing & Industry 4.0", organiser: "NIT Tiruchirappalli", dates: "Oct 5–9, 2026", seats: 40, enrolled: 25, mode: "Online" },
  { title: "Financial Modelling & Valuation Techniques", organiser: "IIM Ahmedabad", dates: "Oct 20–24, 2026", seats: 25, enrolled: 12, mode: "Onsite" },
  { title: "Digital Marketing & Growth Analytics", organiser: "BITS Pilani", dates: "Nov 3–5, 2026", seats: 50, enrolled: 34, mode: "Online" },
];

const SEED_SKILL_TESTS = [
  {
    title: "Quantitative Aptitude Test",
    domain: "Quantitative Aptitude",
    hostName: "Tata Consultancy Services",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-09-03",
    scheduledTime: "10:00",
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
    scheduledAt: "2026-09-09",
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
    scheduledAt: "2026-09-06",
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
    scheduledAt: "2026-09-10",
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
    scheduledAt: "2026-09-13",
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

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // Check if internships already exist
    const existingInternships = await ctx.db.query("internships").first();
    if (!existingInternships) {
      for (const item of SEED_INTERNSHIPS) {
        await ctx.db.insert("internships", {
          ...item,
          ownerId: "seed",
          status: "Open",
          postedAt: new Date().toISOString(),
        });
      }
    }

    // Check programs
    const existingPrograms = await ctx.db.query("programs").first();
    if (!existingPrograms) {
      for (const p of SEED_PROGRAMS) {
        await ctx.db.insert("programs", {
          ...p,
          ownerId: "seed",
          status: "Open",
        });
      }
    }

    // Check skill tests
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

    // Seed Demo Users if they don't exist
    const demoStudent = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo.student@setu.dev"))
      .first();

    if (!demoStudent) {
      const studentId = await ctx.db.insert("users", {
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

      await ctx.db.insert("assessments", {
        studentId: "demo-student",
        domainScores: {
          "Quantitative Aptitude": 80,
          "Logical Reasoning": 70,
          "Verbal Ability": 90,
          "Programming Fundamentals": 65,
          "Business & Communication": 75,
        },
        overallScore: 76,
        strongTags: ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Business & Communication"],
        updatedAt: new Date().toISOString(),
      });

      await ctx.db.insert("portfolios", {
        studentId: "demo-student",
        bio: "Aspiring software engineer interested in backend systems and applied ML.",
        skillBadges: {
          "Technical Skills": [
            { name: "Python", level: "Advanced" },
            { name: "React", level: "Proficient" },
          ],
          "Research & Analytical": [{ name: "Data Structures & Algorithms", level: "Proficient" }],
          "Soft Skills": [{ name: "Team Leadership", level: "Advanced" }],
        },
        certifications: [
          { name: "AWS Cloud Practitioner", issuer: "Amazon Web Services", year: "2025", score: "Pass" },
        ],
        timeline: [
          { year: "2023", title: "Admitted — B.Tech CSE", org: "IIT Delhi", type: "Education" },
          { year: "2025", title: "Summer Intern", org: "Infosys", type: "Internship" },
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
        name: "Demo Recruiter",
        companyName: "Setu Technologies Pvt. Ltd.",
        workEmailDomain: "@setutech.com",
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
        name: "Dr. Demo Faculty",
        institution: "NIT Tiruchirappalli",
        department: "Computer Science & Engineering",
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
        name: "Demo Placement Cell",
        instituteName: "IIT Delhi",
        instituteId: "AISHE-U-0001",
        createdAt: new Date().toISOString(),
      });
    }

    return { success: true, message: "Database seeded successfully!" };
  },
});
