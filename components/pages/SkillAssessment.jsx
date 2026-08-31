"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import TestCard from "../skilltests/TestCard";
import MyTests from "../skilltests/MyTests";
import { useAuth } from "../../lib/auth";
import { SKILL_DOMAINS } from "../../lib/questionBank";
import {
  listSkillTests,
  listSkillTestsByOwner,
  createSkillTest,
  listRegistrationsForStudent,
  getAttemptsForStudent,
  getRegistration,
  checkAndRecordMissedTests,
} from "../../lib/store";

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
      <div className="flex bg-secondary rounded-xl p-1 w-full sm:w-auto sm:inline-flex">
        {[
          { key: "browse", label: "Browse Tests" },
          { key: "mine", label: "My Tests" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "browse" && (
        <>
          <p className="text-sm text-muted-foreground">
            Tests hosted by industry partners and academic institutions. Register first — online tests unlock a proctored test room at the scheduled time, offline tests confirm your reporting details.
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

function HostView({ user }) {
  const [tests, setTests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
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
  });

  function refresh() {
    setTests(listSkillTestsByOwner(user.id));
  }

  useEffect(() => { refresh(); }, [user]);

  function handleCreate(e) {
    e.preventDefault();
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
    });
    setForm({ title: "", domain: SKILL_DOMAINS[0], mode: "Online", duration: "15 mins", price: "0", description: "", prerequisites: "", certification: "", rules: "", scheduledAt: "", scheduledTime: "10:00", venue: "", reportingTime: "", documentsRequired: "" });
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
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{test.mode}</span>
                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{test.domain}</span>
                <span className="text-[10px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-full ml-auto">{test.price > 0 ? `₹${test.price}` : "Free"}</span>
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Price (₹, 0 for free)</label>
                <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {form.mode === "Online" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Skill Domain</label>
                    <select value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {SKILL_DOMAINS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Students take a ready-made short quiz for this domain.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Test Date</label>
                      <input required type="date" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Test Time</label>
                      <input required type="time" value={form.scheduledTime} onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                </>
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
                      <input required type="date" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Reporting Time</label>
                      <input value={form.reportingTime} onChange={(e) => setForm((f) => ({ ...f, reportingTime: e.target.value }))} placeholder="9:30 AM"
                        className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Venue</label>
                    <input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Campus / office address"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Documents Required (comma separated)</label>
                    <input value={form.documentsRequired} onChange={(e) => setForm((f) => ({ ...f, documentsRequired: e.target.value }))} placeholder="Photo ID, Printed resume"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Prerequisites</label>
                <input value={form.prerequisites} onChange={(e) => setForm((f) => ({ ...f, prerequisites: e.target.value }))} placeholder="What should candidates know beforehand?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Certification Awarded</label>
                <input value={form.certification} onChange={(e) => setForm((f) => ({ ...f, certification: e.target.value }))} placeholder="e.g. Zoho Programming Fundamentals Certificate"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Rules (one per line)</label>
                <textarea value={form.rules} onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))} rows={3} placeholder={"Keep your camera on\nNo external notes"}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="What does this test evaluate?"
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
      {isHost ? <HostView user={user} /> : <StudentView user={user} />}
    </DashboardLayout>
  );
}
