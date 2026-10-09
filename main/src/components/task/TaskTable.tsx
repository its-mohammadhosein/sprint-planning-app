"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { RowMenu } from "@/components/RowMenu";
import { PriorityBadge, PRIORITY_OPTIONS, type Priority } from "./PriorityBadge";
import { formatST } from "./SummaryBar";

export type TableTask = {
  id: number;
  title: string;
  description: string | null;
  storyPoints: number | null;
  priority: Priority;
  assigneeId: number | null;
  teamId: number;
  sprintId: number | null;
  team: { id: number; name: string };
  assignee: { id: number; firstName: string; lastName: string } | null;
};

type Team = { id: number; name: string };
type User = { id: number; firstName: string; lastName: string; teamId: number | null };

const columnHelper = createColumnHelper<TableTask>();

export function TaskTable({
  tasks,
  teams,
  users,
  selectedIds,
  onSelectedChange,
  onEdit,
  onMoveToSprint,
  onMoveToBacklog,
  onDelete,
  onQuickUpdate,
  showMoveToBacklog = true,
  emptyState,
}: {
  tasks: TableTask[];
  teams: Team[];
  users: User[];
  selectedIds: Set<number>;
  onSelectedChange: (ids: Set<number>) => void;
  onEdit: (task: TableTask) => void;
  onMoveToSprint: (taskIds: number[]) => void;
  onMoveToBacklog: (taskId: number) => void;
  onDelete: (taskIds: number[]) => void;
  onQuickUpdate: (taskId: number, patch: Partial<Pick<TableTask, "storyPoints" | "priority" | "assigneeId">>) => void;
  showMoveToBacklog?: boolean;
  emptyState: React.ReactNode;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: number; field: "st" | "priority" | "assignee" } | null>(null);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelected(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === tasks.length) onSelectedChange(new Set());
    else onSelectedChange(new Set(tasks.map((t) => t.id)));
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: ({ row }) => {
          const task = row.original;
          const isExpanded = expanded.has(task.id);
          return (
            <div>
              <button
                type="button"
                onClick={() => toggleExpand(task.id)}
                className="flex items-center gap-1.5 text-left font-medium text-text hover:no-underline"
              >
                <span aria-hidden="true" className="w-3 text-muted">
                  {task.description ? (isExpanded ? "⌄" : "›") : ""}
                </span>
                {task.title}
              </button>
              {isExpanded && task.description && (
                <p className="mt-1 pl-[18px] text-[13px] text-muted">{task.description}</p>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor((t) => t.team.name, {
        id: "team",
        header: "Team",
        cell: ({ row }) => row.original.team.name,
      }),
      columnHelper.accessor(
        (t) => (t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : ""),
        {
          id: "assignee",
          header: "Assignee",
          cell: ({ row }) => {
            const task = row.original;
            const isEditing = editingCell?.id === task.id && editingCell.field === "assignee";
            const teamUsers = users.filter((u) => u.teamId === task.teamId);
            const otherUsers = users.filter((u) => u.teamId !== task.teamId);

            if (isEditing) {
              return (
                <select
                  autoFocus
                  defaultValue={task.assigneeId ?? ""}
                  onBlur={() => setEditingCell(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingCell(null);
                  }}
                  onChange={(e) => {
                    onQuickUpdate(task.id, { assigneeId: e.target.value ? Number(e.target.value) : null });
                    setEditingCell(null);
                  }}
                  className="h-8 rounded-md border border-primary bg-surface px-2 text-sm text-text outline-none"
                >
                  <option value="">Unassigned</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                  {otherUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              );
            }

            return (
              <button
                type="button"
                onDoubleClick={() => setEditingCell({ id: task.id, field: "assignee" })}
                className={`text-left ${task.assignee ? "text-text" : "text-muted"}`}
              >
                {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}
              </button>
            );
          },
        }
      ),
      columnHelper.accessor((t) => (t.storyPoints === null ? -1 : Number(t.storyPoints)), {
        id: "st",
        header: () => <div className="text-right">ST</div>,
        cell: ({ row }) => {
          const task = row.original;
          const isEditing = editingCell?.id === task.id && editingCell.field === "st";

          if (isEditing) {
            return (
              <input
                type="number"
                step={0.5}
                min={0}
                autoFocus
                defaultValue={task.storyPoints === null ? "" : String(task.storyPoints)}
                onBlur={(e) => {
                  onQuickUpdate(task.id, { storyPoints: e.target.value === "" ? null : Number(e.target.value) });
                  setEditingCell(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingCell(null);
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="h-8 w-20 rounded-md border border-primary bg-surface px-2 text-right text-sm tabular-nums text-text outline-none"
              />
            );
          }

          return (
            <button
              type="button"
              onDoubleClick={() => setEditingCell({ id: task.id, field: "st" })}
              className="block w-full text-right tabular-nums text-text"
            >
              {task.storyPoints === null ? "—" : formatST(Number(task.storyPoints))}
            </button>
          );
        },
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: ({ row }) => {
          const task = row.original;
          const isEditing = editingCell?.id === task.id && editingCell.field === "priority";

          if (isEditing) {
            return (
              <select
                autoFocus
                defaultValue={task.priority}
                onBlur={() => setEditingCell(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingCell(null);
                }}
                onChange={(e) => {
                  onQuickUpdate(task.id, { priority: e.target.value as Priority });
                  setEditingCell(null);
                }}
                className="h-8 rounded-md border border-primary bg-surface px-2 text-sm text-text outline-none"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <button type="button" onDoubleClick={() => setEditingCell({ id: task.id, field: "priority" })}>
              <PriorityBadge priority={task.priority} />
            </button>
          );
        },
      }),
    ],
    [expanded, editingCell, users, onQuickUpdate]
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (tasks.length === 0) {
    return <div className="rounded-lg border border-border bg-surface">{emptyState}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-14 z-[1] bg-surface">
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                aria-label="Select all tasks"
                checked={selectedIds.size === tasks.length}
                onChange={toggleSelectAll}
              />
            </th>
            {table.getFlatHeaders().map((header) => (
              <th key={header.id} className="px-3 py-2 font-medium">
                <button
                  type="button"
                  onClick={header.column.getToggleSortingHandler()}
                  className="flex items-center gap-1 hover:text-text"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <span aria-hidden="true" className="text-[10px]">
                    {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? "↕"}
                  </span>
                </button>
              </th>
            ))}
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const task = row.original;
            const isSelected = selectedIds.has(task.id);
            return (
              <tr
                key={task.id}
                className={`h-10 border-b border-border last:border-0 hover:bg-surface-muted ${
                  isSelected ? "bg-primary-tint" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select task: ${task.title}`}
                    checked={isSelected}
                    onChange={() => toggleSelected(task.id)}
                  />
                </td>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-top text-text">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td className="px-3 py-2 text-right align-top">
                  <RowMenu
                    ariaLabel={`Actions for ${task.title}`}
                    items={[
                      { label: "Edit", onClick: () => onEdit(task) },
                      { label: "Move to sprint…", onClick: () => onMoveToSprint([task.id]) },
                      ...(showMoveToBacklog && task.sprintId !== null
                        ? [{ label: "Move to Backlog", onClick: () => onMoveToBacklog(task.id) }]
                        : []),
                      { label: "Delete", onClick: () => onDelete([task.id]), danger: true },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
