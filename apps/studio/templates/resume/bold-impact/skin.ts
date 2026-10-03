import { createTypeScale } from "../shared/typography";

/** Louder masthead, everything else stays conservative for parsers. */
export const boldImpactScale = createTypeScale({
  name: 32,
  role: 14,
  contact: 11.5,
  sectionTitle: 11,
  sectionTitleTracking: 0.55,
  nameTracking: 1.5,
  roleTracking: 0.4,
  itemTitle: 15,
  meta: 11.5,
  body: 13,
  itemGap: 12,
  headingGap: 10,
});

/** Header/heading geometry in CSS pixels, shared by `./web.tsx` and `./pdf.tsx`. */
export const boldImpactGeometry = {
  headerGap: 24,
  headerPadBottom: 16,
  headerRule: 3,
  roleTop: 4,
  contactTop: 12,
  linksTop: 4,
  underlineWidth: 34,
  underlineHeight: 3,
  underlineTop: 3,
} as const;
