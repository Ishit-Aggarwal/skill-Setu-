/** Which assessed skill domain best predicts readiness for a posting's sector. */
const DOMAIN_TO_SKILL = {
  // Clinical systems of medicine
  Ayurveda: "ASU&H Clinical Fundamentals",
  "Yoga & Naturopathy": "ASU&H Clinical Fundamentals",
  Unani: "ASU&H Clinical Fundamentals",
  Siddha: "ASU&H Clinical Fundamentals",
  Homoeopathy: "ASU&H Clinical Fundamentals",
  "Sowa-Rigpa": "ASU&H Clinical Fundamentals",
  "Traditional & Integrative Medicine": "ASU&H Clinical Fundamentals",
  "Allied Health & Clinical Care": "ASU&H Clinical Fundamentals",
  "Panchakarma & Therapy Centres": "ASU&H Clinical Fundamentals",
  "AYUSH Wellness & Spa": "ASU&H Clinical Fundamentals",

  // ASU&H drug industry — manufacturing, quality, pharmacognosy
  "ASU&H Drug Manufacturing & GMP": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Herbal Formulation & Nutraceutical R&D": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Pharmacognosy & Raw Drug Authentication": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Medicinal Plant Cultivation (GACP)": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Pharmaceuticals & Biotechnology": "Herbal Drug Quality, GMP & Pharmacognosy",
  "Biotechnology & Life Sciences": "Herbal Drug Quality, GMP & Pharmacognosy",

  // Research, regulation & public health
  "AYUSH Clinical Research": "AYUSH Research & Clinical Documentation",
  "AYUSH R&D & Standardisation": "AYUSH Research & Clinical Documentation",
  "AYUSH Pharmacovigilance": "AYUSH Research & Clinical Documentation",
  "Research & Development": "AYUSH Research & Clinical Documentation",
  "Regulatory Affairs & AYUSH Drug Licensing": "AYUSH Practice Management & Ethics",
  "AYUSH Public Health & Administration": "AYUSH Practice Management & Ethics",
  "AYUSH Education & Training": "Verbal Communication",
  "AYUSH Export & Trade": "AYUSH Practice Management & Ethics",

  // Digital health
  "AYUSH Telemedicine & Health-Tech": "AYUSH Digital Health & Telemedicine",
  "AYUSH Health Informatics & Data": "Data Analysis & Interpretation",
  "Digital Health & Health Informatics": "AYUSH Digital Health & Telemedicine",
  "Information Technology & Software": "AYUSH Digital Health & Telemedicine",
  "Data Science & AI": "Data Analysis & Interpretation",
};

/** Skill tags that map onto an assessed domain, for postings without a clean sector match. */
const TAG_TO_SKILL = [
  // Order matters — .find() takes the first match, so the two applied axes are
  // tested before the generic catch-alls that would otherwise absorb a
  // Panchakarma or a pharmacognosy posting into "Research & Documentation".
  [/gmp|hptlc|hplc|pharmacognos|raw drug|bhasma|rasashastra|bhaishajya|formulation|heavy metal|schedule t|pharmacopoeia|gacp|medicinal plant|nutraceutical|quality control/i, "Herbal Drug Quality, GMP & Pharmacognosy"],
  [/panchakarma|nadi|prakriti|marma|varma|hijama|regimenal|repertor|materia medica|case taking|clinical|patient|yoga|naturopath|hydrotherap|dosha|samhita|abhyanga|shirodhara|kayachikitsa|therap/i, "ASU&H Clinical Fundamentals"],
  [/telemedicine|teleconsult|esanjeevani|ayush grid|abdm|abha|namaste|digital health|health records|ehr|react|javascript|typescript|node|python|sql|api|cloud|software|frontend|backend/i, "AYUSH Digital Health & Telemedicine"],
  [/data|analytics|biostatistics|dashboard|visualisation|visualization|excel|power bi|tableau|epidemiolog/i, "Data Analysis & Interpretation"],
  [/math|quantitative|dosage|stock|inventory|costing|supply chain/i, "Quantitative Aptitude"],
  [/logic|reasoning|problem solving|optimization/i, "Logical Reasoning"],
  [/critical thinking|troubleshoot|operations|process improvement/i, "Problem Solving & Critical Thinking"],
  [/ncism|nch|licensing|regulatory|export|documentation associate|practice management|ethics|management|leadership|client|stakeholder|counselling|hospital administration/i, "AYUSH Practice Management & Ethics"],
  [/communication|presentation|writing|verbal|public speaking|content|sanskrit|teaching|training/i, "Verbal Communication"],
  [/research|gcp|ctri|trials|paper|publication|methodology|pharmacovigilance|adr|case record|crf|documentation/i, "AYUSH Research & Clinical Documentation"],
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
 * A posting can restrict itself to a minimum skill score and to specific
 * departments, so applications arrive pre-filtered rather than being screened
 * out by hand afterwards.
 *
 * It can no longer restrict itself to a named list of institutions. That
 * filter did nothing a department or a score requirement doesn't do better,
 * and it silently hid roles from students whose institution was spelled
 * differently by the recruiter — a candidate was told "restricted to specific
 * partner institutions" because someone typed the campus name with a comma in
 * it. Any `eligibleInstitutions` still on an old record is ignored.
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
  return { eligible: reasons.length === 0, reasons };
}

/**
 * Salvages a date that was stored with a malformed year.
 *
 * A native date input accepts years far beyond four digits, so records exist
 * carrying values like "20261-05-12". Rendering those as "Invalid Date" helps
 * nobody, so the year is clamped back to four digits here as well as being
 * prevented at the input (see Kit's TextInput). Anything still unparseable
 * returns null — the callers each decide what that means for them.
 */
function cleanDateInput(value) {
  if (!value) return null;
  let str = String(value).trim();
  const m = str.match(/^(\d{5,})(-.*)?$/);
  if (m) {
    str = m[1].slice(0, 4) + (m[2] || "");
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() > 2099) {
    d.setFullYear(Number(String(d.getFullYear()).slice(0, 4)) || new Date().getFullYear());
  }
  return d;
}

/**
 * Days from today until `dateStr`. `Infinity` when there is no usable date.
 *
 * Not 0. Every caller treats 0 as "closes today" and paints it red, so a
 * posting with a missing or corrupt deadline was being shown as the most
 * urgent thing on the page. Infinity is the honest answer — no known deadline
 * is no deadline pressure — and it also behaves correctly in the comparisons
 * callers already make: `<= 10` is false, `< 0` is false, and an ascending
 * sort puts unknowns last rather than first. `null` would have done none of
 * that, because `null >= 0` is true.
 */
export function daysUntil(dateStr) {
  const target = cleanDateInput(dateStr);
  if (!target) return Infinity;
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  return diff;
}

export function formatDate(dateStr) {
  const d = cleanDateInput(dateStr);
  if (!d) return String(dateStr || "");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  const d = cleanDateInput(value);
  if (!d) return String(value || "—");
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
