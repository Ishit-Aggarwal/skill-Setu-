/**
 * Fixed content for the demo tour's communities, tests, Resume Coach and
 * certificate (seeded on the server by convex/_lib/demoSeed.js). Plain data,
 * no AI involved: the tour works the same with or without a model key.
 */

/* Rasa Panchaka — Dravyaguna Vigyan, Unit 3. [question, correct, wrong options] */
export const RASA_PANCHAKA_QUESTIONS = [
  ["How many Rasas (tastes) does Ayurveda describe?", "Six", ["Five", "Eight", "Three"]],
  ["Madhura Rasa is formed predominantly from which Mahabhutas?", "Prithvi and Jala", ["Agni and Vayu", "Vayu and Akasha", "Jala and Agni"]],
  ["Amla Rasa is formed predominantly from which Mahabhutas?", "Prithvi and Agni", ["Jala and Akasha", "Vayu and Akasha", "Agni and Vayu"]],
  ["Lavana Rasa is formed predominantly from which Mahabhutas?", "Jala and Agni", ["Prithvi and Vayu", "Vayu and Akasha", "Prithvi and Jala"]],
  ["Katu Rasa is formed predominantly from which Mahabhutas?", "Vayu and Agni", ["Prithvi and Jala", "Jala and Agni", "Akasha and Prithvi"]],
  ["Tikta Rasa is formed predominantly from which Mahabhutas?", "Vayu and Akasha", ["Prithvi and Agni", "Jala and Prithvi", "Agni and Jala"]],
  ["Kashaya Rasa is formed predominantly from which Mahabhutas?", "Vayu and Prithvi", ["Agni and Jala", "Akasha and Agni", "Jala and Akasha"]],
  ["Which Rasa pacifies Vata the most?", "Madhura", ["Tikta", "Kashaya", "Katu"]],
  ["Which group of Rasas increases Kapha?", "Madhura, Amla and Lavana", ["Katu, Tikta and Kashaya", "Tikta, Kashaya and Madhura", "Katu, Amla and Tikta"]],
  ["In the two-fold classification, Virya is of which two kinds?", "Ushna and Shita", ["Guru and Laghu", "Snigdha and Ruksha", "Tikshna and Manda"]],
  ["Which Virya aggravates Pitta?", "Ushna", ["Shita", "Snigdha", "Guru"]],
  ["Vipaka refers to:", "The transformed taste after digestion", ["The first taste on the tongue", "The potency of the drug", "An action no other property explains"]],
  ["Madhura and Lavana Rasa usually undergo which Vipaka?", "Madhura", ["Amla", "Katu", "Tikta"]],
  ["Amla Rasa usually undergoes which Vipaka?", "Amla", ["Madhura", "Katu", "Kashaya"]],
  ["Katu, Tikta and Kashaya Rasa usually undergo which Vipaka?", "Katu", ["Madhura", "Amla", "Lavana"]],
  ["Prabhava is best described as:", "A specific action not explained by Rasa, Guna, Virya or Vipaka", ["The sum of the six Rasas", "The heaviness of a drug", "The route of administration"]],
  ["Which drug is the classical example of Prabhava: like Chitraka in Rasa, Virya and Vipaka, yet a purgative?", "Danti", ["Haritaki", "Amalaki", "Guduchi"]],
  ["How many Gurvadi Gunas are described?", "Twenty", ["Ten", "Twelve", "Twenty-four"]],
  ["Which Guna is the opposite of Guru?", "Laghu", ["Mridu", "Snigdha", "Sthira"]],
  ["According to Charaka, which Rasa is the lightest (Laghu)?", "Tikta", ["Madhura", "Lavana", "Amla"]],
  ["According to Charaka, which Rasa is the heaviest (Guru)?", "Madhura", ["Tikta", "Katu", "Amla"]],
  ["According to Charaka, which Rasa is the most Ushna?", "Lavana", ["Madhura", "Tikta", "Kashaya"]],
  ["Which chapter of Charaka Samhita Sutrasthana deals with Rasa in detail?", "Chapter 26 (Atreyabhadrakapyiya)", ["Chapter 1 (Dirghanjivitiya)", "Chapter 11 (Tistraishaniya)", "Chapter 30 (Arthedashamahamuliya)"]],
  ["Which Rasa is Deepana and Pachana but aggravates Pitta, as chilli does?", "Katu", ["Madhura", "Kashaya", "Tikta"]],
  ["Which Rasa is astringent, drying and Stambhana?", "Kashaya", ["Lavana", "Amla", "Madhura"]],
  ["Haritaki has five Rasas. Which one is absent?", "Lavana", ["Kashaya", "Madhura", "Tikta"]],
  ["What is the predominant Rasa of Amalaki?", "Amla", ["Katu", "Lavana", "Tikta"]],
  ["What is the Vipaka of Guduchi?", "Madhura", ["Katu", "Amla", "Lavana"]],
  ["What is the Virya of Ashwagandha?", "Ushna", ["Shita", "Anushnashita", "Mridu"]],
  ["What is the predominant Rasa of Nimba?", "Tikta", ["Madhura", "Amla", "Lavana"]],
];

