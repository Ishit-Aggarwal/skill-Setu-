"use client";

import { useState } from "react";
import { Button, TextInput } from "./ui/Kit";

/**
 * Free-text tag entry.
 *
 * Research interests used to be a fixed grid of preset chips. That is wrong for
 * two reasons: a preset list can only ever describe the fields whoever wrote it
 * thought of — anyone working outside them had no way to say what they work on —
 * and the presets that existed leaned heavily on one discipline, which made a
 * general academia–industry platform read as though it served only that field.
 * People type their own now.
 *
 * Validation is deliberately light: trim, collapse whitespace, reject exact
 * duplicates (case-insensitively), cap the length of one tag and the number of
 * them. Nothing else — an interest is whatever the person says it is.
 */
export default function TagInput({
  value = [],
  onChange,
  placeholder = "Type an interest and press Enter",
  maxTags = 20,
  maxLength = 60,
  emptyHint = "None added yet.",
  suggestions = [],
  inputLabel,
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);

  function add(raw) {
    const cleaned = String(raw || "").trim().replace(/\s+/g, " ");
    if (!cleaned) return;

    if (cleaned.length > maxLength) {
      setError(`Keep each entry under ${maxLength} characters.`);
      return;
    }
    if (value.length >= maxTags) {
      setError(`You can add up to ${maxTags}.`);
      return;
    }
    if (value.some((v) => v.toLowerCase() === cleaned.toLowerCase())) {
      setError(`"${cleaned}" is already on the list.`);
      setDraft("");
      return;
    }

    onChange([...value, cleaned]);
    setDraft("");
    setError(null);
  }

  function removeAt(index) {
    onChange(value.filter((_, i) => i !== index));
    setError(null);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      removeAt(value.length - 1);
    } else if (e.key === "," ) {
      e.preventDefault();
      add(draft);
    }
  }

  const unusedSuggestions = suggestions.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {value.length === 0 && <span className="text-sm text-muted-foreground">{emptyHint}</span>}
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1.5 bg-primary/8 text-primary rounded-full pl-3 pr-2 py-1.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove ${tag}`}
              className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center leading-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <TextInput
          value={draft}
          aria-label={inputLabel || placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={placeholder}
          maxLength={maxLength + 10}
        />
        <Button type="button" variant="outline" onClick={() => add(draft)} disabled={!draft.trim()}>
          Add
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 mt-1.5">
        <p className="text-[11px] text-muted-foreground">
          {error ? <span className="text-red-600">{error}</span> : "Press Enter or comma to add. Anything you type is kept as you wrote it."}
        </p>
        <span className="text-[11px] text-muted-foreground flex-shrink-0">
          {value.length}/{maxTags}
        </span>
      </div>

      {unusedSuggestions.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Common examples — click to add, or ignore and type your own
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
