"use client";

import StaticPageLayout from "../../components/StaticPageLayout";

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p>
        Skill Setu is a hackathon project (Smart India Hackathon, Problem Statement SIH26044), and this page is
        here to be genuinely accurate about how your data is handled — not boilerplate legal text.
      </p>
      <h2>Where your data lives</h2>
      <p>
        When this deployment has a Convex database configured, your account, internship postings,
        applications, skill test results, and portfolio are stored server-side in Convex — that's what lets
        you sign in to the same account from more than one device or browser.
      </p>
      <p>
        If no Convex database is configured, the app falls back to storing everything in your browser's
        local storage on this device instead. In that fallback mode your data isn't shared with other
        visitors or devices, but it also isn't backed up anywhere — clearing your browser's site data for
        this app will erase it, and you won't be able to sign in from a different device.
      </p>
      <h2>Email &amp; OTP verification</h2>
      <p>
        Every sign-up goes through email verification before an account is created: a one-time 6-digit code
        is generated and checked server-side, and the account is only created after that code is confirmed.
        If the deployment has real email credentials configured, that code is sent to the email address you
        sign up with. If no email service is configured, the app runs in an offline development mode instead
        and shows you the code directly in the sign-up flow rather than emailing it — verification is never
        skipped either way.
      </p>
      <h2>Passwords</h2>
      <p>
        Passwords are never stored in plain text. They're hashed client-side before ever leaving your
        browser, and only that hash is saved alongside your account record — server-side in Convex, or in
        local storage in the fallback mode described above.
      </p>
      <h2>No tracking</h2>
      <p>This app does not use analytics, advertising trackers, or third-party cookies.</p>
    </StaticPageLayout>
  );
}
