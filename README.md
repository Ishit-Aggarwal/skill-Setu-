# AyuSetu

Prototype for **SIH26044** — Ministry of Ayush / AIIA "Portal for Academia-Industry
Collaboration for Skill Mapping, Internships and Placement."
Team CODE BREAKERS.

Currently a front-end prototype: all data (opportunities, applicants, cohort
stats) is mock data living in `app/AyuSetu.jsx`, and the skill-matching
engine runs client-side. No database or auth yet — that's the natural next
step (see `app/AyuSetu.jsx` → `scoreAgainst()` for the matching logic to
port to a real API route).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy on Vercel

1. Push this folder to a GitHub repo (see below).
2. Go to vercel.com → **New Project** → import that repo.
3. Vercel auto-detects Next.js — no config needed. Click **Deploy**.

## Push to GitHub for the first time

From inside this folder:

```bash
git init
git add .
git commit -m "Initial AyuSetu prototype"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

(Create the empty repo on GitHub first, without a README, then run the
commands above.)

## Next steps toward the full brief

- Replace mock arrays in `AyuSetu.jsx` with a Prisma schema + Postgres
  (Neon/Supabase) and API routes.
- Add NextAuth.js with a `role` field for Student / Academician / Industry /
  Institution Admin.
- Wire the "Post an opening" and "Apply" actions to real API calls instead
  of local state.
- Add file storage (Supabase Storage / Vercel Blob) for résumés and
  certificates.
