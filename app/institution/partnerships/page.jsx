"use client";

import RequireAuth from "../../../components/RequireAuth";
import Partnerships from "../../../components/pages/institution/Partnerships";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <Partnerships />
    </RequireAuth>
  );
}
