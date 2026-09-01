import type { TemplateDetails } from "@/features/templates/data/template-details";
import {
  type PrivateTemplateId,
  type TemplateRegistryEntry,
  templatesRegistry,
} from "@/template-library/registry";

export type TemplateId = PrivateTemplateId;

export const templateIds = Object.keys(templatesRegistry) as unknown as readonly TemplateId[];

export interface TemplateSummary {
  id: TemplateId;
  name: string;
  note: string;
  mood: string;
  image: string;
  audience: string;
  strengths: string[];
  isPremium?: boolean;
}

export const templates: TemplateSummary[] = (
  Object.entries(templatesRegistry) as [TemplateId, TemplateRegistryEntry][]
).map(([id, entry]) => ({
  id,
  name: entry.name,
  note: entry.note,
  mood: entry.mood,
  audience: entry.audience,
  strengths: entry.strengths,
  image: entry.image,
  isPremium: Boolean(entry.isPremium),
}));

export function isTemplateId(value: string): value is TemplateId {
  return value in templatesRegistry;
}

export function isPremiumTemplate(templateId: string): boolean {
  return Boolean(templatesRegistry[templateId as TemplateId]?.isPremium);
}

export const templateDetails: Record<TemplateId, TemplateDetails> = Object.fromEntries(
  Object.entries(templatesRegistry).map(([id, entry]) => [id, entry.design]),
) as unknown as Record<TemplateId, TemplateDetails>;
