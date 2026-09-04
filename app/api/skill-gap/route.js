import { NextResponse } from "next/server";

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
  
  // Sector-based weighting
  const isAyush = /ayush|ayurveda|yoga|unani|siddha|homeopathy|wellness/i.test(sector) || /ayush|ayurveda|clinical|panchakarma/i.test(targetJob);
  const isTech = /tech|software|data|programming|developer|ai|informatics/i.test(sector) || /developer|engineer|data/i.test(targetJob);

  const matchPercentage = Math.max(45, Math.min(92, Math.round(avgScore * 0.9 + (isAyush ? 4 : 2))));
  const readinessLevel = matchPercentage >= 78 ? "Near-Ready" : matchPercentage >= 60 ? "Intermediate" : "Needs Upskilling";

  const criticalGaps = lowest.map(([skill, score]) => {
    const severity = score < 55 ? "High" : score < 72 ? "Medium" : "Low";
    let impact = `Identified as a critical competency driver for ${targetJob}.`;
    if (skill.includes("Data") || skill.includes("Programming")) {
      impact = "Key requirement for modern digital reporting, telemetry, and clinical data compliance.";
    } else if (skill.includes("Research") || skill.includes("Traditional")) {
      impact = "Essential for regulatory documentation, GCP protocol compliance, and literature reviews.";
    } else if (skill.includes("Quantitative") || skill.includes("Problem")) {
      impact = "Core benchmark for analytical troubleshooting and industrial operational workflows.";
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
          resource: isAyush ? "Swayam / Ayush National Portal" : "NPTEL / IIT Madras Online Track",
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
          resource: isAyush ? "Pharmacovigilance & GCP Guidelines (MoA)" : "CDAC / Open Source Industry Modules",
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
    ayushSpecificIntervention: isAyush
      ? "Cross-Sector Bridge: Combines classical therapeutic knowledge with modern Good Clinical Practice (GCP) and computerized hospital information systems (HMIS) for fast-track clinical trial roles."
      : "Mainstream Bridge: Focuses on industry-standard tooling, cross-functional agile dynamics, and verifiable repository proof-of-work.",
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
Focus specifically on Indian national skilling ecosystems: NPTEL, Swayam, MoA (Ministry of Ayush) protocols, CDAC, and practical open-source capstones.

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
  "ayushSpecificIntervention": string (interdisciplinary bridge context)
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
