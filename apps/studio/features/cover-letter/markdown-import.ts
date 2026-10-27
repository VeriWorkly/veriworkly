"use client";

import type { ResumeLinkItem, ResumeLinkType } from "@/types/resume";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { normalizePhoneValue } from "@veriworkly/profile-core";

import { COVER_LETTER_MARKDOWN_LABELS } from "@/templates/cover-letter/shared";

function cleanMarkdown(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/, "")
    .trim();
}

function isBullet(line: string) {
  return /^[-*]\s+/.test(line.trim());
}

function splitBlocks(markdown: string) {
  return markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

type LetterheadField = Exclude<keyof typeof COVER_LETTER_MARKDOWN_LABELS, "link">;

const FIELD_BY_LABEL = new Map(
  Object.entries(COVER_LETTER_MARKDOWN_LABELS).map(([field, label]) => [
    label.toLowerCase(),
    field,
  ]),
);

const LETTERHEAD_LINE = /^[-*]\s+\*\*([^*]+):\*\*\s*(.*)$/;

const LINK_TYPE_BY_HOST: [RegExp, ResumeLinkType][] = [
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)dribbble\.com$/, "dribbble"],
  [/(^|\.)(twitter|x)\.com$/, "twitter"],
  [/(^|\.)behance\.net$/, "behance"],
  [/(^|\.)medium\.com$/, "medium"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
];

function getLinkType(url: string): ResumeLinkType {
  try {
    const host = new URL(url).hostname;
    return LINK_TYPE_BY_HOST.find(([pattern]) => pattern.test(host))?.[1] ?? "custom";
  } catch {
    return "custom";
  }
}

/** The labelled list `buildCoverLetterMarkdown` writes under the name, or null for any other block. */
function parseLetterhead(block: string) {
  const lines = block.split("\n").map((line) => line.trim());
  const matches = lines.map((line) => line.match(LETTERHEAD_LINE));

  if (!matches.every((match) => match && FIELD_BY_LABEL.has(match[1].trim().toLowerCase()))) {
    return null;
  }

  const fields: Partial<Record<LetterheadField, string>> = {};
  const links: ResumeLinkItem[] = [];

  for (const match of matches as RegExpMatchArray[]) {
    const field = FIELD_BY_LABEL.get(match[1].trim().toLowerCase());
    const value = match[2].trim();

    if (field === "link") {
      const link = value.match(/^\[(.*)\]\((.*)\)$/);
      const url = link ? link[2].trim() : value;

      links.push({
        id: `cover-letter-link-${links.length + 1}`,
        type: getLinkType(url),
        label: link ? link[1].trim() : "",
        url,
      });
      continue;
    }

    if (field) fields[field as LetterheadField] = value;
  }

  return { fields, links };
}

type Letterhead = NonNullable<ReturnType<typeof parseLetterhead>>;

const LEGACY_SUBJECT = /^\*\*Subject:\*\*\s*/i;

/**
 * The letterhead of exports made before the fields were labelled: a " | " contact line
 * (title, email, phone, location, website, links — empty ones left out), the date, the
 * recipient lines, and a `**Subject:**` block. Fields are told apart by what they look
 * like rather than by position, since the empty ones shifted everything after them.
 * Consumes the blocks it reads.
 */
function parseLegacyLetterhead(blocks: string[]): Letterhead | null {
  const subjectIndex = blocks.findIndex((block) => LEGACY_SUBJECT.test(block));

  if (subjectIndex < 0 && !blocks[0]?.includes(" | ")) return null;

  const headerEnd =
    subjectIndex >= 0 ? subjectIndex : blocks.findIndex((block) => isShortLine(block));
  const header = blocks.splice(0, Math.min(Math.max(headerEnd, 0), 3));
  const fields: Partial<Record<LetterheadField, string>> = {};
  const links: ResumeLinkItem[] = [];

  if (subjectIndex >= 0) {
    fields.subject = blocks.splice(subjectIndex - header.length, 1)[0].replace(LEGACY_SUBJECT, "");
  }

  for (const block of header) {
    if (block.includes("\n")) {
      [fields.recipientName, fields.recipientTitle, fields.companyName, fields.companyLocation] =
        block.split("\n").map((line) => line.trim());
    } else if (!block.includes(" | ") && !Number.isNaN(Date.parse(block))) {
      fields.date = block;
    } else {
      for (const part of block.split(" | ").map((item) => item.trim())) {
        const isAddress = /^\S+\.\S+$/.test(part);

        if (part.includes("@")) fields.senderEmail ??= part;
        else if (/^\+?[\d\s().-]{7,}$/.test(part)) fields.senderPhone ??= part;
        else if (isAddress && !fields.senderWebsite) fields.senderWebsite = part;
        else if (isAddress) {
          const url = /^https?:\/\//i.test(part) ? part : `https://${part}`;
          links.push({
            id: `cover-letter-link-${links.length + 1}`,
            type: getLinkType(url),
            label: "",
            url,
          });
        } else if (!fields.senderTitle) fields.senderTitle = part;
        else fields.senderLocation ??= part;
      }
    }
  }

  return { fields, links };
}

/** A one-line block that reads as a salutation or a sign-off: "Dear Jordan," / "Sincerely,". */
function isShortLine(block: string) {
  return !block.includes("\n") && /[,:]$/.test(block);
}

