import { escapeRegex, normalizeText } from "../text/text.js";
import { EMAIL } from "../parser/contact.js";
import type { AtsParsedResume } from "../types.js";

/**
 * Contact-detail redaction for tasks that do not need to know who the candidate is.
 *
 * Analysis judges the content of a resume; the candidate's name, email, phone number and links
 * add nothing to it and are the details least worth handing to a third party. (A postal address
 * is not recognised, so it is not redacted.) They are swapped for
 * placeholders before the request leaves and swapped back in the reply, so a recommendation that
 * mentions them still reads correctly.
 *
 * Best effort by design, and limited to values that are unambiguous: what the parser extracted
 * (name, email, phone, links) plus any further email address, whose grammar cannot be confused
 * with anything else. Phone-shaped digit runs are *not* swept — "2019 - 2023" has the shape of a
 * phone number — so only the number the parser identified is replaced. A first name used on its
 * own elsewhere in the text is not caught either. Replacement is whole-word, so a three-letter
 * name does not rewrite the inside of another word, and a "name" the parser also read as a job
 * title is left alone — swapping a title for [NAME] would cost the analysis more than it hides.
 * Tasks that must recover these values (parse repair, conversion) do not redact at all.
 */
export type Redaction = {
  /** Replaces contact details in every string inside `value`. */
  apply<T>(value: T): T;
  /** Puts them back. */
  restore<T>(value: T): T;
};

const EMAILS = new RegExp(EMAIL.source, "gi");

export function createRedaction(
  parsed: Pick<AtsParsedResume, "name" | "email" | "phone" | "links" | "roles">,
  source: string,
): Redaction {
  const tokens = new Map<string, string>(); // original → placeholder
  const add = (original: string, placeholder: string) => {
    const value = original.trim();
    // Too short to replace safely: a two-letter "name" would rewrite ordinary words.
    if (value.length >= 3 && !tokens.has(value)) tokens.set(value, placeholder);
  };

  const name = parsed.name.trim().toLowerCase();
  if (!parsed.roles.some((role) => role.title.trim().toLowerCase() === name))
    add(parsed.name, "[NAME]");
  add(parsed.phone, "[PHONE]");
  const emails = new Set(
    [parsed.email, ...(normalizeText(source).match(EMAILS) ?? [])].filter(Boolean),
  );
  [...emails].forEach((email, index) => add(email, `[EMAIL_${index + 1}]`));
  parsed.links.forEach((link, index) => add(link, `[LINK_${index + 1}]`));

  // Longest first, so an email is replaced before a name it happens to contain. Case-insensitive,
  // on text normalised as the engine reads it (no-break spaces, soft hyphens, ligatures): "JANE
  // DOE" in a heading and "Jane Doe" in a bullet are the same person. A name also matches with any
  // spacing between its letters, as a letter-spaced header ("J A N E   D O E") extracts.
  const ordered = [...tokens].sort(([a], [b]) => b.length - a.length);
  const forward = ordered.map(([original, placeholder]) => {
    const body =
      placeholder === "[NAME]"
        ? [...original.replace(/\s+/g, "")].map(escapeRegex).join("\\s*")
        : escapeRegex(original);
    return [
      new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu"),
      placeholder,
    ] as const;
  });
  const backward = ordered.map(([original, placeholder]) => [placeholder, original] as const);

  const deep = (replace: (text: string) => string) => {
    const walk = (node: unknown): unknown => {
      if (typeof node === "string") return replace(node);
      if (Array.isArray(node)) return node.map(walk);
      if (node && typeof node === "object")
        return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, walk(child)]));
      return node;
    };
    return <T>(value: T) => walk(value) as T;
  };

  return {
    apply: deep((text) =>
      forward.reduce((out, [pattern, to]) => out.replace(pattern, to), normalizeText(text)),
    ),
    // Placeholders are unique bracketed tokens, so restoring them needs no boundaries.
    restore: deep((text) => backward.reduce((out, [from, to]) => out.split(from).join(to), text)),
  };
}
