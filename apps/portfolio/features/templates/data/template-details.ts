import type { TemplateId } from "@/templates/catalog/templates";

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
};

export const templateDetails: Record<TemplateId, TemplateDetails> = {
  signal: {
    positioning: "A precise, proof-first portfolio for product engineers and technical builders.",
    fonts: "Tight geometric sans typography with oversized claims and compact evidence labels.",
    motion: "Scroll should feel direct: stacked proof, fast reveals, and minimal decorative delay.",
    palette: "Warm paper, sharp black, and VeriWorkly blue for credibility and action.",
    layout:
      "Dense editorial hero, compact evidence modules, crisp project cards, and short scanning paths.",
    componentLanguage:
      "Hard borders, browser chrome, evidence chips, metric cards, and direct call-to-action buttons.",
    contentModel: [
      "A strong one-line positioning statement",
      "Three to six outcome-led projects",
      "Technical credibility, skills, and systems thinking",
      "Contact and availability that are easy to find",
    ],
    colorScheme: [
      { name: "Paper", value: "#f1efe7", className: "bg-[#f1efe7]" },
      { name: "Ink", value: "#11110f", className: "bg-[#11110f]" },
      { name: "VeriWorkly blue", value: "#2563eb", className: "bg-accent" },
      { name: "Panel", value: "#ffffff", className: "bg-white" },
    ],
    bestFor: ["Product engineers", "Founder-builders", "Technical consultants", "Product leaders"],
    designNotes: [
      "Large opening claim makes the builder's positioning impossible to miss.",
      "Project blocks prioritize outcomes, systems, and credibility before decoration.",
      "Compact navigation and evidence chips keep the page easy to scan.",
    ],
  },
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
      { name: "Ink", value: "#11110f", className: "bg-[#11110f]" },
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
