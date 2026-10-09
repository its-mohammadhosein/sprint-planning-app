"use client";

import { Dialog } from "./Dialog";

export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
  danger = true,
  confirmOnly = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
  /** When true, only shows a single "Close" button (e.g. a blocked-action notice). */
  confirmOnly?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} widthClassName="max-w-[420px]">
      <p className="text-sm text-text-secondary">{body}</p>
      <div className="mt-6 flex justify-end gap-2">
        {confirmOnly ? (
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="btn-press rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
          >
            Close
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="btn-press rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`btn-press rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                danger
                  ? "bg-danger hover:bg-danger-hover"
                  : "bg-primary hover:bg-primary-hover"
              }`}
            >
              {confirmLabel}
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}
