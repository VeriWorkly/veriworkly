import type { CoverLetterContent } from "@/features/cover-letter/types";

import { COVER_LETTER_VERIWORKLY_ID } from "./shared";
import { VeriworklyCoverLetterPdf } from "./veriworkly/pdf";
import { ProfessionalCoverLetterPdf } from "./professional/pdf";

export function CoverLetterPdf({
  content,
  templateId,
}: {
  content: CoverLetterContent;
  templateId?: string;
}) {
  if (templateId === COVER_LETTER_VERIWORKLY_ID) {
    return <VeriworklyCoverLetterPdf content={content} />;
  }

  return <ProfessionalCoverLetterPdf content={content} />;
}
