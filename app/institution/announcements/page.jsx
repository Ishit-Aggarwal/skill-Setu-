"use client";

import RequireAuth from "../../../components/RequireAuth";
import NoticeBoard from "../../../components/pages/institution/NoticeBoard";

/**
 * The campus board is shared between the placement cell and the faculty who
 * post to it — the academician rail links here as "Campus Board". Locking the
 * route to `institution` alone meant that link bounced every faculty member
 * straight back to their own dashboard.
 */
export default function Page() {
  return (
    <RequireAuth roles={["institution", "academician"]}>
      <NoticeBoard />
    </RequireAuth>
  );
}
