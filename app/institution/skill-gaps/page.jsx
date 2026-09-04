"use client";

import RequireAuth from "../../../components/RequireAuth";
import CohortSkillGaps from "../../../components/pages/institution/CohortSkillGaps";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <CohortSkillGaps />
    </RequireAuth>
  );
}
