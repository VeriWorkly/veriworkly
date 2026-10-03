import { createTypeScale } from "../shared/typography";

/** Date gutter needs a slightly narrower content measure and tighter items. */
export const timelineFocusScale = createTypeScale({
  name: 27,
  role: 14,
  contact: 11.5,
  sectionTitle: 10.5,
  sectionTitleTracking: 0.52,
  itemTitle: 14.5,
  meta: 11.5,
  body: 13,
  itemGap: 12,
  headingGap: 9,
  gutterWidth: 108,
});

/** Header/heading geometry in CSS pixels, shared by `./web.tsx` and `./pdf.tsx`. */
export const timelineFocusGeometry = {
  headerGap: 20,
  headerPadBottom: 16,
  headerRule: 2,
  nameGapY: 4,
  contactTop: 8,
  linksTop: 4,
  headingRuleGap: 12,
} as const;
