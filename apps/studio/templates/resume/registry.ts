import type { TemplateRenderProps } from "@/types/template";
import type { PdfTemplateProps } from "@/templates/resume/pdf/types";

import { createTemplateRegistry } from "@/templates/shared/template-registry";

import { boldImpactMeta } from "./bold-impact/meta";
import { corporateBriefMeta } from "./corporate-brief/meta";
import { executiveClarityMeta } from "./executive-clarity/meta";
import { modernMinimalMeta } from "./modern-minimal/meta";
import { precisionAtsMeta } from "./precision-ats/meta";
import { timelineFocusMeta } from "./timeline-focus/meta";
import { veriworklySpecialMeta } from "./veriworkly-special/meta";

/**
 * The resume templates.
 *
 * Renderers load on demand — the editor fetches one skin, not six, and the PDF
 * renderers (which drag in `@react-pdf/renderer`) never enter a bundle until an
 * export actually runs. Only `meta.ts` is eager, which is what the template picker
 * and document library read.
 *
 * Adding a template means touching three places, all covered by
 * `tests/contracts/template-render.contract.test.tsx`:
 *   1. this registry
 *   2. features/documents/core/template-catalog.ts
 *   3. public/templates/resume/<id> preview asset
 */
export const resumeTemplateRegistry = createTemplateRegistry<TemplateRenderProps, PdfTemplateProps>(
  [
    {
      meta: executiveClarityMeta,
      loadWeb: () => import("./executive-clarity/web").then((m) => m.CleanProfessionalWeb),
      loadPdf: () => import("./executive-clarity/pdf").then((m) => m.CleanProfessionalPdf),
    },
    {
      meta: precisionAtsMeta,
      loadWeb: () => import("./precision-ats/web").then((m) => m.CompactAtsWeb),
      loadPdf: () => import("./precision-ats/pdf").then((m) => m.CompactAtsPdf),
    },
    {
      meta: modernMinimalMeta,
      loadWeb: () => import("./modern-minimal/web").then((m) => m.ModernMinimalWeb),
      loadPdf: () => import("./modern-minimal/pdf").then((m) => m.ModernMinimalPdf),
    },
    {
      meta: timelineFocusMeta,
      loadWeb: () => import("./timeline-focus/web").then((m) => m.TimelineFocusWeb),
      loadPdf: () => import("./timeline-focus/pdf").then((m) => m.TimelineFocusPdf),
    },
    {
      meta: corporateBriefMeta,
      loadWeb: () => import("./corporate-brief/web").then((m) => m.CorporateBriefWeb),
      loadPdf: () => import("./corporate-brief/pdf").then((m) => m.CorporateBriefPdf),
    },
    {
      meta: boldImpactMeta,
      loadWeb: () => import("./bold-impact/web").then((m) => m.BoldImpactWeb),
      loadPdf: () => import("./bold-impact/pdf").then((m) => m.BoldImpactPdf),
    },
    {
      meta: veriworklySpecialMeta,
      loadWeb: () => import("./veriworkly-special/web").then((m) => m.VeriworklySpecialWeb),
      loadPdf: () => import("./veriworkly-special/pdf").then((m) => m.VeriworklySpecialPdf),
    },
  ],
);
