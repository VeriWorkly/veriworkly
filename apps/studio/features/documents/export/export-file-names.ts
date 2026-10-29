import type { BaseDocument } from "@/features/documents/core/types";
import type { CoverLetterContent } from "@/features/cover-letter/types";

import { sanitizeFileName } from "@/features/documents/utils/formatters";

/**
 * The titles a new document starts with ("Untitled resume", "Untitled Cover Letter"), and a
 * duplicate's "… (copy)" of one.
 */
const DEFAULT_TITLE_FILE_NAME = /^untitled(-resume|-cover-letter)?(-copy)*$/;

/**
 * A title as a file name, or "" while it is still the default (S-396): the person's own name
 * names the file better than "untitled-resume", which a recruiter would otherwise save.
 */
export function titleFileName(title: string | undefined): string {
  const name = sanitizeFileName(title ?? "");
  return DEFAULT_TITLE_FILE_NAME.test(name) ? "" : name;
}

export function getDocumentFileBaseName(document: BaseDocument): string {
  if (document.type !== "COVER_LETTER") {
    return titleFileName(document.title) || document.type.toLowerCase();
  }

  const content = document.content as Partial<CoverLetterContent>;
  const fromTitle = titleFileName(document.title);
  const fromContent = sanitizeFileName(
    [content.senderName, content.companyName, "cover-letter"].filter(Boolean).join(" "),
  );

  return fromTitle || fromContent || "cover-letter";
}
