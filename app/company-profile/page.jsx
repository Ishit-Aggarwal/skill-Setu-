"use client";

import RequireAuth from "../../components/RequireAuth";
import CompanyProfile from "../../components/pages/CompanyProfile";

export default function Page() {
  return (
    <RequireAuth roles={["industry"]}>
      <CompanyProfile />
    </RequireAuth>
  );
}
