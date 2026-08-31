"use client";

import StaticPageLayout from "../../components/StaticPageLayout";

export default function TermsPage() {
  return (
    <StaticPageLayout title="Terms of Use">
      <p>
        Setu was built as a submission for Smart India Hackathon (Problem Statement SIH26044). It's a
        working demonstration of an academia–industry collaboration platform, not a production service
        with a support team or uptime guarantees.
      </p>
      <h2>Demo data</h2>
      <p>
        Internship listings, sample companies, and "Demo Mode" accounts are illustrative content meant to
        showcase how the platform works. They don't represent real job offers or affiliations.
      </p>
      <h2>No warranty</h2>
      <p>
        The platform is provided as-is, without warranty of any kind. Since all data lives in your
        browser's local storage rather than a managed backend (see the Privacy Policy), don't rely on it
        for anything you can't afford to lose.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Please don't use the sign-up flow to submit false organisational verification codes, spam
        internship postings, or otherwise misuse the demo.
      </p>
    </StaticPageLayout>
  );
}
