import { z } from "zod";

export const ambassadorApplicationSchema = z.object({
  collegeName: z.string().trim().min(1, "College/University name is required"),
  graduationYear: z.string().trim().min(1, "Graduation year is required"),
});

export type AmbassadorApplicationInput = z.infer<typeof ambassadorApplicationSchema>;
