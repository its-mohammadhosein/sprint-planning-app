"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/Dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RowMenu } from "@/components/RowMenu";
import { useToast } from "@/components/ToastProvider";
import { generateTempPassword } from "@/lib/temp-password";
import { userFormSchema, userFormValuesToApiBody, type UserFormValues } from "@/lib/validation/admin";

type Team = { id: number; name: string };
type Role = "admin" | "member";
type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jiraUsername: string | null;
  teamId: number | null;
  role: Role;
  team: Team | null;
};

const EMPTY_FORM: UserFormValues = {
  mode: "create",
  firstName: "",
  lastName: "",
  email: "",
  jiraUsername: "",
  teamId: "",
  role: "member",
  password: "",
};

export function UsersClient({
  initialUsers,
  teams,
  currentUserId,
}: {
  initialUsers: User[];
  teams: Team[];
  currentUserId: number;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [editTarget, setEditTarget] = useState<User | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetting, setResetting] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ name: string; password: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (editTarget === null) return;
    reset(
      editTarget === "new"
        ? { ...EMPTY_FORM, password: generateTempPassword() }
        : {
            mode: "edit",
            firstName: editTarget.firstName,
            lastName: editTarget.lastName,
            email: editTarget.email,
            jiraUsername: editTarget.jiraUsername ?? "",
            teamId: editTarget.teamId ? String(editTarget.teamId) : "",
            role: editTarget.role,
            password: "",
          }
    );
    setFormError(null);
  }, [editTarget, reset]);

  function openCreate() {
    setEditTarget("new");
  }

  function openEdit(user: User) {
    setEditTarget(user);
  }

  async function onSubmit(values: UserFormValues) {
    setFormError(null);

    const isNew = editTarget === "new";
    const url = isNew ? "/api/admin/users" : `/api/admin/users/${(editTarget as User).id}`;

    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userFormValuesToApiBody(values)),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong");
        return;
      }

      showToast({ message: isNew ? "User created" : "User updated" });
      setEditTarget(null);
      router.refresh();
    } catch {
      setFormError("Can't reach the server. Try again.");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }

      showToast({ message: "User deleted" });
      setDeleteTarget(null);
      router.refresh();
    } catch {
      showToast({ message: "Can't reach the server. Try again.", kind: "error" });
    } finally {
      setDeleting(false);
    }
  }

  async function handleConfirmReset() {
    if (!resetTarget) return;
    setResetting(true);

    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}/reset-password`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }

      const name = `${resetTarget.firstName} ${resetTarget.lastName}`;
      setResetTarget(null);
      setRevealedPassword({ name, password: data.tempPassword });
    } catch {
      showToast({ message: "Can't reach the server. Try again.", kind: "error" });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Users</h1>
          <p className="mt-1 text-sm text-muted">
            Changing a role or resetting a password signs that user out everywhere.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex-none rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          + New user
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Jira username</th>
              <th className="px-3 py-2 font-medium">Team</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((user) => (
              <tr key={user.id} className="h-10 border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="px-3 py-2 font-medium text-text">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-3 py-2 text-text">{user.email}</td>
                <td className="px-3 py-2">
                  {user.jiraUsername ? (
                    <span className="text-text">{user.jiraUsername}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <span aria-hidden="true">⚠</span> No Jira username
                    </span>
                  )}
                </td>
                <td className={`px-3 py-2 ${user.team ? "text-text-secondary" : "text-muted"}`}>
                  {user.team?.name ?? "No team"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                    style={
                      user.role === "admin"
                        ? { background: "#DBEAFE", color: "#1E40AF" }
                        : { background: "#F1F5F9", color: "#334155" }
                    }
                  >
                    {user.role === "admin" ? "Admin" : "Member"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <RowMenu
                    ariaLabel={`Actions for ${user.firstName} ${user.lastName}`}
                    items={[
                      { label: "Edit", onClick: () => openEdit(user) },
                      { label: "Reset password", onClick: () => setResetTarget(user) },
                      ...(user.id !== currentUserId
                        ? [{ label: "Delete", onClick: () => setDeleteTarget(user), danger: true }]
                        : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget === "new" ? "New user" : "Edit user"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input type="hidden" {...register("mode")} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-first" className="text-[13px] font-medium text-text">
                First name <span className="text-danger">*</span>
              </label>
              <input
                id="user-first"
                {...register("firstName")}
                className={`h-10 rounded-md border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary ${
                  errors.firstName ? "border-danger focus-visible:border-danger" : "border-border"
                }`}
              />
              {errors.firstName && <p className="text-[13px] text-danger">{errors.firstName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-last" className="text-[13px] font-medium text-text">
                Last name <span className="text-danger">*</span>
              </label>
              <input
                id="user-last"
                {...register("lastName")}
                className={`h-10 rounded-md border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary ${
                  errors.lastName ? "border-danger focus-visible:border-danger" : "border-border"
                }`}
              />
              {errors.lastName && <p className="text-[13px] text-danger">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="user-email" className="text-[13px] font-medium text-text">
              Email <span className="text-danger">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              {...register("email")}
              className={`h-10 rounded-md border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary ${
                errors.email ? "border-danger focus-visible:border-danger" : "border-border"
              }`}
            />
            {errors.email && <p className="text-[13px] text-danger">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="user-jira" className="text-[13px] font-medium text-text">
              Jira username
            </label>
            <input
              id="user-jira"
              {...register("jiraUsername")}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
            />
            <p className="text-xs text-muted">Needed so the Jira CSV can match this person as assignee.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-team" className="text-[13px] font-medium text-text">
                Team
              </label>
              <select
                id="user-team"
                {...register("teamId")}
                className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
              >
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-role" className="text-[13px] font-medium text-text">
                Role
              </label>
              <select
                id="user-role"
                {...register("role")}
                className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {editTarget === "new" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-password" className="text-[13px] font-medium text-text">
                Temporary password <span className="text-danger">*</span>
              </label>
              <input
                id="user-password"
                {...register("password")}
                className={`h-10 rounded-md border bg-surface px-3 font-mono text-sm text-text outline-none focus-visible:border-primary ${
                  errors.password ? "border-danger focus-visible:border-danger" : "border-border"
                }`}
              />
              {errors.password ? (
                <p className="text-[13px] text-danger">{errors.password.message}</p>
              ) : (
                <p className="text-xs text-muted">8-72 characters. Share it with the user securely.</p>
              )}
            </div>
          )}

          {formError && <p className="text-[13px] text-danger">{formError}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
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
        title="Delete user?"
        body={deleteTarget ? `Delete "${deleteTarget.firstName} ${deleteTarget.lastName}"? This can't be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

      <ConfirmDialog
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title="Reset password?"
        body={
          resetTarget
            ? `${resetTarget.firstName} ${resetTarget.lastName} will get a new temporary password and be signed out everywhere.`
            : ""
        }
        confirmLabel="Reset password"
        onConfirm={handleConfirmReset}
        danger={false}
        loading={resetting}
      />

      <Dialog
        open={revealedPassword !== null}
        onClose={() => setRevealedPassword(null)}
        title="Password reset"
        widthClassName="max-w-[420px]"
      >
        <p className="text-sm text-text-secondary">
          New temporary password for {revealedPassword?.name}. Share it with them securely — it
          won&apos;t be shown again.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-sm text-text">
            {revealedPassword?.password}
          </code>
          <button
            type="button"
            onClick={() => {
              if (revealedPassword) navigator.clipboard?.writeText(revealedPassword.password);
              showToast({ message: "Copied to clipboard" });
            }}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-muted"
          >
            Copy
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setRevealedPassword(null)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Done
          </button>
        </div>
      </Dialog>
    </div>
  );
}
