"use client";

import { useEffect, useState } from "react";

/* Small shared primitives so the role dashboards stay consistent and the
   page files stay about their own logic rather than repeating markup. */

const inputBase =
  "w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", padded = true }) {
  return <div className={`bg-card border border-border rounded-2xl ${padded ? "p-5" : ""} ${className}`}>{children}</div>;
}

export function Section({ title, description, actions, children, className = "" }) {
  return (
    <section className={className}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            {title && <h3 className="font-semibold text-foreground text-sm">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatGrid({ stats, columns = 4 }) {
  const cols = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" }[columns] || "lg:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 ${cols} gap-4`}>
      {stats.map((s) => (
        <div key={s.label} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="text-xs text-muted-foreground truncate">{s.label}</span>
            {s.icon && <span className="text-base flex-shrink-0">{s.icon}</span>}
          </div>
          <div className="text-2xl font-bold text-foreground">{s.value}</div>
          {s.hint && <div className="text-xs text-muted-foreground mt-1">{s.hint}</div>}
        </div>
      ))}
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

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${badgeTones[tone] || badgeTones.neutral} ${className}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon = "📭", title, children, action }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-10 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-medium text-foreground mb-1">{title}</div>
      {children && <div className="text-sm text-muted-foreground max-w-md mx-auto">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className = "", children, ...rest }) {
  const variants = {
    primary: "bg-primary hover:bg-accent text-white",
    secondary: "bg-secondary text-foreground hover:bg-muted",
    outline: "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
    ghost: "text-primary hover:bg-primary/10",
    danger: "border border-red-200 text-red-600 hover:bg-red-50",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-sm" };
  return (
    <button
      {...rest}
      className={`rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
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
              value === key ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
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
  const color = tone || (pct < 55 ? "bg-red-500" : pct < 75 ? "bg-amber-500" : "bg-primary");
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DataTable({ columns, rows, rowKey, empty = "Nothing here yet.", onRowClick, className = "" }) {
  if (!rows.length) {
    return <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className={`bg-card border border-border rounded-2xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              {columns.map((c) => (
                <th key={c.key} className={`text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap ${c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : "text-left"} ${c.hideBelow || ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
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
    </div>
  );
}

export function Modal({ title, description, onClose, children, size = "md", footer }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 bg-card border border-border rounded-2xl w-full ${widths[size]} shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground text-xl leading-none flex-shrink-0">×</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
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

