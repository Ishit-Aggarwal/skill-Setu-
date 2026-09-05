# Rebuild Plan — Student Experience, Credentials, Recruiter Rejection, Password Recovery

Scope agreed with the repo owner. Execute top-down; every phase must leave
`npx next build` green. Conventions from `HANDOFF.md` sections 1 and 2 apply
throughout (no new dependencies, no TypeScript, no dark mode, use `components/ui/Kit.jsx`,
`"use client"` on anything touching `lib/store.js`, `ready`-gate every store read,
never hard-code a hex colour outside chart configs).

---

## 0. Ground truth established by survey

| Fact | Consequence for this work |
| --- | --- |
| `lib/store.js` `NS = "ayusetu:v6:"`, seeding is one-shot | Any change to a **seeded record shape** requires bumping to `v7:`. New *collections* do not. |
| `PIPELINE_STAGES` / `TERMINAL_STAGES` already exported and wired into all funnels | The "Rejected black hole" (HANDOFF 3.1) is fixed. Only the *entry points* to rejection are missing. |
| Kanban cards offer `← Move back` / `Advance →` only | No way to reject a single candidate; rejection exists only as a bulk action. **This is the bug the owner reported.** |
| `CandidateProfileModal` has an interview/notes panel but no stage controls | Add reject/advance there too. |
| Header bell (`DashboardLayout.jsx`) calls `navigate("student-dashboard")` | On the dashboard itself this is a no-op — the reported "bugged bell". Replace with a real popover. |
| `EditProfileModal` edits 6 student fields (name, institution, department, course, year, batch, rollNo) | Owner wants substantially more. `phone` is in the Convex schema but not editable anywhere. |
| `StudentPortfolio` skill categories hard-coded to 3 strings; certifications are text-only | Needs derived/extensible categories + per-certificate file attachment. |
| `lib/questionBank.js` already rebalanced to 8 general + 2 AYUSH domains | De-AYUSH-ification is mostly done. Residue is in `convex/seed.js` and a few placeholder strings. |
| `convex/seed.js` still uses the **old** skill-domain names (`Ayush Pharmacology & Formulation`, `Research & Clinical Documentation`, `Business & Communication`) | Real bug: seeded Convex tests score into domains the radar never renders. Fix. |
| `lib/auth.jsx` `deleteAccount()` POSTs to `/api/auth/delete` | That route does not exist → silent 404 on every account deletion. Fix. |
| There is no password-recovery path anywhere | Build it end-to-end. |

---

## 1. Data layer — `lib/store.js`

### 1.1 New collection: `credentials`
The certificate/credential a **company, institution or faculty member issues to a student**.
Distinct from `portfolios.certifications` (self-declared) and from
`programRegistrations.certificateNo` (FDP attendance, faculty-only).

```js
{
  id, studentId, studentName, studentEmail,
  title,                 // "Frontend Engineering Fundamentals"
  issuer,                // display name of the issuing org
  issuerId, issuerRole,  // "industry" | "institution" | "academician"
  kind,                  // "Skill Test" | "Internship" | "Training" | "Merit" | "Participation"
  testId,                // optional back-reference
  score,                 // optional "88%"
  grade,                 // optional "A"
  remarks,               // optional free text printed on the certificate
  certificateNo,         // "SETU/2026/<ISSUER>/0001"
  issuedAt, revokedAt,
  verifyCode,            // short code printed for verification
}
```

New exports:
- `issueCredential(issuer, student, data)` — inserts, writes a `studentNotifications`
  row ("<Issuer> issued you a certificate: <title>"), returns the record.
- `issueCredentialsBulk(issuer, students, data)` — loops, returns count.
- `listCredentialsForStudent(studentId)` — newest first, revoked excluded by default.
- `listCredentialsByIssuer(issuerId)`.
- `getCredential(id)`.
- `revokeCredential(id)`.
- `credentialNumber(issuerName, seq)` — internal.

### 1.2 New collection: `savedInternships`
`{ id, studentId, internshipId, savedAt }` with `toggleSavedInternship(studentId, internshipId)`,
`listSavedInternships(studentId)`, `isInternshipSaved(studentId, internshipId)`.
Gives the student dashboard a real "Saved roles" widget and the listings page a bookmark control.

