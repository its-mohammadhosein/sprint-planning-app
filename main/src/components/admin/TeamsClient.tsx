"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/Dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowMenu } from "@/components/RowMenu";
import { useToast } from "@/components/ToastProvider";
import { createTeamSchema, type CreateTeamInput } from "@/lib/validation/admin";

type Team = { id: number; name: string; userCount: number; taskCount: number };

export function TeamsClient({ initialTeams }: { initialTeams: Team[] }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [formTeam, setFormTeam] = useState<Team | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<{ name: string; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (formTeam === null) return;
    reset({ name: formTeam === "new" ? "" : formTeam.name });
    setFormError(null);
  }, [formTeam, reset]);

  function openCreate() {
    setFormTeam("new");
  }

  function openEdit(team: Team) {
    setFormTeam(team);
  }

  async function onSubmit(values: CreateTeamInput) {
    setFormError(null);

    const isNew = formTeam === "new";
    const url = isNew ? "/api/admin/teams" : `/api/admin/teams/${(formTeam as Team).id}`;

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

      showToast({ message: isNew ? "Team created" : "Team updated" });
      setFormTeam(null);
      router.refresh();
    } catch {
      setFormError("Can't reach the server. Try again.");
    }
  }

  function handleDeleteClick(team: Team) {
    if (team.taskCount > 0) {
      setBlockedDelete({
        name: team.name,
        message: `This team still has ${team.taskCount} ${team.taskCount === 1 ? "task" : "tasks"}. Move or delete them first.`,
      });
      return;
    }
    setDeleteTarget(team);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/teams/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setDeleteTarget(null);
        setBlockedDelete({ name: deleteTarget.name, message: data.error ?? "Something went wrong" });
        return;
      }

      showToast({ message: "Team deleted" });
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
          <h1 className="text-xl font-semibold text-text">Teams</h1>
          <p className="mt-1 text-sm text-muted">
            Teams group users and tasks. A team that still has tasks can&apos;t be deleted.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex-none rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          + New team
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Users</th>
              <th className="px-3 py-2 font-medium">Tasks</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {initialTeams.map((team) => (
              <tr key={team.id} className="h-10 border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="px-3 py-2 font-medium text-text">{team.name}</td>
                <td className="px-3 py-2 tabular-nums text-text">{team.userCount}</td>
                <td className="px-3 py-2 tabular-nums text-text">{team.taskCount}</td>
                <td className="px-3 py-2 text-right">
                  <RowMenu
                    ariaLabel={`Actions for team ${team.name}`}
                    items={[
                      { label: "Edit", onClick: () => openEdit(team) },
                      { label: "Delete", onClick: () => handleDeleteClick(team), danger: true },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={formTeam !== null}
        onClose={() => setFormTeam(null)}
        title={formTeam === "new" ? "New team" : "Edit team"}
        widthClassName="max-w-[420px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="team-name" className="text-[13px] font-medium text-text">
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="team-name"
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
              onClick={() => setFormTeam(null)}
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
        title="Delete team?"
        body={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

      <ConfirmDialog
        open={blockedDelete !== null}
        onClose={() => setBlockedDelete(null)}
        title={`Can't delete "${blockedDelete?.name}"`}
        body={blockedDelete?.message ?? ""}
        confirmOnly
      />
    </div>
  );
}
