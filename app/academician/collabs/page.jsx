"use client";

import RequireAuth from "../../../components/RequireAuth";
import ResearchCollabs from "../../../components/pages/academician/ResearchCollabs";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <ResearchCollabs />
    </RequireAuth>
  );
}
