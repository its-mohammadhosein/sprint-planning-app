import { Prisma } from "@prisma/client";

export const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  storyPoints: true,
  priority: true,
  assigneeId: true,
  teamId: true,
  sprintId: true,
  epicId: true,
  createdAt: true,
  updatedAt: true,
  team: { select: { id: true, name: true } },
  assignee: { select: { id: true, firstName: true, lastName: true } },
  epic: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;
