"use client";

import { useRouter } from "next/navigation";

type Sprint = { id: number; name: string; startDate: string; endDate: string };

export function SprintPicker({
  sprints,
  currentSprintId,
  currentId,
}: {
  sprints: Sprint[];
  /** The sprint id that getSprintStatus() marks "current" (today's sprint). */
  currentSprintId: number | null;
  /** The sprint id actually being viewed. */
  currentId: number;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Switch sprint"
      value={currentId}
      onChange={(e) => router.push(`/sprints/${e.target.value}`)}
      className="h-9 rounded-md border border-transparent bg-transparent pr-1 text-xl font-semibold text-text outline-none hover:border-border focus-visible:border-primary"
    >
      {sprints.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
          {s.id === currentSprintId ? " (current)" : ""}
        </option>
      ))}
    </select>
  );
}
