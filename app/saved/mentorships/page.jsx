"use client";

import RequireAuth from "../../../components/RequireAuth";
import SavedMentorships from "../../../components/pages/SavedMentorships";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <SavedMentorships />
    </RequireAuth>
  );
}
