import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

type PageMetadata = {
  title: string;
  /** Overrides `title` in `<title>` only, where two pages would otherwise share one. */
  metaTitle?: string;
  description?: string;
  /** Path from the site root, e.g. `/docs/api-keys`. */
  path: string;
  /** Path of the page's social card. */
  image: string;
};

const MAX_DESCRIPTION = 155;

/**
 * The meta description: plain text within 155 characters. Operation pages take their
 * description from the spec, which runs to paragraphs of Markdown; those keep their first
 * sentences, or are cut at a word.
 */
export function metaDescription(text: string) {
  const plain = text
    .replace(/\*\*|__|`/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= MAX_DESCRIPTION) return plain;

  let kept = "";
  for (const sentence of plain.split(/(?<=[.!?])\s+/)) {
    const next = kept ? `${kept} ${sentence}` : sentence;
    if (next.length > MAX_DESCRIPTION) break;
    kept = next;
  }
  if (kept) return kept;

  const cut = plain.slice(0, MAX_DESCRIPTION - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.]+$/, "")}…`;
}

/** Every page declares its own canonical and complete Open Graph and Twitter tags. */
export function pageMetadata({
  title,
  metaTitle,
  description,
  path,
  image,
}: PageMetadata): Metadata {
  const url = `${siteConfig.url}${path}`;
  const summary = description && metaDescription(description);
  const images = [{ url: image, width: 1200, height: 630, alt: title }];

  return {
    // A `metaTitle` is the whole search title and already names VeriWorkly, so the section
    // template is not appended to it (titles stay within 60 characters).
    title: metaTitle ? { absolute: metaTitle } : title,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description: summary,
      siteName: siteConfig.name,
      images,
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title,
      description: summary,
      images: [image],
    },
  };
}
