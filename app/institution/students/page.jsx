"use client";

import RequireAuth from "../../../components/RequireAuth";
import StudentRoster from "../../../components/pages/institution/StudentRoster";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <StudentRoster />
    </RequireAuth>
  );
}
