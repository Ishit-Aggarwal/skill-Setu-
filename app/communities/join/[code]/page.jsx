"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "../../../../components/DashboardLayout";
import { CommunityCard } from "../../../../components/communities/shared";
import { Button, EmptyState, Skeleton } from "../../../../components/ui/Kit";
import { useAuth } from "../../../../lib/auth";
import { api } from "../../../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../../../lib/convexBrowser";
import { useSessionQuery } from "../../../../lib/useSessionQuery";

/**
 * An invite link: /communities/join/<code>. The community's name is shown
 * only once the code checks out; an expired, used-up, wrong-institution or
 * banned case each says so plainly. Signing in first returns here.
 */
function JoinPage({ code }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { data, loading, error: loadError } = useSessionQuery(api.communities.byCode, { code });

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const out = await backendMutation(api.communities.joinByCode, { code });
      router.push(`/communities/${out.communityId}`);
    } catch (err) {
      setError(backendErrorMessage(err, "Could not join."));
      setBusy(false);
    }
  }

  return (
    <DashboardLayout activePage="communities" title="Join a community">
      <div className="animate-fade-slide max-w-lg mx-auto space-y-4">
        {loading && <Skeleton className="h-56" />}
        {loadError && <EmptyState icon="⚠️" title="Couldn't check that code">{loadError}</EmptyState>}
        {data && !data.ok && (
          <EmptyState icon="🔒" title="This invite doesn't work" action={<Link href="/communities" className="text-sm text-primary hover:underline">Go to Communities</Link>}>
            {data.reason}
          </EmptyState>
        )}
        {data?.ok && (
          <CommunityCard community={data.community}>
            {data.alreadyMember ? (
              <Link href={`/communities/${data.community.id}`} className="text-sm text-primary font-medium hover:underline">
                You're already a member — open it →
              </Link>
            ) : data.canJoin ? (
              <Button onClick={join} disabled={busy}>
                {busy ? "Joining…" : `Join ${data.community.name}`}
              </Button>
            ) : (
              <p className="text-xs text-red-600">{data.reason}</p>
            )}
            {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
          </CommunityCard>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function Page({ params }) {
  const { code } = typeof params?.then === "function" ? use(params) : params;
  const { user, loading } = useAuth();
  const router = useRouter();
  const clean = decodeURIComponent(code || "");

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?role=student&next=${encodeURIComponent(`/communities/join/${clean}`)}`);
  }, [loading, user, router, clean]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Sign in to use this invite…
      </div>
    );
  }
  if (user.role !== "student") {
    return (
      <DashboardLayout activePage="communities" title="Join a community">
        <EmptyState icon="🎓" title="Invite codes are for student accounts">
          Sign in with a student account to join. Professors and institutions run communities from the Communities page.
        </EmptyState>
      </DashboardLayout>
    );
  }
  return <JoinPage code={clean} />;
}
