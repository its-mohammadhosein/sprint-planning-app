import { z } from "zod";
import { taskPrioritySchema } from "./task";
import { IMPORT_FIELDS } from "@/lib/import-excel";

export const importFieldSchema = z.enum(IMPORT_FIELDS);

export const importMappingSchema = z.record(importFieldSchema, z.number().int().positive().nullable());

export const importCommitRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.union([z.string().max(5000), z.null()]).optional(),
  teamId: z.number().int().positive(),
  assigneeId: z.union([z.number().int().positive(), z.null()]).optional(),
  storyPoints: z.union([z.number().min(0).max(999.9), z.null()]).optional(),
  priority: taskPrioritySchema,
});

export const importCommitSchema = z.object({
  sprintId: z.union([z.number().int().positive(), z.null()]),
  rows: z.array(importCommitRowSchema).min(1).max(2000),
});

export type ImportCommitRow = z.infer<typeof importCommitRowSchema>;
