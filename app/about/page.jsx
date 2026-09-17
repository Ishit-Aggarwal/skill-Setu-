"use client";

import StaticPageLayout from "../../components/StaticPageLayout";

export default function AboutPage() {
  return (
    <StaticPageLayout title="About Skill Setu">
      <p>
        Skill Setu ("bridge") is the academia–industry portal for the AYUSH ecosystem — connecting students,
        faculty, colleges and industry partners across Ayurveda, Yoga & Naturopathy, Unani, Siddha and
        Homoeopathy. It is built for Smart India Hackathon, Ministry of AYUSH Problem Statement SIH26044:
        "Portal for Academia–Industry Collaboration for Skill Mapping, Internships and Placement."
      </p>
      <p>
        The gap between what an AYUSH graduate learns and what the sector needs is real. A BAMS, BHMS, BUMS,
        BSMS or BNYS student often doesn't know which competencies matter for a Panchakarma, GMP quality-control,
        clinical-research or wellness role; ASU&H manufacturers, Ayurveda hospitals and research councils struggle
        to find candidates who are actually ready; and faculty have limited visibility into the industry
        opportunities that could shape their teaching and research. Skill Setu is a single place where all four
        groups meet — for classical clinical practice, the ASU&H drug industry, pharmacovigilance, AYUSH R&D,
        wellness & spa, export trade, medicinal-plant cultivation and AYUSH digital health.
      </p>
      <h2>Built on the National AYUSH Mission framework</h2>
      <p>
        Skill Setu maps the sector the way the Ministry of AYUSH and the National AYUSH Mission (NAM) do: the
        recognised systems of medicine regulated by the National Commission for Indian System of Medicine (NCISM)
        and the National Commission for Homoeopathy (NCH), the ASU&H drug industry working to Schedule T GMP, the
        Ayurvedic Pharmacopoeia of India (API) and the AYUSH Premium Mark, the research councils (CCRAS, CCRYN,
        CCRUM, CCRS, CCRH) and the Ayush Grid / eSanjeevani-AYUSH digital-health layer. Rather than forcing AYUSH
        colleges to use a generic placement portal with an AYUSH label on it, the platform provides
        AYUSH-specific competency assessments, programme-level eligibility filters (BAMS, BHMS, BUMS, BSMS, BNYS,
        MD/MS, PG diplomas) and placement reporting shaped for NCISM/NCH and NAAC requirements.
      </p>
      <h2>What you can do here</h2>
      <p>
        Students take skill tests hosted by real AYUSH employers and colleges — ASU&H clinical fundamentals, herbal
        drug quality & GMP, AYUSH research and clinical documentation, digital health and telemedicine, practice
        management and regulation, plus core aptitude — then discover internships matched to that profile and build
        a verified digital portfolio. Employers post roles such as Panchakarma Therapist, Ayurvedic Physician,
        GMP Compliance Officer, Clinical Research Associate for AYUSH trials, Regulatory Affairs Associate or GACP
        Field Officer, with minimum-score and eligible-programme filters, search a proactive talent pool, run bulk
        candidate review, and track candidates from application through offer and joining. Faculty mentor an
        explicit mentee list, run office hours, host Faculty Development Programmes with managed rosters and
        certificates, and propose and run their own CTRI-registered research collaborations. Institutions get a
        full placement-cell toolkit: a searchable student roster with bulk export and onboarding, cohort skill-gap
        heatmaps by department, curriculum alignment insights, campus drive scheduling with recruiter RSVPs, MOU
        tracking, a notice board with PDF distribution, and multi-year placement history shaped for accreditation
        reporting.
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
