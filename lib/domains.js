/**
 * The sector taxonomy for the whole platform.
 *
 * Skill Setu is the academia–industry portal for the AYUSH ecosystem —
 * Ayurveda, Yoga & Naturopathy, Unani, Siddha, Homoeopathy and Sowa-Rigpa —
 * built for Ministry of AYUSH problem statement SIH26044. Every sector here is
 * an AYUSH sector: the clinical systems themselves, the ASU&H drug industry
 * that manufactures for them, the research councils, the wellness and export
 * trade, and the digital-health layer (eSanjeevani-AYUSH, Ayush Grid) that
 * connects them. Nothing outside the AYUSH ecosystem belongs in this file.
 *
 * The six clinical systems are listed first because they are the reason the
 * platform exists; the allied industry sectors follow in cluster order.
 */

import { AYUSH_SYSTEM_LABELS } from "./ayush";

/** The recognised systems of medicine under the Ministry of AYUSH. The five
    canonical systems come from lib/ayush.js — the only place they are
    declared — with Sowa-Rigpa appended as a sector of its own. */
export const GENERAL_DOMAINS = [...AYUSH_SYSTEM_LABELS, "Sowa-Rigpa"];

/** The allied AYUSH industry — pharma, research, wellness, trade and digital health. */
export const HEALTH_DOMAINS = [
  "ASU&H Drug Manufacturing & GMP",
  "Herbal Formulation & Nutraceutical R&D",
  "Pharmacognosy & Raw Drug Authentication",
  "AYUSH Pharmacovigilance",
  "AYUSH Clinical Research",
  "AYUSH R&D & Standardisation",
  "Regulatory Affairs & AYUSH Drug Licensing",
  "AYUSH Public Health & Administration",
  "AYUSH Education & Training",
  "AYUSH Wellness & Spa",
  "Panchakarma & Therapy Centres",
  "AYUSH Export & Trade",
  "Medicinal Plant Cultivation (GACP)",
  "AYUSH Telemedicine & Health-Tech",
  "AYUSH Health Informatics & Data",
];

export const ALL_DOMAINS = [...GENERAL_DOMAINS, ...HEALTH_DOMAINS];

/**
 * Sectors clustered by what the work actually is, for collapsible filters and
 * <optgroup> lists. Five clusters: the clinical systems, the ASU&H drug
 * industry, research & regulation, wellness & trade, and digital health.
 */
export const SECTOR_CLUSTERS = [
  {
    id: "technology",
    label: "Clinical Systems (ASU&H)",
    items: GENERAL_DOMAINS,
  },
  {
    id: "healthcare",
    label: "AYUSH Pharma & Manufacturing",
    items: [
      "ASU&H Drug Manufacturing & GMP",
      "Herbal Formulation & Nutraceutical R&D",
      "Pharmacognosy & Raw Drug Authentication",
      "AYUSH Pharmacovigilance",
    ],
  },
  {
    id: "business",
    label: "Research, Regulation & Public Health",
    items: [
      "AYUSH Clinical Research",
      "AYUSH R&D & Standardisation",
      "Regulatory Affairs & AYUSH Drug Licensing",
      "AYUSH Public Health & Administration",
      "AYUSH Education & Training",
    ],
  },
  {
    id: "engineering",
    label: "Wellness, Trade & Cultivation",
    items: [
      "AYUSH Wellness & Spa",
      "Panchakarma & Therapy Centres",
      "AYUSH Export & Trade",
      "Medicinal Plant Cultivation (GACP)",
    ],
  },
  {
    id: "design",
    label: "AYUSH Digital Health",
    items: ["AYUSH Telemedicine & Health-Tech", "AYUSH Health Informatics & Data"],
  },
];

/** Grouped for <optgroup> in role creation and sector filtering. */
export const DOMAIN_GROUPS = SECTOR_CLUSTERS.map(({ label, items }) => ({ label, items }));

/**
 * Sector names that older records (and a couple of seeded postings) used before
 * the taxonomy settled on AYUSH-only sectors. Without this, a posting stored
 * under a pre-taxonomy name would appear as a stray filter pill of its own.
 */
