/**
 * The sector taxonomy for the whole platform.
 *
 * Skill Setu is a general academia–industry portal serving every field
 * equally: engineering, computer science, business, finance, design, core
 * sciences, humanities, law, agriculture and healthcare. No sector is the
 * platform default, and none is modelled in more detail than the rest.
 *
 * That last rule is load-bearing. An earlier version of this file split one
 * vertical into eleven sub-sectors while every other industry got a single
 * entry, so that vertical looked like the platform's subject purely by how
 * much of the filter row it occupied. Any list here that gives one field more
 * entries than its peers, or lists it ahead of them for a reason other than
 * alphabetical or cluster order, is a bug.
 */

export const HEALTH_DOMAINS = [
  "Healthcare & Hospital Administration",
  "Pharmaceuticals & Biotechnology",
  "Medical Devices & Diagnostics",
  "Public Health & Nutrition",
  "Digital Health & Health Informatics",
  "Allied Health & Clinical Care",
  "Wellness, Fitness & Preventive Health",
];

export const GENERAL_DOMAINS = [
  "Information Technology & Software",
  "Data Science & AI",
  "Telecommunications & Networking",
  "Manufacturing & Core Engineering",
  "Civil & Infrastructure",
  "Real Estate & Construction",
  "Banking, Finance & Insurance",
  "Consulting & Strategy",
  "Marketing & Advertising",
  "Design & Creative",
  "Sales & Business Development",
  "Human Resources",
  "Legal & Compliance",
  "Media & Communications",
  "Supply Chain & Logistics",
  "Hospitality, Travel & Tourism",
  "Education & Training",
  "Agriculture & Agri-business",
  "Energy & Sustainability",
  "Government & Public Policy",
  "Quality Control & Regulatory Affairs",
  "Research & Development",
];

export const ALL_DOMAINS = [...GENERAL_DOMAINS, ...HEALTH_DOMAINS];

/**
 * Sectors clustered by what the work actually is, for collapsible filters and
 * <optgroup> lists. Five peer clusters of comparable size — none of them the
 * default, none of them expanded first, and none of them a single industry
 * broken out into its own row.
 */
