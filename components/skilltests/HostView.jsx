"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SKILL_DOMAINS } from "../../lib/questionBank";
import {
  findOne,
  listRegistrationsForHost,
  listSkillTestsByOwner,
  insert,
  setSkillTestMeetingLink,
  startSkillTest,
  getAttemptForTest,
  hasCredentialForTest,
  rescheduleSkillTest,
  patchSkillTest,
  hasTestEnded,
  getTestEndTimestamp,
} from "../../lib/store";
import { TEST_LEAD_HOURS, checkLeadTime, earliestDateAfter, latestScheduleDate } from "../../lib/dates";
import { uploadToStorage } from "../../lib/uploads";
import { clampPenalty, violationsToFail } from "../../lib/grading";
import { openStoredFile } from "../../lib/files";
import { publishSkillTest } from "../../lib/skillTestSync";
import { subscribeToMutations } from "../../lib/sync";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation, backendQuery, isBackendConfigured } from "../../lib/convexBrowser";
import { AYUSH_SYSTEM_FIELD_LABEL, ayushSystemLabel, isAyushSystem, needsAyushRetag } from "../../lib/ayush";
import { AyushSystemSelect, RetagPrompt } from "../AyushSystemSelect";
import { EXAM } from "../../lib/settings";
import { PAPER_TYPE_LABEL, paperCounter } from "../../lib/grading";
import { validatePaper } from "../../lib/questions";
import { autoSubmitMessage } from "../../lib/examState";
import IssueCredentialModal from "../IssueCredentialModal";
import RecordResultsModal from "./RecordResultsModal";
import PaperBuilder, { clearPaperDraft, readPaperDraft } from "./PaperBuilder";
import TestCertificateSettings from "../certificates/TestCertificateSettings";
import { Badge, Button, Card, EmptyState, Field, Flash, Modal, PageHeader, Select, TextArea, TextInput, useFlash } from "../ui/Kit";

/**
 * Hosting tests.
 *
 * The paper is written in PaperBuilder and published to the server with the
 * test: the local card only knows how many questions there are. Every online
 * test is sat in the secure exam room, so the card also exposes the sitting's
 * attempts and each one's proctoring report.
 */

const EMPTY_TEST_FORM = {
  title: "",
  domain: SKILL_DOMAINS[0],
  ayushSystem: "",
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
  questions: [],
  proctored: true,
  faceMonitoring: true,
  violationPenalty: String(EXAM.DEFAULT_VIOLATION_PENALTY),
  autoDisqualifyOn: false,
  autoDisqualifyAfter: String(EXAM.VIOLATION_LIMIT),
  issueCertificate: false,
  minCertificateScore: "",
  samplePapers: [],
};

function genId(prefix = "skillTests") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function paperTypeBadge(test) {
  const label = test.paperType ? PAPER_TYPE_LABEL[test.paperType] : null;
  if (!label) return null;
  return <Badge tone={test.paperType === "mixed" ? "amber" : test.paperType === "multiple" ? "purple" : "blue"}>{label}</Badge>;
}

/* ---------------- Exam & certificate settings shared by create/edit ---------------- */

