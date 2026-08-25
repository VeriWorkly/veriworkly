import React from "react";
import Link from "next/link";

import { siteConfig } from "@/config/site";

interface ChangelogRichTextProps {
  content: string | null | undefined;
  className?: string;
  inline?: boolean;
  multiline?: boolean;
}

/**
 * Safely validates URLs to prevent javascript: or data: injection.
 */
function sanitizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();

  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:")
  )
    return trimmed;

  return null;
}

/**
 * Parses inline markdown tokens:
 * - `**bold**` or `__bold__`
 * - `*italic*` or `_italic_`
 * - `` `code` ``
 * - `[text](url)`
 * - `~~strikethrough~~`
 * - `#123` (GitHub PR/issue auto-link)
 */

export function renderInlineMarkdown(text: string, keyPrefix = "inline"): React.ReactNode[] {
  if (!text) return [];

  // Match inline markdown syntax in order of precedence
  // 1. Code span: `...`
  // 2. Link: [...](...)
  // 3. Raw GitHub PR URL: https://github.com/.../pull/123
  // 4. Bold: **...** or __...__
  // 5. Strikethrough: ~~...~~
  // 6. Italic: *...* or _..._
  // 7. Scoped package: @scope/package-name
  // 8. PR reference: #123
  // 9. Contributor mention: @username
  const tokenRegex =
    /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/github\.com\/[^\/\s]+\/[^\/\s]+\/pull\/\d+)|(\*\*[^*]+\*\*|__[^\_]+__)|(~~[^~]+~~)|(\*[^*]+\*|_[^_]+_)|((?:^|\s)@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)|((?:^|\s)#\d+\b)|((?:^|\s)@[a-zA-Z0-9_-]+(?=[\s,.:;!?)\]]|$))/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenCount = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const matchedStr = match[0];

    // Push preceding plain text
    if (matchIndex > lastIndex) nodes.push(text.slice(lastIndex, matchIndex));

    const key = `${keyPrefix}-${tokenCount++}`;

    if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
      // Inline code
      const codeContent = matchedStr.slice(1, -1);

      nodes.push(
        <code
          key={key}
          className="border-border/50 bg-muted/25 text-foreground dark:bg-muted/40 rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium"
        >
          {codeContent}
        </code>,
      );
    } else if (matchedStr.startsWith("[") && matchedStr.includes("](")) {
      const closingBracket = matchedStr.indexOf("](");
      const label = matchedStr.slice(1, closingBracket);
      const rawUrl = matchedStr.slice(closingBracket + 2, -1);

      const safeUrl = sanitizeUrl(rawUrl);

      if (safeUrl) {
        const isExternal = safeUrl.startsWith("http://") || safeUrl.startsWith("https://");

        nodes.push(
          <Link
            key={key}
            href={safeUrl}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="text-accent decoration-accent/40 hover:text-accent/80 hover:decoration-accent underline underline-offset-2 transition-colors"
          >
            {renderInlineMarkdown(label, `${key}-lbl`)}
          </Link>,
        );
      } else nodes.push(label);
    } else if (/^https?:\/\/github\.com\/[^\/\s]+\/[^\/\s]+\/pull\/\d+$/.test(matchedStr)) {
      // Clean display of raw GitHub PR URLs like https://github.com/VeriWorkly/veriworkly/pull/195 -> #195
      const prNumber = matchedStr.match(/\/pull\/(\d+)/)?.[1];
      nodes.push(
        <Link
          key={key}
          href={matchedStr}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent decoration-accent/40 hover:decoration-accent font-mono text-xs underline underline-offset-2"
        >
          {`#${prNumber}`}
        </Link>,
      );
    } else if (
      (matchedStr.startsWith("**") && matchedStr.endsWith("**")) ||
      (matchedStr.startsWith("__") && matchedStr.endsWith("__"))
    ) {
      const inner = matchedStr.slice(2, -2);

      nodes.push(
        <strong key={key} className="text-foreground font-semibold">
          {renderInlineMarkdown(inner, `${key}-b`)}
        </strong>,
      );
    } else if (matchedStr.startsWith("~~") && matchedStr.endsWith("~~")) {
      const inner = matchedStr.slice(2, -2);

      nodes.push(
        <del key={key} className="text-muted/70 line-through">
          {renderInlineMarkdown(inner, `${key}-del`)}
        </del>,
      );
    } else if (
      (matchedStr.startsWith("*") && matchedStr.endsWith("*")) ||
      (matchedStr.startsWith("_") && matchedStr.endsWith("_"))
    ) {
      const inner = matchedStr.slice(1, -1);

      nodes.push(
        <em key={key} className="text-foreground/90 italic">
          {renderInlineMarkdown(inner, `${key}-em`)}
        </em>,
      );
    } else if (/@([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/.test(matchedStr)) {
      // Scoped package name like @veriworkly/profile-core
      const pkgMatch = matchedStr.match(/(\s*)(@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/);
      if (pkgMatch) {
        const space = pkgMatch[1];
        const pkgName = pkgMatch[2];
        if (space) nodes.push(space);
        nodes.push(
          <code
            key={key}
            className="border-border/50 bg-muted/25 text-foreground dark:bg-muted/40 rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium"
          >
            {pkgName}
          </code>,
        );
      } else nodes.push(matchedStr);
    } else if (/#\d+\b/.test(matchedStr)) {
      const prMatch = matchedStr.match(/(\s*)#(\d+)\b/);

      if (prMatch) {
        const space = prMatch[1];
        const prNumber = prMatch[2];
        const prUrl = `${siteConfig.links.github}/pull/${prNumber}`;

        if (space) nodes.push(space);

        nodes.push(
          <Link
            key={key}
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent decoration-accent/40 hover:decoration-accent font-mono text-xs underline underline-offset-2"
          >
            {`#${prNumber}`}
          </Link>,
        );
      } else nodes.push(matchedStr);
    } else if (/@([a-zA-Z0-9_-]+)/.test(matchedStr)) {
      // Contributor mention @username
      const mentionMatch = matchedStr.match(/(\s*)@([a-zA-Z0-9_-]+)/);
      if (mentionMatch) {
        const space = mentionMatch[1];
        const username = mentionMatch[2];
        if (space) nodes.push(space);

        nodes.push(
          <Link
            key={key}
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`@${username} on GitHub`}
            className="bg-accent/10 border-accent/20 text-foreground hover:bg-accent/20 hover:text-accent inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-medium transition-colors"
          >
            <span className="text-accent font-bold">@</span>
            {username}
          </Link>,
        );
      } else nodes.push(matchedStr);
    } else nodes.push(matchedStr);

    lastIndex = matchIndex + matchedStr.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

/**
 * Component to render changelog text with full inline markdown support,
 * highlighting bold tags, inline code chips, links, and structured prefixes.
 */
export const ChangelogRichText: React.FC<ChangelogRichTextProps> = ({
  content,
  className = "",
  inline = false,
  multiline = false,
}) => {
  if (!content) return null;

  if (inline)
    return <span className={className}>{renderInlineMarkdown(content, "rt-inline")}</span>;

  if (multiline) {
    const paragraphs = content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length <= 1)
      return <div className={className}>{renderInlineMarkdown(content, "rt-multi")}</div>;

    return (
      <div className={`space-y-3 ${className}`}>
        {paragraphs.map((p, i) => (
          <p key={i}>{renderInlineMarkdown(p, `rt-p-${i}`)}</p>
        ))}
      </div>
    );
  }

  return <span className={className}>{renderInlineMarkdown(content, "rt")}</span>;
};

export default ChangelogRichText;
