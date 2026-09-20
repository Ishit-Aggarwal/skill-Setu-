"use client";

import { use } from "react";
import RequireAuth from "../../../../components/RequireAuth";
import ProctoringReport from "../../../../components/skilltests/ProctoringReport";

export default function Page({ params }) {
  const { attemptId } = typeof params?.then === "function" ? use(params) : params;
  return (
    <RequireAuth>
      <ProctoringReport attemptId={attemptId} />
    </RequireAuth>
  );
}
