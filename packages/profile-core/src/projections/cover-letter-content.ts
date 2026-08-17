import type { MasterProfileLinks } from "../schema/types.js";

/**
 * The cover letter's content shape.
 *
 * It lives here, not in apps/studio, for the same reason the portfolio's will: the server
 * seeds a cover letter from the master profile too, and a package cannot import an app. The
 * studio re-exports these from `features/cover-letter/types.ts` — narrowing `fontFamily` to
 * its own font catalog on the way through — so there is still exactly one definition.
 */

export type CoverLetterSectionId = "profile" | "links" | "target" | "letter";

/**
 * `fontFamily` is a bare string here and a `FontFamilyId` in the studio.
 *
 * The font catalog is the studio's — the server and the portfolio have no business
 * importing it — so this side stores whatever id was chosen and the studio narrows it
 * through `normalizeFontFamilyId` on the way in. Same split the master profile's
 * `customization.fontFamily` already uses.
 */
export interface CoverLetterAppearance {
  fontFamily: string;
  pageMargin: number;
  paragraphSpacing: number;
  lineHeight: number;
  accentColor: string;
  sidebarColor: string;
  pageColor: string;
  textColor: string;
  hiddenSections: CoverLetterSectionId[];
}

export interface CoverLetterContent {
  senderName: string;
  senderTitle: string;
  senderEmail: string;
  senderPhone: string;
  senderWebsite: string;
  senderLocation: string;

  links: MasterProfileLinks;

  date: string;

  recipientName: string;
  recipientTitle: string;

  companyName: string;
  companyLocation: string;

  jobTitle: string;
  subject: string;
  greeting: string;
  opening: string;
  body: string;
  highlights: string;
  closing: string;
  signature: string;
  postscript: string;

  appearance: CoverLetterAppearance;
}

/**
 * The canonical appearance a default and projected cover letter starts with.
 *
 * Shared directly by both `projectToCoverLetter` and the studio's `createDefaultCoverLetter`
 * so they share the exact same default appearance values with zero duplication.
 */
export const DEFAULT_COVER_LETTER_APPEARANCE: CoverLetterAppearance = {
  fontFamily: "geist",
  pageMargin: 40,
  paragraphSpacing: 10,
  lineHeight: 1.5,
  accentColor: "#2563eb",
  sidebarColor: "#f8fafc",
  pageColor: "#ffffff",
  textColor: "#18181b",
  hiddenSections: [],
};
