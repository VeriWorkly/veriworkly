import type { CoverLetterContent } from "@/features/cover-letter/types";
import { DocumentFontLoader } from "@/features/documents/components/DocumentFontLoader";

import {
  buildCoverLetterText,
  buildCoverLetterMarkdown,
  COVER_LETTER_VERIWORKLY_ID,
} from "./shared";
import {
  ProfessionalCoverLetterPreview,
  buildProfessionalCoverLetterHtml,
} from "./professional/web";
import { VeriworklyCoverLetterPreview, buildVeriworklyCoverLetterHtml } from "./veriworkly/web";

export { buildCoverLetterMarkdown, buildCoverLetterText };
export { splitContactLinks, splitMarkdownLines, splitRichTextBlocks } from "./shared";

interface CoverLetterPreviewProps {
  content: CoverLetterContent;
  templateId: string;
}

export function renderCoverLetterWeb(content: CoverLetterContent) {
  return buildCoverLetterText(content);
}

export function CoverLetterPreview({ content, templateId }: CoverLetterPreviewProps) {
  const fontFamily = content.appearance?.fontFamily;

  if (templateId === COVER_LETTER_VERIWORKLY_ID) {
    return (
      <>
        <DocumentFontLoader fontFamily={fontFamily} />
        <VeriworklyCoverLetterPreview content={content} />
      </>
    );
  }

  return (
    <>
      <DocumentFontLoader fontFamily={fontFamily} />
      <ProfessionalCoverLetterPreview content={content} />
    </>
  );
}

export function buildCoverLetterHtml(content: CoverLetterContent, templateId: string): string {
  if (templateId === COVER_LETTER_VERIWORKLY_ID) {
    return buildVeriworklyCoverLetterHtml(content);
  }

  return buildProfessionalCoverLetterHtml(content);
}
