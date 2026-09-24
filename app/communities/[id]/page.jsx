"use client";

import { Suspense, use } from "react";
import RequireAuth from "../../../components/RequireAuth";
import CommunityPage from "../../../components/communities/CommunityPage";

export default function Page({ params }) {
  const { id } = typeof params?.then === "function" ? use(params) : params;
  return (
    <RequireAuth roles={["student", "academician", "institution"]}>
      <Suspense fallback={null}>
        <CommunityPage communityId={decodeURIComponent(id)} />
      </Suspense>
    </RequireAuth>
  );
}
