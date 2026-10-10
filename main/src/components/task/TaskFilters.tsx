"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type TaskFiltersValue = {
  q: string;
  teamId: string;
  assigneeId: string;
  priority: string;
  epicId: string;
};

export function TaskFilters({
  basePath,
  teams,
  users,
  epics,
}: {
  basePath: string;
  teams: { id: number; name: string }[];
  users: { id: number; firstName: string; lastName: string }[];
  epics: { id: number; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const teamId = searchParams.get("teamId") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const epicId = searchParams.get("epicId") ?? "";

  const hasFilters = Boolean(q || teamId || assigneeId || priority || epicId);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }

  function handleSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", value), 300);
  }

  function handleClear() {
    setQ("");
    router.replace(basePath, { scroll: false });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectClass =
    "h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          🔍
        </span>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search title... (/)"
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none focus-visible:border-primary"
        />
      </div>

      <select
        aria-label="Filter by team"
        value={teamId}
        onChange={(e) => updateParam("teamId", e.target.value)}
        className={selectClass}
        style={teamId ? { borderColor: "#2563EB", backgroundColor: "#EFF6FF" } : undefined}
      >
        <option value="">All teams</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by assignee"
        value={assigneeId}
        onChange={(e) => updateParam("assigneeId", e.target.value)}
        className={selectClass}
        style={assigneeId ? { borderColor: "#2563EB", backgroundColor: "#EFF6FF" } : undefined}
      >
        <option value="">All assignees</option>
        <option value="none">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.firstName} {u.lastName}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by priority"
        value={priority}
        onChange={(e) => updateParam("priority", e.target.value)}
        className={selectClass}
        style={priority ? { borderColor: "#2563EB", backgroundColor: "#EFF6FF" } : undefined}
      >
        <option value="">All priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <select
        aria-label="Filter by epic"
        value={epicId}
        onChange={(e) => updateParam("epicId", e.target.value)}
        className={selectClass}
        style={epicId ? { borderColor: "#2563EB", backgroundColor: "#EFF6FF" } : undefined}
      >
        <option value="">All epics</option>
        <option value="none">No epic</option>
        {epics.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          Clear
        </button>
      )}
    </div>
  );
}
