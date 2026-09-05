"use client";

import { forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* Small shared primitives so the role dashboards stay consistent and the
   page files stay about their own logic rather than repeating markup.

   These are used by every dashboard page across all four roles, so
   upgrading the look here cascades everywhere without touching each
   page's own data logic. */

const inputBase =
  "w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">{eyebrow}</p>}
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

/** `as` lets a card become the interactive element itself (a button, a link)
    instead of wrapping one, so a whole clickable card stays a single tab stop. */
export function Card({ children, className = "", padded = true, hover = false, as: Tag = "div", ...rest }) {
  return (
    <Tag
      className={`bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(25,25,26,0.04)] transition-all duration-200 ${
        hover ? "hover:shadow-[0_6px_20px_rgba(25,25,26,0.07)] hover:-translate-y-0.5" : ""
      } ${padded ? "p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Forwards a ref so a caller can scroll a section into view. */
export const Section = forwardRef(function Section({ title, description, actions, children, className = "" }, ref) {
  return (
    <section ref={ref} className={className}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3.5">
          <div className="min-w-0">
            {title && <h3 className="font-semibold text-foreground text-sm tracking-wide">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

/* Cycled icon-tile colors for stat tiles that don't specify their own tone —
   purely decorative variety, the semantic accent (role primary) still wins
   whenever a stat is the "headline" number via tone: "primary". */
const TILE_TONES = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};
const TILE_CYCLE = ["primary", "blue", "amber", "purple", "green", "red"];

export function IconTile({ icon, tone = "primary", size = 38, className = "" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl flex-shrink-0 ${TILE_TONES[tone] || TILE_TONES.primary} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {icon}
    </span>
  );
}

/* A hint like "+4 this month" or "-2 vs last week" renders with a coloured
   trend arrow; anything else (an em dash, a plain description) renders as
   plain muted text — so existing callers need no changes to opt in. */
function TrendHint({ hint }) {
  const m = typeof hint === "string" && hint.match(/^([+-])\s*\d/);
  if (!m) return <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>;
  const up = m[1] === "+";
  return (
    <div className={`flex items-center gap-1 text-xs font-medium mt-1 truncate ${up ? "text-emerald-600" : "text-red-500"}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        {up ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
      <span className="truncate">{hint}</span>
    </div>
  );
}

export function StatGrid({ stats, columns = 4 }) {
  const cols = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" }[columns] || "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 ${cols} gap-4`}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="group bg-card border border-border rounded-2xl p-4 shadow-[0_1px_2px_rgba(25,25,26,0.04)] hover:shadow-[0_6px_20px_rgba(25,25,26,0.07)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <span className="text-xs text-muted-foreground truncate pt-1">{s.label}</span>
            {s.icon && <IconTile icon={s.icon} tone={s.tone || TILE_CYCLE[i % TILE_CYCLE.length]} size={34} />}
          </div>
          <div className="text-2xl font-bold text-foreground tracking-tight">{s.value}</div>
          {s.hint && <TrendHint hint={s.hint} />}
        </div>
      ))}
    </div>
  );
}

/* Circular progress indicator — an alternative to StatGrid/ProgressBar for a
   single headline percentage (overall score, completion, placement rate). */
export function ProgressRing({ value, max = 100, size = 96, stroke = 9, label, sublabel, tone = "primary" }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const colors = { primary: "var(--primary)", blue: "#2d6a9f", amber: "#b8860b", purple: "#7a46a0", green: "#1a9c6b", red: "#c0392b" };
  const strokeColor = colors[tone] || colors.primary;
  return (
    <div className="inline-flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-foreground">{label ?? `${Math.round(pct)}%`}</span>
        </div>
      </div>
      {sublabel && <div className="text-xs text-muted-foreground mt-2 text-center max-w-[10rem]">{sublabel}</div>}
    </div>
  );
}

/* Overlapping avatar row, e.g. an "assignees" or "attendees" cell. */
export function AvatarStack({ people = [], max = 4, size = 26 }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center" style={{ paddingRight: 4 }}>
      {shown.map((p, i) => (
        <div key={p.name || i} style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.32), zIndex: shown.length - i }} className="relative ring-2 ring-card rounded-full">
          <Avatar name={p.name} size={size} src={p.src} />
        </div>
      ))}
      {extra > 0 && (
        <div
          className="relative ring-2 ring-card rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold flex-shrink-0"
          style={{ width: size, height: size, fontSize: Math.max(9, size / 3), marginLeft: -Math.round(size * 0.32), zIndex: 0 }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-secondary text-secondary-foreground",
  primary: "bg-primary/10 text-primary",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
  muted: "bg-muted text-muted-foreground",
};

const badgeDotTones = {
  neutral: "bg-secondary-foreground",
  primary: "bg-primary",
  green: "bg-green-600",
  amber: "bg-amber-600",
  red: "bg-red-600",
  blue: "bg-blue-600",
  purple: "bg-purple-600",
  muted: "bg-muted-foreground",
};

export function Badge({ tone = "neutral", dot = false, children, className = "", ...rest }) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
        badgeTones[tone] || badgeTones.neutral
      } ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badgeDotTones[tone] || badgeDotTones.neutral}`} />}
      {children}
    </span>
  );
}

