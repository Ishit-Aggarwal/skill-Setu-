"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listStudentNotifications, update } from "../lib/store";
import { subscribeToMutations } from "../lib/sync";
import { relativeTime } from "../lib/match";

/**
 * The header bell used to navigate to the dashboard, which did nothing at all
 * when you were already on it — the notifications were only reachable by
 * scrolling to the inbox card. It now owns a real popover so the bell is
 * useful from every page.
 */
export default function NotificationBell({ user, onOpenInbox }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    const unsub = subscribeToMutations(["studentNotifications"], () => setVersion((v) => v + 1));
    return unsub;
  }, []);

  // Escape and outside-click both close, matching the Kit Modal's behaviour.
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const notifications = useMemo(
    () => (ready && user ? listStudentNotifications(user.id) : []),
    [ready, user, version]
  );

  const unread = notifications.filter((n) => !n.read).length;

  function markRead(n) {
    if (n.read) return;
    update("studentNotifications", n.id, { read: true, readAt: new Date().toISOString() });
    setVersion((v) => v + 1);
  }

  function markAllRead() {
    const now = new Date().toISOString();
    notifications.filter((n) => !n.read).forEach((n) => update("studentNotifications", n.id, { read: true, readAt: now }));
    setVersion((v) => v + 1);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2 rounded-xl transition-colors ${
          open ? "bg-primary/10 text-primary" : "text-muted-foreground bg-secondary/60 hover:bg-secondary hover:text-foreground"
        }`}
        title={unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "Notifications"}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center border-2 border-card">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(21rem,calc(100vw-2rem))] bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-slide">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
            <div>
              <div className="text-sm font-semibold text-foreground">Notifications</div>
              <div className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "You're all caught up"}
              </div>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline flex-shrink-0">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">
                Notices from your placement cell, mentors and recruiters will appear here.
              </p>
            ) : (
              notifications.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left flex items-start gap-2.5 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                    n.read ? "hover:bg-secondary/60" : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${n.read ? "text-muted-foreground" : "text-foreground"}`}>{n.message}</p>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {n.from} · {relativeTime(n.sentAt)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <button
              onClick={() => {
                setOpen(false);
                onOpenInbox?.();
              }}
              className="w-full px-4 py-3 text-xs font-medium text-primary hover:bg-secondary/60 border-t border-border transition-colors"
            >
              Open full inbox →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
