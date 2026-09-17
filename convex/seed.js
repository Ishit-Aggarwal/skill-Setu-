import { mutation } from "./_generated/server";

/**
 * Server-side seeding for a fresh Convex deployment. Mirrors the demo content
 * the browser store seeds locally — an AYUSH-ecosystem catalogue spanning the
 * clinical systems (Ayurveda, Yoga & Naturopathy, Unani, Siddha, Homoeopathy),
 * ASU&H drug manufacturing and quality, the research councils, wellness and
 * export trade, and AYUSH digital health.
 *
 * Run once with: npx convex run seed:seedDatabase
 */

const DEMO_INSTITUTION = "All India Institute of Ayurveda (AIIA), New Delhi";

/* One posting per AYUSH clinical system plus the industry roles around them —
   GMP/QC, pharmacognosy, pharmacovigilance, clinical research, regulatory,
   wellness, export and telemedicine. Stipends are stored as a number plus a
   mode so the UI can render "/month" or "total for the duration" itself. */
const SEED_INTERNSHIPS = [
  { title: "Panchakarma Therapist Intern", company: "Kerala Ayurveda Ltd.", location: "Kochi", type: "Onsite", domain: "Panchakarma & Therapy Centres", duration: "6 months", stipendAmount: 18000, stipendMode: "monthly", tags: ["Panchakarma", "Abhyanga & Shirodhara", "Patient Counselling"], deadline: "2026-10-18", description: "Assist senior therapists through full Panchakarma cycles — Purvakarma, Pradhana karma and Paschat karma — at a NABH-accredited Ayurveda hospital.", color: "#3C7C6B", hot: true },
  { title: "Ayurvedic Physician / Clinical Consultant Intern", company: "Arya Vaidya Sala, Kottakkal", location: "Kottakkal", type: "Onsite", domain: "Ayurveda", duration: "6 months", stipendAmount: 22000, stipendMode: "monthly", tags: ["Nadi Pariksha", "Prakriti Assessment", "Clinical Documentation"], deadline: "2026-10-25", description: "Rotate through Kayachikitsa and Panchakarma OPDs under senior vaidyas, maintaining case records to NAMASTE terminology standards.", color: "#3C8A6B", hot: true },
  { title: "GMP Compliance & Quality Control Intern (ASU&H Drugs)", company: "Dabur India Ltd.", location: "Sahibabad, Ghaziabad", type: "Onsite", domain: "ASU&H Drug Manufacturing & GMP", duration: "6 months", stipendAmount: 150000, stipendMode: "total", tags: ["GMP Compliance", "HPTLC", "Heavy Metal Testing"], deadline: "2026-11-08", description: "Support Schedule T GMP audits, batch-record review and in-process QC on classical and proprietary Ayurvedic production lines.", color: "#3C5A8A", hot: false },
  { title: "Herbal Formulation & Nutraceutical R&D Intern", company: "Himalaya Wellness Company", location: "Bengaluru", type: "Onsite", domain: "Herbal Formulation & Nutraceutical R&D", duration: "5 months", stipendAmount: 24000, stipendMode: "monthly", tags: ["Formulation", "Pharmacognosy", "Research Methodology"], deadline: "2026-11-05", description: "Work on pre-formulation studies, standardised-extract characterisation and stability protocols for new herbal SKUs.", color: "#4A6B3C", hot: false },
  { title: "GACP Field Officer Intern (Medicinal Plant Cultivation)", company: "Patanjali Ayurved Ltd.", location: "Haridwar", type: "Onsite", domain: "Medicinal Plant Cultivation (GACP)", duration: "6 months", stipendAmount: 16000, stipendMode: "monthly", tags: ["GACP", "Medicinal Plant Cultivation", "Herbal Supply Chain"], deadline: "2026-11-15", description: "Audit contract farms for GACP compliance, log harvest and post-harvest handling, and trace raw-drug batches back to source.", color: "#3C8A5A", hot: false },
  { title: "Certified Yoga Instructor / Yoga Therapist Intern", company: "Central Council for Research in Yoga & Naturopathy (CCRYN)", location: "New Delhi", type: "Hybrid", domain: "Yoga & Naturopathy", duration: "4 months", stipendAmount: 15000, stipendMode: "monthly", tags: ["Yoga Therapy", "Yoga Certification Board", "Patient Counselling"], deadline: "2026-11-19", description: "Deliver supervised yoga-therapy protocols for lifestyle-disorder cohorts and record outcome measures for an ongoing CCRYN study.", color: "#6B7C3C", hot: false },
  { title: "Regulatory Affairs Associate Intern – AYUSH Drug Licensing", company: "Charak Pharma", location: "Mumbai", type: "Hybrid", domain: "Regulatory Affairs & AYUSH Drug Licensing", duration: "3 months", stipendAmount: 20000, stipendMode: "monthly", tags: ["Regulatory Affairs", "Export Documentation", "AYUSH Premium Mark"], deadline: "2026-11-12", description: "Prepare state licensing dossiers under the Drugs & Cosmetics Act for ASU products and support AYUSH Premium Mark applications.", color: "#3C4A8A", hot: false },
  { title: "Unani Hakim (Clinical Intern)", company: "Hamdard Laboratories (India)", location: "New Delhi", type: "Onsite", domain: "Unani", duration: "3 months", stipendAmount: 45000, stipendMode: "total", tags: ["Regimenal Therapy", "Hijama", "Clinical Documentation"], deadline: "2026-11-26", description: "Clinical posting in Moalajat and Ilaj-bit-Tadbeer OPDs at a Unani teaching hospital, with case-record maintenance.", color: "#3C6B8A", hot: false },
  { title: "AYUSH Export/Trade Documentation Associate Intern", company: "Sri Sri Tattva", location: "Remote", type: "Remote", domain: "AYUSH Export & Trade", duration: "3 months", stipendAmount: 18000, stipendMode: "monthly", tags: ["Export Documentation", "Regulatory Affairs", "Communication"], deadline: "2026-11-28", description: "Prepare export documentation, certificates of analysis and country-specific registration files for herbal products shipped to 30+ markets.", color: "#8A5A3C", hot: false },
  { title: "Raw Drug Authentication & Pharmacognosy Intern", company: "Baidyanath Group", location: "Kolkata", type: "Onsite", domain: "Pharmacognosy & Raw Drug Authentication", duration: "4 months", stipendAmount: 17000, stipendMode: "monthly", tags: ["Raw Drug Authentication", "Pharmacognosy", "HPTLC"], deadline: "2026-12-04", description: "Authenticate incoming crude drugs against Ayurvedic Pharmacopoeia of India monographs using macroscopy, microscopy and HPTLC fingerprints.", color: "#7E9638", hot: false },
  { title: "AYUSH Wellness & Spa Therapist Intern", company: "Kerala Ayurveda Ltd.", location: "Kochi", type: "Onsite", domain: "AYUSH Wellness & Spa", duration: "3 months", stipendAmount: 42000, stipendMode: "total", tags: ["Spa Therapy", "Wellness Centre Operations", "Patient Counselling"], deadline: "2026-12-06", description: "Rotate through Abhyanga, Shirodhara and Swedana suites at a wellness resort, owning one guest-experience improvement project.", color: "#8A3C6B", hot: false },
  { title: "Naturopathy Consultant Intern", company: "Jindal Naturecure Institute", location: "Bengaluru", type: "Onsite", domain: "Yoga & Naturopathy", duration: "4 months", stipendAmount: 20000, stipendMode: "monthly", tags: ["Hydrotherapy", "Diet & Nutrition", "Yoga Therapy"], deadline: "2026-11-22", description: "Plan naturopathic diet, fasting and hydrotherapy regimens for in-patients under a senior naturopathy physician.", color: "#6B7C3C", hot: true },
  { title: "Pharmacopoeia Editorial & Standards Intern", company: "Pharmacopoeia Commission for Indian Medicine & Homoeopathy (PCIM&H)", location: "Ghaziabad", type: "Hybrid", domain: "AYUSH R&D & Standardisation", duration: "3 months", stipendAmount: 17000, stipendMode: "monthly", tags: ["Research Methodology", "Sanskrit", "Writing"], deadline: "2026-12-09", description: "Assist in drafting and proof-reading API/UPI monograph text and translating classical references for pharmacopoeial standards.", color: "#194B63", hot: false },
  { title: "AYUSH Hospital Administration Intern", company: "Vaidyaratnam Oushadhasala", location: "Thrissur", type: "Onsite", domain: "AYUSH Public Health & Administration", duration: "4 months", stipendAmount: 16000, stipendMode: "monthly", tags: ["Clinical Documentation", "Process Improvement", "Communication"], deadline: "2026-12-11", description: "Support patient-flow analysis, NABH (AYUSH hospital) documentation and IPD–pharmacy coordination at a classical Ayurveda hospital.", color: "#2E93A5", hot: false },
  { title: "Pharmacovigilance Intern (ASU&H Drugs)", company: "Emami / Zandu Ayurvedic Pharmacy", location: "Mumbai", type: "Onsite", domain: "AYUSH Pharmacovigilance", duration: "6 months", stipendAmount: 22000, stipendMode: "monthly", tags: ["Pharmacovigilance", "Clinical Documentation", "Biostatistics"], deadline: "2026-12-18", description: "Log and assess adverse drug reactions under the Pharmacovigilance Programme for ASU&H drugs and prepare periodic safety summaries.", color: "#506030", hot: false },
  { title: "Clinical Research Associate Intern – AYUSH Trials", company: "Central Council for Research in Ayurvedic Sciences (CCRAS)", location: "New Delhi", type: "Hybrid", domain: "AYUSH Clinical Research", duration: "6 months", stipendAmount: 25000, stipendMode: "monthly", tags: ["Good Clinical Practice", "Clinical Documentation", "Biostatistics"], deadline: "2026-10-05", description: "Support a multi-centre CCRAS trial — CRF design, CTRI registration paperwork, site monitoring and data cleaning.", color: "#6B3C8A", hot: true },
  { title: "Health-Tech Developer Intern – AYUSH Telemedicine Platform", company: "Jiva Ayurveda", location: "Remote", type: "Remote", domain: "AYUSH Telemedicine & Health-Tech", duration: "3 months", stipendAmount: 25000, stipendMode: "monthly", tags: ["Teleconsultation", "Digital Health Records", "NAMASTE"], deadline: "2026-12-15", description: "Build features for an eSanjeevani-AYUSH-style teleconsultation platform: ABDM-linked records, NAMASTE-coded diagnoses and follow-up reminders.", color: "#3C5A8A", hot: false },
  { title: "National AYUSH Mission Programme Intern", company: "National AYUSH Mission (NAM) — Ministry of AYUSH", location: "New Delhi", type: "Hybrid", domain: "AYUSH Public Health & Administration", duration: "3 months", stipendAmount: 19000, stipendMode: "monthly", tags: ["Public Health", "Research Methodology", "Presentations"], deadline: "2026-12-22", description: "Support state-level NAM proposal reviews and evidence briefs on AYUSH integration in Ayushman Arogya Mandirs.", color: "#2E93A5", hot: false },
  { title: "Siddha Vaidya (Clinical Intern)", company: "SKM Siddha & Ayurveda Company", location: "Erode", type: "Onsite", domain: "Siddha", duration: "4 months", stipendAmount: 15000, stipendMode: "monthly", tags: ["Varma", "Clinical Documentation", "Diet & Nutrition"], deadline: "2026-12-02", description: "Clinical posting across Siddha OPD, Varma therapy and external therapies (Thokkanam) with full case documentation.", color: "#8A4A3C", hot: false },
  { title: "Homoeopathic Physician / Dispensary Intern", company: "Dr. Willmar Schwabe India", location: "Noida", type: "Onsite", domain: "Homoeopathy", duration: "5 months", stipendAmount: 80000, stipendMode: "total", tags: ["Case Taking", "Repertory", "Patient Counselling"], deadline: "2026-10-28", description: "Take and repertorise cases at a company-run dispensary, dispense potencies and maintain follow-up records.", color: "#5A3C8A", hot: false },
];

