"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EXIT_DURATION_MS = 100;

export function UserMenu({ fullName }: { fullName: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<"open" | "closed">("closed");
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-press flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-text hover:bg-surface-muted"
      >
        {fullName}
        <span aria-hidden="true" className="text-muted">
          ▾
        </span>
      </button>
      {mounted && (
        <div
          role="menu"
          data-state={state}
          style={{ transformOrigin: "top right" }}
          className="popover-panel absolute right-0 z-20 mt-1 min-w-[140px] rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="block w-full px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
