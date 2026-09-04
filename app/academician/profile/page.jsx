"use client";

import RequireAuth from "../../../components/RequireAuth";
import FacultyProfile from "../../../components/pages/academician/FacultyProfile";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <FacultyProfile />
    </RequireAuth>
  );
}
