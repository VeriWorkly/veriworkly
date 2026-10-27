import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent, CoverLetterSectionId } from "./types";
import type { ResumeLinkDisplayMode, ResumeLinkItem } from "@/types/resume";

import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";
import { documentSyncStatusSchema } from "@/features/resume/schemas/resume-storage-schema";
import { clampCoverLetterNumber, isHexColor } from "@/templates/cover-letter/shared";
import { isDocumentLinkType } from "@/features/documents/core/link-types";
import { isRecord } from "@/lib/is-record";

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Colours reach CSS and PDF styles verbatim, so only a plain hex colour is accepted. */
function asHexColor(value: unknown, fallback: string): string {
  return isHexColor(value) ? value.trim() : fallback;
}

const COVER_LETTER_SECTION_IDS: CoverLetterSectionId[] = ["profile", "links", "target", "letter"];

function parseHiddenSections(value: unknown): CoverLetterSectionId[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is CoverLetterSectionId =>
    COVER_LETTER_SECTION_IDS.includes(item as CoverLetterSectionId),
  );
}

function parseLinks(value: unknown): CoverLetterContent["links"] {
  if (!isRecord(value)) return { displayMode: "icon-username", items: [] };
  const displayMode =
    value.displayMode === "icon" ||
    value.displayMode === "url" ||
    value.displayMode === "icon-username"
      ? (value.displayMode as ResumeLinkDisplayMode)
      : "icon-username";

  // A row with an empty URL is kept: it is one the user has just added and is filling in.
  // Templates skip links without a usable URL when they render.
  const items = Array.isArray(value.items)
    ? value.items.filter(isRecord).map((item, index): ResumeLinkItem => ({
        id: asText(item.id) || `cover-letter-link-${index + 1}`,
        type: isDocumentLinkType(item.type) ? item.type : "custom",
        label: asText(item.label),
        url: asText(item.url),
      }))
    : [];

  return { displayMode, items };
}

/**
 * Coerces an arbitrary/untrusted value into a well-typed `CoverLetterContent` — every
 * field is validated/defaulted, so this can never produce e.g. a `NaN` page margin or
 * an unvalidated link `type`. Used both by `parseCoverLetterDocument` (full-document
 * shape) and directly by JSON import (content-only shape, matching what this app's own
 * JSON export produces).
 */
export function parseCoverLetterContent(input: unknown): CoverLetterContent {
  const contentRaw = isRecord(input) ? input : {};
  const appearanceRaw = isRecord(contentRaw.appearance) ? contentRaw.appearance : {};

  return {
    senderName: asText(contentRaw.senderName),
    senderTitle: asText(contentRaw.senderTitle),
    senderEmail: asText(contentRaw.senderEmail),
    senderPhone: asText(contentRaw.senderPhone),
    senderLocation: asText(contentRaw.senderLocation),
    senderWebsite: asText(contentRaw.senderWebsite),
    links: parseLinks(contentRaw.links),
    date: asText(contentRaw.date),

    recipientName: asText(contentRaw.recipientName),
    recipientTitle: asText(contentRaw.recipientTitle),

    companyName: asText(contentRaw.companyName),
    companyLocation: asText(contentRaw.companyLocation),

    jobTitle: asText(contentRaw.jobTitle),
    // Optional and omitted when empty, so letters saved before the field existed round-trip
    // unchanged.
    ...(asText(contentRaw.jobPost) ? { jobPost: asText(contentRaw.jobPost) } : {}),
    ...(asText(contentRaw.language) ? { language: asText(contentRaw.language) } : {}),
    subject: asText(contentRaw.subject),
    greeting: asText(contentRaw.greeting),
    opening: asText(contentRaw.opening),
    body: asText(contentRaw.body),
    highlights: asText(contentRaw.highlights),
    closing: asText(contentRaw.closing),
    signature: asText(contentRaw.signature),
    postscript: asText(contentRaw.postscript),

    appearance: {
      fontFamily: normalizeFontFamilyId(asText(appearanceRaw.fontFamily)),
      pageMargin: clampCoverLetterNumber("pageMargin", appearanceRaw.pageMargin, 44),
      paragraphSpacing: clampCoverLetterNumber(
        "paragraphSpacing",
        appearanceRaw.paragraphSpacing,
        12,
      ),
      lineHeight: clampCoverLetterNumber("lineHeight", appearanceRaw.lineHeight, 1.55),
      accentColor: asHexColor(appearanceRaw.accentColor, "#2563eb"),
      // Must match createDefaultCoverLetter(): a dark fallback here produced a
      // near-black rail behind rail text for any document saved before the
      // field existed.
      sidebarColor: asHexColor(appearanceRaw.sidebarColor, "#f8fafc"),
      pageColor: asHexColor(appearanceRaw.pageColor, "#ffffff"),
      textColor: asHexColor(appearanceRaw.textColor, "#18181b"),
      hiddenSections: parseHiddenSections(appearanceRaw.hiddenSections),
    },
  };
}

/** An unknown status on a synced document means "send it again", never a status the engine cannot handle. */
function parseSyncStatus(value: unknown, enabled: boolean): BaseDocument["sync"]["status"] {
  const parsed = documentSyncStatusSchema.safeParse(value);

  if (parsed.success) return parsed.data;

  return enabled ? "pending" : "local-only";
}

export function parseCoverLetterDocument(input: unknown): BaseDocument<CoverLetterContent> | null {
  if (!isRecord(input) || input.type !== "COVER_LETTER") return null;
  if (typeof input.id !== "string" || typeof input.templateId !== "string") return null;

  return {
    id: input.id,
    type: "COVER_LETTER",
    title: asText(input.title) || "Cover Letter",
    templateId: input.templateId,
    updatedAt: asText(input.updatedAt) || new Date().toISOString(),
    sync: isRecord(input.sync)
      ? {
          enabled: Boolean(input.sync.enabled),
          status: parseSyncStatus(input.sync.status, Boolean(input.sync.enabled)),
          cloudDocumentId:
            typeof input.sync.cloudDocumentId === "string" ? input.sync.cloudDocumentId : null,
          lastSyncedAt:
            typeof input.sync.lastSyncedAt === "string" ? input.sync.lastSyncedAt : null,
          revision: typeof input.sync.revision === "number" ? input.sync.revision : 1,
        }
      : {
          enabled: false,
          status: "local-only",
          cloudDocumentId: null,
          lastSyncedAt: null,
          revision: 1,
        },
    content: parseCoverLetterContent(input.content),
  };
}
