/**
 * The sector taxonomy for the whole platform.
 *
 * Skill Setu is a general academia–industry portal covering every field, but
 * SIH26044 is issued by the Ministry of Ayush — so the AYUSH ecosystem
 * (Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homeopathy, plus the pharma,
 * wellness, research and public-health industries around them) is a first-class
 * vertical listed first everywhere, not an afterthought buried in a long
 * generic list. Institutions that place students across both Ayush and other
 * departments are the normal case, not the exception.
 */

export const AYUSH_DOMAINS = [
  "Ayurveda",
  "Yoga & Naturopathy",
  "Unani Medicine",
  "Siddha Medicine",
  "Homeopathy",
  "Panchakarma & Wellness Therapy",
  "Ayush Pharmaceuticals & Nutraceuticals",
  "Ayush Clinical Research",
  "Wellness Tourism & Spa Management",
  "Ayush Public Health & Administration",
  "Ayush Diagnostics & Lab Sciences",
];

export const HEALTH_DOMAINS = [
  "Healthcare & Hospital Administration",
  "Pharmaceuticals & Biotechnology",
  "Medical Devices & Diagnostics",
  "Public Health & Nutrition",
  "Digital Health & Health Informatics",
];

export const GENERAL_DOMAINS = [
  "Information Technology & Software",
  "Data Science & AI",
  "Manufacturing & Core Engineering",
  "Civil & Infrastructure",
  "Banking, Finance & Insurance",
  "Consulting & Strategy",
  "Marketing & Advertising",
  "Design & Creative",
  "Sales & Business Development",
  "Human Resources",
  "Legal & Compliance",
  "Media & Communications",
  "Supply Chain & Logistics",
  "Education & Training",
  "Agriculture & Agri-business",
  "Energy & Sustainability",
  "Government & Public Policy",
  "Quality Control & Regulatory Affairs",
  "Research & Development",
];

export const ALL_DOMAINS = [...AYUSH_DOMAINS, ...HEALTH_DOMAINS, ...GENERAL_DOMAINS];

/** Grouped for <optgroup>, Ayush first because that's the commissioning sector. */
export const DOMAIN_GROUPS = [
  { label: "AYUSH & wellness", items: AYUSH_DOMAINS },
  { label: "Healthcare & life sciences", items: HEALTH_DOMAINS },
  { label: "Technology, industry & services", items: GENERAL_DOMAINS },
];

export function isAyushDomain(domain) {
  return AYUSH_DOMAINS.includes(domain);
}

const DOMAIN_COLORS = {
  Ayurveda: "#6B7C3C",
  "Yoga & Naturopathy": "#3C8A6B",
  "Unani Medicine": "#3C5A8A",
  "Siddha Medicine": "#8A703C",
  Homeopathy: "#5A3C8A",
  "Panchakarma & Wellness Therapy": "#8A4A3C",
  "Ayush Pharmaceuticals & Nutraceuticals": "#3C6B8A",
  "Ayush Clinical Research": "#6B3C8A",
  "Wellness Tourism & Spa Management": "#8A3C6B",
  "Ayush Public Health & Administration": "#4A6B3C",
  "Ayush Diagnostics & Lab Sciences": "#3C7C6B",
  "Healthcare & Hospital Administration": "#2E93A5",
  "Pharmaceuticals & Biotechnology": "#3C6B8A",
  "Medical Devices & Diagnostics": "#194B63",
  "Public Health & Nutrition": "#4A6B3C",
  "Digital Health & Health Informatics": "#3C4A8A",
  "Information Technology & Software": "#3C5A8A",
  "Data Science & AI": "#5A3C8A",
  "Manufacturing & Core Engineering": "#8A4A3C",
  "Civil & Infrastructure": "#7A6A3C",
  "Banking, Finance & Insurance": "#3C4A8A",
  "Consulting & Strategy": "#6B3C8A",
  "Marketing & Advertising": "#8A703C",
  "Design & Creative": "#8A3C6B",
  "Sales & Business Development": "#8A5A3C",
  "Human Resources": "#3C8A6B",
  "Legal & Compliance": "#506030",
  "Media & Communications": "#6B3C5A",
  "Supply Chain & Logistics": "#3C7C6B",
  "Education & Training": "#6B7C3C",
  "Agriculture & Agri-business": "#7E9638",
  "Energy & Sustainability": "#3C8A5A",
  "Government & Public Policy": "#4A5A6B",
  "Quality Control & Regulatory Affairs": "#506030",
  "Research & Development": "#3C6B8A",
};

export function domainColor(domain) {
  return DOMAIN_COLORS[domain] || "#6B7C3C";
}

