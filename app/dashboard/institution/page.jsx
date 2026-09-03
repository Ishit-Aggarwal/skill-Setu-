"use client";

import RequireAuth from "../../../components/RequireAuth";
import InstitutionDashboard from "../../../components/pages/InstitutionDashboard";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <InstitutionDashboard />
    </RequireAuth>
  );
}
