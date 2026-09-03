"use client";

import StaticPageLayout from "../../components/StaticPageLayout";

export default function ContactPage() {
  return (
    <StaticPageLayout title="Contact">
      <p>
        Skill Setu is built and maintained on GitHub. That's the best place to report a bug, suggest a feature,
        or ask a question about the project.
      </p>
      <p>
        <a
          className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-primary hover:underline"
          href="https://github.com/Ishit-Aggarwal/skill-Setu-/issues"
          target="_blank"
          rel="noreferrer"
        >
          Open an issue on GitHub →
        </a>
      </p>
    </StaticPageLayout>
  );
}
