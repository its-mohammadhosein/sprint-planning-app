"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/Dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowMenu } from "@/components/RowMenu";
import { useToast } from "@/components/ToastProvider";
import { createEpicSchema, type CreateEpicInput } from "@/lib/validation/admin";

type Epic = { id: number; name: string; taskCount: number };

export function EpicsClient({ initialEpics }: { initialEpics: Epic[] }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [formEpic, setFormEpic] = useState<Epic | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Epic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEpicInput>({
    resolver: zodResolver(createEpicSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (formEpic === null) return;
    reset({ name: formEpic === "new" ? "" : formEpic.name });
    setFormError(null);
  }, [formEpic, reset]);

  function openCreate() {
    setFormEpic("new");
  }

  function openEdit(epic: Epic) {
    setFormEpic(epic);
  }

  async function onSubmit(values: CreateEpicInput) {
    setFormError(null);

    const isNew = formEpic === "new";
    const url = isNew ? "/api/admin/epics" : `/api/admin/epics/${(formEpic as Epic).id}`;

    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong");
        return;
      }

      showToast({ message: isNew ? "Epic created" : "Epic updated" });
      setFormEpic(null);
      router.refresh();
    } catch {
      setFormError("Can't reach the server. Try again.");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/epics/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }

      showToast({ message: "Epic deleted" });
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
          <h1 className="text-xl font-semibold text-text">Epics</h1>
          <p className="mt-1 text-sm text-muted">
            Epics group related tasks. A task can belong to at most one epic. Deleting an epic
            unlinks its tasks, it doesn&apos;t delete them.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex-none rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          + New epic
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Tasks</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {initialEpics.map((epic) => (
              <tr key={epic.id} className="h-10 border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="px-3 py-2 font-medium text-text">{epic.name}</td>
                <td className="px-3 py-2 tabular-nums text-text">{epic.taskCount}</td>
                <td className="px-3 py-2 text-right">
                  <RowMenu
                    ariaLabel={`Actions for epic ${epic.name}`}
                    items={[
                      { label: "Edit", onClick: () => openEdit(epic) },
                      { label: "Delete", onClick: () => setDeleteTarget(epic), danger: true },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={formEpic !== null}
        onClose={() => setFormEpic(null)}
        title={formEpic === "new" ? "New epic" : "Edit epic"}
        widthClassName="max-w-[420px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="epic-name" className="text-[13px] font-medium text-text">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="epic-name"
              {...register("name")}
              className={`h-10 rounded-md border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary ${
                errors.name ? "border-danger focus-visible:border-danger" : "border-border"
              }`}
            />
            {errors.name && <p className="text-[13px] text-danger">{errors.name.message}</p>}
          </div>
          {formError && <p className="text-[13px] text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormEpic(null)}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete epic?"
        body={
          deleteTarget
            ? `"${deleteTarget.name}" will be deleted. ${
                deleteTarget.taskCount > 0
                  ? `${deleteTarget.taskCount} ${deleteTarget.taskCount === 1 ? "task" : "tasks"} will be unlinked from it.`
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
