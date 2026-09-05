"use client";

import { useState } from "react";
import RegisterModal from "./RegisterModal";
import TakeTestModal from "./TakeTestModal";
import { getRegistrationStatus, formatScheduled, isLinkRevealWindow, STATUS_LABEL, STATUS_TONE } from "../../lib/testStatus";
import { registerForSkillTest, confirmOfflineAttendance } from "../../lib/store";
import { Badge, Button, Card } from "../ui/Kit";

const modeTone = {
  Online: "green",
  Offline: "amber",
};

export default function TestCard({ test, user, registration, attempt, onRefresh }) {
  const [showRegister, setShowRegister] = useState(false);
  const [showTest, setShowTest] = useState(false);

  const status = registration ? getRegistrationStatus(test, registration, attempt) : null;

  function handleConfirmRegister(info) {
    registerForSkillTest(test.id, user.id, info);
    setShowRegister(false);
    onRefresh();
  }

  /* In-person tests: confirming attendance records attendance and nothing
     else. The mark is entered by the host afterwards — a candidate scoring
     their own paper is not an assessment. */
  function handleConfirmAttendance() {
    confirmOfflineAttendance(user.id, test.id);
    onRefresh();
  }

  return (
    <Card hover className="flex flex-col">
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <Badge tone={modeTone[test.mode]}>{test.mode}</Badge>
        <Badge tone="neutral">{test.domain}</Badge>
        {test.price > 0 ? <Badge tone="muted">₹{test.price}</Badge> : <Badge tone="primary">Free</Badge>}
        {status && <Badge tone={STATUS_TONE[status]} className="ml-auto">{STATUS_LABEL[status]}</Badge>}
        {!status && test.status === "In Progress" && <Badge tone="amber" className="ml-auto">In Progress · Cannot join</Badge>}
      </div>

      <div className="text-sm font-semibold text-foreground mb-0.5">{test.title}</div>
      <div className="text-xs text-muted-foreground mb-3">Hosted by {test.hostName}</div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{test.description}</p>

      <div className="text-xs text-muted-foreground mb-4 space-y-1">
        {test.prerequisites && <div>📋 {test.prerequisites}</div>}
        <div>⏱ {test.duration}</div>
        <div>📅 {formatScheduled(test)}</div>
        {test.mode === "Offline" && test.venue && <div>📍 {test.venue}</div>}
        {test.mode === "Online" && !isLinkRevealWindow(test) && test.status !== "In Progress" && <div>🔗 Meeting link will appear here 1 day before the test.</div>}
        {test.mode === "Online" && (isLinkRevealWindow(test) || test.status === "In Progress") && (
          test.meetingLink ? (
            <div>🔗 <a href={test.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Join meeting ↗</a></div>
          ) : (
            <div>🔗 Meeting link not published yet — check back soon.</div>
          )
        )}
      </div>

      {!registration && test.status === "In Progress" && (
        <div className="mt-auto text-center text-xs font-semibold text-amber-700 bg-amber-50 rounded-xl py-2.5 px-3">
          In Progress · Cannot join
        </div>
      )}

      {!registration && test.status !== "In Progress" && (
        <Button onClick={() => setShowRegister(true)} className="mt-auto w-full">
          Register
        </Button>
      )}

      {registration && status === "upcoming" && (
        <div className="mt-auto text-center text-xs font-medium text-muted-foreground bg-secondary rounded-xl py-2.5">
          {test.mode === "Online" ? "Registered — the paper unlocks at the scheduled time" : "Reporting details confirmed"}
        </div>
      )}

      {registration && (status === "available" || status === "in-progress") && (
        test.mode === "Online" ? (
          <button
            onClick={() => setShowTest(true)}
            className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              test.status === "In Progress"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md animate-pulse"
                : "bg-primary text-white hover:bg-accent"
            }`}
          >
            {test.status === "In Progress" ? "In Progress · Join test now" : "Take the test"}
          </button>
        ) : (
          <button
            onClick={handleConfirmAttendance}
            className="mt-auto w-full py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-150"
          >
            Confirm I attended
          </button>
        )
      )}

      {registration && status === "awaiting-result" && (
        <div className="mt-auto text-center text-xs font-medium text-amber-700 bg-amber-50 rounded-xl py-2.5 px-3 leading-relaxed">
          Attendance recorded — {test.hostName} will publish your mark.
        </div>
      )}

      {registration && status === "completed" && (
        <div className="mt-auto text-center text-xs font-semibold text-green-700 bg-green-50 rounded-xl py-2.5">
          Completed · {attempt?.score}%
          {attempt?.totalQuestions ? (
            <span className="block font-normal text-[11px] text-green-600 mt-0.5">
              {attempt.correctCount}/{attempt.totalQuestions} correct
            </span>
          ) : null}
        </div>
      )}

      {registration && status === "missed" && (
        <div className="mt-auto text-center text-xs font-semibold text-red-600 bg-red-50 rounded-xl py-2.5">
          Missed · 0%
        </div>
      )}

      {showRegister && <RegisterModal test={test} user={user} onConfirm={handleConfirmRegister} onClose={() => setShowRegister(false)} />}
      {showTest && (
        <TakeTestModal
          test={test}
          user={user}
          onClose={() => {
            setShowTest(false);
            onRefresh();
          }}
          onGraded={onRefresh}
        />
      )}
    </Card>
  );
}
