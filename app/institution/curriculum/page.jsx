"use client";

import RequireAuth from "../../../components/RequireAuth";
import CurriculumAlignment from "../../../components/pages/institution/CurriculumAlignment";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <CurriculumAlignment />
    </RequireAuth>
  );
}
