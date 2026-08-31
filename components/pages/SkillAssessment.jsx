"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { useAuth } from "../../lib/auth";
import { useNav } from "../../lib/nav";
import { QUESTION_BANK, SKILL_DOMAINS } from "../../lib/questionBank";
import {
  listSkillTests,
  listSkillTestsByOwner,
  createSkillTest,
  getAttemptsForStudent,
  recordAssessmentResult,
  registerForSkillTest,
  isRegisteredForSkillTest,
} from "../../lib/store";
import { formatDate } from "../../lib/match";

const modeColor = {
  Online: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
  Offline: "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
};

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${value}%` }} />
    </div>
  );
}

function TestRunner({ test, onFinish, onCancel }) {
  const questions = QUESTION_BANK[test.domain] || [];
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-sm text-muted-foreground">
        This test doesn't have an online question set configured.
        <button onClick={onCancel} className="block mx-auto mt-4 text-primary hover:underline">← Back to Skill Tests</button>
      </div>
    );
  }

  const q = questions[currentQ];

  function handleSelect(idx) {
    if (revealed) return;
    setSelected(idx);
  }

  function handleNext() {
    const updated = [...answers];
    updated[currentQ] = selected;
    setAnswers(updated);
    if (!revealed) {
      setRevealed(true);
      return;
    }
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  }

  if (finished) {
    const score = answers.filter((a, i) => a === questions[i].correct).length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto py-8 text-center animate-fade-slide">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Test Complete!</h2>
        <p className="text-muted-foreground mb-8">{test.title} · {test.hostName}</p>
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="text-5xl font-bold text-primary mb-2">{pct}%</div>
          <div className="text-muted-foreground text-sm mb-4">{score} of {questions.length} correct</div>
          <ProgressBar value={pct} />
        </div>
        <button onClick={() => onFinish(pct)} className="w-full bg-primary hover:bg-accent text-white py-3 rounded-xl font-medium text-sm transition-all duration-150">
          Save Result to My Skill Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 animate-fade-slide">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Question {currentQ + 1} of {questions.length}</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{test.domain}</span>
        </div>
        <ProgressBar value={((currentQ + (revealed ? 1 : 0)) / questions.length) * 100} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 mb-5">
        <p className="text-base lg:text-lg font-medium text-foreground leading-relaxed mb-7">{q.question}</p>

        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            let cls = "border-border bg-secondary/50 hover:bg-secondary hover:border-border";
            if (selected === idx) {
              cls = revealed
                ? idx === q.correct
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : "border-red-400 bg-red-50 dark:bg-red-950/30"
                : "border-primary bg-primary/8";
            } else if (revealed && idx === q.correct) {
              cls = "border-green-500 bg-green-50 dark:bg-green-950/30";
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)} disabled={revealed} className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm text-foreground transition-all duration-150 ${cls}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-semibold mt-0.5 transition-all ${selected === idx ? "border-primary bg-primary text-white" : "border-muted-foreground text-muted-foreground"}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="leading-relaxed">{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-5 p-4 bg-olive-50 dark:bg-olive-900/20 border border-olive-200 dark:border-olive-800/30 rounded-xl">
            <div className="text-xs font-semibold text-primary mb-1">{selected === q.correct ? "✓ Correct!" : "✗ Incorrect"}</div>
            <p className="text-xs text-foreground/80 leading-relaxed">
              The correct answer is <strong>{String.fromCharCode(65 + q.correct)}: {q.options[q.correct]}</strong>.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150">
          Exit Test
        </button>
        <button onClick={handleNext} disabled={selected === null} className="px-5 py-2.5 rounded-xl bg-primary hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-150 hover:shadow-md">
          {!revealed ? "Submit" : currentQ === questions.length - 1 ? "Finish →" : "Next →"}
        </button>
      </div>
    </div>
  );
}

function StudentCatalog({ user }) {
  const navigate = useNav();
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [activeTest, setActiveTest] = useState(null);

  function refresh() {
    const t = listSkillTests();
    setTests(t);
    setAttempts(getAttemptsForStudent(user.id));
    setRegisteredIds(new Set(t.filter((x) => isRegisteredForSkillTest(x.id, user.id)).map((x) => x.id)));
  }

  useEffect(() => { refresh(); }, [user]);

  function lastScoreFor(testId) {
    const mine = attempts.filter((a) => a.testId === testId).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return mine[0]?.score ?? null;
  }

  function handleFinish(score) {
    recordAssessmentResult(user.id, activeTest.id, activeTest.domain, score);
    setActiveTest(null);
    refresh();
  }

  function handleRegister(test) {
    registerForSkillTest(test.id, user.id);
    refresh();
  }

  if (activeTest) {
    return <TestRunner test={activeTest} onFinish={handleFinish} onCancel={() => setActiveTest(null)} />;
  }

  return (
    <div className="animate-fade-slide space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Tests hosted by industry partners and academic institutions. Online tests score instantly into your skill profile; offline tests are in-person and just need registration.</p>
        <button onClick={() => navigate("student-dashboard")} className="text-sm text-primary font-medium hover:underline flex-shrink-0 ml-4">View my scores →</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test) => {
          const score = lastScoreFor(test.id);
          const isRegistered = registeredIds.has(test.id);
          return (
            <div key={test.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${modeColor[test.mode]}`}>{test.mode}</span>
                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{test.domain}</span>
              </div>
              <div className="text-sm font-semibold text-foreground mb-0.5">{test.title}</div>
              <div className="text-xs text-muted-foreground mb-3">Hosted by {test.hostName}</div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{test.description}</p>

              <div className="text-xs text-muted-foreground mb-4 space-y-1">
                <div>⏱ {test.duration}</div>
                {test.mode === "Offline" && (
                  <>
                    <div>📅 {test.scheduledAt ? formatDate(test.scheduledAt) : "Date to be announced"}</div>
                    <div>📍 {test.venue || "Venue to be announced"}</div>
                  </>
                )}
              </div>

              {score != null && test.mode === "Online" && (
                <div className="mb-3 text-xs font-semibold text-primary">Last score: {score}%</div>
              )}

              {test.mode === "Online" ? (
                <button onClick={() => setActiveTest(test)} className="mt-auto w-full py-2.5 rounded-xl text-sm font-medium bg-primary hover:bg-accent text-white transition-all duration-150">
                  {score != null ? "Retake Test" : "Take Test"}
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(test)}
                  disabled={isRegistered}
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isRegistered ? "bg-primary/10 text-primary cursor-default" : "bg-primary hover:bg-accent text-white"}`}
                >
                  {isRegistered ? "✓ Registered" : "Register"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HostView({ user }) {
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", domain: SKILL_DOMAINS[0], mode: "Online", duration: "15 mins", description: "", scheduledAt: "", venue: "" });

  function refresh() {
    setTests(listSkillTestsByOwner(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  function handleCreate(e) {
    e.preventDefault();
    const hostName = user.companyName || user.institution || user.name;
    createSkillTest(user.id, hostName, {
      title: form.title,
      domain: form.domain,
      mode: form.mode,
      duration: form.duration,
      description: form.description,
      scheduledAt: form.mode === "Offline" ? form.scheduledAt : undefined,
      venue: form.mode === "Offline" ? form.venue : undefined,
    });
    setForm({ title: "", domain: SKILL_DOMAINS[0], mode: "Online", duration: "15 mins", description: "", scheduledAt: "", venue: "" });
    setShowModal(false);
    refresh();
  }

  return (
    <div className="animate-fade-slide space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your Skill Tests</h2>
          <p className="text-sm text-muted-foreground">{tests.length} test{tests.length === 1 ? "" : "s"} hosted</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary hover:bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 hover:shadow-md">
          + Host a Skill Test
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <div className="text-4xl mb-4">📝</div>
          <div className="font-medium text-foreground mb-1">No tests hosted yet</div>
          <div className="text-sm">Host an online or offline skill test to help students showcase relevant skills.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div key={test.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${modeColor[test.mode]}`}>{test.mode}</span>
                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{test.domain}</span>
              </div>
              <div className="text-sm font-semibold text-foreground mb-1">{test.title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{test.description}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl animate-fade-slide max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-foreground text-lg mb-5">Host a Skill Test</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Test Title</label>
                <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Programming Fundamentals Quiz"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Mode</label>
                  <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option>Online</option>
                    <option>Offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Duration</label>
                  <input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="15 mins"
                    className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {form.mode === "Online" ? (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Skill Domain</label>
                  <select value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {SKILL_DOMAINS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Students take a ready-made short quiz for this domain.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Skill / Focus Area</label>
                    <input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="e.g. Case Study & Group Discussion"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
                      <input type="date" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Venue</label>
                      <input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Campus / office address"
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="What does this test evaluate?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-primary hover:bg-accent text-white text-sm font-medium transition-all duration-150">Publish Test</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillAssessment() {
  const { user } = useAuth();
  const isHost = user.role === "industry" || user.role === "academician";

  return (
    <DashboardLayout activePage="skill-assessment" title="Skill Tests">
      {isHost ? <HostView user={user} /> : <StudentCatalog user={user} />}
    </DashboardLayout>
  );
}
