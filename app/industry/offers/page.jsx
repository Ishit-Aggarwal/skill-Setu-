"use client";

import RequireAuth from "../../../components/RequireAuth";
import OffersAndJoining from "../../../components/pages/industry/OffersAndJoining";

export default function Page() {
  return (
    <RequireAuth roles={["industry"]}>
      <OffersAndJoining />
    </RequireAuth>
  );
}