/** skillTestQuestions rows for a test: the correct option is at a different place each time. */
export function questionRows(testId, ownerId, list, at) {
  return list.map(([text, right, wrong], i) => {
    const options = wrong.map((w, j) => ({ id: `o${j + 2}`, text: w, isCorrect: false }));
    options.splice(i % 4, 0, { id: "o1", text: right, isCorrect: true });
    return { id: `${testId}_q${i + 1}`, testId, ownerId, order: i, text, type: "single", options, source: "manual", createdAt: at, updatedAt: at };
  });
}

/* ---------------- Resume Coach: the demo student's analysis ---------------- */

/** The text of public/demo/Aarav-Sharma-Resume.pdf (the sample resume), contact line removed. */
export const DEMO_RESUME_TEXT = [
  "Aarav Sharma",
  "BAMS 3rd Professional · All India Institute of Ayurveda (AIIA), New Delhi · 2022–2027",
  "SUMMARY",
  "BAMS student interested in Kayachikitsa, Panchakarma and AYUSH pharmacovigilance.",
  "SKILLS",
  "Nadi Pariksha, Prakriti assessment, Panchakarma procedures (Snehana, Swedana),",
  "Pharmacovigilance signal detection, ADR reporting, ICH-GCP basics, MS Excel.",
  "PROJECTS",
  "Adverse drug reaction reporting audit — AIIA Pharmacovigilance Cell, 2025.",
  "Prakriti-based diet counselling survey of 60 OPD patients, 2024.",
  "EXPERIENCE",
  "Clinical observer, Panchakarma unit, AIIA hospital — 6 weeks, 2025.",
  "CERTIFICATIONS",
  "Yoga Certification Board — Level 1 Yoga Protocol Instructor, 2024.",
  "EDUCATION",
  "BAMS (pursuing), AIIA New Delhi — expected 2027.",
].join("\n");

/** Verified scores the demo student holds (the same as the browser seed's test history). */
export const DEMO_VERIFIED_SCORES = {
  "ASU&H Clinical Fundamentals": 92,
  "Problem Solving & Critical Thinking": 86,
  "AYUSH Digital Health & Telemedicine": 85,
  "Quantitative Aptitude": 84,
  "Logical Reasoning": 88,
  "Verbal Communication": 82,
  "AYUSH Practice Management & Ethics": 78,
  "AYUSH Research & Clinical Documentation": 74,
};

export const DEMO_RESUME_TARGET = { kind: "track", title: "AYUSH Pharmacovigilance Associate" };

/**
 * The model-shaped answer, before validation. `rasaTestId` and `unit3TestId`
 * are the two demo tests it recommends; validation drops anything else.
 */
