import { templateRegistry, type TemplateDefinition } from "@/templates";

export const templateSummaries = templateRegistry.map((template: TemplateDefinition) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  accentColor: template.accentColor || "#000",
  previewImage: template.previewImage || "",
  tags: template.tags || [],
}));
