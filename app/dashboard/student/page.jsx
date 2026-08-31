"use client";

import RequireAuth from "../../../components/RequireAuth";
import StudentDashboard from "../../../components/pages/StudentDashboard";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <StudentDashboard />
    </RequireAuth>
  );
}
