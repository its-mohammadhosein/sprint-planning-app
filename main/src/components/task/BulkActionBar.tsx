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
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg">
      <span className="text-sm font-medium text-text">
        {count} selected
      </span>
      <button
        type="button"
        onClick={onMoveToSprint}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-muted"
      >
        Move to sprint…
      </button>
      {showMoveToBacklog && onMoveToBacklog && (
        <button
          type="button"
          onClick={onMoveToBacklog}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-muted"
        >
          Move to Backlog
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-tint"
      >
        Delete
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="rounded-md px-2 py-1.5 text-muted hover:bg-surface-muted hover:text-text"
      >
        ✕
      </button>
    </div>
  );
}
