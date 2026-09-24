"use client";

import { useState } from "react";
import RegisterModal from "./RegisterModal";
import TakeTestModal from "./TakeTestModal";
import { canTakeNow, getRegistrationStatus, formatScheduled, isLinkRevealWindow, joinClosedMessage, STATUS_LABEL, STATUS_TONE } from "../../lib/testStatus";
import { isLive, isWindowTest, meetingMode, testDurationLabel, testPhase, windowFairnessLine, windowStatusLabel } from "../../lib/testWindow";
import { registerForSkillTest, confirmOfflineAttendance } from "../../lib/store";
import { Badge, Button, Card } from "../ui/Kit";
import { openStoredFile } from "../../lib/files";
import { ayushSystemLabel, isAyushSystem } from "../../lib/ayush";

const modeTone = {
  Online: "green",
  Offline: "amber",
  Hybrid: "blue",
};

export default function TestCard({ test, user, registration, attempt, onRefresh }) {
  const [showRegister, setShowRegister] = useState(false);
  const [showTest, setShowTest] = useState(false);

  const status = registration ? getRegistrationStatus(test, registration, attempt) : null;
  /* The sitting's own clock, independent of this candidate: whether it is
     running right now (registration closes) or already over. */
  const phase = testPhase(test);
  const live = isLive(phase);
  const isWindow = isWindowTest(test);
  // A window takes registrations for as long as a start is still possible;
  // a fixed sitting only until it begins.
  const canRegister = !test.cancelledAt && (isWindow ? phase === "upcoming" || phase === "open" : !live && phase !== "ended");

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

  /* The exam room monitors an online sitting by itself; a meeting only
     exists if the host chose to run one. */
  const liveMeeting = test.mode !== "Offline" && meetingMode(test) === "live" && phase !== "ended";
  const showMeetingLink = liveMeeting && registration && (isLinkRevealWindow(test) || live);
  const samplePapers = Array.isArray(test.samplePapers) ? test.samplePapers : [];

  return (
    <Card hover className="flex flex-col">
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <Badge tone={modeTone[test.mode]}>{test.mode}</Badge>
        {isAyushSystem(test.ayushSystem) && <Badge tone="primary">{ayushSystemLabel(test.ayushSystem)}</Badge>}
        <Badge tone="neutral">{test.domain}</Badge>
        {test.price > 0 ? <Badge tone="muted">₹{test.price}</Badge> : <Badge tone="primary">Free</Badge>}
        {samplePapers.length > 0 && <Badge tone="blue">📄 Sample paper available</Badge>}
        {test.audience === "community" && <Badge tone="purple">🔒 {test.communityName || "Community only"}</Badge>}
        {isWindow && <Badge tone="purple">🪟 Open window</Badge>}
        {test.cancelledAt ? (
          <Badge tone="muted" className="ml-auto">Cancelled</Badge>
        ) : isWindow && !["completed", "failed", "missed", "cancelled"].includes(status) ? (
          <Badge tone={phase === "open" ? "green" : phase === "locked" ? "amber" : phase === "ended" ? "muted" : "blue"} className="ml-auto">
            {windowStatusLabel(test)}
            {status ? " · Registered" : ""}
          </Badge>
        ) : (
          <>
            {status && <Badge tone={STATUS_TONE[status]} className="ml-auto">{STATUS_LABEL[status]}</Badge>}
            {!status && live && <Badge tone="amber" className="ml-auto">In Progress · Cannot join</Badge>}
            {!status && phase === "ended" && <Badge tone="muted" className="ml-auto">Ended</Badge>}
          </>
        )}
      </div>

      <div className="text-sm font-semibold text-foreground mb-0.5">{test.title}</div>
      <div className="text-xs text-muted-foreground mb-3">Hosted by {test.hostName}</div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{test.description}</p>

      <div className="text-xs text-muted-foreground mb-4 space-y-1">
        {test.prerequisites && <div>📋 {test.prerequisites}</div>}
        <div>⏱ {testDurationLabel(test)}{isWindow ? " once you start" : ""}</div>
        <div>📅 {formatScheduled(test)}</div>
        {isWindow && !test.cancelledAt && phase !== "ended" && <div className="text-foreground">🪟 {windowFairnessLine(test)}</div>}
        {test.mode !== "Online" && test.venue && registration && <div>📍 {test.venue}</div>}

        {/* The joining details belong to the people sitting the test. Showing
            the link (or the venue) on a public card handed anyone who scrolled
            past a way into a paper they never registered for. */}
        {test.mode !== "Offline" && !liveMeeting && phase !== "ended" && (
          <div>🛡️ {test.mode === "Online" ? "Taken in the secure exam room — monitored automatically, no meeting to join." : "The online part runs in the secure exam room — monitored automatically."}</div>
        )}
        {liveMeeting && !registration && <div>🔗 Joining details are sent to registered candidates.</div>}
        {liveMeeting && registration && !showMeetingLink && (
          <div>🔗 Meeting link will appear here 1 day before the test.</div>
        )}
        {showMeetingLink && (
          test.meetingLink ? (
            <div>🔗 <a href={test.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Join meeting ↗</a></div>
          ) : (
            <div>🔗 Meeting link not published yet — check back soon.</div>
          )
        )}
        {/* Sample papers are for everyone: they are what a candidate reads
            before deciding whether to register. */}
        {samplePapers.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-2 space-y-1">
            <div className="text-[11px] font-semibold text-blue-800">📄 Sample paper{samplePapers.length === 1 ? "" : "s"} available</div>
            <div className="flex flex-wrap gap-1.5">
              {samplePapers.map((p, i) => (
                <button
                  key={p.id || p.storageId || i}
                  type="button"
                  onClick={() => openStoredFile(p)}
                  className="text-[11px] font-medium text-primary bg-card border border-border rounded-lg px-2 py-1 hover:border-primary/40"
                >
                  Open {p.fileName || `paper ${i + 1}`} ↗
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!registration && live && !canRegister && (
        <div className="mt-auto text-center text-xs font-semibold text-amber-700 bg-amber-50 rounded-xl py-2.5 px-3">
          {isWindow ? "Closing · No new starts" : "In Progress · Cannot join"}
        </div>
      )}

      {test.cancelledAt && (
        <div className="mt-auto text-center text-xs font-medium text-muted-foreground bg-secondary rounded-xl py-2.5 px-3">
          This test was cancelled by {test.hostName || "its host"}.
        </div>
      )}

      {!registration && phase === "ended" && (
        <div className="mt-auto text-center text-xs font-medium text-muted-foreground bg-secondary rounded-xl py-2.5 px-3">
          This sitting has ended
        </div>
      )}

      {!registration && canRegister && (
        <Button onClick={() => setShowRegister(true)} className="mt-auto w-full">
          Register
        </Button>
      )}

      {registration && status === "upcoming" && (
        <div className="mt-auto text-center text-xs font-medium text-muted-foreground bg-secondary rounded-xl py-2.5">
          {isWindow ? "Registered — you can start once the window opens" : test.mode === "Online" ? "Registered — the paper unlocks at the scheduled time" : "Reporting details confirmed"}
        </div>
      )}

      {registration && status === "cancelled" && !test.cancelledAt && (
        <div className="mt-auto text-center text-xs font-medium text-muted-foreground bg-secondary rounded-xl py-2.5 px-3">
          Your registration was withdrawn{registration.cancelReason === "removed_from_community" ? " — you're no longer a member of this test's community" : ""}.
        </div>
      )}

      {registration && canTakeNow(test, status) && (
        test.mode === "Online" ? (
          <button
            onClick={() => setShowTest(true)}
            className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              status === "in-progress" && !isWindow
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md animate-pulse"
                : "bg-primary text-white hover:bg-accent"
            }`}
          >
            {isWindow ? "Start test" : status === "in-progress" ? "In Progress · Join test now" : "Take the test"}
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

      {registration && status === "locked" && (
        <div className="mt-auto text-center text-xs font-medium text-amber-700 bg-amber-50 rounded-xl py-2.5 px-3 leading-relaxed">
          {joinClosedMessage(test)}
        </div>
      )}

      {registration && status === "ended" && test.mode === "Online" && (
        <div className="mt-auto text-center text-xs font-medium text-muted-foreground bg-secondary rounded-xl py-2.5 px-3 leading-relaxed">
          {isWindow ? "This window has closed — no attempt was recorded." : "This sitting has ended — no attempt was recorded."}
        </div>
      )}

      {registration && status === "awaiting-result" && (
        <div className="mt-auto text-center text-xs font-medium text-amber-700 bg-amber-50 rounded-xl py-2.5 px-3 leading-relaxed">
          {test.mode === "Online" ? "Submitted — your result is loading. Refresh in a moment." : `Attendance recorded — ${test.hostName} will publish your mark.`}
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

      {registration && status === "failed" && (
        <div className="mt-auto text-center text-xs font-semibold text-red-600 bg-red-50 rounded-xl py-2.5 px-3">
          Failed · 0%
          <span className="block font-normal text-[11px] text-red-500 mt-0.5">The exam room ended this attempt; it cannot be sat again.</span>
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
