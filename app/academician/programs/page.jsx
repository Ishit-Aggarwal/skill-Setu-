"use client";

import RequireAuth from "../../../components/RequireAuth";
import Programs from "../../../components/pages/academician/Programs";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <Programs />
    </RequireAuth>
  );
}
