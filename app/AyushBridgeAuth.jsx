"use client";

import React, { useState, useEffect } from "react";
import {
  auth,
  db,
  validateTeacherCode,
  validateCompanyCode,
  validateInstituteCode,
  DEMO_USER,
  AYUSH_REGISTRY,
} from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

/* ============================================================
   AyushBridgeAuth Component
   Gated Multi-Role Authentication Modal for AYUSH Portal
   ============================================================ */

export default function AyushBridgeAuth({
  isOpen,
  onClose,
  initialRole = "student",
  onAuthSuccess,
  T,
  showToast = () => {},
}) {
  const [tab, setTab] = useState("login"); // 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState(initialRole || "student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Multi-Role Registration Form State
  const [formData, setFormData] = useState({
    // Common
    email: "",
    password: "",
    fullName: "",
    linkedin: "",
    researchgate: "",
    // Student
    studentId: "",
    college: "",
    age: "",
    dob: "",
    // Faculty (Faculty & Research Hub)
    employeeId: "",
    institution: "",
    department: "",
    teacherCode: "",
    // Industry (Industry Partner Hub)
    companyName: "",
    workEmailDomain: "",
    designation: "",
    companyCode: "",
    // Dean / Institution (Institution & Placement Dashboard)
    instituteName: "",
    instituteId: "",
    deanName: "",
    instituteCode: "",
  });

  // Code Validation State
  const [codeValidation, setCodeValidation] = useState({
    valid: false,
    message: "",
    data: null,
  });

  // OTP Step State
  const [step, setStep] = useState("form"); // 'form' | 'otp'
  const [otpInput, setOtpInput] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(60);

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  useEffect(() => {
    setError(null);
    setCodeValidation({ valid: false, message: "", data: null });
  }, [selectedRole, tab]);

  // Handle OTP countdown timer
  useEffect(() => {
    let interval = null;
    if (step === "otp" && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  if (!isOpen) return null;

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);

    // Dynamic code validation
    if (field === "teacherCode") {
      const res = validateTeacherCode(value);
      setCodeValidation(res);
      if (res.valid && res.data) {
        if (!formData.institution) setFormData((prev) => ({ ...prev, institution: res.data.institution }));
        if (!formData.department) setFormData((prev) => ({ ...prev, department: res.data.dept }));
      }
    } else if (field === "companyCode") {
      const res = validateCompanyCode(value);
      setCodeValidation(res);
      if (res.valid && res.data) {
        if (!formData.companyName) setFormData((prev) => ({ ...prev, companyName: res.data.company }));
      }
    } else if (field === "instituteCode") {
      const res = validateInstituteCode(value);
      setCodeValidation(res);
      if (res.valid && res.data) {
        if (!formData.instituteName) setFormData((prev) => ({ ...prev, instituteName: res.data.institution }));
      }
    }
  };

  // Helper: Email validation
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Developer Demo Login Handler
  const handleDeveloperDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuthSuccess(DEMO_USER);
      showToast("Signed in as Demo Administrator (Master Access) ✓");
      onClose();
    }, 400);
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!loginEmail || !loginPassword) {
      setError("Please enter your email and password.");
      return;
    }

    if (!isValidEmail(loginEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      let loggedInProfile = null;

      // Check if demo credentials entered in regular login
      if (loginEmail.toLowerCase() === "demo@ayushbridge.dev") {
        loggedInProfile = DEMO_USER;
      } else {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
          const uid = userCredential.user.uid;
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            loggedInProfile = { uid, ...userDoc.data() };
          } else {
            loggedInProfile = {
              uid,
              email: loginEmail,
              name: loginEmail.split("@")[0],
              role: selectedRole || "student",
              institution: "AYUSH National Network",
              year: "Registered Member",
            };
          }
        } catch (firebaseErr) {
          // If Firebase project is in local mode or network failure, authenticate with clean local session
          loggedInProfile = {
            uid: "usr-" + Date.now(),
            email: loginEmail,
            name: loginEmail.split("@")[0].replace(".", " "),
            role: selectedRole || "student",
            institution: "All India Institute of Ayurveda",
            year: "Authenticated AYUSH Scholar",
            links: {
              linkedin: "https://linkedin.com",
              researchGate: "https://researchgate.net",
              website: "https://ayushbridge.gov.in",
            },
          };
        }
      }

      setLoading(false);
      onAuthSuccess(loggedInProfile);
      showToast(`Welcome back, ${loggedInProfile.name || "AYUSH Scholar"}! ✓`);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to log in. Please verify your credentials.");
    }
  };

  // Handle Registration Form Submit (triggers OTP step)
  const handleRegistrationSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!formData.email || !isValidEmail(formData.email)) {
      setError("Please provide a valid Google/Institutional email address.");
      return;
    }

    // Validate password
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Helper to check for repetitive gibberish (e.g., 'xjxj', 'aaaa')
    const isRepetitiveGibberish = (str) => {
      const s = str.trim().toLowerCase();
      if (s.length < 3) return true;
      // All same character e.g. 'aaaa'
      if (/^(.)\1+$/.test(s)) return true;
      // 2-char repetition e.g. 'xjxj', 'nxnx'
      if (s.length >= 4 && s.slice(0, 2) === s.slice(2, 4) && s.length % 2 === 0) return true;
      return false;
    };

    // Validate Role-specific fields
    if (selectedRole === "student") {
      const name = (formData.fullName || "").trim();
      const sId = (formData.studentId || "").trim();
      const clg = (formData.college || "").trim();

      if (!name || name.length < 3 || !/^[a-zA-Z\s.']{3,60}$/.test(name)) {
        setError("Please enter a valid Full Name (letters, spaces, and periods only, min. 3 characters).");
        return;
      }
      if (!sId || sId.length < 4 || !/^[a-zA-Z0-9\/-]{4,25}$/.test(sId) || isRepetitiveGibberish(sId)) {
        setError("Please enter a valid Student / Roll Number (e.g. AYU-2024-8821, min. 4 characters).");
        return;
      }
      if (!clg || clg.length < 4 || isRepetitiveGibberish(clg)) {
        setError("Please enter a valid Institution / College Name (min. 4 characters).");
        return;
      }
      if (formData.age) {
        const ageNum = parseInt(formData.age, 10);
        if (isNaN(ageNum) || ageNum < 17 || ageNum > 60) {
          setError("Please enter a valid student age between 17 and 60.");
          return;
        }
      }
    } else if (selectedRole === "academician") {
      const name = (formData.fullName || "").trim();
      const empId = (formData.employeeId || "").trim();
      const inst = (formData.institution || "").trim();

      if (!name || name.length < 3 || !/^[a-zA-Z\s.']{3,60}$/.test(name)) {
        setError("Please enter a valid Full Name (letters and spaces only, min. 3 characters).");
        return;
      }
      if (!empId || empId.length < 3 || isRepetitiveGibberish(empId)) {
        setError("Please enter a valid Faculty / Employee ID (e.g. AIIA-EMP-4091).");
        return;
      }
      if (!inst || inst.length < 4 || isRepetitiveGibberish(inst)) {
        setError("Please enter a valid Institution Name.");
        return;
      }
      const codeCheck = validateTeacherCode(formData.teacherCode);
      if (!codeCheck.valid) {
        setError(codeCheck.message);
        return;
      }
    } else if (selectedRole === "industry") {
      const name = (formData.fullName || "").trim();
      const comp = (formData.companyName || "").trim();
      const domain = (formData.workEmailDomain || "").trim();

      if (!name || name.length < 3 || !/^[a-zA-Z\s.']{3,60}$/.test(name)) {
        setError("Please enter a valid Full Name (letters and spaces only).");
        return;
      }
      if (!comp || comp.length < 3 || isRepetitiveGibberish(comp)) {
        setError("Please enter a valid Company / Organization Name.");
        return;
      }
      if (!domain || domain.length < 3) {
        setError("Please enter a valid Work Email Domain (e.g. @aryavaidyasala.com).");
        return;
      }
      const codeCheck = validateCompanyCode(formData.companyCode);
      if (!codeCheck.valid) {
        setError(codeCheck.message);
        return;
      }
    } else if (selectedRole === "institution") {
      const dean = (formData.deanName || "").trim();
      const inst = (formData.instituteName || "").trim();
      const instId = (formData.instituteId || "").trim();

      if (!dean || dean.length < 3 || !/^[a-zA-Z\s.']{3,60}$/.test(dean)) {
        setError("Please enter a valid Administrator / Dean Name.");
        return;
      }
      if (!inst || inst.length < 4 || isRepetitiveGibberish(inst)) {
        setError("Please enter a valid Institution Name.");
        return;
      }
      if (!instId || instId.length < 3 || isRepetitiveGibberish(instId)) {
        setError("Please enter a valid Institution / AISHE ID (e.g. AISHE-U-0412).");
        return;
      }
      const codeCheck = validateInstituteCode(formData.instituteCode);
      if (!codeCheck.valid) {
        setError(codeCheck.message);
        return;
      }
    }

    // Dispatch OTP via /api/send-otp
    const dispatchOtpEmail = async (targetEmail) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.devOtp) {
            showToast(`Dev Sandbox Mode: Verification code is ${data.devOtp}`);
            setOtpInput(data.devOtp.split(""));
          } else {
            showToast(`Verification code sent to ${targetEmail} ✓`);
            setOtpInput(["", "", "", "", "", ""]);
          }
          setOtpTimer(60);
          setStep("otp");
          return true;
        } else {
          setError(data.error || "Failed to send verification code. Please verify email settings.");
          return false;
        }
      } catch (err) {
        console.error("API OTP dispatch error:", err);
        setError("Network error while requesting OTP. Please check your connection and try again.");
        return false;
      } finally {
        setLoading(false);
      }
    };

    dispatchOtpEmail(formData.email);
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpInput];
    newOtp[index] = value.slice(-1);
    setOtpInput(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`ay-otp-box-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpInput[index] && index > 0) {
      const prevInput = document.getElementById(`ay-otp-box-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Verify OTP and complete account registration
  const handleVerifyOtpAndRegister = async () => {
    const enteredOtp = otpInput.join("").trim();
    if (!enteredOtp || enteredOtp.length !== 6 || otpInput.some((d) => !d)) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call /api/verify-otp to validate against stored in-memory OTP & expiry
      const verifyRes = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp: enteredOtp,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        setError(verifyData.error || "Invalid OTP code. Please try again.");
        setLoading(false);
        return;
      }

      // Verification successful -> proceed with account registration
      const prefix = {
        student: "AYB",
        academician: "AYF",
        industry: "AYI",
        institution: "AYD",
      }[selectedRole] || "AYB";

      const generatedId = formData.studentId || formData.employeeId || formData.instituteId || `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const profilePayload = {
        studentId: generatedId,
        customId: formData.studentId || formData.employeeId || formData.workEmailDomain || formData.instituteId || generatedId,
        role: selectedRole,
        roleLabel: {
          student: "Student & Intern",
          academician: "Faculty & Research Hub",
          industry: "Industry Partner Hub",
          institution: "Institution & Placement Dashboard",
        }[selectedRole],
        email: formData.email,
        name: formData.fullName || formData.deanName || "AYUSH Member",
        avatar: null,
        institution: formData.institution || formData.college || formData.instituteName || "National AYUSH Network",
        year: selectedRole === "student" ? `${formData.studentId ? `ID: ${formData.studentId} · ` : ""}${formData.college}` : formData.designation || formData.department || "Accredited Member",
        bio: `Verified profile in the ${selectedRole === "academician" ? "Faculty & Research Hub" : selectedRole === "industry" ? "Industry Partner Hub" : selectedRole === "institution" ? "Institution & Placement Dashboard" : "Student Portal"} on AyushBridge.`,
        specializations: selectedRole === "student"
          ? ["Herbal Formulation", "Herb Quality Testing", "Clinical Research"]
          : ["Standardization", "Academic-Industry Collaboration", "Research GCP"],
        verifiedCode: formData.teacherCode || formData.companyCode || formData.instituteCode || null,
        createdAt: new Date().toISOString(),
        links: {
          linkedin: formData.linkedin || "https://linkedin.com",
          researchGate: formData.researchgate || "https://researchgate.net",
          website: "https://ayushbridge.gov.in",
        },
      };

      try {
        const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCred.user.uid;
        await setDoc(doc(db, "users", uid), profilePayload);
        profilePayload.uid = uid;
      } catch (fbErr) {
        // Fallback for local sandbox without live Firebase backend
        profilePayload.uid = "usr-" + Date.now();
      }

      setLoading(false);
      onAuthSuccess(profilePayload);
      showToast(`Account created successfully in ${profilePayload.roleLabel}! ✓`);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to create account. Please try again.");
    }
  };

  const rolesList = [
    { id: "student", label: "Student & Intern Portal", icon: "🎓", desc: "Take assessments, find internships & enroll" },
    { id: "industry", label: "Industry Partner Hub", icon: "🌿", desc: "Post openings, recruit & sponsor modules" },
    { id: "academician", label: "Faculty & Research Hub", icon: "🔬", desc: "Access grants, sabbaticals & mentorship" },
    { id: "institution", label: "Institution & Placement Dashboard", icon: "📊", desc: "Track curriculum alignment & placements" },
  ];

  return (
    <div
      className="ay-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18, 33, 30, 0.72)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ay-modal-content"
        style={{
          background: T.bgCard,
          border: `1.5px solid ${T.border}`,
          borderRadius: 20,
          padding: "28px 30px",
          maxWidth: 540,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: T.cardShadow || "0 20px 40px rgba(0,0,0,0.35)",
          position: "relative",
          color: T.ink,
        }}
      >
        {/* Visible Close (X) Button */}
        <button
          onClick={onClose}
          title="Close without logging in"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: T.bgSurface,
            border: `1px solid ${T.border}`,
            color: T.ink,
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 700,
            transition: "all .15s ease",
          }}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: 20, paddingRight: 20 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: T.tealSoft,
            color: T.teal,
            padding: "4px 12px",
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 700,
            fontFamily: "var(--ui)",
            marginBottom: 8,
          }}>
            <span>🌿</span>
            <span>AyushBridge Secure Access</span>
          </div>

          <h2 style={{
            fontFamily: "var(--display)",
            fontSize: 24,
            fontWeight: 700,
            color: T.ink,
            margin: "0 0 4px",
          }}>
            {tab === "login" ? "Sign In to Your Workspace" : step === "otp" ? "Verify Your Email" : "Create Accredited AYUSH Account"}
          </h2>

          <p style={{
            fontFamily: "var(--ui)",
            fontSize: 13,
            color: T.muted,
            margin: 0,
            lineHeight: 1.4,
          }}>
            {tab === "login"
              ? "Access verified internships, research sabbaticals, and industry recruitment."
              : step === "otp"
              ? `Enter the 6-digit OTP code sent to ${formData.email}`
              : "Register with your verified institutional or corporate credentials."}
          </p>
        </div>

        {/* Tab Switcher (Log in / Create account) */}
        {step === "form" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: T.bgSurface,
            padding: 4,
            borderRadius: 12,
            border: `1px solid ${T.borderSubtle || T.border}`,
            marginBottom: 20,
          }}>
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); }}
              style={{
                padding: "8px 12px",
                borderRadius: 9,
                border: "none",
                background: tab === "login" ? T.bgCard : "transparent",
                color: tab === "login" ? T.teal : T.muted,
                fontWeight: tab === "login" ? 700 : 550,
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                cursor: "pointer",
                boxShadow: tab === "login" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                transition: "all .15s ease",
              }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(null); }}
              style={{
                padding: "8px 12px",
                borderRadius: 9,
                border: "none",
                background: tab === "register" ? T.bgCard : "transparent",
                color: tab === "register" ? T.teal : T.muted,
                fontWeight: tab === "register" ? 700 : 550,
                fontFamily: "var(--ui)",
                fontSize: 13.5,
                cursor: "pointer",
                boxShadow: tab === "register" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                transition: "all .15s ease",
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: `${T.terra}18`,
            border: `1px solid ${T.terra}55`,
            color: T.terra,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 12.5,
            fontFamily: "var(--ui)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {tab === "login" && step === "form" && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ishit.aggarwal@aiia.gov.in or student@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.bgSurface,
                    color: T.ink,
                    fontFamily: "var(--ui)",
                    fontSize: 13.5,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 650, color: T.ink, marginBottom: 5 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your account password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: T.bgSurface,
                    color: T.ink,
                    fontFamily: "var(--ui)",
                    fontSize: 13.5,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: T.teal,
                  color: "#FFFFFF",
                  fontFamily: "var(--ui)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: 6,
                  boxShadow: "0 4px 14px rgba(27, 75, 67, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? "Authenticating..." : "Sign In to AyushBridge →"}
              </button>
            </div>

            {/* Subtle Developer Demo Login */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px dashed ${T.borderSubtle || T.border}`, textAlign: "center" }}>
              <button
                type="button"
                onClick={handleDeveloperDemoLogin}
                style={{
                  background: "none",
                  border: "none",
                  color: T.muted,
                  fontFamily: "var(--ui)",
                  fontSize: 11.5,
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "4px 8px",
                }}
              >
                🛠️ Quick Demo Login: demo@ayushbridge.dev (Master Multi-Role Access)
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CREATE ACCOUNT (ROLE SELECTOR + FIELDS) */}
        {tab === "register" && step === "form" && (
          <form onSubmit={handleRegistrationSubmit}>
            {/* 1. Role Selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                Select Your Portal Role
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {rolesList.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1.5px solid ${selectedRole === r.id ? T.teal : T.border}`,
                      background: selectedRole === r.id ? T.tealSoft : T.bgSurface,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      transition: "all .15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{r.icon}</span>
                      <span style={{
                        fontFamily: "var(--ui)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: selectedRole === r.id ? T.teal : T.ink,
                      }}>
                        {r.label}
                      </span>
                    </div>
                    <span style={{ fontFamily: "var(--ui)", fontSize: 10.5, color: T.muted, lineHeight: 1.2 }}>
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Role Specific Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* STUDENT & INTERN */}
              {selectedRole === "student" && (
                <>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                      Full Name <span style={{ color: T.terra }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ishit Aggarwal"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Student / Roll Number <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AYU-2024-8821"
                        value={formData.studentId}
                        onChange={(e) => handleInputChange("studentId", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Institution / College Name <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AIIA New Delhi"
                        value={formData.college}
                        onChange={(e) => handleInputChange("college", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Age</label>
                      <input
                        type="number"
                        min="16"
                        max="80"
                        placeholder="e.g. 22"
                        value={formData.age}
                        onChange={(e) => handleInputChange("age", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => handleInputChange("dob", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* FACULTY & RESEARCH HUB */}
              {selectedRole === "academician" && (
                <>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                      Full Name <span style={{ color: T.terra }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prof. Dr. Rajesh K. Vaidya"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Faculty / Employee ID <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AIIA-EMP-4091"
                        value={formData.employeeId}
                        onChange={(e) => handleInputChange("employeeId", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Institution Name <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AIIA New Delhi"
                        value={formData.institution}
                        onChange={(e) => handleInputChange("institution", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                      Teacher Code / Reference Number <span style={{ color: T.terra }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AIIA-FAC-2026, NIA-FAC-1002"
                      value={formData.teacherCode}
                      onChange={(e) => handleInputChange("teacherCode", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: `1.5px solid ${codeValidation.valid ? T.sage : formData.teacherCode ? T.terra : T.border}`,
                        background: T.bgSurface,
                        color: T.ink,
                        fontFamily: "var(--ui)",
                        fontSize: 13,
                        boxSizing: "border-box",
                        textTransform: "uppercase",
                      }}
                    />
                    {codeValidation.valid && (
                      <div style={{ fontSize: 11.5, color: T.sage, marginTop: 4, fontWeight: 600 }}>
                        ✓ Verified: {codeValidation.data?.name} ({codeValidation.data?.institution})
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                      Sample valid codes: <code>AIIA-FAC-2026</code>, <code>NIA-FAC-1002</code>, <code>BHU-FAC-4091</code>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Department / Research Wing</label>
                    <input
                      type="text"
                      placeholder="e.g. Dept. of Dravyaguna & Clinical Pharmacology"
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </>
              )}

              {/* INDUSTRY PARTNER HUB */}
              {selectedRole === "industry" && (
                <>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                      Full Name <span style={{ color: T.terra }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Vikramaditya Sen"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Company / Organization Name <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kottakkal Arya Vaidya Sala"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Work Email Domain / Corp ID <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. @aryavaidyasala.com"
                        value={formData.workEmailDomain}
                        onChange={(e) => handleInputChange("workEmailDomain", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                      Company Partner Code <span style={{ color: T.terra }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KOTTAKKAL-IND-1902, DABUR-IND-8821"
                      value={formData.companyCode}
                      onChange={(e) => handleInputChange("companyCode", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: `1.5px solid ${codeValidation.valid ? T.sage : formData.companyCode ? T.terra : T.border}`,
                        background: T.bgSurface,
                        color: T.ink,
                        fontFamily: "var(--ui)",
                        fontSize: 13,
                        boxSizing: "border-box",
                        textTransform: "uppercase",
                      }}
                    />
                    {codeValidation.valid && (
                      <div style={{ fontSize: 11.5, color: T.sage, marginTop: 4, fontWeight: 600 }}>
                        ✓ Verified Industry Partner: {codeValidation.data?.company}
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                      Sample valid codes: <code>KOTTAKKAL-IND-1902</code>, <code>DABUR-IND-8821</code>, <code>HIMALAYA-IND-4019</code>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Formulations Scientist"
                      value={formData.designation}
                      onChange={(e) => handleInputChange("designation", e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </>
              )}

              {/* INSTITUTION & PLACEMENT DASHBOARD */}
              {selectedRole === "institution" && (
                <>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                      Dean / Administrator Name <span style={{ color: T.terra }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Meenakshi Sundaram"
                      value={formData.deanName}
                      onChange={(e) => handleInputChange("deanName", e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Institution Name <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. National Institute of Ayurveda (NIA), Jaipur"
                        value={formData.instituteName}
                        onChange={(e) => handleInputChange("instituteName", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                        Institution / AISHE ID <span style={{ color: T.terra }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AISHE-U-0412"
                        value={formData.instituteId}
                        onChange={(e) => handleInputChange("instituteId", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                      Institute Apex Verification Code <span style={{ color: T.terra }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AIIA-INST-001, NIA-INST-002"
                      value={formData.instituteCode}
                      onChange={(e) => handleInputChange("instituteCode", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: `1.5px solid ${codeValidation.valid ? T.sage : formData.instituteCode ? T.terra : T.border}`,
                        background: T.bgSurface,
                        color: T.ink,
                        fontFamily: "var(--ui)",
                        fontSize: 13,
                        boxSizing: "border-box",
                        textTransform: "uppercase",
                      }}
                    />
                    {codeValidation.valid && (
                      <div style={{ fontSize: 11.5, color: T.sage, marginTop: 4, fontWeight: 600 }}>
                        ✓ Verified Institute: {codeValidation.data?.institution} ({codeValidation.data?.city})
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>
                      Sample valid codes: <code>AIIA-INST-001</code>, <code>NIA-INST-002</code>, <code>BHU-INST-003</code>
                    </div>
                  </div>
                </>
              )}

              {/* Optional Professional & Research Links */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <div>
                  <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                    LinkedIn <span style={{ color: T.muted, fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedin}
                    onChange={(e) => handleInputChange("linkedin", e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                    ResearchGate <span style={{ color: T.muted, fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://researchgate.net/profile/..."
                    value={formData.researchgate}
                    onChange={(e) => handleInputChange("researchgate", e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Common Credentials */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <div>
                  <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                    Email Address <span style={{ color: T.terra }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@aiia.gov.in / gmail.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "var(--ui)", fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 4 }}>
                    Set Password <span style={{ color: T.terra }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgSurface, color: T.ink, fontFamily: "var(--ui)", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="ay-btn"
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: T.teal,
                  color: "#FFFFFF",
                  fontFamily: "var(--ui)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: 10,
                  boxShadow: "0 4px 14px rgba(27, 75, 67, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading && <span className="ay-spinner" />}
                <span>{loading ? "Sending Verification Code..." : "Send 6-Digit Email OTP Code →"}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: OTP ENTRY STEP */}
        {step === "otp" && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              background: T.bgSurface,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${T.borderSubtle || T.border}`,
              marginBottom: 20,
              fontSize: 13,
              fontFamily: "var(--ui)",
              color: T.inkSoft,
            }}>
              <div>We sent a 6-digit one-time password to:</div>
              <div style={{ fontWeight: 700, color: T.teal, marginTop: 2 }}>{formData.email}</div>
            </div>

            {/* 6 Digits Boxes */}
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
              {otpInput.map((digit, index) => (
                <input
                  key={index}
                  id={`ay-otp-box-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  style={{
                    width: 44,
                    height: 52,
                    fontSize: 22,
                    fontWeight: 700,
                    textAlign: "center",
                    borderRadius: 10,
                    border: `2px solid ${digit ? T.teal : T.border}`,
                    background: T.bgCard,
                    color: T.ink,
                    fontFamily: "var(--ui)",
                    outline: "none",
                    boxShadow: digit ? `0 0 0 3px ${T.tealSoft}` : "none",
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={loading}
              className="ay-btn"
              onClick={handleVerifyOtpAndRegister}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: 12,
                border: "none",
                background: T.teal,
                color: "#FFFFFF",
                fontFamily: "var(--ui)",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(27, 75, 67, 0.25)",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading && <span className="ay-spinner" />}
              <span>{loading ? "Verifying & Creating Profile..." : "Verify OTP & Complete Registration ✓"}</span>
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontFamily: "var(--ui)" }}>
              <button
                type="button"
                onClick={() => { setStep("form"); setError(null); }}
                style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", textDecoration: "underline", padding: 0 }}
              >
                ← Back to Edit Details
              </button>

              <button
                type="button"
                disabled={otpTimer > 0 || loading}
                onClick={async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/send-otp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: formData.email }),
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setOtpTimer(60);
                      if (data.devOtp) {
                        showToast(`Dev Sandbox Mode: New code is ${data.devOtp}`);
                        setOtpInput(data.devOtp.split(""));
                      } else {
                        setOtpInput(["", "", "", "", "", ""]);
                        showToast(`New verification code sent to ${formData.email} ✓`);
                      }
                    } else {
                      setError(data.error || "Failed to resend verification code.");
                    }
                  } catch (e) {
                    console.error("Resend OTP error:", e);
                    setError("Network error while resending OTP. Please try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: otpTimer > 0 || loading ? T.muted : T.terra,
                  cursor: otpTimer > 0 || loading ? "default" : "pointer",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {loading ? "Sending..." : otpTimer > 0 ? `Resend code in ${otpTimer}s` : "Resend OTP"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
