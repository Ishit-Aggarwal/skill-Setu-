"use client";

import RequireAuth from "../../components/RequireAuth";
import AnalyticsDashboard from "../../components/pages/AnalyticsDashboard";

export default function Page() {
  // Academician and institution accounts have their own role-scoped analytics
  // pages; RequireAuth bounces them there rather than showing this one.
  return (
    <RequireAuth roles={["student", "industry"]}>
      <AnalyticsDashboard />
    </RequireAuth>
  );
}
