/** Which assessed skill domain best predicts readiness for a posting's sector. */
const DOMAIN_TO_SKILL = {
  // AYUSH
  Ayurveda: "Ayurveda & Panchakarma",
  "Panchakarma & Wellness Therapy": "Ayurveda & Panchakarma",
  "Yoga & Naturopathy": "Yoga & Naturopathy",
  "Unani Medicine": "Unani, Siddha & Homeopathy",
  "Siddha Medicine": "Unani, Siddha & Homeopathy",
  Homeopathy: "Unani, Siddha & Homeopathy",
  "Ayush Pharmaceuticals & Nutraceuticals": "Ayush Pharmacology & Formulation",
  "Ayush Diagnostics & Lab Sciences": "Ayush Pharmacology & Formulation",
  "Ayush Clinical Research": "Research & Clinical Documentation",
  "Ayush Public Health & Administration": "Research & Clinical Documentation",
  "Wellness Tourism & Spa Management": "Business & Communication",
  // Healthcare & life sciences
  "Healthcare & Hospital Administration": "Business & Communication",
  "Pharmaceuticals & Biotechnology": "Ayush Pharmacology & Formulation",
  "Medical Devices & Diagnostics": "Research & Clinical Documentation",
  "Public Health & Nutrition": "Research & Clinical Documentation",
  "Digital Health & Health Informatics": "Programming & Digital Fundamentals",
  // Technology, industry & services
  "Information Technology & Software": "Programming & Digital Fundamentals",
  "Data Science & AI": "Programming & Digital Fundamentals",
  "Manufacturing & Core Engineering": "Quantitative Aptitude",
  "Civil & Infrastructure": "Quantitative Aptitude",
  "Banking, Finance & Insurance": "Quantitative Aptitude",
  "Consulting & Strategy": "Business & Communication",
  "Marketing & Advertising": "Business & Communication",
  "Design & Creative": "Business & Communication",
  "Sales & Business Development": "Business & Communication",
  "Human Resources": "Business & Communication",
  "Legal & Compliance": "Verbal Ability",
  "Media & Communications": "Verbal Ability",
  "Supply Chain & Logistics": "Quantitative Aptitude",
  "Education & Training": "Verbal Ability",
  "Agriculture & Agri-business": "Research & Clinical Documentation",
  "Energy & Sustainability": "Quantitative Aptitude",
  "Government & Public Policy": "Verbal Ability",
  "Quality Control & Regulatory Affairs": "Ayush Pharmacology & Formulation",
  "Research & Development": "Research & Clinical Documentation",
};

/** Skill tags that map onto an assessed domain, for postings without a clean sector match. */
const TAG_TO_SKILL = [
  [/panchakarma|snehana|swedana|basti|ayurved|kayachikitsa/i, "Ayurveda & Panchakarma"],
  [/dravyaguna|rasashastra|pharmacognosy|hptlc|gmp|formulation|pharmacovigilance/i, "Ayush Pharmacology & Formulation"],
  [/yoga|naturopath|asana|pranayama/i, "Yoga & Naturopathy"],
  [/unani|siddha|homeopath|repertor|materia medica|case taking/i, "Unani, Siddha & Homeopathy"],
  [/clinical trial|good clinical practice|gcp|biostatistics|research method|epidemiolog|documentation|public health/i, "Research & Clinical Documentation"],
  [/react|javascript|node|python|sql|api|cloud|devops|cyber|machine learning|data science|informatics|teleconsultation|health records/i, "Programming & Digital Fundamentals"],
  [/excel|financial|valuation|risk|accounting|statistics|autocad|solidworks|gd&t|supply chain|logistics|inventory|quality control|six sigma/i, "Quantitative Aptitude"],
  [/counsel|communication|presentation|hospitality|spa|marketing|sales|negotiat|stakeholder|client/i, "Business & Communication"],
  [/writing|content|editing|research report|policy|legal|compliance/i, "Verbal Ability"],
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
