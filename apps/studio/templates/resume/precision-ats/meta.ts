import type { TemplateMeta } from "@/features/documents/core/types";

export const precisionAtsMeta = {
  id: "precision-ats",
  name: "Precision ATS",
  documentType: "RESUME",
  description:
    "A dense, recruiter-friendly layout for longer resumes that still exports as a real matching PDF. Built for clarity and parsing accuracy above all else.",
  accentColor: "#10b981",
  previewImage: "/templates/resume/precision-ats.png",
  tags: ["One column", "ATS-friendly", "Compact", "Simple"],
} satisfies TemplateMeta;
