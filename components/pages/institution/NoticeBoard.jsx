"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, EmptyState, Field, Flash, IconTile, Modal, PageHeader, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { relativeTime } from "../../../lib/match";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listNotifyBatches,
  logActivity,
  notifyStudents,
  update,
  updateAnnouncement,
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
  const [editingNotice, setEditingNotice] = useState(null);

  useEffect(() => setReady(true), []);

  const notices = useMemo(() => (ready && instituteName ? listAnnouncements(instituteName) : []), [instituteName, ready, version]);
  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready, version]);
  const batches = useMemo(() => (ready && instituteName ? listNotifyBatches(instituteName) : []), [instituteName, ready, version]);

  const pinned = notices.filter((n) => n.pinned);
  const rest = notices.filter((n) => !n.pinned);

  function togglePin(n) {
    updateAnnouncement(n.id, { pinned: !n.pinned });
    setVersion((v) => v + 1);
    setFlash(n.pinned ? "Unpinned." : "Pinned to the top of the board.");
  }

  function removeNotice(n) {
    deleteAnnouncement(n.id);
    logActivity(instituteName, user?.name || "Faculty / Admin", "Deleted a notice", n.title);
    setVersion((v) => v + 1);
    setFlash("Notice removed.");
  }

  function NoticeCard({ n }) {
    return (
      <Card hover>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex items-start gap-3">
            <IconTile icon={n.pinned ? "📌" : "📣"} tone={n.pinned ? "amber" : "primary"} size={34} className="mt-0.5" />
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
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{n.body}</p>

        {n.attachment && (
          <div className="mt-3 flex items-center justify-between gap-3 bg-secondary/50 border border-border rounded-xl px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <IconTile icon="📄" tone="blue" size={30} />
              <div className="min-w-0">
                <span className="font-medium text-foreground truncate block">{n.attachment.name}</span>
                {n.attachment.size && <span className="text-[10px] text-muted-foreground block">{n.attachment.size}</span>}
              </div>
            </div>
            <a
              href={n.attachment.dataUrl || n.attachment.url || "#"}
              download={n.attachment.name}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-medium hover:bg-accent transition-colors flex-shrink-0"
            >
              Download PDF
            </a>
          </div>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <button onClick={() => setEditingNotice(n)} className="text-xs text-primary font-medium hover:underline">Edit</button>
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
            { label: "Notices posted", value: String(notices.length), icon: "📣", tone: "primary" },
            { label: "Pinned", value: String(pinned.length), icon: "📌", tone: "amber" },
            { label: "Students reachable", value: String(roster.length), icon: "🎓", tone: "blue" },
            { label: "Direct sends", value: String(batches.length), icon: "✉️", tone: "purple", hint: batches[0] ? relativeTime(batches[0].sentAt) : "None yet" },
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
            onSubmit={({ title, body, audience, pinned: isPinned, attachment }) => {
              const recipients = resolveAudience(audience, roster);
              createAnnouncement(instituteName, {
                title,
                body,
                audience,
                pinned: isPinned,
                attachment,
                author: user?.name || (user?.role === "academician" ? "Prof. " + user.name : "Placement Cell"),
                recipients: recipients.length,
              });
              notifyStudents(instituteName, recipients.map((r) => r.id), `${title} — ${body}`, user?.name || "Placement Cell");
              logActivity(instituteName, user?.name || "Faculty / Admin", "Posted a notice", title);
              setShowCompose(false);
              setVersion((v) => v + 1);
              setFlash(`Notice posted to ${recipients.length} student${recipients.length === 1 ? "" : "s"}.`);
            }}
          />
        </Modal>
      )}

      {editingNotice && (
        <Modal title="Edit notice" description="Update the notice title, message, audience, or attached document." onClose={() => setEditingNotice(null)}>
          <ComposeForm
            initialData={editingNotice}
            roster={roster}
            onCancel={() => setEditingNotice(null)}
            onSubmit={({ title, body, audience, pinned: isPinned, attachment }) => {
              updateAnnouncement(editingNotice.id, {
                title,
                body,
                audience,
                pinned: isPinned,
                attachment,
              });
              logActivity(instituteName, user?.name || "Faculty / Admin", "Updated notice", title);
              setEditingNotice(null);
              setVersion((v) => v + 1);
              setFlash("Notice updated successfully.");
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function ComposeForm({ initialData, roster, onCancel, onSubmit }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [audience, setAudience] = useState(initialData?.audience || AUDIENCES[0]);
  const [pinned, setPinned] = useState(Boolean(initialData?.pinned));
  const [attachment, setAttachment] = useState(initialData?.attachment || null);
  const reach = resolveAudience(audience, roster).length;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, body, audience, pinned, attachment });
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

      <Field label="Attach Document (PDF)" hint="Upload a circular, schedule, or syllabus document.">
        {attachment ? (
          <div className="flex items-center justify-between gap-3 bg-secondary/50 border border-border rounded-xl px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">📄</span>
              <span className="font-medium text-foreground truncate">{attachment.name}</span>
              {attachment.size && <span className="text-muted-foreground">({attachment.size})</span>}
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-red-600 hover:underline font-medium text-xs flex-shrink-0"
            >
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFile}
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-border file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-muted cursor-pointer"
          />
        )}
      </Field>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4 accent-primary" />
        Pin to the top of the board
      </label>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">{initialData ? "Save changes" : "Post notice"}</Button>
      </div>
    </form>
  );
}
