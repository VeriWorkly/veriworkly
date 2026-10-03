import { fromJsonResume, isJsonResume } from "./document/jsonResume.js";
import { renderResumeDocument } from "./document/render.js";
import { resumeDocumentSchema } from "./document/schema.js";
import { DOCUMENT_LIMITS, isResumeDocument, type AtsResumeDocument } from "./document/types.js";
import { readHiddenCharacters, type HiddenCharacters } from "./text/characters.js";
import { cut, normalizeText } from "./text/text.js";

/**
 * What the engine accepts as a resume.
 *
 * - `string` — plain text, as extracted from a file or pasted.
 * - `AtsResumeDocument` — structured data, recognised by its `format` field.
 * - a JSON Resume (jsonresume.org) — recognised by its shape and read as structure.
 * - any other object — flattened to text, keys on their own lines. Kept for callers that send
 *   an arbitrary JSON document; structured callers should send an `AtsResumeDocument`.
 */
export type AtsResumeInput = string | AtsResumeDocument | Record<string, unknown>;

/** Raised when an input claims to be an `AtsResumeDocument` but does not satisfy the format. */
export class AtsInputError extends Error {
  override name = "AtsInputError";

  constructor(
    message: string,
    readonly issues: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

const PREPARED = Symbol("ats-engine.prepared");

/**
 * A resume read once and ready to score. `text` is the canonical text the rules and any AI pass
 * read; `document` is the validated structure when the input was one.
 *
 * Produced only by `prepareResume`. A host that needs a report and an AI pass hands this same
 * object to both, rather than letting each walk a document that may be megabytes of JSON.
 */
export type PreparedResume = {
  readonly text: string;
  readonly document: AtsResumeDocument | null;
  /** Invisible characters the raw input carried, counted before `text` dropped them. */
  readonly hidden: HiddenCharacters;
  readonly [PREPARED]: true;
};

/**
 * `resume` can be caller-controlled JSON nested as deeply as a body limit allows, so the walk is
 * depth-capped: unbounded recursion over it is a stack overflow away from failing every request
 * that shares the process. Real documents nest about four levels.
 */
const MAX_FLATTEN_DEPTH = 24;
const MAX_TEXT_CHARS = 50_000;

/**
 * Keys are emitted on their own line so a heading-like key ("experience") reads as a section
 * heading. Stops early once the text budget is spent, so a huge document costs its cap, not its
 * size.
 */
function flatten(value: unknown): string {
  const parts: string[] = [];
  let length = 0;

  const walk = (node: unknown, depth: number) => {
    if (length >= MAX_TEXT_CHARS) return;
    if (typeof node === "string") {
      parts.push(node);
      length += node.length + 1;
      return;
    }
    if (depth >= MAX_FLATTEN_DEPTH || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    for (const [key, item] of Object.entries(node as Record<string, unknown>)) {
      if (length >= MAX_TEXT_CHARS) return;
      parts.push(key);
      length += key.length + 1;
      walk(item, depth + 1);
    }
  };

  walk(value, 0);
  return parts.join("\n");
}

/**
 * Whether a declared document is too large to be worth validating: an array past every limit,
 * or more nodes than the largest legal document holds. zod parses each array element before it
 * checks the array's length, so without this a 4 MB body of a million empty items cost twenty
 * seconds of CPU just to be rejected. Walks at most `MAX_NODES` nodes.
 */
const MAX_NODES = 200_000;
const MAX_ARRAY = Math.max(...Object.values(DOCUMENT_LIMITS).filter((n) => n < 1_000));

function isOversized(value: unknown): boolean {
  const stack: unknown[] = [value];
  let nodes = 0;
  while (stack.length) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      if (node.length > MAX_ARRAY) return true;
      for (const item of node) stack.push(item);
    } else if (node && typeof node === "object") {
      // Keys counted one at a time, never materialised: an object with a million keys stops
      // at MAX_NODES instead of allocating them all first.
      for (const key in node) {
        if (++nodes > MAX_NODES) return true;
        stack.push((node as Record<string, unknown>)[key]);
      }
    }
    if (++nodes > MAX_NODES) return true;
  }
  return false;
}

/** The document as the schema reads it, or `AtsInputError` naming the first issues. */
function validDocument(input: unknown): AtsResumeDocument {
  const result = resumeDocumentSchema.safeParse(input);
  if (result.success) return result.data;
  throw new AtsInputError(
    "Resume document is invalid.",
    result.error.issues.slice(0, 20).map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    })),
  );
}

function isPreparedResume(value: unknown): value is PreparedResume {
  return typeof value === "object" && value !== null && PREPARED in value;
}

/**
 * Reads a resume input once. Throws `AtsInputError` when the input declares the structured
 * format but does not satisfy it; any other shape is accepted.
 */
export function prepareResume(input: unknown): PreparedResume {
  if (isPreparedResume(input)) return input;

  let text: string;
  let document: AtsResumeDocument | null = null;

  if (typeof input === "string") {
    text = input;
  } else if (isResumeDocument(input)) {
    if (isOversized(input))
      throw new AtsInputError("Resume document is too large.", [
        { path: "", message: "Resume document exceeds the size limits." },
      ]);
    document = validDocument(input);
    text = renderResumeDocument(document);
  } else if (isJsonResume(input)) {
    // The adapter reads defensively and cuts every array to its field's limit, so its output
    // should validate and the schema pass only cuts over-long strings to size. Should it not,
    // the caller gets the same typed error a declared document would, never a raw ZodError.
    document = validDocument(fromJsonResume(input));
    text = renderResumeDocument(document);
  } else {
    text = flatten(input);
  }

  const canonical = cut(normalizeText(text).trim(), MAX_TEXT_CHARS);

  return Object.freeze({
    text: canonical,
    // Count what the engine will actually read. Structured inputs are first validated/rendered,
    // so stripped unknown keys cannot smuggle invisible characters into the score.
    hidden: readHiddenCharacters(
      typeof input === "string" ? cut(input, MAX_TEXT_CHARS * 2) : canonical,
    ),
    document,
    [PREPARED]: true as const,
  });
}
