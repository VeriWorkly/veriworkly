import { isDocumentLanguage, toDocumentLanguage } from "@/features/documents/utils/formatters";

/**
 * The document properties every PDF export carries, so a resume and a cover letter
 * describe themselves the same way in a reader's "Properties" and in a file index.
 *
 * `language` only when the document sets one (S-366): the text is whatever the user typed,
 * and a guessed one (a letter in Spanish declared "en") makes a screen reader mispronounce
 * every word, where an absent one lets the reader detect it.
 */
export function getPdfMetadata(name: string, kind: "Resume" | "Cover Letter", language?: string) {
  const declared = language?.trim() && isDocumentLanguage(language);

  return {
    title: name ? `${name} - ${kind}` : kind,
    author: name || undefined,
    subject: kind,
    creator: "VeriWorkly",
    producer: "VeriWorkly",
    language: declared ? toDocumentLanguage(language) : undefined,
  };
}