### 1.3 Single-student notification helper
`notifyStudent(studentId, message, from, meta)` — currently only the bulk
`notifyStudents()` exists, so nothing can notify one student. Used by:
- `updateApplicationStatus` (status changed / rejected, with reason),
- `issueCredential`,
- drive invites later.

`notifyStudents()` is refactored to call it so there is one write path.

### 1.4 Rejection carries a reason
`updateApplicationStatus(id, status, extra)` gains an optional third argument merged
into the patch (`rejectionReason`, `rejectedAt`). It already appends to `history`;
keep that. It must also fire `notifyStudent`.

### 1.5 Portfolio shape additions (additive, no NS bump)
`portfolios` documents gain optional keys — every reader already uses `?.` / `|| []`:
- `headline`, `location`, `links: { linkedin, github, website }`
- `projects: [{ id, title, description, tags: [], link, year }]`
- `education: [{ id, degree, institution, board, startYear, endYear, score }]`
- `achievements: [{ id, title, detail, year }]`
- `certifications[].fileName` + `certifications[].dataUrl` + `certifications[].credentialId`
  → **this is the "PDF for certificates" the owner asked for.**

Seeded demo portfolios keep working because every new key is optional.

### 1.6 `convex/schema.js`
Add `credentials` and `savedInternships` tables (indexes `by_student`, `by_issuer`),
and extend `portfolios` / `users` with the new optional fields. Additive only —
cannot break the localStorage path.

---

## 2. Notifications — fix the bell

New `components/NotificationBell.jsx`:
- Popover anchored to the header button; closes on Escape, on outside click, and on route change.
- Lists the 10 most recent `studentNotifications`, unread first-styled, with `relativeTime`.
- Per-row click marks read; "Mark all read"; footer link "Open inbox →" that goes to the dashboard.
- Live via `subscribeToMutations(["studentNotifications"])`.
- Renders the existing unread dot; count badge shows `9+` above 9.

`DashboardLayout.jsx` swaps its inline `<button onClick={navigate(...)}>` for this component
and drops the now-dead `unreadCount` state (the bell owns it).

---

## 3. Student dashboard — rebuild (`components/pages/StudentDashboard.jsx`)

Keep the hydration pattern and the `subscribeToMutations` refresh. Restructure into:

1. **PageHeader** — greeting, course · year · institution, quick actions
   (Take a test / Browse internships / Edit profile).
2. **Action Centre** (new) — a prioritised, computed to-do list, max 5 items, each with a CTA:
   - no assessment yet → "Take your first skill test"
   - a registered test starting within 48h → "Join <test> · <when>" (+ meeting link when in reveal window)
   - a missed test → "You missed <test> — it scored 0"
   - an interview scheduled → "Interview with <company> on <date>"
   - profile completion < 100 → the specific missing piece (bio / certifications / resume / timeline)
   - application deadline within 7 days for a saved role
   Empty state: "You're all caught up."
3. **StatGrid** — Skill Score, Applications, Certificates (portfolio + issued credentials), Profile Complete.
4. **Skill radar** (unchanged) + **skill trend sparkline** from `assessmentAttempts` over time (new).
5. **Application pipeline strip** (new) — Applied → Shortlisted → Interview → Hired counts as
   a horizontal stepper, plus an explicit "N rejected" chip so the numbers reconcile
   (same reconciliation rule the analytics pages now follow).
6. **Upcoming tests** (new) — registrations with countdown, mode, venue/link, status badge.
7. **My credentials** (new) — issued certificates with "View / Print" → `/certificate/<id>`.
8. **Saved roles** (new) — bookmarked internships with deadline countdown.
9. Existing: Skill-gap nudges + AI roadmap, Active applications, Recommended internships,
   Campus notice board, Upcoming deadlines, Inbox, Mentoring panel.

Profile completion becomes an explicit, itemised checklist (each item worth a stated
percentage) instead of the current opaque arithmetic, so the number is explainable.

---

## 4. Student portfolio — rework (`components/pages/StudentPortfolio.jsx`)

- **Header**: avatar, name, editable *headline*, location, contact row, links row
  (LinkedIn / GitHub / website), "Open to opportunities" toggle wired to the real
  `openToOpportunities` user flag (currently only the separate `TalentPoolToggle` sets it),
  Generate ATS Resume, Print.
