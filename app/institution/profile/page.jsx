"use client";

import RequireAuth from "../../../components/RequireAuth";
import InstitutionProfile from "../../../components/pages/institution/InstitutionProfile";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <InstitutionProfile />
    </RequireAuth>
  );
}
