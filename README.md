# Skill Setu — AYUSH Academia–Industry Collaboration Portal

**Skill Mapping, Internships & Placements for Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homoeopathy**
Smart India Hackathon · Ministry of AYUSH · Problem Statement SIH26044

---

## What is Skill Setu?

**Skill Setu** ("bridge") is the academia–industry portal for the AYUSH ecosystem, connecting **BAMS / BHMS / BUMS / BSMS / BNYS students**, **AYUSH faculty**, **ASU&H industry partners** (drug manufacturers, Ayurveda hospitals, research councils, wellness and export trade) and **AYUSH colleges**. It covers the full lifecycle described in the Ministry of AYUSH problem statement: AYUSH-specific skill assessment, skill mapping, internship & job discovery, faculty development programmes, and placement analytics shaped for NCISM/NCH and NAAC reporting.

## Four Dedicated Workspaces

- **Student** — take AYUSH skill tests (ASU&H clinical fundamentals, herbal drug quality & GMP, research documentation, digital health, practice management), browse & apply to Panchakarma, clinical, pharma, research and wellness internships, build a verified digital portfolio, track applications.
- **Industry** — ASU&H manufacturers, hospitals and research councils post internships/jobs with BAMS/BHMS/BUMS/BSMS eligibility filters, manage an applicant pipeline (Applied → Shortlisted → Interview → Hired), host skill tests.
- **Academician** — host Faculty Development Programmes (FDPs), propose and respond to CTRI-registered research collaborations, mentor and track student progress.
- **Institution** — a dedicated placement & skill analytics dashboard for AYUSH colleges (funnel, cohort skill gaps by programme, department-wise placement rates).

## How it's built

- **Next.js 14** (App Router) + **Tailwind CSS** for the UI.
- **Convex** for server-side accounts and data. Every collection a user creates — postings, applications, registrations, portfolios, bookmarks, notifications, mentorship, research collaborations, hiring teams, reviews, and the institution's drives, MOUs, notices, roster and placement records — is owned by the account that created it and readable from any device. The browser keeps a local copy in `lib/store.js` so screens read synchronously; every write is mirrored to Convex in the background and every list read pulls the server's rows back on a 20-second throttle (`lib/remoteSync.js` and the `lib/*Sync.js` modules). Uploaded files (resumes, proofs, MOU scans, logos, gallery images) live in Convex file storage, with limits in `lib/settings.js`.
- **Institution data is keyed by the institution account**, not by the typed institute name (`lib/institutionKey.js`); a student or faculty member sees their college's drives and notices because their account resolves to that institution. Legacy rows are attached once by `npx convex run migrations:keyInstitutionRowsByAccount`.
- **Demo mode is sealed**: the four demo personas are real accounts whose ids start with `demo-`; `lib/demoIsolation.js` on the client and `lib/authzRules.js` on the server keep their rows out of the real portals and real rows out of the tour.
- **Real OTP-verified signup** via `pages/api/send-otp.js` / `pages/api/verify-otp.js` (Nodemailer). Without email credentials configured, verification codes are shown directly in the UI (dev mode) instead of being emailed.
- Role-based signup is gated by verification codes for industry/academician/institution accounts (`lib/registry.js`) — a small stand-in for a real organisation-verification workflow.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

For accounts to work across devices, run `npx convex dev` in a separate terminal — it provisions a Convex deployment and writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local` automatically. Without it, accounts fall back to the current browser's `localStorage`.

To send real OTP emails, add Gmail SMTP credentials to `.env.local`:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

(Generate an App Password at https://myaccount.google.com/apppasswords.) Set `OTP_DEV_MODE=true` instead to skip email entirely — the code is shown directly in the UI.

## Skill tests, exam room and certificates

- Every test, posting and student/faculty profile carries one of the five **AYUSH Systems** (`lib/ayush.js` is the single source of the list).
- Hosts write or AI-generate a question paper (`/api/ai/generate-questions`, `/api/ai/recheck-question`); answer keys and explanations live only in the Convex `skillTestQuestions` table.
- Online tests are sat in the **secure exam room**: consent, camera/mic check, fullscreen with Esc locked (an **End test** control is always in the banner), continuous chunked recording to Convex file storage, on-device face monitoring (MediaPipe Face Landmarker: no face, extra faces, looking away), and server-side grading. Every violation costs a penalty the host sets per test (default 2 points, never more than the paper); when the penalties reach the paper's total, or the camera is switched off, the attempt fails. Hosts open the proctoring report from each test card.
- Hosts can build a paper with AI, write it by hand, or **import their own PDF** (questions and options copied as written; missing answer keys and explanations are generated and badged). Any test — online, offline or hybrid — can carry up to five sample papers and issue certificates automatically (from the graded paper, or from the mark the host records).
- Certificates are issued automatically on grading (`/certificate-settings` holds the reusable branding; a test can override it) and downloaded as PDFs from `/api/certificates/<id>`; anyone can verify one at `/verify/<code>`.
- Every limit (violation budget, grace timers, retention days, AI caps, upload sizes) lives in `lib/settings.js`.
- `npm test` runs the grading, question-model, AYUSH-list and exam-state suites with Node's built-in runner.

## Build for Production

```bash
npm run build
npm run start
```

Deploys cleanly to Vercel with zero extra configuration.
