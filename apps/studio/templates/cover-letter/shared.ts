import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";
import type {
  CoverLetterContent,
  CoverLetterSectionId,
  CoverLetterTemplateId,
} from "@/features/cover-letter/types";
import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";

import {
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";

export type RichTextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

export type CoverLetterFlowContent = Pick<
  CoverLetterContent,
  "body" | "closing" | "greeting" | "highlights" | "opening" | "postscript" | "signature"
>;

export type ProfessionalFlowItem =
  | { id: string; type: "greeting"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "body-list"; items: string[] }
  | { id: string; type: "proof-list"; items: string[] }
  | { id: string; type: "closing"; text: string }
  | { id: string; type: "signature"; text: string }
  | { id: string; type: "postscript"; text: string };

export type VeriworklyFlowItem =
  | { id: string; type: "greeting"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "body-list"; items: string[] }
  | { id: string; type: "proof-heading" }
  | { id: string; type: "proof-item"; index: number; isLast: boolean; text: string }
  | { id: string; type: "signoff"; closing?: string; signature: string }
  | { id: string; type: "postscript"; text: string };

type ContactLink = {
  label: string;
  url: string;
};

export const COVER_LETTER_PROFESSIONAL_ID = "professional" satisfies CoverLetterTemplateId;
export const COVER_LETTER_VERIWORKLY_ID = "veriworkly-special" satisfies CoverLetterTemplateId;

export const PX_TO_PT = 0.75;
export const pt = (value: number) => value * PX_TO_PT;

export function isCoverLetterSectionVisible(
  content: CoverLetterContent,
  sectionId: CoverLetterSectionId,
) {
  return !content.appearance?.hiddenSections?.includes(sectionId);
}

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

export function splitTextIntoChunks(text: string, wordsPerChunk: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length <= wordsPerChunk) return [text];

  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += wordsPerChunk) {
    chunks.push(words.slice(index, index + wordsPerChunk).join(" "));
  }

  return chunks;
}

export function getCoverLetterFlowSenderName(content: CoverLetterContent) {
  return content.senderName || content.signature || "Your Name";
}

export function buildCoverLetterFlowContent(content: CoverLetterContent): CoverLetterFlowContent {
  const showLetter = isCoverLetterSectionVisible(content, "letter");

  return {
    body: showLetter ? content.body : "",
    closing: showLetter ? content.closing : "",
    greeting: showLetter ? content.greeting : "",
    highlights: showLetter ? content.highlights : "",
    opening: showLetter ? content.opening : "",
    postscript: showLetter ? content.postscript : "",
    signature: showLetter ? content.signature : "",
  };
}

export function paginateMeasuredItems<T extends { id: string }>(
  items: T[],
  fitsPage: (items: T[], pageIndex: number) => boolean,
  keepWithNext?: (item: T, nextItem: T | undefined) => boolean,
) {
  const pages: T[][] = [[]];
  let pageIndex = 0;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    const nextItem = items[itemIndex + 1];
    const candidate = [...pages[pageIndex], item];
    const fitCandidate =
      keepWithNext?.(item, nextItem) && nextItem ? [...candidate, nextItem] : candidate;

    if (pages[pageIndex].length > 0 && !fitsPage(fitCandidate, pageIndex)) {
      pages.push([]);
      pageIndex += 1;
    }

    pages[pageIndex].push(item);
  }

  return pages.filter((page) => page.length > 0);
}

export function paginateWeightedItems<T>(
  items: T[],
  getItemWeight: (item: T) => number,
  getPageLimit: (pageIndex: number) => number,
  keepWithNext?: (item: T, nextItem: T | undefined) => boolean,
) {
  const pages: T[][] = [[]];
  let pageIndex = 0;
  let used = 0;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    const nextItem = items[itemIndex + 1];
    const weight = getItemWeight(item);
    const keepWithNextWeight =
      keepWithNext?.(item, nextItem) && nextItem ? getItemWeight(nextItem) : 0;

    if (
      pages[pageIndex].length > 0 &&
      used + weight + keepWithNextWeight > getPageLimit(pageIndex)
    ) {
      pages.push([]);
      pageIndex += 1;
      used = 0;
    }

    pages[pageIndex].push(item);
    used += weight;
  }

  return pages.filter((page) => page.length > 0);
}

export function getFlowPageKey<T>(pages: T[][]) {
  return pages.map((page) => page.map((item) => JSON.stringify(item)).join(",")).join("|");
}

export function buildProfessionalFlowItems(
  content: CoverLetterFlowContent,
  senderName: string,
  paragraphChunkWords = 70,
) {
  const items: ProfessionalFlowItem[] = [];

  if (content.greeting) items.push({ id: "greeting", type: "greeting", text: content.greeting });

  const bodyBlocks: RichTextBlock[] = [
    ...splitParagraphs(content.opening).map((text) => ({ type: "paragraph" as const, text })),
    ...splitRichTextBlocks(content.body),
  ];

  bodyBlocks.forEach((block, blockIndex) => {
    if (block.type === "paragraph") {
      splitTextIntoChunks(block.text, paragraphChunkWords).forEach((text, chunkIndex) => {
        items.push({ id: `body-${blockIndex}-${chunkIndex}`, type: "paragraph", text });
      });
      return;
    }

    items.push({ id: `body-list-${blockIndex}`, type: "body-list", items: block.items });
  });

  const highlights = splitMarkdownLines(content.highlights);

  if (highlights.length > 0) {
    items.push({ id: "proof-list", type: "proof-list", items: highlights });
  }

  if (content.closing) items.push({ id: "closing", type: "closing", text: content.closing });

  items.push({ id: "signature", type: "signature", text: content.signature || senderName });

  if (content.postscript) {
    splitTextIntoChunks(content.postscript, 55).forEach((text, index) => {
      items.push({ id: `postscript-${index}`, type: "postscript", text });
    });
  }

  return items;
}

