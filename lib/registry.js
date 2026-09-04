/* ============================================================
   Verification Registry (Admin-Managed)
   Validates Teacher Codes, Company Codes, and Institute Codes
   used to verify academician / industry / institution signups.

   The registry spans every sector the platform serves, with the
   AYUSH partners listed first — that is the ecosystem SIH26044
   was issued for by the Ministry of Ayush.
   ============================================================ */

export const REGISTRY = {
  teacherCodes: {
    // AYUSH faculty
    "RIAAS-FAC-2026": { name: "Dr. Shalini Kulkarni", institution: "Rajasthan Institute of Ayurvedic & Applied Sciences", dept: "Dravyaguna (Ayurvedic Pharmacology)" },
    "AIIA-FAC-1002": { name: "Dr. Anil Trivedi", institution: "All India Institute of Integrated Ayush, New Delhi", dept: "Kayachikitsa (Internal Medicine)" },
    "ITRA-FAC-4091": { name: "Dr. K. S. Mukherjee", institution: "Institute of Ayurvedic Teaching & Research, Jamnagar", dept: "Rasashastra & Bhaishajya Kalpana" },
    "GYNM-FAC-7714": { name: "Dr. S. Karthik", institution: "Government Yoga & Naturopathy Medical College, Chennai", dept: "Yoga & Naturopathy (BNYS)" },
    "DCUM-FAC-8812": { name: "Dr. Nusrat Jahan", institution: "Deccan College of Unani Medicine, Hyderabad", dept: "Unani Medicine (BUMS)" },
    // General faculty
    "SIT-FAC-3301": { name: "Prof. Ramesh Iyer", institution: "Sardar Institute of Technology, Pune", dept: "Computer Science & Engineering" },
    "NSM-FAC-5520": { name: "Dr. Geeta Krishnan", institution: "Nalanda School of Management, Bengaluru", dept: "Management Studies (MBA)" },
    "CUSD-FAC-6104": { name: "Prof. Alan Mathew", institution: "Coastal University of Science & Design, Kochi", dept: "Design & Applied Arts" },
  },
  companyCodes: {
    // AYUSH & wellness
    "HIMADRI-IND-1902": { company: "Himadri Ayurveda Pharmaceuticals Ltd.", sector: "Ayush Pharmaceuticals & Nutraceuticals" },
    "KAVERI-IND-8821": { company: "Kaveri Ayurvedic Wellness Group", sector: "Panchakarma & Wellness Therapy" },
    "CASR-IND-4019": { company: "Council for Ayurvedic Sciences Research", sector: "Ayush Clinical Research" },
    "VANA-IND-3310": { company: "Vanaushadhi Botanicals Pvt. Ltd.", sector: "Quality Control & Regulatory Affairs" },
    "SANJ-IND-5502": { company: "Sanjeevani Wellness Retreats", sector: "Wellness Tourism & Spa Management" },
    "HAKEEM-IND-2204": { company: "Hakeem Unani Laboratories", sector: "Unani Medicine" },
    // Technology, industry & services
    "MERIDIAN-IND-9912": { company: "Meridian Software Labs", sector: "Information Technology & Software" },
    "ANVAYA-IND-7731": { company: "Anvaya Analytics", sector: "Data Science & AI" },
    "SHAKTI-IND-1140": { company: "Shakti Motors Ltd.", sector: "Manufacturing & Core Engineering" },
    "MEGHDOOT-IND-6602": { company: "Meghdoot Capital Advisors", sector: "Banking, Finance & Insurance" },
    "INDIGO-IND-2288": { company: "Indigo Studio", sector: "Design & Creative" },
    "AROGYA-IND-4455": { company: "Arogya Multispecialty Hospital", sector: "Healthcare & Hospital Administration" },
  },
  instituteCodes: {
    "RIAAS-INST-001": { institution: "Rajasthan Institute of Ayurvedic & Applied Sciences", city: "Jaipur", state: "Rajasthan" },
    "AIIA-INST-002": { institution: "All India Institute of Integrated Ayush, New Delhi", city: "New Delhi", state: "Delhi" },
    "ITRA-INST-003": { institution: "Institute of Ayurvedic Teaching & Research, Jamnagar", city: "Jamnagar", state: "Gujarat" },
    "GYNM-INST-004": { institution: "Government Yoga & Naturopathy Medical College, Chennai", city: "Chennai", state: "Tamil Nadu" },
    "DCUM-INST-005": { institution: "Deccan College of Unani Medicine, Hyderabad", city: "Hyderabad", state: "Telangana" },
    "SIT-INST-006": { institution: "Sardar Institute of Technology, Pune", city: "Pune", state: "Maharashtra" },
    "NSM-INST-007": { institution: "Nalanda School of Management, Bengaluru", city: "Bengaluru", state: "Karnataka" },
    "CUSD-INST-008": { institution: "Coastal University of Science & Design, Kochi", city: "Kochi", state: "Kerala" },
  },
};

export function validateTeacherCode(code) {
  if (!code) return { valid: false, message: "Teacher Code / Reference Number is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.teacherCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Teacher Code. Try RIAAS-FAC-2026, AIIA-FAC-1002, or SIT-FAC-3301." };
}

export function validateCompanyCode(code) {
  if (!code) return { valid: false, message: "Company Partner Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.companyCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Company Code. Try HIMADRI-IND-1902, MERIDIAN-IND-9912, or SHAKTI-IND-1140." };
}

export function validateInstituteCode(code) {
  if (!code) return { valid: false, message: "Institute Verification Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.instituteCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Institute Code. Try RIAAS-INST-001, AIIA-INST-002, or SIT-INST-006." };
}
