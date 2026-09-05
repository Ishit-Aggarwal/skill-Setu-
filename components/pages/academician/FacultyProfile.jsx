"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, Field, Flash, Modal, PageHeader, ProgressRing, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { COLLAB_EXPERTISE, DEPARTMENTS } from "../../../lib/domains";
import { addResearchOutput, listAdvisees, listCollabListingsByOwner, listPrograms, listResearchOutputs, removeResearchOutput, updateResearchOutput } from "../../../lib/store";
import { hasFile, openStoredFile, readFileAsDataUrl } from "../../../lib/files";
import TagInput from "../../TagInput";
import { api } from "../../../convex/_generated/api";
import { backendQuerySafe, isBackendConfigured } from "../../../lib/convexBrowser";
import { getSessionToken } from "../../../lib/session";
import { formatDateTime } from "../../../lib/match";

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Reader", "Lecturer", "Research Officer", "Head of Department", "Dean"];

/**
 * A faculty profile with enough substance to actually match on. The previous
 * version stored three fields (name, institution, department) which meant
 * Research Collabs had literally no data to match collaborators against.
 */
export default function FacultyProfile() {
  const { user, updateProfile } = useAuth();
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useFlash();
  const [form, setForm] = useState({
    name: "",
    designation: DESIGNATIONS[1],
    institution: "",
    department: "",
    email: "",
    phone: "",
    experienceYears: "",
    bio: "",
    linkedIn: "",
    scholarUrl: "",
    orcid: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [interests, setInterests] = useState([]);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      designation: user.designation || DESIGNATIONS[1],
      institution: user.institution || "",
      department: user.department || "",
      email: user.email || "",
      phone: user.phone || "",
      experienceYears: user.experienceYears || "",
      bio: user.bio || "",
      linkedIn: user.linkedIn || "",
      scholarUrl: user.scholarUrl || "",
      orcid: user.orcid || "",
    });
    setSubjects(user.subjectsTaught || []);
    setInterests(user.researchInterests || []);
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (!isBackendConfigured() || !getSessionToken()) return undefined;
    let cancelled = false;
    backendQuerySafe(api.mentorship.mySlots, {}, []).then((rows) => {
      if (!cancelled) setSlots(rows || []);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [pubVersion, setPubVersion] = useState(0);
  const [editingPub, setEditingPub] = useState(null);

  const outputs = useMemo(() => (ready && user ? listResearchOutputs(user.id) : []), [user, ready, pubVersion]);
  const listings = useMemo(() => (ready && user ? listCollabListingsByOwner(user.id) : []), [user, ready]);
  const advisees = useMemo(() => (ready && user ? listAdvisees(user.id) : []), [user, ready]);
  const programs = useMemo(() => (ready && user ? listPrograms().filter((p) => p.ownerId === user.id) : []), [user, ready]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    updateProfile({ ...form, subjectsTaught: subjects, researchInterests: interests });
    setFlash("Faculty profile saved.");
  }

  const completeness = useMemo(() => {
    const checks = [
      form.name,
      form.designation,
      form.department,
      form.email,
      form.experienceYears,
      form.bio,
      subjects.length,
      interests.length,
      form.scholarUrl || form.orcid || form.linkedIn,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, subjects, interests]);

  if (!ready) return null;

  return (
    <DashboardLayout activePage="academician-profile" title="Faculty Profile">
      <div className="animate-fade-slide max-w-3xl space-y-5">
        <PageHeader
          title="Faculty Profile"
          subtitle="Your research interests here are what Research Collabs matches listings against — an empty profile means no matches."
        />

        <Flash message={flash} />

        <Card>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="flex-shrink-0 flex sm:flex-col items-center gap-3 sm:border-r sm:border-border sm:pr-6">
              <ProgressRing
                value={completeness}
                size={88}
                stroke={8}
                tone={completeness >= 80 ? "green" : completeness >= 50 ? "amber" : "red"}
                sublabel="Profile complete"
              />
            </div>
            <div className="flex-1 w-full min-w-0">
              <StatGrid
                columns={3}
                stats={[
                  { label: "Publications & patents", value: String(outputs.length), icon: "📄", hint: `${outputs.filter((o) => o.type === "Patent").length} patent(s)` },
                  { label: "Ongoing projects", value: String(listings.length), icon: "🔬" },
                  { label: "Advisees mentored", value: String(advisees.length), icon: "🎓", hint: `${programs.length} programme(s) hosted` },
                ]}
              />
            </div>
          </div>
        </Card>

        <form onSubmit={submit} className="space-y-5">
          <Card>
            <div className="flex items-center gap-4 mb-5">
              <Avatar name={form.name} size={64} src={user?.avatarDataUrl} />
              <div className="min-w-0">
                <div className="text-lg font-semibold text-foreground truncate">{form.name || "Your name"}</div>
                <div className="text-sm text-muted-foreground truncate">{form.designation} · {form.department || "Department"}</div>
                <div className="text-xs text-muted-foreground truncate">{form.institution}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Full name"><TextInput required value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
                <Field label="Designation">
                  <Select value={form.designation} onChange={(e) => set("designation", e.target.value)}>
                    {[...new Set([...DESIGNATIONS, form.designation].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label="Institution"><TextInput value={form.institution} onChange={(e) => set("institution", e.target.value)} /></Field>
                <Field label="Department">
                  <Select value={form.department} onChange={(e) => set("department", e.target.value)}>
                    <option value="">Select a department</option>
                    {[...new Set([...DEPARTMENTS, form.department].filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
                <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                <Field label="Phone"><TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                <Field label="Years of experience"><TextInput type="number" min="0" value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} placeholder="14" /></Field>
              </div>
              <Field label="Short bio" hint="Shown to students booking mentoring and to prospective collaborators.">
                <TextArea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Clinical and research focus, notable work, what you'd like to collaborate on." />
              </Field>
            </div>
          </Card>

          <Card>
            <Section title="Subjects taught" description="Helps students find the right faculty member for mentoring.">
              <TagInput
                value={subjects}
                onChange={setSubjects}
                placeholder="e.g. Data Structures, Operations Management, Constitutional Law"
                inputLabel="Add a subject you teach"
                maxTags={25}
              />
            </Section>
          </Card>

          <Card>
            <Section
              title="Research interests"
              description="Type whatever you actually work on. These are the matching signal for Research Collabs — a listing tagged with one of your interests is highlighted as a match."
            >
              {/* Free text, not a preset grid. A fixed list of chips could only
                  describe the fields whoever wrote the list had in mind, and it
                  left everyone else with no way to describe their own work. */}
              <TagInput
                value={interests}
                onChange={setInterests}
                placeholder="e.g. Distributed Systems, Operations Research, Structural Dynamics"
                inputLabel="Add a research interest"
                emptyHint="None added yet — Research Collabs has nothing to match you on."
                suggestions={COLLAB_EXPERTISE}
                maxTags={20}
              />
              {interests.length > 0 && interests.length < 2 && (
                <p className="text-xs text-amber-600 mt-3">
                  Add at least one more — matching works better with a couple of interests to compare against.
                </p>
              )}
            </Section>
          </Card>

          {/* Availability belongs on the profile as well as on the calendar —
              a student deciding whether to approach this mentor wants to know
              whether they hold office hours at all. */}
          <Card>
            <Section
              title="Office-hours availability"
              description="Published slots students can book. Manage them on the Mentorship page."
            >
              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No availability published. Students can&apos;t book time with you until you add a slot.
                </p>
              ) : (
                <div className="space-y-2">
                  {slots.slice(0, 4).map((s) => {
                    const booked = (s.bookings || []).filter((b) => b.status !== "Cancelled").length;
                    return (
                      <div key={s.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5">
                        <span className="text-sm flex-shrink-0">📅</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-foreground truncate">{s.title || "Office hours"}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {formatDateTime(s.slot)} · {s.durationMins || 30} min · {s.mode}
                          </div>
                        </div>
                        <Badge tone={booked >= (s.capacity || 1) ? "blue" : booked ? "amber" : "green"}>
                          {booked}/{s.capacity || 1} booked
                        </Badge>
                      </div>
                    );
                  })}
                  {slots.length > 4 && (
                    <p className="text-[11px] text-muted-foreground">{slots.length - 4} more on your calendar.</p>
                  )}
                </div>
              )}
            </Section>
          </Card>

          <Card>
            <Section title="Academic profiles" description="Public links other researchers can verify you against.">
              <div className="space-y-3">
                <Field label="Google Scholar"><TextInput value={form.scholarUrl} onChange={(e) => set("scholarUrl", e.target.value)} placeholder="https://scholar.google.com/citations?user=…" /></Field>
                <Field label="ORCID"><TextInput value={form.orcid} onChange={(e) => set("orcid", e.target.value)} placeholder="0000-0002-1825-0097" /></Field>
                <Field label="LinkedIn"><TextInput value={form.linkedIn} onChange={(e) => set("linkedIn", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
              </div>
            </Section>
          </Card>

          <Card>
            <Section
              title="Publication record"
              description="Logged from your research activities — shown on your profile and directory listing as your credibility summary."
              action={
                <Button size="sm" variant="outline" onClick={() => setEditingPub({ isNew: true })}>
                  + Add publication
                </Button>
              }
            >
              {outputs.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted-foreground mb-3">No publications or patents added yet.</p>
                  <Button size="sm" onClick={() => setEditingPub({ isNew: true })}>
                    Add your first publication
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {outputs.map((o) => (
                    <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border rounded-xl p-3.5 bg-card">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{o.title}</span>
                          <Badge tone={o.type === "Patent" ? "purple" : "primary"}>{o.type}</Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {o.venue || o.journalOrConference || "Independent"}
                          {o.year ? ` · ${o.year}` : ""}
                        </div>
                        {(o.url || hasFile({ dataUrl: o.fileDataUrl })) && (
                          <button
                            type="button"
                            onClick={() => openStoredFile({ dataUrl: o.fileDataUrl, url: o.url, fileName: o.fileName })}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium mt-1.5"
                          >
                            {o.fileDataUrl ? `📄 ${o.fileName || "View PDF"}` : "🔗 View publication ↗"}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        <Button size="xs" variant="outline" onClick={() => setEditingPub(o)}>
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => {
                            removeResearchOutput(o.id);
                            setPubVersion((v) => v + 1);
                            setFlash(`Removed "${o.title}".`);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </Card>

          <Button type="submit" className="w-full" size="lg">Save profile</Button>
        </form>
      </div>

      {editingPub && (
        <PublicationModal
          pub={editingPub.isNew ? null : editingPub}
          onCancel={() => setEditingPub(null)}
          onSave={(data) => {
            if (editingPub.id) {
              updateResearchOutput(editingPub.id, data);
              setFlash("Publication updated.");
            } else {
              addResearchOutput(user.id, data);
              setFlash("Publication added.");
            }
            setPubVersion((v) => v + 1);
            setEditingPub(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}

function PublicationModal({ pub, onCancel, onSave }) {
  const [title, setTitle] = useState(pub?.title || "");
  const [type, setType] = useState(pub?.type || "Journal Article");
  const [venue, setVenue] = useState(pub?.venue || pub?.journalOrConference || "");
  const [year, setYear] = useState(pub?.year ? String(pub.year) : "");
  const [url, setUrl] = useState(pub?.url || "");
  const [fileName, setFileName] = useState(pub?.fileName || "");
  const [fileDataUrl, setFileDataUrl] = useState(pub?.fileDataUrl || "");
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFileName(file.name);
      setFileDataUrl(dataUrl);
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type,
      venue: venue.trim(),
      year: year.trim(),
      url: url.trim() || undefined,
      fileName: fileName || undefined,
      fileDataUrl: fileDataUrl || undefined,
    });
  }

  return (
    <Modal
      title={pub?.id ? "Edit publication" : "Add publication"}
      description="Attach a DOI/URL link or upload a PDF document."
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" required>
          <TextInput
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Resilient Transformer Architectures for Multimodal Perception"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {["Journal Article", "Conference Proceeding", "Book Chapter", "Patent", "Technical Report", "Working Paper"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Year">
            <TextInput
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2025"
            />
          </Field>
        </div>

        <Field label="Journal / Conference / Venue">
          <TextInput
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. IEEE Transactions on Neural Networks"
          />
        </Field>

        <Field label="Publication URL / DOI link" hint="Optional web link to publisher or preprint repository">
          <TextInput
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://doi.org/..."
          />
        </Field>

        <Field label="Upload publication document (PDF)" hint="Attach a copy directly for viewers to read">
          <div className="space-y-2">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="text-xs text-muted-foreground file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {uploading && <div className="text-xs text-muted-foreground">Reading file...</div>}
            {fileName && !uploading && (
              <div className="flex items-center gap-2 text-xs text-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg">
                <span>📄 {fileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFileName("");
                    setFileDataUrl("");
                  }}
                  className="text-xs text-red-500 hover:underline ml-auto"
                >
                  Remove file
                </button>
              </div>
            )}
          </div>
        </Field>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            {pub?.id ? "Save changes" : "Add publication"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
