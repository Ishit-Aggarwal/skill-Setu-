"use client";

import Link from "next/link";
import StaticPageLayout from "../../components/StaticPageLayout";
import { EXAM, RESUME, COMMUNITIES } from "../../lib/settings";

const list = "list-disc pl-5 space-y-1.5";

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p className="text-xs">Last updated: October 2026</p>
      <p>
        Skill Setu is an AYUSH academia–industry platform built for Smart India Hackathon (Problem Statement SIH26044).
        This page explains, in plain language, what personal data the platform collects, why, who can see it, how long it
        is kept and what you can do about it. It is written to match how the app actually works, and it follows the
        principles of India&apos;s Digital Personal Data Protection Act, 2023: collect only what a feature needs, use it only
        for that purpose, and let you remove it.
      </p>

      <h2>What we collect</h2>
      <ul className={list}>
        <li>
          <strong>Account details</strong>: your name, email address, role (student, industry, academician or institution) and
          the details that role needs, such as institution, course and year, AYUSH system, company or institute name and
          verification code. A phone number only if you add one for account recovery.
        </li>
        <li>
          <strong>Your password</strong>, which is sent over an encrypted connection and stored only as a bcrypt hash. Nobody,
          including the team, can read it.
        </li>
        <li>
          <strong>What you create on the platform</strong>: your portfolio, internship applications, saved listings,
          mentorship bookings, community posts and comments, and any files you upload (resumes, study material, sample
          papers, certificate logos).
        </li>
        <li>
          <strong>Skill test records</strong>: registrations, your answers, scores and the certificates issued to you.
        </li>
        <li>
          <strong>Proctoring data</strong>, only for proctored online tests and only after you agree on the consent screen:
          the camera and microphone recording of the sitting, one still image of your face taken when the paper opens, and a
          log of flagged events (switching tabs, leaving fullscreen, no face or more than one face in view, sustained
          background noise, disconnections).
        </li>
      </ul>

      <h2>Why we use it</h2>
      <ul className={list}>
        <li>To create and secure your account, and to verify your email with a one-time code.</li>
        <li>To run the features you use: applications, mentorship, communities, skill tests, grading and certificates.</li>
        <li>To keep proctored tests fair, so the host can review a flagged sitting.</li>
        <li>To show your institution and the hosts you interact with the information described below.</li>
      </ul>
      <p>
        Your data is not sold, not used for advertising and not shared with anyone for their own marketing.
      </p>

      <h2>Proctored tests</h2>
      <p>
        Before a proctored test starts you are shown a consent notice and can decline. Your answer to that notice is
        recorded. Face checks (whether you are present, alone and looking at the screen) run on your own device using
        Google&apos;s open-source MediaPipe models, so no video frames are sent anywhere for those checks. The recording,
        the reference still and the event log are uploaded so the host of that test can review the sitting. Recordings and
        detailed event logs are deleted automatically after {EXAM.RETENTION_DAYS} days.
      </p>

      <h2>AI features</h2>
      <p>
        Some features send content to Google&apos;s Gemini AI service to produce their result. This happens only when you
        use the feature, and only the content that feature needs is sent:
      </p>
      <ul className={list}>
        <li>Resume Coach: the resume you upload, to prepare your analysis.</li>
        <li>
          Paper builder (hosts): the topic, documents or sample papers you provide, to draft questions and check answer
          keys.
        </li>
        <li>Certificate design (hosts): the design you upload or describe.</li>
      </ul>
      <p>
        AI output is a draft. Hosts review every question and answer key before publishing, and a test&apos;s score is
        always worked out by the platform&apos;s own grader, never by the AI.
      </p>

      <h2>Who can see your data</h2>
      <ul className={list}>
        <li>
          <strong>Hosts of a test you take</strong> can see your registration, answers, score and, for proctored tests,
          the proctoring report and recording of your sitting.
        </li>
        <li>
          <strong>Organisations you apply to</strong> can see your application and the profile and portfolio you
          submit with it.
        </li>
        <li>
          <strong>Your institution</strong> can see the students on its roster and their placement progress.
        </li>
        <li>
          <strong>Community owners and moderators</strong> can see the members of their community. Other students in a
          community never see the member list.
        </li>
        <li>
          <strong>Anyone with a certificate&apos;s verification code</strong> can check that it is genuine. That check shows
          the name on the certificate, the test, the score or grade, the issuer and the issue date.
        </li>
        <li>
          <strong>Your resume and its analysis</strong> are visible only to you.
        </li>
      </ul>

      <h2>Services that process data for us</h2>
      <ul className={list}>
        <li>
          <strong>Convex</strong>: the database and file storage where accounts, records and uploads are kept.
        </li>
        <li>
          <strong>Google Gemini</strong>: the AI features described above.
        </li>
        <li>
          <strong>An email provider (SMTP)</strong>: to send sign-up verification codes and password reset links. These are
          the only emails the platform sends.
        </li>
        <li>
          <strong>Google Fonts and Unsplash</strong>: fonts and some images on public pages are loaded from them, so your
          browser contacts their servers when those pages load.
        </li>
      </ul>

      <h2>Cookies and tracking</h2>
      <p>
        The platform does not use analytics, advertising trackers or tracking cookies. Your browser&apos;s local storage
        holds only what keeps the app working: your sign-in session, a cached copy of your profile and display preferences
        such as theme.
      </p>

      <h2>How long data is kept</h2>
      <ul className={list}>
        <li>Proctoring recordings and detailed event logs: {EXAM.RETENTION_DAYS} days.</li>
        <li>
          Resumes and their analyses: up to {RESUME.RETENTION_DAYS} days, and only your latest {RESUME.HISTORY_KEPT}{" "}
          analyses. You can delete them sooner yourself.
        </li>
        <li>Files on a deleted community post: removed from storage after {COMMUNITIES.PURGE_AFTER_DAYS} days.</li>
        <li>
          Consent records for proctored tests: kept, so it can always be shown that a recording was made with permission.
        </li>
        <li>Everything else: for as long as your account exists, or until you delete it.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <ul className={list}>
        <li>You can view and correct your profile at any time from Settings.</li>
        <li>You can decline proctoring consent; you just can&apos;t sit that proctored test.</li>
        <li>You can delete your resume and its analyses from Resume Coach.</li>
        <li>
          You can delete your account from Settings. That removes your account, applications, portfolio, assessments,
          test results and mentorship bookings, and signs you out on every device.
        </li>
      </ul>
      <p>
        For anything else, including a request to access, correct or erase data the options above don&apos;t cover, or a
        complaint about how your data is handled, reach the team through the{" "}
        <Link href="/contact" className="text-primary hover:underline">
          Contact page
        </Link>
        .
      </p>

      <h2>Security</h2>
      <p>
        All traffic uses HTTPS. Passwords are hashed, every privileged request is checked on the server against your
        session, and links to uploaded files are only handed out to signed-in accounts. No system is perfectly secure, so please use a
        password you don&apos;t use anywhere else.
      </p>

      <h2>Demo mode</h2>
      <p>
        Demo personas, sample companies and sample listings are illustrative content for showing how the platform works.
        They are not real people or real offers.
      </p>

      <h2>Changes to this policy</h2>
      <p>If how the platform handles data changes, this page will be updated and the date at the top will change with it.</p>
    </StaticPageLayout>
  );
}
