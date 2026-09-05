import { NextResponse } from "next/server";

/**
 * Learning ecosystems per track.
 *
 * Every sector the platform serves gets its own suggested resources. The
 * previous version had exactly two branches — AYUSH, and "everyone else" — so a
 * mechanical engineering student and a finance student were both handed the
 * same generic link, and only one vertical was actually catered for.
 */
const FOUNDATION_RESOURCE = {
  ayush: "Swayam · Ministry of Ayush national courses",
  technology: "NPTEL · IIT Madras online track",
  health: "Swayam · Public health & life sciences track",
  business: "NPTEL Management · IIM open courseware",
  engineering: "NPTEL Core Engineering · NITTTR modules",
  general: "Swayam / NPTEL foundation courses",
};

const APPLIED_RESOURCE = {
  ayush: "Pharmacovigilance & GCP guidelines (Ministry of Ayush)",
  technology: "CDAC & open-source industry modules",
  health: "ICMR / NABH practice guidelines",
  business: "NISM & industry certification modules",
  engineering: "BIS standards & CAD/CAM practice labs",
  general: "CDAC & open-source industry modules",
};

const SECTOR_INTERVENTION = {
  ayush:
    "Cross-sector bridge: pairs classical therapeutic training with Good Clinical Practice and hospital information systems, which is what clinical-research employers screen for.",
  technology:
    "Cross-sector bridge: pairs coursework with a public repository of working code — verifiable proof-of-work is what technical screens actually look at.",
  health:
    "Cross-sector bridge: pairs clinical knowledge with documentation, biostatistics and regulatory practice, the parts of the job coursework rarely covers.",
  business:
    "Cross-sector bridge: pairs analytical coursework with a live case study and a modelled financial or operational decision, presented as a deliverable.",
  engineering:
    "Cross-sector bridge: pairs design fundamentals with tolerancing, quality systems and a fabricated or simulated artefact you can show.",
  general:
    "Cross-sector bridge: pairs industry-standard tooling with cross-functional working and something you can point at as evidence.",
};

/**
 * Deterministic analytical bridge generator used as a live-demo fail-safe.
 * If the Gemini API key is missing, network is severed, or latency spikes at the venue,
 * this function produces an instant, mathematically coherent, domain-tailored analysis.
 */
