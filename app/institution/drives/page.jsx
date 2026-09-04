"use client";

import RequireAuth from "../../../components/RequireAuth";
import PlacementDrives from "../../../components/pages/institution/PlacementDrives";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <PlacementDrives />
    </RequireAuth>
  );
}
