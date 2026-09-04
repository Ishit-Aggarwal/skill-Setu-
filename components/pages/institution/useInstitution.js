"use client";

import { useMemo } from "react";
import { useAuth } from "../../../lib/auth";
import {
  getAssessment,
  listApplicationsForStudent,
  listInstitutionStudents,
  placementStatusFor,
} from "../../../lib/store";

/** The institution an admin account administers. */
export function useInstitutionName() {
  const { user } = useAuth();
  return user?.instituteName || user?.institution || "";
}

export const SCORE_BANDS = [
  { key: "All", label: "All scores", test: () => true },
  { key: "80+", label: "80 and above", test: (s) => s.score != null && s.score >= 80 },
  { key: "60-79", label: "60 – 79", test: (s) => s.score != null && s.score >= 60 && s.score < 80 },
  { key: "<60", label: "Below 60", test: (s) => s.score != null && s.score < 60 },
  { key: "none", label: "Not assessed", test: (s) => s.score == null },
];

export const PLACEMENT_STATUSES = ["All", "Placed", "In Process", "Applied", "Unplaced"];

export const PLACEMENT_TONE = {
  Placed: "green",
  "In Process": "blue",
  Applied: "amber",
  Unplaced: "muted",
};

/** One enriched row per registered student — the shape every institution view needs. */
export function buildRoster(instituteName) {
  return listInstitutionStudents(instituteName)
    .map((s) => {
      const assessment = getAssessment(s.id);
      const apps = listApplicationsForStudent(s.id);
      const hired = apps.find((a) => a.status === "Hired");
      return {
        id: s.id,
        name: s.name || "—",
        email: s.email || "",
        rollNo: s.rollNo || "",
        department: s.department || "Unassigned",
        batch: s.batch || "",
        year: s.year || "",
        course: s.course || "",
        phone: s.phone || "",
        invited: !!s.invited,
        openToOpportunities: s.openToOpportunities !== false,
        score: assessment ? Math.round(assessment.overallScore) : null,
        domainScores: assessment?.domainScores || {},
        applications: apps.length,
        bestMatch: apps.length ? Math.max(...apps.map((a) => a.match || 0)) : null,
        placedAt: hired?.company || "",
        status: placementStatusFor(s.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function useRoster(instituteName, deps = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (instituteName ? buildRoster(instituteName) : []), [instituteName, ...deps]);
}

export const ROSTER_EXPORT_COLUMNS = [
  { label: "Name", value: (r) => r.name },
  { label: "Roll No", value: (r) => r.rollNo },
  { label: "Email", value: (r) => r.email },
  { label: "Department", value: (r) => r.department },
  { label: "Batch", value: (r) => r.batch },
  { label: "Year", value: (r) => r.year },
  { label: "Course", value: (r) => r.course },
  { label: "Phone", value: (r) => r.phone },
  { label: "Skill Score", value: (r) => (r.score == null ? "" : r.score) },
  { label: "Applications", value: (r) => r.applications },
  { label: "Placement Status", value: (r) => r.status },
  { label: "Placed At", value: (r) => r.placedAt },
];
