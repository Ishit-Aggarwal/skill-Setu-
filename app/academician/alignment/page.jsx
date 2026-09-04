"use client";

import RequireAuth from "../../../components/RequireAuth";
import IndustryAlignment from "../../../components/pages/academician/IndustryAlignment";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <IndustryAlignment />
    </RequireAuth>
  );
}