- **Profile strength card** with the same itemised checklist as the dashboard.
- **Tabs**: About · Skills · Projects · Education · Certifications · Experience · Documents.
  - *Skills*: categories are no longer three hard-coded strings. Default set spans industries
    (Technical, Tools & Software, Analytical & Research, Clinical & Practical,
    Business & Communication, Languages) **plus** a free-text "new category" input, and
    existing categories in the portfolio are always offered. Edit level / remove per badge.
  - *Projects*: add/edit/remove with tags and link.
  - *Education*: structured rows.
  - *Certifications*: add manually **with an optional PDF/image attachment** (≤2 MB, stored
    as a data URL exactly like `documents`), view/download, remove. Below the manual list,
    a read-only **"Issued to you"** block listing `credentials` with a "View certificate"
    link to the printable page. This is the owner's "pdf adding for certificates".
  - *Experience*: the existing timeline, with delete.
  - *Documents*: existing uploader plus delete/rename, size display and a wider type list.
- Every list gets a remove control (today nothing can be deleted once added — a real bug).
- The bio textarea currently writes to localStorage on **every keystroke**; debounce to 500 ms.

---

## 5. Certificates issued by companies and institutions

### 5.1 Printable page — `app/certificate/[credentialId]/page.jsx`
Same visual language as the existing FDP certificate page (double border, watermark,
seal, signature block, `@media print` rules, "Print / Save as PDF" via `window.print()`).
No PDF library — `window.print()` to PDF, per HANDOFF 4.1.
Shows: recipient, title, issuer, kind, score/grade, remarks, certificate number,
issue date, verification code. Unknown id → a clean not-found card.

### 5.2 Shared issuer UI — `components/IssueCredentialModal.jsx`
Props: `issuer` (the logged-in user), `students` (array of `{id, name, email}`),
`defaults` (title/kind/testId), `onIssued`. Renders the recipient list with
checkboxes + select-all, title, kind, optional score/grade, remarks, and a preview line
of the certificate number that will be generated. Issues via `issueCredentialsBulk`.

### 5.3 Wiring
- **Skill tests (host view, `components/pages/SkillAssessment.jsx`)** — per test, an
  "Issue certificates" action opening the modal pre-filled from the test
  (title = `test.certification || test.title`, kind = "Skill Test"), recipients =
  registrants, with each registrant's attempt score shown and auto-filled.
  This covers *"company and institution can send certificates to students for any tests
  they finish"* — the host view is shared by industry, institution and academician roles.
- **Institution → Student Roster** — bulk "Issue certificate" action on the existing
  selection, for training/merit certificates.
- **Industry → dashboard kanban `Hired` column and `CandidateProfileModal`** — "Issue
  internship certificate" for a completed intern.
- **Student side** — credentials appear on the dashboard, in the portfolio
  Certifications tab, and in the inbox as a notification.

---

## 6. Recruiter rejection

- **Kanban card** (`IndustryDashboard.jsx`): non-rejected cards get a third, muted
  `Reject` control alongside Move back / Advance. It opens a small confirm with an optional
  reason, then `updateApplicationStatus(id, "Rejected", { rejectionReason })`.
- **`CandidateProfileModal`**: a stage action row — `Advance to <next>`, `Move back`,
  `Reject` (with reason), and `Restore to Applied` when already rejected. Only rendered
  when there is a real application (`hasApplication`).
- Rejected cards already show "Restore to Applied"; also surface the stored reason on the card.
- The student is notified on every stage change (§1.3), so rejection stops being silent.

---

## 7. Edit-profile modal — many more fields

`components/EditProfileModal.jsx` becomes tabbed (Profile · Details · Account) and gains:

- **All roles**: avatar, name, **phone**, **city/location**.
- **Student**: institution, department, course, year, batch, roll number, **CGPA/percentage**,
  **expected graduation year**, **headline**, **about** (writes through to `portfolios.bio`),
  **LinkedIn / GitHub / portfolio URL**, **open to opportunities** toggle.
- **Industry**: organisation, work-email domain, **website**, **HQ location**,
  **company size**, **contact person**, **LinkedIn**.
