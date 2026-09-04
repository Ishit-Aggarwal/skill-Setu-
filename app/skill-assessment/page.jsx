"use client";

import RequireAuth from "../../components/RequireAuth";
import SkillAssessment from "../../components/pages/SkillAssessment";

export default function Page() {
  return (
    <RequireAuth roles={["student", "industry", "academician", "institution"]}>
      <SkillAssessment />
    </RequireAuth>
  );
}
