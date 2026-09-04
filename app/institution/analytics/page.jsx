"use client";

import RequireAuth from "../../../components/RequireAuth";
import InstitutionAnalytics from "../../../components/pages/institution/InstitutionAnalytics";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <InstitutionAnalytics />
    </RequireAuth>
  );
}
