"use client";

import RequireAuth from "../../../components/RequireAuth";
import AppliedMentorships from "../../../components/pages/AppliedMentorships";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <AppliedMentorships />
    </RequireAuth>
  );
}
