"use client";

import { api } from "../../convex/_generated/api";
import { useSessionQuery } from "../../lib/useSessionQuery";
import { formatDate } from "../../lib/match";

/**
 * A student's certificates as a reviewer sees them: only those the student
 * shows on their profile, never revoked ones, featured first, each with a
 * link to its public verification. Read live from the server
 * (certificates.shownForStudent), which applies the same rules.
 */
export function useShownCertificates(studentId) {
  const { data, loading } = useSessionQuery(api.certificates.shownForStudent, { studentId }, { skip: !studentId });
  return { certificates: data || [], loading };
}

export default function VerifiedCertificates({ studentId, title = "Verified certificates", className = "" }) {
  const { certificates, loading } = useShownCertificates(studentId);
  if (loading || !certificates.length) return null;
  return (
    <div className={className}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title} · {certificates.length}
      </div>
      <ul className="space-y-2">
        {certificates.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                {c.featured && <span title="Featured">⭐</span>}
                <span className="truncate">{c.title}</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">✔ Verified</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {c.issuer} · {formatDate(c.issuedAt)}
                {c.score ? ` · ${c.score}` : ""}
                {c.grade ? ` (Grade ${c.grade})` : ""}
              </div>
            </div>
            {c.verifyCode && (
              <a href={`/verify/${encodeURIComponent(c.verifyCode)}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex-shrink-0">
                Verify
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
