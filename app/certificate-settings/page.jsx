"use client";

import RequireAuth from "../../components/RequireAuth";
import CertificateSettings from "../../components/pages/CertificateSettings";

export default function Page() {
  return (
    <RequireAuth>
      <CertificateSettings />
    </RequireAuth>
  );
}
