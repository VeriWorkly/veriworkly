export type TemplateSummary = {
  id: string;
  name: string;
  documentType: "resume" | "cover-letter" | "formal-letter" | "invoice";
  description: string;
  accentColor: string;
  previewImage: string;
  tags: string[];
};

export const templateSummaries: TemplateSummary[] = [
  {
    id: "executive-clarity",
    name: "Executive Clarity",
    documentType: "resume",
    description:
      "A polished single-column resume with refined spacing, strong section rhythm, and ATS-safe structure. Ideal for professionals who want a sophisticated, modern look.",
    accentColor: "#0ea5e9",
    previewImage: "/templates/executive-clarity.png",
    tags: ["One column", "ATS-friendly", "Modern", "Professional"],
  },

  {
    id: "precision-ats",
    name: "Precision ATS",
    documentType: "resume",
    description:
      "A dense, recruiter-friendly layout for longer resumes that still exports as a real matching PDF. Built for clarity and parsing accuracy above all else.",
    accentColor: "#10b981",
    previewImage: "/templates/compact-ats.png",
    tags: ["One column", "ATS-friendly", "Compact", "Simple"],
  },
];

export function getTemplateById(id: string): TemplateSummary | undefined {
  return templateSummaries.find((t) => t.id === id);
}
