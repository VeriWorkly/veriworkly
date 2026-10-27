import type { ResumeRenderStyle } from "@/features/documents/rendering/resume-rendering";
import type { TextToken } from "@/templates/shared/text-tokens";
import type { ResumeRenderItem } from "./model";
import type { ResumeTokens } from "./tokens";
import type { ResumeTypeScale } from "./typography";

import { FONT_REGISTRY } from "@/features/documents/constants/fonts";
import { getPageGeometry } from "@/templates/shared/page-geometry";
import { GLYPH_WIDTHS, GLYPH_WIDTH_FIRST_CODE_POINT } from "@/templates/pdf/glyph-widths";

export { HEADING_PRESENCE_LINES } from "@/templates/shared/pagination";

export type ResumeItemLayout = "stacked" | "gutter";

/** The page's text area and an item's prose column, in px. */
export function getTextWidths(
  style: ResumeRenderStyle,
  scale: ResumeTypeScale,
  pagePadding: number,
  layout: ResumeItemLayout,
) {
  const contentWidth = getPageGeometry(style.paperSize).widthPx - pagePadding * 2;
  const columnWidth =
    layout === "gutter" ? contentWidth - scale.gutterWidth - scale.gutterGap : contentWidth;

  return { contentWidth, columnWidth };
}

/**
 * An upper bound on the height `text` lays out to in a column `width` px wide.
 *
 * Measured, not guessed: with the family's real advance widths, words are filled into lines
 * greedily — the fewest lines they can take — and react-pdf's line breaker, which optimises
 * the look of a paragraph rather than its length, is allowed a tenth more. A character
 * outside the width table counts as a full em, wider than any glyph a resume prints.
 */
function maxTextHeight(text: string, token: TextToken, width: number, family: string): number {
  if (!text) return 0;

  const widths = GLYPH_WIDTHS[family]?.[(token.fontWeight ?? 400) >= 600 ? 700 : 400];
  const advance = (character: string) =>
    ((widths?.[(character.codePointAt(0) ?? 0) - GLYPH_WIDTH_FIRST_CODE_POINT] ?? 1000) / 1000) *
      token.fontSize +
    (token.letterSpacing ?? 0);
  const space = advance(" ");

  let lines = 0;

  for (const paragraph of text.split("\n")) {
    let count = 1;
    let used = 0;

    for (const word of paragraph.split(" ")) {
      const wordWidth = [...word].reduce((sum, character) => sum + advance(character), 0);

      if (used > 0 && used + space + wordWidth <= width) {
        used += space + wordWidth;
        continue;
      }

      if (used > 0) count += 1;

      // A token wider than the column is broken inside itself.
      const extraLines = Math.max(0, Math.ceil(wordWidth / width) - 1);
      count += extraLines;
      used = wordWidth - extraLines * width;
    }

    lines += count > 1 ? count + Math.ceil(count / 10) : count;
  }

  return lines * token.lineHeight;
}

/** What opens a section: its first item, or the first paragraph or skill line. */
export type ResumeSectionStart = { item: ResumeRenderItem } | { text: string };

/**
 * Which blocks a resume holds together on one page — one answer for both renderers.
 *
 * The preview moves an item, and a section heading with its first block, to the next page
 * whole rather than break it. react-pdf cannot do that for a block taller than a page: an
 * unbreakable block that does not fit is placed where it starts and everything below the
 * page edge is cut off. So a block is held together only when it provably fits a page; a
 * longer one flows across pages, in the PDF and in the preview alike (`ResumePagedPreview`
 * splits what the web template marks `data-split`).
 */
export function createResumeKeepTogether(
  {
    scale,
    style,
    tokens,
  }: { scale: ResumeTypeScale; style: ResumeRenderStyle; tokens: ResumeTokens },
  pagePadding: number,
  layout: ResumeItemLayout,
) {
  const capacity = getPageGeometry(style.paperSize).heightPx - pagePadding * 2;
  const family = FONT_REGISTRY[style.fontFamily].primaryFamily;
  const { contentWidth, columnWidth } = getTextWidths(style, scale, pagePadding, layout);
  const bound = (text: string, token: TextToken, width: number) =>
    maxTextHeight(text, token, width, family);

  const itemHeight = (item: ResumeRenderItem) => {
    const linkText = item.link?.text ?? "";
    const bullets = item.bullets.map((bullet) =>
      bound(bullet, tokens.body, columnWidth - scale.bulletIndent),
    );

    // The title shares its row with the meta, so each is given half the column.
    const rows = [
      Math.max(
        tokens.itemTitle.lineHeight,
        bound(item.title, tokens.itemTitle, columnWidth / 2) +
          bound(`${item.meta} ${linkText}`.trim(), tokens.headMeta, columnWidth / 2),
      ),
      bound(`${item.subtitle} | ${linkText}`, tokens.subtitle, columnWidth),
      bound(item.summary, tokens.body, columnWidth),
      bullets.reduce((sum, height) => sum + height + scale.bulletRowGap, 0),
    ];
    const body = rows.reduce((sum, height) => sum + height + scale.itemRowGap, 0);

    return layout === "gutter"
      ? Math.max(body, bound(item.meta, tokens.gutterMeta, scale.gutterWidth))
      : body;
  };

  return {
    item: (item: ResumeRenderItem) => itemHeight(item) <= capacity,
    sectionStart: (title: string, start: ResumeSectionStart | null) => {
      // Generous: a skin's heading is its title plus rules and gaps well inside this.
      const heading = bound(title, tokens.sectionTitle, contentWidth) + scale.headingGap + 24;
      const first = !start
        ? 0
        : "item" in start
          ? itemHeight(start.item)
          : bound(start.text, tokens.body, contentWidth);

      return heading + first <= capacity;
    },
  };
}
