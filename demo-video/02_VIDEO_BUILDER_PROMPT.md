# PROMPT FOR WINDOW 2 — Build the Skill Setu demo video

> **How to use:** Open a new Claude window (Claude Code, with this repo if possible). Paste everything below this line. Put the voice recordings, the PPT and any extra files in the places listed in section 2.

---

## 0. Your job

You are the **video producer and voice engineer** for a Smart India Hackathon (SIH) demo video.

Build a **screen-recorded walkthrough** of our website, **narrated by the team lead's own voice** (he is recording it himself), that **switches between the website and our PPT slides**, with **simple burned-in subtitles**.

The video will be watched by a **government judge who reviews about 500 submissions on a time limit**, and who may have only **basic English**. So the video must be:

- **Clear, calm and well paced.** Easy to follow even with the sound off (subtitles + on-screen tab names).
- **Not too formal, not too casual.**
- **Simple English only.** Never change the script into harder words.
- **Short where the priority is low, and detailed where the priority is high.**

You are allowed to make many decisions yourself. Ask me only when you are truly blocked. Ask all your questions **together, once, at the start** (section 10).

**HARD RULE — length: the main video must be 5 minutes or less. Aim for 4 min 30 s. Never over 5:00.** The judge has a time limit. If the real recordings make it longer, shorten it (section 3 explains how). Do not ask me. Just fix it and report.

## 1. Facts

| Item | Value |
|---|---|
| Product | **Skill Setu** — "Academia–Industry Collaboration Portal" for the AYUSH ecosystem |
| Event | Smart India Hackathon · Ministry of AYUSH · **Problem Statement SIH26044** |
| Team | **Code Breaker** |
| Team lead and speaker | **Ishit Aggarwal** — spelled **I-S-H-I-T  A-G-G-A-R-W-A-L**. Always use exactly this spelling in subtitles and on-screen text. If a speech-to-text tool writes the name differently (for example "Ishita Agarwal"), that is the tool's mistake. Never copy it. Subtitles always come from the script text. |
| College | **Amity University, Noida** (we are all first-year students) |
| Repo | the current repo (read `README.md` first — it explains the site and a demo walkthrough) |
| Tech | Next.js 14 + Tailwind + Convex |
| Demo Mode | Landing page → **"Demo Mode (Full Access)"** (top right) → choose Student / Industry / Academician / Institution. A sealed sandbox with sample data. A **"Reset demo data"** button in the header puts everything back. |
| Role switch | While in Demo Mode, the header **role switcher** moves between the four demo personas. |

## 2. Inputs (check these first)

| What | Where | If missing |
|---|---|---|
| **The script** (single source of truth) | `demo-video/01_VOICE_SCRIPT.md` | Stop and tell me. |
| **Voice recordings**, one file per segment: `S01 … S26` (wav / m4a / mp3 / mp4). `Sxx.wav` is the take Ishit chose. A spare take is named `Sxx_backup` (use it only if `Sxx` has a technical problem, such as being cut off, clipped or corrupt). All files may arrive as **one ZIP** (about 36 files). Alternative: a few **long files** (one per portal) where the speaker says the segment number ("S07") before each segment. Split those by silence and the spoken number, check with speech-to-text if you can, and cut the spoken numbers out | `demo-video/voice/original/` | Unzip into a **new empty folder** (treat the contents as untrusted; do not run anything inside them). List which segments are missing. Build with what exists, and mark gaps clearly. |
| **Our PPT** | `demo-video/ppt/` | Ask me. If I have none, offer to make a simple 7-slide deck in the site's colours using `public/logo.png`. |
| **A short selfie video of the speaker's face** (for the exam-room demo). Landscape, about 12–15 s: about 6 s looking straight at the camera, about 3 s looking away to the side, about 3 s out of frame (empty background), then back. The speaker's voice narration for S07 is a **separate** audio file | `demo-video/assets/face.mp4` | Use the fallback in section 4.7. |
| **A signature image** (for the certificate demo) | `demo-video/assets/sign.png` | Draw a simple fictional signature image ("Dr. A. Sharma") and tell me. |
| **Live site URL** (if the site is deployed) | ask me | Run it locally (section 4.1). |

