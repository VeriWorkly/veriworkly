import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent } from "@/features/cover-letter/types";

function slugifyFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getDocumentFileBaseName(document: BaseDocument): string {
  if (document.type !== "COVER_LETTER") {
    return slugifyFileName(document.title) || document.type.toLowerCase();
  }

  const content = document.content as Partial<CoverLetterContent>;
  const fromTitle = slugifyFileName(document.title);
  const fromContent = slugifyFileName(
    [content.senderName, content.companyName, "cover-letter"].filter(Boolean).join(" "),
  );

  return fromTitle || fromContent || "cover-letter";
}
