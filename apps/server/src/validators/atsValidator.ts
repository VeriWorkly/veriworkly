import { z } from "zod";

const resumeSchema = z.union([z.string().trim().min(1).max(50_000), z.record(z.unknown())]);

/**
 * Geometry measured during extraction and echoed back by the client alongside the text it
 * belongs to, so the format checks can run on a resume that arrived as an upload.
 *
 * Client-supplied, therefore bounded rather than trusted: the worst a forged value can do is
 * mis-score the caller's own resume, and the ranges here keep it from doing anything else.
 */
const layoutSchema = z.object({
  columnRatio: z.number().min(0).max(1).nullable(),
  tableCount: z.number().int().min(0).max(500),
  pageCount: z.number().int().min(0).max(200),
});

export const atsCheckSchema = z.object({
  resume: resumeSchema,
  jobDescription: z.string().trim().max(20_000).optional(),
  layout: layoutSchema.optional(),
});

export const atsAnalyzeSchema = atsCheckSchema.extend({
  jobUrl: z.string().url().max(2_048).optional(),
  fetchJobUrl: z.boolean().default(false),
  requestId: z.string().trim().min(8).max(128),
});

export const atsConvertResumeSchema = z.object({
  resume: z.string().trim().min(1).max(50_000),
  requestId: z.string().trim().min(8).max(128),
});

export type AtsCheckInput = z.infer<typeof atsCheckSchema>;
export type AtsAnalyzeInput = z.infer<typeof atsAnalyzeSchema>;
export type AtsConvertResumeInput = z.infer<typeof atsConvertResumeSchema>;
