"use client";

import RequireAuth from "../../../components/RequireAuth";
import TeamActivity from "../../../components/pages/institution/TeamActivity";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <TeamActivity />
    </RequireAuth>
  );
}