export const SECTOR_CLUSTERS = [
  {
    id: "technology",
    label: "Technology & Data",
    items: [
      "Information Technology & Software",
      "Data Science & AI",
      "Telecommunications & Networking",
      "Research & Development",
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare & Wellness",
    items: [
      "Healthcare & Hospital Administration",
      "Pharmaceuticals & Biotechnology",
      "Medical Devices & Diagnostics",
      "Public Health & Nutrition",
      "Digital Health & Health Informatics",
      "Allied Health & Clinical Care",
      "Wellness, Fitness & Preventive Health",
    ],
  },
  {
    id: "business",
    label: "Business & Government",
    items: [
      "Banking, Finance & Insurance",
      "Consulting & Strategy",
      "Marketing & Advertising",
      "Sales & Business Development",
      "Human Resources",
      "Legal & Compliance",
      "Supply Chain & Logistics",
      "Hospitality, Travel & Tourism",
      "Education & Training",
      "Government & Public Policy",
      "Quality Control & Regulatory Affairs",
    ],
  },
  {
    id: "engineering",
    label: "Engineering & Manufacturing",
    items: [
      "Manufacturing & Core Engineering",
      "Civil & Infrastructure",
      "Real Estate & Construction",
      "Energy & Sustainability",
      "Agriculture & Agri-business",
    ],
  },
  {
    id: "design",
    label: "Design & Creative",
    items: ["Design & Creative", "Media & Communications"],
  },
];

/** Grouped for <optgroup> in role creation and sector filtering. */
export const DOMAIN_GROUPS = SECTOR_CLUSTERS.map(({ label, items }) => ({ label, items }));

/**
 * Sector names that older records (and a couple of seeded postings) used before
 * the taxonomy settled. Without this, "Data Science & AI" and "Data Science &
 * Artificial Intelligence" both appeared as separate filter pills for what is
 * one sector.
 */
export const DOMAIN_ALIASES = {
  "Data Science & Artificial Intelligence": "Data Science & AI",
  "Biotechnology & Life Sciences": "Pharmaceuticals & Biotechnology",
  /* The eleven single-vertical sub-sectors this taxonomy used to carry, folded
     back onto neutral peers. A posting published before the rebalance still
     resolves to a sector that exists, and no one field can occupy a third of
     the filter row again. */
  "Traditional & Integrative Medicine": "Allied Health & Clinical Care",
  Ayurveda: "Allied Health & Clinical Care",
  "Unani Medicine": "Allied Health & Clinical Care",
  "Siddha Medicine": "Allied Health & Clinical Care",
  Homeopathy: "Allied Health & Clinical Care",
  "Yoga & Naturopathy": "Wellness, Fitness & Preventive Health",
  "Panchakarma & Wellness Therapy": "Wellness, Fitness & Preventive Health",
  "Wellness Tourism & Spa Management": "Hospitality, Travel & Tourism",
  "Ayush Pharmaceuticals & Nutraceuticals": "Pharmaceuticals & Biotechnology",
  "Ayush Clinical Research": "Research & Development",
  "Ayush Diagnostics & Lab Sciences": "Medical Devices & Diagnostics",
  "Ayush Public Health & Administration": "Public Health & Nutrition",
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
  "Allied Health & Clinical Care": "#3C8A6B",
  "Traditional & Integrative Medicine": "#3C8A6B",
  "Wellness, Fitness & Preventive Health": "#6B7C3C",
  "Hospitality, Travel & Tourism": "#8A3C6B",
  "Real Estate & Construction": "#7A6A3C",
  "Telecommunications & Networking": "#3C5A8A",
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

/** The tiles on the landing page's sector strip — balanced cross-section of all industries. */
export const LANDING_SECTORS = [
  { abbr: "IT", full: "Software, Data & AI" },
  { abbr: "MF", full: "Manufacturing & Core Engineering" },
  { abbr: "FN", full: "Finance, Consulting & Business" },
  { abbr: "HC", full: "Healthcare & Life Sciences" },
  { abbr: "LW", full: "Law, Policy & Public Service" },
  { abbr: "DS", full: "Design, Media & Creative" },
  { abbr: "AG", full: "Agriculture & Sustainability" },
  { abbr: "RD", full: "Research, Policy & Training" },
];

/**
  Academic departments, across every faculty a multidisciplinary campus runs.

  Deliberately even-handed: no faculty is broken into more entries than its
  peers. The department list drives eligibility filters, roster grouping and
  the cohort heatmap, so one over-detailed faculty distorts all three.
 */
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
  "Medicine & Health Sciences",
  "Electrical & Electronics Engineering",
  "Chemical Engineering",
  "Physics, Chemistry & Mathematics",
  "Architecture & Planning",
  "Humanities & Social Sciences",
  "Law & Legal Studies",
  "Agriculture & Food Technology",
  "Hotel Management & Hospitality",
  "Media, Journalism & Communication",
];

/** Faculties charted on the health-sciences rubric. */
export const HEALTH_DEPARTMENTS = [
  "Life Sciences & Biotechnology",
  "Pharmacy (B.Pharm)",
  "Nursing & Allied Health",
  "Medicine & Health Sciences",
  "Agriculture & Food Technology",
];

/** Faculties charted on the design rubric. */
export const DESIGN_DEPARTMENTS = [
  "Design & Applied Arts",
  "Architecture & Planning",
  "Media, Journalism & Communication",
];

export const DEPARTMENTS = GENERAL_DEPARTMENTS;

/** Which skill domain each department is expected to be strongest in. */
export const DEPARTMENT_CORE_SKILL = {
  "Computer Science & Engineering": "Programming & Digital Fundamentals",
  "Electronics & Communication": "Programming & Digital Fundamentals",
  "Mechanical Engineering": "Quantitative Aptitude",
  "Civil Engineering": "Quantitative Aptitude",
  "Management Studies (MBA)": "Business & Professional Dynamics",
  "Commerce & Economics": "Data Analysis & Interpretation",
  "Life Sciences & Biotechnology": "Health & Life Sciences",
  "Design & Applied Arts": "Design & Visual Thinking",
  "Pharmacy (B.Pharm)": "Health & Life Sciences",
  "Nursing & Allied Health": "Health & Life Sciences",
  "Medicine & Health Sciences": "Health & Life Sciences",
  "Electrical & Electronics Engineering": "Programming & Digital Fundamentals",
  "Chemical Engineering": "Quantitative Aptitude",
  "Physics, Chemistry & Mathematics": "Quantitative Aptitude",
  "Architecture & Planning": "Design & Visual Thinking",
  "Humanities & Social Sciences": "Verbal Communication",
  "Law & Legal Studies": "Verbal Communication",
  "Agriculture & Food Technology": "Health & Life Sciences",
  "Hotel Management & Hospitality": "Business & Professional Dynamics",
  "Media, Journalism & Communication": "Design & Visual Thinking",
};

export const INSTITUTION_TYPES = [
  "Central University / IIT / NIT",
  "State University",
  "Deemed University",
  "Autonomous Engineering & Technology Institute",
  "Government College / University",
  "Affiliated Private College",
  "National Institute of Medical & Health Sciences",
  "Institute of National Importance",
];

export const ACCREDITATION_BODIES = ["NAAC", "NBA", "AICTE", "UGC", "NIRF", "BCI", "COA", "ICAR", "PCI", "NMC"];

export const COLLAB_EXPERTISE = [
  "Machine Learning & Data Science",
  "Cloud Platforms & Distributed Systems",
  "Biotechnology & Molecular Biology",
  "Materials & Manufacturing Processes",
  "Renewable Energy & Sustainability",
  "Economics & Public Policy",
  "Human-Centred Design & UI/UX",
  "Clinical Trials & Good Clinical Practice",
  "Public Health & Epidemiology",
  "Analytical Chemistry & Standardisation",
  "Robotics & Control Systems",
  "Structural & Geotechnical Engineering",
  "Behavioural & Social Research",
  "Agricultural & Food Science",
];

/**
 * Curriculum-gap remediation. Keyed by the lowercase skill an employer asks
 * for; used to suggest a concrete elective or certification an institution
 * could add rather than just naming the gap. Cross-industry throughout — no
 * single field gets more remediation paths than the others.
 */
const INTERVENTIONS = {
  // Manufacturing, quality & regulatory
  "gmp compliance": { elective: "GMP & Good Manufacturing Practice for Production Units", type: "Certification" },
  hplc: { elective: "Instrumental Analysis & Laboratory QC (HPLC/GC)", type: "Certification" },
  pharmacovigilance: { elective: "Pharmacovigilance & Adverse Event Reporting", type: "Certification" },
  "lab safety": { elective: "Laboratory Safety & Good Laboratory Practice", type: "Certification" },

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
  "digital health records": { elective: "Health Informatics & EHR Interoperability Standards", type: "Certification" },
  teleconsultation: { elective: "Health Informatics & EHR Interoperability Standards", type: "Certification" },

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
