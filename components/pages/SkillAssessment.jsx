"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import TestCard from "../skilltests/TestCard";
import MyTests from "../skilltests/MyTests";
import { useAuth } from "../../lib/auth";
import { SKILL_DOMAINS } from "../../lib/questionBank";
import {
  all,
  findOne,
  listSkillTests,
  listSkillTestsByOwner,
  createSkillTest,
  setSkillTestMeetingLink,
  startSkillTest,
  listRegistrationsForStudent,
  getAttemptsForStudent,
  getAttemptForTest,
  getRegistration,
  hasCredentialForTest,
  checkAndRecordMissedTests,
} from "../../lib/store";
import IssueCredentialModal from "../IssueCredentialModal";
import RecordResultsModal from "../skilltests/RecordResultsModal";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, Select, Tabs, TextArea, TextInput, useFlash } from "../ui/Kit";

function StudentView({ user }) {
  const [tab, setTab] = useState("browse");
  const [tests, setTests] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attempts, setAttempts] = useState([]);

  function refresh() {
    checkAndRecordMissedTests(user.id);
    setTests(listSkillTests());
    setRegistrations(listRegistrationsForStudent(user.id));
    setAttempts(getAttemptsForStudent(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  return (
    <div className="animate-fade-slide space-y-5">
      <PageHeader eyebrow="Skill Tests" title="Assess & Certify Your Skills" subtitle="Take proctored tests hosted by industry partners and institutions to strengthen your verified skill profile." />

      <Tabs
        tabs={[
          { key: "browse", label: "Browse Tests" },
          { key: "mine", label: "My Tests" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "browse" && (
        <>
          <p className="text-sm text-muted-foreground">
            Tests hosted by industry partners and academic institutions. Register first — for online tests, the meeting link appears here 1 day before the scheduled time; offline tests confirm your reporting details.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                user={user}
                registration={getRegistration(test.id, user.id)}
                attempt={attempts.find((a) => a.testId === test.id)}
                onRefresh={refresh}
              />
            ))}
          </div>
        </>
      )}

      {tab === "mine" && <MyTests registrations={registrations} tests={tests} attempts={attempts} />}
    </div>
  );
}

const EMPTY_TEST_FORM = {
  title: "",
  domain: SKILL_DOMAINS[0],
  mode: "Online",
  duration: "15 mins",
  price: "0",
  description: "",
  prerequisites: "",
  certification: "",
  rules: "",
  scheduledAt: "",
  scheduledTime: "10:00",
  venue: "",
  reportingTime: "",
  documentsRequired: "",
  meetingLink: "",
};

function HostView({ user }) {
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_TEST_FORM);
  const [formError, setFormError] = useState(null);
  const [linkDrafts, setLinkDrafts] = useState({});
  const [linkErrors, setLinkErrors] = useState({});
  const [certifyTest, setCertifyTest] = useState(null);
  const [resultsTest, setResultsTest] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [flash, setFlash] = useFlash();

  function refresh() {
    setTests(listSkillTestsByOwner(user.id));
    setRegistrations(all("skillTestRegistrations"));
  }

  /**
   * Registrants for one test, joined to their attempt and to any certificate
   * they already hold, so the issuer can see the whole cohort — including who
   * is already covered — rather than a filtered subset.
   */
  function recipientsFor(testId) {
    return registrations
      .filter((r) => r.testId === testId)
      .map((r) => {
        const student = findOne("users", (u) => u.id === r.userId);
        const attempt = getAttemptForTest(r.userId, testId);
        return {
          id: r.userId,
          name: student?.name || r.name || "Student",
          email: student?.email || r.email || "",
          subtitle: student?.institution || "",
          score: attempt && !attempt.missed ? attempt.score : null,
          attended: Boolean(r.attended),
          alreadyIssued: hasCredentialForTest(r.userId, testId),
        };
      });
  }

  function registrantStats(testId) {
    const rows = recipientsFor(testId);
    return {
      total: rows.length,
      completed: rows.filter((r) => r.score != null).length,
      certified: rows.filter((r) => r.alreadyIssued).length,
    };
  }

  useEffect(() => { refresh(); }, [user]);

  function handleCreate(e) {
    e.preventDefault();
    setFormError(null);

    if (form.mode === "Online" && form.meetingLink.trim()) {
      const scheduled = form.scheduledAt ? new Date(`${form.scheduledAt}T${form.scheduledTime || "00:00"}`).getTime() : null;
      if (scheduled && scheduled - Date.now() < 24 * 60 * 60 * 1000) {
        setFormError("The meeting link must be set at least 24 hours before the test's scheduled start time. Leave it blank and add it later if the test is sooner than that.");
        return;
      }
    }

    const hostName = user.companyName || user.institution || user.name;
    createSkillTest(user.id, hostName, {
      title: form.title,
      domain: form.mode === "Online" ? form.domain : form.domain || "General",
      mode: form.mode,
      duration: form.duration,
      price: Number(form.price) || 0,
      description: form.description,
      prerequisites: form.prerequisites,
      certification: form.certification,
      rules: form.rules.split("\n").map((r) => r.trim()).filter(Boolean),
      scheduledAt: form.scheduledAt || undefined,
      scheduledTime: form.mode === "Online" ? form.scheduledTime : undefined,
      venue: form.mode === "Offline" ? form.venue : undefined,
      reportingTime: form.mode === "Offline" ? form.reportingTime : undefined,
      documentsRequired: form.mode === "Offline" ? form.documentsRequired.split(",").map((d) => d.trim()).filter(Boolean) : undefined,
      meetingLink: form.mode === "Online" ? form.meetingLink.trim() || undefined : undefined,
    });
    setForm(EMPTY_TEST_FORM);
    setShowModal(false);
    refresh();
  }

  function saveLink(testId) {
    try {
      setSkillTestMeetingLink(testId, (linkDrafts[testId] || "").trim());
      setLinkErrors((e) => ({ ...e, [testId]: null }));
      refresh();
    } catch (err) {
      setLinkErrors((e) => ({ ...e, [testId]: err.message }));
    }
  }

  function handleStart(testId) {
    startSkillTest(testId);
    refresh();
  }

  return (
    <div className="animate-fade-slide space-y-5">
      <PageHeader
        eyebrow="Test Hosting"
        title="Your Skill Tests"
        subtitle={`${tests.length} test${tests.length === 1 ? "" : "s"} hosted`}
        actions={<Button onClick={() => setShowModal(true)}>+ Host a Skill Test</Button>}
      />

      {tests.length === 0 ? (
        <EmptyState icon="📝" title="No tests hosted yet">
          Host an online or offline skill test to help students showcase relevant skills.
        </EmptyState>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <Card key={test.id} className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <Badge tone="neutral">{test.mode}</Badge>
                <Badge tone="neutral">{test.domain}</Badge>
                {test.status === "In Progress" && <Badge tone="primary">In Progress</Badge>}
                <Badge tone="primary" className="ml-auto">{test.price > 0 ? `₹${test.price}` : "Free"}</Badge>
              </div>
              <div className="text-sm font-semibold text-foreground mb-1">{test.title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{test.description}</p>

              {test.mode === "Online" && (
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Meeting Link</label>
                  {test.meetingLink && linkDrafts[test.id] === undefined ? (
                    <div className="flex items-center gap-2">
                      <a href={test.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate flex-1">{test.meetingLink}</a>
                      <button onClick={() => setLinkDrafts((d) => ({ ...d, [test.id]: test.meetingLink }))} className="text-[10px] text-muted-foreground hover:text-foreground flex-shrink-0">Edit</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        value={linkDrafts[test.id] ?? ""}
                        onChange={(e) => setLinkDrafts((d) => ({ ...d, [test.id]: e.target.value }))}
                        placeholder="https://meet.google.com/…"
                        className="flex-1 min-w-0 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button onClick={() => saveLink(test.id)} className="text-[10px] font-medium text-primary hover:underline flex-shrink-0">Save</button>
                    </div>
                  )}
                  {linkErrors[test.id] && <p className="text-[10px] text-red-600 mt-1">{linkErrors[test.id]}</p>}
                </div>
              )}

              {(() => {
                const stats = registrantStats(test.id);
                return (
                  <div className="text-[11px] text-muted-foreground mb-3">
                    {stats.total} registered · {stats.completed} completed · {stats.certified} certified
                  </div>
                );
              })()}

              <div className="mt-auto space-y-2">
                <button
                  onClick={() => handleStart(test.id)}
                  disabled={test.status === "In Progress"}
                  className="w-full text-xs font-medium py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary transition-all duration-150"
                >
                  {test.status === "In Progress" ? "Test Started" : "Start Test"}
                </button>
                {/* Online papers are marked by the server. An in-person test
                    has no paper here, so its marks are entered by you — that
                    is the only way an offline score gets recorded. */}
                {test.mode === "Offline" && (
                  <button
                    onClick={() => setResultsTest(test)}
                    disabled={registrantStats(test.id).total === 0}
                    className="w-full text-xs font-medium py-2 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    ✍️ Record results
                  </button>
                )}
                {/* Certificates were only ever awarded automatically to students
                    who scored 50+, and only as a text line in their portfolio.
                    A host can now issue the real, verifiable article. */}
                <button
                  onClick={() => setCertifyTest(test)}
                  disabled={registrantStats(test.id).total === 0}
                  className="w-full text-xs font-medium py-2 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  🏅 Issue certificates
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {resultsTest && (
        <RecordResultsModal
          test={resultsTest}
          issuer={user}
          recipients={recipientsFor(resultsTest.id)}
          onClose={() => {
            setResultsTest(null);
            refresh();
          }}
          onSaved={(count) => {
            refresh();
            setFlash(`Recorded ${count} result${count === 1 ? "" : "s"}. Candidates' skill profiles have been updated.`);
          }}
        />
      )}

      {certifyTest && (
        <IssueCredentialModal
          issuer={user}
          recipients={recipientsFor(certifyTest.id)}
          defaults={{
            title: certifyTest.certification || certifyTest.title,
            kind: "Skill Test",
            testId: certifyTest.id,
          }}
          onClose={() => setCertifyTest(null)}
          onIssued={(count) => {
            setCertifyTest(null);
            refresh();
            setFlash(`Issued ${count} certificate${count === 1 ? "" : "s"}. Recipients have been notified.`);
          }}
        />
      )}

      <Flash message={flash} />

      {showModal && (
        <Modal title="Host a Skill Test" onClose={() => { setShowModal(false); setFormError(null); }} size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Test Title">
              <TextInput required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Programming Fundamentals Quiz" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mode">
                <Select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                  <option>Online</option>
                  <option>Offline</option>
                </Select>
              </Field>
              <Field label="Duration">
                <TextInput value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="15 mins" />
              </Field>
            </div>

            <Field label="Price (₹, 0 for free)">
              <TextInput type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </Field>

            {form.mode === "Online" ? (
              <>
                <Field label="Skill Domain" hint="Students take a ready-made short quiz for this domain.">
                  <Select value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}>
                    {SKILL_DOMAINS.map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Test Date">
                    <TextInput required type="date" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
                  </Field>
                  <Field label="Test Time">
                    <TextInput required type="time" value={form.scheduledTime} onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Meeting Link (optional — add now or later)" hint="Must be set at least 24 hours before the scheduled start.">
                  <TextInput value={form.meetingLink} onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))} placeholder="https://meet.google.com/…" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Skill / Focus Area">
                  <TextInput value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="e.g. Case Study & Group Discussion" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <TextInput required type="date" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
                  </Field>
                  <Field label="Reporting Time">
                    <TextInput value={form.reportingTime} onChange={(e) => setForm((f) => ({ ...f, reportingTime: e.target.value }))} placeholder="9:30 AM" />
                  </Field>
                </div>
                <Field label="Venue">
                  <TextInput value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Campus / office address" />
                </Field>
                <Field label="Documents Required (comma separated)">
                  <TextInput value={form.documentsRequired} onChange={(e) => setForm((f) => ({ ...f, documentsRequired: e.target.value }))} placeholder="Photo ID, Printed resume" />
                </Field>
              </>
            )}

            <Field label="Prerequisites">
              <TextInput value={form.prerequisites} onChange={(e) => setForm((f) => ({ ...f, prerequisites: e.target.value }))} placeholder="What should candidates know beforehand?" />
            </Field>
            <Field label="Certification Awarded">
              <TextInput value={form.certification} onChange={(e) => setForm((f) => ({ ...f, certification: e.target.value }))} placeholder="e.g. Programming Fundamentals Certificate" />
            </Field>
            <Field label="Rules (one per line)">
              <TextArea value={form.rules} onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))} rows={3} placeholder={"Keep your camera on\nNo external notes"} />
            </Field>
            <Field label="Description">
              <TextArea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="What does this test evaluate?" />
            </Field>

            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowModal(false); setFormError(null); }}>Cancel</Button>
              <Button type="submit" className="flex-1">Publish Test</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function SkillAssessment() {
  const { user } = useAuth();
  const isHost = user.role !== "student";

  return (
    <DashboardLayout activePage="skill-assessment" title="Skill Tests">
      {isHost ? <HostView user={user} /> : <StudentView user={user} />}
    </DashboardLayout>
  );
}
