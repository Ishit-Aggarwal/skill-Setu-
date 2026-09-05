"use client";

import RequireAuth from "../../../components/RequireAuth";
import AppliedInternships from "../../../components/pages/AppliedInternships";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <AppliedInternships />
    </RequireAuth>
  );
}
