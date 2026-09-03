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

## Build for Production

```bash
npm run build
npm run start
```

Deploys cleanly to Vercel with zero extra configuration.
