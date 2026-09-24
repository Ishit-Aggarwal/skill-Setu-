"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../lib/convexBrowser";
import { applyCredentialDisplay } from "../../lib/store";
import { formatDate } from "../../lib/match";
import { CERTIFICATES } from "../../lib/settings";
import { Badge, Card } from "../ui/Kit";
import { downloadCertificatePdf } from "./CertificateCard";

/**
 * The portfolio's "Verified certificates": what the student shows on their
 * profile (featured first), each with Download and View, and a collapsed
 * "Hidden from profile" list they can restore from. Only the two display
 * choices change here — never the certificate itself.
 */
export default function PortfolioCertificates({ credentials }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const shown = credentials
    .filter((c) => c.showOnProfile !== false)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || new Date(b.issuedAt) - new Date(a.issuedAt));
  const hidden = credentials.filter((c) => c.showOnProfile === false);
  const featuredCount = shown.filter((c) => c.featured).length;

  async function run(id, fn) {
    setBusy(id);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(backendErrorMessage(err) || err.message);
    } finally {
      setBusy(null);
    }
  }

  const setDisplay = (c, patch) =>
    run(c.id, async () => {
      await backendMutation(api.certificates.setDisplay, { id: c.id, ...patch });
      applyCredentialDisplay(c.id, patch);
    });

  if (!credentials.length) {
    return (
      <Card>
        <p className="text-xs text-muted-foreground">
          Nothing yet. Complete a hosted skill test or an internship and the issuer can award you a verified certificate here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">{error}</div>}
      {shown.length === 0 && (
        <Card>
          <p className="text-xs text-muted-foreground">All your certificates are hidden from your profile. Restore one below.</p>
        </Card>
      )}
      {shown.map((c) => (
        <Card key={c.id} className="flex flex-wrap items-center gap-4" hover>
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl flex-shrink-0">🏅</div>
          <div className="flex-1 min-w-[10rem]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{c.title}</span>
              <Badge tone="green">✔ Verified</Badge>
              {c.featured && <Badge tone="primary">⭐ Featured</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {c.issuer} · Issued {formatDate(c.issuedAt)}
              {c.score ? ` · ${c.score}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={busy === c.id || (!c.featured && featuredCount >= CERTIFICATES.MAX_FEATURED)}
              title={!c.featured && featuredCount >= CERTIFICATES.MAX_FEATURED ? `At most ${CERTIFICATES.MAX_FEATURED} featured` : undefined}
              onClick={() => setDisplay(c, { featured: !c.featured })}
              className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-foreground hover:bg-secondary disabled:opacity-50"
            >
              {c.featured ? "★ Unfeature" : "☆ Feature"}
            </button>
            <button
              type="button"
              disabled={busy === c.id}
              onClick={() => setDisplay(c, { showOnProfile: false })}
              className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
            >
              Hide
            </button>
            <button
              type="button"
              disabled={busy === c.id}
              onClick={() => run(c.id, () => downloadCertificatePdf(c))}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Download
            </button>
            <Link href={`/certificate/${c.id}`} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-accent transition-colors">
              View
            </Link>
          </div>
        </Card>
      ))}

      {hidden.length > 0 && (
        <details className="rounded-xl border border-border bg-card px-4 py-2.5">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer">Hidden from profile ({hidden.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {hidden.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-foreground">
                  {c.title} <span className="text-muted-foreground">· {c.issuer}</span>
                </span>
                <button type="button" disabled={busy === c.id} onClick={() => setDisplay(c, { showOnProfile: true })} className="text-primary hover:underline flex-shrink-0 disabled:opacity-50">
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
