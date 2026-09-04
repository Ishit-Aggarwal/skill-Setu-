"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { formatDate, relativeTime } from "../../../lib/match";
import {
  MOU_SCOPES,
  addMouTimelineEvent,
  createMou,
  deleteMou,
  listApplications,
  listMous,
  logActivity,
  mouStatus,
  updateMou,
} from "../../../lib/store";
import { subscribeToMutations } from "../../../lib/sync";
import { buildRoster, useInstitutionName } from "./useInstitution";

const STATUS_TONE = { Active: "green", "Renewal due": "amber", Expired: "red" };
const MAX_DOC_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * MOU tracking with the structure a placement cell is actually audited on —
 * signed and expiry dates, the scope of the collaboration, an uploaded copy of
 * the document, a named contact and a status timeline — rather than one flat
 * row per partner.
 */
export default function Partnerships() {
  const { user } = useAuth();
  const instituteName = useInstitutionName();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("All");

  useEffect(() => setReady(true), []);

  useEffect(() => {
    const unsub = subscribeToMutations(["mous", "applications"], () => {
      setVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  const mous = useMemo(() => (ready && instituteName ? listMous(instituteName) : []), [instituteName, ready, version]);
  const roster = useMemo(() => (ready && instituteName ? buildRoster(instituteName) : []), [instituteName, ready, version]);

  // Real engagement per partner, derived from where this institution's own
  // students actually applied and got hired.
  const engagement = useMemo(() => {
    if (!ready) return {};
    const ids = new Set(roster.map((r) => r.id));
    const byCompany = {};
    listApplications()
      .filter((a) => ids.has(a.studentId))
      .forEach((a) => {
        if (!byCompany[a.company]) byCompany[a.company] = { applications: 0, hired: 0 };
        byCompany[a.company].applications += 1;
        if (a.status === "Hired") byCompany[a.company].hired += 1;
      });
    return byCompany;
  }, [roster, ready]);

  const rows = useMemo(() => {
    const enriched = mous.map((m) => ({ ...m, computedStatus: mouStatus(m), activity: engagement[m.partner] || { applications: 0, hired: 0 } }));
    if (filter === "All") return enriched;
    return enriched.filter((m) => m.computedStatus === filter);
  }, [mous, engagement, filter]);

  const counts = {
    Active: mous.filter((m) => mouStatus(m) === "Active").length,
    "Renewal due": mous.filter((m) => mouStatus(m) === "Renewal due").length,
    Expired: mous.filter((m) => mouStatus(m) === "Expired").length,
  };

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  return (
    <DashboardLayout activePage="institution-partnerships" title="MOUs & Industry Partners">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="MOUs & Industry Partnerships"
          subtitle="Every signed collaboration, its scope, renewal date and the real placement activity behind it."
          actions={<Button size="sm" onClick={() => setShowCreate(true)}>Record an MOU</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Total partnerships", value: String(mous.length), icon: "🤝" },
            { label: "Active", value: String(counts.Active), icon: "✅" },
            { label: "Renewal due (90 days)", value: String(counts["Renewal due"]), icon: "⏳" },
            { label: "Lapsed", value: String(counts.Expired), icon: "⚠️" },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          {["All", "Active", "Renewal due", "Expired"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 ${
                filter === f ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState icon="🤝" title={mous.length ? "No partnerships in this state" : "No MOUs recorded yet"}>
            {mous.length ? "Try a different filter." : "Record your signed collaborations here so renewals never lapse unnoticed."}
          </EmptyState>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {rows.map((m) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{m.partner}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Signed {m.signedDate ? formatDate(m.signedDate) : "—"} · expires {m.expiryDate ? formatDate(m.expiryDate) : "—"}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[m.computedStatus]}>{m.computedStatus}</Badge>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(m.scope || []).map((s) => (
                    <span key={s} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {(m.scope || []).length === 0 && <span className="text-[10px] text-muted-foreground">Scope not recorded</span>}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Applications", value: m.activity.applications },
                    { label: "Hired", value: m.activity.hired },
                    { label: "Scope items", value: (m.scope || []).length },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary/50 rounded-xl py-2 text-center">
                      <div className="text-base font-bold text-foreground">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-muted-foreground mb-3">
                  <div>👤 {m.contactName || "No contact recorded"}{m.contactEmail ? ` · ${m.contactEmail}` : ""}</div>
                  {m.contactPhone && <div>📞 {m.contactPhone}</div>}
                </div>

                {(m.timeline || []).length > 0 && (
                  <div className="border-t border-border pt-3 mb-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status timeline</div>
                    <div className="space-y-1.5">
                      {(m.timeline || []).slice(-4).map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-foreground">{t.label}</span>
                          <span className="text-muted-foreground ml-auto">{relativeTime(t.at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(m)}>Edit</Button>
                  {m.documentDataUrl ? (
                    <a href={m.documentDataUrl} target="_blank" rel="noreferrer" className="text-xs text-primary font-medium hover:underline">
                      View MOU document
                    </a>
                  ) : (
                    <span className="text-xs text-amber-600">No document uploaded</span>
                  )}
                  <button
                    onClick={() => { addMouTimelineEvent(m.id, "Renewal reminder sent"); bump("Renewal reminder logged."); }}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Log reminder
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(showCreate || editing) && (
        <MouModal
          instituteName={instituteName}
          actor={user?.name}
          mou={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onDone={(msg) => { setShowCreate(false); setEditing(null); bump(msg); }}
          onDelete={(m) => {
            deleteMou(m.id);
            logActivity(instituteName, user?.name || "Admin", "Deleted an MOU", m.partner);
            setEditing(null);
            bump("MOU removed.");
          }}
        />
      )}
    </DashboardLayout>
  );
}

function MouModal({ instituteName, actor, mou, onClose, onDone, onDelete }) {
  const [form, setForm] = useState({
    partner: mou?.partner || "",
    signedDate: mou?.signedDate || "",
    expiryDate: mou?.expiryDate || "",
    contactName: mou?.contactName || "",
    contactEmail: mou?.contactEmail || "",
    contactPhone: mou?.contactPhone || "",
    notes: mou?.notes || "",
  });
  const [scope, setScope] = useState(mou?.scope || []);
  const [doc, setDoc] = useState(mou?.documentDataUrl || null);
  const [docName, setDocName] = useState(mou?.documentName || "");
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleDoc(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) return setError("Please choose a file under 1.5MB.");
    setError(null);
    setDoc(await readFileAsDataUrl(file));
    setDocName(file.name);
  }

  function submit(e) {
    e.preventDefault();
    const payload = { ...form, scope, documentDataUrl: doc, documentName: docName };
    if (mou) {
      updateMou(mou.id, payload);
      addMouTimelineEvent(mou.id, "Details updated");
      logActivity(instituteName, actor || "Admin", "Updated an MOU", form.partner);
      onDone(`${form.partner} updated.`);
    } else {
      const created = createMou(instituteName, payload);
      addMouTimelineEvent(created.id, "MOU signed");
      logActivity(instituteName, actor || "Admin", "Recorded an MOU", form.partner);
      onDone(`${form.partner} added to the partnership register.`);
    }
  }

  return (
    <Modal title={mou ? "Edit partnership" : "Record a new MOU"} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <Flash message={error} tone="red" />}
        <Field label="Partner organisation"><TextInput required value={form.partner} onChange={(e) => set("partner", e.target.value)} placeholder="Apex Global Technologies & Innovations" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Signed on"><TextInput type="date" value={form.signedDate} onChange={(e) => set("signedDate", e.target.value)} /></Field>
          <Field label="Valid until" hint="Drives the renewal reminder."><TextInput type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} /></Field>
        </div>
        <Field label="Scope of collaboration">
          <div className="flex flex-wrap gap-2">
            {MOU_SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  scope.includes(s) ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Primary contact"><TextInput value={form.contactName} onChange={(e) => set("contactName", e.target.value)} /></Field>
          <Field label="Contact email"><TextInput type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
          <Field label="Contact phone"><TextInput value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></Field>
        </div>
        <Field label="Signed MOU document" hint="PDF or image, under 1.5MB. Stored with the partnership record.">
          <input type="file" accept="application/pdf,image/*" onChange={handleDoc} className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary" />
          {docName && <p className="text-[11px] text-primary mt-1.5">Attached: {docName}</p>}
        </Field>
        <Field label="Internal notes"><TextArea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <div className="flex flex-wrap gap-3">
          {mou && (
            <Button type="button" variant="danger" onClick={() => onDelete(mou)}>Delete</Button>
          )}
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">{mou ? "Save changes" : "Record MOU"}</Button>
        </div>
      </form>
    </Modal>
  );
}
