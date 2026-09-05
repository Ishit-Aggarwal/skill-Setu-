"use client";

import { useState } from "react";
import AttemptDetailModal from "./AttemptDetailModal";
import TakeTestModal from "./TakeTestModal";
import { formatScheduled, getRegistrationStatus, STATUS_LABEL, STATUS_TONE } from "../../lib/testStatus";
import { Badge, DataTable } from "../ui/Kit";

/**
 * The attempt log.
 *
 * Every row is now a way in rather than a dead end: clicking one opens the
 * full attempt — the marking behind the score, how long it took, when it was
 * sat, and the option to sit it again. Before, the question-by-question review
 * existed for exactly as long as the result dialog stayed open.
 */
export default function MyTests({ registrations, tests, attempts, user, onRefresh }) {
  const [open, setOpen] = useState(null);
  const [retaking, setRetaking] = useState(null);

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
    <>
      <p className="text-xs text-muted-foreground mb-2">
        Select any attempt to see the marking behind the score.
      </p>

      <DataTable
        empty="You haven't registered for any skill tests yet."
        rowKey={(row) => row.reg.id}
        rows={rows}
        onRowClick={(row) => setOpen(row)}
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
            /* The marking is shown alongside the score, so a student can always
               see what the number was computed from. */
            render: ({ attempt }) =>
              attempt ? (
                <div>
                  <span className="text-sm font-semibold text-foreground">{attempt.score}%</span>
                  {attempt.totalQuestions ? (
                    <div className="text-[10px] text-muted-foreground">
                      {attempt.correctCount}/{attempt.totalQuestions} correct
                    </div>
                  ) : null}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            align: "center",
            render: ({ status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>,
          },
          {
            key: "open",
            header: "",
            align: "right",
            render: () => <span className="text-xs text-primary whitespace-nowrap">Details →</span>,
          },
        ]}
      />

      {open && (
        <AttemptDetailModal
          test={open.test}
          registration={open.reg}
          attempt={open.attempt}
          status={open.status}
          onClose={() => setOpen(null)}
          onRetake={() => {
            setRetaking(open.test);
            setOpen(null);
          }}
        />
      )}

      {retaking && user && (
        <TakeTestModal
          test={retaking}
          user={user}
          onClose={() => {
            setRetaking(null);
            onRefresh?.();
          }}
          onGraded={() => onRefresh?.()}
        />
      )}
    </>
  );
}
