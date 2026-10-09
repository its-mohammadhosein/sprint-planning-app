"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/Dialog";
import { useToast } from "@/components/ToastProvider";
import { PRIORITY_OPTIONS, PRIORITY_STYLES, type Priority } from "./PriorityBadge";
import { taskFormSchema, taskFormValuesToApiBody, type TaskFormValues } from "@/lib/validation/task";

type Team = { id: number; name: string };
type User = { id: number; firstName: string; lastName: string; teamId: number | null };
type Sprint = { id: number; name: string };

export type TaskFormTask = {
  id: number;
  title: string;
  description: string | null;
  teamId: number;
  assigneeId: number | null;
  storyPoints: number | null;
  priority: Priority;
  sprintId: number | null;
};

function toFormValues(task: TaskFormTask | null, defaultSprintId: number | null): TaskFormValues {
  if (!task) {
    return {
      title: "",
      description: "",
      teamId: "",
      assigneeId: "",
      storyPoints: "",
      priority: "medium",
      sprintId: defaultSprintId ? String(defaultSprintId) : "",
    };
  }
  return {
    title: task.title,
    description: task.description ?? "",
    teamId: String(task.teamId),
    assigneeId: task.assigneeId ? String(task.assigneeId) : "",
    storyPoints: task.storyPoints === null ? "" : String(task.storyPoints),
    priority: task.priority,
    sprintId: task.sprintId ? String(task.sprintId) : "",
  };
}

export function TaskForm({
  open,
  onClose,
  task,
  teams,
  users,
  sprints,
  defaultSprintId,
}: {
  open: boolean;
  onClose: () => void;
  /** null = create a new task */
  task: TaskFormTask | null;
  teams: Team[];
  users: User[];
  sprints: Sprint[];
  defaultSprintId: number | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: toFormValues(task, defaultSprintId),
  });

  useEffect(() => {
    if (!open) return;
    reset(toFormValues(task, defaultSprintId));
    setShowAllTeams(false);
    setFormError(null);
  }, [open, task, defaultSprintId, reset]);

  const teamId = watch("teamId");
  const priority = watch("priority");

  const assigneeOptions = useMemo(() => {
    if (showAllTeams || !teamId) return users;
    const inTeam = users.filter((u) => String(u.teamId) === teamId);
    const outsideTeam = users.filter((u) => String(u.teamId) !== teamId);
    return [...inTeam, ...outsideTeam];
  }, [users, teamId, showAllTeams]);

  async function onSubmit(values: TaskFormValues) {
    setFormError(null);
    const body = taskFormValuesToApiBody(values);

    try {
      const res = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", {
        method: task ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong");
        return;
      }

      showToast({ message: task ? "Task updated" : "Task created" });
      onClose();
      router.refresh();
    } catch {
      setFormError("Can't reach the server. Try again.");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  const inputClass =
    "h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary";
  const errorInputClass = "border-danger focus-visible:border-danger";

  return (
    <Dialog open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-title" className="text-[13px] font-medium text-text">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="task-title"
            {...register("title")}
            className={`${inputClass} ${errors.title ? errorInputClass : ""}`}
          />
          {errors.title && <p className="text-[13px] text-danger">{errors.title.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-description" className="text-[13px] font-medium text-text">
            Description (optional)
          </label>
          <textarea
            id="task-description"
            rows={3}
            {...register("description")}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-team" className="text-[13px] font-medium text-text">
              Team <span className="text-danger">*</span>
            </label>
            <select
              id="task-team"
              {...register("teamId", {
                onChange: () => setValue("assigneeId", ""),
              })}
              className={`${inputClass} ${errors.teamId ? errorInputClass : ""}`}
            >
              <option value="">Select a team...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.teamId && <p className="text-[13px] text-danger">{errors.teamId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-assignee" className="text-[13px] font-medium text-text">
              Assignee
            </label>
            <select id="task-assignee" {...register("assigneeId")} className={inputClass}>
              <option value="">Unassigned</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[13px] text-muted">
              <input
                type="checkbox"
                checked={showAllTeams}
                onChange={(e) => setShowAllTeams(e.target.checked)}
              />
              Show people from all teams
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-st" className="text-[13px] font-medium text-text">
              ST
            </label>
            <input
              id="task-st"
              type="number"
              min={0}
              step={0.5}
              {...register("storyPoints")}
              className={`${inputClass} tabular-nums`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text">Priority</span>
            <div className="flex overflow-hidden rounded-md border border-border">
              {PRIORITY_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("priority", opt.value)}
                  className={`flex-1 px-2 py-2 text-[13px] ${i > 0 ? "border-l border-border" : ""} ${
                    priority === opt.value ? "font-semibold" : "font-normal text-text-secondary"
                  }`}
                  style={
                    priority === opt.value
                      ? { background: PRIORITY_STYLES[opt.value].bg, color: PRIORITY_STYLES[opt.value].fg }
                      : undefined
                  }
                >
                  ● {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-sprint" className="text-[13px] font-medium text-text">
            Sprint
          </label>
          <select id="task-sprint" {...register("sprintId")} className={inputClass}>
            <option value="">Backlog</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {formError && <p className="text-[13px] text-danger">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </form>
    </Dialog>
  );
}
