"use client";

import RequireAuth from "../../../components/RequireAuth";
import HiringTeam from "../../../components/pages/industry/HiringTeam";

export default function Page() {
  return (
    <RequireAuth roles={["industry"]}>
      <HiringTeam />
    </RequireAuth>
  );
}