const SEED_PROGRAMS = [
  { title: "Research Methodology & Biostatistics for AYUSH Faculty", organiser: "Central Council for Research in Ayurvedic Sciences (CCRAS)", startDate: "2026-10-06", endDate: "2026-10-10", seats: 40, enrolled: 18, mode: "Hybrid" },
  { title: "Evidence-Based Ayurveda: Designing & Registering Clinical Trials (CTRI)", organiser: "All India Institute of Ayurveda (AIIA), New Delhi", startDate: "2026-10-20", endDate: "2026-10-24", seats: 30, enrolled: 22, mode: "Online" },
  { title: "Schedule T GMP & Quality Systems for ASU&H Drug Manufacturing", organiser: "Institute of Teaching & Research in Ayurveda (ITRA), Jamnagar", startDate: "2026-11-03", endDate: "2026-11-07", seats: 50, enrolled: 27, mode: "Online" },
  { title: "HPTLC Fingerprinting & ASU Drug Standardisation (API/UPI/SPI)", organiser: "Pharmacopoeia Commission for Indian Medicine & Homoeopathy (PCIM&H)", startDate: "2026-11-17", endDate: "2026-11-21", seats: 35, enrolled: 12, mode: "Hybrid" },
  { title: "AYUSH Telemedicine, Ayush Grid & ABDM Integration for Educators", organiser: "National Institute of Ayurveda (NIA), Jaipur", startDate: "2026-11-24", endDate: "2026-11-28", seats: 45, enrolled: 20, mode: "Online" },
  { title: "Outcome-Based Education & NCISM Curriculum Readiness", organiser: "National Institute of Unani Medicine (NIUM), Bengaluru", startDate: "2026-12-01", endDate: "2026-12-03", seats: 60, enrolled: 31, mode: "Online" },
  { title: "Yoga Therapy Protocols for Lifestyle Disorders — Faculty Programme", organiser: "Morarji Desai National Institute of Yoga (MDNIY), New Delhi", startDate: "2026-12-15", endDate: "2026-12-17", seats: 55, enrolled: 24, mode: "Hybrid" },
];

