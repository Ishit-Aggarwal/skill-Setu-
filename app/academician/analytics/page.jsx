"use client";

import RequireAuth from "../../../components/RequireAuth";
import AcademicianAnalytics from "../../../components/pages/academician/AcademicianAnalytics";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <AcademicianAnalytics />
    </RequireAuth>
  );
}
