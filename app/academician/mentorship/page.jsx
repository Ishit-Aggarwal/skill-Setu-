"use client";

import RequireAuth from "../../../components/RequireAuth";
import Mentorship from "../../../components/pages/academician/Mentorship";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <Mentorship />
    </RequireAuth>
  );
}
