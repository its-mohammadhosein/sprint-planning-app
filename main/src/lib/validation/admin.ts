import { z } from "zod";
import { passwordSchema } from "./auth";

export const teamNameSchema = z.string().trim().min(1).max(100);

export const createTeamSchema = z.object({
  name: teamNameSchema,
});

export const updateTeamSchema = createTeamSchema;

export const sprintSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

const nullableTeamId = z
  .union([z.number().int().positive(), z.null()])
  .optional();

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  jiraUsername: z
    .union([z.string().trim().min(1).max(100), z.null(), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  teamId: nullableTeamId,
  role: z.enum(["admin", "member"]),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  jiraUsername: z
    .union([z.string().trim().min(1).max(100), z.null(), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  teamId: nullableTeamId,
  role: z.enum(["admin", "member"]),
});