export function demoResumeRaw({ rasaTestId, unit3TestId }) {
  return {
    transcript: DEMO_RESUME_TEXT,
    profile: { name: "Aarav Sharma", course: "BAMS", year: "3rd Professional", institution: "All India Institute of Ayurveda (AIIA), New Delhi", ayushSystem: "Ayurveda", summary: "BAMS student with clinical exposure in Panchakarma and a growing interest in AYUSH pharmacovigilance, backed by an ADR reporting audit." },
    extracted: {
      education: [{ degree: "BAMS (pursuing)", institution: "AIIA New Delhi", year: "2027", evidence: "BAMS (pursuing), AIIA New Delhi — expected 2027." }],
      skills: [
        { name: "Nadi Pariksha", category: "clinical", evidence: "Nadi Pariksha, Prakriti assessment" },
        { name: "Prakriti assessment", category: "clinical", evidence: "Nadi Pariksha, Prakriti assessment" },
        { name: "Panchakarma procedures", category: "clinical", evidence: "Panchakarma procedures (Snehana, Swedana)" },
        { name: "Pharmacovigilance signal detection", category: "pharma", evidence: "Pharmacovigilance signal detection, ADR reporting" },
        { name: "ICH-GCP basics", category: "research", evidence: "ICH-GCP basics" },
        { name: "MS Excel", category: "digital", evidence: "MS Excel" },
      ],
      projects: [
        { title: "Adverse drug reaction reporting audit", summary: "Audited ADR reports at the AIIA Pharmacovigilance Cell.", evidence: "Adverse drug reaction reporting audit — AIIA Pharmacovigilance Cell, 2025." },
        { title: "Prakriti-based diet counselling survey", summary: "Surveyed 60 OPD patients on Prakriti-based diet advice.", evidence: "Prakriti-based diet counselling survey of 60 OPD patients, 2024." },
      ],
      experience: [{ role: "Clinical observer", org: "Panchakarma unit, AIIA hospital", duration: "6 weeks", evidence: "Clinical observer, Panchakarma unit, AIIA hospital — 6 weeks, 2025." }],
      certifications: [{ name: "Level 1 Yoga Protocol Instructor", issuer: "Yoga Certification Board", year: "2024", evidence: "Yoga Certification Board — Level 1 Yoga Protocol Instructor, 2024." }],
    },
    domainReadiness: [
      { domain: "ASU&H Clinical Fundamentals", resumeSignal: 78, why: "Panchakarma observership, Nadi Pariksha and Prakriti assessment." },
      { domain: "Herbal Drug Quality, GMP & Pharmacognosy", resumeSignal: 72, why: "Pharmacovigilance signal detection and an ADR audit, but no Dravyaguna or quality test yet." },
      { domain: "Data Analysis & Interpretation", resumeSignal: 62, why: "MS Excel and a 60-patient survey." },
      { domain: "AYUSH Research & Clinical Documentation", resumeSignal: 66, why: "ADR reporting and survey documentation." },
      { domain: "Verbal Communication", resumeSignal: 40, why: "Diet counselling implies patient communication." },
    ],
    strengths: [
      { point: "Hands-on pharmacovigilance exposure through an ADR reporting audit", evidence: "Adverse drug reaction reporting audit — AIIA Pharmacovigilance Cell, 2025." },
      { point: "Clinical grounding in Panchakarma", evidence: "Clinical observer, Panchakarma unit, AIIA hospital — 6 weeks, 2025." },
      { point: "Field research with real patients", evidence: "Prakriti-based diet counselling survey of 60 OPD patients, 2024." },
    ],
    gaps: [
      { point: "No verified score in Herbal Drug Quality, GMP & Pharmacognosy", why: "The resume claims pharmacovigilance skills that no test has confirmed yet.", forTarget: true },
      { point: "Dravyaguna fundamentals (Rasa Panchaka) not shown", why: "Pharmacovigilance roles expect a working knowledge of drug properties.", forTarget: true },
      { point: "No data-analysis evidence beyond MS Excel", why: "Signal detection needs basic statistics.", forTarget: true },
    ],
    nextTests: [
      { testId: rasaTestId, priority: 1, why: "Confirms the Dravyaguna knowledge a pharmacovigilance role expects and turns a claimed skill into a verified one.", prepareTopics: ["Rasa and Mahabhuta composition", "Virya and Vipaka", "Prabhava with classical examples"], readinessNow: 58 },
      { testId: unit3TestId, priority: 2, why: "The full Unit 3 assessment next week builds on the same topics.", prepareTopics: ["Gurvadi Gunas", "Drug monographs: Haritaki, Amalaki, Guduchi"], readinessNow: 52 },
    ],
    generalTestAreas: [{ domain: "Data Analysis & Interpretation", why: "A verified data score would back the survey work on your resume." }],
    studyPlan: {
      weeks: 3,
      topics: [
        { id: "t1", title: "Rasa: the six tastes and their Mahabhutas", subtopics: ["Panchabhautika composition", "Effect of each Rasa on the Doshas"], whyItMatters: "The first third of the Rasa Panchaka Unit Test.", forTestId: rasaTestId, estHours: 4, references: ["Charaka Samhita, Sutrasthana ch. 26"] },
        { id: "t2", title: "Virya, Vipaka and Prabhava", subtopics: ["Two-fold Virya", "Three Vipakas", "Prabhava: Danti and Chitraka"], whyItMatters: "Most commonly examined concepts of the unit.", forTestId: rasaTestId, estHours: 5, references: ["Charaka Samhita, Sutrasthana ch. 26", "Dravyaguna Vijnana, Vol. 1"] },
        { id: "t3", title: "Gurvadi Gunas", subtopics: ["The twenty Gunas as opposing pairs"], whyItMatters: "Needed for the Unit 3 assessment.", forTestId: unit3TestId, estHours: 3, references: ["Ashtanga Hridaya, Sutrasthana ch. 1"] },
        { id: "t4", title: "Signal detection basics", subtopics: ["Disproportionality", "Causality assessment (WHO-UMC)"], whyItMatters: "Backs the pharmacovigilance claim on your resume.", forTestId: null, estHours: 4, references: ["Pharmacovigilance Programme of India guidance for ASU&H drugs"] },
      ],
      schedule: [
        { week: 1, topicIds: ["t1", "t2"], goal: "Sit the Rasa Panchaka Unit Test" },
        { week: 2, topicIds: ["t3"], goal: "Prepare the Unit 3 assessment" },
        { week: 3, topicIds: ["t4"], goal: "Strengthen the pharmacovigilance story" },
      ],
    },
    resumeFixes: [
      { issue: "Skills are listed without outcomes", suggestion: "Add a number to the ADR audit.", example: "Audited 120 ADR reports and flagged 6 for causality review." },
      { issue: "No verified scores on the resume", suggestion: "Add your Skill Setu certificates with their verification links.", example: "Rasa Panchaka Unit Test: 84% (verify: skillsetu.in/verify/…)" },
    ],
    targetMatch: { targetTitle: DEMO_RESUME_TARGET.title, matchPercent: 64, matched: ["ADR reporting", "Signal detection basics", "ICH-GCP basics"], missing: ["Verified Dravyaguna score", "Causality assessment", "Statistics for signal detection"] },
    warnings: [],
  };
}
