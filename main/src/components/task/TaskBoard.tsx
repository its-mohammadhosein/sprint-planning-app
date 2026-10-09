"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TaskFilters } from "./TaskFilters";
import { SummaryBar } from "./SummaryBar";
import { TaskTable, type TableTask } from "./TaskTable";
import { BulkActionBar } from "./BulkActionBar";
import { TaskForm, type TaskFormTask } from "./TaskForm";
import { MoveToSprintDialog } from "./MoveToSprintDialog";

type Team = { id: number; name: string };
type User = { id: number; firstName: string; lastName: string; teamId: number | null };
type Sprint = { id: number; name: string; startDate: string; endDate: string };

export function TaskBoard({
  mode,
  sprintId,
  tasks: initialTasks,
  totalTaskCountUnfiltered,
  teamBreakdown,
  teams,
  users,
  sprints,
  basePath,
}: {
  mode: "sprint" | "backlog";
  sprintId: number | null;
  tasks: TableTask[];
  totalTaskCountUnfiltered: number;
  teamBreakdown: { teamName: string; totalST: number }[];
  teams: Team[];
  users: User[];
  sprints: Sprint[];
  basePath: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState(initialTasks);
  useEffect(() => setTasks(initialTasks), [initialTasks]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  useEffect(() => setSelectedIds(new Set()), [initialTasks]);

  const [formOpen, setFormOpen] = useState(false);
  const [formTask, setFormTask] = useState<TaskFormTask | null>(null);

  const [moveTaskIds, setMoveTaskIds] = useState<number[] | null>(null);
  const [deleteTaskIds, setDeleteTaskIds] = useState<number[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const anyDialogOpen = formOpen || moveTaskIds !== null || deleteTaskIds !== null;

  function openCreate() {
    setFormTask(null);
    setFormOpen(true);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (anyDialogOpen || isTyping) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        openCreate();
      } else if (e.key === "Escape") {
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [anyDialogOpen]);

  function openEdit(task: TableTask) {
    setFormTask({
      id: task.id,
      title: task.title,
      description: task.description,
      teamId: task.teamId,
      assigneeId: task.assigneeId,
      storyPoints: task.storyPoints,
      priority: task.priority,
      sprintId: task.sprintId,
    });
    setFormOpen(true);
  }

  async function handleQuickUpdate(
    taskId: number,
    patch: Partial<Pick<TableTask, "storyPoints" | "priority" | "assigneeId">>
  ) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = { ...t, ...patch };
        if ("assigneeId" in patch) {
          const assignee = users.find((u) => u.id === patch.assigneeId);
          updated.assignee = assignee ? { id: assignee.id, firstName: assignee.firstName, lastName: assignee.lastName } : null;
        }
        return updated;
      })
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        setTasks(previous);
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }
      router.refresh();
    } catch {
      setTasks(previous);
      showToast({
        message: "Can't reach the server. Try again.",
        kind: "error",
        action: { label: "Retry", onClick: () => handleQuickUpdate(taskId, patch) },
      });
    }
  }

  async function handleMoveToBacklog(taskIds: number[]) {
    try {
      const res = await fetch("/api/tasks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds, sprintId: null }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }
      showToast({ message: taskIds.length > 1 ? `Moved ${taskIds.length} tasks to Backlog` : "Moved to Backlog" });
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      showToast({ message: "Can't reach the server. Try again.", kind: "error" });
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTaskIds) return;
    setDeleting(true);

    try {
      await Promise.all(deleteTaskIds.map((id) => fetch(`/api/tasks/${id}`, { method: "DELETE" })));
      showToast({ message: `Deleted ${deleteTaskIds.length} ${deleteTaskIds.length === 1 ? "task" : "tasks"}` });
      setDeleteTaskIds(null);
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      showToast({ message: "Can't reach the server. Try again.", kind: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const filteredTotalST = tasks.reduce((sum, t) => sum + (t.storyPoints === null ? 0 : Number(t.storyPoints)), 0);

  return (
    <div>
      <div className="flex flex-col gap-3">
        <SummaryBar taskCount={tasks.length} totalST={filteredTotalST} teamBreakdown={teamBreakdown} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1">
            <TaskFilters basePath={basePath} teams={teams} users={users} />
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex-none rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            + New task
          </button>
        </div>
      </div>

      <div className="mt-4">
        <TaskTable
          tasks={tasks}
          teams={teams}
          users={users}
          selectedIds={selectedIds}
          onSelectedChange={setSelectedIds}
          onEdit={openEdit}
          onMoveToSprint={setMoveTaskIds}
          onMoveToBacklog={(taskId) => handleMoveToBacklog([taskId])}
          onDelete={setDeleteTaskIds}
          onQuickUpdate={handleQuickUpdate}
          showMoveToBacklog={mode === "sprint"}
          emptyState={
            totalTaskCountUnfiltered === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted">
                  {mode === "backlog"
                    ? "The backlog is empty. Tasks you don't schedule will be kept here."
                    : "No tasks in this sprint yet."}
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  + New task
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-muted">No tasks match your filters.</p>
                <button
                  type="button"
                  onClick={() => router.replace(basePath, { scroll: false })}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Clear filters
                </button>
              </div>
            )
          }
        />
        {tasks.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            Double-click ST, Priority or Assignee to edit in place · N new task · / search · Esc clear selection
          </p>
        )}
      </div>

      <BulkActionBar
        count={selectedIds.size}
        onMoveToSprint={() => setMoveTaskIds(Array.from(selectedIds))}
        onMoveToBacklog={mode === "sprint" ? () => handleMoveToBacklog(Array.from(selectedIds)) : undefined}
        showMoveToBacklog={mode === "sprint"}
        onDelete={() => setDeleteTaskIds(Array.from(selectedIds))}
        onClear={() => setSelectedIds(new Set())}
      />

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={formTask}
        teams={teams}
        users={users}
        sprints={sprints}
        defaultSprintId={sprintId}
      />

      <MoveToSprintDialog
        open={moveTaskIds !== null}
        onClose={() => setMoveTaskIds(null)}
        taskIds={moveTaskIds ?? []}
        currentSprintId={sprintId}
        sprints={sprints}
        onMoved={() => setSelectedIds(new Set())}
      />

      <ConfirmDialog
        open={deleteTaskIds !== null}
        onClose={() => setDeleteTaskIds(null)}
        title={deleteTaskIds && deleteTaskIds.length > 1 ? `Delete ${deleteTaskIds.length} tasks?` : "Delete task?"}
        body={
          deleteTaskIds && deleteTaskIds.length > 1
            ? `Delete ${deleteTaskIds.length} tasks? This can't be undone.`
            : `Delete "${tasks.find((t) => t.id === deleteTaskIds?.[0])?.title}"? This can't be undone.`
        }
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
}
