/**
 * Shared text primitives.
 *
 * Grammar rather than vocabulary: tokenisation, stemming, regex escaping, template filling. None
 * of it names an English word, so none of it belongs in the policy — the word lists these operate
 * over all do.
 */

export function words(text: string) {
  return text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [];
}

/**
 * Permissive vocabulary tokenizer, used with `exec` so match offsets are available for phrase
 * masking. Preserves leading-dot frameworks (.net), slash-delimited concepts (ci/cd, tcp/ip),
 * symbols (c++, c#), and domain terms (node.js, next.js) without dropping 2-letter tokens like
 * js, ai, ml, ux. Trailing "." and "/" picked up from sentence ends are stripped at the call
 * site so "JavaScript." and "JavaScript" fold together.
 */
export const VOCABULARY_TOKEN = /(?:\.[a-z0-9+#]+|[a-z][a-z0-9+#./-]*)/g;

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Conservative suffix stripper — good enough to fold "managed/manages/managing" together without a stemmer dependency. */
export function stem(word: string): string {
  if (word.length > 6 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 5 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function formatTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
