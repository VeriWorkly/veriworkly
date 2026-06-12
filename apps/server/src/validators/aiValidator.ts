import { z } from "zod";

import { AI_ACTION_KEYS } from "#services/aiTypes";

export const aiGenerateSchema = z.object({
  action: z.enum(AI_ACTION_KEYS),
  mode: z.enum(["standard", "expert"]).default("standard"),
  input: z.object({
    text: z.string().max(50_000).default(""),
    context: z.string().max(50_000).default(""),
    jobDescription: z.string().max(20_000).default(""),
    instructions: z.string().trim().max(500).default(""),
  }),
  requestId: z.string().trim().min(8).max(200),
  documentId: z.string().trim().min(1).max(200).optional(),
});

export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;
