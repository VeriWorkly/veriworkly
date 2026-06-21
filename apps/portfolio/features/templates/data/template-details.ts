import type { TemplateId } from "@/templates/catalog/templates";
import { design as signalDesign } from "@/template-library/signal/design";

export type TemplateDetails = {
  positioning: string;
  fonts: string;
  motion: string;
  palette: string;
  layout: string;
  componentLanguage: string;
  contentModel: string[];
  colorScheme: Array<{ name: string; value: string; className: string }>;
  bestFor: string[];
  designNotes: string[];
  system?: any;
};

export const templateDetails: Record<TemplateId, TemplateDetails> = {
  signal: signalDesign,

  atelier: {
    positioning:
      "An editorial portfolio for designers, creative technologists, and independent makers.",

    fonts: "Expressive editorial scale with softer spacing and slower content rhythm.",
    motion:
      "Scroll can breathe: reveal writing, case studies, testimonials, and visual details gradually.",

    palette: "Warm canvas tones with VeriWorkly blue used as the brand anchor.",

    layout:
      "Spacious editorial hero, narrative case-study sections, softer cards, and longer reading rhythm.",
    componentLanguage:
      "Editorial panels, large typographic moments, warm spacing, softer dividers, and story-first CTAs.",

    contentModel: [
      "Personal point of view and creative positioning",
      "Case studies with process, context, and outcomes",
      "Testimonials, writing, and visual proof",
      "A contact section that feels like an invitation",
    ],

    colorScheme: [
      { name: "Canvas", value: "#f4eee4", className: "bg-[#f4eee4]" },
      { name: "Ink", value: "#11110f", className: "bg-ink-2" },
      { name: "VeriWorkly blue", value: "#2563eb", className: "bg-accent" },
      { name: "Warm panel", value: "#fffaf1", className: "bg-[#fffaf1]" },
    ],

    bestFor: ["Designers", "Creative builders", "Independent studios", "Visual storytellers"],

    designNotes: [
      "Editorial pacing gives profile writing, process, and testimonials more room.",
      "Larger section breaks make visual work and personal voice feel intentional.",
      "The template works well when case studies need narrative depth.",
    ],
  },
};
