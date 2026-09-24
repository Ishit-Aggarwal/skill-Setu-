"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../lib/convexBrowser";
import { useSessionQuery } from "../../lib/useSessionQuery";
import { COMMUNITIES } from "../../lib/settings";
import { normaliseInviteCode } from "../../lib/communityRules";
import { AyushSystemFilter } from "../AyushSystemSelect";
import { Badge, Button, EmptyState, Field, FilterPills, Flash, Modal, PageHeader, SearchInput, Section, Skeleton, Tabs, TextArea, useFlash } from "../ui/Kit";
import { CommunityCard } from "./shared";

/**
 * /communities — the caller's own communities and, for students, Discover.
 *
 * Every list here is read live from the server, which decides what each
 * caller may see: Discover never lists an Invite-only community or one that
 * banned the student, and a same-institution community only appears to its
 * own institution's students.
 */

function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = normaliseInviteCode(code);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length === COMMUNITIES.INVITE_CODE_LENGTH) router.push(`/communities/join/${encodeURIComponent(clean)}`);
      }}
      className="flex items-end gap-2 flex-wrap"
    >
      <Field label="Have an invite code?" className="flex-1 min-w-[200px]">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 7KQ2-M9XA"
          aria-label="Invite code"
          className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </Field>
      <Button type="submit" disabled={clean.length !== COMMUNITIES.INVITE_CODE_LENGTH}>
        Open
      </Button>
    </form>
  );
}

function RequestModal({ community, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function send() {
    setBusy(true);
    setError(null);
    try {
      await backendMutation(api.communities.requestJoin, { communityId: community.id, note });
      onDone("Request sent. You'll be notified when it's approved.");
    } catch (err) {
      setError(backendErrorMessage(err, "Could not send the request."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Request to join ${community.name}`} description="The owner or a moderator approves requests." onClose={onClose}>
      <div className="space-y-3">
        <Field label="Note (optional)" hint={`${note.length}/${COMMUNITIES.MAX_REQUEST_NOTE_CHARS}`}>
          <TextArea rows={3} maxLength={COMMUNITIES.MAX_REQUEST_NOTE_CHARS} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. BAMS 2nd Prof, Roll No. 21BAMS045 — I attend Dr. Sharma's Dravyaguna lectures." />
        </Field>
        {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={send} disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StudentAction({ community, onFlash, onRequest }) {
  const [busy, setBusy] = useState(false);
  async function run(ref, args, message) {
    setBusy(true);
    try {
      await backendMutation(ref, args);
      onFlash(message);
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err, "That didn't work.")}`);
    } finally {
      setBusy(false);
    }
  }
  if (community.myStatus === "active") {
    return (
      <Link href={`/communities/${community.id}`} className="text-xs font-medium text-primary hover:underline">
        Open community →
      </Link>
    );
  }
  if (community.myStatus === "pending") {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="amber">Requested ✓</Badge>
        <button type="button" disabled={busy} onClick={() => run(api.communities.cancelRequest, { communityId: community.id }, "Request cancelled.")} className="text-[11px] text-muted-foreground hover:text-red-600">
          Cancel request
        </button>
      </div>
    );
  }
  if (community.archived) return <span className="text-[11px] text-muted-foreground">Archived — not taking members</span>;
  if (community.visibility === "open") {
    return (
      <Button size="sm" disabled={busy} onClick={() => run(api.communities.join, { communityId: community.id }, `You've joined ${community.name}.`)}>
        {busy ? "Joining…" : "Join"}
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => onRequest(community)}>
      Request to join
    </Button>
  );
}

function Invitations({ invitations, onFlash }) {
  const [busy, setBusy] = useState(null);
  if (!invitations?.length) return null;
  async function run(ref, community, message) {
    setBusy(community.id);
    try {
      await backendMutation(ref, { communityId: community.id });
      onFlash(message);
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err, "That didn't work.")}`);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Section title={`Invitations (${invitations.length})`} description="You were invited directly. Accept to join.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {invitations.map((c) => (
          <CommunityCard key={c.id} community={c}>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy === c.id} onClick={() => run(api.communities.acceptInvite, c, `You've joined ${c.name}.`)}>
                Accept
              </Button>
              <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => run(api.communities.declineInvite, c, "Invitation declined.")}>
                Decline
              </Button>
            </div>
          </CommunityCard>
        ))}
      </div>
    </Section>
  );
}

