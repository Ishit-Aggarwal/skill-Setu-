/* ============================================================
   Verification Registry (Admin-Managed)
   Validates Teacher Codes, Company Codes, and Institute Codes
   used to verify academician / industry / institution signups.

   The registry covers the AYUSH ecosystem: the national institutes
   and universities under the Ministry of AYUSH, the ASU&H drug
   manufacturers, the research councils (CCRAS, CCRYN, CCRUM, CCRS,
   CCRH) and the wellness and export trade that hire from them.

   These codes are checked SERVER-SIDE at registration (see
   convex/_lib/verification.js). The signup form validates them too,
   but only for immediate feedback — that check decides nothing.
   ============================================================ */

export const REGISTRY = {
  teacherCodes: {
    "APEX-FAC-2026": { name: "Dr. Shalini Kulkarni", institution: "All India Institute of Ayurveda (AIIA), New Delhi", dept: "Dravyaguna & Pharmacognosy" },
    "SIT-FAC-3301": { name: "Prof. Ramesh Iyer", institution: "National Institute of Ayurveda (NIA), Jaipur", dept: "Ayurveda (BAMS)" },
    "NSM-FAC-5520": { name: "Dr. Geeta Krishnan", institution: "Institute of Teaching & Research in Ayurveda (ITRA), Jamnagar", dept: "Rasashastra & Bhaishajya Kalpana" },
    "CUSD-FAC-6104": { name: "Prof. Alan Mathew", institution: "Morarji Desai National Institute of Yoga (MDNIY), New Delhi", dept: "Yoga Therapy (PG Diploma)" },
    "NIMS-FAC-1002": { name: "Dr. Anil Trivedi", institution: "National Institute of Homoeopathy (NIH), Kolkata", dept: "Homoeopathy (BHMS)" },
    "GNLU-FAC-4091": { name: "Prof. K. S. Mukherjee", institution: "National Institute of Unani Medicine (NIUM), Bengaluru", dept: "Unani (BUMS)" },
    "SAUT-FAC-7714": { name: "Dr. S. Karthik", institution: "National Institute of Siddha (NIS), Chennai", dept: "Siddha (BSMS)" },
    "DCAP-FAC-8812": { name: "Prof. Nusrat Jahan", institution: "Gujarat Ayurved University, Jamnagar", dept: "Panchakarma (PG Diploma)" },
  },
  companyCodes: {
    "APEX-IND-2026": { company: "Dabur India Ltd.", sector: "ASU&H Drug Manufacturing & GMP" },
    "MERIDIAN-IND-9912": { company: "Patanjali Ayurved Ltd.", sector: "ASU&H Drug Manufacturing & GMP" },
    "ANVAYA-IND-7731": { company: "Himalaya Wellness Company", sector: "Herbal Formulation & Nutraceutical R&D" },
    "SHAKTI-IND-1140": { company: "Baidyanath Group", sector: "ASU&H Drug Manufacturing & GMP" },
    "MEGHDOOT-IND-6602": { company: "Emami / Zandu Ayurvedic Pharmacy", sector: "ASU&H Drug Manufacturing & GMP" },
    "INDIGO-IND-2288": { company: "Kerala Ayurveda Ltd.", sector: "AYUSH Wellness & Spa" },
    "AROGYA-IND-4455": { company: "Arya Vaidya Sala, Kottakkal", sector: "Ayurveda" },
    "NUCLEUS-IND-1902": { company: "Vaidyaratnam Oushadhasala", sector: "Panchakarma & Therapy Centres" },
    "KAVERI-IND-8821": { company: "Sri Sri Tattva", sector: "AYUSH Export & Trade" },
    "CSIR-IND-4019": { company: "Central Council for Research in Ayurvedic Sciences (CCRAS)", sector: "AYUSH Clinical Research" },
    "VOLTA-IND-3310": { company: "Central Council for Research in Yoga & Naturopathy (CCRYN)", sector: "Yoga & Naturopathy" },
    "SANJ-IND-5502": { company: "Jiva Ayurveda", sector: "AYUSH Telemedicine & Health-Tech" },
    "LEXIS-IND-2204": { company: "Charak Pharma", sector: "Regulatory Affairs & AYUSH Drug Licensing" },
    "TCS-IND-1001": { company: "Hamdard Laboratories (India)", sector: "Unani" },
    "INFY-IND-1002": { company: "SKM Siddha & Ayurveda Company", sector: "Siddha" },
    "WIPRO-IND-1003": { company: "Dr. Willmar Schwabe India", sector: "Homoeopathy" },
    "HDFC-IND-1004": { company: "SBL Homoeopathy", sector: "Homoeopathy" },
    "ICICI-IND-1005": { company: "Ayurvedic Pharmacopoeia Committee — PCIM&H, Ghaziabad", sector: "AYUSH R&D & Standardisation" },
    "TATAMTR-IND-1006": { company: "National Medicinal Plants Board (NMPB)", sector: "Medicinal Plant Cultivation (GACP)" },
    "LT-IND-1007": { company: "AYUSH Export Promotion Council (AYUSHEXCIL)", sector: "AYUSH Export & Trade" },
    "DRREDDY-IND-1008": { company: "Central Council for Research in Unani Medicine (CCRUM)", sector: "AYUSH Clinical Research" },
  },
  instituteCodes: {
    "APEX-INST-2026": { institution: "All India Institute of Ayurveda (AIIA), New Delhi", city: "New Delhi", state: "Delhi" },
    "SIT-INST-006": { institution: "National Institute of Ayurveda (NIA), Jaipur", city: "Jaipur", state: "Rajasthan" },
    "NSM-INST-007": { institution: "Institute of Teaching & Research in Ayurveda (ITRA), Jamnagar", city: "Jamnagar", state: "Gujarat" },
    "CUSD-INST-008": { institution: "Morarji Desai National Institute of Yoga (MDNIY), New Delhi", city: "New Delhi", state: "Delhi" },
    "NIMS-INST-002": { institution: "National Institute of Homoeopathy (NIH), Kolkata", city: "Kolkata", state: "West Bengal" },
    "GNLU-INST-003": { institution: "National Institute of Unani Medicine (NIUM), Bengaluru", city: "Bengaluru", state: "Karnataka" },
    "SAUT-INST-004": { institution: "National Institute of Siddha (NIS), Chennai", city: "Chennai", state: "Tamil Nadu" },
    "DCAP-INST-005": { institution: "Gujarat Ayurved University, Jamnagar", city: "Jamnagar", state: "Gujarat" },
  },
};

export function validateTeacherCode(code) {
  if (!code) return { valid: false, message: "Teacher Code / Reference Number is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.teacherCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Teacher Code / Reference Number. Please check the code provided by your institution (format: XXXX-FAC-NNNN)." };
}

export function validateCompanyCode(code) {
  if (!code) return { valid: false, message: "Company Partner Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.companyCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Company Partner Code. Please check the code provided by your organisation (format: XXXX-IND-NNNN)." };
}

export function validateInstituteCode(code) {
  if (!code) return { valid: false, message: "Institute Verification Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.instituteCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Institute Verification Code. Please check the code provided by your institution (format: XXXX-INST-NNN)." };
}
