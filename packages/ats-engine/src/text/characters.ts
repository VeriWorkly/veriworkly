/**
 * Characters that change what a resume says without changing what it looks like.
 *
 * Each is a known trick against keyword matching or against an AI screener:
 * - Zero-width spaces and word joiners split a keyword so it reads as "Kubernetes" on the page
 *   and as two fragments to a matcher, or join words so a stuffed string looks like one.
 * - Unicode tag characters (U+E0000 block) render as nothing at all, yet each one maps to an
 *   ASCII letter that a language model reads: a whole hidden instruction can ride along inside
 *   a single visible word ("ASCII smuggling").
 * - Bidirectional overrides and isolates reorder what is displayed against what is stored.
 *
 * Zero-width joiner and non-joiner are legitimate in Indic and Arabic script, where they shape
 * conjuncts, and in emoji; they count only between two Latin letters, where they do nothing.
 */
// A U+FEFF that opens the text is a byte-order mark an editor wrote, not a trick, so it is
// neither counted nor stripped here (`trim` drops it later); anywhere else it joins words.
const INVISIBLE =
  /[\u{200B}\u{2060}-\u{2064}\u{202A}-\u{202E}\u{2066}-\u{2069}]|(?<!^)\u{FEFF}|(?<=\p{Script=Latin})[\u{200C}\u{200D}]+(?=\p{Script=Latin})|[\u{E0000}-\u{E007F}]/gu;

/**
 * An embedding or isolate around a number — what Word and LibreOffice write to keep a phone
 * number left to right inside Arabic or Hebrew text. Overrides still count: they are the trick.
 */
const WRAPPED_NUMBER =
  /[\u{202A}\u{202B}\u{2066}-\u{2068}]([\p{N}\p{Zs}+()\-./]*)[\u{202C}\u{2069}]/gu;

const TAG = /[\u{E0000}-\u{E007F}]/gu;

/** The soft hyphen too: invisible by design, and left behind by word processors, never a trick. */
const STRIP =
  /[\u{00AD}\u{200B}\u{2060}-\u{2064}\u{202A}-\u{202E}\u{2066}-\u{2069}\u{E0000}-\u{E007F}]|(?<=\p{Script=Latin})[\u{200C}\u{200D}]+(?=\p{Script=Latin})|(?<!^)\u{FEFF}/gu;

export type HiddenCharacters = {
  /** Invisible characters that do nothing a reader can see. */
  count: number;
  /** What any tag characters spelled out, decoded to ASCII. Empty when there were none. */
  smuggled: string;
};

/** Counts the invisible characters in raw text and decodes any smuggled tag text. */
export function readHiddenCharacters(raw: string): HiddenCharacters {
  const count =
    raw
      .replace(WRAPPED_NUMBER, "$1")
      .match(INVISIBLE)
      ?.reduce((total, match) => total + [...match].length, 0) ?? 0;
  if (count === 0) return { count, smuggled: "" };
  const smuggled = (raw.match(TAG) ?? [])
    .map((char) => char.codePointAt(0)! - 0xe0000)
    .filter((code) => code >= 0x20 && code < 0x7f)
    .map((code) => String.fromCharCode(code))
    .join("");
  return { count, smuggled: smuggled.slice(0, 2_000) };
}

/** The text without them, so the parser reads the words a person sees. */
export function stripHiddenCharacters(text: string) {
  return text.replace(STRIP, "");
}
