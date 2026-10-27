import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";
import type { CoverLetterContent, CoverLetterSectionId } from "@/features/cover-letter/types";
import type { FlowSplitKind } from "./measure";

import { DEFAULT_COVER_LETTER_APPEARANCE, formatPhoneForDisplay } from "@veriworkly/profile-core";

import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";
import { isHexColor, toSafeHexColor } from "@/features/documents/utils/hex-color";
import {
  documentDirection,
  formatDocumentDate,
  toDocumentLanguage,
} from "@/features/documents/utils/formatters";
import { getPageGeometry, toPaperSize } from "@/templates/shared/page-geometry";
import { COVER_LETTER_SCALE, createCoverLetterTokens } from "./tokens";

import {
  cleanResumeText,
  normalizeLinkHref,
  getLinkDisplayText,
} from "@/features/documents/rendering/resume-rendering";

export type RichTextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

export type CoverLetterFlowContent = Pick<
  CoverLetterContent,
  "body" | "closing" | "greeting" | "highlights" | "opening" | "postscript" | "signature"
>;

/**
 * `paragraph` and `postscript` text is one line of words — the only items a page break
 * may cut through (see `measure.ts`). `postscript` carries its own "P.S." prefix.
 */
export type ProfessionalFlowItem =
  | { id: string; type: "greeting"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "body-list"; items: string[] }
  | { id: string; type: "proof-list"; items: string[] }
  | { id: string; type: "closing"; text: string }
  | { id: string; type: "signature"; text: string }
  | { id: string; type: "postscript"; text: string };

/**
 * The "Selected Proof" heading travels with the first proof item (`heading`), so the
 * heading can never be left alone at the foot of a page in either renderer.
 */
export type VeriworklyFlowItem =
  | { id: string; type: "greeting"; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "body-list"; items: string[] }
  | {
      id: string;
      type: "proof-item";
      heading: boolean;
      index: number;
      isLast: boolean;
      text: string;
    }
  | { id: string; type: "signoff"; closing: string; signature: string }
  | { id: string; type: "postscript"; text: string };

// ---------------------------------------------------------------------------
// Appearance-derived palette
//
// Every cover-letter renderer (preview, HTML export, PDF) reads its colours
// from here, so the user-facing "Text color" control moves all of the text.
// ---------------------------------------------------------------------------

export interface CoverLetterPalette {
  /** Full-strength text: headings, greeting, signature. */
  strong: string;
  /** Body copy. */
  text: string;
  /** Secondary lines: contact details, recipient block, captions. */
  muted: string;
  /** Tertiary lines: dates, small labels. */
  soft: string;
  /** Hairlines and dividers. */
  border: string;
  /** Tinted blocks such as bullet-list backgrounds. */
  surface: string;
  accent: string;
  /** Sidebar colours, contrast-matched to the chosen sidebar background. */
  sidebarText: string;
  sidebarMuted: string;
  sidebarBorder: string;
}

type Rgb = [number, number, number];

export { isHexColor };

