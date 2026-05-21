import type { TemplateMeta } from "./types";
import type { DocumentType } from "./document-types";

import { precisionAtsMeta } from "@/templates/resume/precision-ats/meta";
import { executiveClarityMeta } from "@/templates/resume/executive-clarity/meta";
import { veriworklyCoverLetterMeta } from "@/templates/cover-letter/veriworkly/meta";
import { professionalCoverLetterMeta } from "@/templates/cover-letter/professional/meta";

/**
 * Template catalog per document type.
 *
 * IDs MUST match the `id` fields in:
 *   apps/studio/templates/resume/<id>/meta.ts
 *   apps/site/config/templates.ts
 *
 * They are used as `templateId` in stored documents and as URL slugs.
 */

export const templateCatalogByType: Record<DocumentType, TemplateMeta[]> = {
  RESUME: [executiveClarityMeta, precisionAtsMeta],

  COVER_LETTER: [professionalCoverLetterMeta, veriworklyCoverLetterMeta],

  FORMAL_LETTER: [
    {
      id: "formal-letter-modern",
      name: "Modern Formal Letter",
      documentType: "FORMAL_LETTER",
      description: "Structured formal correspondence format.",
      accentColor: "#0ea5e9",
      previewImage: "",
      tags: ["Formal", "Letter"],
    },
  ],

  INVOICE: [
    {
      id: "invoice-clean",
      name: "Clean Invoice",
      documentType: "INVOICE",
      description: "Deterministic line-item invoice layout.",
      accentColor: "#10b981",
      previewImage: "",
      tags: ["Invoice", "Clean"],
    },
  ],
};

export const allTemplates = Object.values(templateCatalogByType).flat();
