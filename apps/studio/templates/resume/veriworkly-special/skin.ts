import { createTypeScale } from "../shared/typography";

/**
 * Veriworkly Special is deliberately quiet: one confident, tight-tracked
 * name, and exactly three small, precise touches of the brand accent — the
 * role label, the rule under the header, and the mark before each section
 * title. Everything else is plain ink on the page, so the accent reads as a
 * signature rather than decoration.
 */
export const veriworklySpecialScale = createTypeScale({
  name: 34,
  role: 12,
  contact: 12,
  sectionTitle: 11,
  sectionTitleTracking: 2,
  nameTracking: -0.4,
  roleTracking: 2.6,
  itemTitle: 15,
  meta: 12,
  body: 13.5,

  itemGap: 14,
  itemRowGap: 5,
  headingGap: 12,
  skillGap: 4,
  bulletRowGap: 3,

  bulletIndent: 18,
  bulletGap: 6,
  inlineGapX: 10,
  inlineGapY: 4,
  headGap: 12,
});

/** Header/heading geometry in CSS pixels, shared by `./web.tsx` and `./pdf.tsx`. */
export const veriworklySpecialGeometry = {
  headerRuleHeight: 2,
  headerGap: 28,
  headerPadBottom: 24,
  roleTop: 10,
  contactTop: 18,
  linksTop: 6,
  markSize: 6,
  markGap: 10,
} as const;
