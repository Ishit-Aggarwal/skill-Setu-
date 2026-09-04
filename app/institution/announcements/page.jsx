"use client";

import RequireAuth from "../../../components/RequireAuth";
import NoticeBoard from "../../../components/pages/institution/NoticeBoard";

export default function Page() {
  return (
    <RequireAuth roles={["institution"]}>
      <NoticeBoard />
    </RequireAuth>
  );
}