function ExamSettings({ form, set }) {
  const total = Array.isArray(form.questions) ? form.questions.length : 0;
  const penalty = clampPenalty(form.violationPenalty, total || undefined);
  const toFail = violationsToFail(total, penalty);
  return (
    <div className="rounded-xl border border-border p-3.5 space-y-3">
      <div className="text-xs font-semibold text-primary uppercase tracking-wider">Secure exam room</div>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <input type="checkbox" checked={form.proctored} onChange={(e) => set("proctored", e.target.checked)} className="mt-0.5" />
        <span>
          Record and monitor this test
          <span className="block text-[11px] text-muted-foreground">{EXAM.MONITORING_NOTICE} Fullscreen is enforced and Esc is locked; leaving fullscreen or switching tabs is charged the penalty below.</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <input type="checkbox" checked={form.faceMonitoring !== false} onChange={(e) => set("faceMonitoring", e.target.checked)} className="mt-0.5" disabled={!form.proctored} />
        <span>
          Camera face check
          <span className="block text-[11px] text-muted-foreground">
            Runs on the candidate's own device: no face for {EXAM.FACE.NO_FACE_SECONDS}s, more than one face, or looking away for {EXAM.FACE.LOOK_AWAY_SECONDS}s each count as a violation. A camera switched off fails the test outright.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <span className="mt-0.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1">
          Penalty per violation{" "}
          <input
            type="number"
            min="0"
            max={total || undefined}
            step="1"
            value={form.violationPenalty}
            onChange={(e) => set("violationPenalty", e.target.value)}
            disabled={!form.proctored}
            aria-label="Points deducted per violation"
            className="w-14 mx-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-center"
          />{" "}
          point{penalty === 1 ? "" : "s"}
          <span className="block text-[11px] text-muted-foreground">
            {penalty === 0
              ? "Penalties are off; violations are only recorded for your review."
              : total
              ? `Never more than the paper's ${total} point${total === 1 ? "" : "s"}. On this paper the test fails at violation ${toFail} — the moment the penalties reach the total.`
              : "Never more than the paper's total points. The test fails the moment the penalties reach the total."}
          </span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs text-foreground">
        <input type="checkbox" checked={form.autoDisqualifyOn} onChange={(e) => set("autoDisqualifyOn", e.target.checked)} className="mt-0.5" disabled={!form.proctored} />
        <span className="flex-1">
          Auto-disqualify after{" "}
          <input
            type="number"
            min="1"
            max="50"
            value={form.autoDisqualifyAfter}
            onChange={(e) => set("autoDisqualifyAfter", e.target.value)}
            disabled={!form.autoDisqualifyOn || !form.proctored}
            aria-label="Violations before automatic disqualification"
            className="w-14 mx-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-center"
          />{" "}
          violations
          <span className="block text-[11px] text-muted-foreground">Off by default. When on, the attempt is marked disqualified pending your review; you can reverse it from the proctoring report.</span>
        </span>
      </label>
    </div>
  );
}

/* ---------------- Sample papers (any mode) ---------------- */

/**
 * Up to EXAM.MAX_SAMPLE_PAPERS PDFs a host attaches so candidates can see
 * what the sitting looks like. They live in file storage; the test row keeps
 * the references, and every candidate's test card lists them.
 */
