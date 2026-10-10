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
  imageCount: z.number().int().min(0).max(500).optional(),
  hiddenTextChars: z.number().int().min(0).max(100_000).optional(),
  hiddenTextSample: z.string().max(200).optional(),
  imageOnlyPages: z.number().int().min(0).max(200).optional(),
  metadataText: z.string().max(2_000).optional(),
  // Engine 0.3: a PDF opened without its password, and a Word file's tracked changes and
  // comments. Only the advice reads them, never the score.
  encrypted: z.boolean().optional(),
  trackedChanges: z.number().int().min(0).max(100_000).optional(),
  comments: z.number().int().min(0).max(100_000).optional(),
});

/** The uploaded file's name and size, sent by the client for the file advice. Never scored. */
const fileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  bytes: z
    .number()
    .int()
    .min(0)
    .max(100 * 1024 * 1024)
    .optional(),
});

export const atsCheckSchema = z.object({
  resume: resumeSchema,
  jobDescription: z.string().trim().max(20_000).optional(),
  layout: layoutSchema.optional(),
  file: fileSchema.optional(),
});

export const atsAnalyzeSchema = atsCheckSchema.extend({
  jobUrl: z.string().url().max(2_048).optional(),
  fetchJobUrl: z.boolean().default(false),
  requestId: z.string().trim().min(8).max(128),
  /**
   * Opt in to the AI parse-repair pass. Off by default and never inferred from a bad parse:
   * repair costs credits, so spending them is the caller's decision, not ours. The response
   * always reports whether repair *would* help (`repair.available`), which is what lets the UI
   * offer it rather than silently bill for it.
   */
  repairParse: z.boolean().default(false),
});

export const atsConvertResumeSchema = z.object({
  resume: z.string().trim().min(1).max(50_000),
  requestId: z.string().trim().min(8).max(128),
});

export type AtsCheckInput = z.infer<typeof atsCheckSchema>;
export type AtsAnalyzeInput = z.infer<typeof atsAnalyzeSchema>;
export type AtsConvertResumeInput = z.infer<typeof atsConvertResumeSchema>;
