import { api } from "../../../convex/_generated/api";
import { chargeAiRun, refundAiRun, requireStudent } from "../../../lib/apiHost";
import { AI_NOT_CONFIGURED, AYUSH_CONTEXT, GEMINI_MODEL, GeminiError, aiConfigured, generateJson } from "../../../lib/gemini";
import { loadSources, skippedNotes } from "../../../lib/docSources";
import { RESUME } from "../../../lib/settings";
import { CAREER_TRACKS, RESUME_SCHEMA, portfolioToText, validateResumeResult } from "../../../lib/resumeAnalysis";

/**
 * Resume Coach: a student's resume (or their Skill Setu portfolio) read
 * against their verified test record and the tests they can actually take.
 *
 * The model gets the resume, the student's graded results (fetched here from
 * Convex, never from the browser), the catalogue of takeable tests, the
 * platform's skill domains and the chosen target. What comes back is checked
 * by lib/resumeAnalysis.js before it is stored: unknown tests dropped,
 * links stripped from references, evidence checked against the resume text,
 * "claimed vs verified" decided by code, contact details removed.
 */

/** Only the portfolio's own sections, each bounded — nothing else from the request body. */
function cleanPortfolio(p) {
  if (!p || typeof p !== "object") return null;
  const list = (v, n = 20) => (Array.isArray(v) ? v.slice(0, n).map((x) => (x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([, val]) => typeof val === "string").map(([k, val]) => [k, val.slice(0, 300)])) : {})) : []);
  const badges = {};
  Object.entries(p.skillBadges && typeof p.skillBadges === "object" ? p.skillBadges : {})
    .slice(0, 10)
    .forEach(([cat, items]) => {
      badges[String(cat).slice(0, 60)] = list(items, 30);
    });
  return { headline: String(p.headline || "").slice(0, 200), bio: String(p.bio || "").slice(0, 1500), education: list(p.education), skillBadges: badges, projects: list(p.projects), timeline: list(p.timeline), certifications: list(p.certifications) };
}

