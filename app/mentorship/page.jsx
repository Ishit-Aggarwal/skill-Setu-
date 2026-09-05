"use client";

import RequireAuth from "../../components/RequireAuth";
import StudentMentorship from "../../components/pages/StudentMentorship";

export default function Page() {
  // Faculty manage office hours from their own Mentorship page; this is the
  // student's half of the same calendar.
  return (
    <RequireAuth roles={["student"]}>
      <StudentMentorship />
    </RequireAuth>
  );
}
