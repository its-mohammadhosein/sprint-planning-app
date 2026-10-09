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

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/**
 * Client-side (react-hook-form) schema for the Sprint admin form. Keeps
 * date fields as the strings <input type="date"> produces; convert with
 * sprintFormValuesToApiBody before POST/PATCH.
 */
export const sprintFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export type SprintFormValues = z.infer<typeof sprintFormSchema>;

export function sprintFormValuesToApiBody(values: SprintFormValues) {
  return { name: values.name.trim(), startDate: values.startDate, endDate: values.endDate };
}

/**
 * Client-side (react-hook-form) schema for the admin "New/Edit user" form.
 * One schema for both modes (via the `mode` discriminator) so a single
 * useForm instance can back both dialogs without juggling two types —
 * the password field is only required when mode is "create".
 */
export const userFormSchema = z
  .object({
    mode: z.enum(["create", "edit"]),
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email."),
    jiraUsername: z.string(),
    teamId: z.string(),
    role: z.enum(["admin", "member"]),
    password: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.mode !== "create") return;
    const result = passwordSchema.safeParse(data.password);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: result.error.issues[0]?.message ?? "Invalid password",
      });
    }
  });

export type UserFormValues = z.infer<typeof userFormSchema>;

export function userFormValuesToApiBody(values: UserFormValues) {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    jiraUsername: values.jiraUsername.trim() || null,
    teamId: values.teamId ? Number(values.teamId) : null,
    role: values.role,
    ...(values.mode === "create" ? { password: values.password } : {}),
  };
}
