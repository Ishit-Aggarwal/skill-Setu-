"use client";

import RequireAuth from "../../../components/RequireAuth";
import AcademicianDashboard from "../../../components/pages/AcademicianDashboard";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <AcademicianDashboard />
    </RequireAuth>
  );
}
