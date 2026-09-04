"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, Section } from "./ui/Kit";
import { relativeTime } from "../lib/match";
import { listStudentNotifications, update } from "../lib/store";

/**
 * Where notices from a student's placement cell and recommendations from their
 * faculty mentor actually land. Without this, both of those features would
 * write to a mailbox nobody could open.
 */
export default function StudentInbox({ user }) {
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const notifications = useMemo(
    () => (ready && user ? listStudentNotifications(user.id) : []),
    [user, ready, version]
  );

  const unread = notifications.filter((n) => !n.read).length;

  function markRead(n) {
    if (n.read) return;
    update("studentNotifications", n.id, { read: true });
    setVersion((v) => v + 1);
  }

  function markAllRead() {
    notifications.filter((n) => !n.read).forEach((n) => update("studentNotifications", n.id, { read: true }));
    setVersion((v) => v + 1);
  }

  return (
    <Card>
      <Section
        title="Inbox"
        description="Notices from your placement cell and recommendations from your mentors."
        actions={
          unread > 0 ? (
            <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline">Mark all read</button>
          ) : null
        }
      >
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nothing here yet.</p>
        ) : (
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
            {notifications.slice(0, 12).map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${n.read ? "hover:bg-secondary/60" : "bg-primary/5 hover:bg-primary/10"}`}
              >
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}>{n.message}</p>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{n.from} · {relativeTime(n.sentAt)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {unread > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <Badge tone="primary">{unread} unread</Badge>
          </div>
        )}
      </Section>
    </Card>
  );
}
