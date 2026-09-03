"use client";

import RequireAuth from "../../components/RequireAuth";
import TalentPool from "../../components/pages/TalentPool";

export default function Page() {
  return (
    <RequireAuth roles={["industry"]}>
      <TalentPool />
    </RequireAuth>
  );
}
