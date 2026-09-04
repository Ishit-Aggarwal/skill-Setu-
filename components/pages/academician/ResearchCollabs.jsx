"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, Section, Select, StatGrid, Tabs, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { COLLAB_EXPERTISE } from "../../../lib/domains";
import { formatDate, formatDateTime, relativeTime } from "../../../lib/match";
import {
  SEED_COLLABS,
  addCollabFile,
  addCollabMilestone,
  addResearchOutput,
  createCollabListing,
  getCollabResponse,
  listCollabFiles,
  listCollabInterests,
  listCollabListingsByOwner,
  listCollabMessages,
  listCollabMilestones,
  listResearchOutputs,
  postCollabMessage,
  removeCollabFile,
  removeResearchOutput,
  setCollabInterestStatus,
  setCollabResponse,
  toggleCollabMilestone,
  updateCollabListing,
} from "../../../lib/store";
import { subscribeToMutations } from "../../../lib/sync";

const TYPE_TONE = { Industry: "blue", Academic: "purple", Govt: "green" };
const OUTPUT_TYPES = ["Journal Paper", "Conference Paper", "Book Chapter", "Patent", "Technical Report"];
const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * The research hub. Previously a faculty member could only accept or decline
 * an incoming request; now they can also publish their own call for
 * collaborators, see who responded, and actually run an accepted project —
 * discussion thread, milestones, shared files and logged outputs.
 */