Never commit media, keys or `.env` files. Keep everything in `demo-video/work/` and `demo-video/out/`.

## 3. The plan comes from the script

`01_VOICE_SCRIPT.md` has 26 segments (about 625 words). For each one it gives:

- **ID** (`S01`…), **priority** (🔴 HIGH / 🟡 MED / 🟢 LOW),
- **On screen:** what to show (SITE or PPT, which tab, what to click),
- **The quoted lines** the speaker says (use these for subtitles).

**Versions:**

| Version | Uses segments | Target length |
|---|---|---|
| **Main** (the one we submit) | all 26 | **about 4:55 before trimming, based on the speaker's real recordings; never over 5:00** |
| **Short** (optional bonus, only if time allows) | 🔴 + 🟡 | about 4:10 |

**If the real Main is over 4:50, shorten it in this order** (stop as soon as it is under 4:50):

1. Trim silences and gaps to 0.3 s (keep natural pauses at commas).
2. Speed up screen-only waits (loading, AI "writing…", file upload) and label them "sped up".
3. Shorten 🟢 screen clips (about 1 s per tab is enough).
4. Time-stretch the voice by at most 1.08× (section 6).
5. Last: drop 🟢 segments, in this order: **S21, S25, S11, S10** (the quick tab tours that matter least). Never drop 🔴.

**If you build the Short version:** when a dropped 🟢 segment was the one that **changes the portal** (S13, S19), insert a **1.5-second title card** (for example "ACADEMICIAN PORTAL") so the jump does not feel broken.

The real lengths come from the real recordings. Measure with `ffprobe`. Report the real numbers.

## 4. Recording the website

### 4.1 Run the site

- **The live site is `https://skill-setu-kappa.vercel.app/`** (it is the homepage listed on the GitHub repo). **Try this first.** Check it with `curl -I`.
  - If the connection is refused (403 from the proxy), the environment's **Network access** does not allow it. Tell me to add these **Allowed domains**: `skill-setu-kappa.vercel.app`, `images.unsplash.com` (the landing page background photo comes from there) **and the site's Convex address** (ends in `.convex.cloud`). The Convex one is needed because the browser talks to Convex directly (`lib/convexBrowser.js`), so the site loads but Demo Mode and the exam room fail without it. Do not try to get around the proxy.
  - AI features (test generator, Resume Coach) run on the Vercel server, so the Gemini key and `generativelanguage.googleapis.com` are **not** needed in this environment when the deployed site is used.
- **Localhost does NOT work on its own.** It was tested: without a Convex backend, Demo Mode crashes right after login ("Could not find Convex client"), and the landing photo does not load. Only use localhost if the Convex URL and keys are provided in the environment.
- If neither works, go straight to the **fallback in 4.7** (shot list for Ishit to screen-record). Do not waste time on workarounds.
- If I give a different deployed URL, use that.
- Otherwise: `npm install`, then `npm run dev` (port 3000). Read `.env.example` and `lib/gemini.js` to see which keys are needed.
  - **Accounts and demo personas need Convex.** Without `NEXT_PUBLIC_CONVEX_URL`, the site falls back to browser storage. Check that Demo Mode really works before you plan anything else.
  - **AI features** (test generation, resume analysis) need an AI key. If there is no key, tell me. Do not fake the AI result. Use already-seeded data (README says the Resume Coach analysis for the sample resume is already seeded) and ask me for a key for the live "Generate from a topic" shot.
- Use **Playwright + Chromium** (in cloud sessions Chromium is pre-installed; do **not** run `playwright install`; if a different Playwright version is pinned, launch with `executablePath: '/opt/pw-browsers/chromium'`).
- If the site cannot be recorded reliably, use the **fallback in 4.7**.

