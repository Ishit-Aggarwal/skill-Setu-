"use client";

import RequireAuth from "../../../components/RequireAuth";
import IndustryDashboard from "../../../components/pages/IndustryDashboard";

export default function Page() {
  return (
    <RequireAuth roles={["industry"]}>
      <IndustryDashboard />
    </RequireAuth>
  );
}
