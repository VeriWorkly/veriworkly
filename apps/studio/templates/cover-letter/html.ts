import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";
import type { TextToken } from "@/templates/shared/text-tokens";

import { FONT_FAMILY_MAP, getFontStylesheetHref } from "@/features/documents/constants/fonts";
import {
  getLinkDisplayText,
  normalizeLinkHref,
} from "@/features/documents/rendering/resume-rendering";
import { escapeHtml } from "@/features/resume/services/resume-formatters";
import { socialIconSvgHtml } from "@/templates/shared/social-icons";

import { getCoverLetterDocumentTitle, type CoverLetterState } from "./shared";

/**
 * What every template's standalone HTML shares: the document shell, the text-token CSS and
 * the link markup. Each template keeps only its own layout CSS and body.
 */

/** A text token as CSS declarations, the HTML twin of `webText`. */
export function htmlFont(token: TextToken): string {
  return `font-size:${token.fontSize}px;line-height:${token.lineHeight}px;font-weight:${token.fontWeight};color:${token.color};`;
}

/**
 * A link as the preview draws it: the icon unless the mode is "url", the text unless it is
 * "icon". An icon-only link keeps its text as the accessible name.
 */
export function htmlLink(
  link: ResumeLinkItem,
  mode: ResumeLinkDisplayMode,
  iconColor: string,
  iconSize: number,
): string {
  const href = escapeHtml(normalizeLinkHref(link.url));
  const text = escapeHtml(getLinkDisplayText(link, mode));

  if (mode === "url") return `<a href="${href}">${text}</a>`;

  const icon = socialIconSvgHtml(link.type, iconColor, iconSize);

  return mode === "icon"
    ? `<a class="icon-link" href="${href}" aria-label="${text}">${icon}</a>`
    : `<a class="icon-link" href="${href}">${icon}<span>${text}</span></a>`;
}

/**
 * The page around a template's CSS and body. Long emails and URLs wrap anywhere rather
 * than overflow their column, as in the preview.
 */
export function coverLetterHtmlDocument(state: CoverLetterState, css: string, body: string) {
  const { appearance, palette } = state;

  return `<!doctype html><html lang="${state.language}" dir="${state.direction}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(getCoverLetterDocumentTitle(state))}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${escapeHtml(getFontStylesheetHref(appearance.fontFamily))}"><style>
*{box-sizing:border-box}body{margin:0;padding:32px 16px;background:${palette.surface};color:${palette.text};font-family:${FONT_FAMILY_MAP[appearance.fontFamily]};overflow-wrap:anywhere}a.icon-link{display:flex;align-items:center;column-gap:4px}${css}</style></head><body>${body}</body></html>`;
}
