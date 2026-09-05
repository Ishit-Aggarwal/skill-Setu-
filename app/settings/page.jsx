"use client";

import RequireAuth from "../../components/RequireAuth";
import SettingsPage from "../../components/pages/Settings";

export default function Page() {
  // Settings only exists behind a session — RequireAuth bounces a signed-out
  // visitor to the login page, and the nav entry only renders inside the
  // portal shell, so there is no way to reach it while signed out.
  return (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  );
}
