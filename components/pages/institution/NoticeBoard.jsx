"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { relativeTime } from "../../../lib/match";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listNotifyBatches,
  logActivity,
  notifyStudents,
  update,
} from "../../../lib/store";
import { buildRoster, useInstitutionName } from "./useInstitution";

const AUDIENCES = ["All students", "Final year", "Pre-final year", "Placed students", "Unplaced students"];

/** Which roster rows an audience label actually resolves to. */
function resolveAudience(audience, roster) {
  switch (audience) {
    case "Final year":
      return roster.filter((r) => /4th|final/i.test(r.year || ""));
    case "Pre-final year":
      return roster.filter((r) => /3rd/i.test(r.year || ""));
    case "Placed students":
      return roster.filter((r) => r.status === "Placed");
    case "Unplaced students":
      return roster.filter((r) => r.status !== "Placed");
    default:
      return roster;
  }
}

export default function NoticeBoard() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => setReady(true), []);

  const notices = useMemo(() => (ready && instituteName ? listAnnouncements(instituteName) : []), [instituteName, ready, version]);
  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready, version]);
  const batches = useMemo(() => (ready && instituteName ? listNotifyBatches(instituteName) : []), [instituteName, ready, version]);

  const pinned = notices.filter((n) => n.pinned);
  const rest = notices.filter((n) => !n.pinned);

  function togglePin(n) {
    update("announcements", n.id, { pinned: !n.pinned });
    setVersion((v) => v + 1);
    setFlash(n.pinned ? "Unpinned." : "Pinned to the top of the board.");
  }

  function removeNotice(n) {
    deleteAnnouncement(n.id);
    logActivity(instituteName, user?.name || "Admin", "Deleted a notice", n.title);
    setVersion((v) => v + 1);
    setFlash("Notice removed.");
  }

  function NoticeCard({ n }) {
    return (
      <Card>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{n.title}</span>
              {n.pinned && <Badge tone="amber">Pinned</Badge>}
              <Badge tone="primary">{n.audience}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {n.author || "Placement Cell"} · {relativeTime(n.postedAt)}
              {n.recipients != null && ` · reached ${n.recipients} student${n.recipients === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{n.body}</p>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
          <button onClick={() => togglePin(n)} className="text-xs text-muted-foreground hover:text-foreground">{n.pinned ? "Unpin" : "Pin to top"}</button>
          <button onClick={() => removeNotice(n)} className="text-xs text-muted-foreground hover:text-red-600">Delete</button>
        </div>
      </Card>
    );
  }

  return (
    <DashboardLayout activePage="institution-announcements" title="Notice Board">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Notice Board"
          subtitle="Post to your own students' portal inbox — drive dates, workshops, deadlines and reminders."
          actions={<Button size="sm" onClick={() => setShowCompose(true)}>Post a notice</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Notices posted", value: String(notices.length), icon: "📣" },
            { label: "Pinned", value: String(pinned.length), icon: "📌" },
            { label: "Students reachable", value: String(roster.length), icon: "🎓" },
            { label: "Direct sends", value: String(batches.length), icon: "✉️", hint: batches[0] ? relativeTime(batches[0].sentAt) : "None yet" },
          ]}
        />

        {notices.length === 0 ? (
          <EmptyState icon="📣" title="Nothing posted yet" action={<Button size="sm" onClick={() => setShowCompose(true)}>Post your first notice</Button>}>
            Notices appear on every targeted student's dashboard.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {pinned.map((n) => <NoticeCard key={n.id} n={n} />)}
            {pinned.length > 0 && rest.length > 0 && <div className="border-t border-border pt-1" />}
            {rest.map((n) => <NoticeCard key={n.id} n={n} />)}
          </div>
        )}

        {batches.length > 0 && (
          <Card>
            <Section title="Recent direct notifications" description="One-off messages sent to a filtered group from the Student Roster.">
              <div className="space-y-2">
                {batches.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex flex-wrap items-start justify-between gap-2 border border-border rounded-xl px-4 py-3">
                    <p className="text-xs text-muted-foreground flex-1 min-w-0 line-clamp-2">{b.message}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{b.recipients} recipients · {relativeTime(b.sentAt)}</span>
                  </div>
                ))}
              </div>
            </Section>
          </Card>
        )}
      </div>

      {showCompose && (
        <Modal title="Post a notice" description="Delivered to the selected group's dashboard inbox." onClose={() => setShowCompose(false)}>
          <ComposeForm
            roster={roster}
            onCancel={() => setShowCompose(false)}
            onSubmit={({ title, body, audience, pinned: isPinned }) => {
              const recipients = resolveAudience(audience, roster);
              createAnnouncement(instituteName, {
                title,
                body,
                audience,
                pinned: isPinned,
                author: user?.name || "Placement Cell",
                recipients: recipients.length,
              });
              notifyStudents(instituteName, recipients.map((r) => r.id), `${title} — ${body}`, user?.name || "Placement Cell");
              logActivity(instituteName, user?.name || "Admin", "Posted a notice", title);
              setShowCompose(false);
              setVersion((v) => v + 1);
              setFlash(`Notice posted to ${recipients.length} student${recipients.length === 1 ? "" : "s"}.`);
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function ComposeForm({ roster, onCancel, onSubmit }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [pinned, setPinned] = useState(false);
  const reach = resolveAudience(audience, roster).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, body, audience, pinned });
      }}
      className="space-y-4"
    >
      <Field label="Title"><TextInput required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Winter placement drive registration open" /></Field>
      <Field label="Message"><TextArea required rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What students need to do, and by when." /></Field>
      <Field label="Audience" hint={`${reach} student${reach === 1 ? "" : "s"} will receive this.`}>
        <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
          {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4 accent-primary" />
        Pin to the top of the board
      </label>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Post notice</Button>
      </div>
    </form>
  );
}
