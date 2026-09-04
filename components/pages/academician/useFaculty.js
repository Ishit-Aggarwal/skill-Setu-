"use client";

import {
  getAssessment,
  getMentorNote,
  isAdvisee,
  listAdvisees,
  listApplicationsForStudent,
  listInstitutionStudents,
  placementStatusFor,
} from "../../../lib/store";

export const PLACEMENT_TONE = {
  Placed: "green",
  "In Process": "blue",
  Applied: "amber",
  Rejected: "red",
  Unplaced: "muted",
};

export const FLAGS = ["", "Promising", "Needs support", "Research track"];

export const FLAG_TONE = {
  Promising: "green",
  "Needs support": "amber",
  "Research track": "purple",
};

/**
 * Students a faculty member can see, in three widening rings:
 *   advisee  — explicitly assigned to them as mentor
 *   department — same department at the same institution
 *   institution — everyone else at their institution
 * The advisee ring is the one that was previously missing entirely: the old
 * dashboard listed every student on the platform with no link to the faculty
 * member at all.
 */
export function buildFacultyStudents(faculty) {
  if (!faculty) return [];
  const adviseeIds = new Set(listAdvisees(faculty.id).map((a) => a.studentId));
  return listInstitutionStudents(faculty.institution)
    .map((s) => {
      const assessment = getAssessment(s.id);
      const apps = listApplicationsForStudent(s.id);
      const note = getMentorNote(faculty.id, s.id);
      return {
        id: s.id,
        name: s.name || "—",
        email: s.email || "",
        rollNo: s.rollNo || "",
        department: s.department || "Unassigned",
        batch: s.batch || "",
        year: s.year || "",
        course: s.course || "",
        score: assessment ? Math.round(assessment.overallScore) : null,
        domainScores: assessment?.domainScores || {},
        applications: apps.length,
        bestMatch: apps.length ? Math.max(...apps.map((a) => a.match || 0)) : null,
        status: placementStatusFor(s.id),
        isAdvisee: adviseeIds.has(s.id),
        note: note?.note || "",
        flag: note?.flag || "",
        recommendations: note?.recommendations || [],
      };
    })
    .sort((a, b) => Number(b.isAdvisee) - Number(a.isAdvisee) || a.name.localeCompare(b.name));
}

export const STUDENT_EXPORT_COLUMNS = [
  { label: "Name", value: (r) => r.name },
  { label: "Roll No", value: (r) => r.rollNo },
  { label: "Email", value: (r) => r.email },
  { label: "Department", value: (r) => r.department },
  { label: "Batch", value: (r) => r.batch },
  { label: "Skill Score", value: (r) => (r.score == null ? "" : r.score) },
  { label: "Applications", value: (r) => r.applications },
  { label: "Placement Status", value: (r) => r.status },
  { label: "My advisee", value: (r) => (r.isAdvisee ? "Yes" : "No") },
  { label: "Flag", value: (r) => r.flag },
  { label: "Mentor note", value: (r) => r.note },
];

/** Average domain scores across a set of students. */
export function averageDomainScores(students) {
  const totals = {};
  students.forEach((s) => {
    Object.entries(s.domainScores || {}).forEach(([domain, score]) => {
      if (!totals[domain]) totals[domain] = { sum: 0, count: 0 };
      totals[domain].sum += score;
      totals[domain].count += 1;
    });
  });
  return Object.entries(totals)
    .map(([domain, { sum, count }]) => ({ domain, avg: Math.round(sum / count), assessed: count }))
    .sort((a, b) => a.avg - b.avg);
}

export { isAdvisee };
