"use client";

import { useEffect, useState } from "react";
import { useStoreVersion } from "../../lib/useLiveStore";
import DashboardLayout from "../DashboardLayout";
import TestCard from "../skilltests/TestCard";
import MyTests from "../skilltests/MyTests";
import { useAuth } from "../../lib/auth";
import { listSkillTests, listRegistrationsForStudent, getAttemptsForStudent, getRegistration, checkAndRecordMissedTests } from "../../lib/store";
import HostView from "../skilltests/HostView";
import { AyushSystemFilter } from "../AyushSystemSelect";
import { EmptyState, PageHeader, Tabs } from "../ui/Kit";

function StudentView({ user }) {
  const [tab, setTab] = useState("browse");
  const [tests, setTests] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [systemFilter, setSystemFilter] = useState("");

  function refresh() {
    checkAndRecordMissedTests(user.id);
    setTests(listSkillTests());
    setRegistrations(listRegistrationsForStudent(user.id));
    setAttempts(getAttemptsForStudent(user.id));
  }

  const live = useStoreVersion(["skillTests", "skillTestRegistrations", "assessmentAttempts", "credentials"]);
  useEffect(() => { refresh(); }, [user, live]);

  const filteredTests = tests.filter((t) => {
    if (systemFilter && t.ayushSystem !== systemFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title?.toLowerCase().includes(q) ||
      t.domain?.toLowerCase().includes(q) ||
      t.hostName?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  });

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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Tests hosted by industry partners and academic institutions. Register first — for online tests, the meeting link appears here 1 day before the scheduled time; offline tests confirm your reporting details.
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
