"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCredential, markNotificationsRead } from "../lib/store";
import { relativeTime } from "../lib/match";
import { notificationGroup, notificationIcon, notificationLink } from "../lib/notificationKinds";
import { downloadCertificatePdf } from "./certificates/CertificateCard";
import { Badge } from "./ui/Kit";

/**
 * One inbox row, shared by the header bell and the full inbox.
 *
 * Clicking it marks it read and opens whatever it is about (its `link`, or
 * the certificate / community it points at). A "certificate issued" row also
 * carries its two actions inline, so the student can download the PDF or go
 * and add it to their portfolio without hunting for it.
 */
export default function NotificationItem({ n, compact = false, onChanged, onNavigate }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const link = notificationLink(n);
  const isCertificate = (n.kind === "certificate_issued" || n.kind === "certificate_updated") && n.credentialId;

  function markRead() {
    if (n.read) return;
    markNotificationsRead(n.id);
    onChanged?.();
  }

  function open() {
    markRead();
    if (link) {
      onNavigate?.();
      router.push(link);
    }
  }

  async function download(e) {
    e.stopPropagation();
    markRead();
    setError(null);
    setBusy(true);
    try {
      const credential = getCredential(n.credentialId) || { id: n.credentialId };
      await downloadCertificatePdf(credential);
    } catch (err) {
      setError(err?.message || "Could not download the certificate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={`w-full text-left flex items-start gap-2.5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
        compact ? "px-4 py-3 border-b border-border last:border-0" : "px-4 py-3 rounded-2xl border bg-card"
      } ${n.read ? (compact ? "hover:bg-secondary/60" : "border-border hover:bg-secondary/30") : compact ? "bg-primary/5 hover:bg-primary/10" : "border-primary/40 bg-primary/[0.04]"}`}
    >
      <span className="text-base leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
        {notificationIcon(n)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`${compact ? "text-xs leading-snug" : "text-sm leading-relaxed"} ${n.read ? "text-muted-foreground" : `text-foreground ${compact ? "" : "font-medium"}`}`}>
          {!n.read && <span className="sr-only">Unread: </span>}
          {n.message}
        </p>
        <div className={`${compact ? "text-[10px]" : "text-[11px]"} text-muted-foreground mt-1`}>
          {n.from} · {relativeTime(n.sentAt)}
          {link && <span className="text-primary"> · Open →</span>}
        </div>
        {isCertificate && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button type="button" onClick={download} disabled={busy} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-accent disabled:opacity-60">
              {busy ? "Preparing…" : "⬇ Download PDF"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                markRead();
                onNavigate?.();
                router.push(`/certificate/${encodeURIComponent(n.credentialId)}`);
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-secondary"
            >
              View / Add to portfolio
            </button>
          </div>
        )}
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </div>
      {!compact && (
        <Badge tone="neutral" className="flex-shrink-0">
          {notificationGroup(n)}
        </Badge>
      )}
      {compact && <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />}
    </div>
  );
}