function Discover({ onFlash }) {
  const [system, setSystem] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [requesting, setRequesting] = useState(null);
  const { data, error, loading } = useSessionQuery(api.communities.discover, { ayushSystem: system || undefined, ownerRole: ownerRole || undefined, myInstitutionOnly: mine || undefined, search: search || undefined, offset });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setOffset(0); }} placeholder="Search by name, owner or subject…" className="flex-1" />
        <label className="flex items-center gap-2 text-xs text-foreground whitespace-nowrap">
          <input type="checkbox" checked={mine} onChange={(e) => { setMine(e.target.checked); setOffset(0); }} />
          My institution only
        </label>
      </div>
      <AyushSystemFilter value={system} onChange={(v) => { setSystem(v); setOffset(0); }} />
      <FilterPills label="Run by" options={[{ value: "", label: "Anyone" }, { value: "academician", label: "Professors" }, { value: "institution", label: "Institutions" }]} value={ownerRole} onChange={(v) => { setOwnerRole(v); setOffset(0); }} />
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : !data?.communities?.length ? (
        <EmptyState icon="🔎" title="No communities match">
          Try another AYUSH system or search. Invite-only communities never appear here — you need their code.
        </EmptyState>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">{data.total} communit{data.total === 1 ? "y" : "ies"}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.communities.map((c) => (
              <CommunityCard key={c.id} community={c}>
                <StudentAction community={c} onFlash={onFlash} onRequest={setRequesting} />
              </CommunityCard>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            {offset > 0 && <Button size="sm" variant="outline" onClick={() => setOffset(Math.max(0, offset - COMMUNITIES.PAGE_SIZE))}>← Previous</Button>}
            {data.nextOffset != null && <Button size="sm" variant="outline" onClick={() => setOffset(data.nextOffset)}>Next →</Button>}
          </div>
        </>
      )}
      {requesting && (
        <RequestModal
          community={requesting}
          onClose={() => setRequesting(null)}
          onDone={(m) => {
            setRequesting(null);
            onFlash(m);
          }}
        />
      )}
    </div>
  );
}

export default function CommunitiesHome() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const canOwn = user?.role === "academician" || user?.role === "institution";
  const [tab, setTab] = useState("mine");
  const [flash, setFlash] = useFlash(3500);
  const { data, error, loading } = useSessionQuery(api.communities.mine, {});

  const running = data?.running || [];
  const joined = data?.joined || [];
  const pendingRequests = running.reduce((n, c) => n + (c.pendingCount || 0), 0);

  return (
    <DashboardLayout activePage="communities" title="Communities">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          eyebrow="Communities"
          title={isStudent ? "Your communities" : "Communities you run"}
          subtitle={isStudent ? "Join your professors' and institution's communities to get their announcements, materials and community-only tests." : "Post announcements and materials, run community-only tests, and manage who's in."}
          actions={canOwn ? <Link href="/communities/new" className="inline-flex items-center rounded-xl font-medium px-4 py-2.5 text-sm bg-primary hover:bg-accent text-white shadow-sm">+ New community</Link> : null}
        />
        <Flash message={flash} tone={String(flash || "").startsWith("⚠️") ? "red" : "green"} />

        {isStudent && (
          <Tabs
            tabs={[
              { key: "mine", label: `My communities${joined.length ? ` (${joined.length})` : ""}` },
              { key: "discover", label: "Discover" },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}

        {isStudent && <JoinByCode />}

        {error && <p className="text-xs text-red-600">⚠️ {error}</p>}

        {tab === "discover" && isStudent ? (
          <Discover onFlash={setFlash} />
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : (
          <div className="space-y-6">
            <Invitations invitations={data?.invitations} onFlash={setFlash} />

            {running.length > 0 && (
              <Section title={`Communities you run (${running.length})`} description={pendingRequests ? `${pendingRequests} join request${pendingRequests === 1 ? "" : "s"} waiting` : undefined}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {running.map((c) => (
                    <CommunityCard key={c.id} community={c} badge={<Badge tone={c.role === "owner" ? "primary" : "blue"}>{c.role === "owner" ? "Owner" : "Moderator"}</Badge>}>
                      {c.pendingCount > 0 && (
                        <Link href={`/communities/${c.id}?tab=requests`} className="text-xs font-medium text-amber-700 hover:underline">
                          {c.pendingCount} request{c.pendingCount === 1 ? "" : "s"} waiting →
                        </Link>
                      )}
                    </CommunityCard>
                  ))}
                </div>
              </Section>
            )}

            {joined.length > 0 && (
              <Section title={`Communities you're in (${joined.length})`}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {joined.map((c) => (
                    <CommunityCard key={c.id} community={c} badge={c.unread > 0 ? <Badge tone="primary">{c.unread >= 100 ? "99+" : c.unread} new</Badge> : null}>
                      {c.notificationsMuted && <span className="text-[11px] text-muted-foreground">🔕 Notifications muted</span>}
                    </CommunityCard>
                  ))}
                </div>
              </Section>
            )}

            {data?.pending?.length > 0 && (
              <Section title="Pending requests" description="Waiting for the owner or a moderator to approve.">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.pending.map((c) => (
                    <CommunityCard key={c.id} community={c}>
                      <StudentAction community={c} onFlash={setFlash} onRequest={() => {}} />
                    </CommunityCard>
                  ))}
                </div>
              </Section>
            )}

            {!running.length && !joined.length && !data?.pending?.length && !data?.invitations?.length && (
              <EmptyState
                icon="👥"
                title={isStudent ? "You haven't joined a community yet" : "You don't run a community yet"}
                action={
                  isStudent ? (
                    <Button onClick={() => setTab("discover")}>Discover communities</Button>
                  ) : canOwn ? (
                    <Link href="/communities/new" className="inline-flex items-center rounded-xl font-medium px-4 py-2.5 text-sm bg-primary hover:bg-accent text-white">
                      Create your first community
                    </Link>
                  ) : null
                }
              >
                {isStudent ? "Open communities you can join straight away; closed ones take a request; invite-only ones need a code." : "A community is where you post announcements, notes and community-only tests for your students."}
              </EmptyState>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
