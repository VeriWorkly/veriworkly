import { pxToPt } from "@/templates/shared/page-geometry";

// The page box is shared with every other document type: `getPageGeometry` in
// `templates/shared/page-geometry.ts`.
export { pxToPt };

export const RESUME_LAYOUT = {
  pagePadding: 32,
  sectionSpacing: 24,
  fontSize: 14,
  bodyLineHeight: 1.5,
  headingLineHeight: 1.1,
  headerNameSize: 30,
  headerRoleSize: 16,
  bodyTextSize: 12,
  mutedTextSize: 11,
  sectionTitleSize: 16,
  sectionTitleSpacing: 12,
  itemGap: 16,
} as const;

/**
 * What the Section gap and Page margin sliders offer, in px. The low ends are also the
 * floors the shared template code draws at, so no setting below them can be chosen. The
 * labels show the setting: Precision ATS and Modern Minimal deliberately scale it, so
 * they draw a different value from the one shown.
 */
export const RESUME_SPACING_LIMITS = {
  sectionSpacing: { min: 8, max: 44 },
  pagePadding: { min: 20, max: 52 },
} as const;