/** The tiles on the landing page's sector strip — Ayush first, then the rest. */
export const LANDING_SECTORS = [
  { abbr: "AY", full: "Ayurveda & Panchakarma", ayush: true },
  { abbr: "YN", full: "Yoga & Naturopathy", ayush: true },
  { abbr: "US", full: "Unani, Siddha & Homeopathy", ayush: true },
  { abbr: "HC", full: "Healthcare & Life Sciences" },
  { abbr: "IT", full: "Software, Data & AI" },
  { abbr: "MF", full: "Manufacturing & Core Engineering" },
  { abbr: "FN", full: "Finance, Consulting & Business" },
  { abbr: "DS", full: "Design, Media & Creative" },
];

/**
 * Academic departments. Ayush departments lead the list, followed by the
 * general faculties a multi-disciplinary institution also places students from.
 */
export const AYUSH_DEPARTMENTS = [
  "Ayurveda (BAMS)",
  "Panchakarma",
  "Dravyaguna (Ayurvedic Pharmacology)",
  "Rasashastra & Bhaishajya Kalpana",
  "Kayachikitsa (Internal Medicine)",
  "Yoga & Naturopathy (BNYS)",
  "Homeopathy (BHMS)",
  "Unani Medicine (BUMS)",
  "Siddha Medicine (BSMS)",
  "Ayush Pharmacy (B.Pharm Ayurveda)",
];

export const GENERAL_DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Management Studies (MBA)",
  "Commerce & Economics",
  "Life Sciences & Biotechnology",
  "Design & Applied Arts",
  "Pharmacy (B.Pharm)",
  "Nursing & Allied Health",
];

export const DEPARTMENTS = [...AYUSH_DEPARTMENTS, ...GENERAL_DEPARTMENTS];

/** Which skill domain each department is expected to be strongest in. */
export const DEPARTMENT_CORE_SKILL = {
  "Ayurveda (BAMS)": "Ayurveda & Panchakarma",
  Panchakarma: "Ayurveda & Panchakarma",
  "Dravyaguna (Ayurvedic Pharmacology)": "Ayush Pharmacology & Formulation",
  "Rasashastra & Bhaishajya Kalpana": "Ayush Pharmacology & Formulation",
  "Kayachikitsa (Internal Medicine)": "Ayurveda & Panchakarma",
  "Yoga & Naturopathy (BNYS)": "Yoga & Naturopathy",
  "Homeopathy (BHMS)": "Unani, Siddha & Homeopathy",
  "Unani Medicine (BUMS)": "Unani, Siddha & Homeopathy",
  "Siddha Medicine (BSMS)": "Unani, Siddha & Homeopathy",
  "Ayush Pharmacy (B.Pharm Ayurveda)": "Ayush Pharmacology & Formulation",
  "Computer Science & Engineering": "Programming & Digital Fundamentals",
  "Electronics & Communication": "Programming & Digital Fundamentals",
  "Mechanical Engineering": "Quantitative Aptitude",
  "Civil Engineering": "Quantitative Aptitude",
  "Management Studies (MBA)": "Business & Communication",
  "Commerce & Economics": "Quantitative Aptitude",
  "Life Sciences & Biotechnology": "Research & Clinical Documentation",
  "Design & Applied Arts": "Business & Communication",
  "Pharmacy (B.Pharm)": "Ayush Pharmacology & Formulation",
  "Nursing & Allied Health": "Research & Clinical Documentation",
};

export const INSTITUTION_TYPES = [
  "National Institute (Ministry of Ayush)",
  "Deemed University",
  "State University",
  "Autonomous College",
  "Government College",
  "Affiliated Private College",
  "University with Ayush Faculty",
];

export const ACCREDITATION_BODIES = ["NAAC", "NBA", "NCISM", "NCH", "UGC", "AICTE", "PCI", "NMC"];

export const COLLAB_EXPERTISE = [
  "Ayurvedic Pharmacology (Dravyaguna)",
  "Rasashastra & Bhaishajya Kalpana",
  "Panchakarma Protocols",
  "Yoga Therapy & Exercise Physiology",
  "Unani & Siddha Pharmacopoeia",
  "Homeopathic Materia Medica",
  "Medicinal Plant Taxonomy",
  "Phytochemistry & Standardisation",
  "Clinical Trials & Good Clinical Practice",
  "Public Health & Epidemiology",
  "Machine Learning & Data Science",
  "Materials & Manufacturing Processes",
  "Renewable Energy & Sustainability",
  "Economics & Public Policy",
  "Human-Centred Design",
  "Biotechnology & Molecular Biology",
];

/**
 * Curriculum-gap remediation. Keyed by the lowercase skill an employer asks
 * for; used to suggest a concrete elective or certification an institution
 * could add rather than just naming the gap. Covers both the Ayush skill set
 * and the general cross-industry one.
 */
