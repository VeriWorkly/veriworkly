export const templateIds = ["signal", "atelier"] as const;

export type TemplateId = (typeof templateIds)[number];

export interface TemplateSummary {
  id: TemplateId;
  name: string;
  note: string;
  mood: string;
}

export const templates: TemplateSummary[] = [
  {
    id: "signal",
    name: "Signal",
    note: "A precise, proof-first profile for product engineers.",
    mood: "Structured / technical",
  },
  {
    id: "atelier",
    name: "Atelier",
    note: "An editorial canvas for designers and independent builders.",
    mood: "Expressive / editorial",
  },
];

export function isTemplateId(value: string): value is TemplateId {
  return templateIds.includes(value as TemplateId);
}
