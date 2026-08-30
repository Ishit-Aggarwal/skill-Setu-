import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
} from "firebase/firestore";

// Firebase Configuration (reads env variables with safe fallbacks for local hackathon demo)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAyushBridgeDemoKey2026HackathonSIH",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ayushbridge-sih2026.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ayushbridge-sih2026",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ayushbridge-sih2026.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "849201948210",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:849201948210:web:8f3c7b2a190ef0a88b1234",
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ============================================================
   Official AYUSH Registry Lookup Tables (Admin-Managed)
   Validates Teacher Codes, Company Codes, and Institute Codes
   ============================================================ */

export const AYUSH_REGISTRY = {
  // Faculty & Researcher Teacher Codes / Reference Numbers
  teacherCodes: {
    "AIIA-FAC-2026": { name: "Prof. Dr. Rajesh K. Vaidya", institution: "All India Institute of Ayurveda (AIIA), New Delhi", dept: "Dravyaguna & Clinical Pharmacology" },
    "NIA-FAC-1002": { name: "Dr. Ananya Sharma", institution: "National Institute of Ayurveda (NIA), Jaipur", dept: "Rasa Shastra & Bhaishajya Kalpana" },
    "BHU-FAC-4091": { name: "Dr. K. S. Mukherjee", institution: "Faculty of Ayurveda, IMS BHU, Varanasi", dept: "Kayachikitsa & Clinical Trials" },
    "CCRAS-RES-7714": { name: "Dr. Arvind Nambiar", institution: "Central Council for Research in Ayurvedic Sciences (CCRAS)", dept: "Medicinal Plant Research & Standardization" },
    "RAV-FAC-3301": { name: "Vaidya S. R. Parameshwaran", institution: "Rashtriya Ayurveda Vidyapeeth (RAV), New Delhi", dept: "Traditional Guru-Shishya Clinical Practice" },
    "ITRA-FAC-8812": { name: "Prof. Dr. Geeta Krishnan", institution: "Institute of Teaching and Research in Ayurveda (ITRA), Jamnagar", dept: "Phytomedicine & Pharmacognosy" },
  },

  // Herbal Industry & Recruiter Company Codes
  companyCodes: {
    "KOTTAKKAL-IND-1902": { company: "Kottakkal Arya Vaidya Sala", sector: "Classical Formulations & Clinical Research", contact: "R&D Licensing Division" },
    "DABUR-IND-8821": { company: "Dabur Research Foundation", sector: "Herbal Healthcare & Phytopharmaceuticals", contact: "Talent Acquisition Group" },
    "HIMALAYA-IND-4019": { company: "Himalaya Wellness Company", sector: "Botanical Formulations & Quality Assurance", contact: "Academic Partnerships Cell" },
    "BAIDYANATH-IND-3310": { company: "Shree Baidyanath Ayurved Bhawan", sector: "Classical Ayurveda Manufacturing", contact: "Clinical & Industrial Training" },
    "PATANJALI-IND-5502": { company: "Patanjali Research Foundation", sector: "Herbal Drug Standardization & Trials", contact: "Corporate HR & Placement" },
    "CHARAK-IND-2204": { company: "Charak Pharma Pvt Ltd", sector: "Standardized Herbal Therapeutics", contact: "Research Internship Program" },
    "EMAMI-IND-9912": { company: "Emami Healthcare / Zandu Care", sector: "Ayurvedic Consumer Healthcare", contact: "University Relations" },
  },

  // AYUSH College & Dean Institute Codes
  instituteCodes: {
    "AIIA-INST-001": { institution: "All India Institute of Ayurveda (AIIA)", city: "New Delhi", state: "Delhi", type: "National Autonomous Apex Institute" },
    "NIA-INST-002": { institution: "National Institute of Ayurveda (NIA)", city: "Jaipur", state: "Rajasthan", type: "Deemed-to-be-University (De Novo)" },
    "BHU-INST-003": { institution: "Faculty of Ayurveda, IMS-BHU", city: "Varanasi", state: "Uttar Pradesh", type: "Central University Faculty" },
    "RAV-INST-004": { institution: "Rashtriya Ayurveda Vidyapeeth (RAV)", city: "New Delhi", state: "Delhi", type: "Autonomous Body under Ministry of Ayush" },
    "NEIAH-INST-005": { institution: "North Eastern Institute of Ayurveda & Homoeopathy", city: "Shillong", state: "Meghalaya", type: "Regional Apex Institute" },
    "ITRA-INST-006": { institution: "Institute of Teaching and Research in Ayurveda (ITRA)", city: "Jamnagar", state: "Gujarat", type: "Institute of National Importance" },
    "NIMA-INST-007": { institution: "National Institute of Homoeopathy", city: "Kolkata", state: "West Bengal", type: "National Autonomous Institute" },
  },
};

/**
 * Validates Teacher Code against official registry
 */
export function validateTeacherCode(code) {
  if (!code) return { valid: false, message: "Teacher Code / Reference Number is required" };
  const cleaned = code.trim().toUpperCase();
  const match = AYUSH_REGISTRY.teacherCodes[cleaned];
  if (match) {
    return { valid: true, data: match, code: cleaned };
  }
  return {
    valid: false,
    message: "Invalid Teacher Code. Must match an official AYUSH faculty registration (e.g. AIIA-FAC-2026, NIA-FAC-1002, BHU-FAC-4091).",
  };
}

/**
 * Validates Company Code against official registry
 */
export function validateCompanyCode(code) {
  if (!code) return { valid: false, message: "Company Code is required" };
  const cleaned = code.trim().toUpperCase();
  const match = AYUSH_REGISTRY.companyCodes[cleaned];
  if (match) {
    return { valid: true, data: match, code: cleaned };
  }
  return {
    valid: false,
    message: "Invalid Company Code. Must match an accredited AYUSH industry partner (e.g. KOTTAKKAL-IND-1902, DABUR-IND-8821, HIMALAYA-IND-4019).",
  };
}

/**
 * Validates Institute Code against official registry
 */
export function validateInstituteCode(code) {
  if (!code) return { valid: false, message: "Institute Code is required" };
  const cleaned = code.trim().toUpperCase();
  const match = AYUSH_REGISTRY.instituteCodes[cleaned];
  if (match) {
    return { valid: true, data: match, code: cleaned };
  }
  return {
    valid: false,
    message: "Invalid Institute Code. Must match an accredited AYUSH college code (e.g. AIIA-INST-001, NIA-INST-002, BHU-INST-003).",
  };
}

/* ============================================================
   Developer Demo Account (Multi-Role Master Access)
   demo@ayushbridge.dev
   ============================================================ */

export const DEMO_USER = {
  uid: "demo-ayushbridge-master-uid",
  email: "demo@ayushbridge.dev",
  name: "AyushBridge Demo Administrator",
  studentId: "AY-DEMO-MASTER",
  role: "student",
  isMasterDemo: true,
  rolesAllowed: ["student", "academician", "industry", "institution"],
  institution: "Ministry of Ayush · Central Sandbox Environment",
  year: "National Portal Evaluator",
  bio: "Internal developer demo account with master evaluation access across all 4 AYUSH stakeholder workspaces.",
  specializations: ["Herbal Formulation", "Quality Assurance", "Clinical Trials", "Curriculum Mapping"],
  links: {
    linkedin: "https://ayushbridge.gov.in",
    researchGate: "https://ayushbridge.gov.in",
    website: "https://ayushbridge.gov.in",
  },
};