const INTERVENTIONS = {
  // AYUSH
  "panchakarma protocols": { elective: "Certificate in Clinical Panchakarma Practice", type: "Elective" },
  "ayurvedic pharmacology": { elective: "Advanced Dravyaguna & Formulation Design", type: "Elective" },
  dravyaguna: { elective: "Advanced Dravyaguna & Formulation Design", type: "Elective" },
  "gmp compliance": { elective: "GMP & Schedule-T Compliance for Manufacturing Units", type: "Certification" },
  hptlc: { elective: "Analytical QC for Formulations (HPTLC/HPLC)", type: "Certification" },
  pharmacovigilance: { elective: "Pharmacovigilance & ADR Reporting", type: "Certification" },
  "yoga therapy": { elective: "Therapeutic Yoga for Lifestyle Disorders", type: "Elective" },
  "spa operations": { elective: "Wellness Centre & Spa Operations Management", type: "Elective" },
  "medicinal plant identification": { elective: "Field Pharmacognosy & Herbarium Practice", type: "Elective" },
  pharmacognosy: { elective: "Field Pharmacognosy & Herbarium Practice", type: "Elective" },
  "unani pharmacopoeia": { elective: "Classical Unani Dosage Forms & Compounding", type: "Elective" },
  "siddha formulations": { elective: "Siddha Formulation Standardisation", type: "Elective" },
  "case taking": { elective: "Clinical Case Taking & Repertorisation", type: "Elective" },

  // Health & research
  "clinical documentation": { elective: "Clinical Documentation & Case-Record Standards", type: "Elective" },
  "good clinical practice": { elective: "ICH-GCP for Clinical Trials", type: "Certification" },
  "clinical trials": { elective: "ICH-GCP for Clinical Trials", type: "Certification" },
  biostatistics: { elective: "Biostatistics & Research Methodology", type: "Elective" },
  "research methodology": { elective: "Biostatistics & Research Methodology", type: "Elective" },
  "public health": { elective: "Public Health & National Health Programmes", type: "Elective" },
  epidemiology: { elective: "Public Health & National Health Programmes", type: "Elective" },
  "diet & nutrition": { elective: "Clinical Nutrition & Diet Planning", type: "Elective" },
  "patient counselling": { elective: "Patient Communication & Counselling Skills", type: "Elective" },

  // Technology & data
  react: { elective: "Modern Front-End Engineering (React)", type: "Certification" },
  javascript: { elective: "Modern Front-End Engineering (React)", type: "Certification" },
  "node.js": { elective: "Backend Services & API Design", type: "Certification" },
  python: { elective: "Applied Python for Data & Automation", type: "Certification" },
  sql: { elective: "Databases & Analytical SQL", type: "Elective" },
  "machine learning": { elective: "Applied Machine Learning", type: "Certification" },
  "data visualisation": { elective: "Data Storytelling & Dashboarding", type: "Elective" },
  "cloud computing": { elective: "Cloud Fundamentals & DevOps Practices", type: "Certification" },
  cybersecurity: { elective: "Applied Cybersecurity Fundamentals", type: "Certification" },
  "digital health records": { elective: "Health Informatics & EHR Standards (incl. NAMASTE codes)", type: "Certification" },
  teleconsultation: { elective: "Health Informatics & EHR Standards (incl. NAMASTE codes)", type: "Certification" },

  // Engineering & operations
  autocad: { elective: "CAD & Design for Manufacture", type: "Certification" },
  solidworks: { elective: "CAD & Design for Manufacture", type: "Certification" },
  "gd&t": { elective: "Geometric Dimensioning & Tolerancing", type: "Certification" },
  "quality control": { elective: "Quality Systems, SPC & Six Sigma Green Belt", type: "Certification" },
  "process improvement": { elective: "Quality Systems, SPC & Six Sigma Green Belt", type: "Certification" },
  "supply chain": { elective: "Supply Chain Planning & Logistics", type: "Elective" },
  "inventory management": { elective: "Supply Chain Planning & Logistics", type: "Elective" },

  // Business, finance & creative
  "financial modelling": { elective: "Financial Modelling & Valuation", type: "Certification" },
  "risk analysis": { elective: "Credit & Market Risk Analysis", type: "Elective" },
  excel: { elective: "Advanced Spreadsheet Modelling", type: "Certification" },
  "market research": { elective: "Market Research & Consumer Insight", type: "Elective" },
  seo: { elective: "Digital Marketing & Growth Analytics", type: "Certification" },
  "content strategy": { elective: "Digital Marketing & Growth Analytics", type: "Certification" },
  figma: { elective: "Product Design & Prototyping", type: "Certification" },
  "user research": { elective: "Product Design & Prototyping", type: "Certification" },
  "regulatory affairs": { elective: "Regulatory Affairs & Export Documentation", type: "Certification" },
  communication: { elective: "Professional Communication & Presentation Skills", type: "Elective" },
  presentations: { elective: "Professional Communication & Presentation Skills", type: "Elective" },
};

export function suggestIntervention(skill) {
  const key = String(skill || "").toLowerCase();
  if (INTERVENTIONS[key]) return INTERVENTIONS[key];
  const partial = Object.keys(INTERVENTIONS).find((k) => key.includes(k) || k.includes(key));
  if (partial) return INTERVENTIONS[partial];
  return { elective: `Short-term certification in ${skill}`, type: "Certification" };
}
