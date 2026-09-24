"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../lib/convexBrowser";
import { useSessionQuery } from "../../lib/useSessionQuery";
import { COMMUNITIES } from "../../lib/settings";
import { DEPARTMENTS } from "../../lib/domains";
import { ayushSystemLabel } from "../../lib/ayush";
import { iconForFile, kindFamily, detectKind } from "../../lib/fileKinds";
import { formatBytes } from "../../lib/files";
import StudentProfileModal from "../StudentProfileModal";
import CommunityForm from "./CommunityForm";
import { Badge, Button, Card, DataTable, EmptyState, Field, FilterPills, Modal, SearchInput, Section, Select, Skeleton, StatGrid, TextArea, TextInput } from "../ui/Kit";
import { Linkified, formatDay, formatWhen } from "./shared";
import { openAttachment } from "./FeedTab";

/* ---------------- Materials ---------------- */

export function MaterialsTab({ community, onFlash }) {
  const { data, loading, error } = useSessionQuery(api.communities.materials, { communityId: community.id });
  const [family, setFamily] = useState("All");
  const [search, setSearch] = useState("");
  const rows = useMemo(
    () =>
      (data || [])
        .map((m) => ({ ...m, family: kindFamily(detectKind(m.fileName, m.mimeType)) }))
        .filter((m) => (family === "All" || m.family === family) && (!search || `${m.fileName} ${m.postTitle}`.toLowerCase().includes(search.toLowerCase()))),
    [data, family, search]
  );
  if (loading) return <Skeleton className="h-40" />;
  if (error) return <p className="text-xs text-red-600">⚠️ {error}</p>;
  const columns = [
    { key: "name", header: "File", render: (m) => <span className="text-xs text-foreground">{iconForFile(m.fileName, m.mimeType)} {m.fileName}</span> },
    { key: "type", header: "Type", hideBelow: "hidden sm:table-cell", render: (m) => <Badge tone="neutral">{m.family}</Badge> },
    { key: "post", header: "Post", hideBelow: "hidden md:table-cell", render: (m) => <span className="text-xs text-muted-foreground">{m.postTitle}</span> },
    { key: "date", header: "Uploaded", hideBelow: "hidden md:table-cell", render: (m) => <span className="text-xs text-muted-foreground">{formatDay(m.uploadedAt)}</span> },
    { key: "size", header: "Size", hideBelow: "hidden sm:table-cell", render: (m) => <span className="text-xs text-muted-foreground">{formatBytes(m.bytes)}</span> },
    ...(community.isStaff ? [{ key: "dl", header: "Downloads", align: "right", render: (m) => <span className="text-xs font-medium" title="Unique students">{m.downloads}</span> }] : []),
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) => (
        <span className="flex gap-2 justify-end">
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => openAttachment(m.postId, m.fileId).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
            Open
          </button>
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => openAttachment(m.postId, m.fileId, { download: true }).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
            Download
          </button>
        </span>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      <SearchInput value={search} onChange={setSearch} placeholder="Search files…" />
      <FilterPills options={["All", "PDF", "Word", "Slides", "Sheet", "Image", "Other"]} value={family} onChange={setFamily} />
      <DataTable columns={columns} rows={rows} rowKey={(m) => `${m.postId}-${m.fileId}`} empty="No files shared yet." pageSize={25} />
    </div>
  );
}

/* ---------------- Members ---------------- */

const MEMBER_FILTERS = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "invited", label: "Invited" },
  { value: "banned", label: "Banned" },
  { value: "removed", label: "Removed" },
];

