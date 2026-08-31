"use client";

import StaticPageLayout from "../../components/StaticPageLayout";

export default function AboutPage() {
  return (
    <StaticPageLayout title="About Setu">
      <p>
        Setu ("bridge") is a unified platform connecting students, academicians, industry partners, and
        institutions across every sector — built for Smart India Hackathon, Problem Statement SIH26044:
        "Portal for Academia–Industry Collaboration for Skill Mapping, Internships and Placement."
      </p>
      <p>
        The gap between what students learn and what industry needs is real. Students often don't know
        which skills matter for the roles they want; industries struggle to find candidates who are
        actually ready; and academicians have limited visibility into industry opportunities that could
        shape their teaching and research. Setu is a single place where all four groups meet.
      </p>
      <h2>What you can do here</h2>
      <p>
        Students take skill tests hosted by real companies and colleges, discover and apply to internships
        matched to their skill profile, and build a verified digital portfolio. Industries post openings,
        review a live applicant pipeline, and host their own skill assessments. Academicians run Faculty
        Development Programs and respond to research collaboration requests. Institutions get a dedicated
        placement and skill-gap analytics dashboard.
      </p>
      <h2>How it's built</h2>
      <p>
        Setu is a Next.js application. To make every flow immediately usable without any backend setup,
        data is currently persisted in your browser rather than a shared cloud database — see the{" "}
        <a className="underline hover:text-foreground" href="https://github.com/Ishit-Aggarwal/Ayush-portal" target="_blank" rel="noreferrer">
          project README
        </a>{" "}
        for details on how that can be swapped for a real backend.
      </p>
    </StaticPageLayout>
  );
}
