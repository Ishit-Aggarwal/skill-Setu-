"use client";

import RequireAuth from "../../components/RequireAuth";
import Notifications from "../../components/pages/Notifications";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <Notifications />
    </RequireAuth>
  );
}
