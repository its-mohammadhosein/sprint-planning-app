"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/Dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowMenu } from "@/components/RowMenu";
import { useToast } from "@/components/ToastProvider";
import { getSprintStatus, SPRINT_STATUS_STYLES } from "@/lib/sprint-status";

type Sprint = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  taskCount: number;
};

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function SprintsClient({ initialSprints }: { initialSprints: Sprint[] }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [formSprint, setFormSprint] = useState<Sprint | "new" | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Sprint | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setName("");
    setStartDate("");
    setEndDate("");
    setFormError(null);
    setFormSprint("new");
  }

  function openEdit(sprint: Sprint) {
    setName(sprint.name);
    setStartDate(toDateInputValue(sprint.startDate));
    setEndDate(toDateInputValue(sprint.endDate));
    setFormError(null);
    setFormSprint(sprint);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const isNew = formSprint === "new";
    const url = isNew ? "/api/admin/sprints" : `/api/admin/sprints/${(formSprint as Sprint).id}`;

    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate, endDate }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong");
        setSaving(false);
        return;
      }

      showToast({ message: isNew ? "Sprint created" : "Sprint updated" });
      setFormSprint(null);
      router.refresh();
    } catch {
      setFormError("Can't reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/sprints/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }

      showToast({ message: "Sprint deleted" });
      setDeleteTarget(null);
      router.refresh();
    } catch {
      showToast({ message: "Can't reach the server. Try again.", kind: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Sprints</h1>
          <p className="mt-1 text-sm text-muted">
            Status is calculated from the dates. Deleting a sprint moves its tasks to the
            Backlog.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex-none rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          + New sprint
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Start</th>
              <th className="px-3 py-2 font-medium">End</th>
              <th className="px-3 py-2 font-medium">Tasks</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {initialSprints.map((sprint) => {
              const status = getSprintStatus(new Date(sprint.startDate), new Date(sprint.endDate));
              const style = SPRINT_STATUS_STYLES[status];
              return (
                <tr key={sprint.id} className="h-10 border-b border-border last:border-0 hover:bg-surface-muted">
                  <td className="px-3 py-2 font-medium text-text">{sprint.name}</td>
                  <td className="px-3 py-2 text-text">{formatDate(sprint.startDate)}</td>
                  <td className="px-3 py-2 text-text">{formatDate(sprint.endDate)}</td>
                  <td className="px-3 py-2 tabular-nums text-text">{sprint.taskCount}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{ background: style.bg, color: style.fg }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: style.dot }}
                      />
                      {style.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <RowMenu
                      ariaLabel={`Actions for ${sprint.name}`}
                      items={[
                        { label: "Edit", onClick: () => openEdit(sprint) },
                        { label: "Delete", onClick: () => setDeleteTarget(sprint), danger: true },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={formSprint !== null}
        onClose={() => setFormSprint(null)}
        title={formSprint === "new" ? "New sprint" : "Edit sprint"}
        widthClassName="max-w-[420px]"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sprint-name" className="text-[13px] font-medium text-text">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="sprint-name"
              required
              placeholder="e.g. Sprint 27"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sprint-start" className="text-[13px] font-medium text-text">
                Start date <span className="text-danger">*</span>
              </label>
              <input
                id="sprint-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sprint-end" className="text-[13px] font-medium text-text">
                End date <span className="text-danger">*</span>
              </label>
              <input
                id="sprint-end"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
              />
            </div>
          </div>
          {formError && <p className="text-[13px] text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormSprint(null)}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete sprint?"
        body={
          deleteTarget
            ? `"${deleteTarget.name}" will be deleted. ${
                deleteTarget.taskCount > 0
                  ? `${deleteTarget.taskCount} ${deleteTarget.taskCount === 1 ? "task" : "tasks"} will be moved to the Backlog.`
                  : "It has no tasks."
              }`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
}
