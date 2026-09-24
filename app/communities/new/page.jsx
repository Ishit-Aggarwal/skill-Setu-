"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "../../../components/RequireAuth";
import DashboardLayout from "../../../components/DashboardLayout";
import CommunityForm, { blankCommunity } from "../../../components/communities/CommunityForm";
import { Card, PageHeader } from "../../../components/ui/Kit";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../../lib/convexBrowser";

function NewCommunity() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create(fields, setError) {
    setBusy(true);
    try {
      const out = await backendMutation(api.communities.create, fields);
      router.push(`/communities/${out.id}`);
    } catch (err) {
      // The form keeps everything the host typed; only the message changes.
      setError(backendErrorMessage(err, "Could not create the community. Please try again."));
      setBusy(false);
    }
  }

  return (
    <DashboardLayout activePage="communities" title="New community">
      <div className="animate-fade-slide space-y-5 max-w-3xl">
        <PageHeader eyebrow="Communities" title="Create a community" subtitle="A space for your students: announcements, notes and slides, and tests only its members can sit." />
        <Card>
          <CommunityForm initial={blankCommunity(user?.role)} busy={busy} onSubmit={create} onCancel={() => router.push("/communities")} />
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function Page() {
  return (
    <RequireAuth roles={["academician", "institution"]}>
      <NewCommunity />
    </RequireAuth>
  );
}
