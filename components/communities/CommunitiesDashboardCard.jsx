"use client";

import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { useSessionQuery } from "../../lib/useSessionQuery";
import { Card, IconTile } from "../ui/Kit";

/**
 * "Your communities: 3 · 12 pending requests" (staff) or "3 communities · 5
 * new posts · 1 invitation" (students), linking to /communities.
 */
export default function CommunitiesDashboardCard({ role }) {
  const { data } = useSessionQuery(api.communities.mine, {});
  if (!data) return null;
  const staff = role !== "student";
  const running = data.running || [];
  const joined = data.joined || [];
  const pending = running.reduce((n, c) => n + (c.pendingCount || 0), 0);
  const unread = joined.reduce((n, c) => n + (c.unread || 0), 0);
  const invitations = (data.invitations || []).length;
  const count = staff ? running.length : joined.length;
  const detail = staff
    ? [pending ? `${pending} pending request${pending === 1 ? "" : "s"}` : null].filter(Boolean)
    : [unread ? `${unread} new post${unread === 1 ? "" : "s"}` : null, invitations ? `${invitations} invitation${invitations === 1 ? "" : "s"}` : null].filter(Boolean);
  return (
    <Card as={Link} href="/communities" hover className="flex items-center gap-3 !p-4">
      <IconTile icon="👥" tone="primary" size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {count ? `Your communities: ${count}` : staff ? "Start a community" : "Join a community"}
          {detail.length ? <span className="font-normal text-muted-foreground"> · {detail.join(" · ")}</span> : null}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {staff ? "Announcements, materials and members-only tests for your students." : "Your professors' and institution's announcements, notes and tests."}
        </div>
      </div>
      <span className="text-primary text-sm" aria-hidden="true">→</span>
    </Card>
  );
}
