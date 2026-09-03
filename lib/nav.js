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
  "company-profile": "/company-profile",
  "talent-pool": "/talent-pool",
  analytics: "/analytics",
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
