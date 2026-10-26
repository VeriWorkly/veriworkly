/**
 * Emoji, and the symbol blocks they grew out of, which no embedded PDF font can draw: every
 * pictograph, Miscellaneous Technical, Miscellaneous Symbols and Dingbats (✔ ★ ☎ ⌘ draw
 * blank in all three families), plus the code points that only build emoji sequences —
 * flag letters, skin tones, the joiner, variation selector-16, the keycap mark and tags.
 */
const EMOJI =
  /[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

/** Pictographs by Unicode's definition that are ordinary text, and that every font draws. */
const TEXT_SYMBOLS = new Set(["©", "®", "™"]);

export function stripEmoji(text: string): string {
  if (!text) return text;

  return text.replace(EMOJI, (match) => (TEXT_SYMBOLS.has(match) ? match : "")).trim();
}

/** Whether {@link stripEmoji} would take anything out of `text`. */
export function hasEmoji(text: string): boolean {
  return stripEmoji(text) !== text.trim();
}
