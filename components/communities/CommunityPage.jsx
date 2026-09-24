"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../lib/convexBrowser";
import { useSessionQuery } from "../../lib/useSessionQuery";
import { ayushSystemLabel } from "../../lib/ayush";
import { COMMUNITIES } from "../../lib/settings";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, Skeleton, Tabs, TextArea, useFlash } from "../ui/Kit";
import { VisibilityBadge } from "./shared";
import FeedTab from "./FeedTab";
import TestsTab from "./TestsTab";
import { AboutTab, AuditTab, InsightsTab, InviteTab, MaterialsTab, MembersTab, ReportsTab, RequestsTab, SettingsTab } from "./ManageTabs";

/**
 * /communities/[id]. Members see the feed, materials, tests and the About
 * card; the owner and moderators also get members, requests, invitations,
 * reports and insights; the owner alone gets settings and the audit log.
 * Somebody outside sees the public card (Join / Request / an invitation),
 * and nothing at all for an Invite-only community they were not invited to.
 */

function OutsiderCard({ community, onFlash }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  async function run(ref, args, message) {
    setBusy(true);
    try {
      await backendMutation(ref, { communityId: community.id, ...args });
      onFlash(message);
      setAsking(false);
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err, "That didn't work.")}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-3">
      <p className="text-sm text-foreground">{community.description || "No description yet."}</p>
      <div className="text-xs text-muted-foreground">
        Run by {community.ownerName}
        {community.institutionName ? ` · ${community.institutionName}` : ""} · {community.memberCount} member{community.memberCount === 1 ? "" : "s"}
      </div>
      {community.myStatus === "invited" ? (
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => run(api.communities.acceptInvite, {}, `Welcome to ${community.name}.`)}>
            Accept invitation
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => run(api.communities.declineInvite, {}, "Invitation declined.")}>
            Decline
          </Button>
        </div>
      ) : community.myStatus === "pending" ? (
        <div className="flex items-center gap-3">
          <Badge tone="amber">Requested ✓</Badge>
          <button type="button" className="text-xs text-muted-foreground hover:text-red-600" onClick={() => run(api.communities.cancelRequest, {}, "Request cancelled.")}>
            Cancel request
          </button>
        </div>
      ) : community.archived ? (
        <p className="text-xs text-muted-foreground">This community is archived and isn't taking new members.</p>
      ) : community.visibility === "open" ? (
        <Button disabled={busy} onClick={() => run(api.communities.join, {}, `You've joined ${community.name}.`)}>
          Join community
        </Button>
      ) : community.visibility === "closed" ? (
        asking ? (
          <div className="space-y-2">
            <Field label="Note (optional)" hint={`${note.length}/${COMMUNITIES.MAX_REQUEST_NOTE_CHARS}`}>
              <TextArea rows={2} maxLength={COMMUNITIES.MAX_REQUEST_NOTE_CHARS} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button disabled={busy} onClick={() => run(api.communities.requestJoin, { note }, "Request sent.")}>
              Send request
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAsking(true)}>
            Request to join
          </Button>
        )
      ) : null}
    </Card>
  );
}

