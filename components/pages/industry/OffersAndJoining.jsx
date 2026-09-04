"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, DataTable, EmptyState, Field, Flash, Modal, PageHeader, ProgressRing, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { formatDate, relativeTime } from "../../../lib/match";
import { OFFER_STAGES, downloadFile, listApplicationsForOwner, setOfferStage, toCsv } from "../../../lib/store";
import StudentProfileModal from "../../StudentProfileModal";

/** Accepted offers that have not converted to a joining yet. */
const AWAITING_FILTER = "Joining soon";

const STAGE_TONE = {
  "Not sent": "muted",
  "Offer sent": "amber",
  "Offer accepted": "blue",
  "Offer declined": "red",
  Joined: "green",
};

/**
 * The pipeline used to end at "Hired" with nothing after it. Offer and joining
 * status is where a recruiter's real risk sits — an accepted offer that never
 * converts to a joining is the number hiring managers actually get asked about.
 */
export default function OffersAndJoining() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useFlash();
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);

  useEffect(() => setReady(true), []);

  const hired = useMemo(
    () => (ready && user ? listApplicationsForOwner(user.id).filter((a) => a.status === "Hired") : []),
    [user, ready, version]
  );

  const rows = useMemo(() => {
    const enriched = hired.map((a) => ({ ...a, offerStage: a.offerStage || "Not sent" }));
    if (filter === "All") return enriched;
    // "Joining soon" used to be a second panel below the table repeating rows
    // the table already showed. It is a view of the same rows, so it is a
    // filter over them rather than a duplicate list.
    if (filter === AWAITING_FILTER) {
      return enriched
        .filter((a) => a.offerStage === "Offer accepted")
        .sort((a, b) => new Date(a.joiningDate || 0) - new Date(b.joiningDate || 0));
    }
    return enriched.filter((a) => a.offerStage === filter);
  }, [hired, filter]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(OFFER_STAGES.map((s) => [s, 0]));
    hired.forEach((a) => { c[a.offerStage || "Not sent"] += 1; });
    return c;
  }, [hired]);

  const acceptRate = counts["Offer sent"] + counts["Offer accepted"] + counts.Joined + counts["Offer declined"]
    ? Math.round(((counts["Offer accepted"] + counts.Joined) / (counts["Offer sent"] + counts["Offer accepted"] + counts.Joined + counts["Offer declined"])) * 100)
    : null;

  const joinRate = counts["Offer accepted"] + counts.Joined ? Math.round((counts.Joined / (counts["Offer accepted"] + counts.Joined)) * 100) : null;

  /** Median-ish signal the table can't show at a glance: offer sent → joined. */
  const avgDaysToJoin = useMemo(() => {
    const spans = hired
      .filter((a) => a.offerStage === "Joined" && a.offerSentAt && a.joiningDate)
      .map((a) => (new Date(a.joiningDate) - new Date(a.offerSentAt)) / 86400000)
      .filter((d) => Number.isFinite(d) && d >= 0);
    if (!spans.length) return null;
    return Math.round(spans.reduce((sum, d) => sum + d, 0) / spans.length);
  }, [hired]);

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  function exportOffers() {
    if (!rows.length) return setFlash("Nothing to export.");
    downloadFile(
      `offers-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows, [
        { label: "Candidate", value: (r) => r.studentName },
        { label: "Role", value: (r) => r.internshipTitle },
        { label: "Institution", value: (r) => r.studentInstitution },
        { label: "Offer stage", value: (r) => r.offerStage },
        { label: "Joining date", value: (r) => r.joiningDate || "" },
        { label: "Offered CTC / stipend", value: (r) => r.offerAmount || "" },
        { label: "Offer sent", value: (r) => r.offerSentAt || "" },
        { label: "Last updated", value: (r) => r.offerUpdatedAt || "" },
      ])
    );
    setFlash(`Exported ${rows.length} offer record${rows.length === 1 ? "" : "s"}.`);
  }

  const columns = [
    {
      key: "candidate",
      header: "Candidate",
      render: (a) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={a.studentName} size={32} />
          <div className="min-w-0">
            <button
              onClick={() => setViewingStudent(a)}
              className="font-medium text-foreground hover:text-primary hover:underline truncate text-left block"
              title="Click to view candidate profile"
            >
              {a.studentName}
            </button>
            <div className="text-[11px] text-muted-foreground truncate">{a.studentInstitution || a.studentCourse}</div>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", hideBelow: "hidden md:table-cell", render: (a) => <span className="text-xs text-muted-foreground">{a.internshipTitle}</span> },
    {
      key: "stage",
      header: "Offer stage",
      align: "center",
      render: (a) => (
        <Select
          value={a.offerStage}
          onChange={(e) => { setOfferStage(a.id, e.target.value); bump(`${a.studentName}: ${e.target.value.toLowerCase()}.`); }}
          className="w-auto text-xs py-1.5 mx-auto"
        >
          {OFFER_STAGES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      ),
    },
    {
      key: "joining",
      header: "Joining date",
      align: "center",
      render: (a) =>
        a.joiningDate ? (
          <div className="flex flex-col items-center">
            <span className="text-xs text-foreground">{formatDate(a.joiningDate)}</span>
            {a.offerStage !== "Joined" && new Date(a.joiningDate) < new Date() && <Badge tone="amber">Date passed</Badge>}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Not set</span>
        ),
    },
    {
      key: "amount",
      header: "Offered",
      align: "center",
      hideBelow: "hidden lg:table-cell",
      render: (a) => (
        <div className="flex flex-col items-center leading-tight">
          <span className="text-xs text-foreground">{a.offerAmount || "—"}</span>
          {a.offerSentAt && <span className="text-[10px] text-muted-foreground">sent {formatDate(a.offerSentAt)}</span>}
        </div>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      align: "center",
      hideBelow: "hidden lg:table-cell",
      render: (a) => (
        <span className="text-[11px] text-muted-foreground" title={a.offerUpdatedAt ? formatDate(a.offerUpdatedAt) : undefined}>
          {a.offerUpdatedAt ? relativeTime(a.offerUpdatedAt) : "Not changed yet"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          {/* The one action the old "Awaiting joining" panel existed for, kept
              on the row it belongs to instead of in a duplicate list. */}
          {a.offerStage === "Offer accepted" && (
            <Button size="sm" onClick={() => { setOfferStage(a.id, "Joined"); bump(`${a.studentName} marked as joined.`); }}>
              Mark joined
            </Button>
          )}
          <button onClick={() => setEditing(a)} className="text-xs text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded">
            Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout activePage="industry-offers" title="Offers & Joining">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Offers & Joining"
          subtitle="Track what happens after a hire — offer sent, accepted or declined, and whether the candidate actually joined."
          actions={<Button size="sm" variant="outline" onClick={exportOffers}>Export</Button>}
        />

        <Flash message={flash} />

        <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-stretch">
          <Card className="flex flex-col items-center justify-center px-8">
            <ProgressRing value={acceptRate ?? 0} label={acceptRate != null ? undefined : "—"} sublabel="Offer acceptance rate" tone="green" />
          </Card>
          {/* Deliberately not "offers sent" or "hired candidates" — both are
              already row counts on the tabs and table below. These three are
              things the table cannot answer at a glance. */}
          <StatGrid
            columns={3}
            stats={[
              {
                label: "Awaiting joining",
                value: String(counts["Offer accepted"]),
                icon: "⏳",
                tone: counts["Offer accepted"] > 0 ? "amber" : undefined,
                hint: counts["Offer accepted"] ? "Accepted, not joined yet" : "Nothing pending",
              },
              { label: "Joined", value: String(counts.Joined), icon: "🎉", hint: joinRate != null ? `${joinRate}% of accepted offers` : "No accepted offers yet" },
              { label: "Offer → joining", value: avgDaysToJoin != null ? `${avgDaysToJoin}d` : "—", icon: "📅", hint: avgDaysToJoin != null ? "Average across joiners" : "No joiners yet" },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter offers by stage">
          {["All", ...OFFER_STAGES, AWAITING_FILTER].map((f) => {
            const count = f === AWAITING_FILTER ? counts["Offer accepted"] : counts[f];
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "bg-primary text-white border-transparent"
                    : f === AWAITING_FILTER && count > 0
                    ? "bg-amber-50 border-amber-300 text-amber-800 hover:border-amber-400"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {f === AWAITING_FILTER ? `⏳ ${f}` : f}
                {f !== "All" && count ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {hired.length === 0 ? (
          <EmptyState icon="🤝" title="No hires yet">
            Once you move a candidate to “Hired” in the applicant pipeline, they appear here for offer and joining tracking.
          </EmptyState>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(a) => a.id}
            empty={filter === AWAITING_FILTER ? "No accepted offers are waiting to convert." : "No candidates in this stage."}
          />
        )}
      </div>

      {editing && (
        <Modal title={editing.studentName} description={`${editing.internshipTitle} · ${editing.studentInstitution || ""}`} onClose={() => setEditing(null)}>
          <OfferForm
            application={editing}
            onCancel={() => setEditing(null)}
            onSubmit={(data) => {
              setOfferStage(editing.id, data.offerStage, { joiningDate: data.joiningDate, offerAmount: data.offerAmount, offerNotes: data.offerNotes });
              setEditing(null);
              bump("Offer record updated.");
            }}
          />
        </Modal>
      )}

      {viewingStudent && (
        <StudentProfileModal
          application={viewingStudent}
          onClose={() => setViewingStudent(null)}
        />
      )}
    </DashboardLayout>
  );
}

function OfferForm({ application, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    offerStage: application.offerStage || "Not sent",
    joiningDate: application.joiningDate || "",
    offerAmount: application.offerAmount || "",
    offerNotes: application.offerNotes || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge tone="primary">{application.match}% match</Badge>
        <Badge tone={STAGE_TONE[form.offerStage]}>{form.offerStage}</Badge>
        <Badge tone="neutral">Applied {formatDate(application.appliedAt)}</Badge>
      </div>
      <Field label="Offer stage">
        <Select value={form.offerStage} onChange={(e) => set("offerStage", e.target.value)}>
          {OFFER_STAGES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Joining date"><TextInput type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} /></Field>
        <Field label="Offered stipend / CTC"><TextInput value={form.offerAmount} onChange={(e) => set("offerAmount", e.target.value)} placeholder="₹20,000/mo" /></Field>
      </div>
      <Field label="Internal notes" hint="Visible only to your hiring team.">
        <TextArea rows={3} value={form.offerNotes} onChange={(e) => set("offerNotes", e.target.value)} placeholder="Negotiation status, documents pending, onboarding owner." />
      </Field>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Save</Button>
      </div>
    </form>
  );
}
