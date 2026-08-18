/**
 * Link data, shared by every document type.
 *
 * These lived in `@/types/resume` as `ResumeLinkItem` / `ResumeLinkDisplayMode`, which the
 * cover letter imported verbatim — a shared shape wearing one type's name. `@/types/resume`
 * now aliases these, so the resume side is unchanged and every generic surface (the shared
 * `LinksEditor`, the cover letter, the templates' link rendering) can name them neutrally.
 */

export type DocumentLinkType =
  | "github"
  | "linkedin"
  | "dribbble"
  | "twitter"
  | "portfolio"
  | "behance"
  | "medium"
  | "youtube"
  | "custom";

/**
 * All three modes are rendered by both document types' templates — resume and cover letter
 * alike go through `getLinkDisplayText`. The cover-letter editor used to offer only two,
 * which made `"url"` unreachable for cover letters despite working end to end.
 */
export type DocumentLinkDisplayMode = "icon" | "url" | "icon-username";

export interface DocumentLinkItem {
  id: string;
  type: DocumentLinkType;
  label: string;
  url: string;
}

export interface DocumentLinks {
  displayMode: DocumentLinkDisplayMode;
  items: DocumentLinkItem[];
}
