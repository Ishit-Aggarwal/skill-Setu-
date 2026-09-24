"use client";

import RequireAuth from "../../components/RequireAuth";
import CommunitiesHome from "../../components/communities/CommunitiesHome";

export default function Page() {
  return (
    <RequireAuth roles={["student", "academician", "institution"]}>
      <CommunitiesHome />
    </RequireAuth>
  );
}
