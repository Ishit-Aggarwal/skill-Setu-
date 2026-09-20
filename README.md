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
- **Convex** for server-side accounts and data — users, internships, applications, skill tests, portfolios, and programs are stored in a shared cloud database, enabling sign-in from any device. Falls back to a browser-local `localStorage` store (`lib/store.js`) if `NEXT_PUBLIC_CONVEX_URL` isn't configured.
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
- Online tests are sat in the **secure exam room**: consent, camera/mic check, fullscreen, continuous chunked recording to Convex file storage, real-time violation flags, server-side grading. Hosts open the proctoring report from each test card.
- Certificates are issued automatically on grading (`/certificate-settings` holds the reusable branding; a test can override it) and downloaded as PDFs from `/api/certificates/<id>`; anyone can verify one at `/verify/<code>`.
- Every limit (violation budget, grace timers, retention days, AI caps, upload sizes) lives in `lib/settings.js`.
- `npm test` runs the grading, question-model, AYUSH-list and exam-state suites with Node's built-in runner.

## Build for Production

```bash
npm run build
npm run start
```

Deploys cleanly to Vercel with zero extra configuration.
