"use client";

import { useMemo, useState } from "react";
import { authHeaders } from "../../lib/session";
import { AI } from "../../lib/settings";
import { AYUSH_SYSTEM_FIELD_LABEL, isAyushSystem } from "../../lib/ayush";
import {
  BLOOM_LABEL,
  BLOOM_LEVELS,
  DEFAULT_BLOOM_MIX,
  DEFAULT_DIFFICULTY_MIX,
  DIFFICULTY_LABEL,
  DIFFICULTY_LEVELS,
  allocateCounts,
  mixError,
} from "../../lib/topicMap";
import { AyushSystemSelect } from "../AyushSystemSelect";
import FileDrop from "../ui/FileDrop";
import { Button, Field, Modal, ProgressBar, TextInput } from "../ui/Kit";

/**
 * "Generate from my documents".
 *
 * 1. The host uploads 1–10 files (syllabus, notes, slides, a spreadsheet of
 *    topics, a photographed page) and the server reads them into a topic
 *    map, each topic pointing at where in the files it came from.
 * 2. The host edits the map: ticks topics, renames them, adds one by hand,
 *    sets how many questions each gets, and the paper's difficulty, Bloom's
 *    level and single/multiple mix.
 * 3. Questions are written topic by topic, two at a time, with a progress
 *    bar. A topic that fails is reported and the rest carry on; if nothing
 *    comes back the map stays so the host can try again.
 *
 * Every question lands in the editor with its citation for review — nothing
 * is published from here.
 */

const CONCURRENCY = 3;

async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok && data.success, data };
}

function MixRow({ label, keys, labels, value, onChange }) {
  const problem = mixError(value, label);
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label} mix (%)</legend>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <label key={k} className="flex items-center gap-1.5 text-xs text-foreground">
            {labels[k]}
            <input
              type="number"
              min="0"
              max="100"
              value={value[k]}
              onChange={(e) => onChange({ ...value, [k]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              aria-label={`${labels[k]} percent`}
              className="w-14 bg-background border border-border rounded-lg px-2 py-1 text-xs text-center"
            />
          </label>
        ))}
      </div>
      {problem && <p className="text-[11px] text-red-600">{problem}</p>}
    </fieldset>
  );
}