function SamplePapers({ papers, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const list = Array.isArray(papers) ? papers : [];

  async function handleFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    if (list.length + files.length > EXAM.MAX_SAMPLE_PAPERS) return setError(`You can attach up to ${EXAM.MAX_SAMPLE_PAPERS} sample papers.`);
    setError(null);
    setBusy(true);
    try {
      const added = [];
      for (const file of files) {
        const uploaded = await uploadToStorage(file, { kind: "document" });
        added.push({ id: `sample_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, ...uploaded });
      }
      onChange([...list, ...added]);
    } catch (err) {
      setError(err?.message || "That file could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-3.5 space-y-2">
      <div className="text-xs font-semibold text-primary uppercase tracking-wider">Sample papers (optional)</div>
      <p className="text-[11px] text-muted-foreground">Up to {EXAM.MAX_SAMPLE_PAPERS} PDFs candidates can download before the test — a past paper, a specimen, a syllabus.</p>
      {list.length > 0 && (
        <ul className="space-y-1">
          {list.map((p) => (
            <li key={p.id || p.storageId} className="flex items-center gap-2 text-xs text-foreground bg-secondary/50 rounded-lg px-2.5 py-1.5">
              <button type="button" onClick={() => openStoredFile(p)} className="truncate text-left hover:underline flex-1">📄 {p.fileName}</button>
              <button type="button" onClick={() => onChange(list.filter((x) => x !== p))} className="text-red-500 hover:underline flex-shrink-0">Remove</button>
            </li>
          ))}
        </ul>
      )}
      {list.length < EXAM.MAX_SAMPLE_PAPERS && (
        <input
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFiles}
          disabled={busy}
          className="text-xs text-muted-foreground file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      )}
      {busy && <div className="text-[11px] text-muted-foreground">Uploading…</div>}
      {error && <div className="text-[11px] text-red-600">{error}</div>}
    </div>
  );
}

/* ---------------- Attempts & proctoring for one test ---------------- */

function AttemptsModal({ test, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    backendQuery(api.exams.attemptsForTest, { testId: test.id })
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((err) => {
        if (!cancelled) setError(backendErrorMessage(err, "Could not load attempts."));
      });
    return () => {
      cancelled = true;
    };
  }, [test.id]);

  return (
    <Modal title="Attempts & proctoring" description={test.title} onClose={onClose} size="lg">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}
      {!error && rows === null && <p className="text-xs text-muted-foreground">Loading attempts…</p>}
      {rows && rows.length === 0 && <p className="text-xs text-muted-foreground">Nobody has started this test yet.</p>}
      {rows && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="rounded-xl border border-border px-3.5 py-3 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{a.student?.name || a.studentId}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.startedAt ? new Date(a.startedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Not started"}
                  {a.autoSubmitReason ? ` · ${autoSubmitMessage(a.autoSubmitReason)}` : ""}
                </div>
              </div>
              <Badge tone={a.state === "GRADED" ? "green" : a.state === "AUTO_SUBMITTED" ? "amber" : "neutral"}>{a.state.replace(/_/g, " ")}</Badge>
              {a.score != null && <Badge tone={a.score >= 70 ? "green" : a.score >= 50 ? "amber" : "red"}>{a.score}%</Badge>}
              <Badge tone={(a.violationCount || 0) >= EXAM.VIOLATION_LIMIT ? "red" : a.violationCount ? "amber" : "neutral"}>
                {a.violationCount || 0} violation{a.violationCount === 1 ? "" : "s"}
              </Badge>
              {a.disqualified && <Badge tone="red">Disqualified</Badge>}
              <Link href={`/skill-assessment/proctoring/${a.id}`} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                Proctoring report →
              </Link>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Edit the paper of a published test ---------------- */

function EditPaperModal({ test, onClose, onSaved }) {
  const [questions, setQuestions] = useState(null);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    backendQuery(api.skillTests.paperForHost, { testId: test.id })
      .then((r) => {
        if (cancelled) return;
        if (!r?.ok) {
          setError(r?.error || "Could not load the paper.");
          return;
        }
        setQuestions(r.questions);
        setLocked(Boolean(r.locked));
      })
      .catch((err) => {
        if (!cancelled) setError(backendErrorMessage(err, "Could not load the paper."));
      });
    return () => {
      cancelled = true;
    };
  }, [test.id]);

  return (
    <Modal title="Question paper" description={`${test.title} · edits save automatically`} onClose={onClose} size="lg">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">{error}</div>}
      {!error && questions === null && <p className="text-xs text-muted-foreground">Loading the paper…</p>}
      {questions && (
        <PaperBuilder
          questions={questions}
          onChange={setQuestions}
          ayushSystem={test.ayushSystem}
          testId={test.id}
          defaultTopic={test.title}
          locked={locked}
          onSaved={(out) => onSaved?.(out)}
        />
      )}
    </Modal>
  );
}

/* ---------------- The page ---------------- */

export default function HostView({ user }) {
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_TEST_FORM);
  const [formError, setFormError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [linkDrafts, setLinkDrafts] = useState({});
  const [linkErrors, setLinkErrors] = useState({});
  const [certifyTest, setCertifyTest] = useState(null);
  const [resultsTest, setResultsTest] = useState(null);
  const [attemptsTest, setAttemptsTest] = useState(null);
  const [paperTest, setPaperTest] = useState(null);
  const [rescheduleModalTest, setRescheduleModalTest] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ scheduledAt: "", scheduledTime: "10:00", reportingTime: "09:30 AM" });
  const [rescheduleError, setRescheduleError] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [retagging, setRetagging] = useState(null);
  const [flash, setFlash] = useFlash();

  const draftKey = `${user.id}`;

  function refresh() {
    setTests(listSkillTestsByOwner(user.id));
    setRegistrations(listRegistrationsForHost());
  }

  useEffect(() => {
    refresh();
    // Registrations and certificates arrive from other devices through the
    // store's background pull; re-read when it broadcasts.
    return subscribeToMutations(["skillTestRegistrations", "skillTests", "credentials"], refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    const draft = readPaperDraft(draftKey);
    // The id is fixed up front so a per-test certificate override can be
    // saved against it before the test itself is published.
    setForm({ ...EMPTY_TEST_FORM, id: genId(), questions: draft || [] });
    setFormError(null);
    setShowModal(true);
  }

  function recipientsFor(testId) {
    return registrations
      .filter((r) => r.testId === testId)
      .map((r) => {
        const student = findOne("users", (u) => u.id === r.userId) || r.student;
        const attempt = getAttemptForTest(r.userId, testId);
        return {
          id: r.userId,
          name: student?.name || r.name || "Student",
          email: student?.email || r.email || "",
          subtitle: student?.institution || "",
          score: attempt && !attempt.missed ? attempt.score : r.score != null ? r.score : null,
          attended: Boolean(r.attended),
          alreadyIssued: hasCredentialForTest(r.userId, testId),
        };
      });
  }

  function registrantStats(testId) {
    const rows = recipientsFor(testId);
    return { total: rows.length, completed: rows.filter((r) => r.score != null).length, certified: rows.filter((r) => r.alreadyIssued).length };
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);

    const leadError = checkLeadTime(form.scheduledAt, form.scheduledTime, TEST_LEAD_HOURS, "A skill test");
    if (leadError) return setFormError(leadError);
    if (!isAyushSystem(form.ayushSystem)) return setFormError(`Choose the ${AYUSH_SYSTEM_FIELD_LABEL} this test belongs to.`);

    if (form.mode === "Online") {
      const paperError = validatePaper(form.questions);
      if (paperError) return setFormError(paperError);
      if (!isBackendConfigured()) return setFormError("Publishing a paper needs a connection to the shared database. Please try again shortly.");
    }

    if (form.mode === "Online" && form.meetingLink.trim()) {
      const scheduled = new Date(`${form.scheduledAt}T${form.scheduledTime || "00:00"}`).getTime();
      if (scheduled && scheduled - Date.now() < 24 * 60 * 60 * 1000) {
        return setFormError("The meeting link must be set at least 24 hours before the test's scheduled start time. Leave it blank and add it later if the test is sooner than that.");
      }
    }
    if (form.issueCertificate && form.minCertificateScore !== "") {
      const min = Number(form.minCertificateScore);
      if (!Number.isFinite(min) || min < 0 || min > 100) return setFormError("Minimum score to receive a certificate must be between 0 and 100.");
    }
    if (form.mode === "Online" && form.proctored) {
      const penalty = Number(form.violationPenalty);
      if (!Number.isInteger(penalty) || penalty < 0) return setFormError("The penalty per violation must be a whole number of points (0 turns penalties off).");
      if (penalty > form.questions.length) return setFormError(`The penalty per violation can't be more than the paper's ${form.questions.length} point${form.questions.length === 1 ? "" : "s"}.`);
    }

    const hostName = user.companyName || user.instituteName || user.institution || user.name;
    const record = {
      id: form.id || genId(),
      title: form.title,
      domain: form.mode === "Online" ? form.domain : form.domain || "General",
      ayushSystem: form.ayushSystem,
      hostName,
      mode: form.mode,
      duration: form.duration,
      price: Number(form.price) || 0,
      description: form.description,
      prerequisites: form.prerequisites,
      certification: form.certification,
      rules: form.rules.split("\n").map((r) => r.trim()).filter(Boolean),
      scheduledAt: form.scheduledAt,
      scheduledTime: form.scheduledTime,
      venue: form.mode !== "Online" ? form.venue : undefined,
      reportingTime: form.mode !== "Online" ? form.reportingTime : undefined,
      documentsRequired: form.mode !== "Online" ? form.documentsRequired.split(",").map((d) => d.trim()).filter(Boolean) : undefined,
      meetingLink: form.mode !== "Offline" ? form.meetingLink.trim() || undefined : undefined,
      proctored: form.mode === "Online" ? form.proctored : false,
      faceMonitoring: form.mode === "Online" ? form.proctored && form.faceMonitoring !== false : false,
      violationPenalty: form.mode === "Online" && form.proctored ? clampPenalty(form.violationPenalty, form.questions.length) : null,
      samplePapers: form.samplePapers,
      autoDisqualifyAfter: form.mode === "Online" && form.proctored && form.autoDisqualifyOn ? Math.max(1, Math.round(Number(form.autoDisqualifyAfter) || EXAM.VIOLATION_LIMIT)) : null,
      issueCertificate: Boolean(form.issueCertificate),
      minCertificateScore: form.issueCertificate && form.minCertificateScore !== "" ? Number(form.minCertificateScore) : null,
      ownerId: user.id,
      status: "Open",
      postedAt: new Date().toISOString(),
    };

    setPublishing(true);
    try {
      let paper = { questionCount: 0, paperType: null };
      if (form.mode === "Online") {
        paper = await publishSkillTest(record, form.questions);
      } else if (isBackendConfigured()) {
        try {
          await publishSkillTest(record, undefined);
        } catch (err) {
          console.warn("[skillTests] Offline test not mirrored yet:", err?.message || err);
        }
      }
      insert("skillTests", { ...record, questionCount: paper.questionCount || 0, paperType: paper.paperType || null });
      clearPaperDraft(draftKey);
    } catch (err) {
      setPublishing(false);
      return setFormError(backendErrorMessage(err, "Could not publish the test. Please try again."));
    }
    setPublishing(false);
    setForm(EMPTY_TEST_FORM);
    setShowModal(false);
    refresh();
    setFlash("Test published.");
  }

  function retag(test, ayushSystem) {
    setRetagging(test.id);
    patchSkillTest(test.id, { ayushSystem });
    setRetagging(null);
    refresh();
    setFlash(`Tagged "${test.title}" as ${ayushSystemLabel(ayushSystem)}.`);
  }

  function saveLink(testId) {
    try {
      setSkillTestMeetingLink(testId, (linkDrafts[testId] || "").trim());
      setLinkErrors((e) => ({ ...e, [testId]: null }));
      refresh();
      setFlash("Meeting link saved successfully.");
    } catch (err) {
      setLinkErrors((e) => ({ ...e, [testId]: err.message }));
    }
  }

  function handleStart(testId) {
    const targetTest = tests.find((t) => t.id === testId);
    if (targetTest?.mode === "Online" && !targetTest?.meetingLink?.trim()) {
      setFlash("⚠️ Cannot start online test: Please add and save a valid meeting link first.");
      return;
    }
    try {
      startSkillTest(testId);
      refresh();
      setFlash("Test is now live! Registered students can now join.");
    } catch (err) {
      setFlash(`⚠️ ${err.message}`);
    }
  }

  function openReschedule(test) {
    setRescheduleModalTest(test);
    setRescheduleForm({ scheduledAt: test.scheduledAt || "", scheduledTime: test.scheduledTime || "10:00", reportingTime: test.reportingTime || "09:30 AM" });
    setRescheduleError(null);
  }

  function handleRescheduleSubmit(e) {
    e.preventDefault();
    if (!rescheduleModalTest) return;
    setRescheduleError(null);
    const leadError = checkLeadTime(rescheduleForm.scheduledAt, rescheduleForm.scheduledTime, TEST_LEAD_HOURS, "A rescheduled test");
    if (leadError) return setRescheduleError(leadError);
    if (rescheduleModalTest.mode === "Offline") {
      const scheduledTimestamp = rescheduleModalTest.scheduledAt
        ? new Date(`${rescheduleModalTest.scheduledAt}T${rescheduleModalTest.scheduledTime || rescheduleModalTest.reportingTime || "10:00"}`).getTime()
        : null;
      if (scheduledTimestamp && scheduledTimestamp - Date.now() < 24 * 60 * 60 * 1000 && scheduledTimestamp > Date.now()) {
        return setRescheduleError("Cannot reschedule an on-site test within 24 hours of its scheduled start time.");
      }
    }
    try {
      rescheduleSkillTest(rescheduleModalTest.id, {
        scheduledAt: rescheduleForm.scheduledAt,
        scheduledTime: rescheduleForm.scheduledTime,
        reportingTime: rescheduleModalTest.mode === "Offline" ? rescheduleForm.reportingTime : undefined,
      });
      setRescheduleModalTest(null);
      refresh();
      setFlash(`Test rescheduled to ${rescheduleForm.scheduledAt}. Registered students have been notified.`);
    } catch (err) {
      setRescheduleError(err.message);
    }
  }

  const untagged = tests.filter(needsAyushRetag);

  return (
    <div className="animate-fade-slide space-y-5">
      <PageHeader
        eyebrow="Test Hosting"
        title="Your Skill Tests"
        subtitle={`${tests.length} test${tests.length === 1 ? "" : "s"} hosted`}
        actions={<Button onClick={openCreate}>+ Host a Skill Test</Button>}
      />

      {untagged.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          ⚠️ {untagged.length} of your tests need{untagged.length === 1 ? "s" : ""} to be re-tagged with an {AYUSH_SYSTEM_FIELD_LABEL}. Each one has a picker on its card below.
        </div>
      )}

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
                {isAyushSystem(test.ayushSystem) && <Badge tone="primary">{ayushSystemLabel(test.ayushSystem)}</Badge>}
                <Badge tone="neutral">{test.domain}</Badge>
                {paperTypeBadge(test)}
                {test.proctored && <Badge tone="red">🔴 Recorded</Badge>}
                {test.status === "In Progress" && <Badge tone="green">In Progress · Live</Badge>}
                <Badge tone="primary" className="ml-auto">{test.price > 0 ? `₹${test.price}` : "Free"}</Badge>
              </div>
              <div className="text-sm font-semibold text-foreground mb-1">{test.title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{test.description}</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                {test.mode === "Online" ? (test.questionCount ? paperCounter(new Array(test.questionCount).fill(0)) : "Platform question bank") : `${test.mode} sitting`}
                {test.issueCertificate ? ` · certificate ${test.minCertificateScore != null ? `at ${test.minCertificateScore}%+` : "on completion"}` : ""}
                {test.mode === "Online" && test.proctored && test.violationPenalty != null ? ` · −${test.violationPenalty} pt${test.violationPenalty === 1 ? "" : "s"} per violation` : ""}
                {Array.isArray(test.samplePapers) && test.samplePapers.length ? ` · ${test.samplePapers.length} sample paper${test.samplePapers.length === 1 ? "" : "s"}` : ""}
              </p>
              <div className="mb-3">
                <RetagPrompt row={test} what="This test" saving={retagging === test.id} onSave={(slug) => retag(test, slug)} />
              </div>

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
                    {stats.total} eligible/registered · {stats.completed} completed · {stats.certified} certified
                  </div>
                );
              })()}

              <div className="mt-auto space-y-2">
                {test.mode === "Online" && !test.meetingLink?.trim() && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                    ⚠️ Add a meeting link above before starting this online test
                  </div>
                )}
                <button
                  onClick={() => handleStart(test.id)}
                  disabled={test.status === "In Progress" || (test.mode === "Online" && !test.meetingLink?.trim())}
                  className="w-full text-xs font-medium py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary transition-all duration-150"
                >
                  {test.status === "In Progress" ? "Test Started (Live)" : "Start Test"}
                </button>
                {test.mode === "Online" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaperTest(test)} className="text-xs font-medium py-2 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150">
                      📝 Question paper
                    </button>
                    <button onClick={() => setAttemptsTest(test)} className="text-xs font-medium py-2 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150">
                      🎥 Attempts
                    </button>
                  </div>
                )}
                <button onClick={() => openReschedule(test)} className="w-full text-xs font-medium py-2 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150">
                  🗓️ Reschedule Test
                </button>
                {test.mode === "Offline" && (
                  <button onClick={() => setResultsTest(test)} className="w-full text-xs font-medium py-2 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150">
                    ✍️ Record results
                  </button>
                )}
                {hasTestEnded(test) ? (
                  <button onClick={() => setCertifyTest(test)} className="w-full text-xs font-medium py-2 rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150">
                    🏅 Issue certificates
                  </button>
                ) : (
                  <div className="text-[11px] text-muted-foreground bg-secondary/60 border border-border rounded-lg p-2 text-center leading-relaxed">
                    🏅 {test.issueCertificate ? "Certificates are issued automatically on grading" : "Manual certificates unlock when this test finishes"}
                    {!test.issueCertificate && getTestEndTimestamp(test)
                      ? ` — ${new Date(getTestEndTimestamp(test)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`
                      : ""}
                  </div>
                )}
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
          defaults={{ title: certifyTest.certification || certifyTest.title, kind: "Skill Test", testId: certifyTest.id }}
          onClose={() => setCertifyTest(null)}
          onIssued={(count) => {
            setCertifyTest(null);
            refresh();
            setFlash(`Issued ${count} certificate${count === 1 ? "" : "s"}. Recipients have been notified.`);
          }}
        />
      )}

      {attemptsTest && <AttemptsModal test={attemptsTest} onClose={() => setAttemptsTest(null)} />}

      {paperTest && (
        <EditPaperModal
          test={paperTest}
          onClose={() => {
            setPaperTest(null);
            refresh();
          }}
          onSaved={(out) => {
            if (out?.questionCount != null) patchSkillTest(paperTest.id, { questionCount: out.questionCount, paperType: out.paperType });
          }}
        />
      )}

      {rescheduleModalTest && (
        <Modal title={`Reschedule "${rescheduleModalTest.title}"`} description="Set a new date and time for this test. Registered students will automatically receive a schedule update notification." onClose={() => setRescheduleModalTest(null)}>
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <Field label="New Test Date" hint={`At least ${TEST_LEAD_HOURS} hours from now, so registered students get notice.`}>
              <TextInput required type="date" max={latestScheduleDate()} min={earliestDateAfter(TEST_LEAD_HOURS)} value={rescheduleForm.scheduledAt} onChange={(e) => setRescheduleForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
            </Field>
            <Field label="New Test Time">
              <TextInput required type="time" value={rescheduleForm.scheduledTime} onChange={(e) => setRescheduleForm((f) => ({ ...f, scheduledTime: e.target.value }))} />
            </Field>
            {rescheduleModalTest.mode === "Offline" && (
              <Field label="New Reporting Time" hint="What candidates are told to arrive by.">
                <TextInput value={rescheduleForm.reportingTime} onChange={(e) => setRescheduleForm((f) => ({ ...f, reportingTime: e.target.value }))} placeholder="09:30 AM" />
              </Field>
            )}
            {rescheduleError && <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">⚠️ {rescheduleError}</div>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setRescheduleModalTest(null)}>Cancel</Button>
              <Button type="submit" className="flex-1">Confirm & Notify Students</Button>
            </div>
          </form>
        </Modal>
      )}

      <Flash message={flash} />

      {showModal && (
        <Modal title="Host a Skill Test" onClose={() => { if (!publishing) { setShowModal(false); setFormError(null); } }} size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Test Title">
              <TextInput required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. ASU&H Clinical Fundamentals Quiz" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mode">
                <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                  <option>Online</option>
                  <option>Offline</option>
                  <option>Hybrid</option>
                </Select>
              </Field>
              <Field label="Duration">
                <TextInput value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="15 mins" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <AyushSystemSelect value={form.ayushSystem} onChange={(v) => set("ayushSystem", v)} required hint="Which system this test is for. Candidates filter by it." />
              <Field label="Price (₹, 0 for free)">
                <TextInput type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Test Date" hint={`At least ${TEST_LEAD_HOURS} hours (3 days) from today.`}>
                <TextInput required type="date" min={earliestDateAfter(TEST_LEAD_HOURS)} max={latestScheduleDate()} value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
              </Field>
              <Field label="Start Time">
                <TextInput required type="time" value={form.scheduledTime} onChange={(e) => set("scheduledTime", e.target.value)} />
              </Field>
            </div>

            {form.mode === "Online" ? (
              <>
                <Field label="Skill Domain" hint="Which of the student's skill averages this test's mark counts towards.">
                  <Select value={form.domain} onChange={(e) => set("domain", e.target.value)}>
                    {SKILL_DOMAINS.map((d) => <option key={d}>{d}</option>)}
                  </Select>
                </Field>

                <div className="border-t border-border pt-4">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Question paper</div>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Every question is worth one point. Write it yourself or generate it with AI — either way you review every answer key before publishing.
                  </p>
                  <PaperBuilder
                    questions={form.questions}
                    onChange={(questions) => set("questions", questions)}
                    ayushSystem={form.ayushSystem}
                    draftKey={draftKey}
                    defaultTopic={form.title}
                  />
                </div>

                <ExamSettings form={form} set={set} />

                <Field label="Meeting Link (optional — add now or later)" hint="Must be set at least 24 hours before the scheduled start. Only registered candidates ever see it.">
                  <TextInput value={form.meetingLink} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://meet.google.com/…" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Skill / Focus Area">
                  <TextInput value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="e.g. Clinical Case Study & Group Discussion" />
                </Field>
                <Field label="Reporting Time" hint="What candidates are told to arrive by, if it differs from the start.">
                  <TextInput value={form.reportingTime} onChange={(e) => set("reportingTime", e.target.value)} placeholder="9:30 AM" />
                </Field>
                <Field label="Venue">
                  <TextInput value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Campus / office address" />
                </Field>
                <Field label="Documents Required (comma separated)">
                  <TextInput value={form.documentsRequired} onChange={(e) => set("documentsRequired", e.target.value)} placeholder="Photo ID, Printed resume" />
                </Field>
                {form.mode === "Hybrid" && (
                  <Field label="Meeting Link (optional — add now or later)" hint="For the online part of a hybrid sitting. Only registered candidates ever see it.">
                    <TextInput value={form.meetingLink} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://meet.google.com/…" />
                  </Field>
                )}
              </>
            )}

            <SamplePapers papers={form.samplePapers} onChange={(papers) => set("samplePapers", papers)} />

            <Field label="Prerequisites">
              <TextInput value={form.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} placeholder="What should candidates know beforehand?" />
            </Field>
            <Field label="Certification Awarded">
              <TextInput value={form.certification} onChange={(e) => set("certification", e.target.value)} placeholder="e.g. Clinical Fundamentals Certificate" />
            </Field>

            <TestCertificateSettings
              user={user}
              testId={form.id}
              issueCertificate={form.issueCertificate}
              minCertificateScore={form.minCertificateScore}
              mode={form.mode}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />

            <Field label="Rules (one per line)">
              <TextArea value={form.rules} onChange={(e) => set("rules", e.target.value)} rows={3} placeholder={"Keep your camera on\nNo external notes"} />
            </Field>
            <Field label="Description">
              <TextArea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="What does this test evaluate?" />
            </Field>

            {formError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" disabled={publishing} onClick={() => { setShowModal(false); setFormError(null); }}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={publishing}>{publishing ? "Publishing…" : "Publish Test"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

