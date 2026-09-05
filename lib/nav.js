"use client";

import { useRouter } from "next/navigation";

export const PAGE_PATHS = {
  landing: "/",
  login: "/login",

  "student-dashboard": "/dashboard/student",
  "industry-dashboard": "/dashboard/industry",
  "academician-dashboard": "/dashboard/academician",
  "institution-dashboard": "/dashboard/institution",

  "skill-assessment": "/skill-assessment",
  "internship-listings": "/internships",
  "student-portfolio": "/portfolio",
  "student-mentorship": "/mentorship",
  "company-profile": "/company-profile",
  "talent-pool": "/talent-pool",
  analytics: "/analytics",
  // One settings page serves all four roles; its content is role-aware.
  settings: "/settings",

  "industry-offers": "/industry/offers",
  "industry-team": "/industry/team",

  "academician-students": "/academician/students",
  "academician-mentorship": "/academician/mentorship",
  "academician-collabs": "/academician/collabs",
  "academician-programs": "/academician/programs",
  "academician-alignment": "/academician/alignment",
  "academician-analytics": "/academician/analytics",
  "academician-profile": "/academician/profile",

  "institution-students": "/institution/students",
  "institution-skill-gaps": "/institution/skill-gaps",
  "institution-curriculum": "/institution/curriculum",
  "institution-drives": "/institution/drives",
  "institution-partnerships": "/institution/partnerships",
  "institution-announcements": "/institution/announcements",
  "institution-analytics": "/institution/analytics",
  "institution-team": "/institution/team",
  "institution-profile": "/institution/profile",
};

export function roleHomePage(role) {
  return (
    {
      student: "student-dashboard",
      industry: "industry-dashboard",
      academician: "academician-dashboard",
      institution: "institution-dashboard",
    }[role] || "landing"
  );
}

export function useNav() {
  const router = useRouter();
  return function navigate(pageKey, query) {
    const path = PAGE_PATHS[pageKey] || "/";
    if (query && Object.keys(query).length) {
      router.push(`${path}?${new URLSearchParams(query).toString()}`);
    } else {
      router.push(path);
    }
  };
}
