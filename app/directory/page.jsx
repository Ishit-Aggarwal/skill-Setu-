"use client";

import RequireAuth from "../../components/RequireAuth";
import Directory from "../../components/pages/Directory";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <Directory />
    </RequireAuth>
  );
}
