import { z } from "zod";

import { isValidUsername, normalizeUsername, usernameInvalidReason } from "#utils/slugs";

/** The one username rule, for users and admins alike (V-233): lowercased, 3-32, not reserved. */
export const usernameSchema = z
  .string()
  .trim()
  .transform((value) => normalizeUsername(value))
  .refine((value) => isValidUsername(value), {
    error: (issue) => usernameInvalidReason(issue.input as string) || "invalid_username",
  });

export const updateUserNameSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(255, "Name is too long"),
});

export const updateUsernameSchema = z.object({
  username: usernameSchema,
});

export const usernameAvailabilityParamsSchema = z.object({
  username: z
    .string()
    .trim()
    .transform((value) => normalizeUsername(value)),
});

export const updateAutoSyncSchema = z.object({ enabled: z.boolean() });
