"use client";

import { useState } from "react";
import { COMMUNITIES } from "../../lib/settings";
import { DEPARTMENTS, COURSE_LEVELS } from "../../lib/domains";
import { VISIBILITY_LABEL, validateCommunityFields } from "../../lib/communityRules";
import { isAyushSystem } from "../../lib/ayush";
import { AyushSystemSelect } from "../AyushSystemSelect";
import FileDrop from "../ui/FileDrop";
import { Button, Field, Select, TextArea, TextInput } from "../ui/Kit";
import { VISIBILITY_ICON } from "./shared";

/**
 * A community's own fields — used to create one and, in the Settings tab,
 * to change it. Visibility, the institution restriction and the cap are
 * explained where they are chosen, because they decide who can ever join.
 */

const VISIBILITY_HELP = {
  open: "Listed in Discover. Any student can join with one click.",
  closed: "Listed in Discover (name and description only). Students ask to join; you or a moderator approve.",
  invite: "Never listed and never revealed. Students join only with your invite code or a direct invitation.",
};

export function blankCommunity(role) {
  return {
    name: "",
    description: "",
    ayushSystem: "",
    subject: "",
    courseLevel: "",
    coverImage: null,
    visibility: "open",
    sameInstitutionOnly: role === "institution",
    memberCap: "",
    allowComments: false,
    rules: "",
  };
}

export default function CommunityForm({ initial, submitLabel = "Create community", busy = false, onSubmit, onCancel, showVisibility = true }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));

  function submit(e) {
    e.preventDefault();
    setError(null);
    const problem = validateCommunityFields({ ...form, memberCap: form.memberCap === "" ? null : Number(form.memberCap) });
    if (problem) return setError(problem);
    if (!isAyushSystem(form.ayushSystem)) return setError("Choose the AYUSH System this community is for.");
    onSubmit({ ...form, memberCap: form.memberCap === "" || form.memberCap == null ? null : Number(form.memberCap) }, setError);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" hint="3–80 characters. Students see this everywhere.">
        <TextInput required minLength={3} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Dravyaguna Vigyan: BAMS 2nd Prof (2025 batch)" />
      </Field>
      <Field label="Description" hint={`${(form.description || "").length}/${COMMUNITIES.MAX_DESCRIPTION_CHARS}`}>
        <TextArea rows={3} maxLength={COMMUNITIES.MAX_DESCRIPTION_CHARS} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this community is for, who should join, what you'll post." />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <AyushSystemSelect value={form.ayushSystem} onChange={(val) => set("ayushSystem", val)} required />
        <Field label="Subject / department (optional)">
          <Select value={form.subject || ""} onChange={(e) => set("subject", e.target.value)}>
            <option value="">—</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Course level (optional)">
          <Select value={form.courseLevel || ""} onChange={(e) => set("courseLevel", e.target.value)}>
            <option value="">—</option>
            {COURSE_LEVELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Member cap (optional)" hint={`${COMMUNITIES.MIN_MEMBER_CAP}–${COMMUNITIES.MAX_MEMBERS}; empty for no cap.`}>
          <TextInput type="number" min={COMMUNITIES.MIN_MEMBER_CAP} max={COMMUNITIES.MAX_MEMBERS} value={form.memberCap ?? ""} onChange={(e) => set("memberCap", e.target.value)} />
        </Field>
      </div>

      {showVisibility && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Who can join</legend>
          <div className="grid sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Visibility">
            {["open", "closed", "invite"].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={form.visibility === v}
                onClick={() => set("visibility", v)}
                className={`text-left rounded-xl border px-3 py-2.5 ${form.visibility === v ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
              >
                <div className={`text-sm font-medium ${form.visibility === v ? "text-primary" : "text-foreground"}`}>
                  {VISIBILITY_ICON[v]} {VISIBILITY_LABEL[v]}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{VISIBILITY_HELP[v]}</div>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex items-start gap-2 text-xs text-foreground">
        <input type="checkbox" className="mt-0.5" checked={Boolean(form.sameInstitutionOnly)} onChange={(e) => set("sameInstitutionOnly", e.target.checked)} />
        <span>
          Only students of my institution
          <span className="block text-[11px] text-muted-foreground">Checked on every join, request, code and invitation. A student whose institution can't be confirmed is refused.</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <input type="checkbox" className="mt-0.5" checked={Boolean(form.allowComments)} onChange={(e) => set("allowComments", e.target.checked)} />
        <span>
          Allow student comments on posts
          <span className="block text-[11px] text-muted-foreground">Off by default. You and your moderators can always comment and delete comments.</span>
        </span>
      </label>
      <Field label="Rules (optional)" hint="Shown on the About tab.">
        <TextArea rows={3} value={form.rules || ""} onChange={(e) => set("rules", e.target.value)} placeholder={"Be respectful\nNo sharing of paid material\nKeep posts to Dravyaguna topics"} />
      </Field>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Cover image (optional)</div>
        <FileDrop purpose="cover" maxFiles={1} onChange={(refs) => refs[0] && set("coverImage", refs[0])} onBusyChange={setUploading} label="Drop a cover image" hint="PNG, JPG or WebP, up to 5 MB" />
        {form.coverImage && <p className="text-[11px] text-muted-foreground mt-1">Current: {form.coverImage.fileName || "cover image"}</p>}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">⚠️ {error}</div>}
      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={busy || uploading}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
