import type { ComponentType } from "react";

import type { CoverLetterContent } from "@/features/cover-letter/types";

import { createTemplateRegistry } from "@/templates/shared/template-registry";

import { professionalCoverLetterMeta } from "./professional/meta";
import { veriworklyCoverLetterMeta } from "./veriworkly/meta";
import { minimalistCoverLetterMeta } from "./minimalist/meta";
import { executiveCoverLetterMeta } from "./executive/meta";
import { atsEssentialCoverLetterMeta } from "./ats-essential/meta";

export interface CoverLetterRenderProps {
  content: CoverLetterContent;
}

/** Builds the standalone HTML export for one template. */
export type CoverLetterHtmlBuilder = (content: CoverLetterContent) => string;

/**
 * The cover letter templates, mirroring `templates/resume/registry.ts`.
 *
 * This replaces the `if (templateId === COVER_LETTER_VERIWORKLY_ID)` branches that
 * were duplicated across `web.tsx`, `pdf.tsx`, and `buildCoverLetterHtml` — three
 * places to edit per template, each able to drift from the others.
 */
export const coverLetterTemplateRegistry = createTemplateRegistry<
  CoverLetterRenderProps,
  CoverLetterRenderProps
>([
  {
    meta: professionalCoverLetterMeta,
    loadWeb: () =>
      import("./professional/web").then(
        (m) => m.ProfessionalCoverLetterPreview as ComponentType<CoverLetterRenderProps>,
      ),
    loadPdf: () =>
      import("./professional/pdf").then(
        (m) => m.ProfessionalCoverLetterPdf as ComponentType<CoverLetterRenderProps>,
      ),
  },
  {
    meta: veriworklyCoverLetterMeta,
    loadWeb: () =>
      import("./veriworkly/web").then(
        (m) => m.VeriworklyCoverLetterPreview as ComponentType<CoverLetterRenderProps>,
      ),
    loadPdf: () =>
      import("./veriworkly/pdf").then(
        (m) => m.VeriworklyCoverLetterPdf as ComponentType<CoverLetterRenderProps>,
      ),
  },
  {
    meta: minimalistCoverLetterMeta,
    loadWeb: () =>
      import("./minimalist/web").then(
        (m) => m.MinimalistCoverLetterPreview as ComponentType<CoverLetterRenderProps>,
      ),
    loadPdf: () =>
      import("./minimalist/pdf").then(
        (m) => m.MinimalistCoverLetterPdf as ComponentType<CoverLetterRenderProps>,
      ),
  },
  {
    meta: executiveCoverLetterMeta,
    loadWeb: () =>
      import("./executive/web").then(
        (m) => m.ExecutiveCoverLetterPreview as ComponentType<CoverLetterRenderProps>,
      ),
    loadPdf: () =>
      import("./executive/pdf").then(
        (m) => m.ExecutiveCoverLetterPdf as ComponentType<CoverLetterRenderProps>,
      ),
  },
  {
    meta: atsEssentialCoverLetterMeta,
    loadWeb: () =>
      import("./ats-essential/web").then(
        (m) => m.AtsEssentialCoverLetterPreview as ComponentType<CoverLetterRenderProps>,
      ),
    loadPdf: () =>
      import("./ats-essential/pdf").then(
        (m) => m.AtsEssentialCoverLetterPdf as ComponentType<CoverLetterRenderProps>,
      ),
  },
]);

/**
 * HTML builders, resolved the same way as the renderers. Kept separate from the
 * registry's component loaders because these are plain string functions, not components.
 */
const HTML_BUILDER_LOADERS: Record<string, () => Promise<CoverLetterHtmlBuilder>> = {
  [professionalCoverLetterMeta.id]: () =>
    import("./professional/web").then((m) => m.buildProfessionalCoverLetterHtml),
  [veriworklyCoverLetterMeta.id]: () =>
    import("./veriworkly/web").then((m) => m.buildVeriworklyCoverLetterHtml),
  [minimalistCoverLetterMeta.id]: () =>
    import("./minimalist/web").then((m) => m.buildMinimalistCoverLetterHtml),
  [executiveCoverLetterMeta.id]: () =>
    import("./executive/web").then((m) => m.buildExecutiveCoverLetterHtml),
  [atsEssentialCoverLetterMeta.id]: () =>
    import("./ats-essential/web").then((m) => m.buildAtsEssentialCoverLetterHtml),
};

export function loadCoverLetterHtmlBuilder(
  templateId: string | undefined,
): Promise<CoverLetterHtmlBuilder> {
  const id = coverLetterTemplateRegistry.getMeta(templateId).id;
  const loader =
    HTML_BUILDER_LOADERS[id] ?? HTML_BUILDER_LOADERS[coverLetterTemplateRegistry.ids[0]];

  return loader();
}
