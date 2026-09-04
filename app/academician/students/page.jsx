"use client";

import RequireAuth from "../../../components/RequireAuth";
import MyStudents from "../../../components/pages/academician/MyStudents";

export default function Page() {
  return (
    <RequireAuth roles={["academician"]}>
      <MyStudents />
    </RequireAuth>
  );
}