function BanModal({ member, onClose, onBan }) {
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Ban ${member.name}`} description="They're removed and can never rejoin, request, use a code or accept an invitation. The reason is recorded for moderators and is not shown to the student." onClose={onClose} size="sm">
      <div className="space-y-3">
        <TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated spam comments" aria-label="Reason for the ban" />
        <Button variant="danger" className="w-full" disabled={reason.trim().length < 3} onClick={() => onBan(reason)}>
          Ban
        </Button>
      </div>
    </Modal>
  );
}

export function MembersTab({ community, onFlash }) {
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("joined");
  const [selected, setSelected] = useState(new Set());
  const [profile, setProfile] = useState(null);
  const [banning, setBanning] = useState(null);
  const [messaging, setMessaging] = useState(false);
  const [message, setMessage] = useState("");
  const { data, loading, error } = useSessionQuery(api.communities.members, { communityId: community.id, status });

  const rows = useMemo(() => {
    const list = (data || []).filter((m) => !search || `${m.name} ${m.institution} ${m.rollNo} ${m.email || ""}`.toLowerCase().includes(search.toLowerCase()));
    const by = {
      joined: (a, b) => (b.joinedAt || b.statusChangedAt || 0) - (a.joinedAt || a.statusChangedAt || 0),
      name: (a, b) => a.name.localeCompare(b.name),
      seen: (a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0),
      tests: (a, b) => b.testsTaken - a.testsTaken,
    }[sort];
    return list.sort(by);
  }, [data, search, sort]);

  async function run(ref, args, done) {
    try {
      const out = await backendMutation(ref, { communityId: community.id, ...args });
      onFlash(typeof done === "function" ? done(out) : done);
      setSelected(new Set());
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const columns = [
    ...(status === "active"
      ? [{ key: "sel", header: "", render: (m) => (m.role === "member" ? <input type="checkbox" aria-label={`Select ${m.name}`} checked={selected.has(m.userId)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(m.userId)} /> : null) }]
      : []),
    {
      key: "name",
      header: "Name",
      render: (m) => (
        <div className="min-w-0">
          <div className="text-xs font-medium text-foreground">
            {m.name} {m.role !== "member" && <Badge tone={m.role === "owner" ? "primary" : "blue"}>{m.role}</Badge>}
          </div>
          <div className="text-[11px] text-muted-foreground">{[m.course, m.year, m.rollNo].filter(Boolean).join(" · ")}</div>
          {m.requestNote && <div className="text-[11px] text-muted-foreground italic">“{m.requestNote}”</div>}
          {m.banReason && <div className="text-[11px] text-red-600">Ban reason: {m.banReason}</div>}
        </div>
      ),
    },
    { key: "inst", header: "Institution", hideBelow: "hidden md:table-cell", render: (m) => <span className="text-xs text-muted-foreground">{m.institution || "—"}</span> },
    { key: "joined", header: status === "active" ? "Joined" : "Changed", hideBelow: "hidden sm:table-cell", render: (m) => <span className="text-xs text-muted-foreground">{formatDay(m.joinedAt || m.statusChangedAt)}</span> },
    { key: "seen", header: "Last seen", hideBelow: "hidden lg:table-cell", render: (m) => <span className="text-xs text-muted-foreground">{m.lastSeenAt ? formatWhen(m.lastSeenAt) : "—"}</span> },
    { key: "tests", header: "Tests", align: "center", hideBelow: "hidden sm:table-cell", render: (m) => <span className="text-xs">{m.testsTaken}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) =>
        m.role === "owner" ? null : (
          <span className="flex gap-2 justify-end flex-wrap" onClick={(e) => e.stopPropagation()}>
            {status === "active" && m.role === "member" && (
              <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => window.confirm(`Remove ${m.name}? They can rejoin an Open community or ask again.`) && run(api.communities.removeMember, { userIds: [m.userId] }, `${m.name} removed.`)}>
                Remove
              </button>
            )}
            {status !== "banned" && m.role === "member" && (
              <button type="button" className="text-[11px] text-red-600 hover:underline" onClick={() => setBanning(m)}>
                Ban
              </button>
            )}
            {status === "banned" && (
              <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => run(api.communities.unban, { userId: m.userId }, `${m.name} unbanned.`)}>
                Unban
              </button>
            )}
            {community.isOwner && m.role === "moderator" && (
              <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => run(api.communities.setModerator, { userId: m.userId, moderator: false }, `${m.name} is no longer a moderator.`)}>
                Remove moderator
              </button>
            )}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, roll number or institution…" className="flex-1" />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort members" className="sm:w-48">
          <option value="joined">Newest first</option>
          <option value="name">Name</option>
          <option value="seen">Last seen</option>
          <option value="tests">Tests taken</option>
        </Select>
      </div>
      <FilterPills options={MEMBER_FILTERS} value={status} onChange={(s) => { setStatus(s); setSelected(new Set()); }} />
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/5 border border-primary/30 px-3 py-2 text-xs">
          {selected.size} selected
          <Button size="sm" variant="outline" onClick={() => setMessaging(true)}>
            Message
          </Button>
          <Button size="sm" variant="danger" onClick={() => window.confirm(`Remove ${selected.size} member(s)?`) && run(api.communities.removeMember, { userIds: [...selected] }, (o) => `${o.removed} removed.`)}>
            Remove
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      {loading ? (
        <Skeleton className="h-40" />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(m) => m.userId} empty={`No ${MEMBER_FILTERS.find((f) => f.value === status)?.label.toLowerCase()} members.`} pageSize={50} onRowClick={(m) => m.role === "member" && setProfile(m)} />
      )}
      {profile && <StudentProfileModal studentId={profile.userId} student={{ id: profile.userId, name: profile.name, institution: profile.institution, course: profile.course, year: profile.year, rollNo: profile.rollNo }} onClose={() => setProfile(null)} />}
      {banning && (
        <BanModal
          member={banning}
          onClose={() => setBanning(null)}
          onBan={(reason) => {
            const m = banning;
            setBanning(null);
            run(api.communities.ban, { userId: m.userId, reason }, `${m.name} banned.`);
          }}
        />
      )}
      {messaging && (
        <Modal title={`Message ${selected.size} member${selected.size === 1 ? "" : "s"}`} description="Sent as a notification." onClose={() => setMessaging(false)} size="sm">
          <div className="space-y-3">
            <TextArea rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" placeholder="e.g. Please collect your practical records by Friday." />
            <Button
              className="w-full"
              disabled={!message.trim()}
              onClick={() => {
                setMessaging(false);
                run(api.communities.messageMembers, { userIds: [...selected], message }, (o) => `Sent to ${o.sent}.`);
                setMessage("");
              }}
            >
              Send
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Requests ---------------- */

export function RequestsTab({ community, onFlash }) {
  const { data, loading } = useSessionQuery(api.communities.members, { communityId: community.id, status: "pending" });
  const [busy, setBusy] = useState(false);
  async function run(ref, userIds, verb) {
    setBusy(true);
    try {
      await backendMutation(ref, { communityId: community.id, userIds });
      onFlash(`${userIds.length} request${userIds.length === 1 ? "" : "s"} ${verb}.`);
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Skeleton className="h-32" />;
  const list = data || [];
  if (!list.length) return <EmptyState icon="🙋" title="No requests waiting">Students who ask to join appear here.</EmptyState>;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => run(api.communities.approve, list.map((m) => m.userId), "approved")}>
          Approve all ({list.length})
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => window.confirm("Decline every request?") && run(api.communities.decline, list.map((m) => m.userId), "declined")}>
          Decline all
        </Button>
      </div>
      {list.map((m) => (
        <Card key={m.userId} className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">{m.name}</div>
            <div className="text-[11px] text-muted-foreground">{[m.institution, m.course, m.year, m.rollNo].filter(Boolean).join(" · ")}</div>
            {m.requestNote && <div className="text-xs text-foreground mt-1 italic">“{m.requestNote}”</div>}
            <div className="text-[10px] text-muted-foreground mt-0.5">Asked {formatWhen(m.statusChangedAt)}</div>
          </div>
          <Button size="sm" disabled={busy} onClick={() => run(api.communities.approve, [m.userId], "approved")}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(api.communities.decline, [m.userId], "declined")}>
            Decline
          </Button>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Invite ---------------- */

export function InviteTab({ community, onFlash }) {
  const [expires, setExpires] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [chosen, setChosen] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const { data: candidates, loading } = useSessionQuery(api.communities.inviteCandidates, { communityId: community.id, search: search || undefined, department: department || undefined, year: year || undefined });
  const link = typeof window !== "undefined" ? `${window.location.origin}/communities/join/${community.inviteCode}` : `/communities/join/${community.inviteCode}`;

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      onFlash(`${what} copied.`);
    } catch {
      onFlash(`⚠️ Copy failed — select and copy it instead.`);
    }
  }

  async function regenerate() {
    if (!window.confirm("Make a new code? The current code and link stop working at once.")) return;
    try {
      await backendMutation(api.communities.regenerateCode, { communityId: community.id, expiresInDays: expires ? Number(expires) : null, maxUses: maxUses ? Number(maxUses) : null });
      onFlash("New invite code ready. The old one no longer works.");
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  async function invite() {
    setBusy(true);
    try {
      const out = await backendMutation(api.communities.invite, { communityId: community.id, userIds: [...chosen] });
      onFlash(`${out.invited} invited${out.skipped ? ` · ${out.skipped} skipped (already in, banned or from another institution)` : ""}.`);
      setChosen(new Set());
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const expiry = community.inviteCodeExpiresAt ? `expires ${formatDay(community.inviteCodeExpiresAt)}` : "never expires";
  const uses = community.inviteCodeMaxUses ? `${community.inviteCodeUses} of ${community.inviteCodeMaxUses} uses` : `${community.inviteCodeUses} use${community.inviteCodeUses === 1 ? "" : "s"}`;

  return (
    <div className="space-y-5">
      <Section title="Invite code and link" description="Anyone with the code can join — even an Invite-only community — unless they're banned or from another institution when the community is limited to yours.">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-[0.3em] text-foreground select-all" aria-label="Invite code">
              {community.inviteCode}
            </div>
            <Button size="sm" variant="outline" onClick={() => copy(community.inviteCode, "Code")}>
              Copy code
            </Button>
            <Button size="sm" variant="outline" onClick={() => copy(link, "Link")}>
              Copy link
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground break-all">{link}</div>
          <div className="text-[11px] text-muted-foreground">
            This code {expiry} · {uses}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <Field label="New code expires in">
              <Select value={expires} onChange={(e) => setExpires(e.target.value)}>
                <option value="">Never</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </Select>
            </Field>
            <Field label="Max uses (optional)">
              <TextInput type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </Field>
            <Button variant="outline" onClick={regenerate}>
              Regenerate code
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Invite students directly" description="They get a notification with Accept and Decline. Only your institution's registered students (and your advisees) are listed.">
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, email or roll number…" />
          <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
          <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
            <option value="">All years</option>
            {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </div>
        {loading ? (
          <Skeleton className="h-24" />
        ) : !candidates?.length ? (
          <p className="text-xs text-muted-foreground">No students match.</p>
        ) : (
          <ul className="space-y-1.5 max-h-80 overflow-y-auto">
            {candidates.map((s) => {
              const blocked = s.status === "active" || s.status === "banned" || s.status === "invited";
              return (
                <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                  <input
                    type="checkbox"
                    disabled={blocked}
                    aria-label={`Invite ${s.name}`}
                    checked={chosen.has(s.id)}
                    onChange={() => setChosen((c) => {
                      const next = new Set(c);
                      if (next.has(s.id)) next.delete(s.id);
                      else next.add(s.id);
                      return next;
                    })}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground"> · {[s.rollNo, s.department, s.year].filter(Boolean).join(" · ")}</span>
                  </span>
                  {s.status && <Badge tone={s.status === "active" ? "green" : s.status === "banned" ? "red" : "neutral"}>{s.status}</Badge>}
                </li>
              );
            })}
          </ul>
        )}
        <Button className="mt-3" disabled={!chosen.size || busy} onClick={invite}>
          {busy ? "Inviting…" : `Invite ${chosen.size || ""} student${chosen.size === 1 ? "" : "s"}`}
        </Button>
      </Section>
    </div>
  );
}

/* ---------------- Settings ---------------- */

export function SettingsTab({ community, onFlash }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [modEmail, setModEmail] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [visibility, setVisibility] = useState(community.visibility);

  async function save(fields, setError) {
    setBusy(true);
    try {
      let approvePending;
      if (community.visibility === "closed" && fields.visibility === "open" && community.pendingCount > 0) {
        approvePending = window.confirm(`Approve all ${community.pendingCount} pending requests too?`);
      }
      await backendMutation(api.communities.updateSettings, { communityId: community.id, ...fields, approvePending });
      onFlash("Settings saved.");
    } catch (err) {
      setError(backendErrorMessage(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  async function run(ref, args, message, after) {
    try {
      await backendMutation(ref, { communityId: community.id, ...args });
      onFlash(message);
      after?.();
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CommunityForm
          initial={{ ...community, memberCap: community.memberCap ?? "", subject: community.subject || "", courseLevel: community.courseLevel || "", visibility }}
          submitLabel="Save settings"
          busy={busy}
          onSubmit={(fields, setError) => {
            setVisibility(fields.visibility);
            save(fields, setError);
          }}
        />
      </Card>

      <Section title="Moderators" description={`Up to ${COMMUNITIES.MAX_MODERATORS} professors who can post, pin, approve, remove and ban — but can't delete the community, change who can join or manage moderators.`}>
        <Card className="flex flex-col sm:flex-row gap-2">
          <TextInput value={modEmail} onChange={(e) => setModEmail(e.target.value)} placeholder="Professor's email" aria-label="Moderator email" />
          <Button disabled={!modEmail.trim()} onClick={() => run(api.communities.setModerator, { email: modEmail, moderator: true }, "Moderator added.", () => setModEmail(""))}>
            Add moderator
          </Button>
        </Card>
        <p className="text-[11px] text-muted-foreground mt-1.5">Current moderators are listed in Members with a "moderator" badge.</p>
      </Section>

      <Section title="Archive" description="Read-only for everyone: no new posts or notifications. Members keep access to files.">
        <Button variant="outline" onClick={() => run(api.communities.setArchived, { archived: !community.archived }, community.archived ? "Unarchived." : "Archived.")}>
          {community.archived ? "Unarchive community" : "Archive community"}
        </Button>
      </Section>

      <Section title="Transfer ownership" description="To another professor or institution account of the same institution. You stay on as a moderator if you're a professor.">
        <Card className="flex flex-col sm:flex-row gap-2">
          <TextInput value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} placeholder="New owner's email" aria-label="New owner's email" />
          <Button variant="outline" disabled={!transferEmail.trim()} onClick={() => window.confirm("Hand this community to that account? You can't undo this yourself.") && run(api.communities.transfer, { toEmail: transferEmail }, "Ownership transferred.", () => router.push("/communities"))}>
            Transfer
          </Button>
        </Card>
      </Section>

      <Section title="Delete community" description="Deletes every post, comment, file and membership. Community tests are kept (results and certificates must survive) and become visible to you only.">
        <Card className="space-y-2 border-red-200">
          <Field label={`Type "${community.name}" to confirm`}>
            <TextInput value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
          </Field>
          <Button variant="danger" disabled={confirmName.trim() !== community.name} onClick={() => run(api.communities.remove, { confirmName }, "Community deleted.", () => router.push("/communities"))}>
            Delete permanently
          </Button>
        </Card>
      </Section>
    </div>
  );
}