### 4.2 Screen rules

- **1920×1080**, 30 fps. Browser zoom **110–125%** so text is readable on a small screen.
- **No browser toolbar / tabs**, no Next.js dev overlay, no console errors, no cookie banners, no real emails or keys in frame.
- Playwright video has **no mouse cursor**. Inject a **visible cursor dot with a click ripple**.
- Inject a helper `highlight(selector)` that draws a soft pulsing outline around the thing being talked about (the sidebar item, the Demo Mode button, the chart…).
- **Slow, human movement**: move the mouse in smooth curves, scroll slowly, pause 0.6–1 s after each click so the viewer can see the result.
- Click the **real sidebar item** so the viewer sees the navigation. Use direct URLs only to reset position between segments.
- Click **Reset demo data** before recording each portal so every portal starts clean.
- Use the same demo persona for the whole Student part, etc. Do not mix.

### 4.3 Where things are (sidebar labels → URL)

| Portal | Tabs (in the order of the script) |
|---|---|
| **Student** | Dashboard `/dashboard/student` · Skill Tests `/skill-assessment` · Internships `/internships` · Mentorship `/mentorship` · Communities `/communities` · Directory `/directory` · Applied Internships `/applications/internships` · Saved Internships `/saved/internships` · Applied Mentorships `/applications/mentorships` · Notifications `/notifications` · My Portfolio `/portfolio` · Placement Readiness `/readiness` · Resume Coach `/resume-coach` · Analytics `/analytics` · Settings `/settings` |
| **Academician** | Dashboard `/dashboard/academician` · My Students `/academician/students` · Communities `/communities` · Mentorship `/academician/mentorship` · Research Collabs `/academician/collabs` · Programs (FDPs) `/academician/programs` · Industry Alignment `/academician/alignment` · Campus Board `/institution/announcements` · Analytics `/academician/analytics` · Skill Tests `/skill-assessment` · Certificate Settings `/certificate-settings` · Verify a certificate `/verify` · Faculty Profile `/academician/profile` · Settings `/settings` |
| **Institution** | Dashboard `/dashboard/institution` · Student Roster `/institution/students` · Communities `/communities` · Placement Analytics `/institution/analytics` · Cohort Skill Gaps `/institution/skill-gaps` · Curriculum Alignment `/institution/curriculum` · Placement Drives `/institution/drives` · MOUs & Partners `/institution/partnerships` · Notice Board `/institution/announcements` · Skill Tests · Certificate Settings · Verify a certificate · Team & Activity `/institution/team` · Institution Profile `/institution/profile` · Settings |
| **Industry** | Dashboard `/dashboard/industry` · Postings `/internships` · Talent Pool `/talent-pool` · Verify a certificate `/verify` · Offers & Joining `/industry/offers` · Analytics `/analytics` · Skill Tests · Certificate Settings · Hiring Team `/industry/team` · Company Profile `/company-profile` · Settings |

(Source: `components/DashboardLayout.jsx` and `lib/nav.js`. Re-check them if anything has changed.)

### 4.4 Make the screen follow the voice (important)

**The voice is recorded first. The screen is recorded to match it.**

1. Measure each `Sxx` clean voice file with `ffprobe` → `dur(Sxx)`.
2. For each segment, write the on-screen actions as a short list with weights, for example: `[click Skill Tests (1), pause (1), hover Browse Tests (2), click My Tests (2), pause (2)]`.
3. Give the segment a time budget of `dur(Sxx) + 0.3 s lead-in + 0.3 s tail` (never more, the video must stay under 5:00), and stretch the waits so the actions **fill exactly that time**.
4. Record the whole portal in **one Playwright session** (one continuous video), and log the **start and end timestamp of each segment** against the video clock.
   - On 🟢 segments the script has several tabs in a few seconds. Show each tab for about 1–1.5 s. A segment is as long as the **longer** of its voice and its minimum screen time.