export const DOMAIN_ALIASES = {
  "Traditional & Integrative Medicine": "Ayurveda",
  "Allied Health & Clinical Care": "Ayurveda",
  "Unani Medicine": "Unani",
  "Siddha Medicine": "Siddha",
  Homeopathy: "Homoeopathy",
  "Panchakarma & Wellness Therapy": "Panchakarma & Therapy Centres",
  "Wellness Tourism & Spa Management": "AYUSH Wellness & Spa",
  "Wellness, Fitness & Preventive Health": "AYUSH Wellness & Spa",
  "Hospitality, Travel & Tourism": "AYUSH Wellness & Spa",
  "Ayush Pharmaceuticals & Nutraceuticals": "Herbal Formulation & Nutraceutical R&D",
  "Pharmaceuticals & Biotechnology": "ASU&H Drug Manufacturing & GMP",
  "Biotechnology & Life Sciences": "Herbal Formulation & Nutraceutical R&D",
  "Ayush Clinical Research": "AYUSH Clinical Research",
  "Ayush Diagnostics & Lab Sciences": "AYUSH R&D & Standardisation",
  "Research & Development": "AYUSH R&D & Standardisation",
  "Ayush Public Health & Administration": "AYUSH Public Health & Administration",
  "Healthcare & Hospital Administration": "AYUSH Public Health & Administration",
  "Public Health & Nutrition": "AYUSH Public Health & Administration",
  "Quality Control & Regulatory Affairs": "Regulatory Affairs & AYUSH Drug Licensing",
  "Agriculture & Agri-business": "Medicinal Plant Cultivation (GACP)",
  "Education & Training": "AYUSH Education & Training",
  "Digital Health & Health Informatics": "AYUSH Telemedicine & Health-Tech",
  "Information Technology & Software": "AYUSH Telemedicine & Health-Tech",
  "Data Science & AI": "AYUSH Health Informatics & Data",
  "Data Science & Artificial Intelligence": "AYUSH Health Informatics & Data",
};

/** Resolve any stored sector string to its canonical taxonomy entry. */
export function canonicalDomain(domain) {
  if (!domain) return domain;
  return DOMAIN_ALIASES[domain] || domain;
}

/** The cluster a sector belongs to, or null for an unrecognised one. */
export function clusterForDomain(domain) {
  const canonical = canonicalDomain(domain);
  return SECTOR_CLUSTERS.find((c) => c.items.includes(canonical)) || null;
}

const DOMAIN_COLORS = {
  Ayurveda: "#3C8A6B",
  "Yoga & Naturopathy": "#6B7C3C",
  Unani: "#3C6B8A",
  Siddha: "#8A4A3C",
  Homoeopathy: "#5A3C8A",
  "Sowa-Rigpa": "#7A6A3C",
  "ASU&H Drug Manufacturing & GMP": "#3C5A8A",
  "Herbal Formulation & Nutraceutical R&D": "#4A6B3C",
  "Pharmacognosy & Raw Drug Authentication": "#7E9638",
  "AYUSH Pharmacovigilance": "#506030",
  "AYUSH Clinical Research": "#6B3C8A",
  "AYUSH R&D & Standardisation": "#194B63",
  "Regulatory Affairs & AYUSH Drug Licensing": "#3C4A8A",
  "AYUSH Public Health & Administration": "#2E93A5",
  "AYUSH Education & Training": "#8A703C",
  "AYUSH Wellness & Spa": "#8A3C6B",
  "Panchakarma & Therapy Centres": "#3C7C6B",
  "AYUSH Export & Trade": "#8A5A3C",
  "Medicinal Plant Cultivation (GACP)": "#3C8A5A",
  "AYUSH Telemedicine & Health-Tech": "#3C5A8A",
  "AYUSH Health Informatics & Data": "#4A5A6B",
};

export function domainColor(domain) {
  return DOMAIN_COLORS[domain] || "#6B7C3C";
}

/** The tiles on the landing page's sector strip — the AYUSH ecosystem end to end. */
export const LANDING_SECTORS = [
  { abbr: "AY", full: "Ayurveda" },
  { abbr: "YN", full: "Yoga & Naturopathy" },
  { abbr: "UN", full: "Unani" },
  { abbr: "SD", full: "Siddha" },
  { abbr: "HM", full: "Homoeopathy" },
  { abbr: "PV", full: "ASU&H Pharma & Pharmacovigilance" },
  { abbr: "WS", full: "AYUSH Wellness & Spa" },
  { abbr: "RD", full: "AYUSH R&D & Export/Trade" },
];

/**
  Academic departments across an AYUSH campus — the NCISM / NCH recognised
  undergraduate and postgraduate programmes, the pharmacy and drug-science
  departments, and the diploma and management streams that feed the same
  industry.

  The department list drives eligibility filters, roster grouping and the
  cohort heatmap, so each entry is a programme a student can actually be
  enrolled in rather than a subject.
 */
