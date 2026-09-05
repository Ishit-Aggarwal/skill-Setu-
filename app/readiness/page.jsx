"use client";

import RequireAuth from "../../components/RequireAuth";
import PlacementReadiness from "../../components/pages/PlacementReadiness";

export default function Page() {
  return (
    <RequireAuth roles={["student"]}>
      <PlacementReadiness />
    </RequireAuth>
  );
}
