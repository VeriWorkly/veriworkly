/**
 * The document properties every PDF export carries, so a resume and a cover letter
 * describe themselves the same way in a reader's "Properties" and in a file index.
 *
 * No `language`: the text is whatever the user typed, and a wrong one (a letter in Spanish
 * declared "en") makes a screen reader mispronounce every word, where an absent one lets
 * the reader detect it.
 */
export function getPdfMetadata(name: string, kind: "Resume" | "Cover Letter") {
  return {
    title: name ? `${name} - ${kind}` : kind,
    author: name || undefined,
    subject: kind,
    creator: "VeriWorkly",
    producer: "VeriWorkly",
  };
}
