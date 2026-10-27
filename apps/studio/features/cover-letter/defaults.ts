import {
  DEFAULT_COVER_LETTER_APPEARANCE,
  projectToCoverLetter,
  type MasterProfileData,
  type CoverLetterAppearance as CoverLetterAppearanceCore,
} from "@veriworkly/profile-core";

import type { BaseDocument } from "@/features/documents/core/types";

import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";
import { DEFAULT_PAPER_SIZE } from "@/templates/shared/page-geometry";

import type { CoverLetterAppearance, CoverLetterContent } from "./types";

export const COVER_LETTER_TEMPLATE_ID = "professional";

/**
 * The shared appearance shape, as the studio needs it.
 *
 * Two things happen here and nowhere else. The font id is narrowed through the studio's
 * catalog — the package stores a bare string because the server and the portfolio have no
 * business importing that catalog. And the whole thing is cloned, because
 * `DEFAULT_COVER_LETTER_APPEARANCE` is a module-level constant whose `hiddenSections` is a
 * mutable array: spreading it hands every letter the same array, so hiding a section in one
 * document would hide it in every document created since the page loaded.
 */
function toStudioAppearance(appearance: CoverLetterAppearanceCore): CoverLetterAppearance {
  const cloned = structuredClone(appearance);

  return {
    ...cloned,
    fontFamily: normalizeFontFamilyId(cloned.fontFamily),
    paperSize: DEFAULT_PAPER_SIZE,
  };
}

/**
 * Sample content: a letter from a fictional applicant to a fictional company, for a guest's
 * first letter, previews and tests. A signed-in user without a profile gets
 * {@link createEmptyCoverLetter} instead.
 */
export function createDefaultCoverLetter(id: string): BaseDocument<CoverLetterContent> {
  const now = new Date().toISOString();
  return {
    id,
    type: "COVER_LETTER",
    title: "Product Engineer - Acme Corp",
    templateId: COVER_LETTER_TEMPLATE_ID,

    updatedAt: now,

    sync: {
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    },

    content: {
      senderName: "Alex Morgan",
      senderTitle: "Product Engineer",
      senderEmail: "alex.morgan@example.com",
      senderPhone: "+1 415 555 2671",
      senderLocation: "Remote",
      senderWebsite: "example.com",
      links: {
        displayMode: "icon-username",
        items: [],
      },

      date: new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),

      recipientName: "Jordan Lee",
      recipientTitle: "Engineering Manager",

      companyName: "Acme Corp",
      companyLocation: "Remote",

      jobTitle: "Product Engineer",
      subject: "Application for Product Engineer at Acme Corp",

      greeting: "Dear Jordan Lee,",

      opening:
        "I am excited to apply for the Product Engineer role at Acme Corp. The team's focus on dependable, well-crafted software is close to the work I care about: helping people get real tasks done quickly, with tools that stay out of their way and keep their work safe.",

      body: "I would bring a practical product engineering mindset to Acme Corp. I enjoy building polished editors, export flows, background sync, sharing, and preview experiences that feel dependable for real users. I care about details like autosave behavior, hydration-safe rendering, reusable UI actions, and defaults that help people start strong instead of facing a blank page.\n\nAcme Corp stands out because it combines user-facing craft with systems that need to be trustworthy: offline drafts, public links, data exports, and collaboration across web and mobile surfaces. I would be excited to help make those workflows sharper, faster, and easier to maintain.",

      highlights:
        "- Built React and TypeScript document workflows with live preview, export, and autosave behavior\n- Improved shared UI actions so every document type in the product behaves consistently\n- Debugged hydration, routing, and local-storage edge cases in Next.js applications",

      closing: "Sincerely,",
      signature: "Alex Morgan",

      postscript:
        "I would welcome the chance to help Acme Corp make its product feel faster, clearer, and more reliable.",

      appearance: toStudioAppearance(DEFAULT_COVER_LETTER_APPEARANCE),
    },
  };
}

/**
 * A new cover letter seeded from the user's master profile.
 *
 * `createDefaultCoverLetter` above reads its appearance from the same constant this does, so
 * the two cannot drift. It is sample content; this is what a user with a profile gets.
 *
 * The letter arrives with the identity block filled and the letter itself blank — the
 * projection deliberately writes no opening, body or highlights, because inventing prose a
 * user did not write is worse than an empty page they know to fill.
 */
export function createCoverLetterFromProfile(
  id: string,
  master: MasterProfileData,
): BaseDocument<CoverLetterContent> {
  const now = new Date().toISOString();
  const projected = projectToCoverLetter(master);

  return {
    id,
    type: "COVER_LETTER",
    // No job or company is known yet, so there is nothing truthful to name it after. Matches
    // what the store's title derivation falls back to once the target fields are filled in.
    title: "Untitled Cover Letter",
    templateId: COVER_LETTER_TEMPLATE_ID,

    updatedAt: now,

    sync: {
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    },

    content: {
      ...projected,
      appearance: toStudioAppearance(projected.appearance),
    },
  };
}

export function createEmptyCoverLetter(id: string): BaseDocument<CoverLetterContent> {
  const now = new Date().toISOString();
  const defaultDoc = createDefaultCoverLetter(id);
  return {
    ...defaultDoc,
    title: "Untitled Cover Letter",
    updatedAt: now,
    content: {
      ...defaultDoc.content,

      senderName: "",
      senderTitle: "",
      senderEmail: "",
      senderPhone: "",
      senderLocation: "",
      senderWebsite: "",

      links: {
        displayMode: "icon-username",
        items: [],
      },

      date: new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),

      recipientName: "",
      recipientTitle: "",
      companyName: "",
      companyLocation: "",
      jobTitle: "",
      subject: "",
      greeting: "",
      opening: "",
      body: "",
      highlights: "",
      closing: "",
      signature: "",
      postscript: "",
    },
  };
}
