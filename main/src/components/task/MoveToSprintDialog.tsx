"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/Dialog";
import { useToast } from "@/components/ToastProvider";

type Sprint = { id: number; name: string; startDate: string; endDate: string };

function formatRange(startIso: string, endIso: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(startIso)} - ${fmt(endIso)}`;
}

export function MoveToSprintDialog({
  open,
  onClose,
  taskIds,
  currentSprintId,
  sprints,
  onMoved,
}: {
  open: boolean;
  onClose: () => void;
  taskIds: number[];
  currentSprintId: number | null;
  sprints: Sprint[];
  onMoved?: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<number | null | "unset">("unset");
  const [moving, setMoving] = useState(false);

  async function handleMove() {
    if (selected === "unset") return;
    setMoving(true);

    try {
      const res = await fetch("/api/tasks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds, sprintId: selected }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }

      showToast({ message: `Moved ${taskIds.length} ${taskIds.length === 1 ? "task" : "tasks"}` });
      setSelected("unset");
      onClose();
      onMoved?.();
      router.refresh();
    } catch {
      showToast({ message: "Can't reach the server. Try again.", kind: "error" });
    } finally {
      setMoving(false);
    }
  }

  const options: { sprintId: number | null; label: string; meta: string }[] = [
    { sprintId: null, label: "Backlog", meta: "No sprint" },
    ...sprints.map((s) => ({ sprintId: s.id, label: s.name, meta: formatRange(s.startDate, s.endDate) })),
  ];

  return (
    <Dialog
      open={open}
      onClose={() => {
        setSelected("unset");
        onClose();
      }}
      title={`Move ${taskIds.length} ${taskIds.length === 1 ? "task" : "tasks"}`}
      widthClassName="max-w-[420px]"
    >
      <div role="radiogroup" aria-label="Destination" className="flex flex-col divide-y divide-border rounded-md border border-border">
        {options.map((opt) => {
          const isCurrent = opt.sprintId === currentSprintId;
          return (
            <label
              key={opt.sprintId ?? "backlog"}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                isCurrent ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-surface-muted"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="move-destination"
                  disabled={isCurrent}
                  checked={selected === opt.sprintId}
                  onChange={() => setSelected(opt.sprintId)}
                />
                <span className="font-medium text-text">{opt.label}</span>
              </span>
              <span className="text-[13px] text-muted">{isCurrent ? "Already here" : opt.meta}</span>
            </label>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setSelected("unset");
            onClose();
          }}
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleMove}
          disabled={selected === "unset" || moving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40"
        >
          Move
        </button>
      </div>
    </Dialog>
  );
}
