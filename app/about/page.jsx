"use client";

import StaticPageLayout from "../../components/StaticPageLayout";

export default function AboutPage() {
  return (
    <StaticPageLayout title="About Skill Setu">
      <p>
        Skill Setu ("bridge") is a unified platform connecting students, academicians, industry partners, and
        institutions across every sector — built for Smart India Hackathon, Problem Statement SIH26044,
        issued by the Ministry of Ayush: "Portal for Academia–Industry Collaboration for Skill Mapping,
        Internships and Placement."
      </p>
      <p>
        The gap between what students learn and what industry needs is real. Students often don't know
        which skills matter for the roles they want; employers struggle to find candidates who are actually
        ready; and academicians have limited visibility into industry opportunities that could shape their
        teaching and research. Skill Setu is a single place where all four groups meet — for software,
        engineering, finance, design, healthcare, policy and everything in between.
      </p>
      <h2>Why AYUSH gets first-class treatment</h2>
      <p>
        Because the problem statement was issued by the Ministry of Ayush, the AYUSH ecosystem is built out
        properly rather than collapsed into a single "Healthcare" category. Ayurveda, Panchakarma & wellness
        therapy, Yoga & Naturopathy, Unani, Siddha, Homeopathy, Ayush pharmaceuticals and nutraceuticals,
        Ayush clinical research, wellness tourism, public health and diagnostics each exist as their own
        sector, with their own skill tests, employers and academic departments alongside the general ones.
        A college placing students across both an Ayurveda faculty and an engineering faculty is the normal
        case here, not an awkward exception.
      </p>
      <h2>What you can do here</h2>
      <p>
        Students take skill tests hosted by real employers and colleges — five general aptitude and
        fundamentals domains plus five AYUSH-specific ones — then discover internships matched to that
        profile and build a verified digital portfolio. Employers post roles with minimum-qualification and
        eligible-department filters, search a proactive talent pool, run bulk candidate review, and track
        candidates from application through offer and joining. Faculty mentor an explicit advisee list, run
        office hours, host Faculty Development Programmes with managed rosters and certificates, and propose
        and run their own research collaborations. Institutions get a full placement-cell toolkit: a
        searchable student roster with bulk export and onboarding, cohort skill-gap heatmaps, curriculum
        alignment insights, campus drive scheduling with recruiter RSVPs, MOU tracking, a notice board, and
        multi-year placement history shaped for accreditation reporting.
      </p>
      <h2>How it's built</h2>
      <p>
        Skill Setu is a Next.js application backed by Convex for server-side accounts and data, with a
        browser-local fallback when no Convex database is configured — see the{" "}
        <a className="underline hover:text-foreground" href="https://github.com/Ishit-Aggarwal/skill-Setu-" target="_blank" rel="noreferrer">
          project repository
        </a>{" "}
        for the full source.
      </p>
    </StaticPageLayout>
  );
}