function parseHexColor(value: string): Rgb | null {
  if (!isHexColor(value)) return null;

  const hex = value.trim().slice(1);

  if (hex.length === 3) {
    const [r, g, b] = hex.split("");
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function toHexColor([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

/** Blend `from` towards `to` by `amount` (0–1). Both must be hex colours. */
function mixColors(from: string, to: string, amount: number): string {
  const start = parseHexColor(from);
  const end = parseHexColor(to);

  if (!start || !end) return from;

  const ratio = Math.min(1, Math.max(0, amount));

  return toHexColor([
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
    start[2] + (end[2] - start[2]) * ratio,
  ]);
}

/** WCAG relative luminance, used to decide sidebar text contrast. */
function getRelativeLuminance(color: string): number {
  const rgb = parseHexColor(color);

  if (!rgb) return 1;

  const [r, g, b] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getCoverLetterPalette(appearance: {
  accentColor: string;
  pageColor: string;
  sidebarColor: string;
  textColor: string;
}): CoverLetterPalette {
  const defaults = DEFAULT_COVER_LETTER_APPEARANCE;
  const accentColor = toSafeHexColor(appearance.accentColor, defaults.accentColor);
  const pageColor = toSafeHexColor(appearance.pageColor, defaults.pageColor);
  const sidebarColor = toSafeHexColor(appearance.sidebarColor, defaults.sidebarColor);
  const textColor = toSafeHexColor(appearance.textColor, defaults.textColor);

  // A dark sidebar needs light text; the document text colour is only safe to
  // reuse when the rail is light enough to carry it.
  const sidebarIsLight = getRelativeLuminance(sidebarColor) > 0.45;
  const sidebarText = sidebarIsLight ? textColor : "#f8fafc";

  return {
    strong: textColor,
    text: textColor,
    muted: mixColors(textColor, pageColor, 0.3),
    soft: mixColors(textColor, pageColor, 0.5),
    border: mixColors(textColor, pageColor, 0.86),
    surface: mixColors(textColor, pageColor, 0.955),
    accent: accentColor,
    sidebarText,
    sidebarMuted: mixColors(sidebarText, sidebarColor, 0.35),
    sidebarBorder: mixColors(sidebarText, sidebarColor, 0.82),
  };
}

function isCoverLetterSectionVisible(content: CoverLetterContent, sectionId: CoverLetterSectionId) {
  return !content.appearance?.hiddenSections?.includes(sectionId);
}

/** The cover-letter flavour of `cleanResumeText`: emoji stripped, line breaks kept. */
function cleanText(value: string | null | undefined): string {
  return cleanResumeText(value).trim();
}

/** One line of running text: a paragraph's soft line breaks read as spaces. */
function toRunningText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map(toRunningText)
    .filter(Boolean);
}

function splitRichTextBlocks(value: string): RichTextBlock[] {
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

function splitMarkdownLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, ""));
}

/**
 * The letter itself, cleaned, with the hidden "letter" section already applied — the
 * signature included, since it belongs to the letter rather than the letterhead.
 */
function buildCoverLetterFlowContent(content: CoverLetterContent): CoverLetterFlowContent {
  if (!isCoverLetterSectionVisible(content, "letter")) {
    return {
      body: "",
      closing: "",
      greeting: "",
      highlights: "",
      opening: "",
      postscript: "",
      signature: "",
    };
  }

  return {
    body: cleanText(content.body),
    closing: cleanText(content.closing),
    greeting: cleanText(content.greeting),
    highlights: cleanText(content.highlights),
    opening: cleanText(content.opening),
    postscript: toRunningText(cleanText(content.postscript)),
    signature: cleanText(content.signature) || cleanText(content.senderName),
  };
}

export function getFlowPageKey<T>(pages: T[][]) {
  return pages.map((page) => page.map((item) => JSON.stringify(item)).join(",")).join("|");
}

function buildBodyBlocks(content: CoverLetterFlowContent): RichTextBlock[] {
  return [
    ...splitParagraphs(content.opening).map((text) => ({ type: "paragraph" as const, text })),
    ...splitRichTextBlocks(content.body),
  ];
}

function formatPostscript(postscript: string) {
  return postscript ? `P.S. ${postscript}` : "";
}

export function buildProfessionalFlowItems(content: CoverLetterFlowContent) {
  const items: ProfessionalFlowItem[] = [];

  if (content.greeting) items.push({ id: "greeting", type: "greeting", text: content.greeting });

  buildBodyBlocks(content).forEach((block, blockIndex) => {
    if (block.type === "paragraph") {
      items.push({ id: `body-${blockIndex}`, type: "paragraph", text: block.text });
      return;
    }

    items.push({ id: `body-list-${blockIndex}`, type: "body-list", items: block.items });
  });

  const highlights = splitMarkdownLines(content.highlights);

  if (highlights.length > 0) {
    items.push({ id: "proof-list", type: "proof-list", items: highlights });
  }

  if (content.closing) items.push({ id: "closing", type: "closing", text: content.closing });
  if (content.signature) {
    items.push({ id: "signature", type: "signature", text: content.signature });
  }

  if (content.postscript) {
    items.push({
      id: "postscript",
      type: "postscript",
      text: formatPostscript(content.postscript),
    });
  }

  return items;
}

export function buildVeriworklyFlowItems(content: CoverLetterFlowContent) {
  const items: VeriworklyFlowItem[] = [];

  if (content.greeting) items.push({ id: "greeting", type: "greeting", text: content.greeting });

  buildBodyBlocks(content).forEach((block, blockIndex) => {
    if (block.type === "paragraph") {
      items.push({ id: `body-${blockIndex}`, type: "paragraph", text: block.text });
      return;
    }

    items.push({ id: `body-list-${blockIndex}`, type: "body-list", items: block.items });
  });

  const highlights = splitMarkdownLines(content.highlights);

  highlights.forEach((text, index) => {
    items.push({
      id: `proof-${index}`,
      type: "proof-item",
      heading: index === 0,
      index,
      isLast: index === highlights.length - 1,
      text,
    });
  });

  if (content.closing || content.signature) {
    items.push({
      id: "signoff",
      type: "signoff",
      closing: content.closing,
      signature: content.signature,
    });
  }

  if (content.postscript) {
    items.push({
      id: "postscript",
      type: "postscript",
      text: formatPostscript(content.postscript),
    });
  }

  return items;
}

/** Where a page break may fall inside an item; see `measure.ts`. */
export function getFlowSplitKind(item: ProfessionalFlowItem | VeriworklyFlowItem): FlowSplitKind {
  if (item.type === "paragraph" || item.type === "postscript") return "text";
  if (item.type === "body-list" || item.type === "proof-list") return "rows";

  return "whole";
}

function getCoverLetterLinks(content: CoverLetterContent): ResumeLinkItem[] {
  return content.links?.items?.filter((link) => normalizeLinkHref(link.url)) ?? [];
}

function getCoverLetterLinkDisplayMode(content: CoverLetterContent): ResumeLinkDisplayMode {
  return content.links?.displayMode ?? "icon-username";
}

/**
 * The ranges the appearance sliders offer. A value outside them only arrives from an
 * imported or hand-edited file, and an extreme one (a 40x line height, a margin wider
 * than the page) leaves no room for a single line of text.
 */
export const COVER_LETTER_APPEARANCE_RANGES = {
  pageMargin: [24, 72],
  paragraphSpacing: [4, 24],
  lineHeight: [1.25, 1.8],
} as const;

export function clampCoverLetterNumber(
  key: keyof typeof COVER_LETTER_APPEARANCE_RANGES,
  value: unknown,
  fallback: number,
): number {
  const [min, max] = COVER_LETTER_APPEARANCE_RANGES[key];
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(max, Math.max(min, number));
}

/**
 * Everything a cover-letter renderer prints, derived once: preview, HTML, PDF, DOCX,
 * Markdown and plain text all read these fields, so a hidden section, an empty field or a
 * cleaned value cannot differ between them. Empty fields stay empty — no renderer prints a
 * placeholder in their place.
 */
export function getCoverLetterState(content: CoverLetterContent) {
  const defaults = DEFAULT_COVER_LETTER_APPEARANCE;
  const appearance = content.appearance ?? { ...defaults, hiddenSections: [] };

  const normalizedAppearance = {
    ...appearance,
    fontFamily: normalizeFontFamilyId(appearance.fontFamily),
    pageMargin: clampCoverLetterNumber("pageMargin", appearance.pageMargin, defaults.pageMargin),
    lineHeight: clampCoverLetterNumber("lineHeight", appearance.lineHeight, defaults.lineHeight),
    paragraphSpacing: clampCoverLetterNumber(
      "paragraphSpacing",
      appearance.paragraphSpacing,
      defaults.paragraphSpacing,
    ),
    accentColor: toSafeHexColor(appearance.accentColor, defaults.accentColor),
    pageColor: toSafeHexColor(appearance.pageColor, defaults.pageColor),
    sidebarColor: toSafeHexColor(appearance.sidebarColor, defaults.sidebarColor),
    textColor: toSafeHexColor(appearance.textColor, defaults.textColor),
    paperSize: toPaperSize(appearance.paperSize),
  };

  const showTarget = isCoverLetterSectionVisible(content, "target");

  // The signature stands in for a missing name only while the letter it belongs to shows.
  const senderName =
    cleanText(content.senderName) ||
    (isCoverLetterSectionVisible(content, "letter") ? cleanText(content.signature) : "");
  const senderTitle = cleanText(content.senderTitle);

  const contact = isCoverLetterSectionVisible(content, "profile")
    ? [
        content.senderEmail,
        formatPhoneForDisplay(content.senderPhone),
        content.senderLocation,
        content.senderWebsite,
      ]
        .map(cleanText)
        .filter(Boolean)
    : [];

  const renderedLinks = isCoverLetterSectionVisible(content, "links")
    ? getCoverLetterLinks(content)
    : [];
  const linkDisplayMode = getCoverLetterLinkDisplayMode(content);

  const recipient = showTarget
    ? [content.recipientName, content.recipientTitle, content.companyName, content.companyLocation]
        .map(cleanText)
        .filter(Boolean)
    : [];

  const subject = cleanText(content.subject);
  const jobTitle = cleanText(content.jobTitle);

  const palette = getCoverLetterPalette(normalizedAppearance);

  return {
    appearance: normalizedAppearance,
    /** The printed page every renderer draws, from the letter's paper size. */
    page: getPageGeometry(normalizedAppearance.paperSize),
    palette,
    tokens: createCoverLetterTokens(normalizedAppearance, palette),
    senderName,
    senderTitle,
    contact,
    linkDisplayMode,
    renderedLinks,
    // A month typed as "2026-01" reads as the resume prints one; a written date is kept.
    date: formatDocumentDate(cleanText(content.date)),
    language: toDocumentLanguage(content.language),
    direction: documentDirection(content.language),
    recipient,
    /** The "Re" line: the subject, or the role applied for. */
    subject: showTarget ? subject || jobTitle : "",
    /** The VeriWorkly rail's target: the role applied for, or the subject. */
    targetTitle: showTarget ? jobTitle || subject : "",
    targetCompany: showTarget ? cleanText(content.companyName) : "",
    flow: buildCoverLetterFlowContent(content),
  };
}

export type CoverLetterState = ReturnType<typeof getCoverLetterState>;

/** Average glyph advance assumed by the rail estimate, in em: wider than real text on purpose. */
const RAIL_EM_PER_CHARACTER = 0.6;

/**
 * Whether the VeriWorkly rail's text is likely taller than the page. The rail is one page
 * tall in every renderer and clips what does not fit, so the editor warns instead. An
 * estimate rather than a measurement, so the editor needs no layout: it assumes wide glyphs,
 * so it warns a little early rather than late.
 */
export function veriworklyRailOverflows(content: CoverLetterContent): boolean {
  const state = getCoverLetterState(content);
  const { tokens: t, linkDisplayMode } = state;
  const S = COVER_LETTER_SCALE;
  const inner = S.railWidth - S.railPadX * 2;

  const block = (text: string, token: { fontSize: number; lineHeight: number }) =>
    text
      ? Math.max(1, Math.ceil((text.length * token.fontSize * RAIL_EM_PER_CHARACTER) / inner)) *
        token.lineHeight
      : 0;
  const stack = (heights: number[], gap: number) =>
    heights.reduce((sum, height) => sum + height, 0) + Math.max(0, heights.length - 1) * gap;

  const rows = [
    ...state.contact.map((item) => block(item, t.railText)),
    ...(state.renderedLinks.length > 0 ? [S.hairline + 32] : []),
    ...state.renderedLinks.map((link) =>
      linkDisplayMode === "icon"
        ? Math.max(14, t.railText.lineHeight)
        : block(getLinkDisplayText(link, linkDisplayMode), t.railText),
    ),
  ];

  const target =
    state.targetTitle || state.targetCompany
      ? S.hairline +
        S.railTargetTop +
        stack(
          [
            t.railLabel.lineHeight,
            block(state.targetTitle, t.railText),
            block(state.targetCompany, t.railText),
          ].filter(Boolean),
          8,
        )
      : 0;

  const height =
    t.railLabel.lineHeight +
    (state.senderName ? 16 + block(state.senderName, t.railName) : 0) +
    (state.senderTitle ? 8 + block(state.senderTitle, t.railTitle) : 0) +
    S.railBlockTop * 2 +
    S.hairline +
    S.railBlockTop +
    stack(rows, 8) +
    target;

  return height > state.page.heightPx - S.railPadY * 2;
}

export function getCoverLetterDocumentTitle(state: CoverLetterState) {
  return state.senderName ? `${state.senderName} - Cover Letter` : "Cover Letter";
}

// ---------------------------------------------------------------------------
// Markdown and plain text
//
// Both are built from `getCoverLetterState`, so they print exactly what the preview
// prints. The Markdown labels every letterhead field so `markdown-import.ts` can read
// the file back without guessing which line is which.
// ---------------------------------------------------------------------------

export const COVER_LETTER_MARKDOWN_LABELS = {
  senderTitle: "Title",
  senderEmail: "Email",
  senderPhone: "Phone",
  senderLocation: "Location",
  senderWebsite: "Website",
  link: "Link",
  date: "Date",
  recipientName: "Recipient",
  recipientTitle: "Recipient title",
  companyName: "Company",
  companyLocation: "Company location",
  jobTitle: "Role",
  subject: "Subject",
} as const;

function renderLetterBlocks(
  items: ProfessionalFlowItem[],
  renderListItem: (item: string) => string,
): string[] {
  return items.map((item) =>
    item.type === "body-list" || item.type === "proof-list"
      ? item.items.map(renderListItem).join("\n")
      : item.text,
  );
}

export function buildCoverLetterMarkdown(content: CoverLetterContent): string {
  const state = getCoverLetterState(content);
  const L = COVER_LETTER_MARKDOWN_LABELS;
  const showProfile = isCoverLetterSectionVisible(content, "profile");
  const showTarget = isCoverLetterSectionVisible(content, "target");
  const field = (label: string, value: string) => (value ? `- **${label}:** ${value}` : "");

  const letterhead = [
    field(L.senderTitle, state.senderTitle),
    ...(showProfile
      ? [
          field(L.senderEmail, cleanText(content.senderEmail)),
          field(L.senderPhone, cleanText(formatPhoneForDisplay(content.senderPhone))),
          field(L.senderLocation, cleanText(content.senderLocation)),
          field(L.senderWebsite, cleanText(content.senderWebsite)),
        ]
      : []),
    ...state.renderedLinks.map((link) =>
      field(
        L.link,
        `[${getLinkDisplayText(link, state.linkDisplayMode)}](${normalizeLinkHref(link.url)})`,
      ),
    ),
    field(L.date, state.date),
    ...(showTarget
      ? [
          field(L.recipientName, cleanText(content.recipientName)),
          field(L.recipientTitle, cleanText(content.recipientTitle)),
          field(L.companyName, cleanText(content.companyName)),
          field(L.companyLocation, cleanText(content.companyLocation)),
          field(L.jobTitle, cleanText(content.jobTitle)),
          // The stored subject, not the printed one, which falls back to the role above.
          field(L.subject, cleanText(content.subject)),
        ]
      : []),
  ].filter(Boolean);

  const parts = [
    state.senderName ? `# ${state.senderName}` : "",
    letterhead.join("\n"),
    ...renderLetterBlocks(buildProfessionalFlowItems(state.flow), (item) => `- ${item}`),
  ];

  return parts.filter(Boolean).join("\n\n").trim();
}

export function buildCoverLetterText(content: CoverLetterContent): string {
  const state = getCoverLetterState(content);

  const parts = [
    [
      state.senderName,
      state.senderTitle,
      ...state.contact,
      ...state.renderedLinks.map(
        (link) =>
          `${getLinkDisplayText(link, state.linkDisplayMode)}: ${normalizeLinkHref(link.url)}`,
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    state.date,
    state.recipient.join("\n"),
    state.subject ? `Subject: ${state.subject}` : "",
    ...renderLetterBlocks(buildProfessionalFlowItems(state.flow), (item) => `- ${item}`),
  ];

  return parts.filter(Boolean).join("\n\n").trim();
}
