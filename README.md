# Setu — Academia–Industry Collaboration Portal

**Skill Mapping, Internships & Placements**
Smart India Hackathon · Problem Statement SIH26044

---

## What is Setu?

**Setu** ("bridge") is a unified platform connecting **students**, **academicians**, **industry partners**, and **institutions** across every sector — not just one industry. It covers the full lifecycle described in the problem statement: skill assessment, skill mapping, internship & job discovery, industry learning programs, and placement analytics.

## Four Dedicated Workspaces

- **Student** — take skill tests, browse & apply to internships/jobs, build a verified digital portfolio, track applications.
- **Industry** — post internships/jobs, manage an applicant pipeline (Applied → Shortlisted → Interview → Hired), host skill tests.
- **Academician** — host Faculty Development Programs (FDPs), respond to research collaboration requests, track student progress.
- **Institution** — a dedicated placement & skill analytics dashboard (funnel, cohort skill gaps, course-wise placement rates).

## How it's built

- **Next.js 14** (App Router) + **Tailwind CSS** for the UI.
- **Local, browser-persisted data layer** (`lib/store.js`) standing in for a database — every "collection" (users, internships, applications, skill tests, portfolios, programs) is a JSON array in `localStorage`. No external service required to run or deploy.
- **Real OTP-verified signup** via `pages/api/send-otp.js` / `pages/api/verify-otp.js` (Nodemailer). Without email credentials configured, verification codes are shown directly in the UI (dev mode) instead of being emailed.
- Role-based signup is gated by verification codes for industry/academician/institution accounts (`lib/registry.js`) — a small stand-in for a real organisation-verification workflow.

### Note on data persistence

Because there's no live database wired up, all data (accounts, postings, applications, skill test results) lives in the browser's `localStorage`. It's fully functional for demoing every flow, but data is per-browser rather than shared across devices. To upgrade to a real shared backend, swap the functions in `lib/store.js` for calls to Firebase/Firestore, Supabase, or any REST API — the rest of the app only depends on that module's function signatures.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

To send real OTP emails, add Gmail SMTP credentials to `.env.local`:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

(Generate an App Password at https://myaccount.google.com/apppasswords.) Leave both blank to use dev mode, where the code is shown directly in the UI.

## Build for Production

```bash
npm run build
npm run start
```

Deploys cleanly to Vercel with zero extra configuration.
