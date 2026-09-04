/** Which assessed skill domain best predicts readiness for a posting's sector. */
const DOMAIN_TO_SKILL = {
  // Technology, software & data
  "Information Technology & Software": "Programming & Digital Fundamentals",
  "Data Science & AI": "Data Analysis & Interpretation",
  "Data Science & Artificial Intelligence": "Data Analysis & Interpretation",
  "Digital Health & Health Informatics": "Programming & Digital Fundamentals",

  // Core engineering & industry
  "Manufacturing & Core Engineering": "Quantitative Aptitude",
  "Civil & Infrastructure": "Quantitative Aptitude",
  "Energy & Sustainability": "Quantitative Aptitude",
  "Supply Chain & Logistics": "Quantitative Aptitude",
  "Quality Control & Regulatory Affairs": "Problem Solving & Critical Thinking",

  // Business, finance & management
  "Banking, Finance & Insurance": "Quantitative Aptitude",
  "Consulting & Strategy": "Business & Professional Dynamics",
  "Marketing & Advertising": "Business & Professional Dynamics",
  "Sales & Business Development": "Business & Professional Dynamics",
  "Human Resources": "Business & Professional Dynamics",
  "Design & Creative": "Problem Solving & Critical Thinking",

  // Healthcare, pharma & biotechnology
  "Healthcare & Hospital Administration": "Business & Professional Dynamics",
  "Pharmaceuticals & Biotechnology": "Research & Documentation",
  "Biotechnology & Life Sciences": "Research & Documentation",
  "Medical Devices & Diagnostics": "Problem Solving & Critical Thinking",
  "Public Health & Nutrition": "Research & Documentation",

  // Communication & policy
  "Legal & Compliance": "Verbal Communication",
  "Media & Communications": "Verbal Communication",
  "Education & Training": "Verbal Communication",
  "Government & Public Policy": "Verbal Communication",
  "Research & Development": "Research & Documentation",
  "Agriculture & Agri-business": "Research & Documentation",

  // Traditional systems
  Ayurveda: "Research & Documentation",
  "Panchakarma & Wellness Therapy": "Problem Solving & Critical Thinking",
  "Yoga & Naturopathy": "Problem Solving & Critical Thinking",
  "Unani Medicine": "Research & Documentation",
  "Siddha Medicine": "Research & Documentation",
  Homeopathy: "Research & Documentation",
  "Ayush Pharmaceuticals & Nutraceuticals": "Data Analysis & Interpretation",
  "Ayush Diagnostics & Lab Sciences": "Data Analysis & Interpretation",
  "Ayush Clinical Research": "Research & Documentation",
  "Ayush Public Health & Administration": "Research & Documentation",
  "Wellness Tourism & Spa Management": "Business & Professional Dynamics",
};

/** Skill tags that map onto an assessed domain, for postings without a clean sector match. */
const TAG_TO_SKILL = [
  [/react|javascript|typescript|node|python|sql|api|cloud|aws|docker|devops|cyber|mobile|frontend|backend|software|c\+\+|java/i, "Programming & Digital Fundamentals"],
  [/data|analytics|machine learning|deep learning|ai|biostatistics|dashboard|visualization|power bi|tableau/i, "Data Analysis & Interpretation"],
  [/math|quantitative|calculus|financial|valuation|accounting|cad|autocad|solidworks|gd&t|supply chain/i, "Quantitative Aptitude"],
  [/logic|reasoning|algorithms|dsa|system design|optimization|problem solving/i, "Logical Reasoning"],
  [/critical thinking|troubleshoot|diagnos|panchakarma|therapy|operations|process improvement/i, "Problem Solving & Critical Thinking"],
  [/business|management|marketing|sales|leadership|negotiat|client|stakeholder|hr|consulting|agile/i, "Business & Professional Dynamics"],
  [/communication|presentation|writing|verbal|public speaking|content|editorial|documentation/i, "Verbal Communication"],
  [/research|clinical|gcp|trials|paper|publication|methodology|epidemiology|pharma|bioinformatics|assay|formulation|dravyaguna|gmp/i, "Research & Documentation"],
];

function relevantSkillFor(internship) {
  const bySector = DOMAIN_TO_SKILL[internship?.domain];
  if (bySector) return bySector;
  const tags = (internship?.tags || []).join(" ");
  const hit = TAG_TO_SKILL.find(([re]) => re.test(tags));
  return hit ? hit[1] : null;
}

export function computeMatch(internship, assessment) {
  if (!assessment) return 65;
  const skill = relevantSkillFor(internship);
  const focused = skill != null ? assessment.domainScores?.[skill] : null;
  const base = focused != null ? (focused * 2 + assessment.overallScore) / 3 : assessment.overallScore;
  return Math.max(40, Math.min(99, Math.round(base)));
}

/** Which of a posting's required skills the student's portfolio does/doesn't cover yet. */
export function computeSkillGap(internship, portfolio) {
  const required = internship.tags || [];
  const known = new Set();
  Object.values(portfolio?.skillBadges || {}).forEach((skills) =>
    (skills || []).forEach((s) => known.add(s.name.toLowerCase()))
  );
  const matched = required.filter((t) => known.has(t.toLowerCase()));
  const missing = required.filter((t) => !known.has(t.toLowerCase()));
  return { matched, missing };
}

/**
 * A posting can restrict itself to a minimum skill score, specific departments
 * and specific institutions, so applications arrive pre-filtered rather than
 * being screened out by hand afterwards.
 */
export function checkEligibility(internship, student, assessment) {
  const reasons = [];
  const minScore = internship.minSkillScore;
  if (minScore) {
    const score = assessment ? Math.round(assessment.overallScore) : null;
    if (score == null) reasons.push(`Requires a skill score of ${minScore}+ — take a skill test first.`);
    else if (score < minScore) reasons.push(`Requires a skill score of ${minScore}+ (yours is ${score}).`);
  }
  const depts = internship.eligibleDepartments || [];
  if (depts.length && student?.department && !depts.includes(student.department)) {
    reasons.push(`Open to ${depts.join(", ")} only.`);
  }
  const insts = internship.eligibleInstitutions || [];
  if (insts.length && student?.institution && !insts.includes(student.institution)) {
    reasons.push("Restricted to specific partner institutions.");
  }
  return { eligible: reasons.length === 0, reasons };
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  return diff;
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "—";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function relativeTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** Public view of the tag → assessed-domain mapping, used by curriculum views. */
export function skillDomainForTag(tag) {
  const hit = TAG_TO_SKILL.find(([re]) => re.test(String(tag || "")));
  return hit ? hit[1] : null;
}