- **Academician**: institution, department, designation, **experience (years)**, **ORCID**,
  **Google Scholar URL**.
- **Institution**: name, AISHE id, **city**, **state**, **website**.
- Danger zone stays; `z-60` → `z-[60]` (not a real Tailwind class today, so the confirm
  dialog is relying on DOM order for stacking); drop the leftover `dark:` variants.

---

## 8. Password recovery

Stateless where possible, mirroring `lib/otp.js`, but the reset nonce lives on the user
document so a link can be single-use.

- **`convex/users.js`**
  - `issuePasswordReset({ email })` → writes `resetNonce` + `resetExpiresAt` (30 min),
    returns `{ ok, nonce }`; `{ ok: false, reason: "NOT_FOUND" }` otherwise.
  - `resetPassword({ email, nonce, passwordHash })` → validates nonce + expiry, sets the
    new hash, clears the nonce, returns the public user.
  - `deleteUser({ id })` → for the missing delete route.
  - Schema: `resetNonce`, `resetRequestedAt`, `resetExpiresAt` optional on `users`.
- **`pages/api/auth/forgot-password.js`** — looks the account up, issues the nonce, emails a
  link `<origin>/reset-password?email=…&token=…` through `lib/mailer.js`. Always responds
  `success: true` so the endpoint cannot be used to enumerate accounts. Honours
  `OTP_DEV_MODE=true` by returning `devLink` when no transport is configured, exactly like
  `send-otp` returns `devOtp`.
- **`pages/api/auth/reset-password.js`** — `{ email, token, passwordHash }` → Convex.
- **`pages/api/auth/delete.js`** — the missing route.
- **`lib/auth.jsx`** — `requestPasswordReset(email)` and `resetPassword(email, token, password)`,
  both with the same `CONVEX_NOT_CONFIGURED` local fallback the rest of the file uses
  (device-local token in `localStorage`, 30-minute expiry, single use).
- **`app/login/page.jsx`** — a "Forgot password?" link under the password field opening a
  `forgot` step: email input → confirmation panel (plus the dev link when returned).
- **`app/reset-password/page.jsx`** — new password + confirm, strength/º match validation,
  `<Suspense>` wrapper because it reads `useSearchParams` (HANDOFF 4.5 caution), success →
  redirect to `/login`.

---

## 9. Bug sweep

1. `/api/auth/delete` missing → 404 on every deletion (§8).
2. `convex/seed.js` skill-test domains use retired skill-domain names → scores land in
   domains no view renders.
3. Nothing in the portfolio can be deleted once added (skills, certs, timeline).
4. Portfolio bio writes to localStorage on every keystroke.
5. `EditProfileModal` `z-60` is not a Tailwind class; `dark:` variants are dead code
   (dark mode was removed deliberately).
6. Header bell is a no-op on the page it navigates to (§2).
7. `StudentDashboard.refresh()` never calls `checkAndRecordMissedTests()`, so a missed test
   only registers when the student happens to open the Skill Tests page.
8. `DataTable` has no paging (HANDOFF 4.4) — add optional `pageSize` defaulting to `null`
   so no existing caller changes behaviour, then enable it on the institution roster.
9. AYUSH-flavoured placeholder strings in generic forms (`"BAMS"` course placeholder,
   `"Dravyaguna, Quality Control"` skills placeholder) — replace with cross-sector examples.
   The AYUSH **taxonomy** stays intact; only the defaults that imply every user is an
   AYUSH student change.

---

## 10. Verification

1. `npx next build` green, no `useSearchParams`/Suspense warning.
2. Reset browser state, walk all four demo personas, click every sidebar item.
3. Student: bell opens a popover, marks read, badge clears; action centre lists real items;
   portfolio add/remove works in every tab; certificate PDF attaches and downloads.
4. Industry: reject a single candidate from the card and from the profile modal; confirm it
   lands in the Rejected column with the reason, that the student's inbox shows it, and that
   restoring returns it to Applied.
5. Host a skill test → issue certificates → confirm they appear on the student dashboard,
   in the portfolio, and print correctly at `/certificate/<id>`.
6. Forgot password → reset link → sign in with the new password.
7. No console errors on any page; funnel totals still reconcile.
