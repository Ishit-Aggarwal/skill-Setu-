"use client";

import RequireAuth from "../../components/RequireAuth";
import StudentPortfolio from "../../components/pages/StudentPortfolio";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <StudentPortfolio />
    </RequireAuth>
  );
}
