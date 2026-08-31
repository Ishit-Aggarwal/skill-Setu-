"use client";

import { getRegistrationStatus, formatScheduled } from "../../lib/testStatus";

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

export default function MyTests({ registrations, tests, attempts }) {
  const rows = registrations
    .map((reg) => {
      const test = tests.find((t) => t.id === reg.testId);
      if (!test) return null;
      const attempt = attempts.find((a) => a.testId === reg.testId);
      const status = getRegistrationStatus(test, reg, attempt);
      return { reg, test, attempt, status };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.reg.registeredAt) - new Date(a.reg.registeredAt));

  if (rows.length === 0) {
    return <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">You haven't registered for any skill tests yet.</div>;
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Test</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">Host</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">Scheduled</th>
              <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Score</th>
              <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ reg, test, attempt, status }, i) => (
              <tr key={reg.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{test.title}</div>
                  <div className="text-xs text-muted-foreground">{test.domain}</div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{test.hostName}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{formatScheduled(test)}</td>
                <td className="px-4 py-3 text-center text-sm font-semibold text-foreground">{attempt ? `${attempt.score}%` : "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[status]}`}>{statusLabel[status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
