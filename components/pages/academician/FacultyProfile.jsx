"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../DashboardLayout";
import { useAuth } from "../../../lib/auth";
import { Avatar, Badge, Button, Card, Field, Flash, PageHeader, ProgressRing, Section, Select, StatGrid, TextArea, TextInput, useFlash } from "../../ui/Kit";
import { COLLAB_EXPERTISE, DEPARTMENTS } from "../../../lib/domains";
import { listAdvisees, listCollabListingsByOwner, listPrograms, listResearchOutputs } from "../../../lib/store";
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

  const outputs = useMemo(() => (ready && user ? listResearchOutputs(user.id) : []), [user, ready]);
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
                placeholder="e.g. Data Structures, Operations Management, Dravyaguna Vigyan"
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
                placeholder="e.g. Distributed Systems, Operations Research, Dravyaguna"
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

          {outputs.length > 0 && (
            <Card>
              <Section title="Publication record" description="Logged from the Research Collabs page — shown here as your credibility summary.">
                <div className="space-y-2">
                  {outputs.map((o) => (
                    <div key={o.id} className="flex items-start gap-3 border border-border rounded-xl px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground">{o.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{o.venue}{o.year ? ` · ${o.year}` : ""}</div>
                      </div>
                      <Badge tone={o.type === "Patent" ? "purple" : "primary"}>{o.type}</Badge>
                    </div>
                  ))}
                </div>
              </Section>
            </Card>
          )}

          <Button type="submit" className="w-full" size="lg">Save profile</Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