const SEED_SKILL_TESTS = [
  {
    title: "General Aptitude Screening",
    domain: "Quantitative Aptitude",
    hostName: "Dabur India Ltd.",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-09-30",
    scheduledTime: "10:30",
    description: "The standard placement-style aptitude screen used by ASU&H drug manufacturers and AYUSH hospital chains.",
    prerequisites: "Class 10 level arithmetic, percentages and averages.",
    certification: "Dabur Aptitude Readiness Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No calculators, phones, or external notes are allowed.",
    ],
  },
  {
    title: "AYUSH Digital Health & Telemedicine Quiz",
    domain: "AYUSH Digital Health & Telemedicine",
    hostName: "Jiva Ayurveda",
    mode: "Online",
    duration: "15 mins",
    price: 199,
    scheduledAt: "2026-10-07",
    scheduledTime: "16:00",
    description: "eSanjeevani-AYUSH, Ayush Grid, ABDM/ABHA-linked records, NAMASTE terminology and interoperability basics.",
    prerequisites: "Familiarity with any AYUSH OPD workflow and basic computer use.",
    certification: "Jiva AYUSH Telemedicine Readiness Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No second device, notes or AI assistants may be used during the quiz.",
    ],
  },
  {
    title: "ASU&H Clinical Fundamentals Screening",
    domain: "ASU&H Clinical Fundamentals",
    hostName: "Arya Vaidya Sala, Kottakkal",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-10-02",
    scheduledTime: "10:00",
    description: "Tridosha and Mukkutram theory, classical texts, Unani humoral theory, homoeopathic principles and clinical reasoning.",
    prerequisites: "First-professional BAMS, BHMS, BUMS, BSMS or BNYS coursework.",
    certification: "Arya Vaidya Sala Clinical Readiness Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No notes, phones, or external references are allowed.",
    ],
  },
  {
    title: "Herbal Drug Quality, GMP & Pharmacognosy Assessment",
    domain: "Herbal Drug Quality, GMP & Pharmacognosy",
    hostName: "Baidyanath Group",
    mode: "Online",
    duration: "15 mins",
    price: 0,
    scheduledAt: "2026-10-09",
    scheduledTime: "14:00",
    description: "Schedule T GMP, Ayurvedic Pharmacopoeia of India monographs, HPTLC fingerprinting, heavy-metal limits and Rasashastra preparations.",
    prerequisites: "Any Dravyaguna, Rasashastra, B.Pharm (Ayu) or pharmacognosy coursework.",
    certification: "Baidyanath Herbal Drug Quality Badge",
    rules: [
      "Ensure a stable internet connection before joining.",
      "Keep your camera on for the full duration.",
      "Switching browser tabs during the test may flag your attempt for review.",
    ],
  },
  {
    title: "Applied Health Data Analysis Test",
    domain: "Data Analysis & Interpretation",
    hostName: "Central Council for Research in Ayurvedic Sciences (CCRAS)",
    mode: "Online",
    duration: "15 mins",
    price: 99,
    scheduledAt: "2026-10-14",
    scheduledTime: "09:00",
    description: "Descriptive statistics, chart reading, OPD and trial-data cleaning judgement and interpretation.",
    prerequisites: "Comfort with spreadsheets and introductory biostatistics.",
    certification: "CCRAS Health Data Analysis Proficiency Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "Reference books are not permitted.",
    ],
  },
  {
    title: "AYUSH Research Methodology & Clinical Documentation Quiz",
    domain: "AYUSH Research & Clinical Documentation",
    hostName: "Central Council for Research in Ayurvedic Sciences (CCRAS)",
    mode: "Online",
    duration: "15 mins",
    price: 199,
    scheduledAt: "2026-10-21",
    scheduledTime: "11:00",
    description: "CTRI registration, informed consent, control groups, case record forms, citation practice and research ethics.",
    prerequisites: "An introductory research-methodology course.",
    certification: "CCRAS Research Fundamentals Certificate",
    rules: [
      "Join the test room at least 10 minutes before the scheduled time.",
      "Keep your camera on for the full duration.",
      "No AI assistants or search engines may be used during the quiz.",
    ],
  },
  {
    title: "AYUSH Practice Management, Ethics & Group Discussion Round",
    domain: "AYUSH Practice Management & Ethics",
    hostName: "Himalaya Wellness Company",
    mode: "Offline",
    duration: "60 mins",
    price: 499,
    scheduledAt: "2026-10-28",
    reportingTime: "09:30 AM (session starts 10:00 AM sharp)",
    venue: "Himalaya Wellness Learning Centre, Makali, Bengaluru",
    description: "In-person case role-play on NCISM/NCH regulation, patient confidentiality and AYUSH Premium Mark scenarios, plus a group discussion for shortlisted candidates.",
    prerequisites: "Comfortable presenting in Hindi or English.",
    certification: "Himalaya AYUSH Professional Practice Certificate",
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
        department: "Ayurveda (BAMS)",
        course: "BAMS",
        batch: "2023",
        year: "4th Year",
        rollNo: "23BAMS042",
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
          "ASU&H Clinical Fundamentals": 92,
          "Problem Solving & Critical Thinking": 86,
          "AYUSH Practice Management & Ethics": 78,
          "AYUSH Digital Health & Telemedicine": 85,
          "AYUSH Research & Clinical Documentation": 74,
        },
        overallScore: 84,
        strongTags: ["ASU&H Clinical Fundamentals", "Problem Solving & Critical Thinking", "Logical Reasoning"],
        updatedAt: new Date().toISOString(),
      });

      await ctx.db.insert("portfolios", {
        studentId: "demo-student",
        bio: "Final-year BAMS intern focused on Kayachikitsa and Panchakarma, with hands-on rotations in a NABH-accredited Ayurveda hospital, a CTRI-registered clinical study and an eSanjeevani-AYUSH teleconsultation hub.",
        skillBadges: {
          "Clinical & Diagnostic Skills": [
            { name: "Nadi Pariksha & Prakriti Assessment", level: "Advanced" },
            { name: "Panchakarma (Vamana, Virechana, Basti)", level: "Proficient" },
            { name: "Case Taking & NAMASTE-coded Documentation", level: "Advanced" },
          ],
          "Research & Documentation": [
            { name: "Good Clinical Practice (ICH-GCP) & CTRI", level: "Advanced" },
            { name: "Biostatistics & Research Methodology", level: "Proficient" },
          ],
          "Digital Health & Practice": [
            { name: "eSanjeevani-AYUSH Teleconsultation", level: "Proficient" },
            { name: "Patient Counselling & Pathya-Apathya Planning", level: "Proficient" },
          ],
        },
        certifications: [
          { name: "Yoga Certification Board — Yoga Protocol Instructor (Level 1)", issuer: "Ministry of AYUSH / YCB", year: "2025", score: "Pass" },
          { name: "Good Clinical Practice for AYUSH Trials", issuer: "CCRAS", year: "2024", score: "Distinction" },
        ],
        timeline: [
          { year: "2023", title: "Admitted — BAMS (Bachelor of Ayurvedic Medicine & Surgery)", org: DEMO_INSTITUTION, type: "Education" },
          { year: "2025", title: "Clinical Research Intern — Ayurveda Trials", org: "Dabur Research Foundation", type: "Internship" },
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
        companyName: "Dabur India Ltd.",
        companyDomain: "ASU&H Drug Manufacturing & GMP",
        companyDescription:
          "India's largest Ayurvedic and natural healthcare company, manufacturing classical and proprietary Ayurvedic medicines, health supplements and personal-care products under Schedule T GMP, with a dedicated research foundation running clinical and pharmacological studies.",
        hqLocation: "Ghaziabad, Uttar Pradesh",
        companySize: "5000+",
        whyWorkWithUs:
          "Interns rotate through GMP production lines, the pharmacognosy and QC laboratories and the Dabur Research Foundation's clinical-trial unit, working with senior vaidyas, pharmacognosists and regulatory specialists from week two.",
        workEmailDomain: "@dabur.example.in",
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
        department: "Dravyaguna & Pharmacognosy",
        designation: "Associate Professor",
        experienceYears: "14",
        subjectsTaught: ["Dravyaguna Vijnana", "Pharmacognosy & Raw Drug Standardisation", "Research Methodology for Ayurveda"],
        researchInterests: [
          "HPTLC Standardisation of Classical Formulations",
          "Medicinal Plant Pharmacology",
          "AYUSH Pharmacovigilance",
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

    return { success: true, message: "AYUSH demo data seeded successfully." };
  },
});
