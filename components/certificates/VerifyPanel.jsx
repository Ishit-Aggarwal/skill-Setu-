"use client";

import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendQuery, convexClient, isBackendConfigured } from "../../lib/convexBrowser";
import { normaliseVerifyCode, parseBulkCodes, verifyCodeHint } from "../../lib/credentials";
import { CERTIFICATES } from "../../lib/settings";
import { formatDate } from "../../lib/match";
import CandidateProfileModal from "../CandidateProfileModal";

/**
 * Certificate verification — one component for the public /verify/<code>
 * page and the in-portal /verify page companies, professors and institutions
 * reach from their sidebar.
 *
 * Public: the minimal record (certificates.verify). Signed in as a reviewer
 * (`detailed`): the same record through certificates.verifyDetailed, plus
 * "View candidate profile" when the student shows that certificate on their
 * profile, and bulk verification of up to CERTIFICATES.BULK_VERIFY_MAX codes.
 */

const UNAVAILABLE = "Verification is not available right now. Please try again in a moment.";

function scoreLine(r) {
  if (!r.score && !r.grade) return null;
  return [r.score, r.grade ? `Grade ${r.grade}` : null].filter(Boolean).join(" · ");
}

export function VerifyResult({ result, code, onViewProfile }) {
  if (!result) return null;
  if (result.error) return <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{result.error}</div>;
  if (result.notFound) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700" role="status">
        <div className="text-sm font-semibold">❌ No certificate with this code</div>
        <p className="mt-1">
          Nothing matches <span className="font-mono">{code}</span>. Check the code on the certificate and try again.
        </p>
      </div>
    );
  }
  const rows = [
    ["Student", result.studentName],
    ["Certificate", result.title],
    result.testTitle && result.testTitle !== result.title ? ["Test", result.testTitle] : null,
    result.ayushSystem ? ["AYUSH system", result.ayushSystem] : null,
    ["Issued by", result.issuer],
    scoreLine(result) ? ["Score", scoreLine(result)] : null,
    ["Issued on", formatDate(result.issuedAt)],
    ["Certificate no.", result.certificateNo],
  ].filter(Boolean);
  return (
    <div className={`rounded-xl border px-4 py-4 space-y-3 ${result.valid ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`} role="status">
      <div className={`text-sm font-semibold ${result.valid ? "text-emerald-800" : "text-red-700"}`}>
        {result.valid ? "✅ Valid certificate" : `⛔ Revoked on ${formatDate(result.revokedAt)}`}
      </div>
      <dl className="text-xs text-foreground grid grid-cols-[110px_1fr] gap-y-1.5 gap-x-2">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={label === "Certificate no." ? "font-mono break-all" : label === "Student" ? "font-medium" : ""}>{value}</dd>
          </div>
        ))}
      </dl>
      {result.studentId && onViewProfile && (
        <button
          type="button"
          onClick={() => onViewProfile(result)}
          className="inline-flex items-center gap-1.5 bg-card border border-border hover:bg-secondary px-3 py-1.5 rounded-lg text-xs font-medium text-foreground transition-colors"
        >
          View candidate profile →
        </button>
      )}
    </div>
  );
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function statusOf(r) {
  if (!r.found) return "Not found";
  return r.valid ? "Valid" : `Revoked ${formatDate(r.revokedAt)}`;
}

