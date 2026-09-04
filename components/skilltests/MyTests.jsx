"use client";

import { getRegistrationStatus, formatScheduled } from "../../lib/testStatus";
import { Badge, DataTable } from "../ui/Kit";

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

  return (
    <DataTable
      empty="You haven't registered for any skill tests yet."
      rowKey={(row) => row.reg.id}
      rows={rows}
      columns={[
        {
          key: "test",
          header: "Test",
          render: ({ test }) => (
            <>
              <div className="font-medium text-foreground">{test.title}</div>
              <div className="text-xs text-muted-foreground">{test.domain}</div>
            </>
          ),
        },
        {
          key: "host",
          header: "Host",
          hideBelow: "hidden sm:table-cell",
          render: ({ test }) => <span className="text-xs text-muted-foreground">{test.hostName}</span>,
        },
        {
          key: "scheduled",
          header: "Scheduled",
          hideBelow: "hidden md:table-cell",
          render: ({ test }) => <span className="text-xs text-muted-foreground">{formatScheduled(test)}</span>,
        },
        {
          key: "score",
          header: "Score",
          align: "center",
          render: ({ attempt }) => <span className="text-sm font-semibold text-foreground">{attempt ? `${attempt.score}%` : "—"}</span>,
        },
        {
          key: "status",
          header: "Status",
          align: "center",
          render: ({ status }) => <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>,
        },
      ]}
    />
  );
}
