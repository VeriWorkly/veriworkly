import { z } from "zod";
import { DocumentType, Visibility } from "@prisma/client";

export const documentTypeSchema = z.nativeEnum(DocumentType);
export const visibilitySchema = z.nativeEnum(Visibility);

export const documentCreateSchema = z.object({
  id: z.string().optional(),
  type: documentTypeSchema,
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  content: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  templateId: z.string().min(1).max(64).optional(),
  visibility: visibilitySchema.optional(),
});

export const documentUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  content: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  templateId: z.string().min(1).max(64).optional(),
  visibility: visibilitySchema.optional(),
  revision: z.number().int().min(1),
});

export type DocumentCreateRequest = z.infer<typeof documentCreateSchema>;
export type DocumentUpdateRequest = z.infer<typeof documentUpdateSchema>;
