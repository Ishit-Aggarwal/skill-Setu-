"use client";

import { useAuth } from "../lib/auth";
import { Card, IconTile } from "./ui/Kit";

/**
 * Flips the model from apply-only to discoverable-by-default (LinkedIn's
 * "Open to Work"). Opt-out, not opt-in: an account with no explicit value is
 * treated as visible, so existing accounts don't quietly vanish from the
 * talent pool the moment this shipped.
 */
export default function TalentPoolToggle() {
  const { user, updateProfile } = useAuth();
  const isOpen = user.openToOpportunities !== false;

  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <IconTile icon={isOpen ? "🟢" : "⚪"} tone="green" className={isOpen ? "" : "!bg-muted !text-muted-foreground"} />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{isOpen ? "Open to opportunities" : "Not visible to recruiters"}</div>
          <div className="text-xs text-muted-foreground">
            {isOpen ? "Recruiters can find you in the Talent Pool, even for roles you haven't applied to." : "Turn this on to be discoverable in the recruiter Talent Pool."}
          </div>
        </div>
      </div>
      <button
        onClick={() => updateProfile({ openToOpportunities: !isOpen })}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${isOpen ? "bg-primary" : "bg-muted"}`}
        aria-label="Toggle talent pool visibility"
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${isOpen ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </Card>
  );
}
