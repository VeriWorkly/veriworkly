import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";
import type { CoverLetterContent, CoverLetterTemplateId } from "@/features/cover-letter/types";
import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";

export type RichTextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

type ContactLink = {
  label: string;
  url: string;
};

export const COVER_LETTER_PROFESSIONAL_ID = "professional" satisfies CoverLetterTemplateId;
export const COVER_LETTER_VERIWORKLY_ID = "veriworkly-special" satisfies CoverLetterTemplateId;

export const PX_TO_PT = 0.75;
export const pt = (value: number) => value * PX_TO_PT;

export function getCoverLetterExportLineHeight(lineHeight: number): number {
  return Math.max(1.15, lineHeight - 0.3);
}

export function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function splitRichTextBlocks(value: string): RichTextBlock[] {
  const blocks: RichTextBlock[] = [];
  const lines = value.split(/\r?\n/);

  let list: string[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    const text = paragraph.join(" ").trim();

    if (text) blocks.push({ type: "paragraph", text });

    paragraph = [];
  }

  function flushList() {
    if (list.length > 0) blocks.push({ type: "list", items: list });

    list = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (bullet) {
      flushParagraph();
      list.push(bullet[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function splitMarkdownLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, ""));
}

export function splitContactLinks(value: string): ContactLink[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, rawUrl] = line.includes("|")
        ? line.split("|").map((part) => part.trim())
        : ["", line];

      const url = rawUrl || rawLabel;

      return {
        label: rawLabel || url.replace(/^https?:\/\//, "").replace(/^www\./, ""),
        url,
      };
    });
}

export function getCoverLetterLinks(content: CoverLetterContent): ResumeLinkItem[] {
  const storedLinks = content.links?.items?.filter((link) => normalizeLinkHref(link.url)) ?? [];

  const legacyLinks: ResumeLinkItem[] = splitContactLinks(content.senderLinks).map(
    (link, index) => ({
      id: `legacy-cover-link-${index}`,
      type: "custom",
      label: link.label,
      url: link.url,
    }),
  );

  return storedLinks.length > 0 ? storedLinks : legacyLinks;
}

export function getCoverLetterLinkDisplayMode(content: CoverLetterContent): ResumeLinkDisplayMode {
  return content.links?.displayMode ?? "icon-username";
}

function blockWeight(block: RichTextBlock) {
  if (block.type === "list")
    return 1 + block.items.reduce((total, item) => total + Math.ceil(item.length / 86), 0);

  return Math.max(1, Math.ceil(block.text.length / 92));
}

export function paginateBlocks(
  blocks: RichTextBlock[],
  firstPageLimit: number,
  nextPageLimit: number,
) {
  const pages: RichTextBlock[][] = [[]];

  let used = 0;
  let limit = firstPageLimit;

  for (const block of blocks) {
    const weight = blockWeight(block);

    if (pages[pages.length - 1].length > 0 && used + weight > limit) {
      pages.push([]);
      limit = nextPageLimit;
      used = 0;
    }

    pages[pages.length - 1].push(block);
    used += weight;
  }

  return pages;
}

export function getCoverLetterState(
  content: CoverLetterContent,
  limits: { firstPage: number; nextPage: number },
) {
  const appearance = content.appearance ?? {
    fontFamily: "geist",
    pageMargin: 40,
    lineHeight: 1.5,
    paragraphSpacing: 10,
    pageColor: "#ffffff",
    textColor: "#18181b",
    accentColor: "#2563eb",
    sidebarColor: "#111827",
  };

  const normalizedAppearance = {
    ...appearance,
    fontFamily: normalizeFontFamilyId(appearance.fontFamily),
  };

  const senderName = content.senderName || content.signature || "Your Name";
  const senderTitle = content.senderTitle || "Role or professional title";

  const contact = [
    content.senderEmail,
    content.senderPhone,
    content.senderLocation,
    content.senderWebsite,
  ].filter(Boolean);

  const renderedLinks = getCoverLetterLinks(content);
  const linkDisplayMode = getCoverLetterLinkDisplayMode(content);

  const recipient = [
    content.recipientName,
    content.recipientTitle,
    content.companyName,
    content.companyLocation,
  ].filter(Boolean);

  const highlights = splitMarkdownLines(content.highlights);

  const bodyBlocks: RichTextBlock[] = [
    ...splitParagraphs(content.opening).map((text) => ({ type: "paragraph" as const, text })),
    ...splitRichTextBlocks(content.body),
  ];

  const pages = paginateBlocks(bodyBlocks, limits.firstPage, limits.nextPage);

  return {
    appearance: normalizedAppearance,
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    recipient,
    highlights,
    pages,
  };
}

export function buildCoverLetterMarkdown(content: CoverLetterContent): string {
  const links = getCoverLetterLinks(content);
  const linkDisplayMode = getCoverLetterLinkDisplayMode(content);

  const contact = [
    content.senderTitle,
    content.senderEmail,
    content.senderPhone,
    content.senderLocation,
    content.senderWebsite,
    ...links.map((link) => getLinkDisplayText(link, linkDisplayMode)),
  ].filter(Boolean);

  const recipient = [
    content.recipientName,
    content.recipientTitle,
    content.companyName,
    content.companyLocation,
  ].filter(Boolean);

  const body = splitRichTextBlocks(content.body)
    .map((block) =>
      block.type === "list" ? block.items.map((item) => `- ${item}`).join("\n") : block.text,
    )
    .join("\n\n");

  const parts = [
    `# ${content.senderName || "Your Name"}`,
    contact.length ? contact.join(" | ") : "",
    content.date,
    recipient.length ? recipient.join("\n") : "",
    content.subject ? `**Subject:** ${content.subject}` : "",
    content.greeting,
    content.opening,
    body,
    splitMarkdownLines(content.highlights)
      .map((line) => `- ${line}`)
      .join("\n"),
    content.closing,
    content.signature || content.senderName,
    content.postscript ? `P.S. ${content.postscript}` : "",
  ];

  return parts.filter(Boolean).join("\n\n").trim();
}

export function buildCoverLetterText(content: CoverLetterContent): string {
  return buildCoverLetterMarkdown(content)
    .replaceAll(/^#{1,6}\s?/gm, "")
    .replaceAll(/\*\*(.*?)\*\*/g, "$1")
    .trim();
}
