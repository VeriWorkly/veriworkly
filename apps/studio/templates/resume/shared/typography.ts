/**
 * A single source of truth for a template's type scale, rhythm and strokes.
 *
 * Every value is expressed in CSS pixels. The web renderer applies them as
 * `px`, the PDF renderer converts them with `pxToPt`, so the live preview and
 * the exported PDF cannot drift apart.
 *
 * Why every spacing value lives here rather than in Tailwind classes on one
 * side and `StyleSheet` numbers on the other: a bare number in a react-pdf
 * style is interpreted as **points**, not pixels (`@react-pdf/stylesheet`
 * returns unitless values untouched, and even the string `"3px"` is converted
 * with a default DPI of 72, so it also means 3pt). Anything that reaches
 * react-pdf without `pxToPt` renders 1.333x too large.
 */
export interface ResumeTypeScale {
  // --- Type sizes -----------------------------------------------------------
  name: number;
  role: number;
  contact: number;
  sectionTitle: number;
  itemTitle: number;
  meta: number;
  body: number;

  // --- Letter spacing -------------------------------------------------------
  // At most 0.05em (tracking / size). A PDF has no words, only positioned
  // glyphs, and text extractors call a gap wider than a fraction of the font
  // size a space: measured on this renderer's output, Poppler splits headings
  // into letters from 0.07em, pdf.js from 0.09em and PDFBox from 0.1em. An ATS
  // that reads "E X P E R I E N C E" finds no Experience section.
  // `tests/contracts/template-ats.contract.test.tsx` holds every template to it.
  sectionTitleTracking: number;
  nameTracking: number;
  roleTracking: number;

  // --- Vertical rhythm ------------------------------------------------------
  /** Between two items inside the same section. */
  itemGap: number;
  /** Between two skill lines. */
  skillGap: number;
  /** Between the rows inside one item (title row, subtitle, summary, bullets). */
  itemRowGap: number;
  /** Between the section heading and its first item. */
  headingGap: number;
  /** Between two highlight bullets. */
  bulletRowGap: number;

  // --- Horizontal rhythm ----------------------------------------------------
  /** Width of the left meta column when `itemLayout` is "gutter". */
  gutterWidth: number;
  /** Space between the gutter and the content column. */
  gutterGap: number;
  /** Space between an item title and its right-hand meta. */
  headGap: number;
  /** Contact / link row gaps. */
  inlineGapX: number;
  inlineGapY: number;
  /** Space between a social icon and its label. */
  iconGap: number;
  /** Where bullet text starts, measured from the item's left edge. */
  bulletIndent: number;
  /** Space between the bullet marker and its text. */
  bulletGap: number;

  // --- Strokes --------------------------------------------------------------
  /** Thickness of hairline rules and dividers. */
  hairline: number;
}

export const BASE_TYPE_SCALE: ResumeTypeScale = {
  name: 30,
  role: 15,
  contact: 12,
  sectionTitle: 11,
  itemTitle: 15,
  meta: 12,
  body: 13,

  sectionTitleTracking: 0.55,
  nameTracking: 0,
  roleTracking: 0,

  itemGap: 12,
  skillGap: 4,
  itemRowGap: 4,
  headingGap: 10,
  bulletRowGap: 2,

  gutterWidth: 104,
  gutterGap: 16,
  headGap: 12,
  inlineGapX: 8,
  inlineGapY: 4,
  iconGap: 4,
  bulletIndent: 16,
  bulletGap: 6,

  hairline: 1,
};

export function createTypeScale(overrides: Partial<ResumeTypeScale> = {}): ResumeTypeScale {
  return { ...BASE_TYPE_SCALE, ...overrides };
}

/**
 * The bullet marker. `disc` on the web and U+2022 in the PDF render the same
 * dot; glyph coverage is verified for all three embedded families.
 */
export const BULLET_MARKER = "•";
