"use client";

import RequireAuth from "../../components/RequireAuth";
import ResumeCoach from "../../components/pages/ResumeCoach";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <ResumeCoach />
    </RequireAuth>
  );
}