export function getProfessionalFlowItemWeight(item: ProfessionalFlowItem) {
  if (item.type === "body-list" || item.type === "proof-list") {
    return 2 + item.items.reduce((total, listItem) => total + Math.ceil(listItem.length / 78), 0);
  }

  if (item.type === "postscript") return 2 + Math.ceil(item.text.length / 110);
  if (item.type === "closing" || item.type === "signature" || item.type === "greeting") return 1;

  return Math.max(1, Math.ceil(item.text.length / 92));
}

export function buildVeriworklyFlowItems(
  content: CoverLetterFlowContent,
  senderName: string,
  paragraphChunkWords = 62,
) {
  const items: VeriworklyFlowItem[] = [];

  if (content.greeting) items.push({ id: "greeting", type: "greeting", text: content.greeting });

  const bodyBlocks: RichTextBlock[] = [
    ...splitParagraphs(content.opening).map((text) => ({ type: "paragraph" as const, text })),
    ...splitRichTextBlocks(content.body),
  ];

  bodyBlocks.forEach((block, blockIndex) => {
    if (block.type === "paragraph") {
      splitTextIntoChunks(block.text, paragraphChunkWords).forEach((text, chunkIndex) => {
        items.push({ id: `body-${blockIndex}-${chunkIndex}`, type: "paragraph", text });
      });
      return;
    }

    items.push({ id: `body-list-${blockIndex}`, type: "body-list", items: block.items });
  });

  const highlights = splitMarkdownLines(content.highlights);

  if (highlights.length > 0) {
    items.push({ id: "proof-heading", type: "proof-heading" });
    highlights.forEach((text, index) => {
      items.push({
        id: `proof-${index}`,
        type: "proof-item",
        index,
        isLast: index === highlights.length - 1,
        text,
      });
    });
  }

  items.push({
    id: "signoff",
    type: "signoff",
    closing: content.closing || undefined,
    signature: content.signature || senderName,
  });

  if (content.postscript) {
    splitTextIntoChunks(content.postscript, 50).forEach((text, index) => {
      items.push({ id: `postscript-${index}`, type: "postscript", text });
    });
  }

  return items;
}

export function getVeriworklyFlowItemWeight(item: VeriworklyFlowItem) {
  if (item.type === "body-list") {
    return 2 + item.items.reduce((total, listItem) => total + Math.ceil(listItem.length / 70), 0);
  }

  if (item.type === "proof-heading") return 2;
  if (item.type === "proof-item") return Math.max(1, Math.ceil(item.text.length / 70));
  if (item.type === "postscript") return 2 + Math.ceil(item.text.length / 100);
  if (item.type === "signoff") return item.closing ? 2 : 1;
  if (item.type === "greeting") return 1;

  return Math.max(1, Math.ceil(item.text.length / 82));
}

export function keepVeriworklyProofHeadingWithNext(
  item: VeriworklyFlowItem,
  nextItem: VeriworklyFlowItem | undefined,
) {
  return item.type === "proof-heading" && Boolean(nextItem);
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
    hiddenSections: [],
  };

  const normalizedAppearance = {
    ...appearance,
    fontFamily: normalizeFontFamilyId(appearance.fontFamily),
  };

  const senderName = content.senderName || content.signature || "Your Name";
  const senderTitle = content.senderTitle || "Role or professional title";

  const contact = [
    ...(isCoverLetterSectionVisible(content, "profile")
      ? [content.senderEmail, content.senderPhone, content.senderLocation, content.senderWebsite]
      : []),
  ].filter(Boolean);

  const renderedLinks = isCoverLetterSectionVisible(content, "links")
    ? getCoverLetterLinks(content)
    : [];
  const linkDisplayMode = getCoverLetterLinkDisplayMode(content);

  const recipient = isCoverLetterSectionVisible(content, "target")
    ? [
        content.recipientName,
        content.recipientTitle,
        content.companyName,
        content.companyLocation,
      ].filter(Boolean)
    : [];

  const highlights = splitMarkdownLines(content.highlights);

  const bodyBlocks: RichTextBlock[] = [
    ...(isCoverLetterSectionVisible(content, "letter")
      ? [
          ...splitParagraphs(content.opening).map((text) => ({
            type: "paragraph" as const,
            text,
          })),
          ...splitRichTextBlocks(content.body),
        ]
      : []),
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
    isCoverLetterSectionVisible(content, "letter") ? content.greeting : "",
    isCoverLetterSectionVisible(content, "letter") ? content.opening : "",
    isCoverLetterSectionVisible(content, "letter") ? body : "",
    isCoverLetterSectionVisible(content, "letter")
      ? splitMarkdownLines(content.highlights)
          .map((line) => `- ${line}`)
          .join("\n")
      : "",
    isCoverLetterSectionVisible(content, "letter") ? content.closing : "",
    isCoverLetterSectionVisible(content, "letter") ? content.signature || content.senderName : "",
    isCoverLetterSectionVisible(content, "letter") && content.postscript
      ? `P.S. ${content.postscript}`
      : "",
  ];

  return parts.filter(Boolean).join("\n\n").trim();
}

export function buildCoverLetterText(content: CoverLetterContent): string {
  return buildCoverLetterMarkdown(content)
    .replaceAll(/^#{1,6}\s?/gm, "")
    .replaceAll(/\*\*(.*?)\*\*/g, "$1")
    .trim();
}
