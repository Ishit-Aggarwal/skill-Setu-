"use client";

import { use } from "react";
import VerifyPage from "../../../components/certificates/VerifyPage";

/**
 * Public certificate verification by code. Anyone holding a printed or
 * downloaded certificate can open its link and see the student's name, the
 * test, the score and the issuer — and nothing else.
 */
export default function Page({ params }) {
  // Next 14 hands a client page a plain params object; Next 15 a promise.
  const { code } = typeof params?.then === "function" ? use(params) : params;
  return <VerifyPage code={decodeURIComponent(code || "")} />;
}
