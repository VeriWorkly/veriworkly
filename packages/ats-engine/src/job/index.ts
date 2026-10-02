/**
 * @veriworkly/ats-engine/job — job posting text from a web page.
 *
 * Parsing only: no fetching. Retrieving an attacker-chosen URL safely (SSRF filtering, size and
 * time limits) is the host's job; this turns the HTML it got back into the text the matcher
 * reads. Dependency-free and runtime-agnostic.
 *
 * Every scan here is a single forward pass with `indexOf`, never a backtracking regex over the
 * page (see `./html.ts`).
 */

import { decodeEntities, htmlText, indexOfIgnoreCase } from "./html.js";

export type AtsJobPosting = {
  title: string;
  company: string;
  /** The posting's own description, as text. */
  description: string;
  /** Requirement fields some sites publish separately from the description. */
  requirements: string[];
};

/** Text beyond this adds cost to every downstream step and no signal. */
export const MAX_JOB_TEXT_CHARS = 12_000;

/**
 * Plain job text, one trimmed line per non-blank line and capped — the shape every job text
 * takes before matching, whether it came from HTML, a text file or a paste.
 */
export function normalizeJobText(text: string, maxChars = MAX_JOB_TEXT_CHARS): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, maxChars);
}

/**
 * The visible text of an HTML document or fragment, one line per block, as posting text.
 *
 * Block elements become line breaks, so a posting's headings and bullets survive as lines — the
 * shape the job matcher's section detection reads — instead of collapsing into one paragraph.
 * Script, style and similar elements are dropped with their content; an element left unclosed
 * drops everything after it, which on a well-formed page never happens and on a hostile one is
 * the safe direction. A `<` that cannot open a tag ("<5k") is text, as it is to a browser.
 */
export function jobHtmlToText(html: string, maxChars = MAX_JOB_TEXT_CHARS): string {
  return normalizeJobText(htmlText(html), maxChars);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function isJobPosting(node: Record<string, unknown>): boolean {
  return asArray(node["@type"]).some((type) => type === "JobPosting");
}

/**
 * Real JSON-LD nests a value two or three levels deep. A page author picks the depth, and an
 * unbounded walk overflowed the stack at about 10 000 levels; anything deeper is skipped.
 */
const MAX_JSON_DEPTH = 32;

function textOf(value: unknown, depth = 0): string {
  if (depth > MAX_JSON_DEPTH) return "";
  // JSON-LD descriptions are often HTML escaped once more ("&lt;p&gt;"): unescape, then strip.
  if (typeof value === "string")
    return jobHtmlToText(
      value.includes("&lt;") ? decodeEntities(value) : value,
      Number.POSITIVE_INFINITY,
    );
  if (Array.isArray(value))
    return value
      .map((item) => textOf(item, depth + 1))
      .filter(Boolean)
      .join("\n");
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    return textOf(node.name ?? node.description ?? "", depth + 1);
  }
  return "";
}

/** Every JSON-LD object on the page, with `@graph` containers flattened. */
function jsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  let index = 0;

  for (;;) {
    const open = indexOfIgnoreCase(html, "<script", index);
    if (open === -1) break;
    const tagEnd = html.indexOf(">", open);
    if (tagEnd === -1) break;
    const close = indexOfIgnoreCase(html, "</script", tagEnd);
    if (close === -1) break;
    index = close + 8;
    if (!html.slice(open, tagEnd).toLowerCase().includes("application/ld+json")) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(html.slice(tagEnd + 1, close));
    } catch {
      continue; // a page's broken structured data is the page's problem, not a failed scan
    }
    // A cursor, not shift(), and a loop, not push(...spread): a page author picks the size of
    // `@graph`, and both of those fall over (quadratic time, stack overflow) on a big one.
    const queue = asArray(parsed);
    for (let at = 0; at < queue.length; at += 1) {
      const node = queue[at];
      if (!node || typeof node !== "object" || Array.isArray(node)) continue;
      const record = node as Record<string, unknown>;
      nodes.push(record);
      for (const child of asArray(record["@graph"])) queue.push(child);
    }
  }
  return nodes;
}

/**
 * The schema.org `JobPosting` a page publishes for search engines, if it has one.
 *
 * Most applicant-tracking hosts embed it, and it is the cleanest source there is: the
 * employer's own title and description, without the navigation, cookie banner and "similar
 * jobs" list that make up most of a page's visible text.
 */
export function extractJobPosting(html: string): AtsJobPosting | null {
  const node = jsonLdNodes(html).find(isJobPosting);
  if (!node) return null;

  const description = textOf(node.description);
  if (!description) return null;

  const requirements = [
    node.qualifications,
    node.skills,
    node.experienceRequirements,
    node.educationRequirements,
    node.responsibilities,
  ]
    .map((value) => textOf(value))
    .filter(Boolean);

  return {
    title: textOf(node.title),
    company: textOf(node.hiringOrganization),
    description,
    requirements,
  };
}

/**
 * Below this a posting's description is a teaser ("See the full description below"), and the
 * requirements live in the page itself.
 */
const MIN_POSTING_DESCRIPTION_CHARS = 200;

/**
 * The job text to match a resume against: the page's `JobPosting` when it publishes a real one,
 * its visible text otherwise.
 */
export function jobTextFromHtml(html: string, maxChars = MAX_JOB_TEXT_CHARS): string {
  const posting = extractJobPosting(html);
  if (!posting || posting.description.length < MIN_POSTING_DESCRIPTION_CHARS)
    return jobHtmlToText(html, maxChars);
  return normalizeJobText(
    [posting.title, posting.company, posting.description, ...posting.requirements].join("\n"),
    maxChars,
  );
}
