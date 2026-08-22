import {
  DEFAULT_COVER_LETTER_APPEARANCE,
  projectToCoverLetter,
  type MasterProfileData,
  type CoverLetterAppearance as CoverLetterAppearanceCore,
} from "@veriworkly/profile-core";

import type { BaseDocument } from "@/features/documents/core/types";

import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";

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

  return { ...cloned, fontFamily: normalizeFontFamilyId(cloned.fontFamily) };
}

export function createDefaultCoverLetter(id: string): BaseDocument<CoverLetterContent> {
  const now = new Date().toISOString();
  return {
    id,
    type: "COVER_LETTER",
    title: "Product Engineer - Veriworkly",
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
      senderName: "Veriworkly User",
      senderTitle: "Product Engineer",
      senderEmail: "user@veriworkly.com",
      senderPhone: "+1 (555) 010-2026",
      senderLocation: "Remote",
      senderWebsite: "veriworkly.com",
      links: {
        displayMode: "icon-username",
        items: [],
      },

      date: new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),

      recipientName: "Veriworkly Hiring Team",
      recipientTitle: "Product and Engineering",

      companyName: "Veriworkly",
      companyLocation: "Remote",

      jobTitle: "Product Engineer",
      subject: "Application for Product Engineer at Veriworkly",

      greeting: "Dear Veriworkly Hiring Team,",

      opening:
        "I am excited to apply for the Product Engineer role at Veriworkly. The product mission is close to the work I care about: helping people present credible professional documents, move faster through career workflows, and keep their materials consistent across resume, cover letter, and document experiences.",

      body: "I would bring a practical product engineering mindset to Veriworkly. I enjoy building polished document editors, export flows, cloud sync, sharing, and preview experiences that feel dependable for real users. I care about details like autosave behavior, hydration-safe rendering, reusable document actions, and templates that help users start with strong defaults instead of a blank page.\n\nVeriworkly stands out because it combines user-facing craft with systems that need to be trustworthy: local drafts, public links, document exports, and collaboration between dashboard and editor surfaces. I would be excited to help make those workflows sharper, faster, and easier to maintain.",

      highlights:
        "- Built React and TypeScript document workflows with live preview, export, and autosave behavior\n- Improved shared UI actions so resumes, cover letters, and other documents behave consistently\n- Debugged hydration, routing, and local-storage edge cases in Next.js applications",

      closing: "Sincerely,",
      signature: "Veriworkly User",

      postscript:
        "I would welcome the chance to help Veriworkly make professional document creation feel faster, clearer, and more reliable.",

      appearance: toStudioAppearance(DEFAULT_COVER_LETTER_APPEARANCE),
    },
  };
}

/**
 * A new cover letter seeded from the user's master profile.
 *
 * `createDefaultCoverLetter` above keeps its exact output — the contract and parity suites
 * pin it and the five templates were built against it — but it now reads its appearance from
 * the same constant this does, so the two cannot drift. It is sample content for a user with
 * no profile; this is what a signed-in user gets.
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