export default function DocumentsGenerateModal({ ayushSystem = "", existing = [], onGenerated, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState("upload"); // upload | map
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState("");
  const [total, setTotal] = useState(20);
  const [difficultyMix, setDifficultyMix] = useState(DEFAULT_DIFFICULTY_MIX);
  const [bloomMix, setBloomMix] = useState(DEFAULT_BLOOM_MIX);
  const [singlePercent, setSinglePercent] = useState(Math.round(AI.MIXED_SINGLE_RATIO * 100));
  const [system, setSystem] = useState(ayushSystem);
  const [audience, setAudience] = useState("");
  const [levelGuess, setLevelGuess] = useState("");
  const [progress, setProgress] = useState(null);
  const [runsLeft, setRunsLeft] = useState(null);

  const chosen = topics.filter((t) => t.checked && t.count > 0);
  const chosenTotal = chosen.reduce((sum, t) => sum + t.count, 0);

  async function readTopics() {
    setError(null);
    if (!files.length) return setError("Upload at least one file first.");
    setBusy(true);
    const { ok, data } = await postJson("/api/ai/topic-map", { sources: files });
    setBusy(false);
    setNotes([...(data.skipped || []), ...(data.truncated || [])]);
    if (!ok) {
      setWarnings(data.warnings || []);
      return setError(data.error || "The files could not be read. Please try again.");
    }
    if (data.aiRunsLeft != null) setRunsLeft(data.aiRunsLeft);
    const counts = allocateCounts(data.topics, total);
    setTopics(data.topics.map((t) => ({ ...t, checked: true, count: counts[t.id] || 0 })));
    setWarnings(data.warnings || []);
    setLevelGuess(data.levelGuess || "");
    if (!isAyushSystem(system) && isAyushSystem(data.ayushSystemGuess)) setSystem(data.ayushSystemGuess);
    if (!audience && data.levelGuess) setAudience(data.levelGuess);
    setStep("map");
  }

  function rebalance(nextTotal = total, list = topics) {
    const active = list.filter((t) => t.checked);
    const counts = allocateCounts(active, nextTotal);
    setTopics(list.map((t) => ({ ...t, count: t.checked ? Math.min(AI.MAX_QUESTIONS, counts[t.id] || 0) : 0 })));
  }

  function patchTopic(id, change) {
    setTopics((list) => list.map((t) => (t.id === id ? { ...t, ...change } : t)));
  }

  function addTopic() {
    const title = newTopic.trim();
    if (!title) return;
    const id = `own-${Date.now().toString(36)}`;
    // A topic the host adds has no citation of its own; its questions are
    // written from whichever parts of the files mention it.
    setTopics((list) => [...list, { id, title, subtopics: [], weight: 2, sources: files.map((f) => ({ fileName: f.fileName, locator: "", quote: "" })), checked: true, count: 3, own: true }]);
    setNewTopic("");
  }

  async function generate() {
    setError(null);
    if (!isAyushSystem(system)) return setError(`Choose the ${AYUSH_SYSTEM_FIELD_LABEL}.`);
    if (!chosen.length) return setError("Tick at least one topic and give it at least one question.");
    if (chosenTotal > AI.MAX_QUESTIONS_PER_RUN) return setError(`At most ${AI.MAX_QUESTIONS_PER_RUN} questions per run — lower some topics' counts.`);
    const mixProblem = mixError(difficultyMix, "Difficulty") || mixError(bloomMix, "Bloom's level");
    if (mixProblem) return setError(mixProblem);

    setBusy(true);
    const collected = [];
    const failures = [];
    let done = 0;
    const queue = [...chosen];
    setProgress({ done: 0, total: queue.length, current: queue[0]?.title });
    const avoidBase = existing.map((q) => ({ text: q.text, options: (q.options || []).map((o) => o.text) }));
    const topicContext = chosen.map(({ id, title, subtopics, sources }) => ({ id, title, subtopics, sources }));
    let left = null;

    async function worker() {
      while (queue.length) {
        const topic = queue.shift();
        setProgress((p) => ({ ...p, current: topic.title }));
        const { ok, data } = await postJson("/api/ai/questions-from-documents", {
          sources: files,
          topics: topicContext,
          topic: { id: topic.id, title: topic.title, subtopics: topic.subtopics, sources: topic.sources },
          count: Math.min(AI.MAX_QUESTIONS, topic.count),
          difficultyMix,
          bloomMix,
          mix: singlePercent >= 100 ? "single" : singlePercent <= 0 ? "multiple" : "mixed",
          singleRatio: singlePercent / 100,
          ayushSystem: system,
          audience,
          avoid: [...avoidBase, ...collected.map((q) => ({ text: q.text }))],
        });
        if (ok) {
          collected.push(...data.questions);
          if (data.aiRunsLeft != null) left = data.aiRunsLeft;
        } else {
          failures.push({ title: topic.title, error: data.error || "failed" });
          // Out of runs for the day: nothing further will succeed.
          if (data.code === "AI_DAILY_LIMIT") queue.length = 0;
        }
        done += 1;
        setProgress((p) => ({ ...p, done }));
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setBusy(false);
    setProgress(null);
    if (left != null) setRunsLeft(left);

    if (!collected.length) {
      return setError(failures[0]?.error ? `Nothing usable came back. ${failures[0].error}` : "Nothing usable came back. Try again, or give the topics fewer questions.");
    }
    onGenerated(collected, {
      generated: collected.length,
      requested: chosenTotal,
      topics: chosen.length,
      failedTopics: failures,
      files: files.map((f) => f.fileName),
    });
  }

  const allocationHint = useMemo(() => `${chosenTotal} question${chosenTotal === 1 ? "" : "s"} across ${chosen.length} topic${chosen.length === 1 ? "" : "s"} (max ${AI.MAX_QUESTIONS_PER_RUN} per run)`, [chosenTotal, chosen.length]);

  return (
    <Modal title="Generate from my documents" description="Upload your notes, syllabus or slides. The AI maps their topics first; you choose what to test." onClose={busy ? undefined : onClose} size="lg">
      <div className="space-y-4">
        {step === "upload" && (
          <>
            <FileDrop purpose="source" maxFiles={AI.MAX_SOURCE_FILES} onChange={setFiles} onBusyChange={setUploading} label="Drop your notes, syllabus, slides or question banks here" />
            <p className="text-[11px] text-muted-foreground">PDF (scanned is fine), Word, PowerPoint, Excel, OpenDocument, text and photos. Older .doc/.ppt/.xls files need to be saved as the newer format first.</p>
          </>
        )}

        {notes.length > 0 && (
          <ul className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 space-y-0.5">
            {notes.map((n, i) => (
              <li key={i}>⚠️ {n}</li>
            ))}
          </ul>
        )}

        {step === "map" && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider">Topic map · {topics.length} topics</div>
              {levelGuess && <div className="text-[11px] text-muted-foreground">Looks like: {levelGuess}</div>}
            </div>
            {warnings.length > 0 && (
              <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <ul className="space-y-2 max-h-[45vh] overflow-y-auto pr-1" aria-label="Topics">
              {topics.map((t) => (
                <li key={t.id} className={`rounded-xl border px-3 py-2.5 ${t.checked ? "border-primary/40 bg-primary/5" : "border-border opacity-70"}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-2" checked={t.checked} aria-label={`Include ${t.title}`} onChange={(e) => patchTopic(t.id, { checked: e.target.checked, count: e.target.checked ? Math.max(1, t.count) : 0 })} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        value={t.title}
                        onChange={(e) => patchTopic(t.id, { title: e.target.value })}
                        aria-label="Topic title"
                        className="w-full bg-transparent text-sm font-medium text-foreground border-b border-transparent focus:border-primary focus:outline-none"
                      />
                      {t.subtopics.length > 0 && <div className="text-[11px] text-muted-foreground">{t.subtopics.join(" · ")}</div>}
                      <div className="flex flex-wrap gap-1">
                        {t.sources.filter((s) => s.locator || s.quote).map((s, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground" title={s.quote}>
                            📄 {s.fileName}
                            {s.locator ? ` · ${s.locator}` : ""}
                          </span>
                        ))}
                        {!t.own && <span className="text-[10px] text-muted-foreground">weight {t.weight}/5</span>}
                      </div>
                    </div>
                    <label className="flex flex-col items-center text-[10px] text-muted-foreground flex-shrink-0">
                      Questions
                      <input
                        type="number"
                        min="0"
                        max={AI.MAX_QUESTIONS}
                        value={t.count}
                        disabled={!t.checked}
                        onChange={(e) => patchTopic(t.id, { count: Math.max(0, Math.min(AI.MAX_QUESTIONS, Math.round(Number(e.target.value) || 0))) })}
                        aria-label={`Questions on ${t.title}`}
                        className="w-14 mt-0.5 bg-background border border-border rounded-lg px-1.5 py-1 text-xs text-center"
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <TextInput value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Add a topic by hand, e.g. Vipaka" aria-label="New topic" />
              <Button type="button" size="sm" variant="outline" onClick={addTopic} disabled={!newTopic.trim()}>
                + Add
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Total questions" hint="Spread across the ticked topics by how much of the material they cover.">
                <div className="flex gap-2">
                  <TextInput type="number" min="1" max={AI.MAX_QUESTIONS_PER_RUN} value={total} onChange={(e) => setTotal(Math.max(1, Math.min(AI.MAX_QUESTIONS_PER_RUN, Math.round(Number(e.target.value) || 1))))} />
                  <Button type="button" size="sm" variant="outline" onClick={() => rebalance(total)}>
                    Spread
                  </Button>
                </div>
              </Field>
              <AyushSystemSelect value={system} onChange={setSystem} required hint="Preselected from the documents; change it if needed." />
            </div>
            <Field label="Audience" hint="Who sits this paper.">
              <TextInput value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. BAMS 2nd Professional" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <MixRow label="Difficulty" keys={DIFFICULTY_LEVELS} labels={DIFFICULTY_LABEL} value={difficultyMix} onChange={setDifficultyMix} />
              <MixRow label="Bloom's level" keys={BLOOM_LEVELS} labels={BLOOM_LABEL} value={bloomMix} onChange={setBloomMix} />
            </div>
            <Field label={`Single-answer questions: ${singlePercent}% · multiple-answer ${100 - singlePercent}%`}>
              <input type="range" min="0" max="100" step="5" value={singlePercent} onChange={(e) => setSinglePercent(Number(e.target.value))} className="w-full" aria-label="Share of single-answer questions" />
            </Field>
            <p className="text-[11px] text-muted-foreground">{allocationHint}</p>
          </>
        )}

        {progress && (
          <div className="space-y-1.5" role="status" aria-live="polite">
            <div className="text-xs text-foreground">
              Topic {Math.min(progress.done + 1, progress.total)} of {progress.total}: {progress.current}…
            </div>
            <ProgressBar value={progress.done} max={progress.total} tone="bg-primary" />
          </div>
        )}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">⚠️ {error}</div>}
        {runsLeft != null && <p className="text-[11px] text-muted-foreground">{runsLeft} AI run{runsLeft === 1 ? "" : "s"} left today.</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {step === "upload" ? (
            <Button type="button" className="flex-1" onClick={readTopics} disabled={busy || uploading || !files.length}>
              {busy ? "Reading your files…" : "Read my documents →"}
            </Button>
          ) : (
            <Button type="button" className="flex-1" onClick={generate} disabled={busy || !chosenTotal}>
              {busy ? "Writing questions…" : `Generate ${chosenTotal} question${chosenTotal === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
