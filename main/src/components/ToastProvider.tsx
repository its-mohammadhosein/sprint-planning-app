"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error";

type Toast = {
  id: number;
  message: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
};

type ToastInput = {
  message: string;
  kind?: ToastKind;
  action?: { label: string; onClick: () => void };
  /** ms before auto-dismiss; 0 disables auto-dismiss. Default 4000. */
  duration?: number;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dropToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, kind = "success", action, duration = 4000 }: ToastInput) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, kind, action }]);
      if (duration > 0) {
        setTimeout(() => dropToast(id), duration);
      }
    },
    [dropToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className="pointer-events-auto flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text shadow-lg"
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold text-white ${
                t.kind === "error" ? "bg-danger" : "bg-success"
              }`}
            >
              {t.kind === "error" ? "!" : "✓"}
            </span>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  dropToast(t.id);
                  t.action?.onClick();
                }}
                className="font-medium text-primary hover:text-primary-hover"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dropToast(t.id)}
              className="ml-1 text-muted hover:text-text"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
