export function formatST(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function SummaryBar({
  taskCount,
  totalST,
  teamBreakdown,
}: {
  taskCount: number;
  totalST: number;
  teamBreakdown: { teamName: string; totalST: number }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
      <span className="font-medium text-text tabular-nums">
        {taskCount} {taskCount === 1 ? "task" : "tasks"} · {formatST(totalST)} ST
      </span>
      {teamBreakdown.length > 0 && (
        <>
          <span className="text-border" aria-hidden="true">
            |
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">ST per team</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-secondary tabular-nums">
            {teamBreakdown.map((t) => (
              <span key={t.teamName}>
                {t.teamName} {formatST(t.totalST)}
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}