export function EmptyState({ icon = "📭", title, children, action }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-2xl mx-auto mb-4">{icon}</div>
      <div className="font-medium text-foreground mb-1">{title}</div>
      {children && <div className="text-sm text-muted-foreground max-w-md mx-auto">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }) {
  const variants = {
    primary: "bg-primary hover:bg-accent text-white shadow-sm hover:shadow-md",
    secondary: "bg-secondary text-foreground hover:bg-muted",
    outline: "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
    ghost: "text-primary hover:bg-primary/10",
    danger: "border border-red-200 text-red-600 hover:bg-red-50",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-sm" };
  return (
    <button
      {...rest}
      className={`rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>}
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function TextInput(props) {
  return <input {...props} className={`${inputBase} ${props.className || ""}`} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`${inputBase} resize-none ${props.className || ""}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${inputBase} cursor-pointer ${props.className || ""}`}>
      {children}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputBase} pl-9`} />
    </div>
  );
}

export function FilterPills({ options, value, onChange, label }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && <span className="text-xs text-muted-foreground font-medium mr-1">{label}</span>}
      {options.map((o) => {
        const key = typeof o === "string" ? o : o.value;
        const text = typeof o === "string" ? o : o.label;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${
              value === key ? "bg-primary text-white border-transparent shadow-sm" : "bg-card border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={`flex bg-secondary rounded-xl p-1 w-full sm:w-auto sm:inline-flex overflow-x-auto ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 ${
            value === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const color = tone || (pct < 55 ? "bg-red-500" : pct < 75 ? "bg-amber-500" : "bg-gradient-to-r from-primary to-accent");
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * `pageSize` is opt-in and defaults to off, so every existing caller keeps
 * rendering the full list. Turn it on for tables that can realistically reach
 * a few hundred rows (rosters, talent pool) — the DOM cost of a 500-row table
 * is what makes those pages feel slow, not the data.
 */
export function DataTable({ columns, rows, rowKey, empty = "Nothing here yet.", onRowClick, className = "", pageSize = null }) {
  const [page, setPage] = useState(0);

  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  // Filtering can shrink the list under the current page — clamp rather than
  // rendering an empty table the user has to page back out of.
  const safePage = Math.min(page, totalPages - 1);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const visible = pageSize ? rows.slice(safePage * pageSize, safePage * pageSize + pageSize) : rows;

  if (!rows.length) {
    return <EmptyState icon="📭" title={empty} />;
  }
  return (
    <div className={`bg-card border border-border rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(25,25,26,0.04)] ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {columns.map((c) => (
                <th key={c.key} className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 whitespace-nowrap ${c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : "text-left"} ${c.hideBelow || ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border last:border-0 transition-colors ${i % 2 ? "bg-secondary/10" : ""} ${onRowClick ? "cursor-pointer hover:bg-secondary/40" : "hover:bg-secondary/20"}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : ""} ${c.hideBelow || ""}`}>
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageSize && rows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-secondary/30">
          <span className="text-xs text-muted-foreground">
            Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-xs text-muted-foreground">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The overlay every dialog in the app renders through.
 *
 * It is portalled to <body> on purpose. A `position: fixed` overlay is only
 * fixed to the viewport if no ancestor has a transform — and most of these
 * dialogs are opened from inside a card that carries `hover:-translate-y-0.5`.
 * Rendered in place, the dialog therefore flipped between two layouts many
 * times a second: hovering the card applied the transform, which turned the
 * "fixed" overlay into a small box positioned inside the card; that moved the
 * dialog out from under the pointer, the card lost :hover, the transform was
 * removed, the overlay snapped back to full-screen under the pointer again,
 * and the cycle repeated. Portalling to <body> takes the dialog out of any
 * transformed subtree, so there is exactly one stable, centred instance.
 *
 * It also locks body scroll while open, restores it on close, closes on
 * Escape and on a backdrop click, and traps focus inside the dialog.
 */
function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    // Compensate for the scrollbar so the page behind doesn't jump sideways.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [active]);
}

export function Overlay({ onClose, children, className = "", labelledBy }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useBodyScrollLock(mounted);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {/* The backdrop is a sibling, not a parent: clicking it closes, clicking
          the dialog does not bubble out to it. */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      {children}
    </div>,
    document.body
  );
}

let modalSeq = 0;

export function Modal({ title, description, onClose, children, size = "md", footer }) {
  const [titleId] = useState(() => `modal-title-${++modalSeq}`);
  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <Overlay onClose={onClose} labelledBy={titleId}>
      <div className={`relative z-10 bg-card border border-border rounded-2xl w-full ${widths[size]} shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h3 id={titleId} className="font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground text-xl leading-none flex-shrink-0">×</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </Overlay>
  );
}

/** Small inline confirmation used after exports, sends and saves. */
export function useFlash(ms = 2200) {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), ms);
    return () => clearTimeout(t);
  }, [message, ms]);
  return [message, setMessage];
}

export function Flash({ message, tone = "green" }) {
  if (!message) return null;
  const tones = {
    green: "border-green-200 bg-green-50 text-green-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return <div className={`rounded-xl border px-3.5 py-2.5 text-xs ${tones[tone]}`}>{message}</div>;
}

export function Avatar({ name, size = 36, src }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, fontSize: Math.max(10, size / 3) }}
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-muted rounded-xl ${className}`} />;
}
