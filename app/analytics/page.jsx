"use client";

import RequireAuth from "../../components/RequireAuth";
import { useAuth } from "../../lib/auth";
import AnalyticsDashboard from "../../components/pages/AnalyticsDashboard";
import StudentAnalytics from "../../components/pages/StudentAnalytics";

/**
 * One route, two audiences.
 *
 * A student's analytics are about the student — their own skill breakdown,
 * their own test history, their own funnel. A recruiter's are about their
 * hiring, benchmarked against the platform. The page used to show the
 * recruiter's view to both, which is why it read as a page of numbers with
 * nothing in it for the person looking.
 *
 * Academician and institution accounts have their own role-scoped analytics
 * pages; RequireAuth bounces them there rather than showing either of these.
 */
function AnalyticsRouter() {
  const { user } = useAuth();
  return user?.role === "student" ? <StudentAnalytics /> : <AnalyticsDashboard />;
}

export default function Page() {
  return (
    <RequireAuth roles={["student", "industry"]}>
      <AnalyticsRouter />
    </RequireAuth>
  );
}
