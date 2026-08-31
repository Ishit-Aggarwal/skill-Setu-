/* ============================================================
   Verification Registry (Admin-Managed)
   Validates Teacher Codes, Company Codes, and Institute Codes
   used to verify academician / industry / institution signups.
   ============================================================ */

export const REGISTRY = {
  teacherCodes: {
    "IITD-FAC-2026": { name: "Prof. Dr. Rajesh Kumar", institution: "IIT Delhi", dept: "Computer Science & Engineering" },
    "NITT-FAC-1002": { name: "Dr. Ananya Sharma", institution: "NIT Tiruchirappalli", dept: "Mechanical Engineering" },
    "BITS-FAC-4091": { name: "Dr. K. S. Mukherjee", institution: "BITS Pilani", dept: "Management Studies" },
    "DU-FAC-7714": { name: "Dr. Arvind Nambiar", institution: "University of Delhi", dept: "Commerce & Economics" },
    "VIT-FAC-3301": { name: "Dr. S. R. Parameshwaran", institution: "VIT Vellore", dept: "Electronics & Communication" },
    "IIMA-FAC-8812": { name: "Prof. Dr. Geeta Krishnan", institution: "IIM Ahmedabad", dept: "Business Administration" },
  },
  companyCodes: {
    "TCS-IND-1902": { company: "Tata Consultancy Services", sector: "IT Services & Consulting" },
    "INFY-IND-8821": { company: "Infosys Ltd.", sector: "Software & Digital Services" },
    "TATAMOTORS-IND-4019": { company: "Tata Motors", sector: "Automotive & Manufacturing" },
    "ICICI-IND-3310": { company: "ICICI Bank", sector: "Banking & Financial Services" },
    "ZOHO-IND-5502": { company: "Zoho Corporation", sector: "Software Products" },
    "HUL-IND-2204": { company: "Hindustan Unilever Ltd.", sector: "FMCG & Consumer Goods" },
    "FLIPKART-IND-9912": { company: "Flipkart", sector: "E-commerce & Retail Tech" },
  },
  instituteCodes: {
    "IITD-INST-001": { institution: "IIT Delhi", city: "New Delhi", state: "Delhi" },
    "NITT-INST-002": { institution: "NIT Tiruchirappalli", city: "Tiruchirappalli", state: "Tamil Nadu" },
    "BITS-INST-003": { institution: "BITS Pilani", city: "Pilani", state: "Rajasthan" },
    "DU-INST-004": { institution: "University of Delhi", city: "New Delhi", state: "Delhi" },
    "VIT-INST-005": { institution: "VIT Vellore", city: "Vellore", state: "Tamil Nadu" },
    "IIMA-INST-006": { institution: "IIM Ahmedabad", city: "Ahmedabad", state: "Gujarat" },
    "NITK-INST-007": { institution: "NIT Karnataka, Surathkal", city: "Mangalore", state: "Karnataka" },
  },
};

export function validateTeacherCode(code) {
  if (!code) return { valid: false, message: "Teacher Code / Reference Number is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.teacherCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Teacher Code. Try IITD-FAC-2026, NITT-FAC-1002, or BITS-FAC-4091." };
}

export function validateCompanyCode(code) {
  if (!code) return { valid: false, message: "Company Partner Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.companyCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Company Code. Try TCS-IND-1902, INFY-IND-8821, or ZOHO-IND-5502." };
}

export function validateInstituteCode(code) {
  if (!code) return { valid: false, message: "Institute Verification Code is required." };
  const cleaned = code.trim().toUpperCase();
  const match = REGISTRY.instituteCodes[cleaned];
  if (match) return { valid: true, data: match, code: cleaned };
  return { valid: false, message: "Invalid Institute Code. Try IITD-INST-001, NITT-INST-002, or BITS-INST-003." };
}
