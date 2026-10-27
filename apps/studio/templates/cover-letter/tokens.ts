import type { CoverLetterContent } from "@/features/cover-letter/types";
import type { CoverLetterPalette } from "./shared";
import type { TextToken } from "@/templates/shared/text-tokens";

/**
 * Cover-letter type scale and rhythm, in CSS pixels.
 *
 * Both the preview/HTML export (`web.tsx`) and the PDF (`pdf.tsx`) of each
 * template read these, so a number can never be tuned on one side only. See
 * `templates/shared/text-tokens.ts` for why line heights are absolute. The page box is not
 * here: it follows the letter's paper size, as `getCoverLetterState(...).page`.
 */
export const COVER_LETTER_SCALE = {
  senderName: 34,
  senderTitle: 14,
  contact: 14,
  label: 10,
  labelTracking: 2.2,
  subject: 20,
  body: 15,
  postscript: 14,

  /** VeriWorkly rail. */
  railName: 26,
  railTitle: 14,
  railText: 12,
  railLabelTracking: 2,
  railSubject: 22,
  proofIndex: 12,
  proofText: 14,

  headerColumnGap: 32,
  headerContactWidth: 230,
  headerRowGap: 6,
  headerPadBottom: 28,
  metaTop: 36,
  metaColumnGap: 32,
  metaDateWidth: 180,
  metaRowGap: 4,
  subjectTop: 32,
  subjectPadY: 16,
  subjectLabelGap: 8,
  bodyTop: 28,

  listPadX: 20,
  listPadY: 16,
  bulletIndent: 24,
  bulletGap: 6,
  bulletRowGap: 8,

  postscriptTop: 20,
  postscriptPadTop: 12,
  continuedPadBottom: 20,

  railWidth: 214,
  railPadX: 24,
  railPadY: 36,
  railRuleWidth: 48,
  railBlockTop: 32,
  railTargetTop: 28,
  proofIndexWidth: 48,
  proofPadBottom: 8,
  proofRowGap: 8,
  subjectBarWidth: 2,
  subjectPadLeft: 20,

  hairline: 1,
  headerRule: 2,
} as const;

export interface CoverLetterTokens {
  senderName: TextToken;
  senderTitle: TextToken;
  contact: TextToken;
  label: TextToken;
  subject: TextToken;
  body: TextToken;
  strong: TextToken;
  postscript: TextToken;
  continued: TextToken;
  railName: TextToken;
  railTitle: TextToken;
  railText: TextToken;
  railLabel: TextToken;
  railSubject: TextToken;
  proofIndex: TextToken;
  proofText: TextToken;
  metaDate: TextToken;
}

/**
 * Line heights follow the user's `lineHeight` appearance setting for running
 * copy, and a tight 1.2 for display type, so a long name never collides with
 * the line under it.
 */
export function createCoverLetterTokens(
  appearance: CoverLetterContent["appearance"],
  palette: CoverLetterPalette,
): CoverLetterTokens {
  const s = COVER_LETTER_SCALE;
  const body = appearance.lineHeight;
  const display = 1.2;

  return {
    senderName: {
      color: palette.strong,
      fontSize: s.senderName,
      fontWeight: 700,
      lineHeight: s.senderName * display,
    },
    senderTitle: {
      color: palette.muted,
      fontSize: s.senderTitle,
      fontWeight: 700,
      lineHeight: s.senderTitle * body,
    },
    contact: {
      color: palette.muted,
      fontSize: s.contact,
      fontWeight: 400,
      lineHeight: s.contact * body,
    },
    label: {
      color: palette.accent,
      fontSize: s.label,
      fontWeight: 700,
      letterSpacing: s.labelTracking,
      lineHeight: s.label * display,
      textTransform: "uppercase",
    },
    subject: {
      color: palette.strong,
      fontSize: s.subject,
      fontWeight: 700,
      lineHeight: s.subject * display,
    },
    body: {
      color: palette.text,
      fontSize: s.body,
      fontWeight: 400,
      lineHeight: s.body * body,
    },
    strong: {
      color: palette.strong,
      fontSize: s.body,
      fontWeight: 700,
      lineHeight: s.body * body,
    },
    postscript: {
      color: palette.muted,
      fontSize: s.postscript,
      fontWeight: 400,
      lineHeight: s.postscript * body,
    },
    continued: {
      color: palette.soft,
      fontSize: s.label,
      fontWeight: 700,
      letterSpacing: s.labelTracking,
      lineHeight: s.label * display,
      textTransform: "uppercase",
    },
    metaDate: {
      color: palette.soft,
      fontSize: s.contact,
      fontWeight: 700,
      lineHeight: s.contact * body,
    },
    railName: {
      color: palette.sidebarText,
      fontSize: s.railName,
      fontWeight: 700,
      lineHeight: s.railName * display,
    },
    railTitle: {
      color: palette.sidebarMuted,
      fontSize: s.railTitle,
      fontWeight: 400,
      lineHeight: s.railTitle * body,
    },
    railText: {
      color: palette.sidebarMuted,
      fontSize: s.railText,
      fontWeight: 400,
      lineHeight: s.railText * body,
    },
    railLabel: {
      color: palette.accent,
      fontSize: s.label,
      fontWeight: 700,
      letterSpacing: s.railLabelTracking,
      lineHeight: s.label * display,
      textTransform: "uppercase",
    },
    railSubject: {
      color: palette.strong,
      fontSize: s.railSubject,
      fontWeight: 700,
      lineHeight: s.railSubject * display,
    },
    proofIndex: {
      color: palette.accent,
      fontSize: s.proofIndex,
      fontWeight: 700,
      lineHeight: s.proofText * body,
    },
    proofText: {
      color: palette.text,
      fontSize: s.proofText,
      fontWeight: 400,
      lineHeight: s.proofText * body,
    },
  };
}
