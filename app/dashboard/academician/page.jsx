"use client";

import { Suspense } from "react";
import RequireAuth from "../../../components/RequireAuth";
import AcademicianDashboard from "../../../components/pages/AcademicianDashboard";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <Suspense fallback={null}>
        <AcademicianDashboard />
      </Suspense>
    </RequireAuth>
  );
}