function buildPrompt({ context, target, resumeNote }) {
  return [
    AYUSH_CONTEXT,
    "You are the Resume Coach for an AYUSH student. Read the resume and compare what it CLAIMS with what the student's test results VERIFY.",
    resumeNote,
    `Student profile on Skill Setu: ${JSON.stringify(context.profile)}.`,
    `Verified skill scores by domain (0–100, from proctored tests): ${JSON.stringify(context.verified)}.`,
    `Last graded tests: ${JSON.stringify(context.recent)}.`,
    `Certificates held: ${JSON.stringify(context.certificates)}.`,
    `Skill domains on the platform (use these names exactly for domainReadiness and generalTestAreas): ${JSON.stringify(context.skillDomains)}.`,
    `Tests the student can take now (recommend ONLY from these testId values, at most 3): ${JSON.stringify(context.catalogue.map(({ startsAtMs, ...t }) => t))}.`,
    target ? `The student is aiming for: ${JSON.stringify(target)}. Fill targetMatch against it.` : 'No target was chosen: set targetMatch to { "targetTitle": "", "matchPercent": 0, "matched": [], "missing": [] }.',
    "Rules:",
    "- transcript: the resume's own text, as written (for checking your evidence).",
    "- Every evidence field is a short phrase copied from the resume.",
    "- domainReadiness.resumeSignal: 0–100, how strongly the resume claims that domain. Do not judge verification — the platform does that.",
    "- nextTests: why each test fits, the topics to prepare first, and readinessNow (0–100). If none fit, leave it empty and fill generalTestAreas.",
    "- studyPlan: 1–8 weeks; topics with subtopics, why it matters, estimated hours and references to named texts or syllabus units only (e.g. \"Charaka Samhita, Sutrasthana ch. 1\", \"Ayurvedic Pharmacopoeia of India, Part I\", \"NCISM BAMS 2nd Prof syllabus: Dravyaguna Unit 3\") — never URLs. Link a topic to a recommended test with forTestId, or \"\".",
    "- resumeFixes: ATS problems — missing sections, unquantified outcomes, vague skills, contact block issues — each with a before/after example.",
    "- profile.summary: at most 60 words. Never repeat phone numbers, emails, addresses or ID numbers anywhere.",
    "- If the resume is not about AYUSH, say so in warnings and still map what you can to the AYUSH domains.",
    "Return only JSON matching the schema.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  if (!aiConfigured()) return res.status(AI_NOT_CONFIGURED.status).json(AI_NOT_CONFIGURED.body);
  const auth = await requireStudent(req, res);
  if (!auth) return undefined;

  const body = req.body || {};
  const consentAt = Number(body.consentAt);
  if (!Number.isFinite(consentAt) || consentAt <= 0) return res.status(400).json({ success: false, error: "Tick the consent box first — your resume is read by an AI model." });
  const source = body.source === "portfolio" ? "portfolio" : "upload";
  const resume = source === "upload" && body.resume && typeof body.resume === "object" ? body.resume : null;
  if (source === "upload" && !resume?.storageId) return res.status(400).json({ success: false, error: "Upload your resume, or choose \"Use my Skill Setu portfolio\"." });

  let context;
  try {
    context = await auth.convex.query(api.resume.context, { sessionToken: auth.sessionToken, internshipId: body.target?.internshipId || undefined });
  } catch (error) {
    console.error("[resume] context:", error);
    return res.status(503).json({ success: false, error: "Your test results couldn't be read right now. Please try again." });
  }

  let target = null;
  if (context.target) target = { kind: "posting", ...context.target };
  else if (body.target?.kind === "track" && CAREER_TRACKS.includes(body.target.title)) target = { kind: "track", title: body.target.title };

  if (!(await chargeAiRun(auth, res, "resume"))) return undefined;

  // The resume itself: the uploaded file through the shared reader, or the
  // portfolio written out as text.
  let parts = [];
  let resumeText = "";
  let resumeNote = "";
  if (resume) {
    const { docs, skipped } = await loadSources(auth, [resume], { maxFiles: 1 });
    if (!docs.length) {
      await refundAiRun(auth, "resume");
      return res.status(422).json({ success: false, code: "RESUME_UNREADABLE", error: skippedNotes(skipped)[0] || "Your resume couldn't be read.", canUsePortfolio: true });
    }
    parts = docs[0].parts;
    resumeText = docs[0].text; // "" for a PDF or a photo: the model's transcript is used instead
    resumeNote = "The attached source is the student's resume.";
  } else {
    // The shared portfolio first; a device-only one (the demo tour's sample
    // profile is never mirrored) as the fallback. Either way it is the
    // student's own data, used only for their own analysis.
    const sent = cleanPortfolio(body.portfolio);
    resumeText = portfolioToText(context.profile, context.portfolio);
    if (resumeText.split("\n").length < 3 && sent) resumeText = portfolioToText(context.profile, sent);
    if (resumeText.split("\n").length < 3) {
      await refundAiRun(auth, "resume");
      return res.status(422).json({ success: false, error: "Your portfolio is nearly empty. Add your education, skills and projects there, or upload a resume." });
    }
    parts = [{ text: `=== Source 1 of 1: "Skill Setu portfolio" ===\n${resumeText}` }];
    resumeNote = "The student has no resume file; the attached source is their Skill Setu portfolio written out as a resume.";
  }

  let raw;
  const meta = {};
  try {
    raw = await generateJson({ prompt: buildPrompt({ context, target, resumeNote }), schema: RESUME_SCHEMA, parts, temperature: 0.3, meta });
  } catch (error) {
    if (error instanceof GeminiError) {
      if (error.code !== "AI_MALFORMED") await refundAiRun(auth, "resume");
      return res.status(error.status || 502).json({ success: false, code: error.code, error: error.message, canUsePortfolio: source === "upload" });
    }
    console.error("[resume]", error);
    return res.status(502).json({ success: false, error: "The analysis couldn't be completed. Please try again.", canUsePortfolio: source === "upload" });
  }

  const { result, dropped } = validateResumeResult(raw, {
    catalogue: context.catalogue,
    skillDomains: context.skillDomains,
    resumeText,
    verified: context.verified,
    hasTarget: Boolean(target),
  });
  if (dropped.tests.length) console.warn(`[resume] Dropped ${dropped.tests.length} recommended test id(s) not in the catalogue: ${dropped.tests.join(", ")}`);

  try {
    const saved = await auth.convex.mutation(api.resume.saveAnalysis, {
      sessionToken: auth.sessionToken,
      resumeStorageId: resume?.storageId || null,
      resumeFileName: resume?.fileName || (source === "portfolio" ? "Skill Setu portfolio" : null),
      source,
      target,
      result,
      model: meta.model || GEMINI_MODEL,
      consentAt,
    });
    return res.status(200).json({ success: true, id: saved.id, result, dropped: { tests: dropped.tests.length, domains: dropped.domains.length, references: dropped.references }, retentionDays: RESUME.RETENTION_DAYS });
  } catch (error) {
    console.error("[resume] save:", error);
    return res.status(500).json({ success: false, error: "The analysis was made but couldn't be saved. Please try again." });
  }
}

export const config = { api: { responseLimit: false } };