export const GENERAL_DEPARTMENTS = [
  "Ayurveda (BAMS)",
  "Homoeopathy (BHMS)",
  "Unani (BUMS)",
  "Siddha (BSMS)",
  "Naturopathy & Yogic Sciences (BNYS)",
  "Sowa-Rigpa (BSRMS)",
  "Ayurveda Postgraduate (MD/MS Ayu)",
  "Panchakarma (PG Diploma)",
  "Yoga Therapy (PG Diploma)",
  "Ayurvedic Pharmacy (B.Pharm Ayu)",
  "Dravyaguna & Pharmacognosy",
  "Rasashastra & Bhaishajya Kalpana",
  "Swasthavritta & Yoga (Preventive Health)",
  "Panchakarma Therapy Assistant (Diploma)",
  "AYUSH Hospital Management & Public Health",
  "Medicinal Plant Sciences & Cultivation",
];

/** Departments charted on the ASU&H pharma, quality & drug-research rubric. */
export const HEALTH_DEPARTMENTS = [
  "Ayurvedic Pharmacy (B.Pharm Ayu)",
  "Dravyaguna & Pharmacognosy",
  "Rasashastra & Bhaishajya Kalpana",
  "Medicinal Plant Sciences & Cultivation",
];

/** Departments charted on the Yoga, Naturopathy & wellness rubric. */
export const DESIGN_DEPARTMENTS = [
  "Naturopathy & Yogic Sciences (BNYS)",
  "Yoga Therapy (PG Diploma)",
  "Swasthavritta & Yoga (Preventive Health)",
  "Panchakarma Therapy Assistant (Diploma)",
];

export const DEPARTMENTS = GENERAL_DEPARTMENTS;

/** Which skill domain each department is expected to be strongest in. */
export const DEPARTMENT_CORE_SKILL = {
  "Ayurveda (BAMS)": "ASU&H Clinical Fundamentals",
  "Homoeopathy (BHMS)": "ASU&H Clinical Fundamentals",
  "Unani (BUMS)": "ASU&H Clinical Fundamentals",
  "Siddha (BSMS)": "ASU&H Clinical Fundamentals",
  "Naturopathy & Yogic Sciences (BNYS)": "ASU&H Clinical Fundamentals",
  "Sowa-Rigpa (BSRMS)": "ASU&H Clinical Fundamentals",
  "Ayurveda Postgraduate (MD/MS Ayu)": "AYUSH Research & Clinical Documentation",
  "Panchakarma (PG Diploma)": "ASU&H Clinical Fundamentals",
  "Yoga Therapy (PG Diploma)": "ASU&H Clinical Fundamentals",
  "Ayurvedic Pharmacy (B.Pharm Ayu)": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Dravyaguna & Pharmacognosy": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Rasashastra & Bhaishajya Kalpana": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Swasthavritta & Yoga (Preventive Health)": "ASU&H Clinical Fundamentals",
  "Panchakarma Therapy Assistant (Diploma)": "ASU&H Clinical Fundamentals",
  "AYUSH Hospital Management & Public Health": "AYUSH Practice Management & Ethics",
  "Medicinal Plant Sciences & Cultivation": "Herbal Drug Quality, GMP & Pharmacognosy",
};

export const INSTITUTION_TYPES = [
  "National Institute under Ministry of AYUSH",
  "AYUSH Deemed-to-be University",
  "State AYUSH University",
  "Government Ayurveda / Unani / Siddha / Homoeopathy College",
  "Private AYUSH College (NCISM / NCH approved)",
  "AYUSH Research Council Institute (CCRAS / CCRYN / CCRUM / CCRS / CCRH)",
  "Yoga & Naturopathy Institute",
  "Institute of National Importance (AYUSH)",
];

export const ACCREDITATION_BODIES = ["NCISM", "NCH", "NAAC", "UGC", "NIRF", "NABH (AYUSH)", "PCIM&H", "AYUSH Premium Mark", "CCRAS", "CCRH"];

