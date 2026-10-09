import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z
    .union([z.string().trim().max(5000), z.null(), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  teamId: z.number().int().positive({ message: "Choose a team" }),
  assigneeId: z.union([z.number().int().positive(), z.null()]).optional(),
  storyPoints: z.union([z.number().min(0).max(999.9), z.null()]).optional(),
  priority: taskPrioritySchema.default("medium"),
  sprintId: z.union([z.number().int().positive(), z.null()]).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  title: z.string().trim().min(1, "Title is required").max(300).optional(),
});

export const moveTasksSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1),
  sprintId: z.union([z.number().int().positive(), z.null()]),
});

/**
 * Client-side schema for the TaskForm (react-hook-form). Mirrors
 * createTaskSchema/updateTaskSchema but keeps values as the strings HTML
 * inputs/selects produce; convert with taskFormValuesToApiBody before POST/PATCH.
 */
export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string(),
  teamId: z.string().min(1, "Choose a team."),
  assigneeId: z.string(),
  storyPoints: z.string(),
  priority: taskPrioritySchema,
  sprintId: z.string(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export function taskFormValuesToApiBody(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    teamId: Number(values.teamId),
    assigneeId: values.assigneeId ? Number(values.assigneeId) : null,
    storyPoints: values.storyPoints === "" ? null : Number(values.storyPoints),
    priority: values.priority,
    sprintId: values.sprintId ? Number(values.sprintId) : null,
  };
}

export const taskListQuerySchema = z.object({
  sprintId: z.string().optional(), // numeric id, "backlog", or absent = all
  teamId: z.coerce.number().int().positive().optional(),
  assigneeId: z.union([z.literal("none"), z.coerce.number().int().positive()]).optional(),
  priority: taskPrioritySchema.optional(),
  q: z.string().trim().optional(),
});
