"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAttemptsForStudent, getRegistration, listSkillTests, refreshSkillTestsFromServer } from "../../lib/store";
import { useClock, useStoreVersion } from "../../lib/useLiveStore";
import { formatScheduled } from "../../lib/testStatus";
import { isWindowTest, testDurationLabel, testPhase, upcomingSortMs, windowStatusLabel } from "../../lib/testWindow";
import TestCard from "../skilltests/TestCard";
import { Badge, Card, EmptyState } from "../ui/Kit";

/**
 * A community's own tests. Members get the normal test card (register,
 * sample papers, the exam room); the owner and moderators get a summary per
 * test and "Create community test", which opens Host a Skill Test with the
 * audience already set to this community.
 *
 * The list comes from the device's store, which the server fills only with
 * tests this account may see (skillTests.listAll) — a community test never
 * reaches anyone outside the community.
 */
export default function TestsTab({ community, user }) {
  const live = useStoreVersion(["skillTests", "skillTestRegistrations", "assessmentAttempts"]);
  const clock = useClock(30000);
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    refreshSkillTestsFromServer();
  }, [community.id]);

  useEffect(() => {
    setTests(
      listSkillTests()
        .filter((t) => t.audience === "community" && t.communityId === community.id)
        .sort((a, b) => upcomingSortMs(a) - upcomingSortMs(b))
    );
    if (user?.role === "student") setAttempts(getAttemptsForStudent(user.id));
  }, [community.id, user, live, clock]);

  return (
    <div className="space-y-4">
      {community.isStaff && !community.archived && (
        <Card className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            A community test is a normal test in every respect — proctoring, AI papers, certificates, a fixed sitting or an open window — but only members can see, register for and sit it. Members are notified when you publish.
          </div>
          <Link href={`/skill-assessment?community=${encodeURIComponent(community.id)}`} className="inline-flex items-center rounded-xl font-medium px-4 py-2.5 text-sm bg-primary hover:bg-accent text-white">
            + Create community test
          </Link>
        </Card>
      )}

      {!tests.length ? (
        <EmptyState icon="📝" title="No community tests yet">
          {community.isStaff ? "Create one above; it appears here and in every member's My Tests." : "Tests the owner runs for this community appear here."}
        </EmptyState>
      ) : user?.role === "student" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <TestCard key={test.id} test={test} user={user} registration={getRegistration(test.id, user.id)} attempt={attempts.find((a) => a.testId === test.id)} onRefresh={() => refreshSkillTestsFromServer()} />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {tests.map((test) => {
            const phase = testPhase(test);
            return (
              <Card key={test.id} className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="neutral">{test.mode}</Badge>
                  {isWindowTest(test) ? <Badge tone="purple">🪟 {windowStatusLabel(test)}</Badge> : <Badge tone={phase === "ended" ? "muted" : phase === "upcoming" ? "blue" : "green"}>{phase === "ended" ? "Ended" : phase === "upcoming" ? "Upcoming" : "In progress"}</Badge>}
                  {test.cancelledAt && <Badge tone="red">Cancelled</Badge>}
                </div>
                <div className="text-sm font-semibold text-foreground">{test.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  ⏱ {testDurationLabel(test)} · 📅 {formatScheduled(test)} · {test.questionCount || 0} questions
                </div>
                <Link href="/skill-assessment" className="text-xs text-primary hover:underline">
                  Manage in Skill Tests →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
