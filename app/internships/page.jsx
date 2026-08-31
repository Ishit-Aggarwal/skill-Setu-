"use client";

import RequireAuth from "../../components/RequireAuth";
import InternshipListings from "../../components/pages/InternshipListings";

export default function Page() {
  return (
    <RequireAuth roles={["student", "industry"]}>
      <InternshipListings />
    </RequireAuth>
  );
}
