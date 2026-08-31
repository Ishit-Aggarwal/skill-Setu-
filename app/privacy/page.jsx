"use client";

import StaticPageLayout from "../../components/StaticPageLayout";

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p>
        Setu is a hackathon project (Smart India Hackathon, Problem Statement SIH26044), and this page is
        here to be genuinely accurate about how your data is handled — not boilerplate legal text.
      </p>
      <h2>Where your data lives</h2>
      <p>
        Accounts, internship postings, applications, skill test results, and portfolios are stored in your
        browser's local storage on this device. Nothing is sent to or stored on a remote database. That
        means your data isn't shared with other visitors or devices, but it also isn't backed up anywhere —
        clearing your browser's site data for this app will erase it.
      </p>
      <h2>Email &amp; OTP verification</h2>
      <p>
        If the deployment has real email credentials configured, a one-time verification code is sent to
        the email address you sign up with, purely to confirm you own it. That code is generated statelessly
        and never stored on a server. If no email service is configured, the code is shown to you directly
        in the sign-up flow instead of being emailed.
      </p>
      <h2>Passwords</h2>
      <p>
        Passwords are never stored in plain text. They're hashed (SHA-256) client-side before being saved
        alongside your account record in local storage.
      </p>
      <h2>No tracking</h2>
      <p>This app does not use analytics, advertising trackers, or third-party cookies.</p>
    </StaticPageLayout>
  );
}
