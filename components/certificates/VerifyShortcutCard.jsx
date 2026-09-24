"use client";

import Link from "next/link";
import { Card, IconTile } from "../ui/Kit";

/** Dashboard shortcut to /verify for companies, professors and institutions. */
export default function VerifyShortcutCard() {
  return (
    <Card as={Link} href="/verify" hover className="flex items-center gap-3 !p-4">
      <IconTile icon="🛡" tone="green" size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">Verify a certificate</div>
        <div className="text-[11px] text-muted-foreground">Check a Skill Setu certificate by its code, or paste up to 50 codes at once.</div>
      </div>
      <span className="text-primary text-sm" aria-hidden="true">→</span>
    </Card>
  );
}
