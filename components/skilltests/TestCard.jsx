"use client";

import { useState } from "react";
import RegisterModal from "./RegisterModal";
import { getRegistrationStatus, formatScheduled } from "../../lib/testStatus";
import { registerForSkillTest, selfReportOfflineAttendance } from "../../lib/store";

const modeColor = {
  Online: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
  Offline: "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
};

const statusBadge = {
  upcoming: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300",
  available: "text-primary bg-primary/10",
  completed: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400",
  missed: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
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
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${modeColor[test.mode]}`}>{test.mode}</span>
        <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{test.domain}</span>
        {test.price > 0 ? (
          <span className="text-[10px] font-semibold text-foreground bg-muted px-2 py-0.5 rounded-full">₹{test.price}</span>
        ) : (
          <span className="text-[10px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-full">Free</span>
        )}
        {status && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto ${statusBadge[status]}`}>{statusLabel[status]}</span>}
      </div>

      <div className="text-sm font-semibold text-foreground mb-0.5">{test.title}</div>
      <div className="text-xs text-muted-foreground mb-3">Hosted by {test.hostName}</div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{test.description}</p>

      <div className="text-xs text-muted-foreground mb-4 space-y-1">
        {test.prerequisites && <div>📋 {test.prerequisites}</div>}
        <div>⏱ {test.duration}</div>
        <div>📅 {formatScheduled(test)}</div>
        {test.mode === "Offline" && test.venue && <div>📍 {test.venue}</div>}
        {test.mode === "Online" && <div>🔗 Meeting link will appear here 1 day before the test.</div>}
      </div>

      {!registration && (
        <button onClick={() => setShowRegister(true)} className="mt-auto w-full py-2.5 rounded-xl text-sm font-medium bg-primary hover:bg-accent text-white transition-all duration-150">
          Register
        </button>
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
        <div className="mt-auto text-center text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-xl py-2.5">
          {attempt?.score != null ? `Completed · ${attempt.score}%` : "Attended (self-reported)"}
        </div>
      )}

      {registration && status === "missed" && (
        <div className="mt-auto text-center text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl py-2.5">
          Missed · 0%
        </div>
      )}

      {showRegister && <RegisterModal test={test} user={user} onConfirm={handleConfirmRegister} onClose={() => setShowRegister(false)} />}
    </div>
  );
}
