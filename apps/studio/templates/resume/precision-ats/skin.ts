import { createTypeScale } from "../shared/typography";

/**
 * Precision ATS keeps the dense proportions it shipped with, restated here as
 * explicit pixels so the preview and the PDF read the same numbers.
 */
export const precisionAtsScale = createTypeScale({
  name: 24,
  role: 14,
  contact: 12,
  sectionTitle: 11.5,
  sectionTitleTracking: 0.57,
  itemTitle: 14,
  meta: 12,
  body: 14,

  itemGap: 10,
  itemRowGap: 4,
  headingGap: 8,
  skillGap: 4,
  bulletRowGap: 2,

  bulletIndent: 20,
  bulletGap: 6,
  inlineGapX: 8,
  inlineGapY: 4,
  headGap: 12,
});

/** Header/heading geometry in CSS pixels, shared by `./web.tsx` and `./pdf.tsx`. */
export const precisionAtsGeometry = {
  headerGap: 16,
  headerPadBottom: 12,
  nameGapY: 4,
  contactTop: 8,
  linksTop: 4,
  headingPadBottom: 4,
} as const;

export const precisionAtsPagePadding = (padding: number) => Math.max(24, padding * 0.85);
export const precisionAtsSectionSpacing = (spacing: number) => Math.max(10, spacing * 0.6);
