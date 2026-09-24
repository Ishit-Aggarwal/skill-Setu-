"use client";

import { useEffect, useRef, useState } from "react";
import { uploadToStorage } from "../../lib/uploads";
import { PURPOSE_EXTENSIONS, describeExtensions, iconForFile } from "../../lib/fileKinds";
import { formatBytes } from "../../lib/files";

/**
 * Click or drop files here — the one upload control every new feature uses.
 *
 * Each file uploads on its own the moment it is chosen and shows its own
 * progress and its own error line, so one bad file never costs the host the
 * others. `onChange` receives the storage references of the files that
 * finished, in the order shown; with `reorderable` the order can be changed
 * (arrow buttons, so it works from a keyboard, and drag on a pointer) —
 * that order is the order an import reads the files in.
 *
 * `purpose` is one of the lib/uploads.js kinds ("source", "resume",
 * "material", "cover"); it decides the accepted types and the size limit,
 * and the server checks both again.
 */

let seq = 0;

export default function FileDrop({
  purpose = "source",
  maxFiles = 10,
  label = "Drop files here or click to choose",
  hint,
  onChange,
  onBusyChange,
  reorderable = false,
  disabled = false,
  initial = [],
}) {
  const [items, setItems] = useState(() =>
    (initial || []).map((ref) => ({ key: `f${++seq}`, name: ref.fileName, size: ref.bytes, mimeType: ref.mimeType, status: "done", progress: 1, ref }))
  );
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState(null);
  const inputRef = useRef(null);
  const dragIndex = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = PURPOSE_EXTENSIONS[purpose] || [];
  const busy = items.some((i) => i.status === "uploading");

  useEffect(() => {
    onBusyChange?.(busy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  // Report the finished uploads whenever the list settles.
  const doneSignature = items.filter((i) => i.status === "done").map((i) => i.ref?.storageId).join("|");
  useEffect(() => {
    onChangeRef.current?.(items.filter((i) => i.status === "done").map((i) => i.ref));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneSignature]);

  function patch(key, change) {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...change } : i)));
  }

  function addFiles(fileList) {
    setNotice(null);
    const files = [...(fileList || [])];
    if (!files.length) return;
    const room = maxFiles - items.length;
    if (room <= 0) {
      setNotice(`You can add up to ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`);
      return;
    }
    if (files.length > room) setNotice(`Only the first ${room} file${room === 1 ? "" : "s"} were added — the limit is ${maxFiles}.`);
    const added = files.slice(0, room).map((file) => ({ key: `f${++seq}`, name: file.name, size: file.size, mimeType: file.type, status: "uploading", progress: 0, file }));
    setItems((list) => [...list, ...added]);
    added.forEach(async (item) => {
      try {
        const ref = await uploadToStorage(item.file, { kind: purpose, onProgress: (p) => patch(item.key, { progress: p }) });
        patch(item.key, { status: "done", progress: 1, ref, file: undefined });
      } catch (error) {
        patch(item.key, { status: "error", error: error?.message || "That file could not be uploaded.", file: undefined });
      }
    });
  }

  function removeItem(key) {
    setItems((list) => list.filter((i) => i.key !== key));
  }

  function move(index, delta) {
    setItems((list) => {
      const next = [...list];
      const to = index + delta;
      if (to < 0 || to >= next.length) return list;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function onDrop(e) {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    if (dragIndex.current != null) return;
    addFiles(e.dataTransfer?.files);
  }

  const full = items.length >= maxFiles;

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled || full ? -1 : 0}
        aria-disabled={disabled || full}
        aria-label={`${label}. Accepted: ${describeExtensions(extensions)}.`}
        onClick={() => !disabled && !full && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !full) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && dragIndex.current == null) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
          disabled || full ? "opacity-60 cursor-not-allowed border-border" : over ? "border-primary bg-primary/10 cursor-copy" : "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
        } focus:outline-none focus:ring-2 focus:ring-primary/30`}
      >
        <div className="text-2xl mb-1" aria-hidden="true">📂</div>
        <div className="text-sm font-medium text-foreground">{full ? `Limit of ${maxFiles} file${maxFiles === 1 ? "" : "s"} reached` : label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{hint || `${describeExtensions(extensions)}${maxFiles > 1 ? ` · up to ${maxFiles} files` : ""}`}</div>
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={extensions.join(",")}
          className="hidden"
          tabIndex={-1}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {notice && <p className="text-[11px] text-amber-700">{notice}</p>}

      {items.length > 0 && (
        <ul className="space-y-1.5" aria-label="Chosen files">
          {items.map((item, index) => (
            <li
              key={item.key}
              draggable={reorderable && item.status === "done"}
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragEnd={() => {
                dragIndex.current = null;
              }}
              onDragOver={(e) => {
                if (!reorderable || dragIndex.current == null || dragIndex.current === index) return;
                e.preventDefault();
                const from = dragIndex.current;
                dragIndex.current = index;
                move(from, index - from);
              }}
              className={`rounded-lg border px-2.5 py-2 text-xs ${item.status === "error" ? "border-red-200 bg-red-50" : "border-border bg-secondary/40"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {reorderable && <span className="text-muted-foreground cursor-grab select-none" aria-hidden="true">⋮⋮</span>}
                <span aria-hidden="true">{iconForFile(item.name, item.mimeType)}</span>
                <span className="truncate flex-1 text-foreground font-medium" title={item.name}>
                  {reorderable ? `${index + 1}. ` : ""}
                  {item.name}
                </span>
                <span className="text-muted-foreground flex-shrink-0">{formatBytes(item.size)}</span>
                {item.status === "uploading" && <span className="text-muted-foreground flex-shrink-0">{Math.round((item.progress || 0) * 100)}%</span>}
                {item.status === "done" && <span className="text-emerald-600 flex-shrink-0" aria-label="Uploaded">✓</span>}
                {reorderable && item.status === "done" && (
                  <span className="flex flex-shrink-0">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${item.name} up`} className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Move ${item.name} down`} className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                  </span>
                )}
                <button type="button" onClick={() => removeItem(item.key)} disabled={item.status === "uploading"} aria-label={`Remove ${item.name}`} className="px-1 text-muted-foreground hover:text-red-600 disabled:opacity-30 flex-shrink-0">
                  ×
                </button>
              </div>
              {item.status === "uploading" && (
                <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((item.progress || 0) * 100)}%` }} />
                </div>
              )}
              {item.status === "error" && <p className="text-[11px] text-red-700 mt-1">{item.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