5. Cut the video by those timestamps, and place the voice on the same timeline. You should need almost no re-timing. If a clip must be adjusted, keep speed between **0.85× and 1.2×**. Never more.

### 4.5 Special shots

| Shot | How |
|---|---|
| **S07 Exam room** (most important demo) | Open a test and enter the exam room. From the README demo: *Student → Communities → Dravyaguna Vigyan → Tests → Start* opens the secure exam room. Show consent (tick the box) → camera/mic check → full screen → monitoring banner → a "face not seen" or "looking away" warning. Use Chromium so the Escape lock (Keyboard Lock API) works. On the last spoken line (the professor can watch the full exam video), cut for about 4 s to the professor's **Proctoring report** (Academician → Skill Tests → the test card → Attempts → a student's Proctoring report: full recording with flagged moments on the timeline). If the demo data has no recording, run the exam first so one exists. If that cannot be done, skip the cutaway and say so in `REPORT.md`. **Camera:** launch Chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-video-capture=<face.y4m>` (and `--use-file-for-fake-audio-capture=<silence.wav>`). Make `face.y4m` from `assets/face.mp4` with ffmpeg and loop it. The clip already contains the face, the look-away and the out-of-frame parts, so the real warnings appear. The speaker's face will be visible on screen as the "student" in the camera preview. That is intended. The face model may load from a public host. If that is blocked, use the fallback. |
| **S12 Resume Coach** | Drop `public/demo/Aarav-Sharma-Resume.pdf` onto the upload area. Show the whole result (strong / weak, claimed-vs-verified chart, next tests, study plan). |
| **S16 AI test builder** | Show the four options (Generate from a topic / from my documents / Import / Write manually). Run "Generate from a topic" and show questions appearing. Cut the waiting time out with a short "AI is writing…" speed-up (label it "sped up"). |
| **S17 Certificate Settings** | Upload `assets/sign.png` and `public/logo.png`, show the live preview. |
| **S18 Verify** | Copy a real certificate code from the demo student's certificate page, paste it into Verify, show the green **Valid** result. |
| **S22 Industry dashboard** | Scroll to the bottom and stop on the hiring numbers (applied / shortlisted / interview / hired / joined). |

### 4.6 Rules about honesty

Do **not** fake any screen. Everything in the video must really be on the site. If something does not work, tell me. Do not edit it to look like it works.

### 4.7 Fallback if automated recording is not possible

Do not stop. Instead produce **`demo-video/out/SHOT_LIST.md`**: a numbered shot list copied from the script (segment ID, exact clicks, how long to stay, what to hover) so that **Ishit can screen-record with OBS / the Windows Game Bar** himself, in the same order. Then edit the footage he sends. You may also mix: automated for most, manual only for the exam room.

## 5. PPT slides

- Convert the PPT: `soffice --headless --convert-to pdf`, then `pdftoppm -r 144 -png` to 1920×1080 images.
- Match the script's slide names to real slides (S26 uses the Impact slide, then the Thank-you slide):
  **Title · Problem · Solution (four portals) · Student Portal · Academician Portal · Institution Portal · Industry Portal · Impact · Thank-you**.
  The four portal slides are only shown for **3 seconds** at the start of S05, S13, S19 and S22 (the voice keeps going over them).
- If a slide is missing, tell me. Do not invent facts on slides.
- Show slides full-screen with a **very slow zoom (1.00 → 1.04)** so they are not frozen.
- **Site ↔ PPT switches:** a quick 0.25 s cross-fade. Nothing fancy.

## 6. 🎙️ VOICE STUDIO — free hand (you decide everything)

> **You have full freedom here.** Make whatever changes and modulation the voice needs to sound clear, steady and professional for a judge listening on laptop speakers or a phone. Do not ask for permission for normal audio work. Decide, do it, and write down what you did.

**Always:**

- **You cannot hear audio. Be honest about that.** You can measure it (length, loudness, noise floor, clipping, silences, cut-offs) and, if you can install a speech-to-text tool, compare the words with the script. You cannot judge tone, accent or how it feels. So:
  - **Use `Sxx` (Ishit's chosen take).** Use `Sxx_backup` only if `Sxx` fails a measurable check (clipping, cut-off, corrupt file, much quieter or noisier than the rest, or the words clearly do not match the script).
  - Never pick between takes by guessing. If both look fine, use `Sxx`.
  - In `voice_report.md`, say which checks you could run and which you could not, and which take you used for each segment.
  - If speech-to-text is not available, say so, and list the segments Ishit should re-listen to (the longest ones: S04, S07, S16, S26).
- Keep the originals untouched in `voice/original/`. Work on copies in `voice/clean/`.
- Use the **same processing chain on every segment** so the voice sounds like one continuous take. The segments were recorded separately, so **match loudness, tone and room sound across all of them**.

**You may freely do any of these (and anything similar):**

| Area | Examples |
|---|---|
| **Noise** | Noise reduction (RNNoise `arnndn` if available, `afftdn`, or Python `noisereduce`), remove hum (50 Hz India mains + harmonics), remove hiss, click and mouth-noise removal |
| **Clarity** | High-pass at about 80 Hz, cut "mud" near 200–300 Hz, gentle boost near 3–5 kHz for presence, de-esser, light "air" above 10 kHz, reduce room echo / reverb if you can |
| **Dynamics** | Gentle compression (about 2:1–3:1), limiter, volume automation so soft words are heard |
| **Loudness** | Normalise to **about −16 LUFS** integrated, true peak **−1.5 dBTP or lower**, all segments within ±1 LU of each other |
| **Pace and timing** | Trim long silences (leave about 0.3 s head/tail and natural pauses at commas), tighten gaps, **time-stretch gently** (keep within **0.92×–1.08×** so it still sounds natural) to fix a segment that is too fast or too slow |
| **Tone / modulation** | Small pitch or tone corrections (about ±1–2 semitones max), warmth, a calmer or more confident feel, a smoother start and end of each sentence. It must still sound like **Ishit**, a real person. No robot, no radio-effect, no heavy autotune |
| **Edit** | Cut false starts, stumbles, coughs and repeated sentences **that you can actually find** (with silence detection or speech-to-text timestamps). If you cannot find them, leave them in and list them for Ishit. Use the chosen take (see above); do not pick between takes by guessing. Keep natural breaths but lower them (about −10 dB) instead of deleting them all |
| **Continuity** | Record or take 1 s of the room's silence ("room tone") from the files and use it to fill gaps, so the background never drops to dead silence |
| **Checks** | If you can (for example with a local speech-to-text tool), compare what was said against the script and flag missing, extra or misread words. Also flag unclear pronunciations of: **Setu, AYUSH, Academician, SIH26044** |

**One boundary:** do **not** add words he did not say. No AI voice cloning, no text-to-speech in his voice, and no word-changing edits, unless Ishit says yes for that exact line. If a line is bad, **write it on a re-take list** (segment ID, what is wrong, a one-line tip) and I will have him record it again.

**Deliver from this section:**

1. `voice/clean/Sxx.wav` (48 kHz, 24-bit, mono → duplicated to stereo at the end).
2. `voice/voice_chain.md` (the exact settings / ffmpeg or Python commands you used, so it can be repeated).
3. `voice/voice_report.md`: for each segment — length, loudness before/after, noise floor before/after, edits made. Plus the **re-take list**.
4. **A/B samples** (`voice/ab/`): 3 segments (one HIGH, one MED, one LOW) as `original` vs `processed`, so I can listen and approve **before** the final render. Wait for my "OK" only if the change is big (for example, more than the limits above). Otherwise go ahead and tell me in the report.

## 7. Assembly and style

- **Timeline:** voice (clean) + screen clips + slides. Between segments leave **0.3–0.5 s** of room tone.
- **Subtitles (burned in, always on):** built from the quoted lines of each segment, with the `/` marks removed. Max 2 lines, about 42 characters per line, large white text on a soft dark box at the bottom. Split at natural pauses. Time them to the real voice (use the speech timing, not the estimate). Also export `.srt` files.
- **"You are here" chip:** when a new tab opens, show its name in a small rounded chip in the top-left for 2–3 s (for example `STUDENT PORTAL › Skill Tests`). This helps a judge who skims.
- **Priority feel:** 🔴 segments get a slow, steady shot and a gentle **zoom-in (1.00 → 1.12)** on the part being explained. 🟢 segments are quick and calm. Do not zoom on them.
- **Lower third** (only at S01, about 5 s): `Team Code Breaker · Amity University, Noida · SIH26044`.
- **Colours / fonts:** take them from `tailwind.config.js`, `app/globals.css` and `public/logo.png`. Keep titles and chips in the site's colours.
- **Music:** none by default. If you add any, it must be royalty-free, **at least 25 dB below the voice**, and easy to remove (separate track). Tell me.
- **Pace:** on 🔴 and 🟡 segments nothing should flash by. If a screen needs 1 more second for the viewer to read it, give it. On 🟢 segments quick tab-flips are intended (the script says "skim").
- **References from other SIH videos:** if you have web access, look at 2–3 past SIH grand-finale or prototype demo videos and note their pacing in the report. If you cannot, follow the standard order: *problem → solution → live walkthrough → impact → thank you*, which this script already does. Do not copy anyone's footage or music.

## 8. Outputs (in `demo-video/out/`)

| File | What |
|---|---|
| `SkillSetu_Demo.mp4` | **the main video, 5:00 or less** |
| `SkillSetu_Demo_Short.mp4` | optional: 🔴 + 🟡 only |
| `*.srt` | subtitles, one per video |
| `SkillSetu_Demo_720p.mp4` | smaller copy for upload limits (H.264, aim under 50 MB if possible) |
| `chapters.txt` | timestamps of each portal / tab (for the video description) |
| `contact_sheet.jpg` | one frame per segment, for a quick visual check |
| `REPORT.md` | real lengths, what was automated vs manual, what you changed, what is still open |

Format: **MP4, H.264, 1920×1080, 30 fps, AAC 192 kbps, yuv420p, `+faststart`**.

## 9. Quality check before you say "done"

- [ ] Every segment's voice matches what is on screen (check **each** segment boundary, not just a few).
- [ ] No segment cuts the speaker off. No dead silence over 1 s. No sudden loudness change.
- [ ] Subtitle spelling and timing are correct. No overflow off-screen.
- [ ] No private data, API keys, real emails, Convex URLs or dev overlays in any frame.
- [ ] The demo data looks clean (you pressed **Reset demo data**).
- [ ] Every claim in the voice is really shown on screen. Anything shown **only** by edit or sped-up is labelled.
- [ ] Watch the final file end to end. Extract frames at every segment start and look at them.
- [ ] Loudness is about −16 LUFS, true peak ≤ −1.5 dBTP, on every video you export.
- [ ] **Main video is 5:00 or less.** Report the exact length.

## 10. Ask me these first (all together, once)

1. Can I reach the live site `https://skill-setu-kappa.vercel.app/` **and its Convex address**? If not, which **Allowed domains** do I need you to add? (Localhost does not work without Convex.)
2. Where is **our PPT**? Which slide is which? (Or: should I build one?)
3. What is the **maximum length / file size** the SIH submission allows? (This decides which version is the main one.)
4. Do you want **other team members named** in the intro? (Names + roles.)
5. Is **"Amity University, Noida"** the exact college name to show on screen?
6. Do you want a **website link / QR code** on the Thank-you slide? What is the link?
7. Are the voice files ready? Where are they?

Then work through the sections in order, and finish with `REPORT.md`.