export default function CommunityPage({ communityId }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [flash, setFlash] = useFlash(3500);
  const [leaving, setLeaving] = useState(false);
  const { data, error, loading } = useSessionQuery(api.communities.get, { communityId });
  const community = data?.community;
  const full = data?.view === "full";

  const tabs = useMemo(() => {
    if (!full) return [];
    const list = [
      { key: "feed", label: "Feed" },
      { key: "materials", label: "Materials" },
      { key: "tests", label: "Tests" },
    ];
    if (community.isStaff) {
      list.push({ key: "members", label: "Members" });
      list.push({ key: "requests", label: `Requests${community.pendingCount ? ` (${community.pendingCount})` : ""}` });
      list.push({ key: "invite", label: "Invite" });
      list.push({ key: "reports", label: "Reports" });
      list.push({ key: "insights", label: "Insights" });
      if (community.isOwner) {
        list.push({ key: "settings", label: "Settings" });
        list.push({ key: "audit", label: "Audit log" });
      }
    } else {
      list.push({ key: "about", label: "About" });
    }
    return list;
  }, [full, community]);

  const requested = params?.get("tab");
  const [tab, setTab] = useState(requested || "feed");
  useEffect(() => {
    if (requested) setTab(requested);
  }, [requested]);
  const activeTab = tabs.some((t) => t.key === tab) ? tab : "feed";

  // Opening the page is "seen up to now" — it clears the unread badge.
  useEffect(() => {
    if (full && community && !community.isOwner) backendMutation(api.communities.markSeen, { communityId }).catch(() => {});
  }, [full, community?.id, communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleMute() {
    try {
      await backendMutation(api.communities.setMuted, { communityId, muted: !community.notificationsMuted });
      setFlash(community.notificationsMuted ? "Notifications on." : "Notifications muted for this community.");
    } catch (err) {
      setFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  async function leave() {
    try {
      await backendMutation(api.communities.leave, { communityId });
      setLeaving(false);
      router.push("/communities");
    } catch (err) {
      setFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  return (
    <DashboardLayout activePage="communities" title="Communities">
      <div className="animate-fade-slide space-y-5">
        <Link href="/communities" className="text-xs text-muted-foreground hover:text-foreground">
          ← All communities
        </Link>
        {loading && <Skeleton className="h-40" />}
        {error && <EmptyState icon="⚠️" title="This community couldn't be loaded">{error}</EmptyState>}
        {!loading && !error && !data && (
          <EmptyState icon="🔍" title="Community not found" action={<Link href="/communities" className="text-sm text-primary hover:underline">Back to communities</Link>}>
            It may have been deleted, or it's invite-only. If you have an invite code, enter it on the Communities page.
          </EmptyState>
        )}
        {community && (
          <>
            <div
              className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/15 bg-cover bg-center border border-border"
              style={community.coverUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${community.coverUrl})` } : undefined}
            >
              <div className={`flex flex-wrap items-start gap-3 ${community.coverUrl ? "text-white" : ""}`}>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{community.name}</h2>
                  <p className={`text-xs mt-1 ${community.coverUrl ? "text-white/85" : "text-muted-foreground"}`}>
                    {community.ownerRole === "institution" ? "🏫" : "👩‍🏫"} {community.ownerName}
                    {community.institutionName && community.ownerRole !== "institution" ? ` · ${community.institutionName}` : ""} · {community.memberCount} member{community.memberCount === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <VisibilityBadge visibility={community.visibility} />
                    <Badge tone="primary">{ayushSystemLabel(community.ayushSystem)}</Badge>
                    {community.courseLevel && <Badge tone="neutral">{community.courseLevel}</Badge>}
                    {community.archived && <Badge tone="muted">Archived</Badge>}
                    {community.isOwner ? <Badge tone="primary">You own this</Badge> : community.isStaff ? <Badge tone="blue">Moderator</Badge> : null}
                  </div>
                </div>
                {full && !community.isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={toggleMute} aria-pressed={community.notificationsMuted}>
                      {community.notificationsMuted ? "🔕 Muted" : "🔔 Notifications on"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setLeaving(true)}>
                      Leave
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Flash message={flash} tone={String(flash || "").startsWith("⚠️") ? "red" : "green"} />

            {!full ? (
              <OutsiderCard community={community} onFlash={setFlash} />
            ) : (
              <>
                <Tabs tabs={tabs} value={activeTab} onChange={setTab} />
                {activeTab === "feed" && <FeedTab community={community} onFlash={setFlash} />}
                {activeTab === "materials" && <MaterialsTab community={community} onFlash={setFlash} />}
                {activeTab === "tests" && <TestsTab community={community} user={user} />}
                {activeTab === "members" && community.isStaff && <MembersTab community={community} onFlash={setFlash} />}
                {activeTab === "requests" && community.isStaff && <RequestsTab community={community} onFlash={setFlash} />}
                {activeTab === "invite" && community.isStaff && <InviteTab community={community} onFlash={setFlash} />}
                {activeTab === "reports" && community.isStaff && <ReportsTab community={community} onFlash={setFlash} />}
                {activeTab === "insights" && community.isStaff && <InsightsTab community={community} />}
                {activeTab === "settings" && community.isOwner && <SettingsTab community={community} onFlash={setFlash} />}
                {activeTab === "audit" && community.isOwner && <AuditTab community={community} />}
                {activeTab === "about" && <AboutTab community={community} />}
              </>
            )}
          </>
        )}
        {leaving && (
          <Modal title={`Leave ${community?.name}?`} description="You'll stop getting its posts and lose access to its community-only tests (results you already have stay)." onClose={() => setLeaving(false)} size="sm">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setLeaving(false)}>
                Stay
              </Button>
              <Button variant="danger" className="flex-1" onClick={leave}>
                Leave
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
