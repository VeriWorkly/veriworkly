import { createTypeScale } from "../shared/typography";

/**
 * Executive Clarity keeps the proportions it shipped with; they are restated
 * here as explicit pixels so the preview and the PDF read the same numbers
 * instead of one using Tailwind classes and the other point literals.
 */
export const executiveClarityScale = createTypeScale({
  name: 30,
  role: 18,
  contact: 14,
  sectionTitle: 12,
  sectionTitleTracking: 0.6,
  itemTitle: 16,
  meta: 14,
  body: 14,

  itemGap: 16,
  itemRowGap: 6,
  headingGap: 12,
  skillGap: 4,
  bulletRowGap: 4,

  bulletIndent: 20,
  bulletGap: 6,
  inlineGapX: 12,
  inlineGapY: 4,
  headGap: 12,
});

/** Header/heading geometry in CSS pixels, shared by `./web.tsx` and `./pdf.tsx`. */
export const executiveClarityGeometry = {
  headerGap: 24,
  headerPadBottom: 24,
  nameGapY: 4,
  contactTop: 8,
  linksTop: 8,
  headingRuleGap: 12,
} as const;
