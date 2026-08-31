"use client";

import RequireAuth from "../../components/RequireAuth";
import AnalyticsDashboard from "../../components/pages/AnalyticsDashboard";

export default function Page() {
  return (
    <RequireAuth>
      <AnalyticsDashboard />
    </RequireAuth>
  );
}
