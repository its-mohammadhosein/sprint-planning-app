"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const EXIT_DURATION_MS = 100;

const ADMIN_LINKS = [
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/sprints", label: "Sprints" },
  { href: "/admin/epics", label: "Epics" },
];

export function AdminNavDropdown({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<"open" | "closed">("closed");
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`btn-press flex h-full items-center gap-1 border-b-2 border-t-2 border-t-transparent px-2.5 text-sm ${
          active ? "border-b-text font-semibold text-text" : "border-b-transparent font-normal text-text"
        }`}
      >
        Admin
        <span aria-hidden="true" className="text-muted">
          ▾
        </span>
      </button>
      {mounted && (
        <div
          role="menu"
          data-state={state}
          style={{ transformOrigin: "top left" }}
          className="popover-panel absolute left-0 z-20 mt-0 min-w-[140px] rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-muted hover:no-underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
