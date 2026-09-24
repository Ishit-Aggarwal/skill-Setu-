"use client";

import Link from "next/link";
import { ayushSystemLabel } from "../../lib/ayush";
import { VISIBILITY_LABEL } from "../../lib/communityRules";
import { Badge, Card } from "../ui/Kit";

export const VISIBILITY_TONE = { open: "green", closed: "amber", invite: "purple" };
export const VISIBILITY_ICON = { open: "🌐", closed: "🔐", invite: "✉️" };

export function VisibilityBadge({ visibility }) {
  return (
    <Badge tone={VISIBILITY_TONE[visibility] || "neutral"}>
      {VISIBILITY_ICON[visibility]} {VISIBILITY_LABEL[visibility] || visibility}
    </Badge>
  );
}

export function formatWhen(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDay(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** A community as a card: cover, name, owner, badges, count, and whatever action the caller passes. */
export function CommunityCard({ community, children, badge, href = `/communities/${community.id}` }) {
  return (
    <Card className="flex flex-col overflow-hidden" padded={false}>
      <Link href={href} className="block">
        <div
          className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 bg-cover bg-center"
          style={community.coverUrl ? { backgroundImage: `url(${community.coverUrl})` } : undefined}
          aria-hidden="true"
        />
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start gap-2">
          <Link href={href} className="text-sm font-semibold text-foreground hover:underline flex-1 min-w-0">
            {community.name}
          </Link>
          {badge}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {community.ownerRole === "institution" ? "🏫" : "👩‍🏫"} {community.ownerName}
          {community.institutionName && community.ownerRole !== "institution" ? ` · ${community.institutionName}` : ""}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <VisibilityBadge visibility={community.visibility} />
          <Badge tone="primary">{ayushSystemLabel(community.ayushSystem)}</Badge>
          {community.courseLevel && <Badge tone="neutral">{community.courseLevel}</Badge>}
          {community.sameInstitutionOnly && <Badge tone="neutral">🏛️ Own institution only</Badge>}
          {community.archived && <Badge tone="muted">Archived</Badge>}
        </div>
        {community.description && <p className="text-xs text-muted-foreground line-clamp-2">{community.description}</p>}
        <div className="text-[11px] text-muted-foreground mt-auto">
          {community.memberCount} member{community.memberCount === 1 ? "" : "s"}
          {community.memberCap ? ` of ${community.memberCap}` : ""}
        </div>
        {children}
      </div>
    </Card>
  );
}

/** URLs in plain text become links; nothing else is interpreted (no HTML is ever rendered). */
export function Linkified({ text, className = "" }) {
  const parts = String(text || "").split(/(https?:\/\/[^\s)]+)/g);
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline break-all">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
