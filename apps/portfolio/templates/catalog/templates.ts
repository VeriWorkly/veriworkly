import { type PrivateTemplateId, templatesRegistry } from "@/template-library/registry";

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

export const templates: TemplateSummary[] = Object.entries(templatesRegistry).map(
  ([id, entry]) => ({
    id: id as TemplateId,
    name: entry.name,
    note: entry.note,
    mood: entry.mood,
    audience: entry.audience,
    strengths: entry.strengths,
    image: entry.image,
    isPremium: (entry as { isPremium?: boolean }).isPremium,
  }),
);

export function isTemplateId(value: string): value is TemplateId {
  return value in templatesRegistry;
}
