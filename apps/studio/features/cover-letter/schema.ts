import type { CoverLetterContent } from "./types";
import type { ResumeLinkDisplayMode, ResumeLinkItem, ResumeLinkType } from "@/types/resume";

import type { BaseDocument } from "@/features/documents/core/types";

import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const LINK_TYPES: ResumeLinkType[] = [
  "github",
  "linkedin",
  "dribbble",
  "twitter",
  "portfolio",
  "behance",
  "medium",
  "youtube",
  "custom",
];

function parseLinks(value: unknown): CoverLetterContent["links"] {
  if (!isRecord(value)) return { displayMode: "icon-username", items: [] };
  const displayMode =
    value.displayMode === "icon" ||
    value.displayMode === "url" ||
    value.displayMode === "icon-username"
      ? (value.displayMode as ResumeLinkDisplayMode)
      : "icon-username";

  const items = Array.isArray(value.items)
    ? value.items
        .filter(isRecord)
        .map(
          (item, index): ResumeLinkItem => ({
            id: asText(item.id) || `cover-letter-link-${index + 1}`,
            type: LINK_TYPES.includes(item.type as ResumeLinkType)
              ? (item.type as ResumeLinkType)
              : "custom",
            label: asText(item.label),
            url: asText(item.url),
          }),
        )
        .filter((item) => item.url)
    : [];

  return { displayMode, items };
}

export function parseCoverLetterDocument(input: unknown): BaseDocument<CoverLetterContent> | null {
  if (!isRecord(input) || input.type !== "COVER_LETTER") return null;
  if (typeof input.id !== "string" || typeof input.templateId !== "string") return null;

  const contentRaw = isRecord(input.content) ? input.content : {};
  const appearanceRaw = isRecord(contentRaw.appearance) ? contentRaw.appearance : {};

  return {
    id: input.id,
    type: "COVER_LETTER",
    title: asText(input.title) || "Cover Letter",
    templateId: input.templateId,
    updatedAt: asText(input.updatedAt) || new Date().toISOString(),
    sync: isRecord(input.sync)
      ? {
          enabled: Boolean(input.sync.enabled),
          status: (input.sync.status as BaseDocument["sync"]["status"]) ?? "local-only",
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
    content: {
      senderName: asText(contentRaw.senderName),
      senderTitle: asText(contentRaw.senderTitle),
      senderEmail: asText(contentRaw.senderEmail),
      senderPhone: asText(contentRaw.senderPhone),
      senderLocation: asText(contentRaw.senderLocation),
      senderWebsite: asText(contentRaw.senderWebsite),
      senderLinks: asText(contentRaw.senderLinks),

      links: parseLinks(contentRaw.links),
      date: asText(contentRaw.date),

      recipientName: asText(contentRaw.recipientName),
      recipientTitle: asText(contentRaw.recipientTitle),

      companyName: asText(contentRaw.companyName),
      companyLocation: asText(contentRaw.companyLocation),

      jobTitle: asText(contentRaw.jobTitle),
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
        pageMargin: asNumber(appearanceRaw.pageMargin, 44),
        paragraphSpacing: asNumber(appearanceRaw.paragraphSpacing, 12),
        lineHeight: asNumber(appearanceRaw.lineHeight, 1.55),
        accentColor: asText(appearanceRaw.accentColor) || "#2563eb",
        sidebarColor: asText(appearanceRaw.sidebarColor) || "#111827",
        pageColor: asText(appearanceRaw.pageColor) || "#ffffff",
        textColor: asText(appearanceRaw.textColor) || "#18181b",
      },
    },
  };
}
