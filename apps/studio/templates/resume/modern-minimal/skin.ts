import { createTypeScale } from "../shared/typography";

/** Airy scale: smaller labels, larger gaps, no rules anywhere. */
export const modernMinimalScale = createTypeScale({
  name: 28,
  role: 14,
  contact: 11.5,
  sectionTitle: 10,
  sectionTitleTracking: 0.5,
  nameTracking: -0.3,
  itemTitle: 14.5,
  meta: 11.5,
  body: 13,
  itemGap: 14,
  headingGap: 10,
});

/**
 * Header/heading geometry in CSS pixels. Both `./web.tsx` and `./pdf.tsx` read
 * these, so a change moves the preview and the export together.
 */
export const modernMinimalGeometry = {
  headerGap: 28,
  nameGapX: 0,
  nameGapY: 2,
  roleTop: 4,
  contactTop: 12,
  linksTop: 4,
} as const;

export const modernMinimalPagePadding = (padding: number) => Math.round(padding * 1.2);
export const modernMinimalSectionSpacing = (spacing: number) => Math.round(spacing * 1.05);
