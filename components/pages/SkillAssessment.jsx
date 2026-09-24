"use client";

import { useEffect, useState } from "react";
import { useClock, useStoreVersion } from "../../lib/useLiveStore";
import DashboardLayout from "../DashboardLayout";
import TestCard from "../skilltests/TestCard";
import MyTests from "../skilltests/MyTests";
import { useAuth } from "../../lib/auth";
import { listSkillTests, listRegistrationsForStudent, getAttemptsForStudent, getRegistration, checkAndRecordMissedTests } from "../../lib/store";
import { isWindowTest, testPhase, upcomingSortMs } from "../../lib/testWindow";
import HostView from "../skilltests/HostView";
import { AyushSystemFilter } from "../AyushSystemSelect";
import { EmptyState, FilterPills, PageHeader, Tabs } from "../ui/Kit";

const SCHEDULE_FILTERS = [
  { value: "all", label: "All" },
  { value: "fixed", label: "Fixed time" },
  { value: "window", label: "Open window" },
];

function StudentView({ user }) {
  const [tab, setTab] = useState("browse");
  const [tests, setTests] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [systemFilter, setSystemFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("all");

  function refresh() {
    checkAndRecordMissedTests(user.id);
    setTests(listSkillTests());
    setRegistrations(listRegistrationsForStudent(user.id));
    setAttempts(getAttemptsForStudent(user.id));
  }

  const live = useStoreVersion(["skillTests", "skillTestRegistrations", "assessmentAttempts", "credentials"]);
  // Cards change with the clock too: a sitting opens, closes to late joiners
  // and ends without anything in the store moving.
  const clock = useClock(30000);
  useEffect(() => { refresh(); }, [user, live, clock]);

  /* A sitting that has ended leaves the catalogue. It stays visible only to
     the candidates who sat it, under "Previous tests". */
  const sat = (t) => {
    const attempt = attempts.find((a) => a.testId === t.id);
    const reg = registrations.find((r) => r.testId === t.id);
    return Boolean(attempt || reg?.attended);
  };
  const previousTests = tests.filter((t) => testPhase(t) === "ended" && sat(t));

  const filteredTests = tests
    .filter((t) => {
    if (testPhase(t) === "ended" || t.cancelledAt) return false;
    // Community-only tests live on their community's page and in My Tests, never in public Browse.
    if (t.audience === "community") return false;
    if (scheduleFilter === "window" && !isWindowTest(t)) return false;
    if (scheduleFilter === "fixed" && isWindowTest(t)) return false;
    if (systemFilter && t.ayushSystem !== systemFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title?.toLowerCase().includes(q) ||
      t.domain?.toLowerCase().includes(q) ||
      t.hostName?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  })
    // Soonest first: a window by its last start, a sitting by its start.
    .sort((a, b) => upcomingSortMs(a) - upcomingSortMs(b));

  return (
    <div className="animate-fade-slide space-y-5">
      <PageHeader eyebrow="Skill Tests" title="Assess & Certify Your Skills" subtitle="Take proctored tests hosted by industry partners and institutions to strengthen your verified skill profile." />

      <Tabs
        tabs={[
          { key: "browse", label: "Browse Tests" },
          { key: "mine", label: "My Tests" },
          { key: "previous", label: `Previous tests${previousTests.length ? ` (${previousTests.length})` : ""}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "browse" && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Tests hosted by industry partners and academic institutions. Register first — online tests open in the secure exam room at the scheduled time (if the host also runs a meeting, its link appears here a day before); offline tests confirm your reporting details.
            </p>
            <div className="relative min-w-[260px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests by name, skill, host..."
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground">✕</button>
              )}
            </div>
          </div>
          <AyushSystemFilter value={systemFilter} onChange={setSystemFilter} />
          <FilterPills label="Schedule" options={SCHEDULE_FILTERS} value={scheduleFilter} onChange={setScheduleFilter} />
          {filteredTests.length === 0 ? (
            <EmptyState icon="🔍" title="No tests match your search">
              Try a different keyword or domain to find skill tests.
            </EmptyState>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTests.map((test) => (
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
          )}
        </>
      )}

      {tab === "mine" && <MyTests registrations={registrations} tests={tests} attempts={attempts} user={user} onRefresh={refresh} />}

      {tab === "previous" && (
        <>
          <p className="text-sm text-muted-foreground">Sittings that have ended. Only candidates who sat a test can see it here.</p>
          {previousTests.length === 0 ? (
            <EmptyState icon="🗂️" title="No previous tests yet">
              A test you have sat appears here once its sitting has ended.
            </EmptyState>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {previousTests.map((test) => (
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
          )}
        </>
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