function generateDeterministicFallback(scores = {}, targetJob = "General Industry Role", sector = "Technology") {
  const entries = Object.entries(scores);
  // Sort lowest to highest to identify critical gaps
  entries.sort((a, b) => a[1] - b[1]);

  const lowest = entries.slice(0, 3);
  const avgScore = entries.length ? Math.round(entries.reduce((acc, curr) => acc + curr[1], 0) / entries.length) : 65;
  
  /* Which learning ecosystem to point at. This decides *which resources are
     suggested*, and nothing else — it must not move the score. It used to add
     +4 to an AYUSH-sector match and +2 to everyone else's, which quietly made
     the same competency profile worth more in one sector than another. The
     bonus is now flat, so a match score means the same thing platform-wide. */
  const haystack = `${sector} ${targetJob}`;
  const track =
    /ayush|ayurveda|yoga|unani|siddha|homeopath|panchakarma|wellness/i.test(haystack)
      ? "ayush"
      : /tech|software|data|programming|developer|\bai\b|informatics|cloud|cyber/i.test(haystack)
      ? "technology"
      : /pharma|biotech|clinical|hospital|health|nursing|medical/i.test(haystack)
      ? "health"
      : /finance|bank|account|audit|consult|management|marketing|sales|\bhr\b/i.test(haystack)
      ? "business"
      : /mechanical|civil|electrical|manufactur|production|automobile|energy/i.test(haystack)
      ? "engineering"
      : "general";

  const matchPercentage = Math.max(45, Math.min(92, Math.round(avgScore * 0.9 + 2)));
  const readinessLevel = matchPercentage >= 78 ? "Near-Ready" : matchPercentage >= 60 ? "Intermediate" : "Needs Upskilling";

  /* Why a gap matters, phrased for the student's own sector. These strings
     used to describe every gap in clinical-compliance terms regardless of who
     was reading — a computer science student was told their Programming score
     mattered for "clinical data compliance". */
  const clinical = track === "ayush" || track === "health";
  const criticalGaps = lowest.map(([skill, score]) => {
    const severity = score < 55 ? "High" : score < 72 ? "Medium" : "Low";
    let impact = `Identified as a critical competency driver for ${targetJob}.`;
    if (skill.includes("Data") || skill.includes("Programming")) {
      impact = clinical
        ? "Underpins digital health records, reporting and clinical data compliance."
        : "Underpins the day-to-day work in this role — reporting, tooling and automation.";
    } else if (skill.includes("Research") || skill.includes("Documentation")) {
      impact = clinical
        ? "Essential for regulatory documentation, GCP protocol compliance and literature review."
        : "Essential for specifications, technical writing and evidence-backed decisions.";
    } else if (skill.includes("Quantitative") || skill.includes("Problem")) {
      impact = "A core screening benchmark: analytical troubleshooting and structured decision-making.";
    } else if (skill.includes("Verbal") || skill.includes("Business")) {
      impact = "How your work is understood by everyone who did not do it — the most commonly under-weighted gap.";
    }
    return { skill, score, severity, impact };
  });

  const primaryGap = criticalGaps[0]?.skill || "Data Analysis & Interpretation";
  const secondaryGap = criticalGaps[1]?.skill || "Programming & Digital Fundamentals";

  return {
    matchPercentage,
    readinessLevel,
    targetJob,
    sector,
    criticalGaps,
    bridgeRoadmap: {
      days_1_30: [
        {
          action: `Foundational Masterclass in ${primaryGap}`,
          resource: FOUNDATION_RESOURCE[track],
          type: "Course",
          duration: "Weeks 1–4",
        },
        {
          action: "Core Competency Diagnostics & Benchmark Quizzes",
          resource: "Skill Setu Assessment Sandbox",
          type: "Assessment",
          duration: "Weekly Milestones",
        },
      ],
      days_31_60: [
        {
          action: `Hands-on Applied Capstone: ${targetJob} Case Study`,
          resource: "GitHub & Skill Setu Collaborative Labs",
          type: "Project",
          duration: "Weeks 5–8",
        },
        {
          action: `Bridging Practical Workflows in ${secondaryGap}`,
          resource: APPLIED_RESOURCE[track],
          type: "Course",
          duration: "Weeks 7–8",
        },
      ],
      days_61_90: [
        {
          action: "Industry Mentorship Simulation & Portfolio Verification",
          resource: "Skill Setu Verified Credential Registry",
          type: "Certification",
          duration: "Weeks 9–11",
        },
        {
          action: "Mock Technical Screening & Placement Drive Readiness",
          resource: "Partner Employer Fast-Track Portal",
          type: "Placement Prep",
          duration: "Week 12",
        },
      ],
    },
    sectorIntervention: SECTOR_INTERVENTION[track],
    sectorTrack: track,
    isFallback: true,
  };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { studentScores = {}, targetJob = "Industry Intern", sector = "Cross-Sector" } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    // Live Demo Fail-Safe: If no API key is provided, instantly return the rich analytical fallback
    if (!apiKey) {
      console.log("[SkillGap API] No GEMINI_API_KEY detected. Utilizing zero-latency deterministic fallback engine.");
      const fallbackData = generateDeterministicFallback(studentScores, targetJob, sector);
      return NextResponse.json({ success: true, data: fallbackData, mode: "offline_fallback" });
    }

    // Prepare structured prompt for Gemini
    const scoresSummary = Object.entries(studentScores)
      .map(([k, v]) => `- ${k}: ${v}/100`)
      .join("\n");

    const prompt = `
You are the Chief AI Skill Bridge Architect for "Skill Setu" (Smart India Hackathon SIH26044).
Analyze this student's verified competency scores against their target role:

STUDENT ASSESSED SCORES:
${scoresSummary || "General benchmark score: 68/100 across standard domains."}

TARGET CAREER OPPORTUNITY:
- Role: "${targetJob}"
- Sector: "${sector}"

YOUR TASK:
Produce a deterministic, highly actionable 30-60-90 Day Skill Bridge Roadmap to elevate the student from their current competency level to industry-ready.
Draw on Indian national skilling ecosystems relevant to THIS student's sector — NPTEL, Swayam, CDAC, NISM, BIS, ICMR, or Ministry of Ayush protocols as appropriate. Do not default to any one sector.

OUTPUT RULES:
- Return ONLY valid JSON (no markdown fences, no explanatory text outside the JSON object).
- Strictly adhere to this JSON structure:
{
  "matchPercentage": number between 40 and 95,
  "readinessLevel": "Near-Ready" | "Intermediate" | "Needs Upskilling",
  "criticalGaps": [
    { "skill": string, "severity": "High" | "Medium", "impact": string }
  ],
  "bridgeRoadmap": {
    "days_1_30": [
      { "action": string, "resource": string, "type": "Course" | "Project" | "Assessment", "duration": string }
    ],
    "days_31_60": [
      { "action": string, "resource": string, "type": "Course" | "Project" | "Assessment", "duration": string }
    ],
    "days_61_90": [
      { "action": string, "resource": string, "type": "Course" | "Project" | "Certification" | "Placement Prep", "duration": string }
    ]
  },
  "sectorIntervention": string (interdisciplinary bridge context for THIS sector)
}
`;

    // 4-second timeout to guarantee pitch responsiveness
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      console.warn(`[SkillGap API] Gemini API responded with status ${geminiRes.status}. Engaging fallback.`);
      const fallback = generateDeterministicFallback(studentScores, targetJob, sector);
      return NextResponse.json({ success: true, data: fallback, mode: "api_fallback" });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Empty response from Gemini API");
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Clean possible stray backticks if returned
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return NextResponse.json({
      success: true,
      data: { ...parsed, isFallback: false },
      mode: "gemini_live",
    });
  } catch (err) {
    console.error("[SkillGap API] Exception during analysis. Returning safe fallback:", err.message);
    const body = await req.json().catch(() => ({}));
    const fallback = generateDeterministicFallback(body?.studentScores, body?.targetJob, body?.sector);
    return NextResponse.json({ success: true, data: fallback, mode: "safe_catch_fallback" });
  }
}