export const COLLAB_EXPERTISE = [
  "Dravyaguna & Medicinal Plant Pharmacology",
  "Rasashastra & Bhaishajya Kalpana (ASU Formulation)",
  "Panchakarma & Clinical Ayurveda",
  "Yoga Therapy & Lifestyle Medicine",
  "Naturopathy & Dietetics",
  "Unani Ilmul Advia (Pharmacology)",
  "Siddha Gunapadam & Varma Therapy",
  "Homoeopathic Materia Medica & Drug Proving",
  "AYUSH Clinical Trials & Good Clinical Practice",
  "Pharmacognosy, HPTLC & Raw Drug Standardisation",
  "AYUSH Pharmacovigilance & Drug Safety",
  "Public Health & AYUSH Epidemiology",
  "AYUSH Digital Health & Telemedicine",
  "Medicinal Plant Cultivation & GACP",
];

/**
 * Curriculum-gap remediation. Keyed by the lowercase skill an employer asks
 * for; used to suggest a concrete elective or certification an institution
 * could add rather than just naming the gap. Every path is an AYUSH one —
 * clinical, pharmacy & quality, research, wellness, trade and digital health.
 */
const INTERVENTIONS = {
  // ASU&H drug manufacturing, quality & regulatory
  "gmp compliance": { elective: "Schedule T GMP for ASU&H Drug Manufacturing", type: "Certification" },
  gmp: { elective: "Schedule T GMP for ASU&H Drug Manufacturing", type: "Certification" },
  hptlc: { elective: "HPTLC Fingerprinting & Raw Drug Standardisation (API/UPI/SPI)", type: "Certification" },
  hplc: { elective: "HPTLC Fingerprinting & Raw Drug Standardisation (API/UPI/SPI)", type: "Certification" },
  pharmacovigilance: { elective: "AYUSH Pharmacovigilance & ADR Reporting (PvPI-AYUSH)", type: "Certification" },
  "raw drug authentication": { elective: "Pharmacognosy & Raw Drug Authentication Practical", type: "Certification" },
  pharmacognosy: { elective: "Pharmacognosy & Raw Drug Authentication Practical", type: "Certification" },
  "heavy metal testing": { elective: "ASU Drug Safety Testing: Heavy Metals, Microbial Load & Aflatoxins", type: "Certification" },
  "quality control": { elective: "ASU Drug Safety Testing: Heavy Metals, Microbial Load & Aflatoxins", type: "Certification" },
  "regulatory affairs": { elective: "AYUSH Drug Licensing, Schedule T & Export Documentation", type: "Certification" },
  "export documentation": { elective: "AYUSH Drug Licensing, Schedule T & Export Documentation", type: "Certification" },
  "ayush premium mark": { elective: "AYUSH Premium Mark & Product Certification Workshop", type: "Certification" },
  formulation: { elective: "Bhaishajya Kalpana & Modern Herbal Formulation Development", type: "Elective" },
  nutraceutical: { elective: "Bhaishajya Kalpana & Modern Herbal Formulation Development", type: "Elective" },
  "lab safety": { elective: "Good Laboratory Practice for ASU Drug Testing Labs", type: "Certification" },

  // Clinical practice & research
  panchakarma: { elective: "Panchakarma Procedures & Therapy Room Protocols", type: "Certification" },
  "nadi pariksha": { elective: "Ayurvedic Clinical Diagnostics (Nadi, Prakriti & Roga Pariksha)", type: "Elective" },
  "prakriti assessment": { elective: "Ayurvedic Clinical Diagnostics (Nadi, Prakriti & Roga Pariksha)", type: "Elective" },
  marma: { elective: "Marma & Varma Therapy Practicum", type: "Certification" },
  varma: { elective: "Marma & Varma Therapy Practicum", type: "Certification" },
  "regimenal therapy": { elective: "Unani Regimenal Therapy (Ilaj-bit-Tadbeer) incl. Hijama", type: "Certification" },
  hijama: { elective: "Unani Regimenal Therapy (Ilaj-bit-Tadbeer) incl. Hijama", type: "Certification" },
  repertory: { elective: "Homoeopathic Repertorisation & Case Taking", type: "Elective" },
  "case taking": { elective: "Homoeopathic Repertorisation & Case Taking", type: "Elective" },
  "clinical documentation": { elective: "AYUSH Case-Record Standards & NAMASTE Terminology Coding", type: "Elective" },
  "good clinical practice": { elective: "ICH-GCP & CTRI Registration for AYUSH Trials", type: "Certification" },
  "clinical trials": { elective: "ICH-GCP & CTRI Registration for AYUSH Trials", type: "Certification" },
  biostatistics: { elective: "Biostatistics & Research Methodology for AYUSH", type: "Elective" },
  "research methodology": { elective: "Biostatistics & Research Methodology for AYUSH", type: "Elective" },
  "public health": { elective: "National AYUSH Mission & Public Health Programmes", type: "Elective" },
  epidemiology: { elective: "National AYUSH Mission & Public Health Programmes", type: "Elective" },
  "diet & nutrition": { elective: "Pathya-Apathya, Naturopathic Diet & Clinical Nutrition", type: "Elective" },
  "patient counselling": { elective: "Patient Communication & Lifestyle Counselling for AYUSH Practice", type: "Elective" },

  // Yoga, Naturopathy & wellness
  "yoga therapy": { elective: "Yoga Therapy Protocols for Lifestyle Disorders (MDNIY syllabus)", type: "Certification" },
  "yoga instruction": { elective: "Certified Yoga Instructor (YCB Level 2) Preparation", type: "Certification" },
  "yoga certification board": { elective: "Certified Yoga Instructor (YCB Level 2) Preparation", type: "Certification" },
  hydrotherapy: { elective: "Naturopathic Treatment Modalities: Hydrotherapy, Mud & Fasting Therapy", type: "Certification" },
  "spa therapy": { elective: "AYUSH Wellness & Spa Therapy Operations", type: "Certification" },
  "wellness centre operations": { elective: "AYUSH Wellness & Spa Therapy Operations", type: "Certification" },

  // Cultivation & trade
  gacp: { elective: "GACP for Medicinal Plants & NMPB Cultivation Standards", type: "Certification" },
  "medicinal plant cultivation": { elective: "GACP for Medicinal Plants & NMPB Cultivation Standards", type: "Certification" },
  "herbal supply chain": { elective: "Medicinal Plant Supply Chain & Raw Drug Procurement", type: "Elective" },
  "supply chain": { elective: "Medicinal Plant Supply Chain & Raw Drug Procurement", type: "Elective" },
  "inventory management": { elective: "Medicinal Plant Supply Chain & Raw Drug Procurement", type: "Elective" },

  // Digital health & data
  teleconsultation: { elective: "AYUSH Telemedicine Practice Guidelines & eSanjeevani-AYUSH", type: "Certification" },
  esanjeevani: { elective: "AYUSH Telemedicine Practice Guidelines & eSanjeevani-AYUSH", type: "Certification" },
  "digital health records": { elective: "Ayush Grid, ABDM & Electronic Health Records for AYUSH", type: "Certification" },
  abdm: { elective: "Ayush Grid, ABDM & Electronic Health Records for AYUSH", type: "Certification" },
  namaste: { elective: "AYUSH Case-Record Standards & NAMASTE Terminology Coding", type: "Elective" },
  "data analysis": { elective: "Health Data Analysis & Dashboarding for AYUSH Programmes", type: "Elective" },
  "data visualisation": { elective: "Health Data Analysis & Dashboarding for AYUSH Programmes", type: "Elective" },
  excel: { elective: "Health Data Analysis & Dashboarding for AYUSH Programmes", type: "Elective" },
  sql: { elective: "Health Informatics Foundations for AYUSH Telemedicine Platforms", type: "Certification" },
  python: { elective: "Health Informatics Foundations for AYUSH Telemedicine Platforms", type: "Certification" },
  react: { elective: "Health Informatics Foundations for AYUSH Telemedicine Platforms", type: "Certification" },

  // Communication
  communication: { elective: "Professional Communication & Case Presentation for AYUSH Graduates", type: "Elective" },
  presentations: { elective: "Professional Communication & Case Presentation for AYUSH Graduates", type: "Elective" },
  sanskrit: { elective: "Applied Sanskrit for Samhita Reading", type: "Elective" },
};

export function suggestIntervention(skill) {
  const key = String(skill || "").toLowerCase();
  if (INTERVENTIONS[key]) return INTERVENTIONS[key];
  const partial = Object.keys(INTERVENTIONS).find((k) => key.includes(k) || k.includes(key));
  if (partial) return INTERVENTIONS[partial];
  return { elective: `Short-term certification in ${skill}`, type: "Certification" };
}

/** Course levels a community or a cohort can be for (NCISM / NCH programmes). */
export const COURSE_LEVELS = ["BAMS", "BUMS", "BSMS", "BHMS", "BNYS", "BSRMS", "B.Pharm (Ayu)", "MD/MS (Ayu)", "MD (Hom)", "MD (Unani)", "PhD", "PG Diploma", "Certificate course"];
