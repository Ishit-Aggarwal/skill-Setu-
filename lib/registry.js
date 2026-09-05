/* ============================================================
   Verification Registry (Admin-Managed)
   Validates Teacher Codes, Company Codes, and Institute Codes
   used to verify academician / industry / institution signups.

   The registry spans every sector the platform serves — technology,
   engineering, finance, design, healthcare, law, agriculture and hospitality
   alike. No sector is listed first or given more entries than another.

   These codes are checked SERVER-SIDE at registration (see
   convex/_lib/verification.js). The signup form validates them too,
   but only for immediate feedback — that check decides nothing.
   ============================================================ */

export const REGISTRY = {
  teacherCodes: {
    "APEX-FAC-2026": { name: "Dr. Shalini Kulkarni", institution: "Apex University of Technology & Applied Sciences", dept: "Life Sciences & Biotechnology" },
    "SIT-FAC-3301": { name: "Prof. Ramesh Iyer", institution: "Sardar Institute of Technology, Pune", dept: "Computer Science & Engineering" },
    "NSM-FAC-5520": { name: "Dr. Geeta Krishnan", institution: "Nalanda School of Management, Bengaluru", dept: "Management Studies (MBA)" },
    "CUSD-FAC-6104": { name: "Prof. Alan Mathew", institution: "Coastal University of Science & Design, Kochi", dept: "Design & Applied Arts" },
    "NIMS-FAC-1002": { name: "Dr. Anil Trivedi", institution: "National Institute of Medical Sciences, New Delhi", dept: "Medicine & Health Sciences" },
    "GNLU-FAC-4091": { name: "Prof. K. S. Mukherjee", institution: "Gateway National Law University, Gandhinagar", dept: "Law & Legal Studies" },
    "SAUT-FAC-7714": { name: "Dr. S. Karthik", institution: "Southern Agricultural University, Coimbatore", dept: "Agriculture & Food Technology" },
    "DCAP-FAC-8812": { name: "Prof. Nusrat Jahan", institution: "Deccan College of Architecture & Planning, Hyderabad", dept: "Architecture & Planning" },
  },
  companyCodes: {
    "APEX-IND-2026": { company: "Apex Global Technologies & Innovations", sector: "Information Technology & Software" },
    "MERIDIAN-IND-9912": { company: "Meridian Software Labs", sector: "Information Technology & Software" },
    "ANVAYA-IND-7731": { company: "Anvaya Analytics", sector: "Data Science & AI" },
    "SHAKTI-IND-1140": { company: "Shakti Motors Ltd.", sector: "Manufacturing & Core Engineering" },
    "MEGHDOOT-IND-6602": { company: "Meghdoot Capital Advisors", sector: "Banking, Finance & Insurance" },
    "INDIGO-IND-2288": { company: "Indigo Studio", sector: "Design & Creative" },
    "AROGYA-IND-4455": { company: "Arogya Multispecialty Hospital", sector: "Healthcare & Hospital Administration" },
    "NUCLEUS-IND-1902": { company: "Nucleus Biosciences", sector: "Pharmaceuticals & Biotechnology" },
    "KAVERI-IND-8821": { company: "Kaveri Logistics Network", sector: "Supply Chain & Logistics" },
    "CSIR-IND-4019": { company: "Council for Scientific Research", sector: "Research & Development" },
    "VOLTA-IND-3310": { company: "Voltaire Grid Energy Pvt. Ltd.", sector: "Energy & Sustainability" },
    "SANJ-IND-5502": { company: "Sanjeevani Hotels & Resorts", sector: "Hospitality, Travel & Tourism" },
    "LEXIS-IND-2204": { company: "Lexis Partners LLP", sector: "Legal & Compliance" },
  },
  instituteCodes: {
    "APEX-INST-2026": { institution: "Apex University of Technology & Applied Sciences", city: "Bengaluru", state: "Karnataka" },
    "SIT-INST-006": { institution: "Sardar Institute of Technology, Pune", city: "Pune", state: "Maharashtra" },
    "NSM-INST-007": { institution: "Nalanda School of Management, Bengaluru", city: "Bengaluru", state: "Karnataka" },
    "CUSD-INST-008": { institution: "Coastal University of Science & Design, Kochi", city: "Kochi", state: "Kerala" },
    "NIMS-INST-002": { institution: "National Institute of Medical Sciences, New Delhi", city: "New Delhi", state: "Delhi" },
    "GNLU-INST-003": { institution: "Gateway National Law University, Gandhinagar", city: "Gandhinagar", state: "Gujarat" },
    "SAUT-INST-004": { institution: "Southern Agricultural University, Coimbatore", city: "Coimbatore", state: "Tamil Nadu" },
    "DCAP-INST-005": { institution: "Deccan College of Architecture & Planning, Hyderabad", city: "Hyderabad", state: "Telangana" },
  },
};

export function validateTeacherCode(code) {
  if (!code) return { valid: false, message: "Teacher Code / Reference Number is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.teacherCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Teacher Code. Try APEX-FAC-2026, SIT-FAC-3301, or NIMS-FAC-1002." };
}

export function validateCompanyCode(code) {
  if (!code) return { valid: false, message: "Company Partner Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.companyCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Company Code. Try APEX-IND-2026, MERIDIAN-IND-9912, or SHAKTI-IND-1140." };
}

export function validateInstituteCode(code) {
  if (!code) return { valid: false, message: "Institute Verification Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.instituteCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Institute Code. Try APEX-INST-2026, SIT-INST-006, or NSM-INST-007." };
}
