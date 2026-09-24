# Skill Setu — Idea Description

**Problem Statement:** SIH26044 (Ministry of AYUSH) — Skill mapping, internships and placements for Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homoeopathy.

---

## Abstract

Every year, lakhs of BAMS, BHMS, BUMS, BSMS and BNYS graduates leave AYUSH colleges with a degree but no standard way to prove what they can actually do — run a Panchakarma protocol, judge herbal drug quality against GMP, or handle clinical documentation. Generic job portals don't model these skills, so ASU&H manufacturers, hospitals and research councils end up screening candidates on trust rather than evidence, and colleges have no real data on cohort skill gaps or placement outcomes to report to NCISM/NCH and NAAC.

**Skill Setu** ("bridge") closes that gap with one portal built around a single idea: skill verification as the source of truth. Students take proctored, AYUSH-specific skill tests — AI-generated from faculty material or written by hand — and get a certificate that anyone can verify with a code. That verified record then drives everything else: internship and job matching with eligibility filters by degree and AYUSH system, an applicant pipeline for industry, a Resume Coach that flags resume claims the tests don't back up, and a live placement/skill-gap dashboard for institutions.

It's a working full-stack product today — Next.js and Convex, on-device face-monitoring for proctoring (no footage sent to a third party), Gemini-assisted paper generation, and PDF-based certificates verifiable at scale — not a mockup, which makes it realistic to pilot across AYUSH colleges without heavy infrastructure cost.

## The Problem and Why It Matters

India has over 500 AYUSH colleges producing a large annual pipeline of Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homoeopathy graduates, but none of the placement infrastructure that mainstream engineering or management education has built up. Three groups feel this gap directly:

- **Students** have no standard, portable way to demonstrate AYUSH-specific competencies — clinical fundamentals, herbal drug quality/GMP, research documentation, digital health, practice management — to an employer who wasn't in the room when they learned it.
- **Industry** (drug manufacturers, Ayurveda hospitals, research councils, wellness and export trade) has to hire on degree and interview alone, with no independent signal of practical skill, which slows hiring and raises mis-hire risk in a regulated, safety-sensitive field.
- **Colleges and faculty** lack a structured channel to run Faculty Development Programmes, pursue CTRI-registered research collaborations with industry, or produce the placement and skill-outcome data that NCISM/NCH and NAAC reporting requires — today it's manual, spreadsheet-driven, and hard to trust.

The result is a systemic mismatch: a growing, government-prioritised AYUSH sector without a reliable skill-mapping backbone connecting its academic output to its industry demand.

## The Proposed Solution

Skill Setu is an academia–industry portal with four dedicated workspaces — **Student, Industry, Academician, Institution** — all reading from and writing to the same underlying skill record, so no workspace is an island.

**How it works end to end:**
1. A host (faculty or industry) creates a skill test tagged to one of the five AYUSH systems, either written by hand, AI-generated from the host's own teaching material (PDF/DOCX/PPTX/notes, with each question tracing back to a source), or imported from an existing paper.
2. Students sit the test in a secure exam room — consent, camera/mic check, locked fullscreen, continuous recording, and on-device face monitoring that flags no-face, extra-face or looking-away — and get graded automatically against a penalty budget the host sets.
3. A certificate is issued automatically on grading, carrying a unique code anyone can check at a public verify page, singly or in bulk.
4. That verified result becomes the backbone for internship/job matching (industry posts with BAMS/BHMS/BUMS/BSMS eligibility filters), a Resume Coach that cross-checks resume claims against verified results, a portfolio the student controls, and, at the institution level, a live cohort-wide skill-gap and placement funnel — all built from real, verified events rather than self-reported data.

## Key Features and What Makes It Different

- **AYUSH-native, not generic.** Every test, posting and profile is tagged to one of the five AYUSH systems from a single source of truth, so matching and reporting are meaningful for this sector specifically, unlike a generic skills taxonomy borrowed from IT/engineering hiring platforms.
- **Verification instead of self-reporting.** Certificates are independently checkable by code, and the Resume Coach explicitly separates what a candidate *claims* from what a proctored test has *verified* — the core trust problem industry actually has.
- **Low-cost, privacy-respecting proctoring.** Face monitoring runs on-device (MediaPipe), so no exam footage is streamed to a third-party vision API — proctoring at scale without per-minute SaaS proctoring costs.
- **AI that reduces faculty workload without losing local relevance.** Question papers can be generated from a faculty member's own notes/slides, with each question citable back to its source, rather than generic AI-authored content.
- **Institution-grade reporting by construction.** Because every record is owned by the account (not a typed institute name), placement funnels and skill-gap analytics stay accurate — the exact shape NCISM/NCH and NAAC reporting needs.
- **Built for collaboration, not just testing.** Academicians can host FDPs, propose CTRI-registered research collaborations with industry, and run moderated communities with shared materials and tests, so the platform supports the full academia–industry relationship, not only student assessment.

## Technology Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS.
- **Backend/data:** Convex for accounts, real-time-synced collections (postings, applications, tests, certificates, portfolios, research collaborations, institution records) and file storage; a local store mirrors reads for instant UI response.
- **Proctoring:** MediaPipe Face Landmarker running on-device for face-presence/attention monitoring during exams.
- **AI:** Google Gemini for question-paper generation from source documents, topic mapping, resume analysis and certificate design.
- **Documents/PDF:** pdf-lib for certificate generation and PDF question-paper import.
- **Auth/communication:** OTP-verified signup via Nodemailer; role-based verification codes for industry/academician/institution accounts.
- **Deployment:** deploys to Vercel with no extra configuration.

## Expected Impact

- **Students** get a portable, verifiable record of AYUSH-specific competency that travels with them into internship and job applications, instead of a degree that says nothing about practical skill.
- **Industry** gets faster, more confident hiring — pre-verified skill signals cut screening time and mis-hire risk in a field where clinical/quality competence matters.
- **Institutions** get ready-made, accurate placement and skill-gap data for NCISM/NCH and NAAC reporting, plus visibility into where their curriculum is under- or over-serving industry needs.
- **The AYUSH sector at large** gets a scalable skill-mapping backbone across its 500+ colleges, supporting the Ministry of AYUSH's push to grow a credibly-skilled workforce for herbal drug manufacturing, clinical practice, wellness and export trade.

## Feasibility

This isn't a concept sketch — the four workspaces, the proctored exam flow, AI-assisted paper generation, and certificate issuance/verification are already implemented and working end to end. The stack is deliberately low-cost to run and scale: Convex's serverless model avoids managing servers, on-device face monitoring avoids per-minute proctoring fees, and the app deploys to Vercel without custom infrastructure. The main scale-up step is replacing today's manual organisation-verification codes for industry/academician/institution signup with a direct integration against an official NCISM/AYUSH registry — a well-scoped follow-on, not a redesign.
