"use client";

import { AYUSH_SYSTEMS, AYUSH_SYSTEM_FIELD_LABEL, ayushSystemLabel, needsAyushRetag } from "../lib/ayush";
import { Field, FilterPills, Select } from "./ui/Kit";

/**
 * The one "AYUSH System" input.
 *
 * Every screen where a person picks which system a record belongs to — a
 * signup form, a profile, a test, a posting — renders this rather than its
 * own <select>, so the choices are always the five canonical systems from
 * lib/ayush.js and the label is always "AYUSH System".
 */
export function AyushSystemSelect({ value, onChange, required = false, hint, label = AYUSH_SYSTEM_FIELD_LABEL, placeholder = "Select an AYUSH system", className = "", ...rest }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <Select value={value || ""} onChange={(e) => onChange(e.target.value)} required={required} aria-label={AYUSH_SYSTEM_FIELD_LABEL} {...rest}>
        <option value="">{placeholder}</option>
        {AYUSH_SYSTEMS.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Pills for narrowing a list to one system. "All" is the empty value. */
export function AyushSystemFilter({ value, onChange, label = `${AYUSH_SYSTEM_FIELD_LABEL}:`, counts }) {
  const options = [
    { value: "", label: "All" },
    ...AYUSH_SYSTEMS.map((s) => ({
      value: s.slug,
      label: counts && counts[s.slug] ? `${s.label} ${counts[s.slug]}` : s.label,
    })),
  ];
  return <FilterPills label={label} options={options} value={value || ""} onChange={(v) => onChange(v || "")} />;
}

/**
 * Inline fix for a record the migration flagged: the badge, the select and a
 * save button in one row, so re-tagging is one click on the record itself
 * rather than a trip through an edit form.
 */
export function RetagPrompt({ row, onSave, saving = false, what = "This item" }) {
  if (!needsAyushRetag(row)) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-2">
      <div className="font-medium">⚠️ {what} needs to be re-tagged with an AYUSH System.</div>
      <div className="flex items-center gap-2">
        <Select
          defaultValue=""
          aria-label={AYUSH_SYSTEM_FIELD_LABEL}
          className="py-1.5 text-xs flex-1"
          disabled={saving}
          onChange={(e) => {
            if (e.target.value) onSave(e.target.value);
          }}
        >
          <option value="">Choose an AYUSH system…</option>
          {AYUSH_SYSTEMS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </Select>
        {saving && <span className="text-[11px]">Saving…</span>}
      </div>
    </div>
  );
}

export function AyushSystemBadgeText({ slug }) {
  return ayushSystemLabel(slug) || null;
}
