import type {
  CoverLetterContent as CoverLetterContentCore,
  CoverLetterAppearance as CoverLetterAppearanceCore,
} from "@veriworkly/profile-core";

import type { FontFamilyId } from "@/features/documents/constants/fonts";

/*
 * The letter's shape is declared once, in `@veriworkly/profile-core`, because the server
 * seeds a cover letter from the master profile too and a package cannot import an app —
 * see `projectToCoverLetter`. What is added here is the one narrowing the studio is
 * entitled to: the font catalog is the studio's, so `fontFamily` is a known id on this side
 * and a bare string on the shared side. Same split `customization.fontFamily` already uses.
 */

export type { CoverLetterSectionId } from "@veriworkly/profile-core";

export interface CoverLetterAppearance extends Omit<CoverLetterAppearanceCore, "fontFamily"> {
  fontFamily: FontFamilyId;
}

export interface CoverLetterContent extends Omit<CoverLetterContentCore, "appearance"> {
  appearance: CoverLetterAppearance;
  /** The pasted job post: context for writing the letter with AI, never printed on it. */
  jobPost?: string;
  /** BCP-47 tag for the exported HTML; English when absent (see `toDocumentLanguage`). */
  language?: string;
}
