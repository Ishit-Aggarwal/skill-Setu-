"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { PAGE_PATHS, roleHomePage } from "../../lib/nav";
import { validateTeacherCode, validateCompanyCode, validateInstituteCode } from "../../lib/registry";
import DemoModeMenu from "../../components/DemoModeMenu";

const roleConfig = {
  student: {
    label: "Student",
    desc: "Ayush · Engineering · Management · Design · Sciences",
    image: "https://images.unsplash.com/photo-1686624386665-4cd01b96d0f6?w=800&h=1100&fit=crop&auto=format",
    tagline: "Map your skills. Find your internship.",
  },
  industry: {
    label: "Industry",
    desc: "Ayush & Wellness · IT · Manufacturing · Finance",
    image: "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=800&h=1100&fit=crop&auto=format",
    tagline: "Hire talent matched to your needs.",
  },
  academician: {
    label: "Academician",
    desc: "Faculty · Researchers · Program Leads",
    image: "https://images.unsplash.com/photo-1573894998033-c0cef4ed722b?w=800&h=1100&fit=crop&auto=format",
    tagline: "Drive research and student excellence.",
  },
  institution: {
    label: "Institution",
    desc: "Placement Cells · Deans · Multi-faculty Institutes",
    image: "https://images.unsplash.com/photo-1680084521816-cc1ad0433ceb?w=800&h=1100&fit=crop&auto=format",
    tagline: "Track placement outcomes at scale.",
  },
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, login, sendSignupOtp, completeSignup } = useAuth();

  const [role, setRole] = useState(params.get("role") || "student");
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    institution: "",
    course: "",
    year: "",
    companyName: "",
    workEmailDomain: "",
    companyCode: "",
    employeeId: "",
    department: "",
    teacherCode: "",
    instituteName: "",
    instituteId: "",
    instituteCode: "",
  });
  const [codeValidation, setCodeValidation] = useState({ valid: false, message: "" });
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpToken, setOtpToken] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;
    const requestedRole = params.get("role");
    // Let an already-logged-in user still view a different role's own
    // signup/sign-in form (e.g. clicking "For Industries" from the landing
    // page, or switching accounts via the role switcher) instead of always
    // bouncing back to their existing dashboard.
    if (requestedRole && requestedRole !== user.role) return;
    router.replace(PAGE_PATHS[roleHomePage(user.role)]);
  }, [authLoading, user, router, params]);

  useEffect(() => {
    const paramRole = params.get("role");
    if (paramRole && roleConfig[paramRole]) setRole(paramRole);
    setMode(params.get("mode") === "signup" ? "signup" : "login");
  }, [params]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setInterval(() => setOtpTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [otpTimer]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
    if (key === "teacherCode") setCodeValidation(validateTeacherCode(value));
    if (key === "companyCode") setCodeValidation(validateCompanyCode(value));
    if (key === "instituteCode") setCodeValidation(validateInstituteCode(value));
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!loginEmail || !loginPassword) return setError("Please enter your email and password.");
    setLoading(true);
    try {
      const found = await login(loginEmail, loginPassword);
      router.push(PAGE_PATHS[roleHomePage(found.role)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function validateSignupForm() {
    if (!form.name.trim() || form.name.trim().length < 3) return "Please enter your full name (min. 3 characters).";
    if (!form.email || !isValidEmail(form.email)) return "Please enter a valid email address.";
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters long.";

    if (role === "student") {
      if (!form.institution.trim() || form.institution.trim().length < 4) return "Please enter your institution / college name.";
    } else if (role === "industry") {
      if (!form.companyName.trim()) return "Please enter your company / organisation name.";
      if (!form.workEmailDomain.trim()) return "Please enter your work email domain (e.g. @himalayawellness.com).";
      const check = validateCompanyCode(form.companyCode);
      if (!check.valid) return check.message;
    } else if (role === "academician") {
      if (!form.institution.trim()) return "Please enter your institution name.";
      const check = validateTeacherCode(form.teacherCode);
      if (!check.valid) return check.message;
    } else if (role === "institution") {
      if (!form.instituteName.trim()) return "Please enter your institution name.";
      if (!form.instituteId.trim()) return "Please enter your institution / AISHE ID.";
      const check = validateInstituteCode(form.instituteCode);
      if (!check.valid) return check.message;
    }
    return null;
  }

  function buildProfile() {
    return {
      name: form.name,
      email: form.email,
      password: form.password,
      role,
      institution: form.institution || form.instituteName,
      course: form.course,
      year: form.year,
      companyName: form.companyName,
      workEmailDomain: form.workEmailDomain,
      employeeId: form.employeeId,
      department: form.department,
      instituteName: form.instituteName,
      instituteId: form.instituteId,
      verifiedCode: form.teacherCode || form.companyCode || form.instituteCode || null,
    };
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    const validationError = validateSignupForm();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError(null);
    try {
      const data = await sendSignupOtp(form.email);
      // Always go through the verification step. The account is not created
      // and no session is established until the emailed code is confirmed.
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpToken(data.token);
      setDevOtp(data.devMode ? data.devOtp : null);
      setOtpTimer(60);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    setError(null);
    try {
      const data = await sendSignupOtp(form.email);
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpToken(data.token);
      setDevOtp(data.devMode ? data.devOtp : null);
      setOtpTimer(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(idx, value) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpDigits];
    next[idx] = value.slice(-1);
    setOtpDigits(next);
    if (value && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus();
  }

  async function handleVerifyAndRegister() {
    const otp = otpDigits.join("");
    if (otp.length !== 6) return setError("Please enter the complete 6-digit code.");
    setLoading(true);
    setError(null);
    try {
      const created = await completeSignup(buildProfile(), otp, otpToken);
      router.push(PAGE_PATHS[roleHomePage(created.role)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selected = roleConfig[role];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <div className="hidden lg:block lg:w-2/5 relative overflow-hidden">
        <img key={role} src={selected.image} alt={selected.label} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-br from-olive-900/80 to-olive-700/60" />
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          <button onClick={() => router.push("/")} className="flex items-center transition-opacity hover:opacity-90">
            <div className="bg-white rounded-lg px-2.5 py-1.5">
              <img src="/logo.png" alt="Skill Setu" className="h-6 w-auto object-contain" />
            </div>
          </button>
          <div>
            <div className="inline-block bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/80 mb-4">Smart India Hackathon · SIH26044</div>
            <h2 className="text-3xl font-semibold text-white mb-3 leading-snug">{selected.tagline}</h2>
            <p className="text-white/60 text-sm">India's cross-industry academia–industry platform.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 lg:py-0">
        <div className="w-full max-w-md">
          <button onClick={() => router.push("/")} className="lg:hidden flex items-center gap-1.5 text-sm text-muted-foreground mb-8 hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to home
          </button>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-foreground">{mode === "login" ? "Welcome back" : step === "otp" ? "Verify your email" : "Create account"}</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-7">
            {mode === "login" ? "Sign in to access your dashboard." : step === "otp" ? `Enter the 6-digit code sent to ${form.email}` : "Join the cross-industry skill & placement network."}
          </p>

          {step === "form" && (
            <>
              <div className="flex bg-secondary rounded-xl p-1 mb-2">
                {["login", "signup"].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {m === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mb-5">
                <DemoModeMenu />
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" required
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" required
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-accent disabled:opacity-60 text-white py-3.5 rounded-xl font-medium text-sm transition-all duration-150 hover:shadow-md flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Sign In"}
              </button>
            </form>
          )}

          {mode === "signup" && step === "form" && (
            <form onSubmit={handleSignupSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">I am a</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(roleConfig).map(([key, cfg]) => (
                    <button type="button" key={key} onClick={() => setRole(key)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${role === key ? "border-primary bg-primary/8 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setField("name", e.target.value)}
                  placeholder={role === "student" ? "Arjun Sharma" : role === "industry" ? "Riya Kapoor" : role === "academician" ? "Dr. Priya Nair" : "Dr. Meenakshi Sundaram"}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>

              {role === "student" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Institution</label>
                    <input type="text" value={form.institution} onChange={(e) => setField("institution", e.target.value)} placeholder="Rajasthan Institute of Ayurvedic & Applied Sciences"
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Course <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <input type="text" value={form.course} onChange={(e) => setField("course", e.target.value)} placeholder="BAMS / B.Tech CSE"
                        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Year</label>
                      <select value={form.year} onChange={(e) => setField("year", e.target.value)}
                        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                        <option value="">Select</option>
                        {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year", "Graduated"].map((y) => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {role === "industry" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Organisation</label>
                    <input type="text" value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} placeholder="Meridian Software Labs"
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Work Email Domain</label>
                    <input type="text" value={form.workEmailDomain} onChange={(e) => setField("workEmailDomain", e.target.value)} placeholder="@yourcompany.in"
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Company Partner Code</label>
                    <input type="text" value={form.companyCode} onChange={(e) => setField("companyCode", e.target.value)} placeholder="MERIDIAN-IND-9912"
                      className={`w-full bg-card border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase ${codeValidation.valid ? "border-green-400" : form.companyCode ? "border-red-300" : "border-border"}`} />
                    <p className="text-xs text-muted-foreground mt-1">{codeValidation.valid ? `✓ Verified: ${codeValidation.data?.company}` : "Sample: MERIDIAN-IND-9912, HIMADRI-IND-1902, SHAKTI-IND-1140"}</p>
                  </div>
                </>
              )}

              {role === "academician" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Institution</label>
                    <input type="text" value={form.institution} onChange={(e) => setField("institution", e.target.value)} placeholder="Rajasthan Institute of Ayurvedic & Applied Sciences"
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Department <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input type="text" value={form.department} onChange={(e) => setField("department", e.target.value)} placeholder="Mechanical Engineering"
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Teacher Code</label>
                    <input type="text" value={form.teacherCode} onChange={(e) => setField("teacherCode", e.target.value)} placeholder="RIAAS-FAC-2026"
                      className={`w-full bg-card border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase ${codeValidation.valid ? "border-green-400" : form.teacherCode ? "border-red-300" : "border-border"}`} />
                    <p className="text-xs text-muted-foreground mt-1">{codeValidation.valid ? `✓ Verified: ${codeValidation.data?.name}` : "Sample: RIAAS-FAC-2026, AIIA-FAC-1002, SIT-FAC-3301"}</p>
                  </div>
                </>
              )}

              {role === "institution" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Institution Name</label>
                    <input type="text" value={form.instituteName} onChange={(e) => setField("instituteName", e.target.value)} placeholder="Rajasthan Institute of Ayurvedic & Applied Sciences"
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Institution / AISHE ID</label>
                    <input type="text" value={form.instituteId} onChange={(e) => setField("instituteId", e.target.value)} placeholder="AISHE-U-0417"
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Institute Verification Code</label>
                    <input type="text" value={form.instituteCode} onChange={(e) => setField("instituteCode", e.target.value)} placeholder="RIAAS-INST-001"
                      className={`w-full bg-card border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all uppercase ${codeValidation.valid ? "border-green-400" : form.instituteCode ? "border-red-300" : "border-border"}`} />
                    <p className="text-xs text-muted-foreground mt-1">{codeValidation.valid ? `✓ Verified: ${codeValidation.data?.institution}` : "Sample: RIAAS-INST-001, AIIA-INST-002, SIT-INST-006"}</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="you@example.com" required
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder="Min. 6 characters" required minLength={6}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-primary hover:bg-accent disabled:opacity-60 text-white py-3.5 rounded-xl font-medium text-sm transition-all duration-150 hover:shadow-md flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Send Verification Code →"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <div>
              <div className="bg-secondary rounded-xl p-4 mb-6 text-sm text-muted-foreground">
                <div>We sent a 6-digit one-time verification code to:</div>
                <div className="font-semibold text-primary mt-1">{form.email}</div>
              </div>

              {devOtp && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 mb-6 text-sm">
                  <span className="font-semibold">Development mode</span> — no email was sent. Your code is{" "}
                  <span className="font-mono font-bold tracking-widest">{devOtp}</span>. Enter it below to continue.
                </div>
              )}

              <div className="flex justify-center gap-2.5 mb-6">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-11 h-13 py-2 text-center text-xl font-semibold rounded-xl border-2 bg-card text-foreground focus:outline-none transition-all ${digit ? "border-primary" : "border-border"}`}
                  />
                ))}
              </div>

              <button onClick={handleVerifyAndRegister} disabled={loading}
                className="w-full bg-primary hover:bg-accent disabled:opacity-60 text-white py-3.5 rounded-xl font-medium text-sm transition-all duration-150 hover:shadow-md mb-4 flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Verify & Create Account ✓"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button onClick={() => { setStep("form"); setError(null); }} className="text-muted-foreground hover:text-foreground underline">← Back to edit details</button>
                <button onClick={resendOtp} disabled={otpTimer > 0 || loading} className={`font-medium ${otpTimer > 0 || loading ? "text-muted-foreground" : "text-primary hover:underline"}`}>
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {step === "form" && (
            <p className="text-center text-sm text-muted-foreground mt-5">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-medium hover:underline">
                {mode === "login" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
