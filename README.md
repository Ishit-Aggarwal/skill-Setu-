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
- A test is either a **fixed sitting** or an **open window** (24 hours to 90 days; each candidate may start any time until `close − duration`, so everyone gets the full time). Window papers can shuffle questions and deal each candidate N of a larger pool; answers are revealed only after the window closes.
- Hosts can generate a paper **from their own documents** (PDF, DOCX, PPTX, XLSX, TXT, Markdown and images): a topic map first, then questions with a citation back to the source, or import an existing paper split across several files.
- **Communities** (professors and institutions): Open, Closed or Invite-only, with posts, materials, links, members-only tests, moderation and an audit log.
- **Resume Coach** (students): what the resume claims against what the proctored tests have verified, the next tests to take (only real, visible ones) and a study plan.
- Every certificate carries the candidate's details and a unique verification code. Students download it, share it to LinkedIn and choose whether it shows on their profile; companies, professors and institutions verify one or up to 50 codes at once at `/verify`. Set `NEXT_PUBLIC_SITE_URL` so the printed verify address is your public domain.
- Every limit (violation budget, grace timers, retention days, AI caps, upload sizes) lives in `lib/settings.js`.
- `npm test` runs the grading, question-model, AYUSH-list and exam-state suites with Node's built-in runner.

## Demo walkthrough

A five-minute tour in demo mode (choose **Demo Mode** on the home page, then a persona). Everything below is seeded; no AI key is needed except for step 4. **Reset demo data** in the header puts it all back.

1. **Student → Resume Coach.** The analysis of the sample resume is already there: the "claimed vs verified" radar flags two unverified claims, and the next tests are real ones. **Register** for the Rasa Panchaka Unit Test.
2. **Student → Communities → Dravyaguna Vigyan.** Read the pinned announcement, download the DOCX notes, then **Tests → Start** the window test (it opens the proctored exam room).
3. **Student → Notifications → "Certificate issued".** **Download PDF**, open it with **View / Add to portfolio**, toggle **Featured**; the portfolio's Verified certificates list shows it first.
4. **Professor → Host a test → Generate from my documents** with `public/demo/Dravyaguna-Unit3-Notes.docx` and `public/demo/Rasa-Panchaka-Lecture.pptx` → topic map → generate → source chips → **Open window**, 2 days → duration 1 h 15 m → **Audience: community** → Publish. Members are notified.
5. **Professor → Communities → Dravyaguna → Members** → open a student's profile → **Ban** with a reason → **Audit log**.
6. **Industry → Verify a certificate** → paste the demo student's code (on their certificate page) → **Valid** → **View candidate profile**; then bulk-verify three codes, one of them wrong.

## Build for Production

```bash
npm run build
npm run start
```

Deploys cleanly to Vercel with zero extra configuration.
