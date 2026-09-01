import type { ParsedReleaseBody } from "./types.js";

const CATEGORY_KEYWORDS: Array<{
  pattern: RegExp;
  category: keyof Omit<ParsedReleaseBody, "summary"> | "skip" | "summary";
}> = [
  { pattern: /contributor|dependency|dependencies|artifact|asset/i, category: "skip" },
  { pattern: /summary|overview|highlights/i, category: "summary" },
  { pattern: /security/i, category: "security" },
  { pattern: /breaking/i, category: "breaking" },
  { pattern: /fix|bug|patch|resolved/i, category: "fixed" },
  { pattern: /improve|enhance|refactor|update|perf|polish/i, category: "improved" },
  {
    pattern: /feature|feat|added|addition|add\b|new\s+feature|what'?s changed/i,
    category: "added",
  },
];

/**
 * Robust markdown parser for GitHub release notes.
 * Buckets bullet points under headers by category keyword match,
 * preserves multi-line/wrapped bullet items, extracts preamble summaries,
 * and skips metadata sections like Contributors or Full Changelog links.
 */
export function parseReleaseBody(body: string | null): ParsedReleaseBody {
  const result: ParsedReleaseBody = {
    summary: null,
    added: [],
    improved: [],
    fixed: [],
    breaking: [],
    security: [],
  };

  if (!body) return result;

  let currentCategory: keyof Omit<ParsedReleaseBody, "summary"> | "skip" | "summary" | null = null;
  const summaryLines: string[] = [];
  let isPreamble = true;

  const lines = body.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    // Check for Markdown headers: #, ##, ###, etc.
    if (/^#{1,6}\s+/.test(line)) {
      isPreamble = false;
      const header = line.replace(/^#{1,6}\s+/, "");
      const match = CATEGORY_KEYWORDS.find(({ pattern }) => pattern.test(header));
      currentCategory = match?.category ?? "added";
      continue;
    }

    // Skip metadata lines like "**Full Changelog**: https://..."
    if (/^\*\*Full Changelog\*\*:/i.test(line) || /^Full Changelog:/i.test(line)) {
      continue;
    }

    // Check for bullet list items: "* ", "- ", "+ ", "• ", or "1. "
    const isBullet = /^[-*+•]\s+/.test(line) || /^\d+\.\s+/.test(line);

    if (isBullet) {
      isPreamble = false;
      const item = line
        .replace(/^[-*+•]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim();

      if (currentCategory === "skip") {
        continue;
      }

      const targetCategory =
        currentCategory && currentCategory !== "summary" ? currentCategory : "added";

      if (item) {
        result[targetCategory].push(item);
      }
      continue;
    }

    // Indented or wrapped continuation of previous bullet
    if (
      !isPreamble &&
      currentCategory &&
      currentCategory !== "skip" &&
      currentCategory !== "summary"
    ) {
      const targetCategory = currentCategory;
      const currentList = result[targetCategory];
      if (currentList.length > 0 && (/^\s{2,}/.test(rawLine) || !/^[A-Z#]/.test(line))) {
        currentList[currentList.length - 1] += ` ${line}`;
        continue;
      }
    }

    // Capture summary from preamble before any headers/bullets, or inside explicit summary header
    if (isPreamble || currentCategory === "summary") {
      summaryLines.push(line);
    }
  }

  if (summaryLines.length > 0) {
    result.summary = summaryLines.join(" ");
  }

  return result;
}