/* ---------------- Insights, reports, audit ---------------- */

export function InsightsTab({ community }) {
  const { data, loading, error } = useSessionQuery(api.communities.insights, { communityId: community.id });
  if (loading) return <Skeleton className="h-60" />;
  if (error) return <p className="text-xs text-red-600">⚠️ {error}</p>;
  if (!data) return null;
  const avg = data.tests.filter((t) => t.average != null);
  return (
    <div className="space-y-5">
      <StatGrid
        columns={3}
        stats={[
          { label: "Students", value: String(data.memberCount), icon: "👥", tone: "primary" },
          { label: "Posts this month", value: String(data.postsThisMonth), icon: "📣" },
          { label: "Community test average", value: avg.length ? `${Math.round(avg.reduce((s, t) => s + t.average, 0) / avg.length)}%` : "—", icon: "📝" },
        ]}
      />
      <Section title="Members over time">
        <Card>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.membersOverTime} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="members" name="Members" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Section>
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Seen by students" description="Announcements opened since they were posted.">
          <Card className="space-y-2">
            {!data.announcements.length && <p className="text-xs text-muted-foreground">No announcements yet.</p>}
            {data.announcements.map((a) => (
              <div key={a.id} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-foreground truncate">{a.title}</span>
                  <span className="text-muted-foreground flex-shrink-0">
                    Seen by {a.seenBy} of {a.of}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-primary" style={{ width: `${a.of ? Math.round((a.seenBy / a.of) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </Section>
        <Section title="Top downloaded materials">
          <Card className="space-y-1.5">
            {!data.topMaterials.length && <p className="text-xs text-muted-foreground">No files yet.</p>}
            {data.topMaterials.map((m, i) => (
              <div key={i} className="flex justify-between gap-2 text-xs">
                <span className="truncate">
                  {iconForFile(m.fileName)} {m.fileName}
                </span>
                <span className="text-muted-foreground flex-shrink-0">{m.downloads} students</span>
              </div>
            ))}
          </Card>
        </Section>
      </div>
      {data.tests.length > 0 && (
        <Section title="Community tests">
          <Card className="space-y-1.5">
            {data.tests.map((t) => (
              <div key={t.id} className="flex justify-between gap-2 text-xs">
                <span className="truncate">{t.title}</span>
                <span className="text-muted-foreground">
                  {t.attempts} attempt{t.attempts === 1 ? "" : "s"}
                  {t.average != null ? ` · average ${t.average}%` : ""}
                </span>
              </div>
            ))}
          </Card>
        </Section>
      )}
    </div>
  );
}

export function ReportsTab({ community, onFlash }) {
  const { data, loading } = useSessionQuery(api.communities.reports, { communityId: community.id });
  if (loading) return <Skeleton className="h-24" />;
  if (!data?.length) return <EmptyState icon="🚩" title="No open reports">Posts and comments members report appear here.</EmptyState>;
  return (
    <div className="space-y-2">
      {data.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 text-xs">
            <div className="text-foreground">🚩 {r.reason}</div>
            <div className="text-muted-foreground mt-1">
              {r.commentId ? `Comment: "${(r.commentBody || "").slice(0, 120)}"` : `Post: ${r.postTitle || "—"}`}
              {r.targetDeleted ? " (already deleted)" : ""} · {formatWhen(r.createdAt)}
            </div>
          </div>
          {!r.targetDeleted && r.commentId && (
            <Button size="sm" variant="danger" onClick={() => backendMutation(api.communities.deleteComment, { commentId: r.commentId }).then(() => onFlash("Comment deleted.")).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
              Delete comment
            </Button>
          )}
          {!r.targetDeleted && r.postId && !r.commentId && (
            <Button size="sm" variant="danger" onClick={() => backendMutation(api.communities.deletePost, { postId: r.postId }).then(() => onFlash("Post deleted.")).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
              Delete post
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => backendMutation(api.communities.resolveReport, { communityId: community.id, reportId: r.id }).then(() => onFlash("Marked resolved.")).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
            Resolve
          </Button>
        </Card>
      ))}
    </div>
  );
}

const AUDIT_LABEL = {
  remove: "removed",
  ban: "banned",
  unban: "unbanned",
  approve: "approved",
  decline: "declined",
  pin: "pinned",
  unpin: "unpinned",
  delete_post: "deleted post",
  delete_comment: "deleted a comment",
  visibility: "changed who can join",
  regenerate_code: "regenerated the invite code",
  add_moderator: "added moderator",
  remove_moderator: "removed moderator",
  transfer: "transferred ownership to",
  archive: "archived the community",
  unarchive: "unarchived the community",
};

export function AuditTab({ community }) {
  const { data, loading } = useSessionQuery(api.communities.auditLog, { communityId: community.id });
  if (loading) return <Skeleton className="h-32" />;
  if (!data?.length) return <EmptyState icon="🧾" title="No moderation yet">Every approval, removal, ban, pin and deletion is recorded here.</EmptyState>;
  return (
    <Card padded={false}>
      <ul className="divide-y divide-border">
        {data.map((r, i) => (
          <li key={i} className="px-4 py-2.5 text-xs">
            <span className="font-medium text-foreground">{r.actorName || "Someone"}</span> {AUDIT_LABEL[r.action] || r.action}{" "}
            {r.targetName && <span className="font-medium text-foreground">{r.targetName}</span>}
            {r.detail && <span className="text-muted-foreground"> — {r.detail}</span>}
            <span className="block text-[10px] text-muted-foreground">{formatWhen(r.at)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- About (members) ---------------- */

export function AboutTab({ community }) {
  return (
    <Card className="space-y-3 text-sm">
      {community.description && <Linkified text={community.description} className="text-foreground" />}
      <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Run by</dt>
        <dd>{community.ownerName}</dd>
        {community.institutionName && (
          <>
            <dt className="text-muted-foreground">Institution</dt>
            <dd>{community.institutionName}</dd>
          </>
        )}
        <dt className="text-muted-foreground">AYUSH system</dt>
        <dd>{ayushSystemLabel(community.ayushSystem)}</dd>
        {community.subject && (
          <>
            <dt className="text-muted-foreground">Subject</dt>
            <dd>{community.subject}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Members</dt>
        <dd>{community.memberCount}</dd>
      </dl>
      {community.rules && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Rules</div>
          <Linkified text={community.rules} className="text-xs text-foreground" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">For everyone's privacy, members can't see who else is in a community.</p>
    </Card>
  );
}