export default function ResearchCollabs() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState("requests");
  const [flash, setFlash] = useFlash();
  const [showCreate, setShowCreate] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    const unsub = subscribeToMutations(
      ["collabListings", "collabInterests", "collabMessages", "collabMilestones", "collabResponses", "collabFiles", "researchOutputs"],
      () => {
        setVersion((v) => v + 1);
      }
    );
    return unsub;
  }, []);

  const responses = useMemo(() => {
    if (!ready) return {};
    return Object.fromEntries(SEED_COLLABS.map((c) => [c.id, getCollabResponse(c.id)]));
  }, [ready, version]);

  const listings = useMemo(() => (ready && user ? listCollabListingsByOwner(user.id) : []), [user, ready, version]);
  const outputs = useMemo(() => (ready && user ? listResearchOutputs(user.id) : []), [user, ready, version]);

  const activeCollabs = useMemo(
    () => SEED_COLLABS.filter((c) => c.status === "Active" || responses[c.id] === "Accepted"),
    [responses]
  );

  const pending = SEED_COLLABS.filter((c) => c.status === "Pending Review" && !responses[c.id]);
  const totalInterests = listings.reduce((s, l) => s + listCollabInterests(l.id).length, 0);

  function bump(msg) {
    setVersion((v) => v + 1);
    if (msg) setFlash(msg);
  }

  function respond(collabId, response) {
    setCollabResponse(collabId, response);
    bump(response === "Accepted" ? "Collaboration accepted — a workspace is now open for it." : "Request declined.");
  }

  const workspace = activeCollabs.find((c) => c.id === workspaceId);

  return (
    <DashboardLayout activePage="academician-collabs" title="Research Collaborations">
      <div className="animate-fade-slide space-y-5">
        <PageHeader
          title="Research Collaborations"
          subtitle="Respond to incoming requests, publish your own calls for collaborators, and run accepted projects end to end."
          actions={<Button size="sm" onClick={() => setShowCreate(true)}>Propose a collaboration</Button>}
        />

        <Flash message={flash} />

        <StatGrid
          stats={[
            { label: "Pending requests", value: String(pending.length), icon: "📥" },
            { label: "Active projects", value: String(activeCollabs.length), icon: "🔬" },
            { label: "My open listings", value: String(listings.filter((l) => l.status === "Open").length), icon: "📢", hint: `${totalInterests} expression(s) of interest` },
            { label: "Logged outputs", value: String(outputs.length), icon: "📄" },
          ]}
        />

        <Tabs
          tabs={[
            { key: "requests", label: `Incoming (${pending.length})` },
            { key: "listings", label: `My listings (${listings.length})` },
            { key: "workspace", label: `Workspaces (${activeCollabs.length})` },
            { key: "outputs", label: `Outputs (${outputs.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "requests" && (
          <div className="space-y-4">
            {SEED_COLLABS.map((c) => {
              const response = responses[c.id];
              return (
                <Card key={c.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground mb-1">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.initiator}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge tone={TYPE_TONE[c.type]}>{c.type}</Badge>
                      {c.funded && <Badge tone="green">Funded</Badge>}
                      <Badge tone={response ? "muted" : c.status === "Active" ? "green" : "amber"}>{response ?? c.status}</Badge>
                    </div>
                  </div>

                  {c.expertise?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {c.expertise.map((e) => {
                        const mine = (user?.researchInterests || []).includes(e);
                        return (
                          <span key={e} className={`text-[10px] px-2 py-0.5 rounded-full ${mine ? "bg-primary/15 text-primary font-medium" : "bg-secondary text-secondary-foreground"}`}>
                            {e}{mine ? " · matches you" : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground mb-4">Deadline: {c.deadline}</div>

                  {c.status === "Pending Review" && !response && (
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => respond(c.id, "Accepted")}>Accept collaboration</Button>
                      <Button variant="outline" onClick={() => respond(c.id, "Declined")}>Decline</Button>
                    </div>
                  )}
                  {(c.status === "Active" || response === "Accepted") && (
                    <Button variant="secondary" size="sm" onClick={() => { setWorkspaceId(c.id); setTab("workspace"); }}>
                      Open project workspace →
                    </Button>
                  )}
                  {response === "Declined" && (
                    <div className="text-sm py-2 text-center rounded-xl font-medium text-muted-foreground bg-muted">Request declined</div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {tab === "listings" && (
          <div className="space-y-4">
            {listings.length === 0 ? (
              <EmptyState icon="📢" title="You haven't published a listing yet" action={<Button size="sm" onClick={() => setShowCreate(true)}>Propose a collaboration</Button>}>
                Publish what you're working on and let other faculty, institutions and industry partners come to you.
              </EmptyState>
            ) : (
              listings.map((l) => {
                const interests = listCollabInterests(l.id);
                return (
                  <Card key={l.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">{l.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {l.collaboratorsNeeded} collaborator{l.collaboratorsNeeded === 1 ? "" : "s"} needed · closes {l.deadline ? formatDate(l.deadline) : "open-ended"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {l.funded && <Badge tone="green">Funded</Badge>}
                        <Select
                          value={l.status}
                          onChange={(e) => { updateCollabListing(l.id, { status: e.target.value }); bump("Listing status updated."); }}
                          className="w-auto text-xs py-1.5"
                        >
                          {["Open", "Closed", "Filled"].map((s) => <option key={s}>{s}</option>)}
                        </Select>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{l.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(l.expertise || []).map((e) => (
                        <span key={e} className="text-[10px] bg-primary/8 text-primary px-2 py-0.5 rounded-full">{e}</span>
                      ))}
                    </div>

                    <div className="border-t border-border pt-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Expressions of interest ({interests.length})
                      </div>
                      {interests.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nobody has responded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {interests.map((i) => (
                            <div key={i.id} className="flex flex-wrap items-start gap-2.5 bg-secondary/50 rounded-xl px-3 py-2.5">
                              <Avatar name={i.name} size={30} />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-foreground">{i.name}</div>
                                <div className="text-[10px] text-muted-foreground">{i.institution}</div>
                                {i.message && <p className="text-[11px] text-muted-foreground mt-1">{i.message}</p>}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Badge tone={i.status === "Accepted" ? "green" : i.status === "Declined" ? "muted" : "amber"}>{i.status}</Badge>
                                {i.status === "Interested" && (
                                  <>
                                    <button onClick={() => { setCollabInterestStatus(i.id, "Accepted"); bump(`${i.name} brought on board.`); }} className="text-[11px] text-primary hover:underline">Accept</button>
                                    <button onClick={() => { setCollabInterestStatus(i.id, "Declined"); bump("Response recorded."); }} className="text-[11px] text-muted-foreground hover:text-foreground">Decline</button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {tab === "workspace" && (
          <>
            {activeCollabs.length === 0 ? (
              <EmptyState icon="🔬" title="No active collaborations">
                Accept an incoming request, or fill one of your own listings, to open a workspace.
              </EmptyState>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {activeCollabs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setWorkspaceId(c.id)}
                      className={`text-xs px-3.5 py-2 rounded-xl border font-medium transition-all text-left max-w-xs truncate ${
                        (workspace?.id || activeCollabs[0].id) === c.id ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
                <Workspace collab={workspace || activeCollabs[0]} user={user} onChange={bump} />
              </>
            )}
          </>
        )}

        {tab === "outputs" && (
          <div className="space-y-4">
            <Section
              title="Research outputs"
              description="Papers, patents and reports logged here count towards the credibility shown on your faculty profile."
              actions={<Button size="sm" onClick={() => setShowOutput(true)}>Log an output</Button>}
            >
              {outputs.length === 0 ? (
                <EmptyState icon="📄" title="Nothing logged yet" action={<Button size="sm" onClick={() => setShowOutput(true)}>Log your first output</Button>}>
                  Record publications and patents so collaborators and institutions can see your track record.
                </EmptyState>
              ) : (
                <div className="space-y-2">
                  {outputs.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-start gap-3 border border-border rounded-xl px-4 py-3">
                      <Badge tone={o.type === "Patent" ? "purple" : "primary"}>{o.type}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{o.title}</div>
                        <div className="text-[11px] text-muted-foreground">{o.venue}{o.year ? ` · ${o.year}` : ""}</div>
                      </div>
                      <button onClick={() => { removeResearchOutput(o.id); bump("Output removed."); }} className="text-xs text-muted-foreground hover:text-red-600">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Propose a collaboration" description="Published as an open call other faculty and industry partners can respond to." onClose={() => setShowCreate(false)} size="lg">
          <ListingForm
            defaultExpertise={user?.researchInterests || []}
            onCancel={() => setShowCreate(false)}
            onSubmit={(data) => {
              createCollabListing(user.id, user.name, { ...data, institution: user.institution });
              setShowCreate(false);
              setTab("listings");
              bump("Listing published.");
            }}
          />
        </Modal>
      )}

      {showOutput && (
        <Modal title="Log a research output" onClose={() => setShowOutput(false)}>
          <OutputForm
            onCancel={() => setShowOutput(false)}
            onSubmit={(data) => {
              addResearchOutput(user.id, data);
              setShowOutput(false);
              bump("Output added to your record.");
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}

function Workspace({ collab, user, onChange }) {
  const [message, setMessage] = useState("");
  const [milestone, setMilestone] = useState({ title: "", due: "", owner: "" });
  const [error, setError] = useState(null);

  const messages = listCollabMessages(collab.id);
  const milestones = listCollabMilestones(collab.id);
  const files = listCollabFiles(collab.id);
  const done = milestones.filter((m) => m.done).length;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError("Please choose a file under 1.5MB.");
    setError(null);
    const dataUrl = await readFileAsDataUrl(file);
    addCollabFile(collab.id, { name: file.name, size: file.size, dataUrl, uploadedBy: user.name });
    e.target.value = "";
    onChange("File added to the shared area.");
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{collab.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{collab.initiator} · {collab.type} · deadline {collab.deadline}</p>
          </div>
          <Badge tone={done === milestones.length && milestones.length > 0 ? "green" : "primary"}>
            {done}/{milestones.length} milestones done
          </Badge>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <Section title="Discussion" description="A lightweight thread for coordinating with your collaborators.">
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 mb-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No messages yet — start the thread.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <Avatar name={m.author} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{m.author}</span>
                        <span className="text-[10px] text-muted-foreground">{relativeTime(m.at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{m.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!message.trim()) return;
                postCollabMessage(collab.id, user.name, message.trim());
                setMessage("");
                onChange();
              }}
              className="flex gap-2"
            >
              <TextInput value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a message…" />
              <Button type="submit" disabled={!message.trim()}>Send</Button>
            </form>
          </Section>
        </Card>

        <Card>
          <Section title="Milestones" description="Track what's due and what's finished.">
            <div className="space-y-2 mb-4">
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No milestones yet.</p>
              ) : (
                milestones.map((m) => (
                  <label key={m.id} className="flex items-start gap-2.5 border border-border rounded-xl px-3 py-2.5 cursor-pointer hover:bg-secondary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!m.done}
                      onChange={() => { toggleCollabMilestone(m.id); onChange(); }}
                      className="w-4 h-4 accent-primary mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm ${m.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{m.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.due ? `Due ${formatDate(m.due)}` : "No due date"}{m.owner ? ` · ${m.owner}` : ""}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!milestone.title.trim()) return;
                addCollabMilestone(collab.id, milestone);
                setMilestone({ title: "", due: "", owner: "" });
                onChange("Milestone added.");
              }}
              className="space-y-2"
            >
              <TextInput value={milestone.title} onChange={(e) => setMilestone((m) => ({ ...m, title: e.target.value }))} placeholder="New milestone" />
              <div className="grid grid-cols-2 gap-2">
                <TextInput type="date" value={milestone.due} onChange={(e) => setMilestone((m) => ({ ...m, due: e.target.value }))} />
                <TextInput value={milestone.owner} onChange={(e) => setMilestone((m) => ({ ...m, owner: e.target.value }))} placeholder="Owner" />
              </div>
              <Button type="submit" variant="outline" size="sm" className="w-full" disabled={!milestone.title.trim()}>Add milestone</Button>
            </form>
          </Section>
        </Card>
      </div>

      <Card>
        <Section title="Shared documents" description="Protocols, datasets and drafts everyone on the project can reach.">
          {error && <Flash message={error} tone="red" />}
          <input
            type="file"
            onChange={handleFile}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary mb-3"
          />
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files shared yet.</p>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 border border-border rounded-xl px-4 py-2.5">
                  <span className="text-base">📎</span>
                  <div className="min-w-0 flex-1">
                    <a href={f.dataUrl} download={f.name} className="text-sm text-primary hover:underline truncate block">{f.name}</a>
                    <div className="text-[10px] text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} KB · {f.uploadedBy} · {relativeTime(f.uploadedAt)}
                    </div>
                  </div>
                  <button onClick={() => { removeCollabFile(f.id); onChange("File removed."); }} className="text-xs text-muted-foreground hover:text-red-600">Remove</button>
                </div>
              ))}
            </div>
          )}
        </Section>
      </Card>
    </div>
  );
}

function ListingForm({ defaultExpertise, onCancel, onSubmit }) {
  const [form, setForm] = useState({ title: "", description: "", collaboratorsNeeded: "2", deadline: "", funded: false, fundingSource: "" });
  const [expertise, setExpertise] = useState(defaultExpertise.slice(0, 3));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...form, collaboratorsNeeded: Number(form.collaboratorsNeeded) || 1, expertise });
      }}
      className="space-y-4"
    >
      <Field label="Title"><TextInput required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Standardisation of regional Rasayana formulations" /></Field>
      <Field label="Description"><TextArea required rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What the project involves and what a collaborator would contribute." /></Field>
      <Field label="Expertise sought" hint="Also used to surface your listing to the right people.">
        <div className="flex flex-wrap gap-2">
          {COLLAB_EXPERTISE.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setExpertise((prev) => (prev.includes(x) ? prev.filter((v) => v !== x) : [...prev, x]))}
              className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium transition-colors ${
                expertise.includes(x) ? "bg-primary text-white border-transparent" : "bg-card border-border text-muted-foreground"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Collaborators needed"><TextInput type="number" min="1" value={form.collaboratorsNeeded} onChange={(e) => set("collaboratorsNeeded", e.target.value)} /></Field>
        <Field label="Deadline to respond"><TextInput type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={form.funded} onChange={(e) => set("funded", e.target.checked)} className="w-4 h-4 accent-primary" />
        This project has funding
      </label>
      {form.funded && <Field label="Funding source"><TextInput value={form.fundingSource} onChange={(e) => set("fundingSource", e.target.value)} placeholder="Institutional seed grant / Ministry scheme" /></Field>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Publish listing</Button>
      </div>
    </form>
  );
}

function OutputForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState({ type: OUTPUT_TYPES[0], title: "", venue: "", year: String(new Date().getFullYear()) });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Field label="Type">
        <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
          {OUTPUT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Title"><TextInput required value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Field label="Journal / venue / office"><TextInput value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="International Journal of Applied Computing & Research" /></Field>
        <Field label="Year"><TextInput value={form.year} onChange={(e) => set("year", e.target.value)} /></Field>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1">Add output</Button>
      </div>
    </form>
  );
}