/** Up to 50 codes at once, as a table and a CSV the browser builds itself. */
function BulkVerify() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const parsed = parseBulkCodes(text);

  async function run(e) {
    e.preventDefault();
    if (!parsed.codes.length) return;
    setBusy(true);
    setError(null);
    try {
      setRows(await backendQuery(api.certificates.verifyDetailed, { codes: parsed.codes }));
    } catch (err) {
      setError(backendErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    const header = ["Code", "Status", "Student", "Certificate", "Issuer", "Issued on", "Certificate no."];
    const lines = [header, ...rows.map((r) => [r.code, statusOf(r), r.studentName || "", r.title || "", r.issuer || "", r.issuedAt ? formatDate(r.issuedAt) : "", r.certificateNo || ""])];
    const blob = new Blob(["﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-verification-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Bulk verify</h2>
        <p className="text-xs text-muted-foreground">Paste up to {CERTIFICATES.BULK_VERIFY_MAX} codes, one per line or separated by commas.</p>
      </div>
      <form onSubmit={run} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          aria-label="Verification codes"
          placeholder={"7KQ2M9XA\nH4TR-8WZC, ..."}
          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || !parsed.codes.length} className="bg-primary hover:bg-accent text-white px-4 py-2 rounded-xl text-xs font-medium disabled:opacity-50">
            {busy ? "Checking…" : `Verify ${parsed.codes.length || ""} code${parsed.codes.length === 1 ? "" : "s"}`}
          </button>
          {rows?.length > 0 && (
            <button type="button" onClick={downloadCsv} className="bg-card border border-border hover:bg-secondary px-3 py-2 rounded-xl text-xs font-medium text-foreground">
              ⬇ Download as CSV
            </button>
          )}
          {parsed.overflow > 0 && (
            <span className="text-[11px] text-amber-700">
              Only the first {CERTIFICATES.BULK_VERIFY_MAX} are checked; {parsed.overflow} left out.
            </span>
          )}
        </div>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {rows && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                {["Code", "Status", "Name", "Title", "Issuer", "Date"].map((h) => (
                  <th key={h} className="py-2 px-1 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.code}-${i}`} className="border-b border-border/60 last:border-0">
                  <td className="py-2 px-1 font-mono">{r.code || "—"}</td>
                  <td className={`py-2 px-1 font-medium ${!r.found ? "text-red-700" : r.valid ? "text-emerald-700" : "text-red-700"}`}>
                    {!r.found ? "❌ Not found" : r.valid ? "✅ Valid" : `⛔ Revoked ${formatDate(r.revokedAt)}`}
                  </td>
                  <td className="py-2 px-1">{r.studentName || "—"}</td>
                  <td className="py-2 px-1">{r.title || "—"}</td>
                  <td className="py-2 px-1">{r.issuer || "—"}</td>
                  <td className="py-2 px-1 whitespace-nowrap">{r.issuedAt ? formatDate(r.issuedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function VerifyPanel({ initialCode = "", detailed = false }) {
  const [input, setInput] = useState(initialCode || "");
  const [checked, setChecked] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const hint = input.trim() ? verifyCodeHint(input) : null;

  async function lookUp(raw) {
    const code = normaliseVerifyCode(raw);
    if (!code) return;
    setChecked(code);
    setBusy(true);
    setResult(null);
    try {
      if (!isBackendConfigured() || !convexClient()) throw new Error(UNAVAILABLE);
      if (detailed) {
        const [row] = await backendQuery(api.certificates.verifyDetailed, { codes: [code] });
        setResult(row?.found ? row : { notFound: true });
      } else {
        const row = await convexClient().query(api.certificates.verify, { code });
        setResult(row || { notFound: true });
        // The address bar carries the code, so the result can be shared as a link.
        if (typeof window !== "undefined" && !window.location.pathname.endsWith(`/verify/${code}`)) {
          window.history.replaceState(null, "", `/verify/${encodeURIComponent(code)}`);
        }
      }
    } catch (err) {
      setResult({ error: err?.message === UNAVAILABLE ? UNAVAILABLE : backendErrorMessage(err) || UNAVAILABLE });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialCode) lookUp(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  return (
    <div className="space-y-5">
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookUp(input);
          }}
          className="space-y-1.5"
        >
          <label htmlFor="verify-code" className="text-xs font-medium text-foreground">
            Verification code
          </label>
          <div className="flex gap-2">
            <input
              id="verify-code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 7KQ2M9XA"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-2 text-sm uppercase tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="submit" disabled={busy || !normaliseVerifyCode(input)} className="bg-primary hover:bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
              {busy ? "Checking…" : "Verify"}
            </button>
          </div>
          <p className={`text-[11px] ${hint ? "text-amber-700" : "text-muted-foreground"}`}>
            {hint || "Printed at the foot of the certificate. Any case; spaces and dashes are fine."}
          </p>
        </form>
        {busy && <p className="text-xs text-muted-foreground">Checking…</p>}
        <VerifyResult result={result} code={checked} onViewProfile={detailed ? setProfile : null} />
      </section>

      {detailed && <BulkVerify />}

      {profile && (
        <CandidateProfileModal
          application={{ studentId: profile.studentId, studentName: profile.studentName }}
          onClose={() => setProfile(null)}
        />
      )}
    </div>
  );
}
