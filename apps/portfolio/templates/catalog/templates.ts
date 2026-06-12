export const templateIds = ["signal", "atelier"] as const;

export type TemplateId = (typeof templateIds)[number];

export interface TemplateSummary {
  id: TemplateId;
  name: string;
  note: string;
  mood: string;
  image: string;
  audience: string;
  strengths: string[];
}

export const templates: TemplateSummary[] = [
  {
    id: "signal",
    name: "Signal",
    note: "A precise, proof-first profile for product engineers.",
    mood: "Structured / technical",
    audience: "Engineers and product leaders",
    strengths: ["Project proof", "Clear timelines", "Technical credibility"],
    image: "/templates/signal-template-preview.png",
  },

  {
    id: "atelier",
    name: "Atelier",
    note: "An editorial canvas for designers and independent builders.",
    mood: "Expressive / editorial",
    audience: "Designers and creative builders",
    strengths: ["Visual storytelling", "Editorial rhythm", "Distinctive voice"],
    image: "/templates/atelier-template-preview.png",
  },
];

export function isTemplateId(value: string): value is TemplateId {
  return templateIds.includes(value as TemplateId);
}
