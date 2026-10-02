/**
 * The visible text of an HTML page, by forward scans with `indexOf` — never a backtracking regex
 * over the page: the input is a page someone else wrote, up to megabytes long, and a pattern like
 * `<[^>]+>` is quadratic on a page of unclosed `<` — 40 KB of them took 660 ms, so a 2 MB page
 * would hold a server worker for the better part of an hour.
 *
 * Internal: `/job` normalises this into posting text, and the DOCX reader keeps its tabs.
 */

import { own } from "../util/own.js";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
  hellip: "…",
};

/** Bounded entity pattern: at most 10 characters between `&` and `;`, so it cannot backtrack. */
const ENTITY = /&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z]{2,8});/gi;

export function decodeEntities(text: string): string {
  return text.replace(ENTITY, (match, body: string) => {
    if (body[0] !== "#") return own(ENTITIES, body.toLowerCase()) ?? match;
    const code =
      body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

/** Elements whose content is never visible text. */
const HIDDEN = ["script", "style", "noscript", "template", "svg"];

/** Tags that end a line of visible text. */
const BLOCK = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "dd",
  "div",
  "dl",
  "dt",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

/** Anchored with one bounded run, so it cannot backtrack. */
const TAG_NAME = /^<\/?([a-z0-9]+)/i;

const tagName = (tag: string) => TAG_NAME.exec(tag)?.[1]?.toLowerCase() ?? "";

const asciiLower = (code: number) => (code >= 65 && code <= 90 ? code + 32 : code);

/**
 * `indexOf` ignoring ASCII case, searching the original string.
 *
 * Lowercasing the page and searching the copy is wrong: `toLowerCase` can change a string's
 * length ("İ" lowercases to two code units), so a position found in the copy points somewhere
 * else in the original. `needle` must be ASCII and is short, so this stays linear in practice.
 */
export function indexOfIgnoreCase(haystack: string, needle: string, from: number): number {
  const target = Array.from(needle, (char) => asciiLower(char.charCodeAt(0)));
  const last = haystack.length - target.length;
  for (let at = from; at <= last; at += 1) {
    let matched = 0;
    while (
      matched < target.length &&
      asciiLower(haystack.charCodeAt(at + matched)) === target[matched]
    )
      matched += 1;
    if (matched === target.length) return at;
  }
  return -1;
}

/** HTML opens a tag only when `<` is followed by a letter, `/`, `!` or `?`; otherwise it is text. */
function opensTag(html: string, at: number): boolean {
  const next = asciiLower(html.charCodeAt(at + 1));
  return (next >= 97 && next <= 122) || next === 47 || next === 33 || next === 63;
}

const isSpace = (char: string | undefined) =>
  char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";

/**
 * The `>` that ends the tag opened at `open`, or -1. A quoted attribute value may hold a `>`
 * (`<img alt="a > b">`), so one is skipped whole, as a browser does; a quote opens a value only
 * right after `=`. One forward pass: each character is looked at once.
 */
function tagEnd(html: string, open: number): number {
  for (let at = open + 1; at < html.length; at += 1) {
    const char = html[at];
    if (char === ">") return at;
    if (char !== "=") continue;
    let value = at + 1;
    while (isSpace(html[value])) value += 1;
    const quote = html[value];
    if (quote === '"' || quote === "'") {
      at = html.indexOf(quote, value + 1);
      if (at === -1) return -1;
    } else at = value - 1;
  }
  return -1;
}

/**
 * The visible text of an HTML document or fragment, one line per block, entities decoded and
 * whitespace as the page had it.
 *
 * Block elements become line breaks, so headings and bullets survive as lines instead of
 * collapsing into one paragraph. Script, style and similar elements are dropped with their
 * content; an element left unclosed drops everything after it, which on a well-formed page never
 * happens and on a hostile one is the safe direction. A `<` that cannot open a tag ("<5k") is
 * text, as it is to a browser.
 */
export function htmlText(html: string): string {
  const out: string[] = [];
  let index = 0;

  while (index < html.length) {
    const open = html.indexOf("<", index);
    if (open === -1) {
      out.push(html.slice(index));
      break;
    }
    out.push(html.slice(index, open));

    if (!opensTag(html, open)) {
      out.push("<");
      index = open + 1;
      continue;
    }

    if (html.startsWith("<!--", open)) {
      const close = html.indexOf("-->", open + 4);
      index = close === -1 ? html.length : close + 3;
      continue;
    }

    const close = tagEnd(html, open);
    if (close === -1) break; // an unclosed tag: nothing after it is renderable text
    const name = tagName(html.slice(open, close + 1));
    index = close + 1;

    if (html[open + 1] !== "/" && HIDDEN.includes(name)) {
      const end = indexOfIgnoreCase(html, `</${name}`, index);
      index = end === -1 ? html.length : html.indexOf(">", end) + 1 || html.length;
      continue;
    }
    // A list item keeps its marker, so it reads as the bullet it is — to a resume's content
    // rules, and to a posting's heading detection, which must not take an item for a heading.
    if (name === "li" && html[open + 1] !== "/") out.push("\n• ");
    else out.push(BLOCK.has(name) ? "\n" : " ");
  }

  return decodeEntities(out.join(""));
}
