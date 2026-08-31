"use client";

import RequireAuth from "../../../components/RequireAuth";
import AnalyticsDashboard from "../../../components/pages/AnalyticsDashboard";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <AnalyticsDashboard activePage="institution-dashboard" title="Placement Analytics" />
    </RequireAuth>
  );
}
