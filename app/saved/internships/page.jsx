"use client";

import RequireAuth from "../../../components/RequireAuth";
import SavedInternships from "../../../components/pages/SavedInternships";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <SavedInternships />
    </RequireAuth>
  );
}
