"use client";

import { useState } from "react";
import RegisterModal from "./RegisterModal";
import { getRegistrationStatus, formatScheduled, isLinkRevealWindow } from "../../lib/testStatus";
import { registerForSkillTest, selfReportOfflineAttendance } from "../../lib/store";
import { Badge, Button, Card } from "../ui/Kit";

const modeTone = {
  Online: "green",
  Offline: "amber",
};

const statusTone = {
  upcoming: "blue",
  available: "primary",
  completed: "green",
  missed: "red",
};

const statusLabel = {
  upcoming: "Upcoming",
  available: "Confirm attendance",
  completed: "Completed",
  missed: "Missed",
};

export default function TestCard({ test, user, registration, attempt, onRefresh }) {
  const [showRegister, setShowRegister] = useState(false);

  const status = registration ? getRegistrationStatus(test, registration, attempt) : null;

  function handleConfirmRegister(info) {
    registerForSkillTest(test.id, user.id, info);
    setShowRegister(false);
    onRefresh();
  }

  function handleSelfReport() {
    selfReportOfflineAttendance(user.id, test.id, test.domain);
    onRefresh();
  }

  return (
    <Card hover className="flex flex-col">
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <Badge tone={modeTone[test.mode]}>{test.mode}</Badge>
        <Badge tone="neutral">{test.domain}</Badge>
        {test.price > 0 ? (
          <Badge tone="muted">₹{test.price}</Badge>
        ) : (
          <Badge tone="primary">Free</Badge>
        )}
        {status && <Badge tone={statusTone[status]} className="ml-auto">{statusLabel[status]}</Badge>}
      </div>

      <div className="text-sm font-semibold text-foreground mb-0.5">{test.title}</div>
      <div className="text-xs text-muted-foreground mb-3">Hosted by {test.hostName}</div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{test.description}</p>

      <div className="text-xs text-muted-foreground mb-4 space-y-1">
        {test.prerequisites && <div>📋 {test.prerequisites}</div>}
        <div>⏱ {test.duration}</div>
        <div>📅 {formatScheduled(test)}</div>
        {test.mode === "Offline" && test.venue && <div>📍 {test.venue}</div>}
        {test.mode === "Online" && !isLinkRevealWindow(test) && <div>🔗 Meeting link will appear here 1 day before the test.</div>}
        {test.mode === "Online" && isLinkRevealWindow(test) && (
          test.meetingLink ? (
            <div>🔗 <a href={test.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">Join meeting</a></div>
          ) : (
            <div>🔗 Meeting link not published yet — check back soon.</div>
          )
        )}
      </div>

      {!registration && (
        <Button onClick={() => setShowRegister(true)} className="mt-auto w-full">
          Register
        </Button>
      )}

      {registration && status === "upcoming" && (
        <div className="mt-auto text-center text-xs font-medium text-muted-foreground bg-secondary rounded-xl py-2.5">
          {test.mode === "Online" ? "Registered — watch for the meeting link" : "Reporting details confirmed"}
        </div>
      )}

      {registration && status === "available" && (
        <button onClick={handleSelfReport} className="mt-auto w-full py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-150">
          {test.mode === "Online" ? "Mark as Completed" : "Mark as Attended"}
        </button>
      )}

      {registration && status === "completed" && (
        <div className="mt-auto text-center text-xs font-semibold text-green-600 bg-green-50 rounded-xl py-2.5">
          {attempt?.score != null ? `Completed · ${attempt.score}%` : "Attended (self-reported)"}
        </div>
      )}

      {registration && status === "missed" && (
        <div className="mt-auto text-center text-xs font-semibold text-red-600 bg-red-50 rounded-xl py-2.5">
          Missed · 0%
        </div>
      )}

      {showRegister && <RegisterModal test={test} user={user} onConfirm={handleConfirmRegister} onClose={() => setShowRegister(false)} />}
    </Card>
  );
}
