import { createTypeScale } from "../shared/typography";

/** Business-document proportions: compact masthead, steady body rhythm. */
export const corporateBriefScale = createTypeScale({
  name: 26,
  role: 13.5,
  contact: 11,
  sectionTitle: 10.5,
  sectionTitleTracking: 0.52,
  itemTitle: 14.5,
  meta: 11.5,
  body: 13,
  itemGap: 12,
  headingGap: 9,
});

/** Header/heading geometry in CSS pixels, shared by `./web.tsx` and `./pdf.tsx`. */
export const corporateBriefGeometry = {
  headerGap: 20,
  headerPadBottom: 16,
  headerColumnGap: 24,
  headerRowGap: 12,
  roleTop: 4,
  contactRowGap: 4,
  barWidth: 4,
  barHeightPad: 2,
  barGap: 8,
} as const;
