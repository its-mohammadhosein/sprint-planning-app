"use client";

import { useEffect, useState } from "react";

const EXIT_DURATION_MS = 120;

export function BulkActionBar({
  count,
  onMoveToSprint,
  onMoveToBacklog,
  onDelete,
  onClear,
  showMoveToBacklog = true,
}: {
  count: number;
  onMoveToSprint: () => void;
  onMoveToBacklog?: () => void;
  onDelete: () => void;
  onClear: () => void;
  showMoveToBacklog?: boolean;
}) {
  const open = count > 0;
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closed">("closed");

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setState("open"));
      return () => cancelAnimationFrame(raf);
    }
    setState("closed");
    const timeout = setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      data-state={state}
      className="bar-panel fixed bottom-6 left-1/2 z-30 flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg"
    >
      <span className="text-sm font-medium text-text">
        {count} selected
      </span>
      <button
        type="button"
        onClick={onMoveToSprint}
        className="btn-press rounded-md px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
      >
        Move to sprint…
      </button>
      {showMoveToBacklog && onMoveToBacklog && (
        <button
          type="button"
          onClick={onMoveToBacklog}
          className="btn-press rounded-md px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
        >
          Move to Backlog
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="btn-press rounded-md px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-tint"
      >
        Delete
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="btn-press rounded-md px-2 py-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-text"
      >
        ✕
      </button>
    </div>
  );
}
