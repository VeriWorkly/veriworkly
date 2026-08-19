import type { TemplateMeta } from "@/features/documents/core/types";

export const atsEssentialCoverLetterMeta: TemplateMeta = {
  id: "ats-essential",
  name: "ATS Essential",
  documentType: "COVER_LETTER",
  description:
    "The classic left-aligned block letter — no column split anywhere on the page, no shaded blocks, just clean text built to parse correctly in any ATS.",
  accentColor: "#57534e",
  previewImage: "/templates/cover-letter/ats-essential.svg",
  tags: ["ATS-friendly", "Maximum compatibility", "Plain text", "Conservative"],
};
