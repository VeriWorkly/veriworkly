import { z } from "zod";

const resumeSchema = z.union([
  z.string().trim().min(1).max(50_000),
  z.record(z.unknown()),
]);

export const atsCheckSchema = z.object({
  resume: resumeSchema,
  jobDescription: z.string().trim().max(20_000).optional(),
});

export const atsAnalyzeSchema = atsCheckSchema.extend({
  jobUrl: z.string().url().max(2_048).optional(),
  fetchJobUrl: z.boolean().default(false),
  requestId: z.string().trim().min(8).max(128),
});

export type AtsCheckInput = z.infer<typeof atsCheckSchema>;
export type AtsAnalyzeInput = z.infer<typeof atsAnalyzeSchema>;
