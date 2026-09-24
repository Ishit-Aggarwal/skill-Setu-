"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QuestionEditor from "./QuestionEditor";
import AiGenerateModal from "./AiGenerateModal";
import ImportPaperModal from "./ImportPaperModal";
import SampleQuestionsModal from "./SampleQuestionsModal";
import DocumentsGenerateModal from "./DocumentsGenerateModal";
import RecheckDialog from "./RecheckDialog";
import { api } from "../../convex/_generated/api";
import { backendErrorMessage, backendMutation } from "../../lib/convexBrowser";
import { authHeaders } from "../../lib/session";
import { blankQuestion, validatePaper } from "../../lib/questions";
import { Button } from "../ui/Kit";

/**
 * The two ways in (Section 3.2) and everything after.
 *
 * "Generate with AI" opens the form; "Write manually" drops one empty card
 * into the editor. From there both paths are the same list, and the recheck,
 * duplicate, delete and autosave behaviour does not care where a question
 * came from.
 *
 * Autosave: for a published test (`testId` given) edits go to the server on a
 * short debounce, only when the paper is valid; for a paper still being
 * written in the "Host a test" form they go to a local draft so a closed tab
 * does not lose the work.
 */

const DRAFT_PREFIX = "ayusetu:paperDraft:";

export function readPaperDraft(key) {
  if (typeof window === "undefined" || !key) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPaperDraft(key) {
  if (typeof window === "undefined" || !key) return;
  try {
    window.localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export default function PaperBuilder({ questions, onChange, ayushSystem = "", testId = null, draftKey = null, defaultTopic = "", locked = false, samplePapers = [], onSaved }) {
  const [showGenerate, setShowGenerate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const uploadedSamples = (Array.isArray(samplePapers) ? samplePapers : []).filter((p) => p && p.url);
  const [importNote, setImportNote] = useState(null);
  const [generateMode, setGenerateMode] = useState("replace");
  const [recheck, setRecheck] = useState(null); // { question, result }
  const [recheckingId, setRecheckingId] = useState(null);
  const [recheckBusy, setRecheckBusy] = useState(false);
  const [recheckError, setRecheckError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const timer = useRef(null);
  const lastSaved = useRef(JSON.stringify(questions));
  const dirtyIds = useRef(new Set());

  /* ---- autosave ---- */
  const persist = useCallback(
    async (paper) => {
      const ids = new Set(dirtyIds.current);
      dirtyIds.current = new Set();
      if (testId) {
        const problem = validatePaper(paper);
        if (problem) {
          setSaveStatus({ state: "error", ids, message: "Fix the highlighted question to save" });
          return;
        }
        setSaveStatus({ state: "saving", ids });
        try {
          const out = await backendMutation(api.skillTests.saveQuestions, { testId, questions: paper });
          lastSaved.current = JSON.stringify(paper);
          setSaveStatus({ state: "saved", ids });
          onSaved?.(out);
          setTimeout(() => setSaveStatus((s) => (s?.state === "saved" ? { state: "saved", ids: new Set() } : s)), 1800);
        } catch (err) {
          setSaveStatus({ state: "error", ids, message: backendErrorMessage(err, "Could not save — check your connection") });
        }
      } else if (draftKey) {
        try {
          if (paper.length) window.localStorage.setItem(DRAFT_PREFIX + draftKey, JSON.stringify(paper));
          else window.localStorage.removeItem(DRAFT_PREFIX + draftKey);
          lastSaved.current = JSON.stringify(paper);
          setSaveStatus({ state: "saved", ids });
          setTimeout(() => setSaveStatus((s) => (s?.state === "saved" ? { state: "saved", ids: new Set() } : s)), 1800);
        } catch {
          setSaveStatus({ state: "error", ids, message: "Draft could not be saved in this browser" });
        }
      }
    },
    [testId, draftKey, onSaved]
  );

  useEffect(() => {
    const serialised = JSON.stringify(questions);
    if (serialised === lastSaved.current) return undefined;
    if (locked) return undefined;
    setSaveStatus((s) => ({ state: "saving", ids: new Set([...(s?.ids || []), ...dirtyIds.current]) }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(questions), 900);
    return () => clearTimeout(timer.current);
  }, [questions, persist, locked]);

  function handleChange(next) {
    // Whichever cards changed get the per-card "Saving…"/"Saved" note.
    const before = new Map(questions.map((q) => [q.id, JSON.stringify(q)]));
    next.forEach((q) => {
      if (before.get(q.id) !== JSON.stringify(q)) dirtyIds.current.add(q.id);
    });
    onChange(next);
  }

  /* ---- recheck ---- */
  async function runRecheck(question) {
    setRecheckError(null);
    setRecheckingId(question.id);
    try {
      const res = await fetch("/api/ai/recheck-question", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ question, ayushSystem: question.ayushSystem || ayushSystem }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok || !data.success) {
        setRecheckError(data.error || "Could not recheck this question. Please try again.");
        return;
      }
      setRecheck({ question, result: data });
    } catch {
      setRecheckError("Could not reach the server. Check your connection and try again.");
    } finally {
      setRecheckingId(null);
    }
  }

  async function finishRecheck(accepted) {
    if (!recheck) return;
    const { question, result } = recheck;
    const entry = { at: new Date().toISOString(), verdict: result.verdict, proposed: result.proposed || null, accepted: accepted && Boolean(result.proposed) };
    setRecheckBusy(true);
    try {
      if (testId) {
        await backendMutation(api.skillTests.recordRecheck, {
          testId,
          questionId: question.id,
          verdict: result.verdict,
          proposed: result.proposed || undefined,
          accepted: entry.accepted,
        });
      }
      const history = [...(question.recheckHistory || []), entry];
      const replacement = entry.accepted ? { ...question, ...result.proposed, id: question.id, recheckHistory: history, updatedAt: entry.at } : { ...question, recheckHistory: history };
      // The server has already stored this version; mark it as saved locally
      // so the autosave does not immediately send the same paper again.
      const next = questions.map((q) => (q.id === question.id ? replacement : q));
      if (testId) lastSaved.current = JSON.stringify(next);
      onChange(next);
      setRecheck(null);
    } catch (err) {
      setRecheckError(backendErrorMessage(err, "Could not record the recheck."));
      setRecheck(null);
    } finally {
      setRecheckBusy(false);
    }
  }

  const empty = questions.length === 0;

  return (
    <div className="space-y-3">
      {!locked && (
        <div className={`flex flex-col sm:flex-row gap-2 ${empty ? "rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3" : ""}`}>
          {empty && <p className="text-xs text-muted-foreground sm:self-center flex-1">How do you want to build the paper?</p>}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setGenerateMode(empty ? "replace" : "append");
              setShowGenerate(true);
            }}
          >
            ✨ Generate from a topic
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            title="Upload notes, a syllabus or slides; the AI maps their topics and writes new questions from them"
            onClick={() => {
              setGenerateMode(empty ? "replace" : "append");
              setShowDocuments(true);
            }}
          >
            📚 Generate from my documents
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setGenerateMode(empty ? "replace" : "append");
              setShowImport(true);
            }}
          >
            📄 Import an existing paper
          </Button>
          {uploadedSamples.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              title="Read the attached sample papers and write new questions on the same concepts"
              onClick={() => {
                setGenerateMode(empty ? "replace" : "append");
                setShowSamples(true);
              }}
            >
              🧪 From sample paper{uploadedSamples.length === 1 ? "" : "s"}
            </Button>
          )}
          {empty ? (
            <Button type="button" size="sm" variant="outline" onClick={() => handleChange([blankQuestion({ ayushSystem })])}>
              ✍️ Write manually
            </Button>
          ) : null}
        </div>
      )}

      {recheckError && <p className="text-[11px] text-red-600">⚠️ {recheckError}</p>}
      {importNote && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground">
          <span>{importNote}</span>
          <button type="button" onClick={() => setImportNote(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0" aria-label="Dismiss">×</button>
        </div>
      )}

      <QuestionEditor
        questions={questions}
        onChange={handleChange}
        ayushSystem={ayushSystem}
        saveStatus={saveStatus}
        onRecheck={runRecheck}
        recheckingId={recheckingId}
        locked={locked}
      />

      {showGenerate && (
        <AiGenerateModal
          defaultTopic={defaultTopic}
          ayushSystem={ayushSystem}
          onClose={() => setShowGenerate(false)}
          onGenerated={(generated) => {
            const existing = questions.filter((q) => q.text?.trim() || (q.options || []).some((o) => o.text?.trim()));
            handleChange(generateMode === "append" ? [...existing, ...generated] : generated);
            setShowGenerate(false);
          }}
        />
      )}

      {showImport && (
        <ImportPaperModal
          ayushSystem={ayushSystem}
          onClose={() => setShowImport(false)}
          onImported={(imported, summary) => {
            const existing = questions.filter((q) => q.text?.trim() || (q.options || []).some((o) => o.text?.trim()));
            handleChange(generateMode === "append" ? [...existing, ...imported] : imported);
            setShowImport(false);
            const fileCount = summary.files?.length || 1;
            const bits = [`Imported ${summary.imported} question${summary.imported === 1 ? "" : "s"} from ${fileCount} file${fileCount === 1 ? "" : "s"}.`];
            if (summary.merged) bits.push(`${summary.merged} duplicate${summary.merged === 1 ? "" : "s"} across files ${summary.merged === 1 ? "was" : "were"} merged.`);
            (summary.skipped || []).forEach((s) => bits.push(s.endsWith(".") ? s : `${s}.`));
            (summary.truncated || []).forEach((s) => bits.push(s));
            if (summary.generatedKeys) bits.push(`${summary.generatedKeys} had no answer key in the paper — the answers were generated and are badged AI-generated; please check them.`);
            if (summary.generatedExplanations) bits.push(`${summary.generatedExplanations} explanation${summary.generatedExplanations === 1 ? " was" : "s were"} generated.`);
            if (summary.dropped?.length) bits.push(`${summary.dropped.length} could not be read and were skipped.`);
            setImportNote(bits.join(" "));
          }}
        />
      )}

      {showDocuments && (
        <DocumentsGenerateModal
          ayushSystem={ayushSystem}
          existing={questions.filter((q) => q.text?.trim())}
          onClose={() => setShowDocuments(false)}
          onGenerated={(generated, summary) => {
            const existing = questions.filter((q) => q.text?.trim() || (q.options || []).some((o) => o.text?.trim()));
            handleChange(generateMode === "append" ? [...existing, ...generated] : generated);
            setShowDocuments(false);
            const bits = [`Wrote ${summary.generated} question${summary.generated === 1 ? "" : "s"} across ${summary.topics} topic${summary.topics === 1 ? "" : "s"} from ${summary.files.length} file${summary.files.length === 1 ? "" : "s"}.`];
            if (summary.generated < summary.requested) bits.push(`${summary.requested - summary.generated} fewer than asked for.`);
            (summary.failedTopics || []).forEach((f) => bits.push(`"${f.title}" failed: ${f.error}`));
            bits.push("Each question shows the file it came from — check every answer key before publishing.");
            setImportNote(bits.join(" "));
          }}
        />
      )}

      {showSamples && (
        <SampleQuestionsModal
          samplePapers={uploadedSamples}
          defaultTopic={defaultTopic}
          ayushSystem={ayushSystem}
          onClose={() => setShowSamples(false)}
          onGenerated={(generated, summary) => {
            const existing = questions.filter((q) => q.text?.trim() || (q.options || []).some((o) => o.text?.trim()));
            handleChange(generateMode === "append" ? [...existing, ...generated] : generated);
            setShowSamples(false);
            const bits = [`Wrote ${summary.generated} new question${summary.generated === 1 ? "" : "s"} on the concepts of ${summary.sampleQuestions} sample question${summary.sampleQuestions === 1 ? "" : "s"}.`];
            if (summary.dropped) bits.push(`${summary.dropped} that copied a sample question ${summary.dropped === 1 ? "was" : "were"} dropped.`);
            if (summary.generated < summary.requested) bits.push(`${summary.requested - summary.generated} fewer than requested — generate again to add more.`);
            bits.push("Every question is badged AI-generated; please review each one.");
            setImportNote(bits.join(" "));
          }}
        />
      )}

      {recheck && (
        <RecheckDialog
          question={recheck.question}
          result={recheck.result}
          busy={recheckBusy}
          onAccept={() => finishRecheck(true)}
          onKeep={() => finishRecheck(false)}
          onClose={() => setRecheck(null)}
        />
      )}
    </div>
  );
}