function isOneLine(block: string | undefined): block is string {
  return block !== undefined && !block.includes("\n");
}

/**
 * A sign-off line, known by its words: "Sincerely,", "Kind regards", "Thank you". A trailing
 * comma or colon is not enough: a last paragraph can end in one too.
 */
function isClosing(block: string | undefined) {
  return (
    isOneLine(block) &&
    block.length <= 40 &&
    /^(sincerely|((kind|warm|warmest|best) )?regards|best( wishes)?|warmly|(many )?thanks|thank you|yours\b|cheers|respectfully|cordially|with (thanks|gratitude|appreciation))\b/i.test(
      block.trim(),
    )
  );
}

/** A salutation, also one typed without a trailing comma: "Hi team". */
function isGreeting(block: string) {
  return (
    isShortLine(block) ||
    (!block.includes("\n") &&
      block.length <= 80 &&
      /^(dear|hi|hello|hey|greetings|good (morning|afternoon|evening)|to whom)\b/i.test(block))
  );
}

/**
 * Reads back a letter written by `buildCoverLetterMarkdown`.
 *
 * Only the appearance, the language and the link display mode carry over from the letter that is open —
 * they are settings, not content. Every field the file does not state comes back empty,
 * never from the open letter, so an import can be trusted to contain only the file.
 */
export function parseCoverLetterMarkdown(
  markdown: string,
  currentContent: CoverLetterContent,
): CoverLetterContent {
  const blocks = splitBlocks(markdown);

  const nameBlock = blocks[0]?.startsWith("# ") ? (blocks.shift() ?? "") : "";
  const labelled = blocks[0] ? parseLetterhead(blocks[0]) : null;

  if (labelled) blocks.shift();

  const letterhead = labelled ?? parseLegacyLetterhead(blocks);

  const fields = letterhead?.fields ?? {};
  const letterBlocks = [...blocks];

  const postscriptIndex = letterBlocks.findIndex((block) => /^P\.S\.\s+/i.test(block));
  const postscript =
    postscriptIndex >= 0
      ? letterBlocks
          .splice(postscriptIndex, 1)[0]
          .replace(/^P\.S\.\s*/i, "")
          .trim()
      : "";

  // A salutation opens a letter that goes on; on its own it is the letter.
  const greeting =
    letterBlocks.length > 1 && isGreeting(letterBlocks[0]) ? letterBlocks.shift()! : "";

  // The sign-off is a closing line ("Sincerely,") and the short line under it, or just the
  // sender's name, which the export prints in place of an empty signature. Anything else at
  // the end is the letter's own last paragraph, not a signature.
  let closing = "";
  let signature = "";
  const last = letterBlocks.length - 1;
  const senderName = cleanMarkdown(nameBlock);

  if (
    last >= 1 &&
    isClosing(letterBlocks[last - 1]) &&
    isOneLine(letterBlocks[last]) &&
    letterBlocks[last].length <= 80
  ) {
    signature = letterBlocks.pop()!;
    closing = letterBlocks.pop()!;
  } else if (isClosing(letterBlocks[last])) {
    closing = letterBlocks.pop()!;
  } else if (isOneLine(letterBlocks[last]) && senderName && letterBlocks[last] === senderName) {
    signature = letterBlocks.pop()!;
  }

  const lastBlock = letterBlocks[letterBlocks.length - 1];
  const highlights =
    lastBlock && lastBlock.split("\n").every(isBullet) ? (letterBlocks.pop() ?? "") : "";

  const [opening = "", ...bodyBlocks] = letterBlocks;
  const openingIsProse = opening && !opening.split("\n").some(isBullet);

  return {
    // Older exports printed this placeholder for a letter without a name.
    senderName: cleanMarkdown(nameBlock) === "Your Name" ? "" : cleanMarkdown(nameBlock),
    senderTitle: fields.senderTitle ?? "",
    senderEmail: fields.senderEmail ?? "",
    // Printed spaced for reading; stored as E.164 like a typed number.
    senderPhone: normalizePhoneValue(fields.senderPhone ?? ""),
    senderLocation: fields.senderLocation ?? "",
    senderWebsite: fields.senderWebsite ?? "",
    links: {
      displayMode: currentContent.links?.displayMode ?? "icon-username",
      items: letterhead?.links ?? [],
    },
    date: fields.date ?? "",
    recipientName: fields.recipientName ?? "",
    recipientTitle: fields.recipientTitle ?? "",
    companyName: fields.companyName ?? "",
    companyLocation: fields.companyLocation ?? "",
    jobTitle: fields.jobTitle ?? "",
    subject: fields.subject ?? "",
    greeting,
    opening: openingIsProse ? opening : "",
    body: (openingIsProse ? bodyBlocks : letterBlocks).join("\n\n"),
    highlights: highlights
      .split("\n")
      .filter(Boolean)
      .map((line) => `- ${line.replace(/^[-*]\s+/, "").trim()}`)
      .join("\n"),
    closing,
    signature,
    postscript,
    appearance: currentContent.appearance,
    ...(currentContent.language ? { language: currentContent.language } : {}),
  };
}

export async function importCoverLetterMarkdownFile(
  file: File,
  currentContent: CoverLetterContent,
) {
  const markdown = await file.text();

  if (!markdown.trim()) {
    throw new Error("Invalid cover letter markdown");
  }

  return parseCoverLetterMarkdown(markdown, currentContent);
}
