"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../lib/convexBrowser";
import { useSessionPages, useSessionQuery } from "../../lib/useSessionQuery";
import { COMMUNITIES } from "../../lib/settings";
import { iconForFile } from "../../lib/fileKinds";
import { formatBytes } from "../../lib/files";
import FileDrop from "../ui/FileDrop";
import { Badge, Button, Card, EmptyState, Field, Modal, Select, Skeleton, TextArea, TextInput } from "../ui/Kit";
import { Linkified, formatWhen } from "./shared";

const TYPE_LABEL = { announcement: "📣 Announcement", material: "📚 Material", link: "🔗 Link", test: "📝 Test" };

/** Opens or downloads a file through the server's member check (the download is logged). */
export async function openAttachment(postId, fileId, { download = false } = {}) {
  const out = await backendMutation(api.communities.attachmentUrl, { postId, fileId, download });
  if (!out?.url) throw new Error("That file is not available.");
  if (download) {
    const res = await fetch(out.url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = out.fileName || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30000);
  } else {
    window.open(out.url, "_blank", "noopener,noreferrer");
  }
}

function Composer({ communityId, onPosted, pinnedCount }) {
  const [type, setType] = useState("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([{ url: "", title: "" }]);
  const [pin, setPin] = useState(false);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the post a title.");
    setBusy(true);
    try {
      await backendMutation(api.communities.createPost, {
        communityId,
        type,
        title: title.trim(),
        body,
        attachments: files,
        links: links.filter((l) => l.url.trim()),
        pinned: pin,
        notify,
      });
      setTitle("");
      setBody("");
      setFiles([]);
      setLinks([{ url: "", title: "" }]);
      setPin(false);
      setResetKey((k) => k + 1);
      onPosted(notify ? "Posted. Members are being notified." : "Posted.");
    } catch (err) {
      setError(backendErrorMessage(err, "Could not post. Your text is still here — try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-[180px_1fr] gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="announcement">Announcement</option>
              <option value="material">Material</option>
              <option value="link">Link</option>
            </Select>
          </Field>
          <Field label="Title" hint={`${title.length}/${COMMUNITIES.MAX_TITLE_CHARS}`}>
            <TextInput value={title} maxLength={COMMUNITIES.MAX_TITLE_CHARS} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 3 test on Rasa Panchaka next week" />
          </Field>
        </div>
        <Field label="Message" hint={`${body.length}/${COMMUNITIES.MAX_POST_CHARS} · links become clickable`}>
          <TextArea rows={3} maxLength={COMMUNITIES.MAX_POST_CHARS} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write to your members…" />
        </Field>
        {(type === "material" || files.length > 0) && (
          <FileDrop key={resetKey} purpose="material" maxFiles={COMMUNITIES.MAX_ATTACHMENTS_PER_POST} onChange={setFiles} onBusyChange={setUploading} label="Drop notes, slides, papers or images" />
        )}
        {type !== "material" && files.length === 0 && (
          <button type="button" onClick={() => setType("material")} className="text-xs text-primary hover:underline">
            📎 Attach files
          </button>
        )}
        {type === "link" && (
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="grid sm:grid-cols-2 gap-2">
                <TextInput value={l.url} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://…" aria-label={`Link ${i + 1} address`} />
                <TextInput value={l.title} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Title (optional)" aria-label={`Link ${i + 1} title`} />
              </div>
            ))}
            {links.length < COMMUNITIES.MAX_LINKS_PER_POST && (
              <button type="button" onClick={() => setLinks((ls) => [...ls, { url: "", title: "" }])} className="text-xs text-primary hover:underline">
                + Another link
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={pin} disabled={pinnedCount >= COMMUNITIES.MAX_PINNED} onChange={(e) => setPin(e.target.checked)} />
            Pin this post {pinnedCount >= COMMUNITIES.MAX_PINNED ? `(${COMMUNITIES.MAX_PINNED} already pinned)` : ""}
          </label>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify members
          </label>
          <Button type="submit" className="ml-auto" disabled={busy || uploading}>
            {busy ? "Posting…" : "Post"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
      </form>
    </Card>
  );
}

function Comments({ post, canComment, communityId, onFlash }) {
  const { data } = useSessionQuery(api.communities.comments, { postId: post.id });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await backendMutation(api.communities.comment, { postId: post.id, body: text });
      setText("");
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err, "Could not comment.")}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {(data || []).map((c) => (
        <div key={c.id} className="text-xs">
          <span className="font-medium text-foreground">{c.authorName}</span> <span className="text-muted-foreground">· {formatWhen(c.createdAt)}</span>
          <Linkified text={c.body} className="text-foreground mt-0.5" />
          <div className="flex gap-3 mt-0.5">
            {c.canDelete && (
              <button type="button" className="text-[11px] text-muted-foreground hover:text-red-600" onClick={() => backendMutation(api.communities.deleteComment, { commentId: c.id }).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
                Delete
              </button>
            )}
            <ReportButton communityId={communityId} commentId={c.id} onFlash={onFlash} small />
          </div>
        </div>
      ))}
      {canComment && (
        <form onSubmit={send} className="flex gap-2">
          <input value={text} maxLength={COMMUNITIES.MAX_COMMENT_CHARS} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" aria-label="Comment" className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <Button type="submit" size="sm" disabled={busy || !text.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}

export function ReportButton({ communityId, postId, commentId, onFlash, small = false }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await backendMutation(api.communities.report, { communityId, postId, commentId, reason });
      setOpen(false);
      setReason("");
      onFlash("Reported. The owner and moderators have been told.");
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err, "Could not report.")}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${small ? "text-[11px]" : "text-xs"} text-muted-foreground hover:text-red-600`}>
        🚩 Report
      </button>
      {open && (
        <Modal title="Report" description="Only the owner and moderators see reports." onClose={() => setOpen(false)} size="sm">
          <div className="space-y-3">
            <TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong with it?" aria-label="Reason" />
            <Button className="w-full" onClick={send} disabled={busy || !reason.trim()}>
              {busy ? "Sending…" : "Send report"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function EditPost({ post, onClose, onSaved }) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body || "");
  const [keep, setKeep] = useState(post.attachments || []);
  const [added, setAdded] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await backendMutation(api.communities.updatePost, { postId: post.id, title, body, attachments: [...keep.map((a) => ({ storageId: a.fileId, fileName: a.fileName })), ...added] });
      onSaved();
    } catch (err) {
      setError(backendErrorMessage(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Edit post" onClose={onClose} size="lg">
      <div className="space-y-3">
        <Field label="Title">
          <TextInput value={title} maxLength={COMMUNITIES.MAX_TITLE_CHARS} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Message">
          <TextArea rows={4} maxLength={COMMUNITIES.MAX_POST_CHARS} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        {keep.length > 0 && (
          <ul className="space-y-1">
            {keep.map((a) => (
              <li key={a.fileId} className="flex items-center gap-2 text-xs">
                <span>{iconForFile(a.fileName, a.mimeType)}</span>
                <span className="flex-1 truncate">{a.fileName}</span>
                <button type="button" onClick={() => setKeep((k) => k.filter((x) => x.fileId !== a.fileId))} className="text-red-600 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <FileDrop purpose="material" maxFiles={Math.max(0, COMMUNITIES.MAX_ATTACHMENTS_PER_POST - keep.length)} onChange={setAdded} label="Add files" />
        {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Modal>
  );
}

export function PostCard({ post, community, onFlash, pinnedCount = 0 }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const staff = community.isStaff;
  const canComment = !community.archived && (staff || community.allowComments);

  async function run(ref, args, message) {
    setMenu(false);
    try {
      await backendMutation(ref, args);
      if (message) onFlash(message);
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }

  return (
    <Card className={post.pinned ? "border-primary/40" : ""} id={`post-${post.id}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
            {post.pinned && <Badge tone="primary">📌 Pinned</Badge>}
            <span>{TYPE_LABEL[post.type] || post.type}</span>
            <span>
              · {post.authorName} · {formatWhen(post.createdAt)}
              {post.editedAt ? " · edited" : ""}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mt-1">{post.title}</h3>
        </div>
        {staff && (
          <div className="relative">
            <button type="button" aria-label="Post actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="px-2 py-1 rounded-lg text-muted-foreground hover:bg-secondary">
              ⋯
            </button>
            {menu && (
              <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 py-1 text-xs">
                <button type="button" className="w-full text-left px-3 py-2 hover:bg-secondary" onClick={() => { setMenu(false); setEditing(true); }}>Edit</button>
                {post.pinned ? (
                  <button type="button" className="w-full text-left px-3 py-2 hover:bg-secondary" onClick={() => run(api.communities.setPinned, { postId: post.id, pinned: false }, "Unpinned.")}>Unpin</button>
                ) : (
                  <>
                    <button type="button" disabled={pinnedCount >= COMMUNITIES.MAX_PINNED} className="w-full text-left px-3 py-2 hover:bg-secondary disabled:opacity-50" onClick={() => run(api.communities.setPinned, { postId: post.id, pinned: true }, "Pinned.")}>Pin</button>
                    <button type="button" disabled={pinnedCount >= COMMUNITIES.MAX_PINNED} className="w-full text-left px-3 py-2 hover:bg-secondary disabled:opacity-50" onClick={() => run(api.communities.setPinned, { postId: post.id, pinned: true, notifyAgain: true }, "Pinned and members notified again.")}>Pin &amp; notify again</button>
                  </>
                )}
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-secondary text-red-600"
                  onClick={() => {
                    if (window.confirm("Delete this post? Its files are removed after a week.")) run(api.communities.deletePost, { postId: post.id }, "Post deleted.");
                    else setMenu(false);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {post.body && <Linkified text={post.body} className="text-sm text-foreground mt-2 leading-relaxed" />}
      {post.test && (
        <div className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs flex items-center gap-2 flex-wrap">
          <span>📝 {post.test.title}</span>
          {post.test.cancelledAt ? <Badge tone="muted">Cancelled</Badge> : null}
          <Link href={`/communities/${community.id}?tab=tests`} className="ml-auto text-primary font-medium hover:underline">
            Open in Tests →
          </Link>
        </div>
      )}
      {post.attachments?.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {post.attachments.map((a) => (
            <li key={a.fileId} className="flex items-center gap-2 text-xs rounded-lg border border-border px-2.5 py-2">
              <span aria-hidden="true">{iconForFile(a.fileName, a.mimeType)}</span>
              <span className="flex-1 truncate text-foreground">{a.fileName}</span>
              <span className="text-muted-foreground hidden sm:inline">{formatBytes(a.bytes)}</span>
              <button type="button" className="text-primary hover:underline" onClick={() => openAttachment(post.id, a.fileId).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
                Open
              </button>
              <button type="button" className="text-primary hover:underline" onClick={() => openAttachment(post.id, a.fileId, { download: true }).catch((err) => onFlash(`⚠️ ${backendErrorMessage(err)}`))}>
                Download
              </button>
            </li>
          ))}
        </ul>
      )}
      {post.links?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {post.links.map((l, i) => (
            <li key={i} className="text-xs">
              🔗{" "}
              <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline break-all">
                {l.title || l.url}
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-4 mt-3">
        {(canComment || post.commentCount > 0) && (
          <button type="button" onClick={() => setShowComments((s) => !s)} className="text-xs text-muted-foreground hover:text-foreground">
            💬 {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
          </button>
        )}
        {!staff && <ReportButton communityId={community.id} postId={post.id} onFlash={onFlash} />}
      </div>
      {showComments && <Comments post={post} canComment={canComment} communityId={community.id} onFlash={onFlash} />}
      {editing && (
        <EditPost
          post={post}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onFlash("Post updated.");
          }}
        />
      )}
    </Card>
  );
}

function PinOrder({ pinned, communityId, onFlash }) {
  if (pinned.length < 2) return null;
  async function move(i, delta) {
    const ids = pinned.map((p) => p.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await backendMutation(api.communities.reorderPins, { communityId, postIds: ids });
    } catch (err) {
      onFlash(`⚠️ ${backendErrorMessage(err)}`);
    }
  }
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground items-center">
      Pin order:
      {pinned.map((p, i) => (
        <span key={p.id} className="inline-flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
          {i + 1}. {p.title.slice(0, 24)}
          <button type="button" aria-label={`Move ${p.title} up`} disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-30">↑</button>
          <button type="button" aria-label={`Move ${p.title} down`} disabled={i === pinned.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-30">↓</button>
        </span>
      ))}
    </div>
  );
}

export default function FeedTab({ community, onFlash }) {
  const { data: pinned } = useSessionQuery(api.communities.pinned, { communityId: community.id });
  const pages = useSessionPages(api.communities.feed, { communityId: community.id }, { pageSize: COMMUNITIES.PAGE_SIZE });
  const pinnedList = pinned || [];

  return (
    <div className="space-y-4">
      {community.isStaff && !community.archived && <Composer communityId={community.id} onPosted={onFlash} pinnedCount={pinnedList.length} />}
      {community.archived && <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-xs text-muted-foreground">🗄️ This community is archived: read-only, no new posts or notifications. Files can still be downloaded.</div>}
      {community.isStaff && <PinOrder pinned={pinnedList} communityId={community.id} onFlash={onFlash} />}
      {pinnedList.map((p) => (
        <PostCard key={p.id} post={p} community={community} onFlash={onFlash} pinnedCount={pinnedList.length} />
      ))}
      {pages.error && <p className="text-xs text-red-600">⚠️ {pages.error}</p>}
      {pages.items.map((p) => (
        <PostCard key={p.id} post={p} community={community} onFlash={onFlash} pinnedCount={pinnedList.length} />
      ))}
      {pages.loading && <Skeleton className="h-32" />}
      {!pages.loading && !pages.items.length && !pinnedList.length && (
        <EmptyState icon="📣" title="Nothing posted yet">
          {community.isStaff ? "Post your first announcement or share notes above." : "Announcements, notes and tests from the owner appear here."}
        </EmptyState>
      )}
      {pages.canLoadMore && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={pages.loadMore}>
            Load older posts
          </Button>
        </div>
      )}
    </div>
  );
}
