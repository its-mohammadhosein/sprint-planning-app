"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const EXIT_DURATION_MS = 150;

export function Dialog({
  open,
  onClose,
  title,
  children,
  widthClassName = "max-w-[520px]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClassName?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    const firstField = dialogRef.current?.querySelector<HTMLElement>(
      "input, textarea, select, button"
    );
    firstField?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      data-state={state}
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`dialog-panel w-full ${widthClassName} rounded-lg border border-border bg-surface shadow-lg`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="dialog-title" className="text-base font-semibold text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-press rounded-md p-1 text-muted hover:bg-surface-muted hover:text-text"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
